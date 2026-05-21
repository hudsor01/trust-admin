---
phase: 27-datatable-rollout-theme-token-and-doc-accuracy
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/ui/data-table-select-column.tsx
  - tests/components/data-table-select-column.test.tsx
  - src/lib/csv-export.ts
  - tests/lib/csv-export.test.ts
  - .planning/REQUIREMENTS.md
  - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-VERIFICATION.md
autonomous: true
requirements: []

must_haves:
  truths:
    - "A shared select-column helper exists that any DataTable consumer can spread into its columns array to render a header + per-row selection checkbox"
    - "Selecting rows via the checkbox column populates TanStack rowSelection state, which the existing bulkActions toolbar reads"
    - "The CSV exporter explicitly drops the select/utility column so an exported CSV from a table with selectColumn() has no spurious 'select' header or empty leading column"
    - "REQUIREMENTS.md SEC-08 accurately states /api/inventory was intentionally restored to proxy publicPaths and that route-level auth (SEC-09) carries the requirement"
    - "23-VERIFICATION.md frontmatter no longer presents the 6 WR code-review warnings as open follow-ups — it records them as resolved in commit d646876"
  artifacts:
    - path: "src/components/ui/data-table-select-column.tsx"
      provides: "selectColumn<TData>() factory returning a ColumnDef with a header + cell Checkbox bound to row selection"
      exports: ["selectColumn"]
    - path: "tests/components/data-table-select-column.test.tsx"
      provides: "Tests proving the select column toggles rowSelection and drives the bulkActions toolbar"
    - path: "src/lib/csv-export.ts"
      provides: "buildCsvBody filters out the select/utility column (c.id !== 'select')"
      contains: "c.id !== 'select'"
    - path: "tests/lib/csv-export.test.ts"
      provides: "Test proving a table with selectColumn() exports no 'select' header"
    - path: ".planning/REQUIREMENTS.md"
      provides: "Corrected SEC-08 entry"
      contains: "route-level auth"
    - path: ".planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-VERIFICATION.md"
      provides: "Refreshed frontmatter reflecting WR resolution"
  key_links:
    - from: "src/components/ui/data-table-select-column.tsx"
      to: "@tanstack/react-table row selection API"
      via: "row.getIsSelected() / row.toggleSelected() / table.toggleAllPageRowsSelected()"
      pattern: "getIsSelected|toggleSelected"
    - from: "selectColumn()"
      to: "DataTableBulkActions"
      via: "shared rowSelection state — checkbox writes selection, bulk toolbar reads getSelectedRowModel()"
      pattern: "getSelectedRowModel"
    - from: "src/lib/csv-export.ts buildCsvBody"
      to: "select/utility column"
      via: "explicit c.id !== 'select' filter on getVisibleLeafColumns()"
      pattern: "id !== 'select'"
---

<objective>
Build the missing foundation for the `bulkActions` rollout and close the two
documentation-drift gaps.

The phase-23 DataTable gained a `bulkActions` prop and a sticky bulk-action
toolbar, but the toolbar only renders when `table.getSelectedRowModel()` is
non-empty — and **no admin table currently has a way for the user to select
rows**. `enableRowSelection` enables the *state* but adds no UI; there is no
checkbox column anywhere in the codebase. Before any table can opt into
`bulkActions` (plans 27-03, 27-04), a shared select-column helper must exist.

The select column (`id: 'select'`) is a UI-only utility column carrying no
exportable data. The CSV exporter (`src/lib/csv-export.ts`) builds its column
set from `table.getVisibleLeafColumns()` — and `enableHiding: false` only
removes a column from the visibility-toggle *menu*, it does **NOT** make the
column invisible. So without an explicit exclusion every CSV from a bulk-delete
table would gain a spurious leading `select` column. This plan adds that
exclusion to `csv-export.ts` so plans 27-03/27-04 can adopt `selectColumn()`
safely.

This plan also closes INT-G1 (SEC-08 doc drift) and the stale 23-VERIFICATION
frontmatter — both pure `.planning/` edits with no code surface.

