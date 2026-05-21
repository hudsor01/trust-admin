---
phase: 27-datatable-rollout-theme-token-and-doc-accuracy
plan: 03
subsystem: ui
tags: [datatable, csv-export, bulk-delete, row-selection, react, tanstack-table]

# Dependency graph
requires:
  - phase: 27-datatable-rollout-theme-token-and-doc-accuracy
    provides: selectColumn() checkbox-column factory + csv-export select-column exclusion (plan 27-01)
  - phase: 23-shadcn-registry-adoption-and-dashboard-ux-revamp
    provides: DataTable bulkActions/exportable props + DataTableBulkActions toolbar + csv-export lib
provides:
  - exportable CSV on Vehicles, Properties, Personal Property, Insurance, Beneficiaries tables
  - row-selection bulk delete on Vehicles, Properties, Personal Property, Insurance tables
  - sequential for...of bulk-delete pattern with user-visible partial-failure toast
affects: [27-04, datatable-rollout, bulk-actions]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "onBulkDelete: sequential for...of await loop over the entityId-scoped delete mutation — bounded partial failure, exact failure count, user-visible toast.error"
    - "Asset table = selectColumn() as columns[0] + enableRowSelection + single destructive bulkActions entry + exportable/exportResource"

key-files:
  created: []
  modified:
    - src/app/(admin)/vehicles/_components/VehicleTable.tsx
    - src/app/(admin)/vehicles/_components/VehiclesClient.tsx
    - src/app/(admin)/properties/_components/RentalPropertyTable.tsx
    - src/app/(admin)/properties/_components/PropertiesClient.tsx
    - src/app/(admin)/personal-property/_components/PersonalPropertyTable.tsx
    - src/app/(admin)/personal-property/_components/PersonalPropertyClient.tsx
    - src/app/(admin)/insurance/_components/InsuranceTable.tsx
    - src/app/(admin)/insurance/_components/InsuranceClient.tsx
    - src/app/(admin)/beneficiaries/_components/BeneficiaryTable.tsx
    - tests/components/vehicles/VehicleTable.test.tsx
    - tests/components/properties/RentalPropertyTable.test.tsx

key-decisions:
  - "Bulk delete is a sequential for...of await loop (NOT Promise.all) — a mid-batch failure leaves a known committed set and an exact failure count"
  - "Partial failure surfaces a user-visible toast.error naming the failed count; success keeps a toast.success — log.error alone is insufficient"
  - "VehiclesClient/PropertiesClient/InsuranceClient gained a toast (sonner) import — they previously imported only logger; PersonalPropertyClient already imported toast"
  - "Beneficiaries gets exportable only — no bulkActions/selectColumn (deletion is a deliberate single-record action) and no getRowDetail"
  - "VehicleTable onEdit test now targets the Actions cell (td:last-child) explicitly — selectColumn shifted the first column to a checkbox, breaking the tbody-first-button assumption"

patterns-established:
  - "Rolling DataTable bulk delete onto an asset list table: prepend selectColumn<T>(), pass enableRowSelection + a single { variant: 'destructive' } bulkActions entry, add exportable + exportResource; the parent client owns the onBulkDelete sequential loop"

requirements-completed: []

# Metrics
duration: 18min
completed: 2026-05-20
---

# Phase 27 Plan 03: Asset Table Rollout Summary

**CSV export now lands on all five asset-domain admin tables and row-selection bulk delete lands on Vehicles, Properties, Personal Property, and Insurance — each bulk delete runs a sequential entityId-scoped loop gated by ConfirmDialog and reports partial failure with a user-visible toast.**

## Performance

- **Duration:** ~18 min
- **Completed:** 2026-05-20
- **Tasks:** 3
- **Files modified:** 11 (9 source, 2 test)

## Accomplishments

