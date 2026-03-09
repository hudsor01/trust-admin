# Phase 16: API Infrastructure Security - Research

**Researched:** 2026-03-08
**Domain:** Database RLS hardening, file upload migration, API auth enforcement, timing-safe comparison
**Confidence:** HIGH

## Summary

Phase 16 addresses four concrete security findings (S4, S7, S8, S9 from the v4.0 critical review) that span the database layer, API routing, file storage infrastructure, and access code validation. Each requirement has a well-defined current-state problem and a clear fix path.

The most structurally significant change is SEC-04 (activity_log immutability) because it requires both a Drizzle schema policy change and a raw SQL migration against the live database. SEC-07 (UploadThing migration of the upload route) is the most code-touching change but is straightforward since UploadThing is already configured and working for the analyze route. SEC-08 and SEC-09 are surgical fixes to specific files.

**Primary recommendation:** Address these in dependency order: SEC-04 (RLS -- database-level, no code dependencies), then SEC-08 (proxy + Zod -- small fixes), then SEC-09 (timing-safe + lockout), then SEC-07 (upload route rewrite to UploadThing). All four are independent at the code level and could theoretically be parallelized, but SEC-08 should land before SEC-07 since removing `/api/inventory` from publicPaths affects both routes.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SEC-04 | activity_log RLS: INSERT restricted to own userId, no UPDATE/DELETE (immutable audit) | Current policies allow any authenticated user full CRUD. Fix: replace 4 policies with 2 (SELECT admin-only, INSERT with changedBy = effective_user_id() check). Use `app.effective_user_id()` helper already in DB. Must also add FORCE ROW LEVEL SECURITY. |
| SEC-07 | Inventory upload uses UploadThing instead of public/ filesystem | Current `upload/route.ts` writes to `public/uploads/inventory/` via Node fs -- broken on Vercel (read-only FS). UploadThing already configured (UTApi + uploadthing@7.7.4). Rewrite to use `UTApi.uploadFiles()` like the analyze route already does. |
| SEC-08 | /api/inventory removed from proxy publicPaths; analyze route enforces 10MB base64 limit | proxy.ts line 13 has `/api/inventory` in publicPaths. Analyze route's ImageSchema has no `.max()` on base64 field. Fix: remove from publicPaths array, add `z.string().max(10_485_760)` to base64 schema. |
| SEC-09 | INVENTORY_ACCESS_CODE uses timingSafeEqual with failed-attempt counter | verifyAccess.ts line 32 uses plain `===` comparison. Fix: use `crypto.timingSafeEqual` with Buffer conversion + in-memory failed-attempt counter with lockout. |
</phase_requirements>

## Standard Stack

### Core (already in project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| uploadthing | 7.7.4 | Server-side file uploads via UTApi | Already configured and working in analyze route |
| @uploadthing/react | 7.3.3 | Client-side upload helpers | Already installed |
| node:crypto | built-in | timingSafeEqual for constant-time comparison | Node.js standard library; no external deps needed |
| drizzle-orm | 0.45.1 | Schema policies via pgPolicy | Already managing all RLS policies in schema.ts |
| zod | 4.3.6 | Input validation (base64 size cap) | Already used throughout API routes |

### No New Dependencies Required

All four requirements can be implemented with existing installed packages. No new npm installs needed.

## Architecture Patterns

### Pattern 1: Immutable Audit Log via RLS (SEC-04)

**What:** Replace the current 4-policy set on activity_log with restricted policies that make the table append-only at the database level.

**Current state (BROKEN):**
```sql
-- Current policies (from add-rls-policies.sql and schema.ts):
-- SELECT: app.is_admin()
-- INSERT: authenticated (no WITH CHECK -- any user can forge changedBy)
-- UPDATE: authenticated (no restriction -- audit records can be modified)
-- DELETE: authenticated (no restriction -- audit records can be deleted)
```

**Target state:**
```sql
-- New policies:
-- SELECT: app.is_admin() (unchanged)
-- INSERT: authenticated WITH CHECK (changed_by = app.effective_user_id())
-- UPDATE: REMOVED entirely
-- DELETE: REMOVED entirely
-- FORCE ROW LEVEL SECURITY: enabled (prevents neondb_owner bypass)
```

**Implementation approach -- two locations must change:**

