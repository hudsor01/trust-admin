---
phase: 26-schema-completeness-for-kpi-data
verified: 2026-05-20T00:00:00Z
status: passed
score: 15/15 must-haves verified
overrides_applied: 0
---

# Phase 26: Schema Completeness for KPI Data — Verification Report

**Phase Goal:** Replace every placeholder KPI column with real data and enable account-to-liability linkage — add a `specific_bequest` value column (bequest "Total value" KPI), a personal-property `insured` field (artwork "Insured count" KPI), surface `transferStatus` through `asset.listAll` (assets "Transfer-status progress" KPI), and add `liability.bankAccountId`/`investmentAccountId` FKs so `/accounts` row-detail shows genuinely linked liabilities.

**Verified:** 2026-05-20
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                              | Status     | Evidence                                                                                                                                  |
| --- | -------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `specific_bequest.estimatedValue` money column exists on the live DB                               | ✓ VERIFIED | `information_schema.columns`: `specific_bequest.estimatedValue`, `data_type=numeric`, `is_nullable=YES`                                    |
| 2   | `personal_property.insured` boolean column (default false) exists on the live DB                   | ✓ VERIFIED | `information_schema.columns`: `personal_property.insured`, `data_type=boolean`, `is_nullable=NO`; migration `DEFAULT false NOT NULL`       |
| 3   | `liability.bankAccountId` and `investmentAccountId` nullable FK columns exist on the live DB        | ✓ VERIFIED | `information_schema.columns`: both present on `liability`, `data_type=bigint`, `is_nullable=YES`                                           |
| 4   | Both new liability FK columns reference bank_account/investment_account with onDelete set null      | ✓ VERIFIED | Live DB `table_constraints`: `liability_bank_account_id_fkey` + `liability_investment_account_id_fkey` present; schema.ts `.onDelete('set null')` |
| 5   | `db/relations.ts` exposes `liability.bankAccount` and `investmentAccount` one-relations             | ✓ VERIFIED | `db/relations.ts:343-350` — both `one()` relations inside `liabilityRelations`                                                            |
| 6   | `/bequests` "Total value" KPI shows a real currency sum of `estimatedValue`, not an em-dash         | ✓ VERIFIED | `BequestsClient.tsx:165,169` — `sumStrings(bequests.map(b => b.estimatedValue))` → `formatCurrency`; no `value: '—'` placeholder remains   |
| 7   | Admin can enter an estimated value when creating/editing a specific bequest                         | ✓ VERIFIED | `BequestDialog.tsx:107` `Field name="estimatedValue"`; `BequestsClient.tsx:61,74,150` round-trips initialData/onSubmit/handleEdit          |
| 8   | `/artwork` "Insured count" KPI shows the real count of insured items, not 0                         | ✓ VERIFIED | `PersonalPropertyClient.tsx:245` `items.filter(p => p.insured).length`; `const insuredCount = 0` removed                                   |
| 9   | Admin can toggle an "Insured" flag when creating/editing a personal-property item                   | ✓ VERIFIED | `PersonalPropertyDialog.tsx:419,431` `Field name="insured"` rendering `<Switch>`; `form-factory.ts:164` `insured: false` default           |
| 10  | Admin can link a liability to a bank or investment account via the liability form                  | ✓ VERIFIED | `LiabilityDialog.tsx:535,569` two nullable-FK Select Fields (`__none__` sentinel); `LiabilitiesClient.tsx:159-163,253-255` round-trip      |
| 11  | `/accounts` row-detail lists liabilities genuinely linked to that account                          | ✓ VERIFIED | `AccountsClient.tsx:348-421` bank + investment `getRowDetail` render `LinkedLiabilities` filtered by FK; no "not yet wired" notice remains |
| 12  | Linking a liability to a bank/investment account from another entity is rejected server-side        | ✓ VERIFIED | `liability.ts:55-92` `assertLinkedAccountsInEntity` throws `BAD_REQUEST`; called by `create` (166) and `update` (192); tests assert reject |
| 13  | `asset.listAll` returns `transferStatus` on every AssetRow                                          | ✓ VERIFIED | `asset.ts:59` `AssetRow.transferStatus: string \| null`; all 7 mappers set it (lines 137,152,167,182,197,216,233)                          |
| 14  | `insurancePolicy` rows expose `transferStatus` as null                                              | ✓ VERIFIED | `asset.ts:233` insurancePolicy mapper sets `transferStatus: null`; `asset.test.ts:272-279` asserts `toBeNull()`                            |
| 15  | `/assets` "Transfer-status progress" KPI computed from real `transferStatus`, not `status==='ACTIVE'`| ✓ VERIFIED | `AssetsClient.tsx:182-189` filters `transferStatus === 'COMPLETE'`, excludes null rows; `r.status === 'ACTIVE'` approximation removed       |