Purpose: Unblock the bulk-action rollout with one reusable, tested primitive,
a CSV-exporter fix that keeps the select column out of exports, and correct two
documentation inaccuracies the v4.0 audit flagged.
Output: `data-table-select-column.tsx` + its test file; the `csv-export.ts`
select-column exclusion + its regression test; corrected SEC-08 entry;
refreshed 23-VERIFICATION frontmatter.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/v4.0-MILESTONE-AUDIT.md

<interfaces>
<!-- Key contracts the executor needs. Extracted from the codebase. -->
<!-- Use these directly — no exploration needed. -->

From src/components/ui/data-table-bulk-actions.tsx — the toolbar that consumes selection:
```typescript
// Renders only when table.getSelectedRowModel().rows.length > 0
export function DataTableBulkActions<TData>({
    table, actions, resourceLabel,
}: DataTableBulkActionsProps<TData>)
```

From src/components/ui/data-table.tsx — selection is wired but no checkbox UI exists:
```typescript
// enableRowSelection?: boolean — defaults false
// when true: onRowSelectionChange: setRowSelection  (state only, NO checkbox column)
// rowSelection lives in table.state.rowSelection
```

shadcn Checkbox primitive — already in the project:
```typescript
import { Checkbox } from '@/components/ui/checkbox'
// <Checkbox checked={boolean | 'indeterminate'} onCheckedChange={(v) => ...} />
```

TanStack row-selection API the helper must use:
```typescript
row.getIsSelected(): boolean
row.toggleSelected(value?: boolean): void
table.getIsAllPageRowsSelected(): boolean
table.getIsSomePageRowsSelected(): boolean
table.toggleAllPageRowsSelected(value?: boolean): void
```

