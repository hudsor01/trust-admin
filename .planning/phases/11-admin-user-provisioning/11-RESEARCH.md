# Phase 51: Admin User Provisioning - Research

**Researched:** 2026-01-31
**Domain:** Neon Auth Admin plugin (Better Auth) — server-side user creation and management
**Confidence:** HIGH

<research_summary>
## Summary

Researched the Neon Auth Admin plugin API for server-side user provisioning. The `@neondatabase/auth` package (v0.1.0-beta.21) wraps Better Auth (v1.4.6) and exposes a full admin API via `authServer.admin.*` methods.

The key finding is that `createAuthServer()` automatically reads Next.js cookies from `next/headers`, so all admin methods called within tRPC route handlers automatically receive the calling admin's session context. This means we can call `authServer.admin.createUser()` directly from `adminProcedure` mutations without manually passing headers.

**Primary recommendation:** Use `authServer.admin.createUser()` for user creation, then directly insert into `user_profile` table via Drizzle to link the new Neon Auth user to a beneficiary record. The `createUser` endpoint is the only admin method that can work without an active session — all other methods (`setRole`, `setUserPassword`, `listUsers`) require an admin session via cookies.
</research_summary>

<standard_stack>
## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @neondatabase/auth | 0.1.0-beta.21 | Auth SDK with admin plugin | Managed Better Auth with built-in admin API |
| better-auth | 1.4.6 | Underlying auth framework | Powers all Neon Auth functionality |
| drizzle-orm | (installed) | Database ORM | For user_profile table operations |
| @trpc/server | v11 | API framework | For new admin procedures |

### No New Dependencies Needed
All admin operations are possible with existing packages. No new libraries required.
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Neon Auth Server Admin API Pattern

`createAuthServer()` creates a server-side client that:
1. Reads cookies from `next/headers` automatically
2. Proxies requests to `NEON_AUTH_BASE_URL` with cookie-based auth
3. Exposes `admin.*` methods matching Better Auth admin plugin

```typescript
// authServer is already configured in src/lib/auth/server.ts
import { authServer } from '@/lib/auth/server'

// All admin methods available:
authServer.admin.createUser({ email, password, name, role })
authServer.admin.setRole({ userId, role })
authServer.admin.setUserPassword({ userId, newPassword })
authServer.admin.listUsers({ limit, offset, searchValue, searchField })
authServer.admin.banUser({ userId, banReason })
authServer.admin.unbanUser({ userId })
authServer.admin.removeUser({ userId })
authServer.admin.impersonateUser({ userId })
```

### Server-Side createUser Call Pattern

```typescript
// From Better Auth docs — server-side createUser
// Does NOT require session headers (unique among admin methods)
const newUser = await authServer.admin.createUser({
  email: "beneficiary@example.com",
  password: "temp-password-123",
  name: "Alice Hudson",
  role: "user",  // Neon Auth role — NOT the app role
})
// Returns: { data: { id, email, name, role, ... }, error: null }
// Or: { data: null, error: { message, status } }
```

### Two-Step User Provisioning Pattern

```typescript
// Step 1: Create Neon Auth user
const { data: newUser, error } = await authServer.admin.createUser({
  email,
  password: tempPassword,
  name: beneficiary.firstName + ' ' + beneficiary.lastName,
  role: "user",  // Neon Auth native role (not "beneficiary")
})

// Step 2: Create user_profile linking to beneficiary
await db.insert(userProfile).values({
  userId: newUser.id,
  role: 'beneficiary',  // App-level role (tRPC authorization)
  beneficiaryId: beneficiaryId,
})
```

### tRPC Router Pattern (Match Existing)

```typescript
// src/server/trpc/routers/userManagement.ts
export const userManagementRouter = createTRPCRouter({
  createBeneficiaryUser: adminProcedure
    .input(z.object({
      beneficiaryId: z.number(),
      email: z.string().email(),
      tempPassword: z.string().min(8),
    }))
    .mutation(async ({ input, ctx }) => {
      // 1. Verify beneficiary exists and has no linked user
      // 2. Call authServer.admin.createUser()
      // 3. Insert user_profile with role='beneficiary'
      // 4. Log to activityLog
      // 5. Return success with userId (NOT the password)
    }),
})
```

