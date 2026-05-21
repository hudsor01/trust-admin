---
phase: 27-datatable-rollout-theme-token-and-doc-accuracy
verified: 2026-05-20T00:00:00Z
status: passed
score: 18/18 must-haves verified
overrides_applied: 0
---

# Phase 27: DataTable Rollout, Theme Token, and Doc Accuracy Verification Report

**Phase Goal:** Finish the phase-23 UX rollout and correct documentation drift — extend DataTable `bulkActions`/`exportable`/`getRowDetail` to the remaining admin tables, add a dedicated `--milestone` OKLCH token + repoint its 2 consumers, amend REQUIREMENTS.md SEC-08 (INT-G1), refresh stale 23-VERIFICATION.md frontmatter.
**Verified:** 2026-05-20
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

This is a v4.0 gap-closure phase with no requirement IDs (`requirements: []`). Coverage is tracked via the `must_haves.truths` of all 4 plans. The ROADMAP defines no separate `success_criteria` array — the phase goal text is the contract. All 18 observable truths across the 4 plans were verified against the codebase.

### Observable Truths

| #  | Truth (Plan) | Status | Evidence |
| -- | ------------ | ------ | -------- |
| 1  | (27-01) Shared select-column helper any DataTable consumer can spread into its columns | ✓ VERIFIED | `data-table-select-column.tsx` exports `selectColumn<TData>()` returning a `ColumnDef` with `id:'select'`, `size:40`, header + per-row `Checkbox` |
| 2  | (27-01) Selecting via the checkbox populates TanStack `rowSelection`, read by the bulkActions toolbar | ✓ VERIFIED | Helper binds `row.getIsSelected()`/`toggleSelected()` + `table.getIsAllPageRowsSelected()`/`toggleAllPageRowsSelected()`; `data-table-bulk-actions.tsx` reads same state |
| 3  | (27-01) CSV exporter drops the select/utility column — no spurious `select` header or leading empty column | ✓ VERIFIED | `csv-export.ts:59` `.filter((c) => c.id !== 'select')`; covering test `csv-export.test.ts:192` asserts `lines[0].startsWith('select')` is false |
| 4  | (27-01) REQUIREMENTS.md SEC-08 records the intentional `/api/inventory` proxy-publicPaths revert | ✓ VERIFIED | `REQUIREMENTS.md:19` contains `deliberately reverted (commit 0a62754)` + `route-level auth carries the requirement`; old `removed from proxy publicPaths` text gone |
| 5  | (27-01) 23-VERIFICATION.md frontmatter no longer presents the 6 WR warnings as open | ✓ VERIFIED | `review_followups:` block added with `status: resolved`, `resolved_in: d646876`; `remain open as quality follow-ups` / `gsd-code-review-fix 23` strings gone |
| 6  | (27-02) `globals.css` defines `--milestone`/`--milestone-foreground` OKLCH (violet) in `:root` + `.dark` | ✓ VERIFIED | `:root` L58% hue295 (lines 67-68), `.dark` L70% hue295 (lines 130-131) |
| 7  | (27-02) `--milestone` tokens exposed as Tailwind utilities via `@theme inline` `--color-*` | ✓ VERIFIED | `globals.css:172-173` `--color-milestone`/`--color-milestone-foreground` |
| 8  | (27-02) `DashboardAlerts.tsx` upcoming-milestones alert repointed to milestone token | ✓ VERIFIED | Lines 76-78 use `border-milestone bg-milestone`/`text-milestone-foreground`; no `accent` substring remains |
| 9  | (27-02) `hems/HistoryTable.tsx` withdrawal badge repointed to milestone token | ✓ VERIFIED | Line 63 `bg-milestone text-milestone-foreground`; no `bg-accent` |
| 10 | (27-03) Vehicles/Properties/PersonalProperty/Insurance/Beneficiaries DataTables render CSV Export button | ✓ VERIFIED | All 5 tables carry `exportable` + `exportResource` |
| 11 | (27-03) Vehicles/Properties/PersonalProperty/Insurance render selection checkbox column + bulk-delete via ConfirmDialog | ✓ VERIFIED | All 4 prepend `selectColumn<T>()`, pass `enableRowSelection` + single `variant: 'destructive'` `bulkActions`; `DataTableBulkActions` auto-confirms destructive via `ConfirmDialog` |
| 12 | (27-03) Bulk-delete loops entityId-scoped delete mutation once per row via sequential await loop | ✓ VERIFIED | All 4 clients use `for (const row of rows)` + `mutateAsync({ id, entityId: entityId! })`; no `Promise.all` |
| 13 | (27-03) Mid-batch failure surfaces a toast naming the failed-row count | ✓ VERIFIED | All 4 clients: `if (failed > 0) toast.error("Failed to delete N of M …")` else `toast.success` |
| 14 | (27-03) Beneficiaries gets `exportable` only — no bulk delete, no `getRowDetail` | ✓ VERIFIED | `BeneficiaryTable.tsx` has `exportable`/`exportResource` only; no `bulkActions`/`selectColumn`/`getRowDetail` |
| 15 | (27-04) Liabilities + Accounting render CSV Export button, checkbox column, bulk-delete via ConfirmDialog | ✓ VERIFIED | Both tables: `selectColumn<T>()`, `enableRowSelection`, `variant: 'destructive'` `bulkActions`, `exportable`/`exportResource` |
| 16 | (27-04) Bulk-delete loops entityId-scoped delete mutation via sequential await loop | ✓ VERIFIED | `LiabilitiesClient`/`AccountingClient` use `for (const row of rows)` + `mutateAsync({ id, entityId: entityId! })` |
| 17 | (27-04) HEMS-queue table tab gets `exportable` only | ✓ VERIFIED | `HemsQueueClient.tsx:398` `exportable exportResource="hems-queue"`; kanban `HemsQueueBoard` untouched (no git diff) |
| 18 | (27-04) Read-only distribution/withdrawal tables + Users get `exportable` only — no bulk delete, no `getRowDetail` | ✓ VERIFIED | `HemsTable`, `HistoryTable`, `WithdrawalsTable`, `WithdrawalsPanel`, `UsersTable` all `exportable`/`exportResource` only |

