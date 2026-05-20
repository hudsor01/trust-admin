---
phase: 23-shadcn-registry-adoption-and-dashboard-ux-revamp
plan: 04-datatable-and-settings-polish
subsystem: ui
tags: [datatable, bulk-actions, csv-export, row-expansion, sortable, settings-refresh, preference-row, drizzle-migration, sort-index, reorder]

requires:
  - phase: 23-01-foundation
    provides: PageHeader, registries wired (@diceui), KpiStrip + SummaryCard contracts
  - phase: 23-03-liabilities-beneficiaries-kpi-rollout
    provides: TrusteesClient / BeneficiariesClient / AccountsClient current versions, @dnd-kit deps (already pulled by Kibo kanban)
provides:
  - DataTable extended with 4 additive props (bulkActions, exportable, exportResource/exportFormatters, getRowDetail)
  - DataTableBulkActions sticky toolbar + BulkAction interface
  - DataTableExport CSV button + src/lib/csv-export.ts (buildCsvBody / exportTableToCsv / makeCsvFilename / escapeCsvCell)
  - PreferenceRow composition (src/components/preference-row.tsx)
  - Dice sortable primitive installed at src/components/ui/sortable.tsx
  - beneficiary.sortIndex column + composite indexes idx_beneficiary_entity_sort / idx_trustee_entity_order
  - trpc.trustee.reorder + trpc.beneficiary.reorder entityId-scoped admin mutations
  - TrusteeSortableList + BeneficiarySortableList drag-to-reorder consumers
affects:
  - Future phases — bulkActions / exportable are opt-in; the other 16 admin DataTables can adopt incrementally

tech-stack:
  added:
    - "No new npm dependencies — @diceui/sortable reuses @dnd-kit/{core,modifiers,sortable,utilities} already pulled in by 23-03's @kibo-ui/kanban install"
  patterns:
    - "Additive DataTable props: bulkActions / exportable / getRowDetail are all optional — 17 pre-existing DataTable callers compile and render unchanged; absence of getRowDetail means zero chevron column, absence of bulkActions means zero toolbar"
    - "CSV export safety: exportTableToCsv iterates table.getFilteredRowModel().rows (NOT getCoreRowModel) and table.getVisibleLeafColumns() — hidden columns never appear in output and any client-side filter is respected (T-23-04 mitigation). buildCsvBody is split out as a pure function so tests assert the body string without a DOM download"
    - "Bulk-action confirmation: DataTableBulkActions defaults requiresConfirm to true for variant: 'destructive' and routes through the existing useConfirmDialog hook — no window.confirm anywhere (T-23-03 mitigation)"
    - "Row expansion: React.Fragment-wrapped row pairs — normal <tr> + conditional detail <tr> with <td colSpan={visibleCells.length + 1}>; expanded-row set keyed by TanStack row.id in component state"
    - "reorder mutation: Promise.all of per-id db.update().where(and(eq(id), eq(entityId))).returning() — a forged cross-entity id matches no row, the flat-length mismatch then throws NOT_FOUND (T-23-05 mitigation). RLS app.is_admin() is defense-in-depth"
    - "Sortable consumer: optimistic local state set on onValueChange, reverted to the server list in onError; drag handle is 44x44 (h-11 w-11) for mobile touch targets per UI-SPEC §12"
    - "Migration camelCase: the new column is declared as t.integer('sortIndex') so drizzle-kit emitted '\"sortIndex\"' / '\"entityId\"' correctly with no hand-edit needed for casing — only the ROW_NUMBER backfill was hand-added; file renamed 0012_young_proudstar.sql -> 0012_add_sort_index.sql with the journal tag updated to match"

