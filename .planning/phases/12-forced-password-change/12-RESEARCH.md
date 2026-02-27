# Phase 52: Forced Password Change - Research Report

## 1. authClient.changePassword() API Verification

### Auth Client Setup

**File:** `/Users/richard/Developer/trust-admin/src/lib/auth/client.ts`

```typescript
'use client'
import { createAuthClient } from '@neondatabase/auth/next'
export const authClient = createAuthClient()
```

The client is created via `@neondatabase/auth/next`, which wraps Better Auth's React client with Neon Auth plugins (admin, JWT, organization, email-otp).

### changePassword Method - Confirmed Available

**Source:** `@neondatabase/auth/dist/next/index.d.mts` (line 1426)

The method is available directly on `authClient.changePassword()` with this exact signature:

```typescript
authClient.changePassword({
  currentPassword: string,     // Required - the existing (temp) password
  newPassword: string,         // Required - the new password to set
  revokeOtherSessions?: boolean, // Optional - revoke all other sessions
})
```

**Returns:**
```typescript
Promise<{
  data: {
    token: string | null,  // New session token if other sessions were revoked
    user: {
      id: string,
      email: string,
      name: string,
      image: string | null | undefined,
      emailVerified: boolean,
      createdAt: Date,
      updatedAt: Date,
    }
  } | null,
  error: {
    code?: string,
    message?: string,
  } | null
}>
```

### Key Implementation Detail: sensitiveSessionMiddleware

The `changePassword` endpoint uses `sensitiveSessionMiddleware` (found at line 2467 of `api-D0cF0fk5.mjs`). This means the user **must have an active, authenticated session** with a valid session cookie. The beneficiary must be logged in before they can change their password -- this aligns with our flow since they sign in with the temp password first, then get redirected to the change-password page.

### No Existing Usage

No existing usage of `changePassword` was found anywhere in the codebase. This will be the first use.

### Server-Side Also Available

The `authServer` also has a `changePassword` path registered at `POST /change-password` (confirmed in `@neondatabase/auth/dist/next/server/index.mjs` line 82), but for this feature we use the **client-side** method since the beneficiary provides their current and new passwords in a form.

---

## 2. userProfile Schema

**File:** `/Users/richard/Developer/trust-admin/db/schema.ts` (lines 2187-2211)

### Current Definition

```typescript
export const userProfile = pgTable(
    'user_profile',
    (t) => ({
        userId: t.text('user_id').primaryKey().notNull(),
        role: userRole().notNull().default('beneficiary'),
        beneficiaryId: bigint('beneficiary_id', { mode: 'number' }),
        createdAt: t
            .timestamp('created_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
        updatedAt: t
            .timestamp('updated_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
    }),
    (table) => [
        foreignKey({
            columns: [table.beneficiaryId],
            foreignColumns: [beneficiary.id],
            name: 'user_profile_beneficiary_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
    ],
)
```

### Key Findings

- **`forcePasswordChange` does NOT exist yet.** Must be added.
- **`updatedAt` column exists** -- good, can be updated when clearing the flag.
- **No relations defined** in `db/relations.ts` for `userProfile`.
- **Types are auto-inferred:** `UserProfile` and `InsertUserProfile` are derived from the table.

### What Needs to Change

Add after `beneficiaryId`:
```typescript
forcePasswordChange: t.boolean('force_password_change').notNull().default(false),
```

### Validation Schemas

**File:** `/Users/richard/Developer/trust-admin/db/validation.ts` (lines 370-375)

```typescript
export const insertUserProfileSchema = createInsertSchema(userProfile, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
})
export const selectUserProfileSchema = createSelectSchema(userProfile)
export const updateUserProfileSchema = insertUserProfileSchema.partial()
```

These use `drizzle-zod`'s `createInsertSchema`/`createSelectSchema` which **auto-generate from the table definition**. Adding `forcePasswordChange` to the table will automatically include it in these schemas. **No manual changes needed to `validation.ts`.**

---

## 3. Portal Layout

**File:** `/Users/richard/Developer/trust-admin/src/app/portal/layout.tsx`

### Current Implementation

```typescript
import { redirect } from 'next/navigation'
import { AppErrorBoundary } from '@/components/error-boundary'
import { authServer } from '@/lib/auth'

export default async function PortalLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { data: session } = await authServer.getSession()

    // Redirect to login if not authenticated
    if (!session?.user) {
        redirect('/auth/sign-in')
    }

    // Admin users should use the admin dashboard
    if (session.user.role === 'admin') {
        redirect('/dashboard')
    }

    return (
        <AppErrorBoundary ...>
            {children}
        </AppErrorBoundary>
    )
}
```

