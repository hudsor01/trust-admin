---
phase: 15-auth-session-security
plan: 02
subsystem: auth
tags: [e2e, security, api-endpoint, pre-shared-secret]

# Dependency graph
requires:
  - phase: none
    provides: none
provides:
  - Secret-gated E2E setup endpoint preventing unauthorized test account creation
  - Stripped response removing internal user/beneficiary IDs
affects: [e2e-tests, deployment-config]

# Tech tracking
tech-stack:
  added: []
  patterns: [pre-shared-secret-header-guard, response-data-minimization]

key-files:
  created:
    - tests/api/e2e-setup-auth.test.ts
  modified:
    - src/app/api/e2e/setup/route.ts
    - tests/e2e/global-setup.ts
    - .env

key-decisions:
  - "Guard logic uses x-e2e-secret header with process.env.E2E_SETUP_SECRET comparison"
  - "Response stripped to only email fields -- no userId or beneficiaryId leaked"
  - "Error responses sanitized to generic 'Setup failed' message"

patterns-established:
  - "Pre-shared secret header pattern: check header against env var, reject if either is missing or mismatched"

requirements-completed: [SEC-06]

# Metrics
duration: 9min
completed: 2026-03-09
---

# Phase 15 Plan 02: E2E Setup Security Summary

**Pre-shared secret header guard on /api/e2e/setup with response ID stripping and sanitized errors**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-09T01:13:51Z
- **Completed:** 2026-03-09T01:23:29Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 4

## Accomplishments
- E2E setup route now requires x-e2e-secret header matching E2E_SETUP_SECRET env var
- Response stripped of userId and beneficiaryId -- only email addresses returned
- Error responses sanitized to not leak raw exception strings
- Playwright global-setup updated to send the secret header
- Unit tests verify all guard rejection and acceptance cases

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): E2E setup auth guard tests** - `c96e5a3` (test)
2. **Task 1 (GREEN): Gate route + strip response + update caller** - `d4f52cc` (feat)

_TDD task: test commit followed by implementation commit._

## Files Created/Modified
- `tests/api/e2e-setup-auth.test.ts` - Unit tests for the secret header guard logic (5 test cases)
- `src/app/api/e2e/setup/route.ts` - Added x-e2e-secret header check, stripped IDs from response, sanitized error
- `tests/e2e/global-setup.ts` - Updated to send x-e2e-secret header and handle stripped response shape
- `.env` - Added E2E_SETUP_SECRET with local development value
- `tests/lib/env-validation.test.ts` - Fixed pre-existing lint issue (template literal)

## Decisions Made
- Guard checks both header presence AND env var presence -- if E2E_SETUP_SECRET is unset, all requests are rejected (fail-closed)
- Kept email addresses in response for logging convenience, only stripped internal database IDs
- Error message changed from raw exception to generic "Setup failed" to prevent information leakage

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed pre-existing Biome lint error in env-validation.test.ts**
- **Found during:** Task 1 (RED phase commit)
- **Issue:** Pre-commit hook failed due to `useTemplate` lint rule violation in tests/lib/env-validation.test.ts (string concatenation instead of template literal)
- **Fix:** Changed `'a'.repeat(32) + '  '` to `` `${'a'.repeat(32)}  ` ``
- **Files modified:** tests/lib/env-validation.test.ts
- **Verification:** `bun run lint` passes
- **Committed in:** c96e5a3 (part of RED phase commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Pre-existing lint issue blocked commit; fix was minimal and out-of-scope for this plan's concerns. No scope creep.

## Issues Encountered
None

## User Setup Required
- **Vercel/staging environments:** Add `E2E_SETUP_SECRET` env var with a secure random value
- **Local development:** Already added to `.env` with dev-only placeholder value
- **CI/CD:** E2E test pipeline needs `E2E_SETUP_SECRET` env var set to match the deployment target

## Next Phase Readiness
- SEC-06 (E2E setup security) complete
- E2E tests will continue to work as long as E2E_SETUP_SECRET env var is set in the test environment

---
*Phase: 15-auth-session-security*
*Completed: 2026-03-09*

## Self-Check: PASSED
- All created/modified files exist on disk
- All commit hashes found in git log (c96e5a3, d4f52cc)
