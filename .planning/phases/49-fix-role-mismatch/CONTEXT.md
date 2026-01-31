# Phase 49: Fix Role Mismatch - Research Context

## The Bug

Neon Auth sets non-admin users to role `"user"` (default), but `beneficiaryProcedure` checks for `role === "beneficiary"`. This breaks ALL beneficiary portal procedures.

## Affected Procedures (ALL BROKEN)

1. `beneficiary.me()` - View own beneficiary profile
2. `hemsRequest.submit()` - Submit HEMS request
3. `hemsRequest.myRequests()` - View own HEMS requests
4. `distribution.myDistributions()` - View own distributions

## Root Cause: Dual Role System

| Source | Column | Values | Used By |
|--------|--------|--------|---------|
| Neon Auth native | `neon_auth.user.role` | `"admin"` \| `"user"` | Layout guards, tRPC context |
| App-managed | `user_profile.role` | `"admin"` \| `"beneficiary"` | **NOTHING** (ignored) |

- `createContext()` reads `session.user.role` from Neon Auth → always `"admin"` or `"user"`
- `beneficiaryProcedure` checks `ctx.user.role !== 'beneficiary'` → ALWAYS throws FORBIDDEN
- `userProfile.role` is fetched but only `beneficiaryId` is used, role is ignored

## Files & Line Numbers

### CRITICAL (must change)
- `src/server/trpc/index.ts:172` - `beneficiaryProcedure` checks `role !== 'beneficiary'`
- `src/server/trpc/index.ts:66-76` - Context builds `appUser.role` from Neon Auth, ignores `userProfile.role`
- `src/lib/auth.ts:74-78` - `isBeneficiary()` checks `role === 'beneficiary'` (always false)
- `src/lib/auth.ts:54-57` - `AppUser` type expects `'admin' | 'beneficiary'`

### Role checks for `'admin'` (WORKING, no change needed)
- `src/server/trpc/index.ts:156` - `adminProcedure`
- `src/app/page.tsx:23` - Root gateway redirect
- `src/app/(admin)/layout.tsx:36` - Admin layout guard
- `src/lib/auth.ts:71` - `isAdmin()` utility

### Role checks for `'beneficiary'` (ALL BROKEN)
- `src/server/trpc/index.ts:172` - `beneficiaryProcedure`
- `src/lib/auth.ts:77` - `isBeneficiary()`

## Recommended Approach: Option 2 - Use userProfile.role as Source of Truth

**Why:** Neon Auth only supports `"admin"` and `"user"` — cannot set custom roles like `"beneficiary"`. The `userProfile` table already has a `role` column that defaults to `"beneficiary"`.

### Changes Required

1. **Update `createContext()`** to read role from `userProfile`:
   ```typescript
   const [profile] = await db
     .select({ beneficiaryId: userProfile.beneficiaryId, role: userProfile.role })
     .from(userProfile)
     .where(eq(userProfile.userId, session.user.id))

   appUser.role = profile?.role ?? (session.user.role === 'admin' ? 'admin' : 'user')
   ```

2. **Keep layout guards using Neon Auth role** (they check `"admin"` which works)

3. **beneficiaryProcedure stays the same** - now works because `userProfile.role` returns `"beneficiary"`

4. **Ensure all users have userProfile records** - migration for existing users

## Edge Cases

- User with no `userProfile` → defaults to `"user"` (safe, no access to beneficiary features)
- Admin with `userProfile.role = 'admin'` → admin checks work
- Need to create `userProfile` when admin provisions beneficiary accounts (Phase 51)

## Neon Auth Admin Plugin - Role Limitation

Confirmed: `authClient.admin.setRole()` only supports `"admin"` and `"user"`. Cannot set `"beneficiary"`. This is why we need the app-level `userProfile.role`.