### Where to Add forcePasswordChange Redirect

After the admin redirect check (line 29), add a DB query for the user profile:

```typescript
// After admin role check, before rendering children:
const [profile] = await db
    .select({ forcePasswordChange: userProfile.forcePasswordChange })
    .from(userProfile)
    .where(eq(userProfile.userId, session.user.id))
    .limit(1)

if (profile?.forcePasswordChange) {
    redirect('/portal/change-password')
}
```

### Important: Avoid Redirect Loop

The change-password page itself lives under `/portal/`, so the layout will also run for it. The redirect must **exclude** the change-password route:

```typescript
if (profile?.forcePasswordChange && !request.nextUrl.pathname.startsWith('/portal/change-password')) {
    redirect('/portal/change-password')
}
```

**However**, since this is a Next.js App Router layout (not middleware), we do not have direct access to `request.nextUrl.pathname`. Two options:

1. **Move `/portal/change-password` outside the portal route group** (e.g., `/change-password`) so the portal layout does not apply.
2. **Use `headers()` to read the current path** from the request in the server component.
3. **Create a separate route group** like `(portal-auth)` that does not have the forcePasswordChange check.

**Recommendation:** Option 1 is simplest. Place the change-password page at `/portal/change-password/page.tsx` but wrap it with a check: the portal layout should check if the current path is `/portal/change-password` and skip the redirect. Since Next.js Server Components can access `headers()`, we can derive the pathname from the referer or use a different approach.

**Actually, the cleanest approach:** The portal layout wraps all `/portal/*` routes. We need to ensure the change-password page is still accessible. The simplest solution is to check the children's route segment. In Next.js App Router, we can use `headers()` to get the URL:

```typescript
import { headers } from 'next/headers'

const headersList = await headers()
const pathname = headersList.get('x-url') || headersList.get('x-invoke-path') || ''
```

But this is fragile. **Better approach: use a parallel/intercepting route or simply check inside the layout using the `next-url` header that Next.js sets internally.**

**Simplest reliable approach:** Move change-password **outside** the `portal` directory entirely, as a sibling like `/auth/change-password`. This avoids the portal layout entirely while still being protected by session checks in the page itself.

### Does Layout Currently Query userProfile?

No. The layout only calls `authServer.getSession()`. Adding a DB query introduces a new import (`db`, `userProfile`, `eq` from drizzle-orm).

---

## 4. Phase 51 createBeneficiaryUser

**File:** `/Users/richard/Developer/trust-admin/src/server/trpc/routers/userManagement.ts` (lines 112-117)

### Current userProfile Insert

```typescript
// 5. Create userProfile linking to beneficiary
await db.insert(userProfile).values({
    userId: createdUserId,
    role: 'beneficiary',
    beneficiaryId: input.beneficiaryId,
})
```

### What Needs to Change

Add `forcePasswordChange: true` to the insert:

```typescript
await db.insert(userProfile).values({
    userId: createdUserId,
    role: 'beneficiary',
    beneficiaryId: input.beneficiaryId,
    forcePasswordChange: true,  // Force password change on first login
})
```

This is a one-line addition. Since the column has `default(false)`, it will not break any other code that inserts user profiles without this field.

---

## 5. Existing Password-Related Patterns

### Existing Auth Pages

**File:** `/Users/richard/Developer/trust-admin/src/app/auth/[path]/page.tsx`

Uses Neon Auth's built-in `<AuthView>` component which handles:
- `/auth/sign-in`
- `/auth/sign-up`
- `/auth/forgot-password`
- `/auth/reset-password`
- `/auth/verify-email`

The styling uses a split-screen layout with branding on the left and the auth form on the right. For consistency, the change-password page should use similar styling.

### No Existing change-password Page

`/portal/change-password` does NOT exist. No change-password page exists anywhere.

### Portal Login

**File:** `/Users/richard/Developer/trust-admin/src/app/portal/login/page.tsx`

Simple redirect to `/auth/sign-in`. No custom form.

### Portal Directory Structure

```
src/app/portal/
├── _actions/submitHemsRequest.ts
├── _components/HemsRequestForm.tsx
├── login/page.tsx
├── page.tsx
└── layout.tsx
```

### Portal Dashboard (page.tsx)

The portal dashboard is a **client component** (`'use client'`) that uses:
- `authClient` from `@/lib/auth/client` for `signOut` and `useSession`
- `trpc` for data fetching
- shadcn/ui components (Card, Button, Badge, Table)

The change-password page should follow this same pattern as a client component.

---

## 6. tRPC Context

**File:** `/Users/richard/Developer/trust-admin/src/server/trpc/index.ts`

