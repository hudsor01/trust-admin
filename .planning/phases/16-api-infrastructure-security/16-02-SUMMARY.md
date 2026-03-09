---
phase: 16-api-infrastructure-security
plan: 02
subsystem: api
tags: [crypto, timingSafeEqual, uploadthing, security, rate-limiting]

# Dependency graph
requires:
  - phase: none
    provides: none
provides:
  - Timing-safe access code comparison via crypto.timingSafeEqual
  - IP-based lockout (5 attempts, 15-minute window)
  - UploadThing-based inventory upload (no filesystem writes)
affects: [inventory-forms, upload-routes]

# Tech tracking
tech-stack:
  added: []
  patterns: [constant-time string comparison, in-memory IP lockout, UTApi upload]

key-files:
  created:
    - tests/lib/verify-access.test.ts
    - tests/api/inventory-upload.test.ts
  modified:
    - src/app/forms/_actions/verifyAccess.ts
    - src/app/api/inventory/upload/route.ts

key-decisions:
  - "In-memory Map for IP lockout (sufficient for single-instance Vercel deployment)"
  - "Export lockout helpers for direct testing (constantTimeCompare, checkLockout, recordFailure, resetFailures)"
  - "Response key changed from 'paths' to 'urls' for UploadThing migration"

patterns-established:
  - "constantTimeCompare: Buffer-based timing-safe string comparison with padding for different lengths"
  - "IP lockout: in-memory Map with count threshold and time-based expiry"

requirements-completed: [SEC-09, SEC-07]

# Metrics
duration: 4min
completed: 2026-03-09
---

# Phase 16 Plan 02: Access Code Hardening & Upload Migration Summary

**Timing-safe access code comparison with IP lockout, and UploadThing-based upload replacing broken filesystem writes**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-09T03:47:39Z
- **Completed:** 2026-03-09T03:52:29Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Replaced plain `===` access code comparison with `crypto.timingSafeEqual` via `constantTimeCompare` helper
- Added IP-based lockout: 5 failed attempts triggers 15-minute lockout, resets on success or expiry
- Migrated inventory upload route from `node:fs/promises` (broken on Vercel read-only FS) to `UTApi.uploadFiles()`
- All 18 tests pass across both test files, TypeScript clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Timing-safe access code comparison with IP-based lockout**
   - `a8f1c13` (test) - TDD RED: failing tests for timing-safe comparison and IP lockout
   - `20656d1` (feat) - TDD GREEN: implement constantTimeCompare + IP lockout

2. **Task 2: Migrate inventory upload route to UploadThing**
   - `5e2ee30` (test) - TDD RED: failing tests for UploadThing-based upload
   - `78a9935` (feat) - TDD GREEN: rewrite upload route with UTApi

_Note: TDD tasks have two commits each (test then feat)_

## Files Created/Modified
- `src/app/forms/_actions/verifyAccess.ts` - Added constantTimeCompare, IP lockout (checkLockout/recordFailure/resetFailures), headers-based IP extraction
- `src/app/api/inventory/upload/route.ts` - Replaced fs writes with UTApi.uploadFiles(), returns URLs instead of paths
- `tests/lib/verify-access.test.ts` - 10 tests for timing-safe comparison, lockout lifecycle, and locked-out request rejection
- `tests/api/inventory-upload.test.ts` - 8 tests for UploadThing upload, validation, no-fs-import check, auth rejection

## Decisions Made
- Used in-memory Map for IP lockout -- sufficient for single Vercel instance; no need for Redis at current scale
- Exported lockout internals (failedAttempts Map, helper functions) for direct testability
- Changed response key from `paths` to `urls` since values are now remote UploadThing URLs, not local filesystem paths

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Access code verification hardened with timing-safe comparison and lockout
- Upload route now works on Vercel (no filesystem dependency)
- Both features fully tested with TDD approach

## Self-Check: PASSED

All 4 files verified present. All 4 commit hashes verified in git log.

---
*Phase: 16-api-infrastructure-security*
*Completed: 2026-03-09*
