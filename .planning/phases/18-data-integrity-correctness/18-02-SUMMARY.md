---
phase: 18-data-integrity-correctness
plan: 02
subsystem: api
tags: [trpc, user-management, deprecated-api, promise-all, performance]

# Dependency graph
requires:
  - phase: 11-admin-user-provisioning
    provides: "Original userManagement router with listProvisionedUsers + listAllUsers"
provides:
  - "Single listAllUsers endpoint (adminProcedure) for all admin user listing"
  - "Parallel DB queries in listAllUsers via Promise.all"
  - "Simplified UsersClient with single data path"
affects: [user-management, admin-pages]

# Tech tracking
tech-stack:
  added: []
  patterns: [promise-all-parallel-queries, single-endpoint-migration]

key-files:
  created: []
  modified:
    - src/server/trpc/routers/userManagement.ts
    - src/app/(admin)/users/_components/UsersClient.tsx
    - src/app/(admin)/users/page.tsx
    - tests/trpc/crud-admin-ops.test.ts

key-decisions:
  - "listAllUsers changed from ownerProcedure to adminProcedure -- read-only data, safe for all admins"
  - "Non-owner admins see same user data as owners but without mutation controls (columns filter)"

patterns-established:
  - "Promise.all for independent DB queries: wrap parallel-safe Drizzle selects in Promise.all"

requirements-completed: [CORR-04, PERF-03]

# Metrics
duration: 3min
completed: 2026-03-09
---

# Phase 18 Plan 02: Deprecated API Migration Summary

**Removed listProvisionedUsers, unified user listing to adminProcedure listAllUsers with parallel DB queries**

## Performance

- **Duration:** 3 min (verification only -- code changes pre-applied)
- **Started:** 2026-03-09T06:02:04Z
- **Completed:** 2026-03-09T06:06:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Removed deprecated listProvisionedUsers procedure from router, frontend, and server page
- Changed listAllUsers from ownerProcedure to adminProcedure so all admins see the full user list
- Parallelized profile and beneficiary DB queries via Promise.all for lower latency
- Simplified UsersClient to a single data path (no conditional query selection based on isOwner)
- Removed unused desc import from drizzle-orm and cleaned up test references

## Task Commits

Each task was committed atomically:

1. **Task 1: Change listAllUsers to adminProcedure, add Promise.all, remove listProvisionedUsers** - `ab1b952` (feat)
2. **Task 2: Simplify UsersClient and users page to use single listAllUsers path** - `3012b6b` (feat)

**Plan metadata:** (this commit) (docs: complete plan)

## Files Created/Modified
- `src/server/trpc/routers/userManagement.ts` - listAllUsers now adminProcedure with Promise.all; listProvisionedUsers removed
- `src/app/(admin)/users/_components/UsersClient.tsx` - Single listAllUsers query, removed readOnlyData memo, simplified loading/tableData
- `src/app/(admin)/users/page.tsx` - Removed listProvisionedUsers.prefetch()
- `tests/trpc/crud-admin-ops.test.ts` - Removed listProvisionedUsers test cases

## Decisions Made
- **listAllUsers as adminProcedure**: The procedure only reads data (no mutations). Non-owner admins already have broad read access through adminProcedure. Owner-only mutations (createBeneficiaryUser, removeUser, setUserRole, etc.) remain gated by ownerProcedure.
- **Column-based access control**: Non-owner admins see the same data but without action columns (ownerColumns vs readOnlyColumns). The isOwner check remains for gating CRUD controls.

## Deviations from Plan

None - plan executed exactly as written. Code changes were pre-applied in earlier commits; this execution verified correctness and created documentation.

## Issues Encountered

- **Pre-existing build failure**: `bun run build` fails due to non-async exported functions in `src/app/forms/_actions/verifyAccess.ts` (from phase 16, commit 98b370f). Already documented in `deferred-items.md`. Not related to this plan's changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- User management API fully consolidated to single listAllUsers endpoint
- All admin users (owner and non-owner) now share the same data source
- Ready for any future user management enhancements

## Self-Check: PASSED

- All 5 source/planning files: FOUND
- Commits ab1b952 and 3012b6b: FOUND
- listAllUsers uses adminProcedure: VERIFIED
- Promise.all in listAllUsers: VERIFIED
- No listProvisionedUsers in router: VERIFIED
- TypeScript typecheck: PASSED
- Tests (19/19): PASSED
- grep listProvisionedUsers src/ tests/: 0 matches

---
*Phase: 18-data-integrity-correctness*
*Completed: 2026-03-09*