1. **db/schema.ts** -- Update the pgPolicy definitions inside the activityLog table:
   - Keep SELECT policy as-is (admin only)
   - UPDATE INSERT policy: add `withCheck` clause enforcing `changedBy = app.effective_user_id()`
   - REMOVE the UPDATE and DELETE policies entirely
   - The table already has `.enableRLS()` but does NOT have FORCE ROW LEVEL SECURITY

2. **SQL migration** -- A new migration file to alter live database:
   ```sql
   -- Drop mutable policies
   DROP POLICY IF EXISTS "crud-authenticated-policy-update" ON activity_log;
   DROP POLICY IF EXISTS "crud-authenticated-policy-delete" ON activity_log;

   -- Replace INSERT policy with userId-enforced version
   DROP POLICY IF EXISTS "crud-authenticated-policy-insert" ON activity_log;
   CREATE POLICY "crud-authenticated-policy-insert" ON activity_log
     AS PERMISSIVE FOR INSERT TO authenticated
     WITH CHECK (changed_by = app.effective_user_id());

   -- Force RLS even for table owner
   ALTER TABLE activity_log FORCE ROW LEVEL SECURITY;
   ```

**Critical consideration:** The `changedBy` column in schema.ts is `text` with `.default('system')`. The application code sets `changedBy` explicitly to the user ID in `createActivityLog()` calls and `recordAuthEvent()`. After this change, inserts where `changedBy` does not match the authenticated user's ID will be rejected by RLS. This is correct behavior -- it prevents forging audit entries as another user.

**Edge case -- system inserts:** The `recordAuthEvent()` function in `auth-events.ts` uses `changedBy: userId || 'system'`. When `userId` is null (anonymous failed auth), it sets `changedBy: 'system'`. Under the new policy, this insert would fail because `'system' !== app.effective_user_id()`. However, examining the code, `recordAuthEvent` runs inside `after()` (Next.js post-response callback) and uses the bare `db` object, which runs as `neondb_owner` when no JWT is set (unauthenticated requests have no token). With FORCE ROW LEVEL SECURITY, even `neondb_owner` will be subject to policies. There are two options:

- **Option A (recommended):** For the FORCE RLS, only add it if we want maximum immutability. But since `neondb_owner` audit inserts are legitimate system operations, we should NOT use FORCE ROW LEVEL SECURITY on activity_log. Instead, keep regular RLS (which neondb_owner already bypasses) and rely on the INSERT WITH CHECK to constrain the `authenticated` role only. This is the safer choice and matches the pattern used for other non-FORCE tables.
- **Option B:** Add FORCE RLS and create an additional policy for the `neondb_owner` role. This adds complexity for minimal gain since neondb_owner is a trusted system role.

**Recommendation: Option A** -- Regular RLS without FORCE. The `authenticated` role (all user-facing requests via tRPC/JWT) gets the constrained INSERT policy. The `neondb_owner` role (system operations, seeds, auth-events for anonymous) bypasses RLS as designed.

### Pattern 2: UploadThing Server Upload (SEC-07)

**What:** Replace filesystem writes in `upload/route.ts` with UploadThing's `UTApi.uploadFiles()`.

**Current state (BROKEN on Vercel):**
```typescript
// src/app/api/inventory/upload/route.ts
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'inventory')
await mkdir(UPLOAD_DIR, { recursive: true })  // FAILS: Vercel read-only FS
await writeFile(filepath, Buffer.from(bytes))  // FAILS: same
```

**Target state -- reuse existing pattern from uploadthing-server.ts:**
```typescript
import { UTApi } from 'uploadthing/server'

const utapi = new UTApi()

// Convert uploaded Files to UTApi format, then upload
const files = formDataFiles.map(file => file) // File objects work directly
const results = await utapi.uploadFiles(files)
const urls = results
    .filter(r => r.data)
    .map(r => r.data!.ufsUrl)
```

**Key details:**
- `UTApi.uploadFiles()` accepts `File` objects directly (Node.js 20+ has global `File`)
- Returns `{ data: { ufsUrl: string } | null, error: ... }[]`
- The analyze route already uses this exact pattern in `src/lib/uploadthing-server.ts`
- CSP in `next.config.ts` already allows `https://utfs.io` and `https://*.ufs.sh` for images
- UPLOADTHING_TOKEN is already in env.ts (optional -- graceful degradation if not set)
- The upload route currently returns `{ success: true, paths: string[] }` -- change to return UploadThing URLs instead of local paths
- Remove `node:fs/promises` and `node:path` imports
- Remove `UPLOAD_DIR` constant and `mkdir` call

