---
phase: 50-enable-email-password
plan: 01
subsystem: auth
tags: [neon-auth, email-password, credentials, magic-link, static-params]

# Dependency graph
requires:
  - phase: 49-fix-role-mismatch
    provides: userProfile.role as tRPC auth source of truth
provides:
  - Email/password authentication enabled alongside magic link
  - All auth paths statically generated (sign-in, sign-up, forgot-password, reset-password, etc.)
affects: [51-admin-user-provisioning, 52-forced-password-change]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dual auth methods: credentials + emailOTP on NeonAuthUIProvider"
    - "authViewPaths from @neondatabase/auth/react/ui/server for generateStaticParams"

key-files:
  created: []
  modified:
    - src/app/layout.tsx
    - src/app/auth/[path]/page.tsx

key-decisions:
  - "Used `credentials` prop (not `emailAndPassword`) — correct prop name from @daveyplate/better-auth-ui types"
  - "Kept emailOTP alongside credentials — users can choose either method"

patterns-established:
  - "Auth page uses authViewPaths for generateStaticParams (matches account/[path] pattern)"

issues-created: []

# Metrics
duration: 31min
completed: 2026-01-31
---

# Phase 50 Plan 01: Enable Email/Password Auth Summary

**Enabled email/password credentials auth in Neon Auth alongside existing magic link, with all auth routes statically generated via authViewPaths**

## Performance

- **Duration:** 31 min
- **Started:** 2026-01-31T14:27:55Z
- **Completed:** 2026-01-31T14:58:52Z
- **Tasks:** 1 auto task + 1 checkpoint
- **Files modified:** 2

## Accomplishments

- Email/Password enabled in Neon Console (manual step)
- NeonAuthUIProvider configured with both `emailOTP` and `credentials` props
- Auth page generates static params for all auth paths (sign-in, sign-up, forgot-password, reset-password, callback, email-otp, etc.)
- TypeScript compiles cleanly, build succeeds, 153 tests pass

## Task Commits

1. **Task 1: Enable credentials prop and add generateStaticParams** - `50cf929` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `src/app/layout.tsx` - Added `credentials` prop to NeonAuthUIProvider
- `src/app/auth/[path]/page.tsx` - Added `authViewPaths` import and `generateStaticParams` function

## Decisions Made

- **Used `credentials` prop instead of `emailAndPassword`:** The plan specified `emailAndPassword` but this prop doesn't exist on NeonAuthUIProvider. The actual prop from @daveyplate/better-auth-ui is `credentials`. Discovered via TypeScript error during type check.
- **Kept both auth methods:** `emailOTP` (magic link) and `credentials` (email/password) both enabled, giving users choice.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Corrected prop name from `emailAndPassword` to `credentials`**
- **Found during:** Task 1 (Enable emailAndPassword prop)
- **Issue:** Plan specified `emailAndPassword` prop but NeonAuthUIProvider doesn't accept it — TypeScript error TS2322
- **Fix:** Changed to `credentials` prop which is the correct name from @daveyplate/better-auth-ui types
- **Files modified:** src/app/layout.tsx
- **Verification:** `bun run typecheck` passes, `bun run build` succeeds
- **Committed in:** 50cf929

---

**Total deviations:** 1 auto-fixed (prop name correction)
**Impact on plan:** Minimal — same intent, different prop name. No scope creep.

## Authentication Gates

During execution, the Neon Console enablement was handled as a planned checkpoint:
1. User enabled Email/Password in Neon Console Auth Configuration
2. Confirmed completion before proceeding to code changes

## Issues Encountered

None

## Next Phase Readiness

- Email/password auth fully enabled and working
- Ready for Phase 51 (admin-user-provisioning) — admin can now create beneficiary accounts with email/password credentials
- Magic link remains available as alternative auth method

---
*Phase: 50-enable-email-password*
*Completed: 2026-01-31*
