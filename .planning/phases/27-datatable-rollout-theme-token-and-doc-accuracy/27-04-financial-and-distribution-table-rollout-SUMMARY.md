---
phase: 27-datatable-rollout-theme-token-and-doc-accuracy
plan: 04
subsystem: ui
tags: [datatable, csv-export, bulk-delete, row-selection, react, tanstack-table]

# Dependency graph
requires:
  - phase: 27-datatable-rollout-theme-token-and-doc-accuracy
    provides: selectColumn() checkbox-column factory + csv-export select-column exclusion (plan 27-01); --milestone token (plan 27-02)
  - phase: 23-shadcn-registry-adoption-and-dashboard-ux-revamp
    provides: DataTable bulkActions/exportable props + DataTableBulkActions toolbar + csv-export lib
provides:
  - exportable CSV on Liabilities, Accounting, HEMS-queue table, HEMS recent, distributions history, two withdrawal tables, Users
  - row-selection bulk delete on Liabilities and Accounting tables
  - completes the phase-23 DataTable-enhancement rollout across all remaining admin tables
affects: [datatable-rollout, bulk-actions]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Financial list table = selectColumn() as columns[0] + enableRowSelection + single destructive bulkActions entry + exportable/exportResource; parent client owns the sequential onBulkDelete loop"
    - "Read-only / workflow-driven table = exportable + exportResource only — no selectColumn/bulkActions/getRowDetail"

key-files:
  created: []
  modified:
    - src/app/(admin)/liabilities/_components/LiabilityTable.tsx
    - src/app/(admin)/liabilities/_components/LiabilitiesClient.tsx
    - src/app/(admin)/accounting/_components/AccountingTable.tsx
    - src/app/(admin)/accounting/_components/AccountingClient.tsx
    - src/app/(admin)/hems-queue/_components/HemsQueueClient.tsx
    - src/app/(admin)/hems/_components/HemsTable.tsx
    - src/app/(admin)/hems/_components/HistoryTable.tsx
    - src/app/(admin)/hems/_components/WithdrawalsTable.tsx
    - src/app/(admin)/dashboard/_components/WithdrawalsPanel.tsx
    - src/app/(admin)/users/_components/UsersTable.tsx
    - tests/components/liabilities/LiabilityTable.test.tsx
    - tests/components/accounting/AccountingTable.test.tsx

key-decisions:
  - "Bulk delete is a sequential for...of await loop (NOT Promise.all) — a mid-batch failure leaves a known committed set and an exact failure count"
  - "Partial failure surfaces a user-visible toast.error naming the failed count; success keeps a toast.success"
  - "HEMS-queue table tab, HEMS/distribution/withdrawal tables, and Users get exportable only — bulk delete is not a meaningful operation on kanban-driven, read-only, or Neon-Auth-managed resources"
  - "No getRowDetail anywhere in this plan — none of these tables has useful collapsed content beyond its columns"
  - "AccountingTable already imported Trash2 (per-row delete button); LiabilityTable already imported Trash2 — no new icon imports needed for the destructive bulkActions entry"

patterns-established:
  - "Completing the rollout: financial flat-list tables get full bulk delete; read-only and Neon-Auth-managed tables get export-only — destructive bulk ops are scoped to where a delete mutation genuinely exists and is meaningful"

requirements-completed: []

# Metrics
duration: 14min
completed: 2026-05-20
---

# Phase 27 Plan 04: Financial and Distribution Table Rollout Summary

**CSV export now lands on every remaining admin DataTable — Liabilities, Accounting, the HEMS-queue table tab, HEMS recent distributions, the all-distributions history, both withdrawal tables, and Users — and row-selection bulk delete lands on the two financial list tables (Liabilities, Accounting) with a sequential entityId-scoped loop gated by ConfirmDialog and a user-visible partial-failure toast. This completes the phase-23 DataTable-enhancement rollout across all admin tables.**

## Performance

- **Duration:** ~14 min
- **Completed:** 2026-05-20
- **Tasks:** 3
- **Files modified:** 12 (10 source, 2 test)

## Accomplishments