### Anti-Patterns to Avoid
- **Don't set Neon Auth role to "beneficiary":** Neon Auth only uses "admin"/"user". App role lives in `user_profile.role`
- **Don't call admin methods from client-side:** All admin methods require server-side context with auth secret
- **Don't expose temp password in API response beyond initial creation:** Show once in UI, never persist or return again
- **Don't skip user_profile creation:** Without it, tRPC context defaults to "user" role (no beneficiary access)
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| User creation | Custom SQL to neon_auth tables | `authServer.admin.createUser()` | Neon Auth manages password hashing, account records, session handling |
| Password setting | Direct DB update | `authServer.admin.setUserPassword()` | Better Auth handles bcrypt hashing, credential provider linking |
| User listing | Direct query to neon_auth.user | `authServer.admin.listUsers()` | Handles pagination, search, filtering consistently |
| User banning | Custom disable flag | `authServer.admin.banUser()` | Revokes all sessions, handles ban expiry, integrated with auth flow |
| Email validation | Custom regex | Zod `z.string().email()` | Already standard in codebase |
| Password validation | Custom rules | Zod `z.string().min(8)` | Simple, matches Better Auth defaults |

**Key insight:** Never write directly to `neon_auth.*` tables. All user management goes through the Admin plugin API. The `user_profile` table is the only table we manage directly — it's our bridge between Neon Auth and business logic.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Session Context for Admin Methods
**What goes wrong:** Server-side admin calls return 401 Unauthorized
**Why it happens:** Most admin methods (except `createUser`) require an active admin session. The Neon Auth server client reads cookies from `next/headers` — but if called outside a request context (scripts, cron jobs), there are no cookies.
**How to avoid:** Always call admin methods from within tRPC route handlers where the admin's request context is available. For `createUser` specifically, it works without session — but `setRole` and `setUserPassword` require the admin to be authenticated.
**Warning signs:** 401 errors on `setRole`/`setUserPassword` but `createUser` works fine.

### Pitfall 2: Role Confusion (Neon Auth vs App)
**What goes wrong:** New user can't access beneficiary features despite being created correctly
**Why it happens:** Setting `role: "beneficiary"` in `createUser` doesn't work — Neon Auth only has "admin"/"user" roles. The app role must be set in `user_profile.role`.
**How to avoid:** Always create with `role: "user"` in Neon Auth, then set `role: 'beneficiary'` in `user_profile`.
**Warning signs:** User appears in Neon Auth but tRPC returns "user" role.

### Pitfall 3: Duplicate User Creation
**What goes wrong:** Admin tries to provision same email twice, gets cryptic error
**Why it happens:** Neon Auth enforces unique email constraint in `neon_auth.user`
**How to avoid:** Check if email already has a Neon Auth user before calling `createUser`. Also check if beneficiary already has a linked `user_profile`.
**Warning signs:** 500 error from `createUser` with duplicate key violation.

