---
phase: 27-datatable-rollout-theme-token-and-doc-accuracy
plan: 01
subsystem: ui
tags: [tanstack-table, datatable, row-selection, csv-export, react, bun-test]

# Dependency graph
requires:
  - phase: 23-shadcn-registry-adoption-and-dashboard-ux-revamp
    provides: DataTable bulkActions prop + sticky DataTableBulkActions toolbar + csv-export lib
provides:
  - selectColumn() helper — reusable checkbox-column factory for DataTable bulk-action consumers
  - csv-export.ts select-column exclusion (c.id !== 'select') so the UI-only column never lands in a CSV
  - corrected REQUIREMENTS.md SEC-08 entry (INT-G1 closed)
  - refreshed 23-VERIFICATION.md frontmatter (stale WR follow-ups marked resolved)
affects: [27-02, 27-03, 27-04, datatable-rollout, bulk-actions]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "selectColumn() factory — spread as first column entry + pass enableRowSelection to give a DataTable selection UI"
    - "CSV exporter filters UI-only utility columns by id before building the column set"

key-files:
  created:
    - src/components/ui/data-table-select-column.tsx
    - tests/components/data-table-select-column.test.tsx
  modified:
    - src/lib/csv-export.ts
    - tests/lib/csv-export.test.ts
    - .planning/REQUIREMENTS.md
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-VERIFICATION.md

key-decisions:
  - "selectColumn cell stops click propagation so a select click never also fires onRowClick on row-clickable tables"
  - "csv-export filters c.id !== 'select' — enableHiding:false only hides from the visibility menu, getVisibleLeafColumns still returns the column"

patterns-established:
  - "selectColumn(): consumers spread selectColumn() as columns[0] and pass enableRowSelection — purely additive, data-table.tsx untouched"
  - "CSV exporter drops UI-only utility columns by id (select) before mapping headers/cells"

requirements-completed: []

# Metrics
duration: 22min
completed: 2026-05-20
---

# Phase 27 Plan 01: DataTable Foundation and Docs Summary

**A reusable `selectColumn()` checkbox-column factory unblocks the bulk-action rollout, the CSV exporter now drops the UI-only select column, and two v4.0-audit doc-drift gaps (SEC-08 / stale 23-VERIFICATION follow-ups) are closed.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-05-20T (plan execution start)
- **Completed:** 2026-05-20
- **Tasks:** 3
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments

- Built `selectColumn<TData>()` — the missing selection-UI primitive for the phase-23 `bulkActions` toolbar. It returns a `ColumnDef` (`id: 'select'`, `size: 40`, no sorting/hiding/resizing) with a header "select all" Checkbox and a per-row Checkbox, both bound to TanStack's row-selection API. The per-row cell stops click propagation so a select click never also fires `onRowClick`.
- Fixed `csv-export.ts` `buildCsvBody` to filter `c.id !== 'select'` — the real mechanism that keeps the checkbox column out of every CSV (`enableHiding: false` only hides it from the visibility *menu*; `getVisibleLeafColumns()` still returns it). Updated the file's top-of-file doc comment to record the export column set as `getVisibleLeafColumns()` minus the `select` utility column (T-27-04).
- Corrected REQUIREMENTS.md SEC-08 — the entry claimed `/api/inventory` was removed from proxy `publicPaths`; that removal was deliberately reverted (commit 0a62754) so the public `/forms` inventory submission keeps working, and route-level auth (SEC-09) carries the requirement. INT-G1 closed.
- Refreshed stale 23-VERIFICATION.md frontmatter — the 6 WR code-review warnings were resolved in PR #91 (commit d646876) but the report still presented them as open follow-ups. Added a `review_followups` frontmatter block, rewrote the closing paragraph, and flipped 5 WR rows in the Anti-Patterns table to "✅ Resolved".

## Task Commits

Each task was committed atomically on `feat/27-datatable-rollout`:

1. **Task 1: selectColumn helper + CSV-export exclusion** - `9df8c94` (feat) — TDD: RED verified inline (module-missing + un-filtered `select` header), then GREEN committed with test + implementation together
2. **Task 2: Correct REQUIREMENTS.md SEC-08 (INT-G1)** - `4b16c88` (docs)
3. **Task 3: Refresh stale 23-VERIFICATION.md frontmatter** - `767dc04` (docs)

_Note: Task 1 is TDD-flagged. RED was verified inline (2 failing tests — `Cannot find module` + `select` header present) before the helper/filter were written; GREEN landed test + implementation in one commit per the project's per-task atomic-commit convention._

## Files Created/Modified

- `src/components/ui/data-table-select-column.tsx` - **created** — `selectColumn<TData>()` factory returning the selection-checkbox `ColumnDef`
- `tests/components/data-table-select-column.test.tsx` - **created** — 5 tests: column-def shape, header+per-row checkbox rendering, row toggle, select-all, bulk-toolbar appear/clear
- `src/lib/csv-export.ts` - **modified** — `buildCsvBody` filters `c.id !== 'select'`; doc comment updated
- `tests/lib/csv-export.test.ts` - **modified** — added the select-column-exclusion regression test in the `buildCsvBody` describe block
- `.planning/REQUIREMENTS.md` - **modified** — SEC-08 bullet corrected (traceability row unchanged)
- `.planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-VERIFICATION.md` - **modified** — `review_followups` frontmatter block + closing-paragraph + 5 Anti-Patterns rows refreshed

## Decisions Made

None beyond the plan — followed Task 1/2/3 actions as specified. The plan's `<output>` named the summary `27-01-SUMMARY.md`; the orchestrator success criteria specified `27-01-datatable-foundation-and-docs-SUMMARY.md`, so the latter (longer, orchestrator-expected) filename was used.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- During the standalone full-suite run (`bun test`, 1016 tests), exactly one tRPC integration test failed with `error: ECONNREFUSED` — a transient connectivity flake against the Neon test-branch DB, unrelated to this plan (all 3 changed source files carry no DB surface). Re-running the changed test files in isolation: 32/32 pass. The pre-commit hook's own full-suite run on the Task 1 commit was clean: **1016 pass / 0 fail**. Logged to `deferred-items.md` as an out-of-scope pre-existing infrastructure flake; no action taken.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `selectColumn()` is exported, tested, and ready for plans 27-03/27-04 to spread into admin-table column arrays for the `bulkActions` rollout.
- The CSV exporter is safe for bulk-delete tables — adopting `selectColumn()` will not pollute exports.
- INT-G1 and the phase-23 doc-hygiene tech-debt item are closed.

## Self-Check: PASSED

- All created files exist on disk (`data-table-select-column.tsx`, its test, this SUMMARY).
- All 3 task commits found in git history (`9df8c94`, `4b16c88`, `767dc04`).
- Acceptance grep checks pass: `selectColumn` export, `id: 'select'`, `stopPropagation`, `c.id !== 'select'`.

---
*Phase: 27-datatable-rollout-theme-token-and-doc-accuracy*
*Completed: 2026-05-20*
