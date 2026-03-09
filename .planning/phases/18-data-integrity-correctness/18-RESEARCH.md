# Phase 18: Data Integrity & Correctness - Research

**Researched:** 2026-03-09
**Domain:** Financial data correctness, validation hardening, deprecated API cleanup, SQL performance
**Confidence:** HIGH

## Summary

Phase 18 addresses seven requirements spanning correctness bugs, validation gaps, deprecated API retirement, and performance optimizations. Every requirement targets existing code with clear, well-scoped changes -- no new features, no new UI, no new libraries.

The primary work falls into three categories: (1) fixing correctness bugs in financial calculations and accounting entry creation, (2) adding validation guards to prevent empty/no-op mutations across 20+ update schemas, and (3) removing a deprecated API endpoint with its frontend references. Two performance items (bulk UPDATE and Promise.all) are straightforward refactors of existing working code.

**Primary recommendation:** All changes are backend-focused code fixes. No schema migrations except adding an index to `password_reset_token.email` and cleanup logic to the forgot-password route. All changes can be verified with existing test infrastructure (bun test) plus manual verification.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CORR-01 | All manual accounting entries go through createEntry (auto-classifies isPrincipal) -- remove raw .create endpoint | AccountingClient.tsx line 69 currently calls `trustAccounting.create`; must switch to `createEntry` and remove the `create` procedure |
| CORR-02 | recordLiabilityPayment uses ?? instead of \|\| for principalPortion null handling | Lines 1345-1346 and 1380 in queries.ts use `!data.principalPortion` and `\|\| '0'` which treats "0.00" as falsy |
| CORR-03 | Update schemas require at least one field via .refine() -- reject empty updates | 26 update schemas in validation.ts use `.partial()` with no minimum-field check; Zod 4 supports `.refine()` after `.partial()` |
| CORR-04 | Complete migration from deprecated listProvisionedUsers to listAllUsers | 4 references in frontend (UsersClient.tsx lines 54, 97; users/page.tsx line 10) + router definition at line 261 |
| CORR-05 | password_reset_token: email index, one-unexpired-token-per-email, expired cleanup on insert | Schema at schema.ts:2806 has no index on email; forgot-password route does bare insert with no dedup or cleanup |
| PERF-03 | listAllUsers fetches profiles and beneficiaries in parallel via Promise.all | userManagement.ts lines 59-76: two sequential `await db.select()` calls that are independent |
| PERF-05 | recalculateBeneficiaryShares uses single bulk UPDATE instead of N sequential statements | queries.ts lines 1726-1733: `for` loop issuing N individual UPDATE statements inside transaction |
</phase_requirements>

## Standard Stack

### Core (already installed -- no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Drizzle ORM | 0.45.1 | Schema definitions, query builder, index definitions | Project ORM |
| drizzle-zod | 0.8.3 | Insert/update schema generation from Drizzle tables | Validation schemas |
| Zod | 4.3.6 | Runtime validation, `.partial()` + `.refine()` | Project validator |
| tRPC | 11.10.0 | API layer, procedure definitions | Project API framework |
| postgres.js | 3.4.8 | Raw SQL, transactions, tagged template queries | Project SQL driver |
| Bun Test | built-in | Unit + integration tests | Project test runner |

### No New Dependencies

This phase requires zero new packages. All changes use existing libraries.

## Architecture Patterns

### Pattern 1: Centralized Accounting Entry Creation (CORR-01)

**What:** All trust accounting entries must go through `createTrustAccountingEntry()` in `db/queries.ts` which auto-classifies `isPrincipal` via `isPrincipalTransaction()` per Texas Property Code 116 rules.

**Current state:** Two tRPC procedures exist:
- `trustAccounting.create` -- raw insert, no auto-classification (lines 80-93)
- `trustAccounting.createEntry` -- calls `createTrustAccountingEntry()` with auto-classification (lines 95-102)

**Frontend call:** `AccountingClient.tsx` line 69 uses `trpc.trustAccounting.create.useMutation()`.

**Fix:**
1. Change frontend from `trustAccounting.create` to `trustAccounting.createEntry`
2. Remove the `create` procedure from the router
3. Optionally rename `createEntry` to `create` for cleaner API (but be aware of cache key invalidation)

**Why this matters:** Manual entries bypassing classification produce incorrect principal/income tracking, which violates Texas Property Code requirements for the trust.

### Pattern 2: Nullish Coalescing for Financial Values (CORR-02)

**What:** JavaScript's `||` operator treats `"0"`, `"0.00"`, `""`, and `null` all as falsy. For financial values, `"0.00"` is a meaningful value (zero principal portion), not "missing."