key-files:
  created:
    - "src/lib/csv-export.ts — CSV export library (RFC-4180 escaping, filter + visibility aware)"
    - "src/components/ui/data-table-bulk-actions.tsx — sticky bulk-action toolbar + BulkAction interface"
    - "src/components/ui/data-table-export.tsx — Export CSV button"
    - "src/components/ui/sortable.tsx — Dice UI sortable primitive (installed; biome-normalized to project style)"
    - "src/components/preference-row.tsx — settings PreferenceRow composition"
    - "src/app/(admin)/settings/_components/SettingsTrustInfoCard.tsx"
    - "src/app/(admin)/settings/_components/SettingsNotificationsCard.tsx"
    - "src/app/(admin)/settings/_components/SettingsRolesAccessCard.tsx"
    - "src/app/(admin)/settings/_components/SettingsInventoryAccessCard.tsx"
    - "src/app/(admin)/trustees/_components/TrusteeSortableList.tsx"
    - "src/app/(admin)/beneficiaries/_components/BeneficiarySortableList.tsx"
    - "drizzle/0012_add_sort_index.sql — migration (sortIndex column + 2 composite indexes + backfill)"
    - "drizzle/meta/0012_snapshot.json"
    - "tests/components/data-table-extensions.test.tsx (11 tests)"
    - "tests/lib/csv-export.test.ts (15 tests)"
    - "tests/components/preference-row.test.tsx (6 tests)"
    - "tests/trpc/trustee.test.ts (4 reorder tests)"
    - "tests/trpc/beneficiary-reorder.test.ts (4 reorder tests)"
    - "tests/e2e/trustees-sortable.e2e.ts"
  modified:
    - "src/components/ui/data-table.tsx — +4 additive props, chevron column, bulk-action toolbar, export button slot"
    - "src/app/(admin)/accounts/_components/BankAccountTable.tsx — getRowDetail + exportable props"
    - "src/app/(admin)/accounts/_components/AccountsClient.tsx — first getRowDetail consumer"
    - "src/app/(admin)/settings/_components/SettingsClient.tsx — PageHeader + 4 new Card groups (Appearance + People Configuration preserved)"
    - "src/server/trpc/routers/trustee.ts — reorder mutation (writes existing order column)"
    - "src/server/trpc/routers/beneficiary.ts — reorder mutation (writes new sortIndex column)"
    - "src/app/(admin)/trustees/_components/TrusteesClient.tsx — Order of Service sortable card"
    - "src/app/(admin)/beneficiaries/_components/BeneficiariesClient.tsx — Display Order sortable card"
    - "db/schema.ts — beneficiary.sortIndex + idx_beneficiary_entity_sort + idx_trustee_entity_order"
    - "drizzle/meta/_journal.json — idx 12 tag renamed to 0012_add_sort_index"
    - "src/app/(admin)/beneficiaries/_components/BeneficiaryShareDonuts.tsx — removed 2 stale biome-ignore comments"
    - "src/components/kibo-ui/gantt/index.tsx — removed 2 stale biome-ignore comments"

decisions:
  - "DataTable bulk/expansion/export props are all additive — only /accounts opts into getRowDetail + exportable in this plan; the other 16 admin DataTables adopt incrementally in future phases"
  - "getRowDetail wired through BankAccountTable (where the <DataTable> actually renders) — AccountsClient passes the render-prop down; AccountsClient itself has no direct DataTable"
  - "Linked-liabilities row detail deferred: the liability schema links to homestead/rentalProperty/vehicle only — there is NO liability.bankAccountId / liability.investmentAccountId column, so /accounts row detail shows account metadata (routing #, DOD date, notes) with a TODO note instead of linked liabilities"
  - "Settings keeps the existing Appearance + People Configuration cards alongside the 4 new cards (Trust info, Notifications, Roles & access, Inventory access) — no data loss, the page is now 6 cards"
  - "Notifications card switches are disabled placeholders — the notification delivery system is future work; no preference is persisted"
  - "Roles & access card is read-only informational — user CRUD stays on the dedicated /users page"
  - "Migration filename renamed from drizzle-kit's 0012_young_proudstar.sql to 0012_add_sort_index.sql; journal tag updated in lockstep so drizzle-kit migrate resolves the file by tag"
  - "Test branch schema synced manually: db:deploy applied 0012 to the production DB; the same DDL (ADD COLUMN + backfill + 2 indexes) was applied to the Neon test branch via a postgres.js transaction so the tRPC reorder tests pass against .env.test.local"

