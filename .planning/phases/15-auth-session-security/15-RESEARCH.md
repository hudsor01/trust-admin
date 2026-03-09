# Phase 15: Auth Session Security - Research

**Researched:** 2026-03-08
**Domain:** Authentication hardening, session management, input validation, environment safety
**Confidence:** HIGH

## Summary

Phase 15 addresses five concrete security gaps in the existing auth infrastructure. All fixes involve small, targeted changes to files that already exist -- no new libraries, no architectural rethink. The core pattern is: (1) make env validation strict where it is currently lenient, (2) call `authServer.admin.revokeUserSessions()` after every password change, (3) add Zod input validation to the reset-password API route, and (4) gate the E2E setup endpoint behind a pre-shared secret header.

The Neon Auth SDK (`@neondatabase/auth@0.2.0-beta.1`) wraps Better Auth and exposes `authServer.admin.revokeUserSessions({ userId })` -- confirmed present in the installed package's type definitions and runtime code. The `@t3-oss/env-nextjs` library already provides fail-fast behavior at module evaluation time when a required field is missing; the fix for SEC-01 is changing one Zod schema from `.optional()` to `.min(32)`. The `ADMIN_EMAIL` fix (SEC-02) is importing from the validated env module instead of raw `process.env`.

**Primary recommendation:** Each requirement maps to a small, isolated code change in a known file. No external research gaps remain.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SEC-01 | Auth cookie secret required at startup -- app fails fast if missing | `env.ts` Zod schema change from `z.string().optional()` to `z.string().trim().min(32)` triggers `@t3-oss/env-nextjs` fail-fast at import time. `createNeonAuth` independently validates `>= 32 chars` at runtime. |
| SEC-02 | ADMIN_EMAIL from validated env module, not raw process.env | Two files (`init.ts`, `userManagement.ts`) read `process.env.ADMIN_EMAIL ?? ''`. Replace with `import { env } from '@/lib/env'` and `env.ADMIN_EMAIL`. Already validated as non-empty email by Zod. |
| SEC-03 | All password reset flows revoke existing sessions | Two call sites: `reset-password/route.ts` (custom forgot-password flow) and `userManagement.ts:resetUserPassword`. Both must call `authServer.admin.revokeUserSessions({ userId })` after `setUserPassword`. The portal `changePassword` page already passes `revokeOtherSessions: true` via the client SDK -- no change needed there. |
| SEC-05 | Reset-password route validates input types, token format, password length | Add Zod schema: `token` must be `z.string().regex(/^[0-9a-f]{64}$/)`, `newPassword` must be `z.string().min(8).max(128)`. Currently the route does only `if (!token \|\| !newPassword)`. |
| SEC-06 | E2E setup route requires pre-shared secret, strips IDs from response | Add `E2E_SETUP_SECRET` env var check via `x-e2e-secret` header. Strip `userId`, `beneficiaryId` from JSON response. Update `global-setup.ts` to send the header. |
</phase_requirements>

## Standard Stack

### Core (already installed -- no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@neondatabase/auth` | 0.2.0-beta.1 | Auth SDK wrapping Better Auth | Provides `authServer.admin.revokeUserSessions`, `setUserPassword`, `getSession` |
| `@t3-oss/env-nextjs` | installed | Env validation with Zod | Already wired into `src/lib/env.ts` and `src/instrumentation.ts` for fail-fast |
| `zod` | installed | Schema validation | Already used throughout for tRPC input, env validation |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@sentry/nextjs` | installed | Error reporting | Already in auth routes; use for logging session revocation failures |

### Alternatives Considered

None. This phase uses only libraries already in the project. No new dependencies needed.

## Architecture Patterns

### Pattern 1: Fail-Fast Env Validation

**What:** `@t3-oss/env-nextjs` with `createEnv()` validates at module evaluation time. The `src/instrumentation.ts` file triggers validation at Next.js startup via `register()`.

**When to use:** Any env var that, if missing, causes silent breakage rather than a clear error.

**Current flow:**
```
Next.js startup
  -> instrumentation.ts register()
    -> validateEnvironment()
      -> accesses env.DATABASE_URL (triggers createEnv evaluation)
        -> Zod validates ALL server vars
          -> If any required var fails: throws ZodError, app refuses to start