**Score:** 18/18 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `src/components/ui/data-table-select-column.tsx` | `selectColumn()` factory | ✓ VERIFIED | Exists, 57 lines, exports `selectColumn`, `id:'select'`, `stopPropagation` on cell |
| `tests/components/data-table-select-column.test.tsx` | selectColumn behavior tests | ✓ VERIFIED | Exists; targeted run passed |
| `src/lib/csv-export.ts` | `c.id !== 'select'` filter | ✓ VERIFIED | Filter at line 59; doc comment updated |
| `tests/lib/csv-export.test.ts` | select-column exclusion test | ✓ VERIFIED | Test at line 192 |
| `.planning/REQUIREMENTS.md` | Corrected SEC-08 | ✓ VERIFIED | Line 19 amended; traceability row unchanged |
| `.../23-VERIFICATION.md` | Refreshed frontmatter | ✓ VERIFIED | `review_followups` block added |
| `src/app/globals.css` | `--milestone` tokens | ✓ VERIFIED | 6 occurrences (`:root`, `.dark`, `@theme`) |
| `DashboardAlerts.tsx` / `hems/HistoryTable.tsx` | Repointed consumers | ✓ VERIFIED | Both use milestone classes; accent removed |
| 6 bulk-delete tables + 4 table clients (27-03/27-04) | `selectColumn` + `bulkActions` + `exportable` | ✓ VERIFIED | Vehicles, Properties, PersonalProperty, Insurance, Liabilities, Accounting — all wired |
| 6 export-only tables | `exportable` only | ✓ VERIFIED | Beneficiaries, HemsQueue, HemsTable, HistoryTable, WithdrawalsTable, WithdrawalsPanel, UsersTable |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `selectColumn()` | `@tanstack/react-table` row selection | `getIsSelected`/`toggleSelected`/`toggleAllPageRowsSelected` | ✓ WIRED | Helper uses all three APIs |
| `selectColumn()` | `DataTableBulkActions` | shared `rowSelection` state | ✓ WIRED | Toolbar reads `getSelectedRowModel()` |
| `csv-export.ts buildCsvBody` | select/utility column | `c.id !== 'select'` filter | ✓ WIRED | Filter present + tested |
| `globals.css @theme` | `bg-milestone`/`text-milestone-foreground` | `--color-milestone` mapping | ✓ WIRED | Mapping present; consumers use the utility classes |
| Table `bulkActions onClick` | entityId-scoped `*.delete` mutations | `onBulkDelete` sequential loop | ✓ WIRED | All 6 clients loop `mutateAsync({ id, entityId })` |
| `DataTableBulkActions` destructive action | `ConfirmDialog` | `requiresConfirm` defaults true for `variant:'destructive'` | ✓ WIRED | `data-table-bulk-actions.tsx:82-83` + no `requiresConfirm: false` anywhere |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Branch typechecks | `bun run typecheck` | `tsc --noEmit` exit 0 | ✓ PASS |
| Branch lints clean | `bun run lint` | `Checked 469 files. No fixes applied.` | ✓ PASS |
| Phase-27 targeted tests | `bun test` (6 files: select-column, csv-export, Vehicle/RentalProperty/Liability/Accounting tables) | 69 pass / 0 fail | ✓ PASS |
| Full unit suite | `bun test` | 1016 pass / 0 fail across 74 files | ✓ PASS |
| 11 task commits exist | `git cat-file -t` per hash | all 11 present | ✓ PASS |

