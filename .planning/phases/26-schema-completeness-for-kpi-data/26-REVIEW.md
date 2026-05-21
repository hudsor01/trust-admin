---
phase: 26-schema-completeness-for-kpi-data
reviewed: 2026-05-20T00:00:00Z
depth: standard
files_reviewed: 23
files_reviewed_list:
  - db/schema.ts
  - db/relations.ts
  - db/validation.ts
  - drizzle/0013_kpi_schema_completeness.sql
  - scripts/apply-0013-testbranch.ts
  - src/server/trpc/routers/asset.ts
  - src/server/trpc/routers/liability.ts
  - src/server/trpc/routers/specificBequest.ts
  - src/server/trpc/routers/personalProperty.ts
  - src/app/(admin)/accounts/_components/AccountsClient.tsx
  - src/app/(admin)/accounts/_components/InvestmentAccountTable.tsx
  - src/app/(admin)/assets/_components/AssetsClient.tsx
  - src/app/(admin)/bequests/_components/BequestDialog.tsx
  - src/app/(admin)/bequests/_components/BequestsClient.tsx
  - src/app/(admin)/bequests/_components/BequestTable.tsx
  - src/app/(admin)/bequests/_components/types.ts
  - src/app/(admin)/liabilities/_components/LiabilitiesClient.tsx
  - src/app/(admin)/liabilities/_components/LiabilityConstants.ts
  - src/app/(admin)/liabilities/_components/LiabilityDialog.tsx
  - src/app/(admin)/personal-property/_components/PersonalPropertyClient.tsx
  - src/app/(admin)/personal-property/_components/PersonalPropertyDialog.tsx
  - tests/trpc/liability.test.ts
  - tests/trpc/asset.test.ts
findings:
  critical: 0
  warning: 2
  info: 4
  total: 6
status: resolved
---

# Phase 26: Code Review Report

**Reviewed:** 2026-05-20T00:00:00Z
**Depth:** standard
**Files Reviewed:** 23
**Status:** issues_found

## Summary

Phase 26 replaces placeholder KPI columns with real data (`specific_bequest.estimatedValue`,
`personal_property.insured`, `liability.bankAccountId` / `liability.investmentAccountId`) and
adds account-to-liability linkage. Overall the implementation is sound and matches project
conventions closely.

Focus-area assessment:

1. **`assertLinkedAccountsInEntity` (T-26-01)** — Correct. The guard is invoked on both
   `create` and `update`, looks each non-null FK up scoped by `and(eq(id), eq(entityId))`, and
   throws `BAD_REQUEST` on a non-match. Null/undefined handling is correct (unlinking is
   permitted, no DB lookup attempted). `bulkCreate` cannot link accounts at all
   (`bulkLiabilityRowSchema` has no FK fields), so it is not a bypass. No update path skips
   the guard. One residual gap is noted as WR-01 (the guard runs *before* the row-existence
   check, leaking entity-membership info on a NOT_FOUND liability — low severity).
2. **Migration 0013** — Correct. camelCase column identifiers, snake_case table names, nullable
   `ADD COLUMN`, `boolean DEFAULT false NOT NULL`, FK constraints with `ON DELETE set null
   ON UPDATE cascade` mirroring `liability_homestead_id_fkey` / `liability_vehicle_id_fkey`,
   matching indexes. Registered as idx 13 in `drizzle/meta/_journal.json`. Non-destructive.
   `scripts/apply-0013-testbranch.ts` is sound, transactional, and idempotent (DO-block FK
   guard, `IF NOT EXISTS` everywhere, 4-column verification). See IN-01.
3. **Money correctness** — Correct. `estimatedValue` is a `numeric(14,2)` string column;
   `BequestsClient` sums it with `sumStrings` (integer-cent arithmetic), not `parseFloat`.
   `positiveNumberValidation` enforces 2-decimal/non-negative/magnitude bounds. See WR-02 on
   a column-width mismatch in the validator message.
4. **KPI computation** — Correct. `/artwork` "Insured count" is `items.filter((p) => p.insured)`
   (boolean count). `/assets` "Transfer-status progress" correctly excludes insurance from the
   denominator (`transferStatus !== null`), divides COMPLETE by transferable, and guards the
   zero-denominator case. No off-by-one.
5. **`/accounts` row-detail** — Correct. A single `liability.list` query feeds both tabs;
   `getRowDetail` filters client-side by `bankAccountId` / `investmentAccountId` respectively.
   No N+1. React Compiler safe (filter runs on stable query data inside render).
