# State: Trust Admin - Email/Password Auth Migration

## Current Position

Phase: 49 of 53 (fix-role-mismatch)
Plan: Not started
Status: Ready to plan
Last activity: 2026-01-30 - Milestone v9.0 created

Progress: ░░░░░░░░░░ 0%

## Accumulated Context

### Key Decisions

- Using native `session.user.role` from Neon Auth
- RLS via `initJwtSession()` already implemented
- Drizzle configured with `entities.roles.provider: 'neon'`
- **Hybrid driver approach:** neon() HTTP for Drizzle, postgres.js for raw SQL
- Neon Auth supports email/password natively (not a plugin — core feature)
- Neon Auth supported plugins: Admin, Email OTP, JWT, Organization, Open API
- Cannot bring custom Better Auth plugins to Neon Auth
- beneficiaryProcedure currently broken: checks "beneficiary" but Neon Auth uses "user"
- userProfile table has its own role column but tRPC context ignores it

### Blockers/Concerns Carried Forward

- Role mismatch bug must be fixed before any beneficiary features work
- Need to decide: use Neon Auth native role OR userProfile.role as source of truth

### Deferred Issues

None

## Roadmap Evolution

- 2026-01-23: Milestone v1.0 created - Neon Platform Integration, 6 phases
- 2026-01-23: All 6 phases completed
- 2026-01-30: Milestone v9.0 created - Email/Password Auth Migration, 5 phases (49-53)

## Session Continuity

Last session: 2026-01-30
Stopped at: Milestone v9.0 initialization, researching phases
Resume file: None
