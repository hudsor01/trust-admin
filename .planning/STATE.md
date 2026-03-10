---
gsd_state_version: 1.0
milestone: v4.0
milestone_name: Production Hardening & Completeness
status: completed
stopped_at: Completed 20-02-PLAN.md (admin HEMS cancel, tax fields, distribution toggles)
last_updated: "2026-03-10T20:11:21.253Z"
last_activity: 2026-03-10 -- Completed 20-02 admin HEMS cancel, beneficiary tax fields, distribution tax toggles (FEAT-06, FEAT-07, FEAT-08)
progress:
  total_phases: 8
  completed_phases: 6
  total_plans: 15
  completed_plans: 15
  percent: 100
---

# State: Trust Admin

## Current Position

Milestone: v4.0 Production Hardening & Completeness
Phase: 20 of 22 (beneficiary-distribution-features)
Plan: 2 of 2 completed in current phase
Status: Phase complete
Last activity: 2026-03-10 -- Completed 20-02 admin HEMS cancel, beneficiary tax fields, distribution tax toggles (FEAT-06, FEAT-07, FEAT-08)

Progress: [██████████] 100%

## Accumulated Context

### Key Decisions

- **userProfile.role is source of truth for tRPC authorization** (not Neon Auth native role)
- **ADMIN_EMAIL env var overrides role** -- owner email always gets admin regardless of DB state
- Neon Auth native role ("admin"/"user") used only by layout guards for routing
- RLS via `initJwtSession()` already implemented
- **Hybrid driver approach:** neon() HTTP for Drizzle, postgres.js for raw SQL
- **Two-step provisioning:** authServer.admin.createUser() -> set emailVerified=true via raw SQL -> upsert userProfile
- **emailVerified MUST be set to true** for admin-created users or sign-in returns 403
- **Neon Auth updateUser() returns 400** -- use raw SQL against neon_auth."user" instead
- **neon_auth."user" uses camelCase columns** ("emailVerified", "updatedAt", "createdAt")
- **Single login page** at /auth/sign-in with AuthView redirectTo="/"
- **Neon Auth cookie** is `__Secure-neon-auth.session_token`
- **proxy.ts at src/proxy.ts** -- Next.js 16 proxy convention
- **forcePasswordChange flag** in user_profile -- set to true when admin creates beneficiary account
- **Forgot password** uses custom flow (n8n webhook) -- Neon Auth email not used
- [v4.0] Phase structure derived from 45-finding critical review; security-first ordering
- [v4.0] Phases 16/17/18 can run in parallel after Phase 15 (no cross-dependencies)
- [v4.0] E2E setup route gated with x-e2e-secret header check against E2E_SETUP_SECRET env var (fail-closed)
- [v4.0] E2E setup response stripped to email-only -- no userId or beneficiaryId leaked
- [v4.0] Cookie secret uses z.string().trim().min(32) -- app refuses to start without valid secret
- [v4.0] ADMIN_EMAIL centralized via validated env module -- no process.env.ADMIN_EMAIL in src/server/
- [v4.0] Session revocation after password changes is best-effort (Sentry on failure, no user-facing error)
- [v4.0] Reset-password API returns generic 'Invalid input' on validation failure (no schema detail leaks)
- [v4.0] In-memory Map for IP lockout -- sufficient for single Vercel instance; no Redis needed at current scale
- [v4.0] Upload route response key changed from 'paths' to 'urls' for UploadThing migration
- [v4.0] activity_log immutable: no UPDATE/DELETE RLS, INSERT enforces changedBy = own user ID
- [v4.0] No FORCE ROW LEVEL SECURITY on activity_log -- neondb_owner must bypass for system audit
- [v4.0] RLS migration SQL applied manually (not db:push) due to Drizzle bugs with RLS policies
- [v4.0] /api/inventory removed from proxy publicPaths -- defense-in-depth with route-level auth
- [v4.0] 10MB base64 limit per image on analyze route (~7.5MB raw after base64 decoding)
- [v4.0] Portal prefetch: useSession() kept for display name only, beneficiary.me.useQuery() unconditional (layout validates auth)
- [v4.0] Portal page.tsx no dynamic export needed -- parent layout already has force-dynamic
- [v4.0] Accounting listPaginated uses entryType filter + offset/limit (page size 50, limit 1-100)
- [v4.0] Tab badge counts from totals query entryCount, not array lengths -- accurate across all pages
- [v4.0] DataTable client-side pagination disabled for accounting; custom Previous/Next controls used
- [v4.0] Dashboard totals via SQL SUM (summaryTotals procedure) -- not client-side sumStrings over all rows
- [v4.0] Dashboard accounting entries bounded to 10 per type (recentAccountingEntries) -- no unbounded fetches
- [v4.0] listAllUsers changed from ownerProcedure to adminProcedure -- read-only data safe for all admins; non-owner admins see same data without mutation controls
- [v4.0] Nullish coalescing (??) for money string fallbacks -- principalPortion="0.00" is a valid value, not falsy
- [v4.0] Bulk UPDATE with CASE/WHEN via tx.unsafe() for beneficiary share redistribution -- safe because values are DB integers and computed decimals
- [v4.0] requireAtLeastOneField() Zod .refine() on all 26 update schemas -- prevents silent no-op UPDATEs from empty payloads
- [v4.0] Password reset token dedup: invalidate existing (set usedAt) before insert, cleanup expired > 24h
- [v4.0] Asset router pattern: replicate vehicle.ts exactly (adminProcedure, entityId filter, updatedAt on write, NOT_FOUND on missing)
- [v4.0] Sidebar asset links ordered: Properties, Accounts, Vehicles, Artwork, Personal Property, Insurance, Inventory Queue
- [v4.0] Insurance policies use coverageAmount (not dodValue) as primary value metric in dashboard totals
- [v4.0] Insurance table uses ACTIVE/EXPIRED/CANCELLED status subset (not SOLD/TRANSFERRED/DISPOSED)
- [v4.0] Beneficiary cancel uses direct async function (not useActionState) -- button click not form submit
- [v4.0] HEMS status badge mapping defined locally in HemsHistoryCard -- global STATUS_VARIANTS lacks HEMS statuses
- [v4.0] Tax ID masking via helper text below field -- EditableTextCell has no displayValue prop; full value visible only in admin edit mode
- [v4.0] HEMS cancel button on all non-CANCELLED statuses with contextual warning for processed (APPROVED/DISTRIBUTED) requests
- [v4.0] Distribution tax toggles use Switch component with inline tRPC mutation to distribution.update

