# Production Readiness Design
**Date:** 2026-02-20
**Status:** Approved
**Approach:** Security + Observability together → Testing → Maintainability

---

## Context

Trust Admin manages the Hudson Living Trust — a financial application with two user types (admin/trustee and beneficiaries). The grantor died 2025-12-28; this is an active estate settlement. Data integrity and access control are non-negotiable.

Current state: CI hardened, 153 unit tests passing, security headers configured, Sentry wired into `withSentryConfig` but not initialized, beneficiary data isolation not enforced, stale routes present.

---

## Phase 1: Security + Observability (together)

Security hardening without observability means flying blind when something breaks. These ship together.

### 1a. Stale Route Deletion

Delete entirely — no redirects, 404 is correct:
- `src/app/login/` — superseded by `/auth/[path]`
- `src/app/portal/login/` — superseded by `/auth/[path]`
- `src/app/account/[path]/` — dead code, never wired into navigation

### 1b. Application-Level Beneficiary Data Isolation

Every `beneficiaryProcedure` that touches beneficiary data gets an explicit scope check. The procedure type restricts *who can call* the endpoint but does not scope *which rows* are returned. Add explicit `WHERE beneficiaryId = ctx.user.beneficiaryId` to every beneficiary-accessible query in:
- `beneficiaryRouter` — `getMyProfile`, `updateMyContact`
- `hemsRequestRouter` — `list`, `submit`
- `distributionRouter` — `list`
- `withdrawalRecordRouter` — `list`

Pattern:
```typescript
// Before: relies on procedure type alone
const results = await db.select().from(hemsRequest)

// After: explicit scope, defense layer 1
const results = await db.select().from(hemsRequest)
    .where(eq(hemsRequest.beneficiaryId, ctx.user.beneficiaryId!))
```

### 1c. Postgres RLS (Defense in Depth)

Set up a `app.current_beneficiary_id` session variable injected via `initJwtSession()` on each authenticated request. Write `CREATE POLICY` statements on the four tables beneficiaries can read:

```sql
-- beneficiary table
ALTER TABLE beneficiary ENABLE ROW LEVEL SECURITY;
CREATE POLICY beneficiary_isolation ON beneficiary
    USING (
        current_setting('app.current_beneficiary_id', true) = ''
        OR id = current_setting('app.current_beneficiary_id', true)::int
    );

-- Same pattern for: distribution, hems_request, withdrawal_record
```

Admins use the `BYPASSRLS` Postgres role — their queries are unaffected. This is the backstop: even a future tRPC bug cannot leak cross-beneficiary data.

Session variable injection point: `db/index.ts` → `initJwtSession()` sets `app.current_beneficiary_id` alongside the existing JWT session setup.

### 1d. Sentry Initialization

`next.config.ts` already wraps with `withSentryConfig`. Missing: the three init files.

**`sentry.client.config.ts`** — browser errors:
```typescript
Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,  // 10% in production
    enabled: process.env.NODE_ENV === 'production',
})
```

**`sentry.server.config.ts`** — server errors:
```typescript
Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    enabled: process.env.NODE_ENV === 'production',
})
```

**`sentry.edge.config.ts`** — proxy errors:
```typescript
Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    enabled: process.env.NODE_ENV === 'production',
})
```

### 1e. tRPC Error Reporting

The tRPC error formatter in `src/server/trpc/index.ts` already catches errors. Add Sentry capture for unhandled server errors (5xx), excluding expected client errors (4xx) that are not bugs:

```typescript
onError({ error, ctx }) {
    if (error.code === 'INTERNAL_SERVER_ERROR') {
        Sentry.captureException(error, {
            tags: { role: ctx?.user?.role },
        })
    }
}
```

No PII in Sentry — role only, never email or beneficiary ID.

### 1f. Fix Stale Test Reference

`tests/setup.ts` sets `process.env.BETTER_AUTH_URL` — leftover from before Neon Auth migration. Remove or replace with `NEON_AUTH_BASE_URL` after confirming which tests (if any) still need it.

---

## Phase 2: Testing

Validates Phase 1 is actually working.

### 2a. E2E Tests with Playwright

Install Playwright. Write tests for critical user journeys:

| Journey | What it proves |
|---------|---------------|
| Admin sign-in → dashboard | Auth flow, role routing work |
| Beneficiary sign-in → portal | Beneficiary auth, portal loads |
| `forcePasswordChange` redirect | Gate works, loop prevention works |
| Beneficiary submits HEMS request | Portal form end-to-end |
| Unauthenticated → `/dashboard` | Redirects to sign-in |
| Beneficiary → `/dashboard` | Redirects to portal (role guard) |

### 2b. Data Isolation Integration Tests

Prove the RLS + app-level guards work together:

```typescript
test('beneficiary A cannot fetch beneficiary B distributions', async () => {
    const ctxA = makeBeneficiaryContext(beneficiaryA.id)
    const caller = distributionRouter.createCaller(ctxA)
    const results = await caller.list({ entityId: 1 })
    expect(results.every(d => d.beneficiaryId === beneficiaryA.id)).toBe(true)
})
```

These live in `tests/` alongside existing unit tests, run with `bun test`, no browser needed.

### 2c. CI Test Split

```yaml
- name: Run unit tests
  run: bun test:unit

- name: Run E2E tests
  run: bun test:e2e
  # Runs against preview deployment; can be separate job
```

---

## Phase 3: Long-term Maintainability

### 3a. Biome Version Discipline

Add comment in `biome.json`:
```json
// schema version must match @biomejs/biome in package.json
// update both together: bun add -d @biomejs/biome@X.Y.Z && bunx biome migrate --write
```

### 3b. CI Secret Documentation

Add comment block in `.github/workflows/ci.yml` documenting every secret:
```yaml
# Required GitHub Secrets:
# DATABASE_URL          — Neon pooled connection string
# NEON_AUTH_BASE_URL    — Neon Auth proxy URL
# ADMIN_EMAIL           — Trust owner email (always gets admin role)
# ANTHROPIC_API_KEY     — AI inventory analysis (optional)
# UPLOADTHING_TOKEN     — File uploads (optional)
# SENTRY_*              — Error monitoring (optional)
```

### 3c. Route/Feature Discipline

Document in `CLAUDE.md`: new routes or features must delete the old ones in the same PR. No stale route accumulation.

### 3d. CLAUDE.md Refresh

After Phase 1 execution: one pass on `CLAUDE.md` to reflect:
- RLS architecture and session variable pattern
- Sentry config file locations
- Updated test strategy (unit + E2E)
- Confirmed dead code removed

---

## Success Criteria

- [ ] `/login`, `/portal/login`, `/account/[path]` return 404
- [ ] Beneficiary A session cannot read beneficiary B's data (app layer)
- [ ] Postgres RLS policies block cross-beneficiary queries at DB layer
- [ ] Sentry receives errors in production (verified via test event)
- [ ] tRPC 500 errors appear in Sentry with role tag
- [ ] E2E tests cover all 6 critical journeys and pass in CI
- [ ] Data isolation integration tests pass
- [ ] `CLAUDE.md` reflects current architecture

---

## What This Does Not Cover

- Email notifications (Resend removed — not implemented)
- Document uploads (UploadThing wired, not built out)
- Trustee fee automation
- Public inventory form hardening (separate phase 47/48)