```

**Example -- making NEON_AUTH_COOKIE_SECRET required:**
```typescript
// src/lib/env.ts -- BEFORE
NEON_AUTH_COOKIE_SECRET: z.string().optional(),

// src/lib/env.ts -- AFTER
NEON_AUTH_COOKIE_SECRET: z
    .string()
    .trim()
    .min(32, 'NEON_AUTH_COOKIE_SECRET must be at least 32 characters'),
```

**Then in auth/server.ts:**
```typescript
// BEFORE -- non-null assertion hides missing value
secret: env.NEON_AUTH_COOKIE_SECRET!,

// AFTER -- guaranteed non-null by env validation
secret: env.NEON_AUTH_COOKIE_SECRET,
```

**Key detail:** The `@neondatabase/auth` library (`createNeonAuth`) also validates that `cookies.secret` is present and >= 32 chars at call time (line 923 of the SDK source). But that validation only fires when `src/lib/auth/server.ts` is first imported -- which may be during a request, not at startup. Making it required in `env.ts` ensures the error surfaces at startup before any request is served.

### Pattern 2: Centralized Env Import for Sensitive Values

**What:** All code that needs `ADMIN_EMAIL` imports from `@/lib/env` instead of reading `process.env` directly. The validated env module guarantees the value is a non-empty, valid email.

**When to use:** Any env var where an empty string or missing value creates a security bypass.

**Current problem:**
```typescript
// src/server/trpc/init.ts:16
const OWNER_EMAIL = process.env.ADMIN_EMAIL ?? ''
// If ADMIN_EMAIL is unset: OWNER_EMAIL = ''
// If a user has email '' (impossible, but defense-in-depth): they match OWNER_EMAIL
```

**Fix:**
```typescript
// src/server/trpc/init.ts
import { env } from '@/lib/env'
const OWNER_EMAIL = env.ADMIN_EMAIL  // guaranteed valid email by Zod
```

**Same fix applies to `src/server/trpc/routers/userManagement.ts:16`.**

### Pattern 3: Session Revocation After Password Change

**What:** Call `authServer.admin.revokeUserSessions({ userId })` immediately after every successful `setUserPassword` call.

**When to use:** Any code path that changes a user's password.

**Affected code paths (exactly two):**

1. **Custom reset-password API route** (`src/app/api/auth/custom/reset-password/route.ts`):
   - Called from the forgot-password email flow
   - Uses `authServer.admin.setUserPassword()` at line 54
   - Must add `authServer.admin.revokeUserSessions({ userId: user.id })` after

2. **Admin password reset** (`src/server/trpc/routers/userManagement.ts` `resetUserPassword`):
   - Called by the admin Users page
   - Uses `authServer.admin.setUserPassword()` at line 437
   - Must add `authServer.admin.revokeUserSessions({ userId: input.userId })` after

**NOT affected:**
- Portal change-password page (`src/app/portal/change-password/page.tsx`) already passes `revokeOtherSessions: true` to `authClient.changePassword()` at line 48-52. This is the client-side Better Auth API which handles revocation internally.

**Example:**
```typescript
// In reset-password/route.ts, after setUserPassword:
const { error: pwError } = await authServer.admin.setUserPassword({
    userId: user.id,
    newPassword,
})
if (pwError) {
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
}