From src/lib/csv-export.ts — the column set the CSV body is built from:
```typescript
// buildCsvBody (line ~53):
const visibleColumns = table.getVisibleLeafColumns()
// getVisibleLeafColumns() returns ALL visible columns. enableHiding:false on
// the select column only hides it from the visibility MENU — it stays visible
// and would otherwise be exported. This plan adds an explicit
// `.filter((c) => c.id !== 'select')` here.
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create the shared selectColumn helper and exclude it from CSV export</name>
  <files>src/components/ui/data-table-select-column.tsx, tests/components/data-table-select-column.test.tsx, src/lib/csv-export.ts, tests/lib/csv-export.test.ts</files>
  <read_first>
    - src/components/ui/data-table.tsx (lines 51-103, 247-294) — how DataTableProps and useReactTable handle `enableRowSelection` / `onRowSelectionChange`
    - src/components/ui/data-table-bulk-actions.tsx — the consumer; `getSelectedRowModel().rows` is the only thing it reads
    - src/components/ui/checkbox.tsx — the Checkbox primitive's prop signature
    - src/lib/csv-export.ts (lines 49-76 — `buildCsvBody`, where `getVisibleLeafColumns()` builds the export column set)
    - tests/lib/csv-export.test.ts (the `buildCsvBody` describe block — existing test conventions for this file)
    - tests/components/data-table-extensions.test.tsx — the existing test style for additive DataTable props (bun:test, @testing-library/react, the `Person`/`cols`/`data` fixtures pattern)
  </read_first>
  <behavior>
    - Test 1: `selectColumn()` returns a `ColumnDef` whose `id` is `'select'`, with `enableSorting: false`, `enableHiding: false`, and a fixed `size` (40).
    - Test 2: Rendering a DataTable with `columns={[selectColumn(), ...cols]}` and `enableRowSelection` shows one header checkbox + one checkbox per body row.
    - Test 3: Clicking a row checkbox toggles that row — re-render shows the row's `data-state="selected"`.
    - Test 4: Clicking the header checkbox toggles all page rows (all body checkboxes become checked).
    - Test 5: With `selectColumn()` + a destructive `bulkActions` entry, selecting ≥1 row makes the sticky bulk-action toolbar (`role="toolbar"`, `aria-label="Bulk actions"`) appear; clearing selection hides it.
    - Test 6 (csv-export.test.ts): `buildCsvBody` on a table whose columns include a `{ id: 'select' }` column produces a CSV whose header row does NOT contain `select` and whose first column is the first DATA column — the select column contributes neither a header nor a leading empty cell.
  </behavior>
  <action>
    Two changes in this task — the helper, and the matching CSV-exporter exclusion.

    **A. Create `src/components/ui/data-table-select-column.tsx`** ('use client'). Export a
    generic factory `selectColumn<TData>(): ColumnDef<TData, unknown>` that returns:
    - `id: 'select'`, `size: 40`, `enableSorting: false`, `enableHiding: false`, `enableResizing: false`
    - `header: ({ table }) => <Checkbox ... />` — `checked` is
      `table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')`,
      `onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}`,
      `aria-label="Select all rows"`.
    - `cell: ({ row }) => <Checkbox ... />` — `checked={row.getIsSelected()}`,
      `onCheckedChange={(v) => row.toggleSelected(!!v)}`,
      `aria-label="Select row"`, with `onClick={(e) => e.stopPropagation()}` so a
      select click on a row-clickable table does not also fire `onRowClick`.

    Do NOT modify `data-table.tsx`. The helper is purely additive — consumers
    spread `selectColumn()` as the first entry of their `columns` array and pass
    `enableRowSelection`. The `id: 'select'` plus `enableHiding: false` keeps the
    column out of the column-visibility *menu* — but `enableHiding: false` does
    NOT make the column invisible, so it would still appear in CSV export unless
    explicitly filtered out. That filter is change B.

    **B. Exclude the select column from CSV export** in `src/lib/csv-export.ts`.
    In `buildCsvBody` (line ~53), the export column set is currently
    `table.getVisibleLeafColumns()`. Change it to skip the select/utility column:
    ```typescript
    const visibleColumns = table
        .getVisibleLeafColumns()
        .filter((c) => c.id !== 'select')
    ```
    Update the file's top-of-file doc comment so it states the export column set
    is `getVisibleLeafColumns()` minus the `select` utility column. This is the
    real mitigation that keeps the checkbox column out of every CSV — NOT
    `enableHiding`.

    **Tests.** Write `tests/components/data-table-select-column.test.tsx` covering
    behaviors 1-5. Follow the `data-table-extensions.test.tsx` conventions:
    `import '../setup'`, `bun:test`, `@testing-library/react`, `afterEach(cleanup)`.

    Extend `tests/lib/csv-export.test.ts` with behavior 6: inside the `buildCsvBody`
    describe block, add a test that builds a `useReactTable` whose `columns`
    include a leading `{ id: 'select', header: 'select', cell: () => null }`
    pseudo-column (no need to import the real `selectColumn` — a plain ColumnDef
    with `id: 'select'` exercises the filter), then asserts
    `buildCsvBody(table).body.split('\n')[0]` does NOT contain `select` and starts
    with the first data column's header.
  </action>
  <verify>
    <automated>bun test tests/components/data-table-select-column.test.tsx tests/lib/csv-export.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `bun test tests/components/data-table-select-column.test.tsx` passes (5+ tests).
    - `bun test tests/lib/csv-export.test.ts` passes, including the new select-column-exclusion test.
    - `grep -q "export function selectColumn" src/components/ui/data-table-select-column.tsx` succeeds.
    - `grep -q "id: 'select'" src/components/ui/data-table-select-column.tsx` succeeds.
    - `grep -q "stopPropagation" src/components/ui/data-table-select-column.tsx` succeeds.
    - `grep -q "c.id !== 'select'" src/lib/csv-export.ts` succeeds — the exporter explicitly drops the select column.
    - An exported CSV from a table containing a `select` column has NO `select` header and no spurious leading empty column (proved by the csv-export.test.ts test).
    - `bun run typecheck` exits 0.
    - `bun run lint` reports 0 findings.
  </acceptance_criteria>
  <done>The selectColumn helper exists, is exported, is tested, and renders selection checkboxes that drive TanStack rowSelection and the existing bulk-action toolbar. The CSV exporter explicitly filters out the select column so no exported CSV gains a spurious 'select' column.</done>
</task>