### Pattern 3: Proxy Public Path Removal + Base64 Cap (SEC-08)

**What:** Two surgical changes to existing files.

**Change 1 -- proxy.ts:** Remove `/api/inventory` from the `publicPaths` array. After this, unauthenticated requests to `/api/inventory/*` will be redirected to `/auth/sign-in` by the proxy.

```typescript
// BEFORE
const publicPaths = [
    '/', '/auth', '/api/auth', '/api/trpc', '/api/inventory', '/api/e2e', '/forms', '/_next', '/favicon.ico',
]

// AFTER
const publicPaths = [
    '/', '/auth', '/api/auth', '/api/trpc', '/api/e2e', '/forms', '/_next', '/favicon.ico',
]
```

**Impact analysis:** Both inventory routes already have their own auth checks:
- `upload/route.ts` calls `requireAdmin(request)` -- admin-only
- `analyze/route.ts` checks `session.user.role !== 'admin'` -- admin-only
- Removing from publicPaths adds defense-in-depth (proxy blocks before route handler runs)
- The public inventory form at `/forms/inventory` is NOT affected (it uses `/forms` path, not `/api/inventory`). The form calls `/api/inventory/analyze` only after the user has the access cookie, but now they also need an auth session. This is correct -- only admin users should trigger AI analysis.

**Important consideration:** The public inventory form (for family members submitting items) calls `fetch('/api/inventory/analyze')` from the client. After removing `/api/inventory` from publicPaths, the proxy will require a session cookie for this request. Family members using the form are NOT authenticated -- they only have the `inventory_access` cookie. This means the analyze endpoint will become inaccessible from the public form.

**Resolution:** The analyze route already checks for admin session independently (`session.user.role !== 'admin'`). Non-admin family members were already blocked at the route level. The proxy change makes the block happen earlier (at proxy level rather than route level). The public form's photo analysis feature only works for admin users who are also authenticated. This is the intended behavior per SEC-08 requirements.

**Change 2 -- analyze/route.ts:** Add `.max()` to the base64 field in ImageSchema.

```typescript
// BEFORE
base64: z.string().min(1, 'Image data is required'),

// AFTER
base64: z.string().min(1, 'Image data is required').max(10_485_760, 'Image data exceeds 10MB limit'),
```

10,485,760 bytes = 10MB. Base64 encoding inflates by ~33%, so a 10MB base64 string represents roughly a 7.5MB raw file. With 5 images max, worst case is 50MB of base64 -- the `.max()` per-image keeps each image bounded.

### Pattern 4: Constant-Time Comparison + Lockout (SEC-09)

**What:** Replace `===` with `crypto.timingSafeEqual` and add a failed-attempt counter to `verifyAccess.ts`.

**Current state (VULNERABLE):**
```typescript
if (code !== expectedCode) {
    return { success: false, error: 'Invalid access code' }
}
```

**Target state:**
```typescript
import { timingSafeEqual } from 'node:crypto'

// Constant-time comparison -- both buffers must be same length
function safeCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a)
    const bufB = Buffer.from(b)
    if (bufA.length !== bufB.length) {
        // Pad shorter to prevent length leak, then compare
        // timingSafeEqual throws if lengths differ
        const maxLen = Math.max(bufA.length, bufB.length)
        const paddedA = Buffer.alloc(maxLen)
        const paddedB = Buffer.alloc(maxLen)
        bufA.copy(paddedA)
        bufB.copy(paddedB)
        return timingSafeEqual(paddedA, paddedB)
        // This always returns false since padding differs, but in constant time
    }
    return timingSafeEqual(bufA, bufB)
}
```

**Failed-attempt counter:**
- Use an in-memory Map keyed by IP address (server actions receive request context)
- Track: `{ count: number, lockedUntil: Date | null }`
- After N failures (e.g., 5), lock out that IP for M minutes (e.g., 15)
- Reset on successful attempt
- In-memory is acceptable for this use case (Vercel serverless functions are ephemeral, so lockout state is best-effort; the primary defense is the timing-safe comparison)

**Important detail:** `verifyAccess.ts` is a Server Action (`'use server'`). Server Actions in Next.js do NOT receive the raw Request object -- they receive FormData. To get the client IP for rate limiting, we need to use `headers()` from `next/headers` to read `x-forwarded-for` or similar.