// Revoke all existing sessions so stolen tokens are invalidated
await authServer.admin.revokeUserSessions({ userId: user.id })
```

### Pattern 4: Input Validation on API Routes

**What:** Zod validation at the top of Next.js API route handlers, before any DB or auth operations.

**When to use:** Any `POST` route that accepts user input outside of tRPC (which validates automatically).

**Example for reset-password route:**
```typescript
import { z } from 'zod'

const ResetPasswordSchema = z.object({
    token: z.string().regex(/^[0-9a-f]{64}$/, 'Invalid token format'),
    newPassword: z.string().min(8, 'Password too short').max(128, 'Password too long'),
})

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const parsed = ResetPasswordSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid input' },
                { status: 400 },
            )
        }
        const { token, newPassword } = parsed.data
        // ... proceed with validated data
    }
}
```

**Why 64 hex chars:** The forgot-password route generates `randomBytes(32).toString('hex')` which always produces exactly 64 hex characters.

**Why max 128 for password:** scrypt with the project's parameters (N=16384, r=16, p=1) processes the full password. A 10MB string would block the event loop for seconds. 128 characters is well beyond any reasonable password while preventing DoS.

### Pattern 5: Pre-Shared Secret for E2E Setup

**What:** Require an `x-e2e-secret` header matching an env var to access the E2E setup endpoint.

**When to use:** Any development-only API route that should not be callable by arbitrary HTTP clients.

**Example:**
```typescript
// src/app/api/e2e/setup/route.ts
export async function POST(request: Request) {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const secret = request.headers.get('x-e2e-secret')
    if (!secret || secret !== process.env.E2E_SETUP_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // ... rest of setup
}
```

**Caller side (global-setup.ts):**
```typescript
const res = await fetch(`${BASE_URL}/api/e2e/setup`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-e2e-secret': process.env.E2E_SETUP_SECRET ?? '',
    },
})
```

**Response stripping:** Remove `userId`, `beneficiaryId` from the JSON response. The E2E tests only need to know the setup succeeded -- credentials are already hardcoded in `global-setup.ts` and the setup files.

### Anti-Patterns to Avoid

- **Non-null assertion on optional env vars:** `env.SOME_VAR!` hides missing values. If it must be present, make the Zod schema required.
- **Reading process.env directly for security-critical values:** Bypasses validation. Always use the `env` module.
- **Session revocation as optional:** After a password change, session revocation is not optional -- it is a security requirement. Do not make it conditional or catch-and-ignore.
- **Leaking validation details in error responses:** The reset-password route should return generic "Invalid input" -- not "token must be 64 hex chars" which reveals internal format to attackers.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Env validation | Custom process.env checks | `@t3-oss/env-nextjs` with Zod | Already wired; fail-fast at startup; type-safe |
| Session revocation | Raw SQL against neon_auth.session | `authServer.admin.revokeUserSessions()` | Handles all session types, respects Better Auth internals |
| Input validation | Manual typeof/length checks | `z.object()` with `safeParse()` | Consistent with tRPC patterns; structured errors |
| Password hashing | Direct scrypt calls | `authServer.admin.setUserPassword()` | Already uses correct Better Auth scrypt format |

## Common Pitfalls

### Pitfall 1: SKIP_ENV_VALIDATION Bypassing Required Checks

**What goes wrong:** The project has `skipValidation: !!process.env.SKIP_ENV_VALIDATION` in `createEnv`. If someone sets this in a deployment, all validation is skipped -- including the new NEON_AUTH_COOKIE_SECRET requirement.

**Why it happens:** `SKIP_ENV_VALIDATION` exists for Docker builds and CI where env vars are injected at runtime, not build time.

**How to avoid:** Do not set `SKIP_ENV_VALIDATION` in production deployments. The `createNeonAuth` function has its own runtime validation (>= 32 chars) as a second line of defense.

**Warning signs:** App starts successfully but auth returns null sessions.

### Pitfall 2: revokeUserSessions Error Handling

**What goes wrong:** If `revokeUserSessions` fails after a successful password change, the password is changed but old sessions remain valid.

**Why it happens:** Network error to Neon Auth, transient failure.

**How to avoid:** The password change is the critical operation. If revocation fails, log the error to Sentry but do NOT roll back the password change. The user should still get a success response. Session revocation is best-effort in this context -- the alternative (reverting the password) is worse.

**Warning signs:** Sentry errors with `subsystem: 'session-revocation'`.

### Pitfall 3: Cookie Cache TTL After Session Revocation

**What goes wrong:** Better Auth has a cookie cache. After `revokeUserSessions`, the server-side sessions are deleted, but any cached session data in cookies remains valid until the cache TTL expires.

**Why it happens:** The Neon Auth SDK uses `sessionDataTtl` (default 300 seconds / 5 minutes) to cache session data in a signed cookie to avoid hitting the auth server on every request.

**How to avoid:** This is a known Better Auth behavior. The JWT cache in `src/server/trpc/init.ts` has a 4-minute TTL, so the maximum window where a revoked session still works is ~4 minutes. For this project's threat model (family trust with 2-3 users), this is acceptable. Document it but do not try to solve it.

**Warning signs:** User reports they can still access the app briefly after their sessions were revoked.

### Pitfall 4: E2E Tests Breaking After Secret Header Requirement

**What goes wrong:** Adding the `x-e2e-secret` header requirement to the setup route breaks all E2E tests if `global-setup.ts` is not updated simultaneously.

**Why it happens:** The setup route and the test caller are in different files.

**How to avoid:** Update `src/app/api/e2e/setup/route.ts` AND `tests/e2e/global-setup.ts` in the same task/commit. Also add `E2E_SETUP_SECRET` to `.env` (for local dev) and any CI env.

**Warning signs:** All E2E tests fail with "Unauthorized" in the global setup step.

### Pitfall 5: env.ADMIN_EMAIL Import Ordering in Tests

**What goes wrong:** Tests that import from `@/server/trpc/init` (via mock-context.ts or caller factories) may fail if `ADMIN_EMAIL` is not set in the test environment.

**Why it happens:** Switching from `process.env.ADMIN_EMAIL ?? ''` to `env.ADMIN_EMAIL` makes it a required env var. If `.env.test.local` or the test env does not have it, the env module throws.

**How to avoid:** Ensure `ADMIN_EMAIL` is set in `.env` (it already is: `ADMIN_EMAIL=rhudsontspr@gmail.com`) and that tests load `.env` (Bun auto-loads `.env`). If tests use `.env.test.local`, ensure it includes `ADMIN_EMAIL` or inherits from `.env`.

**Warning signs:** Test failures with "Invalid environment variables: ADMIN_EMAIL required".

## Code Examples

### SEC-01: Making Cookie Secret Required

```typescript
// src/lib/env.ts -- change line 48
// BEFORE:
NEON_AUTH_COOKIE_SECRET: z.string().optional(),
// AFTER:
NEON_AUTH_COOKIE_SECRET: z
    .string()
    .trim()
    .min(32, 'NEON_AUTH_COOKIE_SECRET must be >= 32 characters'),

