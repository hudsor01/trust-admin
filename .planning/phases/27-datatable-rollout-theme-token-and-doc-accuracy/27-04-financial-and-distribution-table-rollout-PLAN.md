---
phase: 27-datatable-rollout-theme-token-and-doc-accuracy
plan: 04
type: execute
wave: 2
depends_on: [27-01, 27-02]
files_modified:
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
autonomous: true
requirements: []

must_haves:
  truths:
    - "The Liabilities and Accounting DataTables render a CSV Export button, a row-selection checkbox column, and a bulk-delete action that routes through ConfirmDialog"
    - "Bulk-deleting Liabilities/Accounting rows calls each resource's existing entityId-scoped delete mutation once per selected row via a sequential await loop"
    - "A bulk delete that fails mid-batch surfaces a user-visible error toast naming the count of rows that failed to delete"
    - "The HEMS-queue table tab gets exportable only (kanban-driven workflow — no destructive bulk op on review requests)"
    - "The read-only distribution/withdrawal tables (HemsTable, HistoryTable, WithdrawalsTable, WithdrawalsPanel) and the Users table get exportable only — no bulk delete, no getRowDetail"
  artifacts:
    - path: "src/app/(admin)/liabilities/_components/LiabilityTable.tsx"
      provides: "exportable + selectColumn + bulk-delete on the liabilities DataTable"
    - path: "src/app/(admin)/accounting/_components/AccountingTable.tsx"
      provides: "exportable + selectColumn + bulk-delete on the accounting DataTable"
    - path: "src/app/(admin)/hems-queue/_components/HemsQueueClient.tsx"
      provides: "exportable on the hems-queue table-tab DataTable"
    - path: "src/app/(admin)/hems/_components/HemsTable.tsx"
      provides: "exportable on the recent-HEMS-distributions DataTable"
    - path: "src/app/(admin)/hems/_components/HistoryTable.tsx"
      provides: "exportable on the all-distributions DataTable"
    - path: "src/app/(admin)/hems/_components/WithdrawalsTable.tsx"
      provides: "exportable on the grandchild-withdrawals DataTable"
    - path: "src/app/(admin)/dashboard/_components/WithdrawalsPanel.tsx"
      provides: "exportable on the dashboard withdrawal-eligibility DataTable"
    - path: "src/app/(admin)/users/_components/UsersTable.tsx"
      provides: "exportable on the users DataTable"
  key_links:
    - from: "LiabilityTable bulkActions onClick"
      to: "trpc.liability.delete (entityId-scoped)"
      via: "onBulkDelete sequentially looping delete.mutateAsync per selected row"
      pattern: "onBulkDelete|bulkActions"
    - from: "AccountingTable bulkActions onClick"
      to: "trpc.trustAccounting.delete"
      via: "onBulkDelete sequentially looping deleteEntry per selected row"
      pattern: "onBulkDelete|bulkActions"
---

<objective>
Roll the phase-23 DataTable enhancements onto the financial- and
distribution-domain admin tables.

Two groups, per the phase brief's "only where genuinely warranted" rule:

**Bulk-delete + export** (flat list tables with a delete mutation):
- **Liabilities** — `trpc.liability.delete` exists; bulk delete is meaningful.
- **Accounting** — `trpc.trustAccounting.delete` exists; bulk delete is meaningful.

**Export only** (read-only or workflow-driven tables):
- **HEMS-queue table tab** — request review is driven by the kanban board
  (drag PENDING→APPROVED); destructive bulk operations on review requests are
  not a meaningful workflow. Export only.
- **HemsTable** (recent HEMS distributions), **HistoryTable** (all
  distributions), **WithdrawalsTable** + **WithdrawalsPanel** (grandchild
  withdrawal schedules — computed, read-only views with no delete mutation and
  no parent-passed mutation) — export only.
- **Users** — managed by Neon Auth, owner-only, with its own ban/role/reset
  dialogs; bulk-deleting auth users is not a supported operation. Export only.

No `getRowDetail` on any table here — none has useful collapsed content beyond
its columns (the `/accounts` linked-liabilities expansion was its specific
justification; nothing here parallels it).

Purpose: Complete the DataTable-enhancement rollout — CSV export across every
remaining admin table, multi-row delete on the two financial list tables that
genuinely support it.
Output: Two tables with full bulk-delete; six tables with `exportable`.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/27-datatable-rollout-theme-token-and-doc-accuracy/27-01-SUMMARY.md

<interfaces>
<!-- The 27-01 helper + the bulk-action contract + the export prop. -->