**Score:** 15/15 truths verified

### Required Artifacts

| Artifact                                                          | Expected                                                          | Status     | Details                                                                                          |
| ----------------------------------------------------------------- | ----------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------ |
| `drizzle/0013_kpi_schema_completeness.sql`                        | 4 ADD COLUMN + 2 FK constraints, camelCase identifiers            | ✓ VERIFIED | 4 ADD COLUMN (camelCase quoted), 2 FK ADD CONSTRAINT, 2 indexes; idempotent `IF NOT EXISTS`       |
| `drizzle/meta/_journal.json`                                      | idx 13 entry tagged `0013_kpi_schema_completeness`                | ✓ VERIFIED | idx 13, version 7, tag `0013_kpi_schema_completeness`, breakpoints true                           |
| `drizzle/meta/0013_snapshot.json`                                 | drizzle-kit snapshot for migration 0013                           | ✓ VERIFIED | 211 KB snapshot file present                                                                     |
| `db/schema.ts`                                                    | estimatedValue, insured, bankAccountId/investmentAccountId + FKs  | ✓ VERIFIED | Lines 2008, 1346, 2300-2301; FK blocks 2356-2369; indexes 2324-2327                              |
| `db/relations.ts`                                                 | liability → bankAccount/investmentAccount relations               | ✓ VERIFIED | Lines 343-350                                                                                    |
| `src/server/trpc/routers/liability.ts`                            | cross-entity FK guard + getLinked query                           | ✓ VERIFIED | `assertLinkedAccountsInEntity` (55-92), `getLinked` adminProcedure (126-161), wired into create/update |
| `src/app/(admin)/bequests/_components/BequestsClient.tsx`         | Total value KPI via sumStrings over estimatedValue                | ✓ VERIFIED | Lines 12,14,165,169                                                                              |
| `src/app/(admin)/personal-property/_components/PersonalPropertyClient.tsx` | Insured count KPI from items.filter(p => p.insured)      | ✓ VERIFIED | Line 245                                                                                         |
| `src/app/(admin)/accounts/_components/AccountsClient.tsx`         | getRowDetail renders linked liabilities                           | ✓ VERIFIED | `LinkedLiabilities` component (458-482); bank+investment getRowDetail (348-421)                   |
| `src/server/trpc/routers/asset.ts`                                | transferStatus on AssetRow + 7 mappers                            | ✓ VERIFIED | 10 occurrences; insurancePolicy sets null                                                        |
| `src/app/(admin)/assets/_components/AssetsClient.tsx`             | Transfer-status progress KPI from transferStatus                  | ✓ VERIFIED | Lines 182-197                                                                                    |
| `tests/trpc/liability.test.ts`                                    | cross-entity-rejection + linkage tests                            | ✓ VERIFIED | `liability account linkage` block (344+), 5 tests incl. real BAD_REQUEST rejection assertions    |
| `tests/trpc/asset.test.ts`                                        | transferStatus assertions                                         | ✓ VERIFIED | Lines 253-279 — PENDING on 6 transferable kinds, null on insurance                               |

### Key Link Verification

| From                                          | To                                              | Via                                  | Status   | Details                                                                                  |
| --------------------------------------------- | ----------------------------------------------- | ------------------------------------ | -------- | ---------------------------------------------------------------------------------------- |
| `db/schema.ts`                                | `drizzle/0013_kpi_schema_completeness.sql`      | drizzle-kit generate                 | ✓ WIRED  | Migration has ADD COLUMN for all 4 columns                                               |
| `drizzle/0013_*.sql`                          | live Postgres (`information_schema.columns`)    | `bun run db:deploy`                  | ✓ WIRED  | All 4 columns confirmed live; `__drizzle_migrations` row 13 hash matches file sha256     |
| `BequestsClient.tsx`                          | `specificBequest.estimatedValue`                | `sumStrings` over bequest rows       | ✓ WIRED  | Line 165 — real aggregation, KPI consumes it                                             |
| `LiabilityDialog.tsx`                         | `liability.bankAccountId/investmentAccountId`   | Select fields in form payload        | ✓ WIRED  | Selects (535,569) → LiabilitiesClient onSubmit Number() coercion (159-163)               |
| `AccountsClient.tsx`                          | liability rows                                  | `trpc.liability.list` filtered by FK | ✓ WIRED  | Single `liability.list` query (72), client-side filter per row (380-421)                 |
| `asset.ts`                                    | AssetRow consumers                              | transferStatus on the envelope       | ✓ WIRED  | All 7 mappers set field; AssetsClient consumes `r.transferStatus`                        |

### Data-Flow Trace (Level 4)