// src/lib/auth/server.ts -- change line 7
// BEFORE:
secret: env.NEON_AUTH_COOKIE_SECRET!,
// AFTER:
secret: env.NEON_AUTH_COOKIE_SECRET,
```

### SEC-02: Importing from Validated Env Module

```typescript
// src/server/trpc/init.ts -- change line 16
// BEFORE:
const OWNER_EMAIL = process.env.ADMIN_EMAIL ?? ''
// AFTER:
import { env } from '@/lib/env'
const OWNER_EMAIL = env.ADMIN_EMAIL

// src/server/trpc/routers/userManagement.ts -- change line 16
// BEFORE:
const OWNER_EMAIL = process.env.ADMIN_EMAIL ?? ''
// AFTER:
import { env } from '@/lib/env'
const OWNER_EMAIL = env.ADMIN_EMAIL
```

### SEC-03: Adding Session Revocation After Password Change

```typescript
// src/app/api/auth/custom/reset-password/route.ts
// After line 54 (setUserPassword call):
const { error: pwError } = await authServer.admin.setUserPassword({
    userId: user.id,
    newPassword,
})

if (pwError) {
    return NextResponse.json(
        { error: 'Failed to reset password' },
        { status: 500 },
    )
}

// Revoke all existing sessions after password change
const { error: revokeError } = await authServer.admin.revokeUserSessions({
    userId: user.id,
})
if (revokeError) {
    // Log but don't fail -- password was already changed successfully
    Sentry.captureException(
        new Error(`Session revocation failed for user ${user.id}`),
        { tags: { subsystem: 'session-revocation' } },
    )
}
```

```typescript
// src/server/trpc/routers/userManagement.ts -- resetUserPassword mutation
// After line 447 (setUserPassword call):
const { error } = await authServer.admin.setUserPassword({
    userId: input.userId,
    newPassword: input.newPassword,
})