- **Vehicles + Properties (Task 1):** `VehicleTable.tsx` and `RentalPropertyTable.tsx` each prepend `selectColumn<T>()`, pass `enableRowSelection`, a single destructive `bulkActions` entry, and `exportable` / `exportResource`. `VehiclesClient.tsx` and `PropertiesClient.tsx` each gained an `onBulkDelete` handler — a sequential `for...of` await loop over the existing `*.delete` mutation with `{ id, entityId }` per row, tracking a `failed` counter and surfacing `toast.error("Failed to delete N of M …")` on partial failure / `toast.success` otherwise.
- **Personal Property + Insurance (Task 2):** Identical pattern applied to `PersonalPropertyTable.tsx` (`exportResource="personal-property"`, also serves the Artwork page via the shared `mode` prop) and `InsuranceTable.tsx` (`exportResource="insurance"`). `PersonalPropertyClient.tsx` and `InsuranceClient.tsx` gained the same sequential `onBulkDelete` loop. `PersonalPropertyClient` already imported `toast`; `InsuranceClient` gained the import.
- **Beneficiaries (Task 3):** `BeneficiaryTable.tsx` `<DataTable>` gained `exportable` + `exportResource="beneficiaries"` only — no `bulkActions`/`selectColumn` (beneficiary deletion is a deliberate single-record action) and no `getRowDetail`. `initialColumnVisibility` (hiding `streetAddress`/`city`/`state`/`zip`) was left unchanged, so a default CSV export omits the address columns.

## Task Commits

Each task was committed atomically on `feat/27-datatable-rollout`:

1. **Task 1: exportable + bulk-delete on Vehicles and Properties** — `316e4c2` (feat)
2. **Task 2: exportable + bulk-delete on Personal Property and Insurance** — `d49fe10` (feat)
3. **Task 3: exportable on Beneficiaries** — `76b8481` (feat)

## Files Created/Modified

- `src/app/(admin)/vehicles/_components/VehicleTable.tsx` — **modified** — selectColumn, enableRowSelection, destructive bulkActions, exportable/exportResource
- `src/app/(admin)/vehicles/_components/VehiclesClient.tsx` — **modified** — `onBulkDelete` sequential loop; `toast` (sonner) import added
- `src/app/(admin)/properties/_components/RentalPropertyTable.tsx` — **modified** — same table-side wiring as VehicleTable
- `src/app/(admin)/properties/_components/PropertiesClient.tsx` — **modified** — `onBulkDeleteRental` sequential loop; `toast` import added
- `src/app/(admin)/personal-property/_components/PersonalPropertyTable.tsx` — **modified** — table-side wiring; `exportResource="personal-property"` (shared with Artwork mode)
- `src/app/(admin)/personal-property/_components/PersonalPropertyClient.tsx` — **modified** — `onBulkDelete` sequential loop (mode-aware `log`); `toast` already imported
- `src/app/(admin)/insurance/_components/InsuranceTable.tsx` — **modified** — table-side wiring; `exportResource="insurance"`
- `src/app/(admin)/insurance/_components/InsuranceClient.tsx` — **modified** — `onBulkDelete` sequential loop; `toast` import added
- `src/app/(admin)/beneficiaries/_components/BeneficiaryTable.tsx` — **modified** — `exportable` + `exportResource="beneficiaries"` only
- `tests/components/vehicles/VehicleTable.test.tsx` — **modified** — new required `onBulkDelete` prop on all renders; onEdit test targets the Actions cell
- `tests/components/properties/RentalPropertyTable.test.tsx` — **modified** — new required `onBulkDelete` prop on all renders

## Decisions Made