NEW from plan 27-01 — src/components/ui/data-table-select-column.tsx:
```typescript
export function selectColumn<TData>(): ColumnDef<TData, unknown>
// id:'select', enableHiding:false. NOTE: enableHiding:false only removes the
// column from the column-visibility MENU — it does NOT make the column
// invisible. The select column is kept out of CSV export by an explicit
// `c.id !== 'select'` filter added to csv-export.ts in plan 27-01.
```

From src/components/ui/data-table-bulk-actions.tsx:
```typescript
export interface BulkAction<TData> {
    label: string
    icon?: LucideIcon
    variant?: 'default' | 'destructive' | 'outline'
    onClick: (selectedRows: TData[]) => void | Promise<void>
    requiresConfirm?: boolean   // defaults true when variant==='destructive'
}
```

From src/components/ui/data-table.tsx — exportable + bulkActions props:
```typescript
// exportable?: boolean ; exportResource?: string (CSV filename stem)
// bulkActions?: BulkAction<TData>[]  — renders sticky toolbar only when
//   selection non-empty; needs enableRowSelection + a checkbox column.
```

Existing single-delete mutations (the loop targets):
- LiabilitiesClient.tsx:88  `trpc.liability.delete.useMutation(...)`
- AccountingClient.tsx:85   `trpc.trustAccounting.delete.useMutation(...)`
Both `delete` procedures are `adminProcedure` with `{ id, entityId }` input and
a `WHERE id AND entityId` clause (entityId-scoped; throws NOT_FOUND cross-entity).

HemsQueueClient table-tab DataTable (HemsQueueClient.tsx ~line 389):
```tsx
<DataTable tableId="hems-queue" data={displayedRequests} columns={columns}
    searchKey="category" enableColumnVisibility enablePagination />
```