6. **`AssetRow.transferStatus` mappers** — Correct. All six transferable kinds pass through
   the real `transferStatus` column; `insurancePolicy` is hard-coded to `null`.

## Warnings

### WR-01: Cross-entity FK guard runs before liability row-existence check on update

**File:** `src/server/trpc/routers/liability.ts:191-211`
**Issue:** `liability.update` calls `assertLinkedAccountsInEntity` first, then runs the
scoped `UPDATE ... WHERE id = ? AND entityId = ?`. If an attacker submits an `id` that does
not exist in their entity but a `bankAccountId` that *does* belong to their entity, the guard
passes and the request only fails afterward with `NOT_FOUND`. Conversely, the guard's
`BAD_REQUEST` ("Linked account does not belong to this entity") fires even when the target
liability itself is not in the caller's entity — the response distinguishes "bad account" vs
"bad liability" for a row the caller has no access to. This is an information-disclosure /
ordering nicety rather than a write vulnerability: the actual `UPDATE` is still fully
`entityId`-scoped, so no cross-entity row can be modified. The data-integrity guarantee holds;
only the error-message ordering leaks a small amount of entity-membership signal.
**Fix:** Resolve the liability row first (scoped by `id` + `entityId`), 404 if absent, then
validate the linked-account FKs:
```typescript
update: adminProcedure
    .input(z.object({ id: z.coerce.number(), entityId: z.coerce.number(), data: updateLiabilitySchema }))
    .mutation(async ({ input }) => {
        const existing = await db.query.liability.findFirst({
            where: and(eq(liability.id, input.id), eq(liability.entityId, input.entityId)),
        })
        if (!existing) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Record not found in this entity' })
        }
        await assertLinkedAccountsInEntity({
            entityId: input.entityId,
            bankAccountId: input.data.bankAccountId,
            investmentAccountId: input.data.investmentAccountId,
        })
        const [updated] = await db.update(liability)
            .set({ ...input.data, updatedAt: new Date().toISOString() })
            .where(and(eq(liability.id, input.id), eq(liability.entityId, input.entityId)))
            .returning()
        // updated is guaranteed to exist here
        return updated
    }),
```

### WR-02: `positiveNumberValidation` rejects only 3+ decimals but `estimatedValue` is `numeric(14,2)` with a `numeric(12,2)` error message

**File:** `db/validation.ts:88-105` (applied to `estimatedValue` at `db/validation.ts:323`)
**Issue:** `estimatedValue`, `originalAmount`, and `currentBalance` are declared
`numeric({ precision: 14, scale: 2 })` (max ~999 trillion), but `positiveNumberValidation`
caps magnitude at `MAX_CURRENCY_VALUE = 999_999_999_999.99` (`numeric(12,2)`) and its error
message hard-codes "DB columns are numeric(12,2)". A value between 10^12 and 10^14 would pass
the DB column but be rejected by Zod with a message that names the wrong precision. Functionally
the tighter bound is harmless (no overflow), but the comment/message is now factually wrong for
the 14,2 columns and will mislead a future maintainer. The reverse risk (a value that overflows
the column) does not exist because 12,2 < 14,2.
**Fix:** Either accept the intentional tighter cap and correct the stale comment, or split a
`positiveNumberValidation14` for the 14,2 columns:
```typescript
// db/validation.ts:103 — comment no longer matches the columns it is applied to
}, 'Must have at most 2 decimal places') // (DB money columns are numeric(12,2) or numeric(14,2))
```
A single `MAX_CURRENCY_VALUE` for all money columns is acceptable for this trust; just fix the
comment so it does not assert a precision that several columns no longer use.

## Info

### IN-01: `apply-0013-testbranch.ts` is a one-off script with no guard against running on production

**File:** `scripts/apply-0013-testbranch.ts:11-17`
**Issue:** The script reads `DATABASE_URL` and applies DDL with no check that the URL points
at the test branch. Per MEMORY, `.env.test.local` overrides `DATABASE_URL`; if the script is
run with the default `.env` loaded it would apply 0013 to production. Migration 0013 is
non-destructive and idempotent, so the blast radius is small, but the file name promises
"testbranch" and the body does not enforce it. The canonical migration path is `db:deploy`;
this script is a stopgap.
**Fix:** Add a branch assertion before `sql.begin`, mirroring `tests/helpers/db-guard.ts`:
```typescript
if (!/ep-gentle-salad/.test(url)) {
    console.error('Refusing to run: DATABASE_URL is not the test branch')
    process.exit(1)
}
```
Or delete the script after the test branch is confirmed in sync — it has served its purpose
and `db:deploy` is the documented path.