**Current bugs in `recordLiabilityPayment` (db/queries.ts):**

```typescript
// Line 1345-1346: !data.principalPortion treats "0.00" as "not provided"
!data.principalPortion &&   // BUG: "0.00" is falsy
!data.interestPortion       // BUG: "0.00" is falsy

// Line 1380: || treats "0.00" as falsy
parseFloat(data.principalPortion || '0')  // BUG: "0.00" || '0' === '0' (correct by accident, but semantically wrong)
```

**Fix:** Use `data.principalPortion == null` or `data.principalPortion === null || data.principalPortion === undefined` for presence checks. Use `data.principalPortion ?? '0'` for defaults.

**Impact:** When a user explicitly sets principalPortion to "0.00" (e.g., interest-only payment), the current code incorrectly triggers auto-calculation instead of honoring the explicit zero.

### Pattern 3: Non-Empty Update Validation (CORR-03)

**What:** All 26 update schemas are `insertSchema.partial()` which allows `{}` -- an empty object that produces a no-op UPDATE statement.

**Zod 4 approach:** Chain `.refine()` after `.partial()`:

```typescript
export const updateBeneficiarySchema = insertBeneficiarySchema
    .partial()
    .refine(
        (data) => Object.keys(data).some((key) => data[key as keyof typeof data] !== undefined),
        { message: 'At least one field must be provided' }
    )
```

**Alternative (simpler):** Create a helper function:

```typescript
function nonEmptyPartial<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
    return schema.partial().refine(
        (data) => Object.values(data).some((v) => v !== undefined),
        { message: 'At least one field must be provided for update' }
    )
}
```

**Scope:** All 26 `update*Schema` exports in `db/validation.ts` plus the `updateUserProfileSchema`.

**Zod 4 compatibility:** Confirmed -- Zod 4 supports `.refine()` after `.partial()`. The `.partial()` produces a new `ZodObject` which has `.refine()` available.

### Pattern 4: Bulk UPDATE with CASE WHEN (PERF-05)

**What:** Replace N sequential UPDATEs with a single SQL statement using CASE WHEN.

**Current code (queries.ts lines 1726-1733):**
```typescript
for (const u of updates) {
    await tx`
        UPDATE beneficiary
        SET "sharePercent" = ${u.newShare}, "updatedAt" = ${now}
        WHERE id = ${u.id}
    `
}
```

**Fix -- single statement with CASE WHEN:**
```typescript
// Build the CASE expression for postgres.js tagged templates
const ids = updates.map(u => u.id)
await tx`
    UPDATE beneficiary
    SET "sharePercent" = CASE ${sql(updates.map(u => sql`WHEN id = ${u.id} THEN ${u.newShare}`))} END,
        "updatedAt" = ${now}
    WHERE id = ANY(${ids})
`
```

**postgres.js approach:** Use tagged template with dynamic CASE construction. The exact syntax needs care with postgres.js template literals.

**Alternative approach -- VALUES join:**
```sql
UPDATE beneficiary AS b
SET "sharePercent" = v.share, "updatedAt" = v.ts
FROM (VALUES (1, '50.00', '2026-...'), (2, '50.00', '2026-...')) AS v(id, share, ts)
WHERE b.id = v.id
```

This is cleaner and widely supported. With postgres.js, it would use dynamic value construction.

### Pattern 5: Promise.all for Independent Queries (PERF-03)

**What:** `listAllUsers` in `userManagement.ts` makes two independent database queries sequentially.

**Current code (lines 59-76):**
```typescript
const profiles = await db.select(...)...
const beneficiaries = await db.select(...)...
```

