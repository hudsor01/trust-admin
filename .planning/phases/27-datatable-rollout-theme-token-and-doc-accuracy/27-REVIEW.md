---
phase: 27-datatable-rollout-theme-token-and-doc-accuracy
reviewed: 2026-05-20T00:00:00Z
depth: standard
files_reviewed: 28
files_reviewed_list:
  - src/components/ui/data-table-select-column.tsx
  - src/lib/csv-export.ts
  - src/app/globals.css
  - src/app/(admin)/dashboard/_components/DashboardAlerts.tsx
  - src/app/(admin)/hems/_components/HistoryTable.tsx
  - src/app/(admin)/vehicles/_components/VehicleTable.tsx
  - src/app/(admin)/vehicles/_components/VehiclesClient.tsx
  - src/app/(admin)/properties/_components/RentalPropertyTable.tsx
  - src/app/(admin)/properties/_components/PropertiesClient.tsx
  - src/app/(admin)/personal-property/_components/PersonalPropertyTable.tsx
  - src/app/(admin)/personal-property/_components/PersonalPropertyClient.tsx
  - src/app/(admin)/insurance/_components/InsuranceTable.tsx
  - src/app/(admin)/insurance/_components/InsuranceClient.tsx
  - src/app/(admin)/liabilities/_components/LiabilityTable.tsx
  - src/app/(admin)/liabilities/_components/LiabilitiesClient.tsx
  - src/app/(admin)/accounting/_components/AccountingTable.tsx
  - src/app/(admin)/accounting/_components/AccountingClient.tsx
  - src/app/(admin)/beneficiaries/_components/BeneficiaryTable.tsx
  - src/app/(admin)/hems-queue/_components/HemsQueueClient.tsx
  - src/app/(admin)/hems/_components/HemsTable.tsx
  - src/app/(admin)/hems/_components/WithdrawalsTable.tsx
  - src/app/(admin)/dashboard/_components/WithdrawalsPanel.tsx
  - src/app/(admin)/users/_components/UsersTable.tsx
  - src/components/ui/data-table.tsx
  - tests/lib/csv-export.test.ts
  - tests/components/data-table-select-column.test.tsx
  - tests/components/accounting/AccountingTable.test.tsx
  - tests/components/liabilities/LiabilityTable.test.tsx
  - tests/components/properties/RentalPropertyTable.test.tsx
  - tests/components/vehicles/VehicleTable.test.tsx
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: resolved
---

# Phase 27: Code Review Report

**Reviewed:** 2026-05-20T00:00:00Z
**Depth:** standard
**Files Reviewed:** 28 (30 listed including data-table.tsx and the 6 bulk-delete test files cross-referenced)
**Status:** issues_found

## Summary

Phase 27 closes the v4.0 DataTable rollout gap cleanly. The core mechanisms are sound:

- **Bulk-delete safety (T-27-01):** All 6 bulk-delete handlers (Vehicles, Properties, Personal Property, Insurance, Liabilities, Accounting) are correct and consistent — each uses a sequential `for...of` await loop (never `Promise.all`), calls the existing `adminProcedure` delete with `{ id, entityId }`, accumulates a `failed` count, surfaces a user-visible `toast.error` naming the failed/total count on partial failure, and a `toast.success` otherwise. Each table's underlying delete mutation has `onSuccess` query invalidation, so refetch fires per-row. `liability.delete` and `trustAccounting.delete` were verified as `adminProcedure` + `and(eq(id), eq(entityId))`-scoped, satisfying the CLAUDE.md exception list. Destructive flow goes through `bulkActions`/`DataTableBulkActions` — no `window.confirm`.
- **`selectColumn` helper:** Correctly binds to TanStack's row-selection API; the cell `Checkbox` calls `e.stopPropagation()` so a select click never triggers `onRowClick`; pure factory, React Compiler safe.
- **`csv-export.ts` fix (T-27-04):** The `c.id !== 'select'` filter is applied to the shared `visibleColumns` constant, so both the header row and the cell rows drop the column. No off-by-one. Covering test genuinely proves header + body + column-count.
- **`--milestone` token:** Declared for `:root`, `.dark`, and `@theme inline` (`--color-milestone` / `--color-milestone-foreground`) with a distinct violet hue (295). Both consumers (`DashboardAlerts`, `HistoryTable`) repointed off the borrowed `accent` token — no leftover `accent` borrow.
- **`exportable`-only tables:** Confirmed Beneficiaries, HEMS-queue, HEMS, Withdrawals (×2), and Users did NOT receive `bulkActions`/`selectColumn`. Beneficiaries keeps its address columns hidden via `initialColumnVisibility`. Users table exposes no credential columns.

No critical issues. Three warnings and four info items below — none block merge, but WR-01 is a genuine functional gap and WR-02 a stale test fixture that will fail `tsc`.

## Warnings

### WR-01: CSV export silently emits empty cells for display-only columns (no `accessorFn`)

