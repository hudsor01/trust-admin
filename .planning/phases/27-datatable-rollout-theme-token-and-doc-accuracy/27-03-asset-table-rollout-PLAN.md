---
phase: 27-datatable-rollout-theme-token-and-doc-accuracy
plan: 03
type: execute
wave: 2
depends_on: [27-01]
files_modified:
  - src/app/(admin)/vehicles/_components/VehicleTable.tsx
  - src/app/(admin)/vehicles/_components/VehiclesClient.tsx
  - src/app/(admin)/properties/_components/RentalPropertyTable.tsx
  - src/app/(admin)/properties/_components/PropertiesClient.tsx
  - src/app/(admin)/personal-property/_components/PersonalPropertyTable.tsx
  - src/app/(admin)/personal-property/_components/PersonalPropertyClient.tsx
  - src/app/(admin)/insurance/_components/InsuranceTable.tsx
  - src/app/(admin)/insurance/_components/InsuranceClient.tsx
  - src/app/(admin)/beneficiaries/_components/BeneficiaryTable.tsx
autonomous: true
requirements: []

must_haves:
  truths:
    - "The Vehicles, Properties, Personal Property, Insurance, and Beneficiaries DataTables each render a CSV Export button"
    - "The Vehicles, Properties, Personal Property, and Insurance DataTables each render a row-selection checkbox column and a bulk-delete action that routes through ConfirmDialog"
    - "Bulk-deleting selected asset rows calls each resource's existing entityId-scoped delete mutation once per selected row via a sequential await loop — no cross-entity deletion, no unconfirmed destructive op"
    - "A bulk delete that fails mid-batch surfaces a user-visible error toast naming the count of rows that failed to delete"
    - "The Beneficiaries table gets exportable only (no bulk delete — beneficiary records are not bulk-deletable) and no getRowDetail"
  artifacts:
    - path: "src/app/(admin)/vehicles/_components/VehicleTable.tsx"
      provides: "exportable + selectColumn + bulkActions wired onto the vehicles DataTable"
    - path: "src/app/(admin)/vehicles/_components/VehiclesClient.tsx"
      provides: "onBulkDelete handler that sequentially loops vehicle.delete over selected ids"
    - path: "src/app/(admin)/properties/_components/RentalPropertyTable.tsx"
      provides: "exportable + selectColumn + bulkActions on the properties DataTable"
    - path: "src/app/(admin)/personal-property/_components/PersonalPropertyTable.tsx"
      provides: "exportable + selectColumn + bulkActions on the personal-property/artwork DataTable"
    - path: "src/app/(admin)/insurance/_components/InsuranceTable.tsx"
      provides: "exportable + selectColumn + bulkActions on the insurance DataTable"
    - path: "src/app/(admin)/beneficiaries/_components/BeneficiaryTable.tsx"
      provides: "exportable on the beneficiaries DataTable"
  key_links:
    - from: "VehicleTable bulkActions onClick"
      to: "trpc.vehicle.delete (entityId-scoped)"
      via: "onBulkDelete callback sequentially looping delete.mutateAsync per selected row"
      pattern: "onBulkDelete|bulkActions"
    - from: "DataTableBulkActions destructive action"
      to: "ConfirmDialog"
      via: "requiresConfirm defaults true for variant:destructive"
      pattern: "variant: 'destructive'"
---

<objective>
Roll the phase-23 DataTable enhancements onto the five asset-domain admin
tables: Vehicles, Rental Properties, Personal Property (and its Artwork
variant), Insurance, and Beneficiaries.

Phase 23 (plan 23-04) added `bulkActions` / `exportable` / `getRowDetail` to the
shared DataTable but wired them onto `/accounts` only. This plan extends them
to the asset tables:
- **CSV export (`exportable`)** — added to all five tables. Sensible on every
  admin list table.