- The bulk-delete loop is a sequential `for...of` await loop, not `Promise.all` — pinned by the plan. A mid-batch failure leaves a known committed set and the `failed` counter is exact.
- Partial failure surfaces a user-visible `toast.error` naming the failed count; the success path keeps a `toast.success`. `log.error` alone (which the per-row delete uses) was deemed insufficient for a bulk op.
- `VehiclesClient`, `PropertiesClient`, and `InsuranceClient` previously imported only `logger` — added a `toast` import from `sonner` (the project standard, matching `AccountsClient.tsx`).
- The summary filename uses the orchestrator-expected `27-03-asset-table-rollout-SUMMARY.md` (the plan's `<output>` named the shorter `27-03-SUMMARY.md`; the orchestrator success criteria pin the longer form).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `VehicleTable.test.tsx` broke when `selectColumn` shifted the first column**
- **Found during:** Task 1 (pre-commit hook full-suite run)
- **Issue:** The `calls onEdit when edit button clicked` test clicked `tbody`'s first `<button>` expecting the edit pencil. Prepending `selectColumn()` made the first column a row-selection checkbox (`<button role="checkbox">`), so `actionButtons[0]` was the checkbox and `onEdit` was never called → test failed. The test also did not pass the new required `onBulkDelete` prop.
- **Fix:** Updated the onEdit test to target the Actions cell explicitly (`tbody tr td:last-child`) and added the `onBulkDelete` mock prop to all 8 renders. `RentalPropertyTable.test.tsx` was preemptively updated the same way (its `calls onDelete` test already used a robust `title` selector, so only the prop addition was needed).
- **Files modified:** `tests/components/vehicles/VehicleTable.test.tsx`, `tests/components/properties/RentalPropertyTable.test.tsx`
- **Commit:** `316e4c2`

## Issues Encountered

- The standalone full `bun test` run (1016 tests) showed 3 `EntityId Validation` tRPC tests failing with ~5s timeouts — transient Neon test-branch DB connectivity flakes, the same infrastructure issue documented for 27-01. Re-running `tests/trpc` in isolation: **166/166 pass**. None of this plan's 9 changed source files touch tRPC routers or DB surface (UI-only `exportable`/`bulkActions` props on table components). The pre-commit hook's own full-suite run on each of the 3 task commits was clean. Logged to `deferred-items.md` as an out-of-scope pre-existing infrastructure flake; no action taken.

## Threat Model Compliance

- **T-27-01 (EoP/Tampering — bulk delete):** mitigated. Bulk delete loops the existing `adminProcedure` `delete` mutation (`WHERE id AND entityId`, `NOT_FOUND` on cross-entity id) — no new mutation, cannot drop rows outside the caller's entity. Every `onBulkDelete` call carries `entityId`. The destructive `bulkActions` entry uses `variant: 'destructive'` with no `requiresConfirm: false`, so `DataTableBulkActions` defaults `requiresConfirm=true` → every bulk delete is gated by `ConfirmDialog`. No `window.confirm`. The loop is sequential, so a mid-batch failure leaves a known committed set, reported via `toast.error`.
- **T-27-02 (Info disclosure — CSV export):** mitigated. The CSV exporter scopes to `getVisibleLeafColumns()` + `getFilteredRowModel()` (verified in `csv-export.ts`). Beneficiaries hides `streetAddress`/`city`/`state`/`zip` via `initialColumnVisibility` (unchanged), so a default export omits them. The `selectColumn()` `id:'select'` column is excluded from CSV by the explicit `c.id !== 'select'` filter added in 27-01. No table introduced here force-exports a sensitive or hidden column.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- The asset tables are at feature parity with `/accounts`: CSV export everywhere, multi-row delete where genuinely useful.
- Plan 27-04 can apply the same pattern to Liabilities + Accounting (bulk delete + exportable) and the HEMS-queue / HEMS / distribution / withdrawal / Users tables (exportable).

## Self-Check: PASSED

- All 9 modified source files + 2 test files exist on disk.
- All 3 task commits found in git history (`316e4c2`, `d49fe10`, `76b8481`).
- Acceptance grep checks pass: `selectColumn` + `exportResource` on the four bulk-delete tables, `exportable`/`exportResource="beneficiaries"` and no `bulkActions`/`getRowDetail` on BeneficiaryTable, `onBulkDelete` + sequential `for...of` loop in each client.
- `bun run typecheck` exits 0; `bun run lint` reports 0 findings; `tests/trpc` 166/166 pass in isolation.

---
*Phase: 27-datatable-rollout-theme-token-and-doc-accuracy*
*Completed: 2026-05-20*