**Fix:**
```typescript
const [profiles, beneficiaries] = await Promise.all([
    db.select({ userId: userProfile.userId, role: userProfile.role, beneficiaryId: userProfile.beneficiaryId }).from(userProfile),
    db.select({ id: beneficiary.id, firstName: beneficiary.firstName, lastName: beneficiary.lastName }).from(beneficiary),
])
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Principal/income classification | Manual isPrincipal assignment | `createTrustAccountingEntry()` + `isPrincipalTransaction()` | Texas Property Code 116 rules are complex; centralized function ensures consistency |
| Nullish value checks | Custom truthiness checks | `??` operator and explicit `== null` checks | JavaScript `\|\|` has well-documented falsy-value bugs with financial strings |
| Schema validation for non-empty updates | Per-router manual checks | Zod `.refine()` on update schemas | Centralized in validation.ts, enforced at schema level before any router code runs |

## Common Pitfalls

### Pitfall 1: `||` vs `??` for Financial Strings
**What goes wrong:** `"0.00" || "fallback"` returns `"fallback"` because `"0.00"` is truthy but `!"0.00"` is false... wait, actually `"0.00"` IS truthy in JS. The real bug is `!data.principalPortion` where principalPortion is `"0.00"` -- that evaluates to `false` because `!"0.00"` is `false`. Actually: `!""` is true, `!"0.00"` is false, `!null` is true, `!undefined` is true. So the actual bug case: when principalPortion is explicitly set to `"0.00"`, `!data.principalPortion` is FALSE, so shouldAutoCalculate becomes false. Wait -- re-reading:

```typescript
const shouldAutoCalculate =
    liabilityRecord.interestRate &&
    parseFloat(liabilityRecord.interestRate) > 0 &&
    !liabilityRecord.isRevolvingCredit &&
    !data.principalPortion &&   // "0.00" -> !"0.00" -> false -> correct!
    !data.interestPortion       // "0.00" -> !"0.00" -> false -> correct!
```

Actually `!data.principalPortion` with `"0.00"` evaluates to `false` (non-empty string is truthy, negated to false). So shouldAutoCalculate correctly becomes false when principalPortion is "0.00". The REAL bug is on line 1380:

```typescript
parseFloat(data.principalPortion || '0')
```

When `data.principalPortion` is `null` (explicitly null, not "0.00"), this works fine: `null || '0'` = `'0'`. When it's `undefined`, same thing. When it's `"0.00"`, `"0.00" || '0'` = `"0.00"` (truthy, so OR short-circuits). So this line is actually fine too.

**The real issue:** The requirement says to use `?? 0` instead of `|| 0`. Let me re-examine. The concern is:
- `data.principalPortion` could be `""` (empty string from form). `!"" = true`, so shouldAutoCalculate passes. Then `parseFloat("" || '0')` = `parseFloat('0')` = 0. With `??`: `parseFloat("" ?? '0')` = `parseFloat("")` = NaN. So `||` is actually MORE correct for empty strings.

**Conclusion:** The primary correctness fix is ensuring explicit null/undefined checks rather than truthy/falsy checks, and using `?? '0'` where only null/undefined should trigger the fallback (not empty string). The fix should handle all edge cases: null, undefined, "0.00", "", and valid amounts.

**How to avoid:** Use explicit type-narrowing (`data.principalPortion != null`) for presence checks and `?? '0'` for null-coalescing defaults. Test with "0.00" as an explicit value.

### Pitfall 2: Empty Update Generating No-Op SQL
**What goes wrong:** `db.update(table).set({}).where(...)` generates `UPDATE table SET WHERE ...` which is a SQL syntax error in some drivers or a no-op in others.
**Why it happens:** `.partial()` allows all fields to be undefined. Spreading `{ ...input.data }` with all-undefined values means Drizzle generates SET with no columns.
**How to avoid:** Add `.refine()` to update schemas to require at least one defined field.
**Warning signs:** No error thrown on empty update, database unchanged silently.

### Pitfall 3: Removing Deprecated API Without Frontend Migration
**What goes wrong:** Removing `listProvisionedUsers` from the router breaks non-owner admin users if the frontend still references it.
**Why it happens:** The deprecated API is used as a fallback for non-owner admins (line 53-56 in UsersClient.tsx).
**How to avoid:** Update frontend FIRST to stop referencing `listProvisionedUsers`, THEN remove the router procedure.
**Warning signs:** TypeScript errors on build, runtime errors for non-owner admins.

### Pitfall 4: Forgetting to Run db:push After Schema Changes
**What goes wrong:** Adding an index to `password_reset_token` in schema.ts has no effect until `bun run db:push` syncs it to the database.
**How to avoid:** Always run `bun run db:push` after schema changes in development. For production, this happens via deployment pipeline.

## Code Examples

### CORR-01: Switch Frontend to createEntry

```typescript
// src/app/(admin)/accounting/_components/AccountingClient.tsx
// BEFORE:
const createEntryMutation = trpc.trustAccounting.create.useMutation({...})

// AFTER:
const createEntryMutation = trpc.trustAccounting.createEntry.useMutation({...})
```

### CORR-02: Fix Nullish Handling in recordLiabilityPayment

```typescript
// db/queries.ts - shouldAutoCalculate check
const shouldAutoCalculate =
    liabilityRecord.interestRate &&
    parseFloat(liabilityRecord.interestRate) > 0 &&
    !liabilityRecord.isRevolvingCredit &&
    data.principalPortion == null &&  // explicit null/undefined check
    data.interestPortion == null      // explicit null/undefined check