if (error) { /* existing error handling */ }

// Revoke sessions after password change
const { error: revokeError } = await authServer.admin.revokeUserSessions({
    userId: input.userId,
})
if (revokeError) {
    Sentry.captureException(
        new Error(`Session revocation failed for user ${input.userId}`),
        { tags: { subsystem: 'session-revocation' } },
    )
}
```

### SEC-05: Input Validation for Reset-Password Route

```typescript
// src/app/api/auth/custom/reset-password/route.ts -- top of file
import { z } from 'zod'

const ResetPasswordSchema = z.object({
    token: z.string().regex(/^[0-9a-f]{64}$/, 'Invalid token format'),
    newPassword: z.string().min(8).max(128),
})

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const parsed = ResetPasswordSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid input' },
                { status: 400 },
            )
        }
        const { token, newPassword } = parsed.data
        // ... rest of handler using validated data
    }
}
```

### SEC-06: E2E Setup Secret Header

```typescript
// src/app/api/e2e/setup/route.ts -- at top of POST handler
export async function POST(request: Request) {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const secret = request.headers.get('x-e2e-secret')
    const expected = process.env.E2E_SETUP_SECRET
    if (!expected || !secret || secret !== expected) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ... existing setup logic ...

    // Strip IDs from response
    return NextResponse.json({ ok: true })
}
```

```typescript
// tests/e2e/global-setup.ts -- add header
const res = await fetch(`${BASE_URL}/api/e2e/setup`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-e2e-secret': process.env.E2E_SETUP_SECRET ?? '',
    },
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `z.string().optional()` for cookie secret | `z.string().min(32)` (required) | Neon Auth SDK 0.2.0 added runtime validation | Double validation: env + SDK |
| `process.env.X ?? ''` for critical vars | Import from validated `env` module | `@t3-oss/env-nextjs` standard since 2024 | Prevents empty-string bypass |
| Password change without session revocation | `revokeUserSessions` after every password change | Better Auth admin plugin standard | Prevents session persistence after credential change |

## Open Questions

1. **E2E_SETUP_SECRET value for CI**
   - What we know: The secret needs to be in `.env` locally and in CI env vars
   - What's unclear: Whether the project has CI env vars configured (GitHub Actions secrets)
   - Recommendation: Use a simple static value like `e2e-local-secret-do-not-use-in-prod` for `.env`, document that CI must set its own value. Not a blocker for implementation.

2. **global-setup.ts response parsing**
   - What we know: `global-setup.ts` currently logs `data.admin.userId` and `data.beneficiary.beneficiaryId` from the setup response
   - What's unclear: Whether any E2E test files depend on these IDs being in the global setup output
   - Recommendation: Check that `global-setup.ts` only uses the response for console logging (confirmed by reading the file -- it does). The stripped response (`{ ok: true }`) will cause the `.email` and `.userId` log lines to show `undefined`, which is cosmetic. Update the logging to match the new response shape.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Bun test (built-in) + Playwright |