### Auth API Patterns That Work

```typescript
// Create user
const { user: newUser } = await authServer.admin.createUser({ email, name, password, role: 'user' })

// Set emailVerified (must do for admin-created users)
await getSql().query(`UPDATE neon_auth."user" SET "emailVerified" = true WHERE id = $1`, [userId])

// Upsert user_profile
await db.insert(userProfile).values({...}).onConflictDoUpdate({
    target: userProfile.userId,
    set: { role, beneficiaryId, forcePasswordChange, updatedAt: new Date() }
})

// Update user record
await getSql().query(`UPDATE neon_auth."user" SET "updatedAt" = $1 WHERE id = $2`, [new Date(), userId])

// List users
const { users } = await authServer.admin.listUsers({ query: { limit: 100, offset: 0 } })

// Forgot password -- direct SQL lookup (NOT listUsers)
const rows = await sql`SELECT id, name, email FROM neon_auth."user" WHERE lower(email) = lower(${email}) LIMIT 1`
```

### Blockers/Concerns

- ~~SEC-07 (UploadThing migration) requires verifying UploadThing config is still active and token valid~~ DONE in 16-02
- ~~CORR-04 (deprecated API migration) may affect Users page behavior for non-owner admins~~ DONE in 18-02

## Roadmap Evolution

- 2026-01-23: v1.0 shipped -- Neon Platform Integration (phases 1-6)
- 2026-01-22: v2.0 shipped -- Public Inventory Form (phases 7-8)
- 2026-02-22: v3.0 shipped -- Email/Password Auth Migration (phases 9-14)
- 2026-02-24: Forgot-password flow built outside GSD (unplanned)
- 2026-03-08: v4.0 roadmap created -- Production Hardening & Completeness (phases 15-22)

## Session Continuity

Last session: 2026-03-10T20:11:21.251Z
Stopped at: Completed 20-02-PLAN.md (admin HEMS cancel, tax fields, distribution toggles)
Resume file: None
