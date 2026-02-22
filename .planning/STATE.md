# State: Trust Admin - Email/Password Auth Migration

## Current Position

Phase: 52 of 53 (forced-password-change) - IN PROGRESS
Plan: 1 of 1 in phase (plan exists, execution in progress)
Status: In progress
Last activity: 2026-02-20 - Fixing proxy + auth flow for beneficiary sign-in

Progress: ██████░░░░ 60%

## Accumulated Context

### Key Decisions

- **userProfile.role is source of truth for tRPC authorization** (not Neon Auth native role)
- **ADMIN_EMAIL env var overrides role** — owner email always gets admin regardless of DB state
- Neon Auth native role ("admin"/"user") used only by layout guards for routing
- "user" role is safe fallback for users without a userProfile record
- RLS via `initJwtSession()` already implemented
- Drizzle configured with `entities.roles.provider: 'neon'`
- **Hybrid driver approach:** neon() HTTP for Drizzle, postgres.js for raw SQL
- Neon Auth supports email/password natively (credentials plugin enabled)
- **Two-step provisioning:** authServer.admin.createUser() → set emailVerified=true via raw SQL → upsert userProfile
- **emailVerified MUST be set to true** for admin-created users or sign-in returns 403
- **Neon Auth updateUser() returns 400** — use raw SQL against neon_auth."user" instead
- **neon_auth."user" uses camelCase columns** ("emailVerified", "updatedAt", "createdAt")
- **public.user table has 0 rows** — it's a leftover, ignore it
- **Single login page** at /auth/sign-in with AuthView redirectTo="/" — no separate admin/beneficiary logins
- **Neon Auth cookie** is `__Secure-neon-auth.session_token` — NOT `trust-admin.*` (old Better Auth prefix no longer applies)
- **proxy.ts at src/proxy.ts** (NOT src/app/proxy.ts) — Next.js 16 proxy convention
- **x-pathname header** injected by proxy into request headers; portal layout reads it to prevent redirect loops
- **forcePasswordChange flag** in user_profile — set to true when admin creates beneficiary account
- **upsert pattern** for user_profile inserts (onConflictDoUpdate) to handle retries

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

// Set role
await authServer.admin.setRole({ userId, role: 'admin' })

// Ban/unban
await authServer.admin.banUser({ userId, banReason: '...' })
await authServer.admin.unbanUser({ userId })

// Delete
await authServer.admin.removeUser({ userId })
```

### Blockers/Concerns Carried Forward

- Phase 52 plan exists but execution incomplete — proxy/auth fixes done in session, need checkpoint verification

### Deferred Issues

None

## Roadmap Evolution

- 2026-01-23: Milestone v1.0 created — Neon Platform Integration, 6 phases
- 2026-01-23: All 6 phases completed
- 2026-01-30: Milestone v9.0 created — Email/Password Auth Migration, 5 phases (49-53)
- 2026-01-30: Phase 49 (fix-role-mismatch) completed — 1 plan
- 2026-01-31: Phase 50 (enable-email-password) completed — 1 plan
- 2026-01-31: Phase 51 plan 01 (backend provisioning router) completed
- 2026-02-11: Phase 51 plan 02 (Users CRUD page) completed — full user management UI
- 2026-02-20: Phase 52 (forced-password-change) in progress — proxy/auth fixes applied

## Session Continuity

Last session: 2026-02-20
Stopped at: Fixed proxy cookie check + auth redirect flow; phase 52 checkpoint pending
Resume file: None
