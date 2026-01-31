# State: Trust Admin - Email/Password Auth Migration

## Current Position

Phase: 49 of 53 (fix-role-mismatch) - COMPLETE
Plan: 49-01 complete
Status: Ready for Phase 50
Last activity: 2026-01-30 - Phase 49 completed

Progress: ██░░░░░░░░ 20%

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

### Blockers/Concerns Carried Forward

- None (role mismatch fixed in Phase 49)

### Deferred Issues

None

## Roadmap Evolution

- 2026-01-23: Milestone v1.0 created - Neon Platform Integration, 6 phases
- 2026-01-23: All 6 phases completed
- 2026-01-30: Milestone v9.0 created - Email/Password Auth Migration, 5 phases (49-53)
- 2026-01-30: Phase 49 (fix-role-mismatch) completed - 1 plan

## Session Continuity

Last session: 2026-01-30
Stopped at: Phase 49 complete, ready for Phase 50 planning
Resume file: None