| Artifact               | Data Variable        | Source                                          | Produces Real Data | Status     |
| ---------------------- | -------------------- | ----------------------------------------------- | ------------------ | ---------- |
| `BequestsClient` KPI   | `totalValue`         | `trpc.specificBequest.list` → `estimatedValue`  | Yes — real column  | ✓ FLOWING  |
| `PersonalPropertyClient` KPI | `insuredCount` | `trpc` items → `p.insured` boolean              | Yes — real column  | ✓ FLOWING  |
| `AssetsClient` KPI     | `transferPct`        | `asset.listAll` → `AssetRow.transferStatus`     | Yes — real column  | ✓ FLOWING  |
| `AccountsClient` row-detail | `liabilities`   | `trpc.liability.list` → FK filter               | Yes — real FK col  | ✓ FLOWING  |

All four KPIs/row-details trace upstream to real DB columns confirmed present on the live database — no hardcoded fallbacks, no static placeholders.

### Behavioral Spot-Checks

| Behavior                                              | Command                                                  | Result                              | Status  |
| ----------------------------------------------------- | -------------------------------------------------------- | ----------------------------------- | ------- |
| 4 new columns exist on live DB                        | `information_schema.columns` query via `getSql()`        | 4 rows, correct types/nullability   | ✓ PASS  |
| FK constraints exist on live DB                       | `information_schema.table_constraints` query             | 2 FK constraints present            | ✓ PASS  |
| Migration record matches file                         | `drizzle.__drizzle_migrations` row 13 hash               | Hash `7641855...` matches file sha256 | ✓ PASS |
| Liability + asset linkage tests pass                  | `bun test tests/trpc/liability.test.ts tests/trpc/asset.test.ts` | 25 pass / 0 fail            | ✓ PASS  |

### Requirements Coverage

Not applicable — this is a v4.0 gap-closure phase with `requirements: []` on all three plans. Coverage is tracked via each plan's `must_haves` (verified above, 15/15) and the v4.0-MILESTONE-AUDIT phase-23 tech_debt closure (the three placeholder KPIs + the `/accounts` getRowDetail override). All four audit items are closed.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| —    | —    | None    | —        | The three placeholder anti-patterns this phase targeted (`value: '—'`, `const insuredCount = 0`, `r.status === 'ACTIVE'` approximation, "Linked liabilities are not yet wired" notice) were all explicitly verified as REMOVED. No new stubs introduced. `liability.getLinked` is a deliberate tested forward API (documented in 26-02 SUMMARY) — correctly not flagged. |

### Human Verification Required

None. All must-haves are programmatically verifiable: the four new columns and FK constraints were confirmed against the live database via `information_schema`; the KPI computations and form fields were verified by code inspection plus the passing tRPC test suite; the migration record hash matches the file. The 26-02 SUMMARY documents manual smoke testing of the four UI surfaces as already performed.

### Gaps Summary

No gaps. All 15 must-haves across the three plans are verified:

- **Plan 26-01 (schema + migration):** All 4 columns + 2 FK constraints confirmed on the LIVE database (not a false positive — `information_schema.columns` and `table_constraints` queried directly, `__drizzle_migrations` row 13 hash matches the migration file sha256). Migration registered at journal idx 13 with correct camelCase identifiers. Relations wired.
- **Plan 26-02 (router/form/KPI wiring):** `assertLinkedAccountsInEntity` cross-entity guard and `getLinked` query are both `adminProcedure`/`entityId`-scoped; the guard is invoked by `create` and `update`. The three placeholder KPIs (`/bequests` Total value, `/artwork` Insured count, `/accounts` linked liabilities) compute from real data with all placeholders removed. Forms round-trip the new fields.
- **Plan 26-03 (transfer-status aggregator):** `transferStatus` is on `AssetRow` and all 7 mappers (null for insurancePolicy); the `/assets` KPI computes from the real field with the `status === 'ACTIVE'` approximation removed.

**Quality gates:** `bun run typecheck` exits 0; `bun run lint` (biome, 467 files) reports no findings; in-scope test files `liability.test.ts` + `asset.test.ts` pass 25/25 deterministically. The full suite shows an intermittent single `ECONNREFUSED` failure (1010 pass / 1 fail on some runs, all-clean on others) — this is the transient Neon serverless connection blip documented identically in all three plan SUMMARYs, confirmed not a code defect by repeated clean re-runs.

**Note:** `liability.getLinked` is an intentionally tested forward API not yet consumed by UI (the `/accounts` row-detail uses client-side filtering of a single `liability.list` query to avoid N+1) — documented in the 26-02 SUMMARY and explicitly not treated as a gap, per its `getLinked` doc comment in `liability.ts:116-125`.

---

_Verified: 2026-05-20_
_Verifier: Claude (gsd-verifier)_
