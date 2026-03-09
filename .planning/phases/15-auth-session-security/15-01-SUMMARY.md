---
phase: 15-auth-session-security
plan: 01
subsystem: auth
tags: [zod, env-validation, session-revocation, sentry, security]

# Dependency graph
requires:
  - phase: 14-auth-email-password
    provides: "Neon Auth integration, reset-password route, userManagement router"
provides:
  - "Required NEON_AUTH_COOKIE_SECRET with min(32) validation"
  - "Centralized ADMIN_EMAIL via validated env module"
  - "Zod-validated reset-password API input (token format + password length)"
  - "Session revocation after all password-change flows"
affects: [15-02, 16-data-integrity, 17-admin-ui-completion]

# Tech tracking
tech-stack:
  added: []
  patterns: ["env import for server secrets (env.ADMIN_EMAIL instead of process.env)", "Zod safeParse for API route input validation", "best-effort session revocation with Sentry fallback"]

key-files:
  created:
    - tests/lib/env-validation.test.ts
    - tests/api/reset-password-validation.test.ts
  modified:
    - src/lib/env.ts
    - src/lib/auth/server.ts
    - src/server/trpc/init.ts
    - src/server/trpc/routers/userManagement.ts
    - src/app/api/auth/custom/reset-password/route.ts

key-decisions:
  - "Cookie secret schema uses z.string().trim().min(32) -- trim prevents whitespace-only bypass"
  - "Session revocation is best-effort (log to Sentry on failure) to avoid blocking password resets"
  - "Reset-password error responses return generic 'Invalid input' to avoid leaking schema details"
  - "ADMIN_EMAIL sourced from validated env module in all server code (no process.env fallback)"

patterns-established:
  - "Validated env import: use `import { env } from '@/lib/env'` instead of `process.env` for server secrets"
  - "API route input validation: Zod safeParse with generic error messages (no schema detail leaks)"
  - "Post-password-change revocation: always call revokeUserSessions after setUserPassword"

requirements-completed: [SEC-01, SEC-02, SEC-03, SEC-05]

# Metrics
duration: 14min
completed: 2026-03-09
---

# Phase 15 Plan 01: Auth Session Security Summary

**Required cookie secret with min-length validation, centralized ADMIN_EMAIL imports, Zod-validated reset-password input, and session revocation on all password-change flows**

## Performance

- **Duration:** 14 min
- **Started:** 2026-03-09T01:13:53Z
- **Completed:** 2026-03-09T01:27:57Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- NEON_AUTH_COOKIE_SECRET is now required (not optional) with min(32) validation -- app refuses to start without it
- All `process.env.ADMIN_EMAIL` references in `src/server/` replaced with validated `env.ADMIN_EMAIL`
- Reset-password route validates token format (64 lowercase hex) and password length (8-128) via Zod
- Both password-reset flows (custom forgot-password and admin-initiated) now revoke all prior sessions
- 25 new unit tests covering env validation and reset-password schema validation

## Task Commits

Each task was committed atomically:

1. **Task 1: Harden env validation and centralize ADMIN_EMAIL (SEC-01, SEC-02)** - `5cd88ed` (feat)
2. **Task 2: Add Zod validation and session revocation to password reset (SEC-03, SEC-05)** - `0721414` (feat)

## Files Created/Modified
- `src/lib/env.ts` - NEON_AUTH_COOKIE_SECRET changed from optional to required with min(32)
- `src/lib/auth/server.ts` - Removed non-null assertion on cookie secret (TypeScript knows it's required)
- `src/server/trpc/init.ts` - OWNER_EMAIL sourced from env module instead of process.env
- `src/server/trpc/routers/userManagement.ts` - OWNER_EMAIL from env module + session revocation after admin password reset
- `src/app/api/auth/custom/reset-password/route.ts` - Zod input validation + session revocation after password change
- `tests/lib/env-validation.test.ts` - 8 tests for cookie secret schema validation
- `tests/api/reset-password-validation.test.ts` - 17 tests for reset-password input schema
- `tests/api/e2e-setup-auth.test.ts` - Pre-existing biome formatting fix
- `tests/e2e/global-setup.ts` - Pre-existing biome formatting fix

## Decisions Made
- Cookie secret uses `z.string().trim().min(32)` -- trim prevents whitespace-only values from passing
- Session revocation is best-effort: logs to Sentry on failure rather than failing the password reset
- Reset-password returns generic "Invalid input" error -- does not leak token format or password length rules
- ADMIN_EMAIL centralized via validated env module to prevent empty-string fallback via `?? ''`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed pre-existing biome formatting in e2e-setup-auth.test.ts and global-setup.ts**
- **Found during:** Task 1 (commit attempt)
- **Issue:** Pre-commit hook `biome check` failed on formatting in two unrelated test files
- **Fix:** Ran `bunx biome format --write` on both files
- **Files modified:** tests/api/e2e-setup-auth.test.ts, tests/e2e/global-setup.ts
- **Verification:** `bun run lint` passes
- **Committed in:** 5cd88ed (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Formatting fix in unrelated files required to pass pre-commit hook. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. NEON_AUTH_COOKIE_SECRET already present in .env (44 chars).

## Next Phase Readiness
- All SEC-01, SEC-02, SEC-03, SEC-05 requirements complete
- Plan 15-02 (E2E setup auth hardening) can proceed independently
- Phases 16/17/18 remain unblocked by this work

## Self-Check: PASSED

All 7 created/modified files verified. Both commit hashes (5cd88ed, 0721414) confirmed in git log.

---
*Phase: 15-auth-session-security*
*Completed: 2026-03-09*
