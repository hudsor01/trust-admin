---
phase: 51-admin-user-provisioning
plan: 01
subsystem: auth
tags: [trpc, neon-auth, admin-plugin, drizzle, user-provisioning]

# Dependency graph
requires:
  - phase: 49-fix-role-mismatch
    provides: userProfile.role as tRPC authorization source of truth
  - phase: 50-enable-email-password
    provides: email/password credentials enabled in Neon Auth
provides:
  - tRPC userManagement router with createBeneficiaryUser, listProvisionedUsers, resetUserPassword
  - Admin-only API for provisioning beneficiary portal accounts
affects: [52-forced-password-change, 53-beneficiary-data-isolation]

# Tech tracking
tech-stack:
  added: []
  patterns: [two-step-user-provisioning, admin-plugin-api-pattern]

key-files:
  created: [src/server/trpc/routers/userManagement.ts]
  modified: [src/server/trpc/router.ts]

key-decisions:
  - "Use INSERT/UPDATE LogAction values (not CREATE) to match existing enum"
  - "Access authServer.admin.listUsers via { query: { searchValue, searchField } } shape"
  - "Access createUser result via newUser.user.id (nested user property)"

patterns-established:
  - "Two-step provisioning: authServer.admin.createUser() then insert userProfile"
  - "Admin plugin API pattern: never write neon_auth.* directly"

issues-created: []

# Metrics
duration: 4min
completed: 2026-01-31
---

# Phase 51 Plan 01: Backend User Provisioning Router Summary

**tRPC userManagement router with createBeneficiaryUser, listProvisionedUsers, and resetUserPassword using Neon Auth Admin plugin API**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-01T00:21:22Z
- **Completed:** 2026-02-01T00:25:34Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created userManagement tRPC router with 3 admin-only procedures
- Two-step provisioning: creates Neon Auth user then inserts userProfile linked to beneficiaryId
- Email uniqueness check via Admin plugin listUsers API before creation
- Activity log audit trail on user creation and password reset

## Task Commits

Each task was committed atomically:

1. **Task 1: Create userManagement tRPC router** - `d850555` (feat)
2. **Task 2: Register router in appRouter** - `565f941` (feat)

**Plan metadata:** (this commit) (docs: complete plan)

## Files Created/Modified
- `src/server/trpc/routers/userManagement.ts` - New router with 3 procedures: createBeneficiaryUser, listProvisionedUsers, resetUserPassword
- `src/server/trpc/router.ts` - Registered userManagement router in appRouter

## Decisions Made
- Used `INSERT`/`UPDATE` LogAction enum values (plan said `CREATE` but enum uses `INSERT`)
- Neon Auth `listUsers()` requires `{ query: { searchValue, searchField } }` shape (not flat params)
- Neon Auth `createUser()` returns `{ user: UserWithRole }` (access via `newUser.user.id`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] LogAction enum mismatch**
- **Found during:** Task 1 (createBeneficiaryUser implementation)
- **Issue:** Plan specified `action: 'CREATE'` but LogAction enum uses `'INSERT'`
- **Fix:** Changed to `'INSERT'` for creates and `'UPDATE'` for password resets
- **Files modified:** src/server/trpc/routers/userManagement.ts
- **Verification:** Typecheck passes
- **Committed in:** d850555

**2. [Rule 3 - Blocking] Neon Auth API shape differences**
- **Found during:** Task 1 (typecheck)
- **Issue:** Two type errors — listUsers needs nested `{ query: {...} }` and createUser returns `{ user: UserWithRole }`
- **Fix:** Adjusted API call shapes to match actual Neon Auth types
- **Files modified:** src/server/trpc/routers/userManagement.ts
- **Verification:** Typecheck passes, build succeeds
- **Committed in:** d850555

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking), 0 deferred
**Impact on plan:** Both fixes necessary for type correctness. No scope creep.

## Issues Encountered
None

## Next Phase Readiness
- Backend API ready for frontend integration (51-02)
- `trpc.userManagement.createBeneficiaryUser.useMutation()` available to frontend
- `trpc.userManagement.listProvisionedUsers.useQuery()` available to frontend
- `trpc.userManagement.resetUserPassword.useMutation()` available to frontend

---
*Phase: 51-admin-user-provisioning*
*Completed: 2026-01-31*