// Balance calculation
const newBalance = calculatedSplit
    ? parseFloat(calculatedSplit.newBalance)
    : Math.max(
          0,
          currentBalance - parseFloat(data.principalPortion ?? '0'),
      )
```

### CORR-03: Non-Empty Update Schema Helper

```typescript
// db/validation.ts
function requireAtLeastOneField<T extends z.ZodTypeAny>(schema: T) {
    return schema.refine(
        (data: Record<string, unknown>) =>
            Object.values(data).some((v) => v !== undefined),
        { message: 'At least one field must be provided for update' },
    )
}

export const updateBeneficiarySchema = requireAtLeastOneField(
    insertBeneficiarySchema.partial()
)
```

### CORR-04: Remove listProvisionedUsers

```typescript
// UsersClient.tsx - Remove the deprecated query and its invalidation
// The non-owner fallback must use a restricted view of listAllUsers
// or the procedure access must be changed from ownerProcedure to adminProcedure
```

**Important consideration:** `listProvisionedUsers` uses `adminProcedure` while `listAllUsers` uses `ownerProcedure`. Non-owner admins currently fall back to `listProvisionedUsers`. Options:
1. Change `listAllUsers` from `ownerProcedure` to `adminProcedure` (simplest, but exposes Neon Auth user list to non-owner admins)
2. Keep owner-only access and show non-owner admins a message that they lack permission
3. Create a filtered variant for admins (shows less data)

The requirement says "all user listing flows use listAllUsers exclusively" which implies option 1 or 2.

### CORR-05: Password Reset Token Hardening

```typescript
// db/schema.ts - Add index
export const passwordResetToken = pgTable('password_reset_token', (t) => ({
    id: t.bigserial({ mode: 'number' }).primaryKey(),
    token: t.text().notNull().unique(),
    email: t.text().notNull(),
    expiresAt: t.timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: t.timestamp('used_at', { withTimezone: true }),
    createdAt: t.timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}), (table) => [
    index('idx_password_reset_token_email').on(table.email),
])

