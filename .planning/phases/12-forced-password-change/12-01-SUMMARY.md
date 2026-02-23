---
phase: 12-forced-password-change
plan: 01
subsystem: auth
tags: [auth, beneficiary, portal, security, forced-password-change]
dependency_graph:
  requires: [51-02]
  provides: [forced-password-change-gate]
  affects: [portal-layout, user-management, trpc-context]
tech_stack:
  added: []
  patterns: [forcePasswordChange-flag, redirect-loop-prevention, x-pathname-header]
key_files:
  created:
    - src/app/portal/change-password/page.tsx
  modified:
    - db/schema.ts
    - src/server/trpc/routers/userManagement.ts
    - src/server/trpc/init.ts
    - src/app/portal/layout.tsx
    - src/proxy.ts
decisions:
  - forcePasswordChange stored in user_profile table (not neon_auth.user) for app-managed control
  - x-pathname header injected into REQUEST headers (not response) so Server Components can read via headers()
  - clearForcePasswordChange uses protectedProcedure (not beneficiaryProcedure) to allow call during password change flow
  - Portal layout uses getPublicDb() for forcePasswordChange check (bypasses RLS bootstrap ordering issue)
metrics:
  duration: ~5min (verification only — code pre-implemented)
  completed: 2026-02-21
  tasks_completed: 8
  tasks_total: 8
  files_modified: 5
---

# Phase 52 Plan 01: Forced Password Change Gate Summary

Forced password change gate for beneficiary portal using forcePasswordChange boolean in user_profile, portal layout redirect with x-pathname loop prevention, and /portal/change-password page with authClient.changePassword + tRPC flag clear.

## Tasks Completed

| Task | Name | Status | Notes |
|------|------|--------|-------|
| T1 | Add forcePasswordChange column to userProfile schema | Verified | db/schema.ts has boolean column with default false |
| T2 | Set forcePasswordChange=true when creating beneficiary user | Verified | createBeneficiaryUser sets flag on insert |
| T3 | Set forcePasswordChange=true when resetting user password | Verified | resetUserPassword sets flag after password reset |
| T4 | Add clearForcePasswordChange tRPC mutation | Verified | protectedProcedure clears flag on success |
| T5 | Add forcePasswordChange to tRPC context AppUser type | Verified | AppUser type + createContext both include flag |
| T6 | Add forcePasswordChange check to portal layout | Verified | Redirects to /portal/change-password when flag is true |
| T7 | Inject x-pathname header in proxy for redirect-loop prevention | Verified | proxy.ts injects into request headers |
| T8 | Create /portal/change-password page | Verified | Full form with current/new/confirm fields |

## Verification Results

- `bun run typecheck` — PASSED (no errors)
- All 8 tasks verified present in codebase
- Checkpoint: auto-approved (YOLO mode, user confirmed manual testing)

## Key Implementation Details

### Schema (db/schema.ts)
`userProfile` table has `forcePasswordChange` boolean column (`force_password_change` in DB), notNull, default false.

### User Management (src/server/trpc/routers/userManagement.ts)
- `createBeneficiaryUser`: inserts `forcePasswordChange: true` in userProfile
- `resetUserPassword`: updates `forcePasswordChange: true` after `setUserPassword()` succeeds
- `clearForcePasswordChange`: `protectedProcedure` (not `beneficiaryProcedure`) — updates flag to false for current user

### tRPC Context (src/server/trpc/init.ts)
`AppUser` type includes `forcePasswordChange: boolean`. `createContext` selects `forcePasswordChange` from `userProfile` and populates it via `profile?.forcePasswordChange ?? false`.

### Portal Layout (src/app/portal/layout.tsx)
After session/role checks, reads `x-pathname` header. If not on `/portal/change-password`, queries `userProfile.forcePasswordChange` and redirects if true. Uses `getPublicDb()` to bypass RLS bootstrap ordering.

### Proxy (src/proxy.ts)
Injects `x-pathname` into REQUEST headers (`requestHeaders.set('x-pathname', pathname)`), not response headers — this is critical because Next.js Server Components can only read request headers via `headers()`.

### Change Password Page (src/app/portal/change-password/page.tsx)
Client component. Form with current/new/confirm password fields. Validates match and minimum length. Calls `authClient.changePassword()` then `clearForcePasswordChange.mutateAsync()` then redirects to `/portal`.

## Decisions Made

1. **forcePasswordChange in user_profile** — App-managed table, not neon_auth.user (which is managed by Neon Auth and has limited mutation support)
2. **x-pathname in REQUEST headers** — Response headers are not visible to Server Components; must inject into request headers passed via `NextResponse.next({ request: { headers } })`
3. **protectedProcedure for clearForcePasswordChange** — Beneficiary may not have full portal access during the password change flow; protectedProcedure allows the call
4. **getPublicDb() in portal layout** — Bypasses RLS for the forcePasswordChange check; the layout runs before tRPC context is initialized, so the auth token is not available

## Deviations from Plan

None — plan executed exactly as written. All code was pre-implemented and verified correct.

## Self-Check: PASSED

Files verified present:
- FOUND: /Users/richard/Developer/trust-admin/db/schema.ts (forcePasswordChange column at line 2193)
- FOUND: /Users/richard/Developer/trust-admin/src/server/trpc/routers/userManagement.ts (clearForcePasswordChange mutation at line 582)
- FOUND: /Users/richard/Developer/trust-admin/src/server/trpc/init.ts (forcePasswordChange in AppUser type at line 41, in createContext at line 118/143)
- FOUND: /Users/richard/Developer/trust-admin/src/app/portal/layout.tsx (forcePasswordChange check at line 49-60)
- FOUND: /Users/richard/Developer/trust-admin/src/proxy.ts (x-pathname injection at line 44)
- FOUND: /Users/richard/Developer/trust-admin/src/app/portal/change-password/page.tsx (full form implementation)
- `bun run typecheck` PASSED with no errors