- **Bulk delete (`bulkActions` + `selectColumn`)** — added to Vehicles,
  Properties, Personal Property, and Insurance. Each is a flat asset list where
  bulk delete is meaningful. The destructive action routes through
  `ConfirmDialog` (the `DataTableBulkActions` component defaults
  `requiresConfirm=true` for `variant: 'destructive'`).
- **No bulk delete on Beneficiaries** — beneficiary records carry distribution
  history and share percentages; deleting them is a deliberate single-record
  decision via the existing detail dialog. Beneficiaries gets `exportable` only.
- **No `getRowDetail`** on any of these — asset rows have no genuinely useful
  collapsed detail beyond what their columns already show (unlike `/accounts`,
  which expands to linked liabilities). Per the phase brief, do not force
  `getRowDetail` onto tables with nothing to expand.

Purpose: Bring the asset tables to feature parity with `/accounts` — CSV export
everywhere, multi-row delete where it is genuinely useful.
Output: Five updated table components + four updated parent clients.
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
<!-- The reference pattern (from /accounts, 23-04) and the new helper (27-01). -->

NEW from plan 27-01 — src/components/ui/data-table-select-column.tsx:
```typescript
// Spread as the FIRST entry of a columns array; pass enableRowSelection too.
export function selectColumn<TData>(): ColumnDef<TData, unknown>
// id:'select', enableHiding:false. NOTE: enableHiding:false only removes the
// column from the column-visibility MENU — it does NOT make the column
// invisible. The select column is kept out of CSV export by an explicit
// `c.id !== 'select'` filter added to csv-export.ts in plan 27-01.
```

From src/components/ui/data-table-bulk-actions.tsx — the BulkAction contract:
```typescript
export interface BulkAction<TData> {
    label: string
    icon?: LucideIcon
    variant?: 'default' | 'destructive' | 'outline'
    onClick: (selectedRows: TData[]) => void | Promise<void>
    requiresConfirm?: boolean        // defaults true when variant==='destructive'
    confirmTitle?: string
    confirmDescription?: string
}
```

The /accounts reference (BankAccountTable.tsx, from 23-04) — how exportable is passed:
```tsx
<DataTable
    tableId="bank-accounts"
    columns={columns}
    data={bankAccounts}
    exportable
    exportResource="bank-accounts"
    ...
/>
```

DataTable bulk-action wiring requirements (data-table.tsx):
```typescript
// bulkActions renders DataTableBulkActions ONLY when selection is non-empty.
// Selection needs BOTH: enableRowSelection={true} AND a checkbox column.
// selectColumn() provides the checkbox column. resourceLabel for the toolbar
// noun comes from exportResource (e.g. "vehicles" → "Delete 3 vehicles").
```

Existing entityId-scoped delete mutation shape (vehicle.ts — every asset router matches):
```typescript
delete: adminProcedure
    .input(z.object({ id: z.coerce.number(), entityId: z.coerce.number() }))
    .mutation(...)  // WHERE id AND entityId; throws NOT_FOUND on cross-entity id
```

