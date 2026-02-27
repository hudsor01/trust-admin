# Phase 52: Forced Password Change - Research Context

## Concept

When admin creates a beneficiary account with a temp password, the beneficiary must change their password on first login before accessing any portal features.

## Where the Flag Lives

**Add to `user_profile` table** (`db/schema.ts`):
```typescript
forcePasswordChange: boolean('force_password_change').notNull().default(false)
```

Migration:
```sql
ALTER TABLE user_profile ADD COLUMN force_password_change BOOLEAN NOT NULL DEFAULT false;
```

**Why `user_profile`?** — It's the app-managed table for user metadata. Neon Auth's `neon_auth.user` does not support custom fields.

## Interception Points

### Portal Layout (`src/app/portal/layout.tsx`)

Current flow:
1. Check `authServer.getSession()`
2. If no session → redirect to login
3. If admin → redirect to `/dashboard`
4. Render portal

**Add after step 3:**
```typescript
// Fetch userProfile to check forcePasswordChange
const [profile] = await db.select().from(userProfile)
  .where(eq(userProfile.userId, session.user.id))

if (profile?.forcePasswordChange) {
  redirect('/portal/change-password')
}
```

### tRPC Context (optional hardening)

Could also check in `createContext()` and set a flag on the context, so beneficiary procedures reject requests if password change is pending. Prevents API-level bypass.

## Password Change Flow

```
1. Beneficiary signs in with temp password
2. Portal layout detects forcePasswordChange=true
3. Redirect to /portal/change-password
4. User enters: current password (temp) + new password + confirm
5. Client calls: authClient.changePassword({ currentPassword, newPassword })
6. On success: tRPC mutation clears forcePasswordChange flag
7. Redirect to /portal (normal portal access)
```

## SDK Method

```typescript
// Client-side (from @neondatabase/auth/next client)
await authClient.changePassword({
  currentPassword: 'temp-password',
  newPassword: 'new-secure-password'
})
```

This is a Better Auth core method, available through the Neon Auth SDK.

## UI Needed

### `/portal/change-password/page.tsx`

- Simple form: current password, new password, confirm password
- Cannot navigate away (layout forces redirect back)
- On success: calls tRPC mutation to clear flag, then redirects to portal
- Styling: match existing auth pages (Hudson Living Trust branding)

### tRPC Mutation

```typescript
clearForcePasswordChange: protectedProcedure.mutation(async ({ ctx }) => {
  await db.update(userProfile)
    .set({ forcePasswordChange: false, updatedAt: new Date() })
    .where(eq(userProfile.userId, ctx.user.id))
})
```

## When Flag Is Set

- Phase 51: `createBeneficiaryUser` sets `forcePasswordChange: true` in `userProfile` insert
- Admin can also reset: `authServer.admin.setUserPassword()` + set flag back to `true`

## Edge Cases

| Scenario | Handling |
|----------|----------|
| User navigates away from change-password | Layout redirect forces them back |
| User tries API directly (tRPC) | Optional: reject in context if flag is set |
| Admin resets password later | Set `forcePasswordChange: true` again |
| User already changed password voluntarily | Flag is false, no redirect |
| Multiple tabs open | Second tab will also redirect |

## Alternative Considered: Magic Link Instead of Temp Password

Could skip temp passwords entirely:
1. Admin creates account → system sends magic link email
2. Beneficiary clicks link → sets their own password
3. No `forcePasswordChange` needed

**Decision:** Implement both. `forcePasswordChange` handles the case where admin gives credentials directly (e.g., in person, over phone). Magic link handles email-capable beneficiaries.