### Context Creation (lines 48-113)

```typescript
export async function createContext(_opts: { headers: Headers }) {
    const { data: session } = await authServer.getSession()

    let appUser: AppUser | null = null
    if (session?.user && session?.session?.token) {
        await initJwtSession(session.session.token)

        // Fetch role and beneficiaryId from userProfile
        const [profile] = await db
            .select({
                role: userProfile.role,
                beneficiaryId: userProfile.beneficiaryId,
            })
            .from(userProfile)
            .where(eq(userProfile.userId, session.user.id))
            .limit(1)

        // Build appUser with role from userProfile...
        appUser = { id, name, email, ..., role, beneficiaryId }
    }

    return { session, user: appUser }
}
```

### Key Findings

- **userProfile is already queried** in context creation, but only selects `role` and `beneficiaryId`.
- Adding `forcePasswordChange` to this select would make it available on the context.
- `beneficiaryId` is available on `ctx.user.beneficiaryId`.

### Could forcePasswordChange Be Checked in Context?

Yes. Two approaches:

**Option A: Add to AppUser type and context (recommended for API hardening)**
```typescript
export type AppUser = {
    // ... existing fields
    forcePasswordChange: boolean
}

// In createContext, add to select:
const [profile] = await db.select({
    role: userProfile.role,
    beneficiaryId: userProfile.beneficiaryId,
    forcePasswordChange: userProfile.forcePasswordChange,
}).from(userProfile)...

// Then in beneficiaryProcedure middleware:
if (ctx.user.forcePasswordChange) {
    throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must change your password before accessing the portal',
    })
}
```

**Option B: Only check in layout (simpler, UI-level only)**

Layout redirect handles it. tRPC calls from the change-password page itself work fine (needed for `clearForcePasswordChange` mutation).

**Recommendation:** Option A is more secure since it prevents API-level bypass. However, the `clearForcePasswordChange` mutation itself needs to be exempted from this check. This can be done by using `protectedProcedure` (not `beneficiaryProcedure`) for the clear mutation.

---

## 7. resetUserPassword in userManagement Router

**File:** `/Users/richard/Developer/trust-admin/src/server/trpc/routers/userManagement.ts` (lines 174-219)

### Current Implementation

```typescript
resetUserPassword: adminProcedure
    .input(z.object({
        userId: z.string(),
        newPassword: z.string().min(8),
    }))
    .mutation(async ({ input, ctx }) => {
        // 1. Verify userProfile exists
        const [profile] = await db.select().from(userProfile)
            .where(eq(userProfile.userId, input.userId)).limit(1)

        if (!profile) throw new TRPCError({ code: 'NOT_FOUND' })

        // 2. Call Neon Auth Admin API to reset password
        const { error } = await authServer.admin.setUserPassword({
            userId: input.userId,
            newPassword: input.newPassword,
        })

        if (error) throw new TRPCError({ code: 'BAD_REQUEST' })

        // 3. Log activity
        await createActivityLog({...})

        return { success: true }
    }),
```

### What Needs to Change

After resetting the password, also set `forcePasswordChange: true`:

```typescript
// After step 2 (successful password reset), add:
await db.update(userProfile)
    .set({ forcePasswordChange: true, updatedAt: new Date() })
    .where(eq(userProfile.userId, input.userId))
```

This ensures that when an admin resets a beneficiary's password, the beneficiary is forced to change it on next login.

---

## Gaps Identified

| # | Gap | Severity | Notes |
|---|-----|----------|-------|
| 1 | `forcePasswordChange` column does not exist in `userProfile` | **Blocker** | Must add to schema and run `db:push` |
| 2 | No `/portal/change-password` page exists | **Blocker** | Must create new page |
| 3 | No `clearForcePasswordChange` tRPC mutation exists | **Blocker** | Must add to userManagement router |
| 4 | Portal layout does not check `forcePasswordChange` | **Blocker** | Must add redirect logic |
| 5 | `createBeneficiaryUser` does not set `forcePasswordChange: true` | **Blocker** | One-line addition |
| 6 | `resetUserPassword` does not set `forcePasswordChange: true` | **Medium** | One-line addition |
| 7 | tRPC context does not include `forcePasswordChange` | **Low** | Optional API-level hardening |
| 8 | Admin layout does not check `forcePasswordChange` | **Low** | Admins may not need this if they only use magic links; only needed if admin accounts can also have temp passwords |
| 9 | No `db/relations.ts` entry for `userProfile` | **None** | Not needed for this feature |

---

## Risks and Blockers