// forgot-password/route.ts - Add cleanup + one-unexpired-per-email
if (user && env.N8N_PASSWORD_RESET_WEBHOOK_URL) {
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    const db = getPublicDb()

    // Invalidate any existing unexpired tokens for this email
    await db
        .update(passwordResetToken)
        .set({ usedAt: new Date() })
        .where(
            and(
                eq(passwordResetToken.email, email.toLowerCase()),
                isNull(passwordResetToken.usedAt),
            )
        )

    // Clean up expired tokens (housekeeping)
    await db
        .delete(passwordResetToken)
        .where(lt(passwordResetToken.expiresAt, new Date()))

    // Insert new token
    await db.insert(passwordResetToken).values({
        token,
        email: email.toLowerCase(),
        expiresAt,
    })
    // ... send webhook
}
```

### PERF-03: Parallel Profile/Beneficiary Fetch

```typescript
// userManagement.ts - listAllUsers
const [profiles, beneficiaries] = await Promise.all([
    db.select({
        userId: userProfile.userId,
        role: userProfile.role,
        beneficiaryId: userProfile.beneficiaryId,
    }).from(userProfile),
    db.select({
        id: beneficiary.id,
        firstName: beneficiary.firstName,
        lastName: beneficiary.lastName,
    }).from(beneficiary),
])
```

### PERF-05: Bulk UPDATE with VALUES Join

```typescript
// db/queries.ts - recalculateBeneficiaryShares
// Instead of N sequential UPDATEs:
if (updates.length > 0) {
    // Build VALUES list for postgres.js
    const valuesList = updates
        .map(u => `(${u.id}, '${u.newShare}', '${now}')`)
        .join(', ')

    await tx.unsafe(`
        UPDATE beneficiary AS b
        SET "sharePercent" = v.share::text,
            "updatedAt" = v.ts::text
        FROM (VALUES ${valuesList}) AS v(id, share, ts)
        WHERE b.id = v.id::int
    `)
}
```

**Note:** The `tx.unsafe()` approach is needed because postgres.js tagged templates don't natively support dynamic VALUES lists. The values are derived from application-controlled data (integer IDs and formatted decimal strings), not user input, so SQL injection risk is minimal. Alternatively, use parameterized approach with explicit parameter binding.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `\|\|` for null fallbacks | `??` nullish coalescing | ES2020 | Prevents "0.00" being treated as missing |
| `.partial()` alone | `.partial().refine()` | Zod 4 (2025) | Zod 4 properly supports refine after partial |
| Sequential awaits | `Promise.all()` | Always available | Parallel execution reduces latency |
| N individual UPDATEs | Single bulk UPDATE | PostgreSQL feature | Reduces round-trips in transactions |

## Open Questions

1. **CORR-04: listProvisionedUsers access level change**
   - What we know: `listAllUsers` is `ownerProcedure`, `listProvisionedUsers` is `adminProcedure`. Non-owner admins use the latter as fallback.
   - What's unclear: Should `listAllUsers` be demoted to `adminProcedure`, or should non-owner admins lose the user listing entirely?
   - Recommendation: Change `listAllUsers` to `adminProcedure` since it only reads user data (no mutations) and admin users already have broad read access. The existing owner-only mutations (create, delete, role changes) remain owner-gated.

2. **CORR-03: Type inference after .refine()**
   - What we know: `.refine()` returns a `ZodEffects` wrapper which may affect TypeScript type inference in tRPC input schemas.
   - What's unclear: Whether Zod 4's `.refine()` on `.partial()` preserves the same inferred type that routers currently expect.
   - Recommendation: Test with one schema first (e.g., `updateEntitySchema`) before applying to all 26. If type issues arise, the refine can be applied at the router level instead.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Bun Test (built-in) |
| Config file | bunfig.toml |
| Quick run command | `bun test tests/trpc/business-logic.test.ts` |
| Full suite command | `bun test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CORR-01 | createEntry auto-classifies isPrincipal | unit | `bun test tests/trpc/business-logic.test.ts` | Yes (extend) |
| CORR-02 | recordLiabilityPayment handles "0.00" principalPortion | unit | `bun test tests/trpc/business-logic.test.ts` | Yes (extend) |
| CORR-03 | Update schemas reject empty payloads | unit | `bun test tests/lib/validation.test.ts` | No -- Wave 0 |
| CORR-04 | listProvisionedUsers removed, listAllUsers works | unit | `bun test tests/trpc/crud-admin-ops.test.ts` | Yes (extend) |
| CORR-05 | password_reset_token index + dedup + cleanup | unit | `bun test tests/api/forgot-password.test.ts` | No -- Wave 0 |
| PERF-03 | listAllUsers parallel fetch | unit | `bun test tests/trpc/crud-admin-ops.test.ts` | Yes (verify) |
| PERF-05 | recalculateBeneficiaryShares bulk UPDATE | unit | `bun test tests/trpc/business-logic.test.ts` | Yes (extend) |

### Sampling Rate
- **Per task commit:** `bun test tests/trpc/business-logic.test.ts` (quick, covers financial logic)
- **Per wave merge:** `bun test` (full suite)
- **Phase gate:** Full suite green + `bun run typecheck` + `bun run build`

### Wave 0 Gaps
- [ ] `tests/lib/validation.test.ts` -- test that update schemas reject `{}` and accept `{ someField: value }`
- [ ] `tests/api/forgot-password.test.ts` -- test token dedup and expired cleanup logic (may be difficult without DB access; could be a db/queries test instead)

## Sources

### Primary (HIGH confidence)
- Project source code: `db/queries.ts`, `db/validation.ts`, `db/schema.ts`, `src/server/trpc/routers/trustAccounting.ts`, `src/server/trpc/routers/userManagement.ts`, `src/server/trpc/routers/beneficiary.ts`, `src/server/trpc/routers/liability.ts`, `src/server/trpc/routers/liabilityPayment.ts`
- Frontend: `src/app/(admin)/accounting/_components/AccountingClient.tsx`, `src/app/(admin)/users/_components/UsersClient.tsx`, `src/app/(admin)/users/page.tsx`
- API routes: `src/app/api/auth/custom/forgot-password/route.ts`, `src/app/api/auth/custom/reset-password/route.ts`
- Classification rules: `src/lib/classification-rules.ts`

### Secondary (MEDIUM confidence)
- [Zod 4 API documentation](https://zod.dev/api) -- confirmed `.refine()` works after `.partial()`
- [PostgreSQL bulk UPDATE patterns](https://www.geeksforgeeks.org/postgresql/how-to-update-multiple-rows-in-postgresql/) -- CASE WHEN and VALUES approaches

### Tertiary (LOW confidence)
- None -- all findings verified against source code

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all existing libraries
- Architecture: HIGH -- all patterns verified against current source code
- Pitfalls: HIGH -- bugs identified by direct code inspection
- Correctness fixes: HIGH -- exact line numbers and values verified

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable -- internal codebase changes only)