- **Liabilities + Accounting (Task 1):** `LiabilityTable.tsx` and `AccountingTable.tsx` each prepend `selectColumn<T>()`, pass `enableRowSelection`, a single `{ variant: 'destructive' }` `bulkActions` entry, and `exportable` / `exportResource` (`"liabilities"` / `"accounting"`). `LiabilitiesClient.tsx` and `AccountingClient.tsx` each gained an `onBulkDelete` handler — a sequential `for...of` await loop over the existing entityId-scoped `*.delete` mutation with `{ id, entityId }` per row, tracking a `failed` counter and surfacing `toast.error("Failed to delete N of M …")` on partial failure / `toast.success` otherwise. Both clients already imported `toast` (sonner) and `log` (logger). `AccountingTable`'s `enablePagination={false}` and custom Previous/Next block were left untouched.
- **HEMS-queue + four read-only tables (Task 2):** `HemsQueueClient.tsx` table-tab DataTable (`exportResource="hems-queue"`), `HemsTable.tsx` (`"hems-distributions"`), `HistoryTable.tsx` (`"distributions"`), `WithdrawalsTable.tsx` (`"withdrawals"`), and `WithdrawalsPanel.tsx` (`"withdrawal-eligibility"`) each gained `exportable` + `exportResource` only — no `selectColumn`, no `bulkActions`, no `getRowDetail`. The `HemsQueueBoard` kanban is untouched.
- **Users (Task 3):** `UsersTable.tsx` `<DataTable>` gained `exportable` + `exportResource="users"` only — no bulk delete on a Neon-Auth-managed resource (per-user ban/role/reset dialogs handle user mutations), no `getRowDetail`.

## Task Commits

Each task was committed atomically on `feat/27-datatable-rollout`:

1. **Task 1: exportable + bulk-delete on Liabilities and Accounting** — `da230a6` (feat)
2. **Task 2: exportable on HEMS-queue, distribution and withdrawal tables** — `300b701` (feat)
3. **Task 3: exportable on the Users table** — `f954396` (feat)

## Files Created/Modified

- `src/app/(admin)/liabilities/_components/LiabilityTable.tsx` — **modified** — selectColumn, enableRowSelection, destructive bulkActions, exportable/exportResource
- `src/app/(admin)/liabilities/_components/LiabilitiesClient.tsx` — **modified** — `onBulkDelete` sequential loop; passed to LiabilityTable
- `src/app/(admin)/accounting/_components/AccountingTable.tsx` — **modified** — same table-side wiring as LiabilityTable; `exportResource="accounting"`, pagination block untouched
- `src/app/(admin)/accounting/_components/AccountingClient.tsx` — **modified** — `onBulkDelete` sequential loop; passed to AccountingTable
- `src/app/(admin)/hems-queue/_components/HemsQueueClient.tsx` — **modified** — `exportable` + `exportResource="hems-queue"` on the table-tab DataTable
- `src/app/(admin)/hems/_components/HemsTable.tsx` — **modified** — `exportable` + `exportResource="hems-distributions"`
- `src/app/(admin)/hems/_components/HistoryTable.tsx` — **modified** — `exportable` + `exportResource="distributions"` on the `<DataTable>` only; 27-02's Badge `className` (bg-milestone) untouched
- `src/app/(admin)/hems/_components/WithdrawalsTable.tsx` — **modified** — `exportable` + `exportResource="withdrawals"`
- `src/app/(admin)/dashboard/_components/WithdrawalsPanel.tsx` — **modified** — `exportable` + `exportResource="withdrawal-eligibility"`
- `src/app/(admin)/users/_components/UsersTable.tsx` — **modified** — `exportable` + `exportResource="users"` only
- `tests/components/liabilities/LiabilityTable.test.tsx` — **modified** — added the new required `onBulkDelete` mock prop to `defaultProps`
- `tests/components/accounting/AccountingTable.test.tsx` — **modified** — added the new required `onBulkDelete` mock prop to `defaultProps`

## Decisions Made