### IN-02: `AccountsClient` passes `description: data.description || null` but `bankAccountFormDefaults` has no `transferStatus`/`description` typing risk — minor null-coalescing inconsistency

**File:** `src/app/(admin)/accounts/_components/AccountsClient.tsx:124-138, 160-178`
**Issue:** The bank/investment create payloads use `data.x || null` for optional fields, while
the liability payload (`LiabilitiesClient.tsx:159-164`) uses `data.bankAccountId ? Number(...) : null`.
Both are correct, but the codebase mixes `|| null`, `|| undefined`, and ternaries for the same
"empty form field" concept across the three Phase-26 forms (`BequestsClient` uses `|| undefined`,
`LiabilitiesClient` uses `|| null`). Not a bug — Zod accepts both `null` and `undefined` for the
nullable-optional columns — but the inconsistency is a small readability cost.
**Fix:** Optional. Standardize on `emptyToNull` (already exported from `src/lib/form-factory.ts`)
for string fields and the `value ? Number(value) : null` pattern for FK fields.

### IN-03: `AssetsClient` `totalCurrent` is a pure alias of `totalDod` with a self-referential comment

**File:** `src/app/(admin)/assets/_components/AssetsClient.tsx:176-177`
**Issue:** `const totalCurrent = totalDod` plus the comment "listAll returns best-effort value
already" means the "DOD total" and "Estimated current" KPIs always render identical figures.
The same pattern appears in `PersonalPropertyClient.tsx:241-242` (`totalCurrent = totalValue`).
This is a pre-existing placeholder, not introduced by Phase 26, but Phase 26 touched these KPI
strips and left the duplicate KPI in place — two adjacent KPI tiles showing the same number
reads as a bug to an end user.
**Fix:** Either remove the redundant "Estimated current" tile or source it from a genuinely
different column. If a real "current value" signal does not exist yet, drop the tile rather
than shipping two identical figures.

### IN-04: `BequestTable` distributed-bequests section has no loading state

**File:** `src/app/(admin)/bequests/_components/BequestTable.tsx:261-333`
**Issue:** The "Pending Bequests" card branches on `isLoading` and renders a spinner
(lines 75-78); the "Distributed Bequests" card does not — it goes straight to the
`distributedBequests.length === 0` empty-state, so during the initial load it briefly flashes
"No distributed bequests" before data arrives. Minor UX inconsistency within the same component.
**Fix:** Mirror the pending card's `isLoading` branch in the distributed card, or hoist the
spinner to wrap both cards.

---

## Resolution

All 6 findings fixed. Typecheck, lint, and the full unit suite (1010 tests)
pass clean.

| Finding | Status | Commit |
|---------|--------|--------|
| WR-01 | fixed — `liability.update` now resolves the target row scoped by `id`+`entityId` and 404s before `assertLinkedAccountsInEntity`, so the cross-entity FK guard no longer leaks entity-membership signal | `9efdadd` |
| WR-02 | fixed — added `MAX_CURRENCY_VALUE_14` (`1e14`, the exact-double bound just above the `numeric(14,2)` column max); `positiveNumberValidation` and its message now match the 14,2 columns | `9efdadd` |
| IN-01 | fixed — `apply-0013-testbranch.ts` refuses to run against a production `DATABASE_URL`, mirroring `tests/helpers/db-guard.ts`; `ALLOW_PRODUCTION_DB` is the deliberate override | `0f48159` |
| IN-02 | fixed — `BequestsClient` empty-optional fields coalesce `'' → null` (FK fields `value ? Number(value) : null`), consistent with `LiabilitiesClient` / `PersonalPropertyClient` | `0f48159` |
| IN-03 | fixed — investigated: no post-DOD revaluation source exists (`AssetRow.value` is already the single best-effort figure). Removed the duplicate "Estimated current" KPI tile from `/assets` and `/personal-property` rather than shipping two identical figures | `0f48159` |
| IN-04 | fixed — Distributed Bequests card now renders the same loading spinner as the Pending card instead of flashing the empty state during initial load | `0f48159` |

_Reviewed: 2026-05-20T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
_Resolved: 2026-05-20 — Claude (gsd-code-fixer)_
