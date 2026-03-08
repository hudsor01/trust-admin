# State: Trust Admin

## Current Position

Milestone: v4.0 Production Hardening & Completeness
Phase: Not started (defining requirements)
Status: Defining requirements
Last activity: 2026-03-08 — Milestone v4.0 started

Progress: ░░░░░░░░░░ 0%

## Accumulated Context

### Key Decisions

- **userProfile.role is source of truth for tRPC authorization** (not Neon Auth native role)
- **ADMIN_EMAIL env var overrides role** — owner email always gets admin regardless of DB state
- Neon Auth native role ("admin"/"user") used only by layout guards for routing
- RLS via `initJwtSession()` already implemented
- **Hybrid driver approach:** neon() HTTP for Drizzle, postgres.js for raw SQL
- **Two-step provisioning:** authServer.admin.createUser() → set emailVerified=true via raw SQL → upsert userProfile
- **emailVerified MUST be set to true** for admin-created users or sign-in returns 403
- **Neon Auth updateUser() returns 400** — use raw SQL against neon_auth."user" instead
- **neon_auth."user" uses camelCase columns** ("emailVerified", "updatedAt", "createdAt")
- **Single login page** at /auth/sign-in with AuthView redirectTo="/"
- **Neon Auth cookie** is `__Secure-neon-auth.session_token`
- **proxy.ts at src/proxy.ts** — Next.js 16 proxy convention
- **forcePasswordChange flag** in user_profile — set to true when admin creates beneficiary account
- **Forgot password** uses custom flow (n8n webhook) — Neon Auth email not used

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

// Forgot password — direct SQL lookup (NOT listUsers)
const rows = await sql`SELECT id, name, email FROM neon_auth."user" WHERE lower(email) = lower(${email}) LIMIT 1`
```

## Roadmap Evolution

- 2026-01-23: v1.0 shipped — Neon Platform Integration (phases 1-6)
- 2026-01-22: v2.0 shipped — Public Inventory Form (phases 7-8)
- 2026-02-22: v3.0 shipped — Email/Password Auth Migration (phases 9-14)
- 2026-02-24: Forgot-password flow built outside GSD (unplanned)
- 2026-03-08: v4.0 started — Production Hardening & Completeness (45 findings from critical review)

## Session Continuity

Last session: 2026-03-08
Stopped at: Defining v4.0 requirements from critical review findings
Resume file: .planning/v4-critical-review.md