**File:** `src/lib/csv-export.ts:70-71` (consumed by `AccountingTable.tsx:69-88,107-136,162-185`, `HemsQueueClient.tsx:196-219`, `hems/HistoryTable.tsx:51-72`)
**Issue:** `buildCsvBody` calls `row.getValue(col.id)` for every visible column. TanStack's `row.getValue` returns `undefined` (verified in `@tanstack/table-core/src/core/row.ts:119-121`) for any column that has no `accessorKey`/`accessorFn` — i.e. pure display columns. Phase 27 newly adds `exportable` to several tables whose data columns are display-only:
- `AccountingTable`: `category` (`id: 'category'`), `flags`, `reconciled`, `actions` — all `id`-only display columns. The exported Accounting CSV will have a populated `Date`/`Description`/`Amount` but blank `Category` and `Flags` columns, which is misleading for a Texas-Property-Code accounting export.
- `HemsQueueClient`: the `beneficiary` column (`id: 'beneficiary'`) — exported HEMS-queue CSV shows a blank beneficiary column, the single most useful field.
- `hems/HistoryTable`: the `Type` column renders from `isWithdrawal`/`hemsCategory` but has `accessorKey: 'distributionType'`, so it exports the raw `distributionType` enum, not the displayed label — a value mismatch rather than a blank.

No crash, no security leak — but the export is incomplete/inaccurate for these tables.
**Fix:** For each `exportable` table with display-only data columns, either (a) give the column an `accessorFn` so `getValue` resolves, or (b) pass `exportFormatters` keyed by column id to `DataTable` (the `exportFormatters` prop already exists and threads through to `buildCsvBody`). Example for Accounting:
```tsx
exportFormatters={{
    category: (_v, row) => {
        const r = row as TrustAccounting
        return r.entryType === 'INCOME'
            ? INCOME_TYPES.find((t) => t.value === r.incomeType)?.label ?? r.incomeType ?? ''
            : EXPENSE_TYPES.find((t) => t.value === r.expenseType)?.label ?? r.expenseType ?? ''
    },
    flags: (_v, row) => {
        const r = row as TrustAccounting
        return [r.isPrincipal && 'Principal', r.taxDeductible && 'Deductible'].filter(Boolean).join('; ')
    },
}}
```
Note `exportFormatters` still receives `value` from `getValue` (which is `undefined` for display columns) — formatters must read from the `row` argument, which they can.

### WR-02: Stale `selectedEntity` prop in two table test fixtures will fail `tsc`

**File:** `tests/components/liabilities/LiabilityTable.test.tsx:53` and `tests/components/properties/RentalPropertyTable.test.tsx:58,77,91,108,128,146,168,191,206,229` (every `render` call)
**Issue:** `LiabilityTable.test.tsx` `defaultProps` includes `selectedEntity: 1 as number | undefined`, and `RentalPropertyTable.test.tsx` passes `selectedEntity={1}` to every `<RentalPropertyTable>` render. Neither `LiabilityTableProps` (`LiabilityTable.tsx:33-47`) nor `RentalPropertyTableProps` (`RentalPropertyTable.tsx:25-33`) declares a `selectedEntity` prop — the prop was removed when bulk-delete moved the `entityId` binding into the client-level `onBulkDelete` closure. TypeScript treats this as an excess-property error on the JSX element, so `bun run typecheck` will fail. (The `VehicleTable.test.tsx` and `AccountingTable.test.tsx` fixtures were updated correctly — they pass only the real props including `onBulkDelete`.)
**Fix:** Delete the `selectedEntity` entries:
```tsx
// LiabilityTable.test.tsx — remove line 53 from defaultProps
onUpdateLiability: mock(() => Promise.resolve()),
// (delete) selectedEntity: 1 as number | undefined,
```
```tsx
// RentalPropertyTable.test.tsx — remove `selectedEntity={1}` from all 10 render() calls
```

### WR-03: Accounting bulk-delete can strand the user on an out-of-range page

**File:** `src/app/(admin)/accounting/_components/AccountingClient.tsx:244-262` (with `offset` state at line 48)
**Issue:** The Accounting table is server-paginated (`listPaginated` with `limit`/`offset`, `PAGE_SIZE = 50`). After `onBulkDelete` removes rows, `invalidateAccounting` refetches `listPaginated` with the *current* `offset`. If the user bulk-deletes every row on the last page (e.g. deletes the only 3 rows on page 4 of 4), `offset` still points at 150 while `totalCount` is now 147 — the refetched query returns an empty `data` array and the user sees an empty table with no indication why. The other 5 bulk-delete tables are client-paginated (`getPaginationRowModel`) so TanStack auto-corrects the page; only Accounting has this server-offset hazard.
**Fix:** After a successful bulk delete, clamp `offset` back into range. Simplest is to reset to page 1, or recompute:
```tsx
if (failed === 0) {
    toast.success(`Deleted ${rows.length} entries`)
    setOffset(0) // or: Math.max(0, Math.min(offset, ((totalPages-1) ... )))
}
```