| Config file | `package.json` scripts + `playwright.config.ts` |
| Quick run command | `bun test tests/auth.test.ts` |
| Full suite command | `bun test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEC-01 | App fails if NEON_AUTH_COOKIE_SECRET missing | unit | `bun test tests/lib/env-validation.test.ts -x` | No -- Wave 0 |
| SEC-02 | ADMIN_EMAIL comes from env module, not process.env | unit (static analysis) | `bun run typecheck` + grep verification | N/A -- verified by code review |
| SEC-03 | Sessions revoked after password reset | integration | `bun test tests/trpc/user-management-security.test.ts -x` | No -- Wave 0 (requires auth server mock) |
| SEC-05 | Reset-password rejects bad input | unit | `bun test tests/api/reset-password-validation.test.ts -x` | No -- Wave 0 |
| SEC-06 | E2E setup requires secret header | unit | `bun test tests/api/e2e-setup-auth.test.ts -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `bun run typecheck && bun run lint`
- **Per wave merge:** `bun test`
- **Phase gate:** `bun test && bun run typecheck && bun run lint`

### Wave 0 Gaps
- [ ] `tests/lib/env-validation.test.ts` -- test that env module rejects missing/short NEON_AUTH_COOKIE_SECRET (may require SKIP_ENV_VALIDATION isolation)
- [ ] `tests/api/reset-password-validation.test.ts` -- test Zod schema rejects bad token format, long passwords
- [ ] `tests/api/e2e-setup-auth.test.ts` -- test route returns 401 without header

Note: SEC-03 (session revocation) is difficult to unit test without mocking `authServer.admin` which requires module mocking of `@neondatabase/auth`. Verification via `typecheck` (confirming the call exists) and manual E2E testing is practical. SEC-02 is verified by `grep` (no `process.env.ADMIN_EMAIL` remaining in `src/server/`) and `typecheck`.

## Sources

### Primary (HIGH confidence)
- `@neondatabase/auth@0.2.0-beta.1` installed package source -- `dist/next/server/index.mjs` lines 299-300 confirm `revokeUserSessions` API; lines 922-924 confirm `validateCookieConfig` requiring secret >= 32 chars
- `src/lib/env.ts` line 48 -- current optional schema for NEON_AUTH_COOKIE_SECRET
- `src/server/trpc/init.ts` line 16 -- current `process.env.ADMIN_EMAIL ?? ''`
- `src/app/api/auth/custom/reset-password/route.ts` -- current lack of input validation and session revocation
- `src/app/api/e2e/setup/route.ts` -- current NODE_ENV-only guard
- `src/app/portal/change-password/page.tsx` line 48-52 -- confirms `revokeOtherSessions: true` already used

### Secondary (MEDIUM confidence)
- [Better Auth Admin Plugin Docs](https://better-auth.com/docs/plugins/admin) -- `revokeUserSessions({ userId })` and `setUserPassword({ userId, newPassword })` parameters confirmed
- [Better Auth Session Management](https://better-auth.com/docs/concepts/session-management) -- `revokeOtherSessions` option on `changePassword` confirmed
- [T3 Env Next.js Docs](https://env.t3.gg/docs/nextjs) -- fail-fast behavior at build/startup confirmed

### Tertiary (LOW confidence)
- [Better Auth Options Reference](https://better-auth.com/docs/reference/options) -- `revokeSessionsOnPasswordReset` server option exists (default: false), but not applicable here since Neon Auth is managed and we cannot configure Better Auth server options directly

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies; all APIs confirmed in installed package
- Architecture: HIGH -- patterns directly match existing codebase conventions
- Pitfalls: HIGH -- all pitfalls verified against actual source code

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable -- no fast-moving dependencies)
