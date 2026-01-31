# Phase 49 Plan 01: Fix Role Mismatch Summary

**Fixed critical bug: tRPC authorization now uses userProfile.role instead of Neon Auth's limited native role, unblocking all beneficiary portal procedures.**

## Accomplishments
- `createContext()` reads `role` from `userProfile` table (source of truth for tRPC)
- Fallback logic: profile.role → "admin" (if Neon Auth admin) → "user" (safe default)
- `AppUser` type updated to accept `'admin' | 'beneficiary' | 'user'`
- `beneficiaryProcedure` now works for users with `userProfile.role === 'beneficiary'`
- `adminProcedure` unchanged and still works
- Layout guards unchanged (still use Neon Auth `session.user.role` for routing)
- All 153 tests pass, typecheck clean, build succeeds

## Files Modified
- `src/server/trpc/index.ts` - Updated `createContext()` to select and use `userProfile.role`, updated `AppUser` type
- `src/lib/auth.ts` - Updated `AppUser` type to accept `'user'` fallback
- `src/lib/middleware.ts` - Updated `requireAuth()` role parameter type for consistency

## Decisions Made
- `userProfile.role` is the source of truth for tRPC authorization
- Neon Auth native role is only used by layout guards for routing
- "user" role is the safe fallback (no admin or beneficiary access)

## Commits
- `a2c7d1b` fix(49-01): use userProfile.role as source of truth for tRPC authorization

## Issues Encountered
- None

## Next Step
Phase 49 complete, ready for Phase 50 (enable-email-password)