## Info

### IN-01: CSV header falls back to raw column `id` for function-headed columns

**File:** `src/lib/csv-export.ts:62-66`
**Issue:** `buildCsvBody` keeps a header only when `columnDef.header` is a `string`; for the many columns that use `header: ({ column }) => <DataTableColumnHeader title="Amount" />`, it falls back to `c.id`. So exported headers for those columns read `amount`, `dodValue`, `firstName`, `accountingDate` — the raw accessor keys, not the human titles shown in the UI. This is pre-existing (T-23-04), not introduced by phase 27, but phase 27 widens its blast radius by making 11 more tables exportable. Worth a follow-up: have `DataTableColumnHeader` columns carry a `meta.exportHeader` string the exporter can read.

### IN-02: `selectColumn` header `checked` prop can be `false | true | 'indeterminate'`

**File:** `src/components/ui/data-table-select-column.tsx:36-39`
**Issue:** `checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}` — when nothing is selected this evaluates to `false`, when all selected `true`, when partial `'indeterminate'`. This is the canonical shadcn pattern and the Radix `Checkbox` accepts `CheckedState` (`boolean | 'indeterminate'`), so it is correct. Noting only because the `&&`-returns-string idiom is easy to misread as a bug on a future scan — a brief inline comment would help.

### IN-03: `onBulkDelete` `useCallback` deps omit `log` in two clients

**File:** `src/app/(admin)/vehicles/_components/VehiclesClient.tsx:160-183` and `src/app/(admin)/insurance/_components/InsuranceClient.tsx:148-171`
**Issue:** Both `onBulkDelete` callbacks reference the module-scope `log` (`logger.create(...)` assigned at file top level) but list only `[deleteMutation, entityId]` as deps. `PersonalPropertyClient.tsx:212-235` includes `log` in its deps because there `log` is component-scope (`LOGGERS[mode]`). For Vehicles/Insurance `log` is a stable module constant so omitting it is harmless and React Compiler will not complain — but it is inconsistent with the personal-property handler. Low priority; align for consistency or leave as-is.

### IN-04: `exportResource` strings are inconsistent in kebab vs singular form

**File:** `hems/HistoryTable.tsx:118` (`"distributions"`), `hems/HemsTable.tsx:157` (`"hems-distributions"`), `hems/WithdrawalsTable.tsx:213` (`"withdrawals"`), `dashboard/WithdrawalsPanel.tsx:123` (`"withdrawal-eligibility"`)
**Issue:** The withdrawal-related tables export under four different resource names. Not a bug — each filename is unique and valid (`makeCsvFilename` just slugs `{resource}-{date}.csv`) — but a user exporting from both the HEMS page and the Dashboard gets `withdrawals-2026-05-20.csv` and `withdrawal-eligibility-2026-05-20.csv`, which is mildly confusing. Cosmetic; align naming if desired.

---

## Resolution

_Resolved: 2026-05-20_

| Finding | Outcome |
|---------|---------|
| WR-01 | **Fixed** — added `columnDef.meta` support to `csv-export.ts` (`excludeFromExport` drops UI-only columns, `exportHeader` supplies plain-text headers for render-function headers) and wired `exportFormatters` for `AccountingTable` (`category`, `flags`, `reconciled`), `HemsQueueClient` (`beneficiary`), and `hems/HistoryTable` (`beneficiaryId` → name, `distributionType` → displayed label). The `actions` columns are now excluded from export. New `csv-export.test.ts` cases cover `excludeFromExport` and `exportHeader`. |
| WR-02 | **Fixed** — removed the stale `selectedEntity` prop from `LiabilityTable.test.tsx` `defaultProps` and all `RentalPropertyTable.test.tsx` `render()` calls. Both suites pass. |
| WR-03 | **Fixed** — `AccountingClient.onBulkDelete` now clamps `offset` back into range after a bulk delete (server-paginated table), so deleting every row on the last page no longer strands the user on an empty page. |
| IN-01 | **Fixed** (folded into WR-01) — `exportHeader` meta gives the columns now formatted (`Type`, `Beneficiary`) human CSV headers instead of the raw accessor id. |
| IN-02 | **Fixed** — added an inline comment to `selectColumn` documenting the `CheckedState` tri-state `&&`-returns-string idiom. |
| IN-03 | **No change** — Vehicles/Insurance `onBulkDelete` omit module-scope `log` from their dep arrays, which is correct: module constants do not belong in dep arrays. `PersonalPropertyClient` includes `log` only because its `log` is component-scope. Aligning would be wrong-by-convention. |
| IN-04 | **No change** — `exportResource` strings (`distributions`, `hems-distributions`, `withdrawals`, `withdrawal-eligibility`) each accurately describe distinct datasets and produce valid, non-colliding filenames. Renaming would change user-facing filenames for no functional gain. |

_Reviewed: 2026-05-20T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