UsersTable receives its `columns` as a prop (UsersTable.tsx) — only the
`<DataTable>` element is edited there.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Roll exportable + bulk-delete onto Liabilities and Accounting tables</name>
  <files>src/app/(admin)/liabilities/_components/LiabilityTable.tsx, src/app/(admin)/liabilities/_components/LiabilitiesClient.tsx, src/app/(admin)/accounting/_components/AccountingTable.tsx, src/app/(admin)/accounting/_components/AccountingClient.tsx</files>
  <read_first>
    - src/components/ui/data-table-select-column.tsx (the 27-01 helper)
    - src/components/ui/data-table-bulk-actions.tsx (BulkAction contract + automatic ConfirmDialog wrap)
    - src/app/(admin)/accounts/_components/BankAccountTable.tsx (reference: exportable/exportResource passing)
    - src/app/(admin)/liabilities/_components/LiabilityTable.tsx (full file — note: the table is only rendered when `!bulkMode`; the bulk-entry mode is unrelated to bulk-delete)
    - src/app/(admin)/liabilities/_components/LiabilitiesClient.tsx (full file — `liability.delete.useMutation` at line 88, the entityId source, the single-delete `handleDelete`, the existing `toast` + `log` imports)
    - src/app/(admin)/accounting/_components/AccountingTable.tsx (full file — note `enablePagination={false}`, custom Previous/Next; the search/visibility toolbar still renders)
    - src/app/(admin)/accounting/_components/AccountingClient.tsx (full file — `trustAccounting.delete.useMutation` at line 85, the `deleteEntry` handler, entityId source, the existing `toast` + `log` imports)
  </read_first>
  <action>
    Apply the bulk-delete + export pattern (identical to plan 27-03) to BOTH
    Liabilities and Accounting.

    1. **`LiabilityTable.tsx`**: import `selectColumn` + `type BulkAction`;
       prepend `selectColumn<Liability>()` to the `columns` array; add
       `onBulkDelete: (rows: Liability[]) => Promise<void>` to
       `LiabilityTableProps`; build a single-entry destructive `bulkActions`
       array (`{ label: 'Delete', icon: Trash2, variant: 'destructive', onClick: onBulkDelete }` —
       import `Trash2` if not already imported); on the `<DataTable>` (the
       `!bulkMode` branch) add `enableRowSelection`, `bulkActions`, `exportable`,
       `exportResource="liabilities"`.

    2. **`LiabilitiesClient.tsx`**: add an `onBulkDelete` that uses a
       **sequential `for...of` await loop** — NOT `Promise.all`. A sequential
       loop gives bounded, reportable partial failure: a mid-batch failure leaves
       a known committed set and an exact failure count. Track a `failed`
       counter; on `failed > 0` call `toast.error` naming the failed count (e.g.
       "Failed to delete 2 of 5 liabilities"), else `toast.success`. Loop the
       existing `deleteLiabilityMutation` with `{ id: row.id, entityId: entityId! }`
       per row; log each failure via the existing `log.error` pattern; pass
       `onBulkDelete` to `LiabilityTable`.

    3. **`AccountingTable.tsx`**: import `selectColumn` + `type BulkAction`;
       prepend `selectColumn<TrustAccounting>()` to `accountingColumns`; add
       `onBulkDelete: (rows: TrustAccounting[]) => Promise<void>` to
       `AccountingTableProps`; build the single-entry destructive `bulkActions`
       array; on the `<DataTable>` add `enableRowSelection`, `bulkActions`,
       `exportable`, `exportResource="accounting"`. Leave `enablePagination={false}`
       and the custom Previous/Next block untouched.

    4. **`AccountingClient.tsx`**: add an `onBulkDelete` using the same
       **sequential `for...of` await loop** over the existing `deleteEntryMutation`
       (`trpc.trustAccounting.delete`) with `{ id, entityId }` per row, the same
       `failed`-count `toast.error` / `toast.success` handling; pass it to
       `AccountingTable`.

    Rules (same as 27-03): destructive variant → `ConfirmDialog` is automatic via
    `DataTableBulkActions`; do NOT add a separate `ConfirmDialog`; keep each
    table's per-row delete confirmation as-is; every delete call carries
    `entityId` (T-27-01 mitigation); bulk delete is sequential and reports
    partial failure via a user-visible toast.
  </action>
  <verify>
    <automated>bun run typecheck && grep -q "selectColumn" "src/app/(admin)/liabilities/_components/LiabilityTable.tsx" && grep -q "exportResource=\"liabilities\"" "src/app/(admin)/liabilities/_components/LiabilityTable.tsx" && grep -q "onBulkDelete" "src/app/(admin)/liabilities/_components/LiabilitiesClient.tsx" && grep -Eq "for *\\(const .* of " "src/app/(admin)/liabilities/_components/LiabilitiesClient.tsx" && grep -q "selectColumn" "src/app/(admin)/accounting/_components/AccountingTable.tsx" && grep -q "exportResource=\"accounting\"" "src/app/(admin)/accounting/_components/AccountingTable.tsx" && grep -q "onBulkDelete" "src/app/(admin)/accounting/_components/AccountingClient.tsx"</automated>
  </verify>
  <acceptance_criteria>
    - `LiabilityTable.tsx` and `AccountingTable.tsx` each import `selectColumn`, prepend it to the columns array, pass `enableRowSelection`, `bulkActions`, `exportable`, `exportResource`.
    - Each `bulkActions` array has exactly one `variant: 'destructive'` entry with no `requiresConfirm: false`.
    - `LiabilitiesClient.tsx` / `AccountingClient.tsx` define `onBulkDelete` using a sequential `for...of` await loop (NOT `Promise.all`) over the existing delete mutation with `{ id, entityId }` per selected row.
    - A bulk delete with ≥1 failing row surfaces a user-visible `toast.error` naming the failed count — not just `log.error`. The success path keeps a `toast.success`.
    - `bun run typecheck` exits 0; `bun run lint` reports 0 findings.
  </acceptance_criteria>
  <done>Liabilities and Accounting tables have CSV export + entityId-scoped sequential row-selection bulk delete with ConfirmDialog confirmation and a user-visible partial-failure toast.</done>
</task>