- The bulk-delete loop is a sequential `for...of` await loop, not `Promise.all` — pinned by the plan. A mid-batch failure leaves a known committed set and the `failed` counter is exact.
- Partial failure surfaces a user-visible `toast.error` naming the failed count; the success path keeps a `toast.success`. `log.error` alone (which the per-row delete uses) was deemed insufficient for a bulk op.
- The HEMS-queue table tab, the four read-only distribution/withdrawal tables, and Users get `exportable` only — bulk delete is not meaningful on kanban-driven review surfaces, computed read-only schedules, or Neon-Auth-managed accounts.
- `LiabilityTable` and `AccountingTable` both already imported `Trash2` for their per-row delete buttons — no new icon import was needed for the destructive `bulkActions` entry.
- The summary filename uses the orchestrator-expected `27-04-financial-and-distribution-table-rollout-SUMMARY.md` (the plan's `<output>` named the shorter `27-04-SUMMARY.md`; the orchestrator success criteria pin the longer form).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `LiabilityTable.test.tsx` / `AccountingTable.test.tsx` missing the new required `onBulkDelete` prop**
- **Found during:** Task 1 (typecheck after the table-side edits)
- **Issue:** Both test files spread a `defaultProps` object into `<LiabilityTable>` / `<AccountingTable>`. Adding `onBulkDelete` as a required prop made `defaultProps` no longer assignable — `bun run typecheck` would fail.
- **Fix:** Added an `onBulkDelete: mock(() => Promise.resolve())` (Liability) / `mock(async () => {})` (Accounting) entry to each `defaultProps`. The existing action-button-count tests use `>=` thresholds, so prepending `selectColumn` (which adds a checkbox button per row) does not break them — no test-logic change was needed.
- **Files modified:** `tests/components/liabilities/LiabilityTable.test.tsx`, `tests/components/accounting/AccountingTable.test.tsx`
- **Commit:** `da230a6`

**2. [Rule 1 - Bug] Biome formatter rejected the multi-line `toast.error` call in `AccountingClient.tsx`**
- **Found during:** Task 1 (`bun run lint`)
- **Issue:** The `toast.error(\n  \`Failed to delete ${failed} of ${rows.length} entries\`,\n)` block was written multi-line; biome's formatter wanted it collapsed to one line (the template literal is short enough to fit).
- **Fix:** Collapsed the `toast.error` call to a single line. (The Liabilities `toast.error` has a longer message and biome accepted its multi-line form — no change needed there.)
- **Files modified:** `src/app/(admin)/accounting/_components/AccountingClient.tsx`
- **Commit:** `da230a6`

## Threat Model Compliance

- **T-27-01 (EoP/Tampering — bulk delete on Liabilities + Accounting):** mitigated. Bulk delete loops the existing `adminProcedure` `delete` mutation (`trpc.liability.delete`, `trpc.trustAccounting.delete`) with `WHERE id AND entityId` — `NOT_FOUND` on a cross-entity id. The bulk path adds no new mutation and cannot drop rows outside the caller's entity. Every `onBulkDelete` call carries `entityId`. The destructive `bulkActions` entry uses `variant: 'destructive'` with no `requiresConfirm: false`, so `DataTableBulkActions` defaults `requiresConfirm=true` → every bulk delete is gated by `ConfirmDialog`. No `window.confirm`. The loop is sequential, so a mid-batch failure leaves a known committed set, reported via `toast.error`.
- **T-27-02 (Info disclosure — CSV export):** mitigated. The CSV exporter scopes to `getVisibleLeafColumns()` + `getFilteredRowModel()` (verified in `csv-export.ts`). The `selectColumn()` `id:'select'` column is excluded from CSV by the explicit `c.id !== 'select'` filter added in 27-01. No table in this plan defines `initialColumnVisibility` exposing a sensitive column. The Accounting export exposes the entity's own ledger to the entity's own admins (rows arrive pre-scoped by the entityId-filtered `list` query — no cross-entity leak). The Users export contains only name/email/role — no money, no trust data.

## Issues Encountered

- The pre-commit hook full-suite run on the Task 3 commit first exited 1 with a single `error: ECONNREFUSED` line — the known transient Neon test-branch DB connectivity flake documented for plans 27-01 and 27-03. A standalone `bun test` confirmed **1016 pass / 0 fail across 74 files**, and re-running the commit produced a clean hook run (1016 pass / 0 fail). This plan's 10 changed source files are UI-only (`exportable`/`bulkActions` props on table components) and touch no tRPC router or DB surface. Logged behavior is consistent with the prior plans' infra flake; no action taken.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Combined with plans 27-01..27-03, all remaining admin DataTables have received the phase-23 enhancement rollout: CSV export everywhere, multi-row delete on every flat-list table that genuinely supports it (assets in 27-03; Liabilities + Accounting here).
- This is the final plan of phase 27 — the DataTable rollout, `--milestone` theme token, and doc-accuracy work are all complete.

## Self-Check: PASSED

- All 10 modified source files + 2 test files exist on disk.
- All 3 task commits found in git history (`da230a6`, `300b701`, `f954396`).
- Acceptance grep checks pass: `selectColumn` + `exportResource` + `onBulkDelete` (sequential `for...of`) on Liabilities/Accounting; `exportable`/`exportResource` and no `bulkActions`/`getRowDetail` on the five Task-2 tables and Users; `bg-milestone` still present in `HistoryTable.tsx` (27-02's Badge intact).
- `bun run typecheck` exits 0; `bun run lint` reports 0 findings; full unit suite 1016 pass / 0 fail.

---
*Phase: 27-datatable-rollout-theme-token-and-doc-accuracy*
*Completed: 2026-05-20*