### Risk 1: Portal Layout Redirect Loop
**Impact:** High
**Description:** The change-password page lives under `/portal/`, so the portal layout runs for it too. If the layout always redirects to `/portal/change-password` when `forcePasswordChange=true`, the change-password page itself will infinite-redirect.

**Mitigation options:**
1. Check the current pathname in the layout and skip the redirect for `/portal/change-password`. Use `headers()` to read `x-pathname` or `x-url` set by middleware/Next.js internals.
2. Move the change-password page outside the portal route group (e.g., `/auth/change-password`).
3. Use a nested layout: create `/portal/change-password/layout.tsx` that does NOT inherit the portal redirect behavior (not how Next.js works -- layouts are additive, not replaceable).

**Recommended:** Check pathname in the layout. Since we're in a Server Component, we can import `headers()` from `next/headers`. However, the raw URL path may not be directly available through headers in all deployment environments. The most reliable approach: **use Next.js `usePathname()` is client-only**, so for a Server Component layout, we'd need to pass props or use a workaround.

**Simplest reliable approach:** Add the page at `/portal/change-password/page.tsx`, and in the portal `layout.tsx`, detect the route segment using the [built-in params](https://nextjs.org/docs/app/api-reference/file-conventions/layout#params-optional) or by wrapping children differently. Actually, the most pragmatic solution: **add an early return condition in the layout that skips the forcePasswordChange check when the URL contains `/change-password`**. We can use `headers()` to get the `x-invoke-path` or `next-url` header.

### Risk 2: sensitiveSessionMiddleware on changePassword
**Impact:** Medium
**Description:** Better Auth's `changePassword` endpoint uses `sensitiveSessionMiddleware`. This may require the session to have been created recently (within a configurable window). If the beneficiary logged in with a temp password and then some time passes, the session might be considered "stale" for sensitive operations.

**Mitigation:** In practice, since the beneficiary logs in and is immediately redirected to change-password, the session will be fresh. But if they leave the tab open for a long time, they may need to re-authenticate. The `sensitiveSessionMiddleware` typically checks if the session was created within the last few minutes. If this becomes an issue, we can set `revokeOtherSessions: true` which will force a new session creation.

### Risk 3: Race Condition - Multiple Tabs
**Impact:** Low
**Description:** If a beneficiary has multiple tabs open, tab A changes the password and clears the flag, while tab B still shows the change-password form. Tab B's submission will fail because the `currentPassword` is now different.

**Mitigation:** Not a real concern. The error from Better Auth will indicate the current password is wrong, and the user can refresh. No special handling needed.

### Risk 4: Admin Layout Not Protected
**Impact:** Low
**Description:** If an admin account is ever created with a temp password (unlikely -- admins currently use magic links), there's no `forcePasswordChange` check in the admin layout.

**Mitigation:** Defer to a later phase. Admin accounts are created through Neon Console or programmatically, not through the `createBeneficiaryUser` flow. If needed later, add the same check to `/src/app/(admin)/layout.tsx`.

---

## Recommendations for Implementation Plan

### Sub-phase 52-01: Schema + DB Push
1. Add `forcePasswordChange` boolean column to `userProfile` in `db/schema.ts`
2. Run `bun run db:push` to sync schema
3. Update `createBeneficiaryUser` to set `forcePasswordChange: true`
4. Update `resetUserPassword` to set `forcePasswordChange: true`

### Sub-phase 52-02: Change Password Page + tRPC Mutation
1. Create `clearForcePasswordChange` mutation in `userManagement.ts` router (uses `protectedProcedure`, not `beneficiaryProcedure`)
2. Create `/portal/change-password/page.tsx` client component:
   - Form: current password, new password, confirm password
   - Calls `authClient.changePassword({ currentPassword, newPassword })`
   - On success: calls `trpc.userManagement.clearForcePasswordChange.mutate()`
   - On success: redirects to `/portal`
   - Styling: match existing auth page branding (Hudson Living Trust)

### Sub-phase 52-03: Layout Interception
1. Update portal layout to query `forcePasswordChange` from `userProfile`
2. Redirect to `/portal/change-password` if flag is true (with pathname exclusion to avoid loop)
3. Optionally: add `forcePasswordChange` to tRPC context `AppUser` type for API-level hardening

### Testing Checklist
- [ ] New user created via `createBeneficiaryUser` → `forcePasswordChange=true` in DB
- [ ] Login with temp password → redirected to `/portal/change-password`
- [ ] Cannot navigate to `/portal` while flag is true
- [ ] Enter current (temp) + new password → password changed via Neon Auth
- [ ] Flag cleared in DB after successful change
- [ ] Redirected to `/portal` with full access
- [ ] Admin resets password → flag set back to `true`
- [ ] Second login after reset → forced to change again