metrics:
  duration: 26m
  tasks_completed: 3
  files_created: 18
  files_modified: 12
  tests_added: 40
  completed: 2026-05-20
---

# Phase 23 Plan 04: DataTable & Settings Polish Summary

DataTable gained three additive prop extensions (bulk-action toolbar, CSV export, opt-in row expansion), `/settings` was refreshed into six Card groups powered by a new `PreferenceRow` composition, the Dice UI sortable primitive was installed and applied to trustees + beneficiaries with persistent ordering, and migration 0012 shipped the `beneficiary.sortIndex` column plus composite indexes — all three Wave-3 threat mitigations evidenced.

## What shipped

### PR-C — DataTable enhancements (Task 04.1)

- **`bulkActions` prop** → `DataTableBulkActions` renders a sticky toolbar (`top-0 z-10`, `h-12`, `bg-primary/5`, `border-primary/20`) visible only when `getSelectedRowModel().rows.length > 0`. Destructive actions default `requiresConfirm` to `true` and route through `useConfirmDialog` — **no `window.confirm`** anywhere (T-23-03).
- **`exportable` / `exportResource` props** → `DataTableExport` button. `src/lib/csv-export.ts` iterates `getFilteredRowModel().rows` + `getVisibleLeafColumns()` so hidden columns and filtered-out rows never reach the file (T-23-04). RFC-4180 escaping for commas / quotes / newlines. Filename = `{resource}-{YYYY-MM-DD}.csv`.
- **`getRowDetail` prop** → opt-in row expansion. Each row gets a leading chevron column (`w-10`, rotates 90° when open); the expanded region is a full-width `<td colSpan={visibleCells.length + 1}>` with `bg-muted/30 p-4 border-b border-border`. Absent prop = zero chevron column, so the 17 existing callers are untouched.
- `/accounts` (`BankAccountTable`) is the first `getRowDetail` consumer + `exportable`.

### PR-D — Settings refresh + sortable (Tasks 04.2 + 04.3)

- **`PreferenceRow`** — 2-column grid (`1fr_auto` on md+, single column on mobile), `text-xl font-semibold` title, optional description, right-aligned control slot.
- **`/settings`** now renders `PageHeader` + 6 cards: the 4 new ones (Trust info, Notifications, Roles & access, Inventory access) plus the preserved Appearance + People Configuration cards (no data loss). Switches use the existing shadcn `Switch` — **not** Origin UI.
- **Dice sortable** installed at `src/components/ui/sortable.tsx` (zero color literals; reuses `@dnd-kit/*` already present from 23-03).
- **Migration 0012** — `beneficiary.sortIndex` (`INTEGER NOT NULL DEFAULT 0`), backfilled via `ROW_NUMBER() OVER (PARTITION BY entityId ORDER BY id)`, plus composite indexes `idx_beneficiary_entity_sort (entityId, sortIndex)` and `idx_trustee_entity_order (entityId, order)`. All column references camelCase.
- **reorder mutations** — `trpc.trustee.reorder` (writes the existing `order` column) and `trpc.beneficiary.reorder` (writes the new `sortIndex` column). Both `adminProcedure`, both `entityId`-scoped via `and(eq(id), eq(entityId))` so a cross-entity id throws `NOT_FOUND` (T-23-05).
- **`TrusteeSortableList` / `BeneficiarySortableList`** — drag handle 44×44 (mobile touch), optimistic local state with revert-on-error. Wired into `TrusteesClient` ("Order of Service" card) and `BeneficiariesClient` ("Display Order" card), each rendered only when >1 item exists.

## [BLOCKING] Migration 0012 application status