<task type="auto">
  <name>Task 2: Correct REQUIREMENTS.md SEC-08 (closes INT-G1)</name>
  <files>.planning/REQUIREMENTS.md</files>
  <read_first>
    - .planning/REQUIREMENTS.md (line 19 — the SEC-08 bullet; line 109 — the traceability row)
    - .planning/v4.0-MILESTONE-AUDIT.md (gaps.integration INT-G1 — the authoritative description of the drift and its evidence)
    - CLAUDE.md (Proxy section — confirms `/api/{auth,trpc,e2e,health,inventory}` are public paths; the Inventory Agent / public `/forms` flow depends on `/api/inventory`)
  </read_first>
  <action>
    Replace the SEC-08 bullet in `.planning/REQUIREMENTS.md` (currently line 19,
    which reads:
    `- [x] **SEC-08**: /api/inventory removed from proxy publicPaths; analyze route enforces base64 size limit (10MB max)`)
    with this exact replacement text:

    `- [x] **SEC-08**: /api/inventory base64 payloads capped at 10MB on the analyze route. NOTE: the proxy-level removal from publicPaths was deliberately reverted (commit 0a62754) so the public /forms inventory submission keeps working; route-level auth carries the requirement instead — SEC-09's hasInventoryAccess timing-safe access code + 10MB cap + requireTrustAdmin guard the endpoint.`

    Leave the SEC-08 traceability table row (`| SEC-08 | Phase 16 | Complete |`)
    unchanged — the requirement IS satisfied, only the mechanism description was wrong.

    Do not touch any other requirement entry.
  </action>
  <verify>
    <automated>grep -q "deliberately reverted (commit 0a62754)" .planning/REQUIREMENTS.md && grep -q "route-level auth carries the requirement" .planning/REQUIREMENTS.md && ! grep -q "removed from proxy publicPaths" .planning/REQUIREMENTS.md</automated>
  </verify>
  <acceptance_criteria>
    - The string `removed from proxy publicPaths` no longer appears anywhere in `.planning/REQUIREMENTS.md`.
    - The SEC-08 bullet contains `deliberately reverted (commit 0a62754)` and `route-level auth carries the requirement`.
    - The traceability row `| SEC-08 | Phase 16 | Complete |` is unchanged.
    - No other requirement bullet is modified (`git diff --stat .planning/REQUIREMENTS.md` shows only SEC-08 lines changed).
  </acceptance_criteria>
  <done>REQUIREMENTS.md SEC-08 accurately records that /api/inventory was intentionally restored to publicPaths and route-level auth satisfies the requirement — INT-G1 closed.</done>
</task>

<task type="auto">
  <name>Task 3: Refresh stale 23-VERIFICATION.md frontmatter</name>
  <files>.planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-VERIFICATION.md</files>
  <read_first>
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-VERIFICATION.md (frontmatter lines 1-19, and the "Anti-Patterns Found" table near lines 145-152 + the closing paragraph near line 171 — these reference WR-01..WR-06)
    - v4.0-MILESTONE-AUDIT.md (tech_debt phase-23 item: "23-VERIFICATION.md frontmatter still lists the 6 WR code-review warnings as open — stale; all 26 findings were resolved in PR #91 (commit d646876)")
  </read_first>
  <action>
    The 6 WR code-review warnings (WR-01..WR-06) from 23-REVIEW.md were resolved
    in PR #91 — `git log` confirms commit `d646876` ("docs(23): mark code reviews
    resolved — 23/26 findings fixed") plus follow-up fixes `9efdadd` (WR-01/WR-02)
    and `96a7012` (phase-25 review fixes).

    Add a `review_followups` block to the 23-VERIFICATION.md frontmatter (insert it
    after the `activated_after_verification:` block, before the closing `---`),
    exactly:

    ```
    review_followups:
      status: resolved
      resolved_in: d646876
      note: "The 6 WR code-review warnings (WR-01..WR-06) from 23-REVIEW.md were resolved in PR #91 — see commit d646876 plus follow-up fixes 9efdadd (WR-01/WR-02 money-math) and 96a7012 (review hardening). No open code-review follow-ups remain for phase 23."
    ```

    Then update the report BODY so it no longer presents the warnings as open:
    - In the closing paragraph that currently reads "The 6 advisory warnings from
      23-REVIEW.md ... remain open as quality follow-ups — none are phase-goal
      gaps. Consider `/gsd-code-review-fix 23` to address them." — replace
      "remain open as quality follow-ups" with "were resolved in PR #91 (commit
      d646876)" and delete the trailing "Consider `/gsd-code-review-fix 23`..."
      sentence.
    - In the "Anti-Patterns Found" table, change the `Severity` cell of the five
      WR rows (WR-01, WR-02, WR-03, WR-04, WR-06) from `⚠️ Warning` to
      `✅ Resolved` and append ` — resolved in d646876` to each `Impact` cell.

    Do not alter the `status: passed`, `score`, or any Observable-Truths content.
  </action>
  <verify>
    <automated>grep -q "review_followups:" .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-VERIFICATION.md && grep -q "resolved_in: d646876" .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-VERIFICATION.md && ! grep -q "remain open as quality follow-ups" .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-VERIFICATION.md</automated>
  </verify>
  <acceptance_criteria>
    - The frontmatter contains a `review_followups:` block with `status: resolved` and `resolved_in: d646876`.
    - The string `remain open as quality follow-ups` no longer appears in the file.
    - The string `Consider \`/gsd-code-review-fix 23\`` no longer appears in the file.
    - The five WR rows in the Anti-Patterns table show `✅ Resolved` instead of `⚠️ Warning`.
    - `status: passed` and the `score:` line are unchanged.
  </acceptance_criteria>
  <done>23-VERIFICATION.md frontmatter and body reflect that the WR warnings were resolved in PR #91 — no longer presents stale open follow-ups.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser → DataTable selection state | The select-column checkbox writes only to client-side TanStack `rowSelection`; it triggers no mutation by itself |
