---
gsd_state_version: 1.0
milestone: v4.0
milestone_name: Production Hardening & Completeness
status: completed
stopped_at: Completed 15-01-PLAN.md (auth hardening + session revocation)
last_updated: "2026-03-09T01:29:42.185Z"
last_activity: 2026-03-09 -- Completed 15-02 E2E setup security (SEC-06)
progress:
  total_phases: 8
  completed_phases: 1
  total_plans: 2
  completed_plans: 2
  percent: 100
---

# State: Trust Admin

## Current Position

Milestone: v4.0 Production Hardening & Completeness
Phase: 15 of 22 (auth-session-security)
Plan: 2 of 2 in current phase
Status: Phase 15 complete
Last activity: 2026-03-09 -- Completed 15-02 E2E setup security (SEC-06)

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

- SEC-07 (UploadThing migration) requires verifying UploadThing config is still active and token valid
- CORR-04 (deprecated API migration) may affect Users page behavior for non-owner admins

## Roadmap Evolution

- 2026-01-23: v1.0 shipped -- Neon Platform Integration (phases 1-6)
- 2026-01-22: v2.0 shipped -- Public Inventory Form (phases 7-8)
- 2026-02-22: v3.0 shipped -- Email/Password Auth Migration (phases 9-14)
- 2026-02-24: Forgot-password flow built outside GSD (unplanned)
- 2026-03-08: v4.0 roadmap created -- Production Hardening & Completeness (phases 15-22)

## Session Continuity

Last session: 2026-03-09T01:29:42.183Z
Stopped at: Completed 15-01-PLAN.md (auth hardening + session revocation)
Resume file: None