<task type="auto">
  <name>Task 2: Add exportable to the HEMS-queue table tab and the four read-only distribution/withdrawal tables</name>
  <files>src/app/(admin)/hems-queue/_components/HemsQueueClient.tsx, src/app/(admin)/hems/_components/HemsTable.tsx, src/app/(admin)/hems/_components/HistoryTable.tsx, src/app/(admin)/hems/_components/WithdrawalsTable.tsx, src/app/(admin)/dashboard/_components/WithdrawalsPanel.tsx</files>
  <read_first>
    - src/app/(admin)/hems-queue/_components/HemsQueueClient.tsx (lines ~388-398 — the table-tab `<DataTable tableId="hems-queue">`; the board tab is a kanban and is NOT touched)
    - src/app/(admin)/hems/_components/HemsTable.tsx (lines ~150-157 — the `<DataTable tableId="hems">`)
    - src/app/(admin)/hems/_components/HistoryTable.tsx (lines ~111-118 — the `<DataTable tableId="hems-history">`)
    - src/app/(admin)/hems/_components/WithdrawalsTable.tsx (lines ~206-213 — the `<DataTable tableId="hems-withdrawals">`)
    - src/app/(admin)/dashboard/_components/WithdrawalsPanel.tsx (lines ~115-122 — the `<DataTable tableId="dashboard-withdrawals">`)
  </read_first>
  <action>
    On EACH of the five `<DataTable>` elements, add `exportable` and an
    `exportResource` filename stem. Add NOTHING else — no `selectColumn`, no
    `bulkActions`, no `getRowDetail`:

    - `HemsQueueClient.tsx` table-tab DataTable: `exportable exportResource="hems-queue"`.
      (The board-tab `HemsQueueBoard` kanban is untouched. The table tab is a
      read-only review surface — request approval flows through the kanban or the
      review dialog, never a bulk op.)
    - `HemsTable.tsx`: `exportable exportResource="hems-distributions"`.
    - `HistoryTable.tsx`: `exportable exportResource="distributions"`.
      CO-EDIT NOTE: `HistoryTable.tsx` is also in plan 27-02's `files_modified`.
      27-02 (wave 1) swaps the Badge `className` to the milestone theme token at
      ~line 63; this task (27-04, wave 2) edits ONLY the `<DataTable>` element at
      ~line 111. The two edits are on disjoint, non-adjacent line ranges and
      27-02 lands before 27-04, so there is no collision — but this task must
      touch ONLY the `<DataTable>` element and must NOT alter the Badge or its
      `className` that 27-02 owns.
    - `WithdrawalsTable.tsx`: `exportable exportResource="withdrawals"`.
    - `WithdrawalsPanel.tsx`: `exportable exportResource="withdrawal-eligibility"`.

    These five tables are read-only or workflow-driven: HemsTable / HistoryTable
    show distribution records, the two Withdrawals tables show computed
    age-based eligibility schedules with no delete mutation and no parent-passed
    mutation. Bulk delete and row expansion are not applicable — CSV export is.
  </action>
  <verify>
    <automated>grep -q "exportResource=\"hems-queue\"" "src/app/(admin)/hems-queue/_components/HemsQueueClient.tsx" && grep -q "exportResource=\"hems-distributions\"" "src/app/(admin)/hems/_components/HemsTable.tsx" && grep -q "exportResource=\"distributions\"" "src/app/(admin)/hems/_components/HistoryTable.tsx" && grep -q "exportResource=\"withdrawals\"" "src/app/(admin)/hems/_components/WithdrawalsTable.tsx" && grep -q "exportResource=\"withdrawal-eligibility\"" "src/app/(admin)/dashboard/_components/WithdrawalsPanel.tsx"</automated>
  </verify>
  <acceptance_criteria>
    - Each of the five `<DataTable>` elements has `exportable` and a distinct `exportResource`.
    - None of the five files gains `bulkActions`, `selectColumn`, or `getRowDetail`.
    - In `HistoryTable.tsx` only the `<DataTable>` element is changed — the Badge `className` owned by 27-02 is untouched.
    - The `HemsQueueBoard` kanban component is unmodified.
    - `bun run typecheck` exits 0; `bun run lint` reports 0 findings.
  </acceptance_criteria>
  <done>The HEMS-queue table tab and the four read-only distribution/withdrawal tables all export to CSV; no bulk delete or row expansion forced onto them.</done>
</task>