```typescript
import { headers } from 'next/headers'

function getClientIP(): string {
    const hdrs = await headers()
    return hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}
```

### Anti-Patterns to Avoid

- **Do NOT use `db:push` for RLS policy changes** -- Drizzle push has bugs with RLS policies (noted in package.json script comment). Use a migration file applied via `db:deploy` or raw SQL.
- **Do NOT add FORCE ROW LEVEL SECURITY on activity_log** -- it would break system-level audit inserts from `recordAuthEvent()` that run as neondb_owner.
- **Do NOT use the global `crypto` module** -- use `import { timingSafeEqual } from 'node:crypto'` for explicit import.
- **Do NOT compare lowercased strings then do timingSafeEqual** -- the current code lowercases both sides before comparison. Keep the case normalization but apply it before the timing-safe comparison, not after. Actually, since `.toLowerCase()` is done before comparison, it is fine to normalize first then compare with timingSafeEqual.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File uploads to cloud | Custom S3/GCS integration | UploadThing UTApi (already configured) | Handles presigned URLs, storage, CDN, cleanup |
| Timing-safe comparison | Custom XOR loop | `crypto.timingSafeEqual` | Node.js built-in, battle-tested, constant-time guaranteed |
| Rate limiting | Full Redis-backed rate limiter | In-memory Map with IP keys | Serverless-appropriate for access code (ephemeral state OK); not a session-critical flow |
| RLS policies | Application-level query filters | PostgreSQL RLS policies | Database-level enforcement is authoritative; app-level is defense-in-depth |

## Common Pitfalls

### Pitfall 1: timingSafeEqual Length Mismatch
**What goes wrong:** `timingSafeEqual` throws an error if the two buffers have different byte lengths.
**Why it happens:** User input and stored secret may differ in length after encoding.
**How to avoid:** Pad both buffers to the same length before comparison, or use a wrapper that handles length differences in constant time.
**Warning signs:** Uncaught exceptions in the access code verification flow.