`bun run db:deploy` ran successfully against the production DB. Both runtime gates passed:

- `information_schema.columns` query → `sortIndex verified`
- `pg_indexes` query → `trustee composite index verified`
- Additionally confirmed: `idx_beneficiary_entity_sort` exists; backfill sample shows `sortIndex` 0,1,2 for entity 1.

**drizzle-kit hash recovery:** none needed — `db:deploy` applied cleanly on the first run (only benign `NOTICE` messages about the pre-existing `drizzle` schema). The migration file was renamed from drizzle-kit's generated `0012_young_proudstar.sql` to `0012_add_sort_index.sql` and the journal tag (`idx: 12`) was updated to match before `db:deploy` so `drizzle-kit migrate` resolved the file by tag.

**Test branch sync:** the tRPC reorder tests run against the Neon test branch (`.env.test.local` overrides `DATABASE_URL`). `db:deploy` only touches `.env` (production), so the same DDL — `ADD COLUMN IF NOT EXISTS sortIndex` + `ROW_NUMBER` backfill + both `CREATE INDEX IF NOT EXISTS` — was applied to the test branch inside a single postgres.js transaction. After the sync, all 8 reorder tests pass.

## reorder mutation behavior verification

- Unit tests (8 passing): success path updates all rows; `NOT_FOUND` on a missing id; `NOT_FOUND` on a real id passed with a different `entityId` (cross-entity); non-admin context rejected.
- Manual reload check on `/trustees` and `/beneficiaries` is covered by `tests/e2e/trustees-sortable.e2e.ts` (drag → "Reordered." toast → reload → order persisted). The E2E is defensive — it skips the drag assertion if fewer than 2 current trustees exist (the sortable card only renders for >1), since headless DnD is unreliable; the unit-level reorder tests are the primary guarantee.

## CSV export limitations