| browser → CSV export | The exporter reads rows already loaded in the table; the select column is a UI utility column carrying no data |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-27-03 | Tampering | selectColumn() checkbox column | accept | The select column carries no authorization weight — it only populates client `rowSelection`. Authorization is enforced downstream by the per-resource `bulkActions` mutations (planned in 27-03/27-04, threat T-27-01). This plan ships no mutation surface. |
| T-27-04 | Information disclosure | select column leaking into CSV exports | mitigate | `getVisibleLeafColumns()` returns ALL visible columns; `enableHiding: false` only removes the column from the visibility *menu* and does NOT make it invisible — so the select column would otherwise be exported. `buildCsvBody` in `csv-export.ts` now applies an explicit `.filter((c) => c.id !== 'select')`, and `tests/lib/csv-export.test.ts` proves a table with a `select` column produces no `select` header. The select column carries no data, so this is a CSV-cleanliness fix rather than a data-leak fix — but the filter is the actual mechanism, not `enableHiding`. |
| T-27-DOC | Information disclosure | REQUIREMENTS.md / 23-VERIFICATION.md edits | N/A | Pure `.planning/` documentation edits — no runtime code, no security surface. |
</threat_model>

<verification>
- `bun test tests/components/data-table-select-column.test.tsx tests/lib/csv-export.test.ts` passes.
- `bun run typecheck` exits 0; `bun run lint` reports 0 findings.
- `bun test` full suite still green (no regression in data-table-extensions.test.tsx).
- `grep -q "c.id !== 'select'" src/lib/csv-export.ts` succeeds.
- `git diff .planning/REQUIREMENTS.md` shows only the SEC-08 bullet changed.
- `git diff` of 23-VERIFICATION.md shows only frontmatter `review_followups` addition + the WR severity/impact cells + the closing paragraph.
</verification>

<success_criteria>
- A reusable `selectColumn()` helper exists, tested, ready for plans 27-03/27-04 to spread into table column arrays.
- The CSV exporter explicitly excludes the select column — no exported CSV from a bulk-delete table gains a spurious `select` column.
- SEC-08 in REQUIREMENTS.md accurately describes the proxy publicPaths revert (INT-G1 closed).
- 23-VERIFICATION.md no longer presents resolved WR warnings as open.
</success_criteria>

<output>
After completion, create `.planning/phases/27-datatable-rollout-theme-token-and-doc-accuracy/27-01-SUMMARY.md`
</output>
</content>
</invoke>
