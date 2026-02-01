# State: Trust Admin - Email/Password Auth Migration

## Current Position

Phase: 51 of 53 (admin-user-provisioning) - PLANNED
Plan: 0 of 2 in phase complete
Status: Phase planned, ready for 51-01 execution
Last activity: 2026-01-31 - Created 51-01-PLAN.md and 51-02-PLAN.md

Progress: ████░░░░░░ 40%

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
- 2026-01-31: Phase 51 (admin-user-provisioning) planned - 2 plans

## Session Continuity

Last session: 2026-01-31
Stopped at: Phase 51 planned, ready for 51-01 execution
Resume file: None