Existing single-delete pattern in VehiclesClient.tsx (the loop target):
```typescript
const deleteVehicleMutation = trpc.vehicle.delete.useMutation({ onSuccess: ... })
// handleDelete sets pendingDelete + confirmDelete() via useConfirmDialog
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Roll exportable + bulk-delete onto Vehicles and Properties tables</name>
  <files>src/app/(admin)/vehicles/_components/VehicleTable.tsx, src/app/(admin)/vehicles/_components/VehiclesClient.tsx, src/app/(admin)/properties/_components/RentalPropertyTable.tsx, src/app/(admin)/properties/_components/PropertiesClient.tsx</files>
  <read_first>
    - src/components/ui/data-table-select-column.tsx (the 27-01 helper)
    - src/components/ui/data-table-bulk-actions.tsx (BulkAction contract + ConfirmDialog wrap)
    - src/app/(admin)/accounts/_components/BankAccountTable.tsx (reference: exportable/exportResource on DataTable)
    - src/app/(admin)/vehicles/_components/VehicleTable.tsx (full file — current DataTable props, columns array)
    - src/app/(admin)/vehicles/_components/VehiclesClient.tsx (full file — the single-delete useConfirmDialog pattern; replicate the entityId source `entities?.[0]?.id`; note the existing `toast` import for the bulk-failure path)
    - src/app/(admin)/properties/_components/RentalPropertyTable.tsx (full file)
    - src/app/(admin)/properties/_components/PropertiesClient.tsx (full file — the rental delete mutation + entityId source)
  </read_first>
  <action>
    For BOTH Vehicles and Properties, apply the same pattern:

    1. **Table component** (`VehicleTable.tsx`, `RentalPropertyTable.tsx`):
       - Import `selectColumn` from `@/components/ui/data-table-select-column` and
         `type BulkAction` from `@/components/ui/data-table-bulk-actions`.
       - Add `onBulkDelete: (rows: Vehicle[]) => Promise<void>` (resp.
         `RentalProperty[]`) to the component's props interface.
       - Prepend `selectColumn<Vehicle>()` as the FIRST entry of the `columns` array.
       - Build a `bulkActions` array with ONE entry:
         `{ label: 'Delete', icon: Trash2, variant: 'destructive', onClick: onBulkDelete }`.
         Do NOT set `requiresConfirm` — `variant: 'destructive'` defaults it to true,
         routing through `ConfirmDialog` automatically.
       - On the `<DataTable>`: add `enableRowSelection`, `bulkActions={bulkActions}`,
         `exportable`, and `exportResource="vehicles"` (resp. `"properties"`).

    2. **Parent client** (`VehiclesClient.tsx`, `PropertiesClient.tsx`):
       - Add an `onBulkDelete` handler passed to the table. Bulk delete MUST use a
         **sequential `for...of` await loop** — NOT `Promise.all`. A sequential
         loop gives bounded, reportable partial failure: if a row fails mid-batch,
         the rows before it are already committed and the failure count is exact.
         Track failures and surface them:
         ```typescript
         const onBulkDelete = async (rows: Vehicle[]) => {
             let failed = 0
             for (const row of rows) {
                 try {
                     await deleteVehicleMutation.mutateAsync({ id: row.id, entityId: entityId! })
                 } catch (err) {
                     failed++
                     log.error('bulk delete failed', { id: row.id, err })
                 }
             }
             if (failed > 0) {
                 toast.error(`Failed to delete ${failed} of ${rows.length} ${'vehicles' /* or 'properties' */}`)
             } else {
                 toast.success(`Deleted ${rows.length} ${'vehicles' /* or 'properties' */}`)
             }
         }
         ```
         Each call independently carries `entityId`. The list query already
         invalidates on the mutation's `onSuccess`. Use the project's existing
         `toast` (sonner) and `log` instances — match how the per-row delete
         already imports them in the same file.
       - Do NOT add a separate `ConfirmDialog` for the bulk action — the
         `DataTableBulkActions` component owns that confirmation. The existing
         single-row `useConfirmDialog` for the per-row Trash2 button stays as-is.

    Each delete call hits the unchanged `adminProcedure` `delete` mutation, which
    has `WHERE id AND entityId` and throws `NOT_FOUND` on a cross-entity id — so
    a bulk delete physically cannot drop rows outside the caller's entity
    (T-27-01 mitigation).
  </action>
  <verify>
    <automated>bun run typecheck && grep -q "selectColumn" "src/app/(admin)/vehicles/_components/VehicleTable.tsx" && grep -q "exportResource=\"vehicles\"" "src/app/(admin)/vehicles/_components/VehicleTable.tsx" && grep -q "selectColumn" "src/app/(admin)/properties/_components/RentalPropertyTable.tsx" && grep -q "onBulkDelete" "src/app/(admin)/vehicles/_components/VehiclesClient.tsx" && grep -Eq "for *\\(const .* of " "src/app/(admin)/vehicles/_components/VehiclesClient.tsx"</automated>
  </verify>
  <acceptance_criteria>
    - `VehicleTable.tsx` and `RentalPropertyTable.tsx` each: import `selectColumn`, prepend it to `columns`, pass `enableRowSelection`, `bulkActions`, `exportable`, `exportResource`.
    - The `bulkActions` array in each has exactly one entry with `variant: 'destructive'` and no `requiresConfirm: false`.
    - `VehiclesClient.tsx` / `PropertiesClient.tsx` each define an `onBulkDelete` that uses a sequential `for...of` await loop (NOT `Promise.all`) over the existing `*.delete.useMutation` with `{ id, entityId }` per row.
    - `grep -q "entityId"` succeeds in each `onBulkDelete` block — every delete call carries `entityId`.
    - A bulk delete with ≥1 failing row surfaces a user-visible `toast.error` naming the failed count (e.g. "Failed to delete 2 of 5 vehicles") — not just `log.error`.
    - The success path keeps a `toast.success`.
    - `bun run typecheck` exits 0; `bun run lint` reports 0 findings.
  </acceptance_criteria>
  <done>Vehicles and Properties tables have CSV export + row-selection bulk delete; bulk delete uses a sequential loop, confirms via ConfirmDialog, and surfaces a user-visible toast naming the failed-row count on partial failure.</done>
</task>

<task type="auto">
  <name>Task 2: Roll exportable + bulk-delete onto Personal Property and Insurance tables</name>
  <files>src/app/(admin)/personal-property/_components/PersonalPropertyTable.tsx, src/app/(admin)/personal-property/_components/PersonalPropertyClient.tsx, src/app/(admin)/insurance/_components/InsuranceTable.tsx, src/app/(admin)/insurance/_components/InsuranceClient.tsx</files>
  <read_first>
    - src/components/ui/data-table-select-column.tsx (the 27-01 helper)
    - src/components/ui/data-table-bulk-actions.tsx (BulkAction contract)
    - src/app/(admin)/personal-property/_components/PersonalPropertyTable.tsx (full file)
    - src/app/(admin)/personal-property/_components/PersonalPropertyClient.tsx (full file — note: shared by /personal-property and /artwork via the `mode` prop; the `personalProperty.delete` mutation is already wired; note the existing `toast` + `log` imports)
    - src/app/(admin)/insurance/_components/InsuranceTable.tsx (full file)
    - src/app/(admin)/insurance/_components/InsuranceClient.tsx (full file — the `insurancePolicy.delete` mutation + entityId source)
  </read_first>
  <action>
    Apply the identical pattern from Task 1 to Personal Property and Insurance.

    1. **`PersonalPropertyTable.tsx`**: import `selectColumn` + `type BulkAction`;
       prepend `selectColumn<PersonalProperty>()` to `columns`; add
       `onBulkDelete: (rows: PersonalProperty[]) => Promise<void>` to props; build
       a single-entry destructive `bulkActions` array; on `<DataTable>` add
       `enableRowSelection`, `bulkActions`, `exportable`, and
       `exportResource="personal-property"`.
       NOTE: this component is shared with the Artwork page via the `mode` prop —
       the export/bulk-delete behavior is identical for both modes, so a single
       `exportResource="personal-property"` is acceptable; if the existing
       `searchPlaceholder`/`emptyMessage` props are already mode-parameterized,
       leave that mechanism untouched and just thread the new props straight
       through.

    2. **`PersonalPropertyClient.tsx`**: add an `onBulkDelete` that uses a
       **sequential `for...of` await loop** (NOT `Promise.all`) over the existing
       `deleteMutation` (`trpc.personalProperty.delete`) with
       `{ id: row.id, entityId: entityId! }` per row. Track a `failed` counter;
       on `failed > 0` call `toast.error` naming the failed count (e.g.
       "Failed to delete 2 of 5 items"), else `toast.success`. Log each failure
       via the existing mode-aware `log` instance. Pass `onBulkDelete` to
       `PersonalPropertyTable`.

    3. **`InsuranceTable.tsx`**: same as PersonalPropertyTable but
       `selectColumn<InsurancePolicy>()` and `exportResource="insurance"`.

    4. **`InsuranceClient.tsx`**: add an `onBulkDelete` using the same sequential
       `for...of` await loop over `trpc.insurancePolicy.delete` with
       `{ id, entityId }` per row, the same failed-count `toast.error` /
       `toast.success` handling.

    Same rules as Task 1: destructive variant → ConfirmDialog is automatic; do
    NOT add a separate ConfirmDialog; keep the per-row Trash2 confirmation as-is;
    every delete call carries `entityId`; bulk delete is sequential and reports
    partial failure via a user-visible toast.
  </action>
  <verify>
    <automated>bun run typecheck && grep -q "selectColumn" "src/app/(admin)/personal-property/_components/PersonalPropertyTable.tsx" && grep -q "exportResource=\"personal-property\"" "src/app/(admin)/personal-property/_components/PersonalPropertyTable.tsx" && grep -q "selectColumn" "src/app/(admin)/insurance/_components/InsuranceTable.tsx" && grep -q "exportResource=\"insurance\"" "src/app/(admin)/insurance/_components/InsuranceTable.tsx" && grep -q "onBulkDelete" "src/app/(admin)/insurance/_components/InsuranceClient.tsx" && grep -Eq "for *\\(const .* of " "src/app/(admin)/insurance/_components/InsuranceClient.tsx"</automated>
  </verify>
  <acceptance_criteria>
    - `PersonalPropertyTable.tsx` and `InsuranceTable.tsx` each import `selectColumn`, prepend it to `columns`, pass `enableRowSelection`, `bulkActions`, `exportable`, `exportResource`.
    - Each `bulkActions` array has exactly one `variant: 'destructive'` entry, no `requiresConfirm: false`.
    - `PersonalPropertyClient.tsx` / `InsuranceClient.tsx` define `onBulkDelete` using a sequential `for...of` await loop (NOT `Promise.all`) over the existing delete mutation with `{ id, entityId }` per row.
    - A bulk delete with ≥1 failing row surfaces a user-visible `toast.error` naming the failed count — not just `log.error`. The success path keeps a `toast.success`.
    - `bun run typecheck` exits 0; `bun run lint` reports 0 findings.
    - `bun test` full suite still green.
  </acceptance_criteria>
  <done>Personal Property (and Artwork) and Insurance tables have CSV export + entityId-scoped sequential bulk delete with ConfirmDialog confirmation and a user-visible partial-failure toast.</done>
</task>

<task type="auto">
  <name>Task 3: Add exportable to the Beneficiaries table</name>
  <files>src/app/(admin)/beneficiaries/_components/BeneficiaryTable.tsx</files>
  <read_first>
    - src/app/(admin)/beneficiaries/_components/BeneficiaryTable.tsx (full file — note the existing `initialColumnVisibility` hiding address columns; the CSV exporter uses `getVisibleLeafColumns()` so hidden columns are correctly excluded)
    - src/lib/csv-export.ts (confirm `getVisibleLeafColumns()` is the export column source — T-27-02 check)
  </read_first>
  <action>
    On the `<DataTable>` in `BeneficiaryTable.tsx`, add `exportable` and
    `exportResource="beneficiaries"`. Add NOTHING else:
    - NO `bulkActions` / `selectColumn` — beneficiary records carry distribution
      history and share percentages; deletion is a deliberate single-record
      action through the detail dialog, never a bulk operation.
    - NO `getRowDetail` — the table's columns plus the existing "View details"
      action already surface everything; there is no useful collapsed content.

    T-27-02 note: the beneficiaries table hides `streetAddress`/`city`/`state`/
    `zip` via `initialColumnVisibility`. The CSV exporter scopes to
    `getVisibleLeafColumns()` (verified phase 23, T-23-04), so a default export
    correctly omits those hidden PII-adjacent columns unless the admin
    deliberately un-hides them via the column-visibility menu. No sensitive
    column is force-exported. Do not change `initialColumnVisibility`.
  </action>
  <verify>
    <automated>grep -q "exportable" "src/app/(admin)/beneficiaries/_components/BeneficiaryTable.tsx" && grep -q "exportResource=\"beneficiaries\"" "src/app/(admin)/beneficiaries/_components/BeneficiaryTable.tsx" && ! grep -q "bulkActions" "src/app/(admin)/beneficiaries/_components/BeneficiaryTable.tsx" && ! grep -q "getRowDetail" "src/app/(admin)/beneficiaries/_components/BeneficiaryTable.tsx"</automated>
  </verify>
  <acceptance_criteria>
    - `BeneficiaryTable.tsx` `<DataTable>` has `exportable` and `exportResource="beneficiaries"`.
    - `BeneficiaryTable.tsx` has no `bulkActions`, no `selectColumn`, no `getRowDetail`.
    - `initialColumnVisibility` is unchanged.
    - `bun run typecheck` exits 0; `bun run lint` reports 0 findings.
  </acceptance_criteria>
  <done>The Beneficiaries table exports to CSV; no bulk delete and no row expansion were forced onto it.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser → tRPC delete mutation | A bulk-delete click crosses here once per selected row; each call is an untrusted `{ id, entityId }` payload |
| tRPC → Drizzle delete | The `delete` mutation runs as `authenticated` under JWT-bound RLS |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-27-01 | Elevation of privilege / Tampering | bulkActions bulk-delete across Vehicles/Properties/Personal-Property/Insurance | mitigate | Bulk delete loops the EXISTING `adminProcedure` `delete` mutation, which has `WHERE id AND entityId` and throws `NOT_FOUND` on a cross-entity id — the bulk path adds no new mutation and cannot drop rows outside the caller's entity. RLS `app.is_admin()` is defense-in-depth. The destructive `bulkActions` entry uses `variant: 'destructive'`, which makes `DataTableBulkActions` default `requiresConfirm=true` → every bulk delete is gated by `ConfirmDialog`; no unconfirmed destructive op is possible. No `window.confirm`. The bulk loop is sequential, so a mid-batch failure leaves a known committed set and is reported to the user via toast. |
| T-27-02 | Information disclosure | `exportable` CSV on five tables, esp. Beneficiaries (address PII) | mitigate | The CSV exporter scopes to `getVisibleLeafColumns()` + `getFilteredRowModel()` (verified phase 23, T-23-04). Beneficiaries hides `streetAddress`/`city`/`state`/`zip` by default via `initialColumnVisibility`, so a default export omits them. The `selectColumn()` checkbox column (`id:'select'`) is kept out of the CSV export by an explicit `c.id !== 'select'` filter in `csv-export.ts` (added in plan 27-01) — NOT by `enableHiding`, which only hides it from the column-visibility menu. No table introduced here force-exports a sensitive or hidden column. |
</threat_model>

<verification>
- `bun run typecheck` exits 0; `bun run lint` reports 0 findings.
- `bun test` full suite green (data-table-extensions + data-table-select-column + csv-export tests still pass).
- All five tables render a CSV Export button; Vehicles/Properties/Personal-Property/Insurance render a selection checkbox column.
- Bulk delete: each delete call carries `entityId` (grep confirms `entityId` inside every `onBulkDelete`); each `onBulkDelete` uses a sequential `for...of` loop and reports partial failure via `toast.error`.
- Beneficiaries has `exportable` only — no `bulkActions`, no `getRowDetail`.
</verification>

<success_criteria>
- Vehicles, Properties, Personal Property, Insurance, Beneficiaries DataTables all export to CSV.
- Vehicles, Properties, Personal Property, Insurance support row-selection bulk delete, confirmed via ConfirmDialog, scoped to the caller's entity, with sequential execution and user-visible partial-failure reporting.
- No `getRowDetail` forced onto tables without useful collapsed content.
</success_criteria>

<output>
After completion, create `.planning/phases/27-datatable-rollout-theme-token-and-doc-accuracy/27-03-SUMMARY.md`
</output>
</content>