- No streaming — the whole filtered set is built in memory as one string (fine for the trust's row counts; not designed for 100k-row exports).
- No `.xlsx` — plain CSV only; no Excel-specific formatting, formulas, or multi-sheet output.
- Header row uses the column's string `header` if present, else the column `id` — columns with a JSX header render fall back to the id.
- Money/date cells export the raw accessor value by default; callers wanting `$1,234.56` / formatted dates pass `exportFormatters` keyed by column id.

## PreferenceRow integration map

| Settings card | PreferenceRows | Data source |
|---------------|----------------|-------------|
| Trust info | Trust name, EIN, Governing law | `entity` row via `trpc.entity.update` (onBlur) |
| Notifications | HEMS request alerts, Distribution reminders | disabled placeholders (delivery system is future work) |
| Roles & access | Admin, Trustee, Arbiter, Beneficiary | static privilege matrix (read-only) |
| Inventory access | Inventory access code, Password reset webhook | env-managed — surfaces guidance, no secrets |

## Bundle delta

No new npm dependencies — `package.json` / `bun.lock` are unchanged. `@diceui/sortable` reuses the `@dnd-kit/{core,modifiers,sortable,utilities}` packages already pulled in by plan 23-03's `@kibo-ui/kanban` install. Source-code growth is ~16 KB (`sortable.tsx`) plus the small new components — well within the cumulative **< +120 KB gz** cap. `bun run build` compiled successfully with **no `[Compiler bailout]`** lines naming any PR-C/PR-D file, so no `'use no memo'` directives were needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Test branch missing the sortIndex column**
- **Found during:** Task 04.3 (running the tRPC reorder tests)
- **Issue:** `bun run db:deploy` applied migration 0012 to the production DB, but the test suite connects to the Neon test branch via `.env.test.local`. The first reorder test failed with `column "sortIndex" of relation "beneficiary" does not exist` (Postgres 42703).
- **Fix:** Applied the migration DDL (`ADD COLUMN IF NOT EXISTS sortIndex` + `ROW_NUMBER` backfill + both `CREATE INDEX IF NOT EXISTS`) to the test branch inside a single postgres.js transaction loaded with `--env-file=.env.test.local`. This is the documented MEMORY.md procedure: "Test branch schema must stay in sync with production (apply DDL migrations manually if needed)."
- **Files modified:** none (DB-only change on the test branch)
- **Commit:** 5894e57

**2. [Rule 2 - Missing critical functionality] AccountsClient has no direct DataTable**
- **Found during:** Task 04.1
- **Issue:** The plan said "AccountsClient passes `getRowDetail` to its DataTable invocation", but `AccountsClient` delegates to `BankAccountTable` / `InvestmentAccountTable`, which is where `<DataTable>` actually renders.
- **Fix:** Added the optional `getRowDetail` prop to `BankAccountTable` and had `AccountsClient` pass the render-prop down. `exportable` was wired the same way.
- **Files modified:** `BankAccountTable.tsx`, `AccountsClient.tsx`
- **Commit:** 81009c8

**3. [Rule 1 - Bug] Linked-liabilities row detail has no schema backing**
- **Found during:** Task 04.1
- **Issue:** The plan's example `getRowDetail` filtered `liabilities` by `l.bankAccountId === account.id`, but the `liability` schema has no `bankAccountId` / `investmentAccountId` column — it links only to homestead / rentalProperty / vehicle. Rendering that filter would always show an empty list.
- **Fix:** `/accounts` row detail shows account metadata (routing number, DOD date, notes) with an explicit note that linked liabilities are not yet wired. The plan's own footnote anticipated this fallback.
- **Files modified:** `AccountsClient.tsx`
- **Commit:** 81009c8

**4. [Rule 1 - Lint hygiene] Four stale biome-ignore comments from plan 23-03**
- **Found during:** Task 04.1 (lint hook)
- **Issue:** `bun run lint` reported 4 warnings — unused `biome-ignore` suppression comments in `BeneficiaryShareDonuts.tsx` (×2) and `kibo-ui/gantt/index.tsx` (×2) that landed in commit 53e9cc4 (plan 23-03). Per MEMORY.md "Lint warnings are never pre-existing — trust-admin ships from a clean main."
- **Fix:** Removed the 4 dead suppression comments. Lint is now fully clean (0 warnings).
- **Files modified:** `BeneficiaryShareDonuts.tsx`, `kibo-ui/gantt/index.tsx`
- **Commit:** 81009c8

## Threat mitigations evidenced

| Threat | Mitigation | Evidence |
|--------|-----------|----------|
| T-23-03 (bulk destructive op without confirmation) | `DataTableBulkActions` defaults `requiresConfirm` to `true` for `variant: 'destructive'`, routes through `useConfirmDialog`; zero `window.confirm` | `! grep window.confirm` on data-table-bulk-actions.tsx passes; `useConfirmDialog` imported |
| T-23-04 (CSV export of hidden/redacted data) | `buildCsvBody` uses `getVisibleLeafColumns()` + `getFilteredRowModel()` | csv-export.test.ts: "excludes hidden columns" and "respects column filters" pass |
| T-23-05 (reorder entityId bypass) | Both reorder mutations are `adminProcedure`, `entityId`-scoped via `and(eq(id), eq(entityId))`, throw `NOT_FOUND` on count mismatch | trustee/beneficiary reorder tests: cross-entity id throws `NOT_FOUND` |

## TODOs for future phases

- **Roll `bulkActions` / `exportable` onto the other 16 admin DataTables** — opt-in; deferred. Only `/accounts` ships `getRowDetail` + `exportable` in PR-C.
- **Wire linked-liabilities into `/accounts` row detail** — requires a schema change (a `liability.bankAccountId` / `liability.investmentAccountId` column or a join table). Architectural, deferred.
- **Notification delivery system** — the Notifications card switches are disabled placeholders until the backend lands.
- **Roll `getRowDetail` onto `InvestmentAccountTable`** — currently only `BankAccountTable` opts in.

## Self-Check: PASSED