<task type="auto">
  <name>Task 3: Add exportable to the Users table</name>
  <files>src/app/(admin)/users/_components/UsersTable.tsx</files>
  <read_first>
    - src/app/(admin)/users/_components/UsersTable.tsx (full file — the `<DataTable tableId="users">`; `columns` arrive as a prop)
    - CLAUDE.md (Auth section — users are managed by Neon Auth; `authServer.admin.*` APIs handle create/ban/role; there is no bulk user-delete operation)
  </read_first>
  <action>
    On the `<DataTable>` in `UsersTable.tsx`, add `exportable` and
    `exportResource="users"`. Add NOTHING else:
    - NO `bulkActions` / `selectColumn` — users are managed through Neon Auth's
      admin API with dedicated per-user dialogs (ban, change role, reset
      password); bulk-deleting auth users is not a supported operation and would
      need a Neon Auth `removeUser` loop that is out of this phase's scope.
    - NO `getRowDetail`.

    The user list contains no money or trust data — just name, email, role — so
    CSV export carries no sensitive-column risk (T-27-02). The exporter scopes to
    `getVisibleLeafColumns()`, and the `columns` prop is supplied by the caller
    unchanged.
  </action>
  <verify>
    <automated>grep -q "exportable" "src/app/(admin)/users/_components/UsersTable.tsx" && grep -q "exportResource=\"users\"" "src/app/(admin)/users/_components/UsersTable.tsx" && ! grep -q "bulkActions" "src/app/(admin)/users/_components/UsersTable.tsx" && ! grep -q "getRowDetail" "src/app/(admin)/users/_components/UsersTable.tsx"</automated>
  </verify>
  <acceptance_criteria>
    - `UsersTable.tsx` `<DataTable>` has `exportable` and `exportResource="users"`.
    - `UsersTable.tsx` has no `bulkActions`, no `selectColumn`, no `getRowDetail`.
    - `bun run typecheck` exits 0; `bun run lint` reports 0 findings.
    - `bun test` full suite still green.
  </acceptance_criteria>
  <done>The Users table exports to CSV; no bulk delete forced onto a Neon-Auth-managed resource.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser → tRPC delete mutation | A Liabilities/Accounting bulk-delete click crosses here once per selected row |
| tRPC → Drizzle delete | `delete` runs as `authenticated` under JWT-bound RLS |
| browser → CSV export | Export is fully client-side — reads rows already loaded into the table; crosses no boundary |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-27-01 | Elevation of privilege / Tampering | bulkActions bulk-delete on Liabilities + Accounting | mitigate | Bulk delete loops the EXISTING `adminProcedure` `delete` mutation (`trpc.liability.delete`, `trpc.trustAccounting.delete`), each with `WHERE id AND entityId` throwing `NOT_FOUND` on a cross-entity id — the bulk path adds no new mutation and cannot drop rows outside the caller's entity. RLS `app.is_admin()` is defense-in-depth. The destructive `bulkActions` entry uses `variant: 'destructive'` → `DataTableBulkActions` defaults `requiresConfirm=true` → every bulk delete is gated by `ConfirmDialog`. No `window.confirm`, no unconfirmed destructive op. The bulk loop is sequential, so a mid-batch failure leaves a known committed set and is reported to the user via toast. |
| T-27-02 | Information disclosure | `exportable` CSV on 7 tables (incl. Accounting financial ledger, Users) | mitigate | The CSV exporter scopes to `getVisibleLeafColumns()` + `getFilteredRowModel()` (verified phase 23, T-23-04) — hidden columns are excluded. No table in this plan defines `initialColumnVisibility` that exposes a sensitive column. The `selectColumn()` checkbox column (`id:'select'`) is kept out of the CSV export by an explicit `c.id !== 'select'` filter in `csv-export.ts` (added in plan 27-01) — NOT by `enableHiding`, which only hides it from the column-visibility menu. The Users export contains only name/email/role (no money, no trust data). Accounting export exposes the entity's own ledger to the entity's own admins — an intended capability, no cross-entity leak (rows arrive pre-scoped by the entityId-filtered `list` query). |
</threat_model>

<verification>
- `bun run typecheck` exits 0; `bun run lint` reports 0 findings.
- `bun test` full suite green.
- Liabilities + Accounting render a CSV Export button, a selection checkbox column, and a bulk-delete action.
- HEMS-queue table tab + HemsTable + HistoryTable + WithdrawalsTable + WithdrawalsPanel + Users each render a CSV Export button and nothing else new.
- Bulk delete: grep confirms `entityId` inside every `onBulkDelete` block; each `onBulkDelete` uses a sequential `for...of` loop and reports partial failure via `toast.error`.
- The `HemsQueueBoard` kanban is unmodified; `HistoryTable.tsx`'s Badge className owned by 27-02 is untouched.
</verification>

<success_criteria>
- Every remaining admin DataTable exports to CSV (Liabilities, Accounting, HEMS-queue table, HEMS recent, distributions history, two withdrawal tables, Users).
- Liabilities and Accounting support entityId-scoped row-selection bulk delete, confirmed via ConfirmDialog, with sequential execution and user-visible partial-failure reporting.
- No bulk delete or `getRowDetail` forced onto read-only or Neon-Auth-managed tables.
- Combined with plans 27-01..27-03, all ~16 remaining admin DataTables have received the phase-23 enhancement rollout.
</success_criteria>

<output>
After completion, create `.planning/phases/27-datatable-rollout-theme-token-and-doc-accuracy/27-04-SUMMARY.md`
</output>
</content>