### Pitfall 2: Drizzle Push Corrupts RLS Policies
**What goes wrong:** `bun run db:push` can drop and recreate policies incorrectly.
**Why it happens:** Known Drizzle ORM bug with RLS policy management (noted in project's package.json).
**How to avoid:** Use raw SQL migration files. Update schema.ts for Drizzle's understanding, but apply actual changes via migration SQL.
**Warning signs:** RLS tests suddenly fail after a push; policies show unexpected state in `pg_policies`.

### Pitfall 3: FORCE ROW LEVEL SECURITY Breaks System Inserts
**What goes wrong:** Adding `FORCE ROW LEVEL SECURITY` to activity_log causes `recordAuthEvent()` to fail for anonymous auth events.
**Why it happens:** `recordAuthEvent` for failed/anonymous auth uses `db` without a JWT token, connecting as `neondb_owner`. FORCE RLS applies policies even to table owners.
**How to avoid:** Do NOT use FORCE RLS on activity_log. Regular RLS already constrains the `authenticated` role while allowing `neondb_owner` to bypass for legitimate system operations.
**Warning signs:** Sentry errors from `auth-events.ts` catch block after deployment.

### Pitfall 4: Upload Route Response Format Change
**What goes wrong:** Frontend code expects `{ paths: string[] }` with local paths like `/uploads/inventory/file.jpg`, but new response returns UploadThing URLs.
**Why it happens:** The upload route's response contract changes from local paths to remote URLs.
**How to avoid:** Check all callers of the upload route. In this codebase, the upload route is only referenced from the InventoryForm component (which sends photos to `/api/inventory/analyze` instead, not `/api/inventory/upload`). The upload route appears to be unused by any current frontend code -- the analyze route handles both analysis AND upload via `uploadInventoryImages()`. Verify this before deleting the upload route entirely.
**Warning signs:** 404s or broken image URLs after deployment.

### Pitfall 5: Server Action IP Extraction
**What goes wrong:** Server Actions don't receive a Request object, so `request.headers` is not available for IP-based lockout.
**Why it happens:** Next.js Server Actions have a different execution model than API routes.
**How to avoid:** Use `headers()` from `next/headers` to access request headers within Server Actions.

## Code Examples

### Activity Log RLS Migration SQL
```sql
-- Source: project RLS patterns from db/migrations/add-rls-policies.sql

-- 1. Drop mutable policies (UPDATE/DELETE should not exist on audit log)
DROP POLICY IF EXISTS "crud-authenticated-policy-update" ON activity_log;
DROP POLICY IF EXISTS "crud-authenticated-policy-delete" ON activity_log;

-- 2. Replace INSERT policy with userId-enforced version
DROP POLICY IF EXISTS "crud-authenticated-policy-insert" ON activity_log;
CREATE POLICY "audit-insert-own-user" ON activity_log
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (changed_by = app.effective_user_id());

-- 3. SELECT policy remains unchanged (admin-only)
-- "crud-authenticated-policy-select" already exists with app.is_admin()

-- NOTE: Do NOT add FORCE ROW LEVEL SECURITY -- neondb_owner needs bypass for system audit inserts
```

### Timing-Safe Access Code Comparison
```typescript
// Source: Node.js crypto.timingSafeEqual docs + project patterns
import { timingSafeEqual } from 'node:crypto'

function constantTimeCompare(input: string, secret: string): boolean {
    const inputBuf = Buffer.from(input, 'utf-8')
    const secretBuf = Buffer.from(secret, 'utf-8')

    // timingSafeEqual requires same length; pad shorter buffer
    if (inputBuf.length !== secretBuf.length) {
        // Compare against secret-length buffer to avoid leaking secret length
        // Always compare against secretBuf.length so timing is consistent
        const paddedInput = Buffer.alloc(secretBuf.length)
        inputBuf.copy(paddedInput, 0, 0, Math.min(inputBuf.length, secretBuf.length))
        timingSafeEqual(paddedInput, secretBuf)
        return false  // Different lengths always fail
    }

    return timingSafeEqual(inputBuf, secretBuf)
}
```

### UploadThing Upload Route Rewrite
```typescript
// Source: existing pattern from src/lib/uploadthing-server.ts
import { UTApi } from 'uploadthing/server'

const utapi = new UTApi()

// Inside POST handler, after form data validation:
const uploadResults = await utapi.uploadFiles(validatedFiles)
const urls = uploadResults
    .filter((r) => r.data !== null)
    .map((r) => r.data!.ufsUrl)
```

### In-Memory Rate Limiter for Server Actions
```typescript
// Source: standard pattern for serverless rate limiting

const failedAttempts = new Map<string, { count: number; lockedUntil: number }>()

const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 15 * 60 * 1000  // 15 minutes

function checkLockout(ip: string): { locked: boolean; remaining?: number } {
    const record = failedAttempts.get(ip)
    if (!record) return { locked: false }

    if (record.lockedUntil && Date.now() < record.lockedUntil) {
        const remaining = Math.ceil((record.lockedUntil - Date.now()) / 1000 / 60)
        return { locked: true, remaining }
    }

    // Lockout expired, reset
    if (record.lockedUntil && Date.now() >= record.lockedUntil) {
        failedAttempts.delete(ip)
        return { locked: false }
    }

    return { locked: false }
}

function recordFailure(ip: string): void {
    const record = failedAttempts.get(ip) || { count: 0, lockedUntil: 0 }
    record.count++
    if (record.count >= MAX_ATTEMPTS) {
        record.lockedUntil = Date.now() + LOCKOUT_MS
    }
    failedAttempts.set(ip, record)
}

function resetFailures(ip: string): void {
    failedAttempts.delete(ip)
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| fs.writeFile to public/ | UploadThing UTApi.uploadFiles() | Already in project | Vercel-compatible persistent storage |
| Plain === for secrets | crypto.timingSafeEqual | Node.js built-in | Prevents timing side-channel attacks |
| Permissive RLS (all CRUD) | Restricted RLS (INSERT-only, userId-checked) | PostgreSQL standard | Tamper-proof audit trail |
| publicPaths proxy bypass | Route-level + proxy auth | Defense-in-depth | Blocks unauthenticated requests earlier |

**Existing infrastructure that supports this phase:**
- UploadThing already configured: `uploadRouter` in `src/lib/uploadthing.ts`, `UTApi` in `src/lib/uploadthing-server.ts`, route handler in `src/app/api/uploadthing/route.ts`
- CSP already allows UploadThing domains: `https://utfs.io` and `https://*.ufs.sh`
- `app.effective_user_id()` SQL function already in database
- Auth middleware (`requireAdmin`) already in the upload route
- Analyze route already has session check

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bun:test (unit/integration), Playwright 1.58.2 (E2E) |
| Config file | bunfig.toml (bun test config), playwright.config.ts |
| Quick run command | `bun test tests/api tests/lib` |
| Full suite command | `bun test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEC-04 | activity_log INSERT restricted to own userId, no UPDATE/DELETE | unit | `bun test tests/api/activity-log-rls.test.ts -x` | No -- Wave 0 |
| SEC-07 | Upload route uses UploadThing, not filesystem | unit | `bun test tests/api/inventory-upload.test.ts -x` | No -- Wave 0 |
| SEC-08a | /api/inventory not in proxy publicPaths | unit | `bun test tests/lib/proxy-paths.test.ts -x` | No -- Wave 0 |
| SEC-08b | Analyze route rejects base64 > 10MB | unit | `bun test tests/api/inventory-analyze.test.ts -x` | Yes (extend) |
| SEC-09a | Access code uses constant-time comparison | unit | `bun test tests/lib/verify-access.test.ts -x` | No -- Wave 0 |
| SEC-09b | Access code locks out after 5 failures | unit | `bun test tests/lib/verify-access.test.ts -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `bun test tests/api tests/lib`
- **Per wave merge:** `bun test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/api/activity-log-rls.test.ts` -- covers SEC-04 (test that INSERT policy enforces userId match; verify UPDATE/DELETE policies removed)
- [ ] `tests/api/inventory-upload.test.ts` -- covers SEC-07 (mock UTApi, verify no fs.writeFile calls, verify URL format returned)
- [ ] `tests/lib/proxy-paths.test.ts` -- covers SEC-08a (verify `/api/inventory` NOT in publicPaths array)
- [ ] `tests/lib/verify-access.test.ts` -- covers SEC-09 (timing-safe comparison, lockout after N failures, lockout reset on success, lockout expiry)
- [ ] Extend `tests/api/inventory-analyze.test.ts` -- covers SEC-08b (add test for oversized base64 rejection)

## Open Questions

1. **Upload route usage**
   - What we know: The `upload/route.ts` endpoint exists but is not called by any current frontend code. The InventoryForm sends photos to `/api/inventory/analyze` which handles both analysis and upload via `uploadInventoryImages()`.
   - What's unclear: Is the upload route used by any external integration or admin workflow not visible in the codebase?
   - Recommendation: Rewrite it to use UploadThing as required by SEC-07, but also consider whether it could be deleted entirely if unused. Conservative approach: rewrite it, mark it for cleanup review later.

2. **Serverless rate limiter persistence**
   - What we know: In-memory Maps are ephemeral on Vercel serverless. Lockout state will be lost on cold starts.
   - What's unclear: Whether this level of protection is sufficient for the access code use case.
   - Recommendation: Acceptable for this use case. The access code is a low-value target (grants form access, not data access). The primary defense is timing-safe comparison. Lockout is defense-in-depth, and even ephemeral lockout raises the bar for automated attacks. If stronger protection is needed later, use a database-backed counter.

## Sources

### Primary (HIGH confidence)
- `db/migrations/add-rls-policies.sql` -- current activity_log RLS policies
- `db/migrations/add-rls-helpers.sql` -- `app.effective_user_id()` function definition
- `db/schema.ts` -- activityLog table definition with pgPolicy declarations
- `src/app/api/inventory/upload/route.ts` -- current filesystem-based upload
- `src/app/api/inventory/analyze/route.ts` -- current analyze route with auth check
- `src/lib/uploadthing-server.ts` -- existing UTApi upload pattern
- `src/proxy.ts` -- current publicPaths configuration
- `src/app/forms/_actions/verifyAccess.ts` -- current access code comparison
- `.planning/v4-critical-review.md` -- S4, S7, S8, S9 findings

### Secondary (MEDIUM confidence)
- [Node.js crypto.timingSafeEqual docs](https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b) -- buffer length requirements
- [UploadThing UTApi docs](https://docs.uploadthing.com/api-reference/ut-api) -- uploadFiles API

### Tertiary (LOW confidence)
- None -- all findings verified against codebase and official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and configured in the project
- Architecture: HIGH -- patterns derived from existing working code in the same codebase
- Pitfalls: HIGH -- identified from direct code analysis and project-specific constraints (FORCE RLS, db:push bugs, server action limitations)

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable -- no rapidly-changing dependencies)
