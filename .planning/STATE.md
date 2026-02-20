# State: Trust Admin - Codebase Cleanup

## Current Position

Phase: 54 (codebase-cleanup) - COMPLETE
Plan: 1 of 1 complete
Status: Complete — ready to merge
Last activity: 2026-02-20 - Completed 54-01-PLAN.md

Progress: ██████████ 100%

## Accumulated Context

### Key Decisions

- **userProfile.role is source of truth for tRPC authorization** (not Neon Auth native role)
- Neon Auth native role ("admin"/"user") used only by layout guards for routing
- "user" role is safe fallback for users without a userProfile record
- RLS via `initJwtSession()` already implemented
- Drizzle configured with `entities.roles.provider: 'neon'`
- **Hybrid driver approach:** neon() HTTP for Drizzle, postgres.js for raw SQL
- Neon Auth supports email/password natively (not a plugin — core feature)
- Neon Auth supported plugins: Admin, Email OTP, JWT, Organization, Open API
- Cannot bring custom Better Auth plugins to Neon Auth
- **NeonAuthUIProvider prop for email/password is `credentials`** (not `emailAndPassword`)
- Both `emailOTP` and `credentials` enabled — dual auth methods
- **Two-step provisioning:** authServer.admin.createUser() → insert userProfile (Phase 51 RESEARCH)
- **Don't write to neon_auth.* tables** — use Admin plugin API only
- **LogAction enum uses INSERT/UPDATE** (not CREATE) — discovered in 51-01
- **Neon Auth listUsers() requires `{ query: {...} }` shape** — not flat params
- **Neon Auth createUser() returns `{ user: UserWithRole }`** — access via newUser.user.id

### Blockers/Concerns Carried Forward

- Better Auth #5879: Users sometimes can't login after createUser — may need setUserPassword as fallback (monitor during implementation)

### Deferred Issues

None

## Roadmap Evolution

- 2026-01-23: Milestone v1.0 created - Neon Platform Integration, 6 phases
- 2026-01-23: All 6 phases completed
- 2026-01-30: Milestone v9.0 created - Email/Password Auth Migration, 5 phases (49-53)
- 2026-01-30: Phase 49 (fix-role-mismatch) completed - 1 plan
- 2026-01-31: Phase 50 (enable-email-password) completed - 1 plan
- 2026-01-31: Phase 51 plan 01 (backend provisioning router) completed

## Session Continuity

Last session: 2026-02-20
Completed: Phase 54 (54-01-PLAN.md) — all tasks done, verified clean
Next: Merge chore/codebase-cleanup into main via PR