### Pitfall 4: User Login Failure After createUser
**What goes wrong:** User created via admin API can't log in with password
**Why it happens:** Known Better Auth issue (#5879) — `createUser` may not properly create the credential provider link in some versions
**How to avoid:** After creating user, verify by checking that account record exists. If login fails, `setUserPassword` can re-establish the credential provider.
**Warning signs:** User exists in neon_auth.user but has no "credential" account type.

### Pitfall 5: Missing Activity Log
**What goes wrong:** User provisioning actions not auditable
**Why it happens:** Activity log creation is not automatic — must be explicitly called
**How to avoid:** Insert activity log entry in every provisioning mutation. Use existing `createActivityLog()` from `db/queries.ts`.
**Warning signs:** Activity log page shows no user management entries.
</common_pitfalls>

<code_examples>
## Code Examples

### createUser — Server-Side (Better Auth docs verified)
```typescript
// Source: Better Auth official docs + Context7
// Called from tRPC adminProcedure
const { data: newUser, error } = await authServer.admin.createUser({
  email: "alice@example.com",
  password: "TempPass123!",
  name: "Alice Hudson",
  role: "user",  // Neon Auth native role
  // data: {} // Optional custom fields
})

if (error) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: error.message || 'Failed to create user',
  })
}
// newUser.id is the Neon Auth user ID
```

### setUserPassword — Server-Side
```typescript
// Source: Better Auth official docs
// Requires admin session (cookies auto-forwarded by Neon Auth)
const { data, error } = await authServer.admin.setUserPassword({
  userId: "user-id",
  newPassword: "new-password",
})
```

### setRole — Server-Side
```typescript
// Source: Better Auth official docs
const { data, error } = await authServer.admin.setRole({
  userId: "user-id",
  role: "admin",  // or "user" — Neon Auth roles only
})
```

### listUsers — Server-Side
```typescript
// Source: Better Auth official docs
const { data, error } = await authServer.admin.listUsers({
  limit: 50,
  offset: 0,
  searchValue: "alice",      // optional
  searchField: "email",      // optional: "name" | "email"
  searchOperator: "contains", // optional
  sortBy: "name",            // optional
  sortDirection: "asc",      // optional
})
// data.users: Array<User>
// data.total: number
```

### Complete Provisioning Flow
```typescript
// Full tRPC mutation pattern
export const userManagementRouter = createTRPCRouter({
  createBeneficiaryUser: adminProcedure
    .input(z.object({
      beneficiaryId: z.number(),
      email: z.string().email(),
      tempPassword: z.string().min(8),
    }))
    .mutation(async ({ input, ctx }) => {
      // 1. Verify beneficiary exists
      const [ben] = await db
        .select()
        .from(beneficiary)
        .where(eq(beneficiary.id, input.beneficiaryId))
        .limit(1)

      if (!ben) throw new TRPCError({ code: 'NOT_FOUND', message: 'Beneficiary not found' })

      // 2. Check no existing user_profile for this beneficiary
      const [existingProfile] = await db
        .select()
        .from(userProfile)
        .where(eq(userProfile.beneficiaryId, input.beneficiaryId))
        .limit(1)

      if (existingProfile) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Beneficiary already has a portal account',
        })
      }

      // 3. Create Neon Auth user
      const { data: newUser, error } = await authServer.admin.createUser({
        email: input.email,
        password: input.tempPassword,
        name: `${ben.firstName} ${ben.lastName}`,
        role: "user",
      })

      if (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Failed to create auth user: ${error.message}`,
        })
      }

      // 4. Create user_profile
      await db.insert(userProfile).values({
        userId: newUser.id,
        role: 'beneficiary',
        beneficiaryId: input.beneficiaryId,
      })

      // 5. Log activity
      await createActivityLog({
        tableName: 'user_profile',
        recordId: newUser.id,
        action: 'CREATE',
        changedBy: ctx.user.id,
        newValues: {
          userId: newUser.id,
          email: input.email,
          beneficiaryId: input.beneficiaryId,
          role: 'beneficiary',
        },
      })

      return { userId: newUser.id, email: input.email }
    }),
})
```

### Activity Log Pattern (from existing codebase)
```typescript
// Source: db/queries.ts — createActivityLog
import { createActivityLog } from '@/db/queries'