Note: the known transient Neon `ECONNREFUSED` test-branch flake did NOT recur on this verification run — the full suite was green on the first pass (1016/0).

### Requirements Coverage

Phase 27 declares `requirements: []` on all 4 plans (gap-closure phase). No requirement IDs to cross-reference. The v4.0-audit gap **INT-G1** (SEC-08 doc drift) is closed by truth #4. The phase-23 `tech_debt` items (DataTable rollout, milestone token, doc hygiene) are closed by truths #1-18. No orphaned requirements.

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
| ---- | ------- | -------- | ------ |
| — | — | — | No blockers, warnings, or stubs found |

No `TODO`/`FIXME`/`PLACEHOLDER`, no empty-implementation stubs, no `requiresConfirm: false` overrides, no `window.confirm`. All `onBulkDelete` handlers carry `entityId` and use sequential loops (not `Promise.all`). The `getRowDetail` enhancement was correctly NOT force-rolled onto tables with no useful collapsed content, per the phase brief.

### Human Verification Required

None. All truths are verifiable programmatically (file contents, grep wiring, test runs). The visual rendering of the `--milestone` violet token is a cosmetic detail already covered by the OKLCH spec (hue 295, L58%/L70%) and is consistent with the existing `--warning`/`--success` token convention — no separate human visual check is escalated.

### Gaps Summary

No gaps. All 18 must-have truths across the 4 plans are verified against the codebase. The `selectColumn` helper exists and is tested; the CSV exporter excludes the select column; the `--milestone` OKLCH token is defined in all three scopes and both consumers are repointed; 6 tables have `bulkActions` + `exportable` (entityId-scoped sequential bulk-delete via `ConfirmDialog`) and the remaining tables have `exportable` only; `getRowDetail` was not force-rolled; SEC-08 (INT-G1) is amended; the stale 23-VERIFICATION.md frontmatter is refreshed. Branch is green: typecheck 0, lint 0, 1016/1016 tests pass.

**Minor observation (non-blocking, not a code gap):** `ROADMAP.md` line 295 still shows the 27-04 plan checkbox as `[ ]` unchecked, while plans 27-01..27-03 are checked. The 27-04 implementation is fully complete and committed (commits `da230a6`, `300b701`, `f954396`). This is a cosmetic planning-doc lag — the orchestrator should tick that checkbox when bundling phase artifacts. It does not affect goal achievement.

---

_Verified: 2026-05-20_
_Verifier: Claude (gsd-verifier)_