await createActivityLog({
  tableName: 'user_profile',
  recordId: userId,
  action: 'CREATE',      // 'CREATE' | 'UPDATE' | 'DELETE'
  changedBy: ctx.user.id,
  oldValues: null,        // JSONB, null for creates
  newValues: { ... },     // JSONB with new field values
})
```
</code_examples>

<sota_updates>
## State of the Art (2025-2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual Better Auth config | Neon Auth managed service | 2025 | No need to configure admin plugin — it's pre-enabled |
| `auth.api.createUser()` with headers | `authServer.admin.createUser()` with auto cookies | 2025 | Neon Auth wrapper handles cookie forwarding |
| Custom user management | Better Auth Admin plugin | 2024+ | Full CRUD for users, roles, sessions, banning |

**Key finding:** Better Auth issue #3717 notes that `createUser` is the only admin method that works without session headers. All other methods require session cookies. However, in the Neon Auth setup, `createAuthServer()` automatically reads cookies from `next/headers`, so this is handled transparently when called from route handlers.

**Known issues to monitor:**
- Better Auth #5879: Users sometimes can't login after `createUser` — may need `setUserPassword` as fallback
- Better Auth #3717: Most admin methods require session — PR #4385 may fix this in future versions
</sota_updates>

<open_questions>
## Open Questions

1. **Does `createUser` work in Neon Auth's managed environment exactly like standalone Better Auth?**
   - What we know: The SDK types match, the proxy pattern forwards all requests to `NEON_AUTH_BASE_URL`
   - What's unclear: Whether the managed service has any differences in `createUser` behavior
   - Recommendation: Test during implementation. If `createUser` fails, fall back to guiding users through the sign-up flow and then linking via `user_profile`

2. **Will `setUserPassword` work from tRPC route handler context?**
   - What we know: Neon Auth auto-forwards cookies. Better Auth requires admin session for `setUserPassword`.
   - What's unclear: Whether the auto-forwarded cookies satisfy Better Auth's session check
   - Recommendation: Test during Phase 52 (forced password change). If it fails, consider direct DB approach for password reset.

3. **Does Neon Auth `createUser` send a welcome/verification email?**
   - What we know: Neon Auth has built-in email service (sends from `noreply@stackframe.co`)
   - What's unclear: Whether `createUser` via admin plugin triggers verification email
   - Recommendation: Likely no verification email on admin-created accounts (admin is pre-verifying). Test during implementation.
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- `/llmstxt/better-auth_llms_txt` via Context7 — Admin plugin createUser, setRole, setUserPassword, listUsers API docs
- `node_modules/@neondatabase/auth/dist/next/server/index.d.mts` — NeonAuthServer type definition, API_ENDPOINTS constant
- `node_modules/@neondatabase/auth/dist/next/server/index.mjs` — createAuthServerInternal implementation showing cookie auto-forwarding

### Secondary (MEDIUM confidence)
- [Better Auth Admin Plugin docs](https://www.better-auth.com/docs/plugins/admin) — Full admin API documentation
- [GitHub Issue #3717](https://github.com/better-auth/better-auth/issues/3717) — Session requirements for admin methods
- [GitHub Issue #5879](https://github.com/better-auth/better-auth/issues/5879) — Login failure after createUser
- Codebase exploration: `src/server/trpc/index.ts`, `db/schema.ts`, `db/queries.ts` — Existing patterns

### Tertiary (LOW confidence - needs validation during implementation)
- createUser behavior in Neon Auth managed service (not explicitly documented)
- Verification email behavior on admin-created accounts
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: Neon Auth Admin plugin (Better Auth v1.4.6)
- Ecosystem: @neondatabase/auth server SDK, tRPC, Drizzle ORM
- Patterns: Two-step provisioning (auth user + user_profile), admin procedure pattern
- Pitfalls: Session context, role confusion, duplicate users, login failures

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all verified in node_modules
- Architecture: HIGH — patterns verified from official docs + codebase exploration
- Pitfalls: HIGH — documented in GitHub issues with verified workarounds
- Code examples: MEDIUM — based on Better Auth docs, needs validation against Neon Auth managed service

**Research date:** 2026-01-31
**Valid until:** 2026-03-02 (30 days — Better Auth ecosystem relatively stable)
</metadata>

---

*Phase: 51-admin-user-provisioning*
*Research completed: 2026-01-31*
*Ready for planning: yes*
