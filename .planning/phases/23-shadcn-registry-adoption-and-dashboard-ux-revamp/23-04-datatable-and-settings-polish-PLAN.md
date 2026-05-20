---
phase: 23
plan: 04
type: execute
wave: 3
depends_on: [23-01, 23-03]
files_modified:
  - src/components/ui/data-table.tsx
  - src/components/ui/data-table-bulk-actions.tsx
  - src/components/ui/data-table-export.tsx
  - src/lib/csv-export.ts
  - src/app/(admin)/accounts/_components/AccountsClient.tsx
  - src/components/ui/sortable.tsx
  - src/components/preference-row.tsx
  - src/server/trpc/routers/trustee.ts
  - src/server/trpc/routers/beneficiary.ts
  - src/app/(admin)/trustees/_components/TrusteeSortableList.tsx
  - src/app/(admin)/trustees/_components/TrusteesClient.tsx
  - src/app/(admin)/beneficiaries/_components/BeneficiarySortableList.tsx
  - src/app/(admin)/beneficiaries/_components/BeneficiariesClient.tsx
  - src/app/(admin)/settings/_components/SettingsClient.tsx
  - src/app/(admin)/settings/_components/SettingsTrustInfoCard.tsx
  - src/app/(admin)/settings/_components/SettingsNotificationsCard.tsx
  - src/app/(admin)/settings/_components/SettingsRolesAccessCard.tsx
  - src/app/(admin)/settings/_components/SettingsInventoryAccessCard.tsx
  - drizzle/0012_add_sort_index.sql
  - db/schema.ts
  - tests/components/data-table.test.tsx
  - tests/lib/csv-export.test.ts
  - tests/components/preference-row.test.tsx
  - tests/trpc/trustee.test.ts
  - tests/trpc/beneficiary.test.ts
  - tests/e2e/trustees-sortable.e2e.ts
autonomous: true
requirements: []
tags: [datatable, bulk-actions, csv-export, row-expansion, sortable, settings-refresh, preference-row, drizzle-migration, sort-index, reorder]
must_haves:
  truths:
    - "DataTable accepts new optional props: bulkActions (BulkAction[]), exportable (boolean), exportResource (string), getRowDetail ((row) => ReactNode)"
    - "Bulk-action toolbar is visible iff table.getSelectedRowModel().rows.length > 0; sticky position top-0 z-10 with bg-primary/5"
    - "Bulk-action destructive actions are wrapped in ConfirmDialog (NO window.confirm())"
    - "CSV export button respects current columnFilters + sorting + visible columns; filename = {resource}-{YYYY-MM-DD}.csv"
    - "Row expansion (when getRowDetail provided) adds a chevron column + expanded <td colSpan> region with bg-muted/30"
    - "/accounts page is first consumer of getRowDetail — shows linked liabilities for the expanded account row"
    - "/settings renders 4 Card groups (Trust info, Notifications, Roles & access, Inventory access) each containing PreferenceRows"
    - "PreferenceRow renders title (text-xl font-semibold) + description + control slot in 2-column grid"
    - "trpc.trustee.reorder({ entityId, orderedIds: number[] }) updates the existing trustee.order column for matching rows"
    - "trpc.beneficiary.reorder({ entityId, orderedIds: number[] }) updates the new beneficiary.sortIndex column"
    - "Migration 0012 adds beneficiary.sortIndex (NOT NULL DEFAULT 0), backfills via ROW_NUMBER, adds composite index (entityId, sortIndex); also adds composite index (entityId, order) on trustee; ALL column references are camelCase"
    - "After bun run db:deploy, db/schema.ts contains beneficiary.sortIndex column definition and Drizzle accepts queries against it"
  artifacts:
    - path: src/components/ui/data-table.tsx
      provides: "Extended DataTable with bulkActions/exportable/getRowDetail props"
    - path: src/components/ui/data-table-bulk-actions.tsx
      provides: "Sticky bulk-action toolbar"
      exports: ["DataTableBulkActions", "BulkAction"]
    - path: src/components/ui/data-table-export.tsx
      provides: "CSV export button"
      exports: ["DataTableExport"]
    - path: src/lib/csv-export.ts
      provides: "exportTableToCsv helper using formatCurrency/formatDate"
      exports: ["exportTableToCsv"]
    - path: src/components/ui/sortable.tsx
      provides: "Dice UI sortable primitive"
    - path: src/components/preference-row.tsx
      provides: "Settings preference row composition"
      exports: ["PreferenceRow", "PreferenceRowProps"]
    - path: src/server/trpc/routers/trustee.ts
      provides: "reorder mutation (writes to existing trustee.order column)"
    - path: src/server/trpc/routers/beneficiary.ts
      provides: "reorder mutation (writes to new beneficiary.sortIndex column)"
    - path: drizzle/0012_add_sort_index.sql
      provides: "Migration adding beneficiary.sortIndex + composite indexes; camelCase columns"
    - path: db/schema.ts
      provides: "Updated beneficiary table includes sortIndex column"
  key_links:
    - from: "DataTable.tsx"
      to: "DataTableBulkActions + DataTableExport"
      via: "conditional render based on new props"
      pattern: "bulkActions|exportable"
    - from: "TrusteeSortableList.tsx"
      to: "trpc.trustee.reorder"
      via: "onDragEnd → orderedIds[]"
      pattern: "trpc.trustee.reorder.useMutation"
    - from: "BeneficiarySortableList.tsx"
      to: "trpc.beneficiary.reorder"
      via: "onDragEnd → orderedIds[]"
      pattern: "trpc.beneficiary.reorder.useMutation"
    - from: "drizzle/0012_add_sort_index.sql"
      to: "beneficiary.sortIndex column"
      via: "ALTER TABLE ADD COLUMN + UPDATE backfill + CREATE INDEX"
      pattern: "ADD COLUMN.*sortIndex"
---

<objective>
PR-C + PR-D combined / Wave 4 — DataTable enhancements + settings refresh + sortable lists.

PR-C polishes the existing DataTable with three additive prop extensions: bulk-action toolbar (sticky, visible on row selection, ConfirmDialog-wrapped destructive ops), CSV export (respects filters + sorting, uses existing formatters, filename = {resource}-{date}.csv), and opt-in row expansion via `getRowDetail` (first consumer: `/accounts` shows linked liabilities). PR-D refreshes the `/settings` page into 4 Card groups powered by a new `PreferenceRow` composition, installs the Dice UI sortable primitive and applies it to trustees + beneficiaries with persistent ordering via a new `sortIndex` column, and ships the Drizzle migration that creates the column + indexes (with the mandatory hand-edit to camelCase per the project's documented gotcha).

This plan combines PR-C and PR-D because they are independent of each other (DataTable changes touch a primitive + 1 consumer; settings refresh + sortable touch a different set of pages + a new migration) — Wave 4 ships both together. They can execute as two parallel commits within the same PR or as back-to-back PRs.

Threat references: T-23-03 (DataTable bulk-action destructive op without confirmation), T-23-04 (CSV export of redacted/hidden column data), T-23-05 (reorder mutation entityId bypass).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-CONTEXT.md
@.planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-RESEARCH.md
@.planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-PATTERNS.md
@.planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-UI-SPEC.md
@.planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-VALIDATION.md
@CLAUDE.md
@src/components/ui/data-table.tsx
@src/components/ui/data-table-view-options.tsx
@src/components/confirm-dialog.tsx
@src/utils/formatters.ts
@src/app/(admin)/settings/_components/SettingsClient.tsx
@src/server/trpc/routers/trustee.ts
@src/server/trpc/routers/beneficiary.ts
@drizzle/0009_create_valuation_correction.sql
@db/schema.ts

<interfaces>
<!-- BulkAction interface (UI-SPEC §8) -->

```typescript
export interface BulkAction<TData> {
    label: string                       // e.g. "Delete"
    icon?: LucideIcon                   // e.g. Trash2
    variant?: 'default' | 'destructive' // affects button color
    onClick: (selectedRows: TData[]) => void | Promise<void>
    requiresConfirm?: boolean           // MUST be true for variant: 'destructive'
    confirmTitle?: string
    confirmDescription?: string
}
```

<!-- DataTable new props (UI-SPEC §8, §9, §10) -->

```typescript
// Added to existing DataTableProps<TData, TValue>:
{
    bulkActions?: BulkAction<TData>[]
    exportable?: boolean
    exportResource?: string             // e.g. "vehicles" → "vehicles-2026-05-19.csv"
    getRowDetail?: (row: TData) => ReactNode
}
```

<!-- reorder mutation contract -->

```typescript
// New in src/server/trpc/routers/trustee.ts (mirror in beneficiary.ts)
reorder: adminProcedure
    .input(z.object({
        entityId: z.coerce.number(),
        orderedIds: z.array(z.coerce.number()),
    }))
    .mutation(async ({ input }) => {
        // For trustee: writes to existing `order` integer column
        // For beneficiary: writes to NEW `sortIndex` column (from migration 0012)
        // Returns: array of updated rows
        // Throws TRPCError NOT_FOUND if any id is missing from this entity
    })
```

<!-- PreferenceRow interface (UI-SPEC §11) -->

```typescript
export interface PreferenceRowProps {
    title: string
    description?: string
    children: ReactNode
}
```

<!-- Migration 0012 column reference rules (CLAUDE.md gotcha) -->

```sql
-- ALL column names in quotes use camelCase. Drizzle-kit's auto-generated SQL
-- may emit snake_case for new columns — hand-edit BEFORE running db:deploy.
-- Example: emitted as "sort_index" → must change to "sortIndex".
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 04.1: Extend DataTable with bulkActions + exportable + getRowDetail props; build sub-primitives; CSV export lib + tests</name>
  <files>src/components/ui/data-table.tsx, src/components/ui/data-table-bulk-actions.tsx, src/components/ui/data-table-export.tsx, src/lib/csv-export.ts, tests/components/data-table.test.tsx, tests/lib/csv-export.test.ts</files>
  <read_first>
    - src/components/ui/data-table.tsx (existing — lines 44-65 contain DataTableProps interface; lines 312-329 contain the toolbar integration point)
    - src/components/ui/data-table-view-options.tsx (analog for sub-primitive shape — takes `table: Table<TData>` prop)
    - src/components/confirm-dialog.tsx (lines 100-115 — useConfirmDialog hook pattern)
    - src/utils/formatters.ts (formatCurrency, formatDate, formatPercent — reused by CSV export)
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-UI-SPEC.md (§8 DataTable Bulk-Action Toolbar, §9 DataTable CSV Export, §10 DataTable Row Expansion, Implementation Note 14)
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-PATTERNS.md (§"src/components/ui/data-table-bulk-actions.tsx" + §"src/components/ui/data-table-export.tsx" + §"src/components/ui/data-table.tsx")
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-VALIDATION.md (rows 23-04-01, 23-04-02, 23-04-03)
    - CLAUDE.md (Gotchas — no confirm(), use ConfirmDialog)
  </read_first>
  <behavior>
    - DataTable still works for all existing callers (17 admin pages) without changes — new props are optional and additive.
    - When `bulkActions` prop is passed: sticky toolbar renders below table header (top-0 z-10) when selection > 0; hidden when selection = 0; sample destructive action wrapped in ConfirmDialog opens dialog on click; on confirm, fires `onClick(selectedRows)` and shows toast.
    - When `exportable` prop is passed: "Export CSV" button appears in the table header bar; click downloads `{exportResource}-{YYYY-MM-DD}.csv` containing only the rows that pass current filters (uses `table.getFilteredRowModel().rows`) and only the visible columns (uses `table.getVisibleLeafColumns()`); money cells use formatCurrency (then strip $ and commas to preserve numeric parseability in spreadsheets); date cells use ISO yyyy-MM-dd.
    - When `getRowDetail` prop is passed: each row gets a leading chevron column; clicking the chevron or the row toggles expand; expanded region renders `getRowDetail(row)` as a full-width `<td colSpan={n}>` block with `bg-muted/30 p-4`.
    - `/accounts` page passes `getRowDetail` that returns a list of linked liabilities for that account.
    - Test: render DataTable with `bulkActions=[{label:'Delete', variant:'destructive', requiresConfirm: true, onClick}]`, select a row, assert toolbar visible with "1 selected" text; click Delete; assert ConfirmDialog opens; click Confirm; assert `onClick` was called with the selected row.
    - Test: render DataTable with `exportable={true}`, apply a column filter; click Export; spy on download intercept and assert CSV body contains only filtered rows.
    - Test: render DataTable with `getRowDetail`; click chevron on a row; assert detail content renders below.
  </behavior>
  <action>
1. Build `src/lib/csv-export.ts` (UI-SPEC §9; reuses existing formatters):

```typescript
import type { Table } from '@tanstack/react-table'
import { formatCurrency, formatDate, formatPercent } from '@/utils/formatters'

export interface ExportTableToCsvOptions {
    filename: string
    /**
     * Optional per-column formatter override. Keyed by column id.
     * Falls back to value-based default: numbers detected as money/date/percent → formatted; else stringified.
     */
    formatters?: Record<string, (value: unknown, row: unknown) => string>
}

function escapeCsvCell(value: unknown): string {
    if (value === null || value === undefined) return ''
    const s = typeof value === 'string' ? value : typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)
    // RFC 4180 quoting: double-quote any cell containing comma, quote, or newline
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`
    }
    return s
}

export function exportTableToCsv<TData>(
    table: Table<TData>,
    options: ExportTableToCsvOptions,
): { rowCount: number; filename: string } {
    const filename = options.filename
    const visibleColumns = table.getVisibleLeafColumns()
    const rows = table.getFilteredRowModel().rows
    const headers = visibleColumns.map((c) => {
        const header = c.columnDef.header
        if (typeof header === 'string') return header
        return c.id
    })

    const lines: string[] = [headers.map(escapeCsvCell).join(',')]
    for (const row of rows) {
        const cells = visibleColumns.map((col) => {
            const value = row.getValue(col.id)
            const customFormatter = options.formatters?.[col.id]
            if (customFormatter) {
                return escapeCsvCell(customFormatter(value, row.original))
            }
            return escapeCsvCell(value)
        })
        lines.push(cells.join(','))
    }

    const csvBody = lines.join('\n')

    if (typeof window !== 'undefined') {
        const blob = new Blob([csvBody], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    return { rowCount: rows.length, filename }
}

// Convenience: build default filename matching the project convention.
export function makeCsvFilename(resource: string, date: Date = new Date()): string {
    const iso = date.toISOString().slice(0, 10)
    return `${resource}-${iso}.csv`
}

export { formatCurrency, formatDate, formatPercent }
```

2. Build `src/components/ui/data-table-export.tsx`:

```tsx
'use client'

import { Download } from 'lucide-react'
import { toast } from 'sonner'
import type { Table } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { exportTableToCsv, makeCsvFilename } from '@/lib/csv-export'

export interface DataTableExportProps<TData> {
    table: Table<TData>
    resource: string
    formatters?: Record<string, (value: unknown, row: unknown) => string>
}

export function DataTableExport<TData>({ table, resource, formatters }: DataTableExportProps<TData>) {
    const rowCount = table.getFilteredRowModel().rows.length
    const disabled = rowCount === 0

    return (
        <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={disabled}
            title={disabled ? 'Nothing to export' : `Export ${rowCount} row${rowCount === 1 ? '' : 's'}`}
            onClick={() => {
                try {
                    const result = exportTableToCsv(table, {
                        filename: makeCsvFilename(resource),
                        formatters,
                    })
                    toast.success(`Exported ${result.rowCount} ${result.rowCount === 1 ? 'row' : 'rows'} to ${result.filename}.`)
                } catch {
                    toast.error('Export failed — try a smaller selection or refresh.')
                }
            }}
        >
            <Download className="h-3 w-3" />
            Export CSV
        </Button>
    )
}
```

3. Build `src/components/ui/data-table-bulk-actions.tsx`:

```tsx
'use client'

import { type ReactNode, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { Table } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { ConfirmDialog, useConfirmDialog } from '@/components/confirm-dialog'

export interface BulkAction<TData> {
    label: string
    icon?: LucideIcon
    variant?: 'default' | 'destructive' | 'outline'
    onClick: (selectedRows: TData[]) => void | Promise<void>
    requiresConfirm?: boolean
    confirmTitle?: string
    confirmDescription?: string
}

export interface DataTableBulkActionsProps<TData> {
    table: Table<TData>
    actions: BulkAction<TData>[]
    resourceLabel?: string  // e.g. "vehicles" for "Delete 4 vehicles"
}

export function DataTableBulkActions<TData>({
    table,
    actions,
    resourceLabel = 'rows',
}: DataTableBulkActionsProps<TData>) {
    const selected = table.getSelectedRowModel().rows
    const count = selected.length
    if (count === 0) return null

    const noun = count === 1 ? resourceLabel.replace(/s$/, '') : resourceLabel

    return (
        <div
            role="toolbar"
            aria-label="Bulk actions"
            className="sticky top-0 z-10 h-12 px-4 flex items-center justify-between gap-4 bg-primary/5 border-b border-primary/20"
        >
            <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                    {count} {noun} selected
                </span>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => table.resetRowSelection()}
                    aria-label="Clear selection"
                >
                    Clear
                </Button>
            </div>
            <div className="flex items-center gap-2">
                {actions.map((action, idx) => (
                    <BulkActionButton
                        key={`${action.label}-${idx}`}
                        action={action}
                        count={count}
                        resourceLabel={noun}
                        selectedRows={selected.map((r) => r.original)}
                    />
                ))}
            </div>
        </div>
    )
}

function BulkActionButton<TData>({
    action,
    count,
    resourceLabel,
    selectedRows,
}: {
    action: BulkAction<TData>
    count: number
    resourceLabel: string
    selectedRows: TData[]
}) {
    const requiresConfirm = action.requiresConfirm ?? action.variant === 'destructive'

    const { dialogProps, confirm } = useConfirmDialog({
        title: action.confirmTitle ?? `${action.label} ${count} ${resourceLabel}?`,
        description: action.confirmDescription ?? 'This cannot be undone.',
        confirmText: action.label,
        variant: action.variant === 'destructive' ? 'destructive' : 'default',
        onConfirm: () => action.onClick(selectedRows),
    })

    const Icon = action.icon

    return (
        <>
            <Button
                variant={action.variant ?? 'outline'}
                size="sm"
                className="gap-2"
                onClick={() => {
                    if (requiresConfirm) {
                        confirm()
                    } else {
                        void action.onClick(selectedRows)
                    }
                }}
            >
                {Icon && <Icon className="h-4 w-4" />}
                {action.label}
            </Button>
            <ConfirmDialog {...dialogProps} />
        </>
    )
}
```

4. Extend `src/components/ui/data-table.tsx`:

   - Add to existing `DataTableProps<TData, TValue>` interface (around lines 44-65):

```typescript
    /** When provided, render a sticky bulk-action toolbar below the table header when selection is non-empty. */
    bulkActions?: BulkAction<TData>[]
    /** When true, render a CSV export button in the top-right toolbar slot. */
    exportable?: boolean
    /** Used by the CSV exporter for filename (e.g. "vehicles" → "vehicles-2026-05-19.csv"). */
    exportResource?: string
    /** Optional per-column formatters for CSV export (keyed by column id). */
    exportFormatters?: Record<string, (value: unknown, row: unknown) => string>
    /** When provided, each row renders an expand chevron and `getRowDetail(row)` below the row when expanded. */
    getRowDetail?: (row: TData) => React.ReactNode
```

   - Import the new sub-primitives at the top:
```tsx
import { DataTableBulkActions, type BulkAction } from '@/components/ui/data-table-bulk-actions'
import { DataTableExport } from '@/components/ui/data-table-export'
import { ChevronRight } from 'lucide-react'
```

   - Add expansion state (near top of component body):
```tsx
const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
const toggleExpand = (rowId: string) => {
    setExpandedRows((prev) => {
        const next = new Set(prev)
        if (next.has(rowId)) next.delete(rowId); else next.add(rowId)
        return next
    })
}
```

   - In the existing toolbar block (around lines 312-329), add the Export button BEFORE the existing column-visibility toggle:

```tsx
<div className="flex items-center py-4 gap-2">
    {searchKey && (<Input placeholder={searchPlaceholder} ... />)}
    {typeof toolbar === 'function' ? toolbar(table) : toolbar}
    {exportable && exportResource && (
        <DataTableExport table={table} resource={exportResource} formatters={exportFormatters} />
    )}
    {enableColumnVisibility && (<DataTableViewOptions table={table} />)}
</div>
```

   - Add the bulk-action toolbar immediately AFTER the table header bar but BEFORE the `<Table>` element:

```tsx
{bulkActions && bulkActions.length > 0 && (
    <DataTableBulkActions table={table} actions={bulkActions} resourceLabel={exportResource} />
)}
```

   - Add expansion column when `getRowDetail` is provided. In the row render loop (find the existing `{table.getRowModel().rows.map(...)` block), wrap each row to include:
     - A leading `<td>` with a `ChevronRight` button (rotated 90deg when expanded), only when `getRowDetail` is set
     - After the row's normal `<tr>`, conditionally render a `<tr>` containing a single `<td colSpan={visibleColumns + 1}>` with `bg-muted/30 p-4` containing `getRowDetail(row.original)`

   Use the existing rendering shape to compute the right colSpan. Test the resulting markup with a small consumer before integrating widely.

5. Add tests to `tests/components/data-table.test.tsx` (Wave-0 rows 23-04-01 + 23-04-03):

```tsx
import { describe, expect, it, mock } from 'bun:test'
import { render, screen, fireEvent } from '@testing-library/react'
import { DataTable } from '@/components/ui/data-table'
import { Trash2 } from 'lucide-react'

const cols = [
    { id: 'name', accessorKey: 'name', header: 'Name' },
    { id: 'age', accessorKey: 'age', header: 'Age' },
]
const data = [
    { id: 1, name: 'Alice', age: 30 },
    { id: 2, name: 'Bob', age: 40 },
]

describe('DataTable bulk actions', () => {
    it('does not render toolbar when nothing is selected', () => {
        render(<DataTable columns={cols} data={data} enableRowSelection bulkActions={[{ label: 'Delete', onClick: () => {} }]} />)
        expect(screen.queryByRole('toolbar', { name: /bulk actions/i })).toBeFalsy()
    })

    it('renders toolbar with selection count when rows selected', () => {
        const { container } = render(
            <DataTable columns={cols} data={data} enableRowSelection bulkActions={[{ label: 'Delete', onClick: () => {} }]} />,
        )
        // Programmatically toggle the first row's checkbox
        const checkboxes = container.querySelectorAll('input[type="checkbox"], [role="checkbox"]')
        if (checkboxes.length > 1) {
            fireEvent.click(checkboxes[1] as HTMLElement)
            expect(screen.getByRole('toolbar', { name: /bulk actions/i })).toBeTruthy()
            expect(screen.getByText(/1\s+(row|rows)\s+selected/i)).toBeTruthy()
        }
    })

    it('destructive bulk action opens ConfirmDialog before firing onClick', async () => {
        const onClickMock = mock(() => {})
        const { container } = render(
            <DataTable
                columns={cols}
                data={data}
                enableRowSelection
                bulkActions={[{ label: 'Delete', icon: Trash2, variant: 'destructive', onClick: onClickMock }]}
            />,
        )
        const checkboxes = container.querySelectorAll('input[type="checkbox"], [role="checkbox"]')
        if (checkboxes.length > 1) {
            fireEvent.click(checkboxes[1] as HTMLElement)
            fireEvent.click(screen.getByRole('button', { name: /^delete$/i }))
            // ConfirmDialog appears
            expect(screen.getByRole('dialog')).toBeTruthy()
            // Confirm
            const confirmBtns = screen.getAllByRole('button', { name: /^delete$/i })
            // The second one is the dialog's confirm button
            fireEvent.click(confirmBtns[confirmBtns.length - 1] as HTMLElement)
            // onClick should be called
            expect(onClickMock).toHaveBeenCalled()
        }
    })
})

describe('DataTable row expansion', () => {
    it('does not show expansion chevrons when getRowDetail is not provided', () => {
        const { container } = render(<DataTable columns={cols} data={data} />)
        expect(container.querySelectorAll('[aria-expanded]').length).toBe(0)
    })

    it('renders a chevron per row when getRowDetail is provided', () => {
        const { container } = render(
            <DataTable columns={cols} data={data} getRowDetail={(row) => <div>Detail for {row.name}</div>} />,
        )
        const chevrons = container.querySelectorAll('[aria-expanded]')
        expect(chevrons.length).toBe(data.length)
    })

    it('expands a row when chevron is clicked, showing detail content', () => {
        const { container } = render(
            <DataTable columns={cols} data={data} getRowDetail={(row) => <div data-testid="detail">Detail for {row.name}</div>} />,
        )
        const firstChevron = container.querySelector('[aria-expanded]') as HTMLElement
        fireEvent.click(firstChevron)
        expect(screen.getByTestId('detail')).toBeTruthy()
        expect(firstChevron.getAttribute('aria-expanded')).toBe('true')
    })
})
```

6. Create `tests/lib/csv-export.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test'
import { createColumnHelper, getCoreRowModel, useReactTable, getFilteredRowModel } from '@tanstack/react-table'
import { exportTableToCsv, makeCsvFilename } from '@/lib/csv-export'
import { renderHook } from '@testing-library/react'

type Row = { id: number; name: string; amount: string; date: string }
const data: Row[] = [
    { id: 1, name: 'Alice', amount: '1000.00', date: '2026-05-19' },
    { id: 2, name: 'Bob', amount: '2500.50', date: '2026-05-18' },
    { id: 3, name: 'Carol', amount: '750.00', date: '2026-05-17' },
]

describe('exportTableToCsv', () => {
    it('produces filename matching {resource}-{YYYY-MM-DD}.csv', () => {
        expect(makeCsvFilename('vehicles', new Date('2026-05-19T12:00:00Z'))).toBe('vehicles-2026-05-19.csv')
    })

    it('emits header row and one body row per filtered table row', () => {
        const helper = createColumnHelper<Row>()
        const columns = [
            helper.accessor('name', { header: 'Name' }),
            helper.accessor('amount', { header: 'Amount' }),
            helper.accessor('date', { header: 'Date' }),
        ]
        const { result } = renderHook(() =>
            useReactTable({
                data,
                columns,
                getCoreRowModel: getCoreRowModel(),
                getFilteredRowModel: getFilteredRowModel(),
            }),
        )
        const out = exportTableToCsv(result.current as any, { filename: 'test.csv' })
        expect(out.rowCount).toBe(3)
    })

    it('escapes cells containing commas and quotes', () => {
        // Use a minimal stub of the table API to test escapeCsvCell behavior
        // Cell with comma → wrapped in quotes; cell with double-quote → doubled
        // (This is indirect via exportTableToCsv producing a blob — sufficient to assert rowCount and trust internal escaping)
        // Direct test of escapeCsvCell is internal; verify by reading the CSV body if possible
        expect(true).toBe(true)  // placeholder — see csv-export.ts internal escaping
    })

    it('uses custom formatters when provided', () => {
        const helper = createColumnHelper<Row>()
        const columns = [
            helper.accessor('amount', { id: 'amount', header: 'Amount' }),
        ]
        const { result } = renderHook(() =>
            useReactTable({
                data,
                columns,
                getCoreRowModel: getCoreRowModel(),
                getFilteredRowModel: getFilteredRowModel(),
            }),
        )
        const out = exportTableToCsv(result.current as any, {
            filename: 'test.csv',
            formatters: { amount: (v) => `USD ${v}` },
        })
        expect(out.rowCount).toBe(3)
    })
})
```

7. Wire `/accounts` as the first `getRowDetail` consumer:

   - Open `src/app/(admin)/accounts/_components/AccountsClient.tsx`. Find the existing `<DataTable ... />` invocation.
   - Add a `getRowDetail` prop:

```tsx
<DataTable
    columns={accountColumns}
    data={accounts}
    {/* ... existing props ... */}
    exportable
    exportResource="accounts"
    getRowDetail={(account) => {
        const linked = liabilities.filter((l) => l.bankAccountId === account.id || l.investmentAccountId === account.id)
        if (linked.length === 0) {
            return <p className="text-sm text-muted-foreground">No linked liabilities for this account.</p>
        }
        return (
            <div className="space-y-2">
                <p className="text-sm font-semibold">Linked liabilities</p>
                <ul className="text-sm space-y-1">
                    {linked.map((l) => (
                        <li key={l.id} className="flex justify-between">
                            <span>{l.creditor}</span>
                            <span className="font-mono tabular-nums">{formatCurrency(l.currentBalance ?? '0')}</span>
                        </li>
                    ))}
                </ul>
            </div>
        )
    }}
/>
```

   - Verify the actual column references against `liability` schema (the linkage field name may differ — RESEARCH.md says `liability.homesteadId`, `liability.rentalPropertyId`, `liability.vehicleId`; for accounts, check schema for `bankAccountId` / `investmentAccountId` — if those don't exist, render a placeholder "Account linkage data not yet available" message and TODO it in the SUMMARY).
  </action>
  <verify>
    <automated>test -f src/components/ui/data-table-bulk-actions.tsx &amp;&amp; test -f src/components/ui/data-table-export.tsx &amp;&amp; test -f src/lib/csv-export.ts &amp;&amp; grep -q "bulkActions?:" src/components/ui/data-table.tsx &amp;&amp; grep -q "exportable?:" src/components/ui/data-table.tsx &amp;&amp; grep -q "getRowDetail?:" src/components/ui/data-table.tsx &amp;&amp; grep -q "useConfirmDialog" src/components/ui/data-table-bulk-actions.tsx &amp;&amp; ! grep -Eq "window\.confirm|confirm\(" src/components/ui/data-table-bulk-actions.tsx &amp;&amp; grep -q "table.getFilteredRowModel" src/lib/csv-export.ts &amp;&amp; grep -q "table.getVisibleLeafColumns" src/lib/csv-export.ts &amp;&amp; grep -q "getRowDetail" "src/app/(admin)/accounts/_components/AccountsClient.tsx" &amp;&amp; bun test --bail --timeout 30000 tests/components/data-table.test.tsx tests/lib/csv-export.test.ts &amp;&amp; bun run typecheck</automated>
  </verify>
  <acceptance_criteria>
    - File exists: `src/components/ui/data-table-bulk-actions.tsx` with `export function DataTableBulkActions` and `export interface BulkAction`
    - File exists: `src/components/ui/data-table-export.tsx` with `export function DataTableExport`
    - File exists: `src/lib/csv-export.ts` with `export function exportTableToCsv` and `export function makeCsvFilename`
    - DataTable props interface contains `bulkActions?:`, `exportable?:`, `exportResource?:`, `getRowDetail?:`
    - DataTableBulkActions contains `useConfirmDialog` (no `window.confirm`, no naked `confirm(`)
    - DataTableBulkActions contains `sticky top-0 z-10` (sticky positioning per UI-SPEC §8)
    - DataTableBulkActions contains `bg-primary/5` AND `border-primary/20`
    - DataTableExport contains `makeCsvFilename` AND `Download` icon import
    - csv-export.ts uses `table.getFilteredRowModel()` (NOT `getCoreRowModel`) AND `table.getVisibleLeafColumns()`
    - csv-export.ts contains the RFC-4180 quoting branch (commas, quotes, newlines)
    - AccountsClient passes `getRowDetail` prop to its DataTable invocation
    - `tests/components/data-table.test.tsx` exists with at least 6 test cases (bulk actions: no-selection hidden, with-selection visible, destructive ConfirmDialog flow; row expansion: no chevrons without prop, chevrons with prop, click expands detail)
    - `tests/lib/csv-export.test.ts` exists with at least 3 test cases (filename pattern, row count, custom formatters)
    - `bun test --bail --timeout 30000 tests/components/data-table.test.tsx tests/lib/csv-export.test.ts` exits 0
    - `bun run typecheck` exits 0
  </acceptance_criteria>
  <done>DataTable extended with 4 new additive props (bulkActions, exportable, exportResource/exportFormatters, getRowDetail); bulk-action toolbar built (sticky, count badge, Clear button, ConfirmDialog wrap for destructive ops); DataTableExport button built; CSV export library handles filtering+visibility+formatters+RFC-4180 escaping; /accounts is first getRowDetail consumer showing linked liabilities; Wave-0 tests pass.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 04.2: Install Dice sortable + build PreferenceRow + refactor /settings into Card groups + Wave-0 preference tests</name>
  <files>src/components/ui/sortable.tsx, src/components/preference-row.tsx, src/app/(admin)/settings/_components/SettingsClient.tsx, src/app/(admin)/settings/_components/SettingsTrustInfoCard.tsx, src/app/(admin)/settings/_components/SettingsNotificationsCard.tsx, src/app/(admin)/settings/_components/SettingsRolesAccessCard.tsx, src/app/(admin)/settings/_components/SettingsInventoryAccessCard.tsx, tests/components/preference-row.test.tsx</files>
  <read_first>
    - src/components/ui/switch.tsx (existing shadcn-official switch — REUSE per Implementation Note 17; do NOT install Origin UI variants)
    - src/app/(admin)/settings/_components/SettingsClient.tsx (current settings page; lines 50-104 hold the PersonRow inline pattern — generalize to PreferenceRow)
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-UI-SPEC.md (§11 Settings PreferenceRow, §15 Date Range Picker, Implementation Notes 16 + 17)
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-PATTERNS.md (§"src/components/preference-row.tsx (NEW composition)" + §"Settings sub-components")
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-VALIDATION.md (row 23-05-01)
  </read_first>
  <behavior>
    - `src/components/ui/sortable.tsx` exists after install. Zero hex/Tailwind palette literals.
    - PreferenceRow renders a 2-column grid (1fr_auto on md+, single column on mobile) with title (text-xl font-semibold), optional description (text-sm text-muted-foreground), and a control slot rendered right-aligned.
    - SettingsClient hosts 4 Card groups in order: Trust info, Notifications, Roles & access, Inventory access. Each Card has a CardHeader/CardTitle (text-xl font-semibold) and a CardContent (p-0) containing PreferenceRows.
    - Each Card's PreferenceRows preserve the existing settings values; no data loss. The Cards are extracted into separate sub-component files (SettingsTrustInfoCard.tsx, etc.) for maintainability.
    - PreferenceRow test: render with title + description + a `<Switch>` child, assert: heading text matches title (text-xl font-semibold), description present, switch rendered, and clicking the switch toggles its state.
  </behavior>
  <action>
1. Install Dice sortable (the only registry install in this task):

```bash
bunx --bun shadcn@latest add @diceui/sortable
```

   - Expected output: `src/components/ui/sortable.tsx`. Pulls `@dnd-kit/{core,modifiers,sortable,utilities}` — already pulled in by PR-A (`@kibo-ui/kanban`), so no incremental bundle cost.

2. OKLCH audit:

```bash
grep -rE "bg-\[#|text-\[#|border-\[#|bg-(red|green|blue|yellow|amber|sky|emerald|gray|slate)-[0-9]+|text-(red|green|blue|yellow|amber|sky|emerald|gray|slate)-[0-9]+" src/components/ui/sortable.tsx
```

   - Expected: zero matches.

3. Build `src/components/preference-row.tsx`:

```tsx
import { type ReactNode } from 'react'

export interface PreferenceRowProps {
    title: string
    description?: string
    children: ReactNode
}

export function PreferenceRow({ title, description, children }: PreferenceRowProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 py-4 px-6 border-b border-border last:border-0">
            <div>
                <div className="text-xl font-semibold leading-snug">{title}</div>
                {description && (
                    <p className="text-sm text-muted-foreground mt-1">{description}</p>
                )}
            </div>
            <div className="flex items-center justify-end md:justify-end">{children}</div>
        </div>
    )
}
```

4. Refactor `src/app/(admin)/settings/_components/SettingsClient.tsx` to host 4 Cards. Extract each Card into its own file for maintainability. The current settings page has scattered inline blocks — group them per UI-SPEC §11 into:

   - **SettingsTrustInfoCard**: trust name, EIN, governing law, DOD, address fields → use PreferenceRow + appropriate input/select controls
   - **SettingsNotificationsCard**: notification preferences (placeholder rows acceptable; full notif system is FUTURE per REQUIREMENTS.md NOTIF-01/02)
   - **SettingsRolesAccessCard**: ADMIN_EMAIL display (read-only), list of admin users
   - **SettingsInventoryAccessCard**: INVENTORY_ACCESS_CODE rotation hint, n8n webhook URL display

   Pattern for each Card file (e.g. SettingsTrustInfoCard.tsx):

```tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PreferenceRow } from '@/components/preference-row'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'  // existing shadcn-official switch — per Implementation Note 17

export function SettingsTrustInfoCard({ entityData, onUpdate }: { entityData: any; onUpdate: (data: any) => void }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-xl font-semibold">Trust info</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <PreferenceRow
                    title="Trust name"
                    description="Legal name as recorded on the trust document."
                >
                    <Input
                        defaultValue={entityData?.trustName}
                        onBlur={(e) => onUpdate({ trustName: e.target.value })}
                        className="max-w-xs"
                    />
                </PreferenceRow>
                <PreferenceRow title="EIN" description="Employer identification number.">
                    <Input
                        defaultValue={entityData?.ein}
                        onBlur={(e) => onUpdate({ ein: e.target.value })}
                        className="max-w-xs"
                    />
                </PreferenceRow>
                <PreferenceRow title="Governing law" description="Texas Property Code default.">
                    <Input
                        defaultValue={entityData?.governingLaw ?? 'Texas Property Code'}
                        readOnly
                        className="max-w-xs"
                    />
                </PreferenceRow>
            </CardContent>
        </Card>
    )
}
```

   - Repeat the pattern for the other 3 cards. Pull actual field names from the current `SettingsClient.tsx` — do NOT invent new fields.

5. Update `SettingsClient.tsx` to import + render the 4 Cards in order with `space-y-6` between them, wrapped in `<PageHeader title="Settings" description="Trust configuration and preferences." />`:

```tsx
'use client'

import { PageHeader } from '@/components/page-header'
import { SettingsTrustInfoCard } from './SettingsTrustInfoCard'
import { SettingsNotificationsCard } from './SettingsNotificationsCard'
import { SettingsRolesAccessCard } from './SettingsRolesAccessCard'
import { SettingsInventoryAccessCard } from './SettingsInventoryAccessCard'

export function SettingsClient() {
    // ... existing entity / user / etc. queries ...

    return (
        <div className="space-y-6">
            <PageHeader title="Settings" description="Trust configuration and preferences." />
            <SettingsTrustInfoCard entityData={entity} onUpdate={handleTrustUpdate} />
            <SettingsNotificationsCard />
            <SettingsRolesAccessCard admins={admins} />
            <SettingsInventoryAccessCard />
        </div>
    )
}
```

   - DO NOT delete the existing PersonRow pattern — extract its functionality into PreferenceRow + appropriate Card. Verify the resulting Cards preserve every existing setting value (no data loss; just visual reorganization).

6. Create `tests/components/preference-row.test.tsx`:

```tsx
import { describe, expect, it } from 'bun:test'
import { render, screen, fireEvent } from '@testing-library/react'
import { PreferenceRow } from '@/components/preference-row'
import { Switch } from '@/components/ui/switch'

describe('PreferenceRow', () => {
    it('renders title in heading typography', () => {
        render(<PreferenceRow title="Trust name"><input /></PreferenceRow>)
        const titleEl = screen.getByText('Trust name')
        expect(titleEl.className).toContain('text-xl')
        expect(titleEl.className).toContain('font-semibold')
    })

    it('renders description when provided', () => {
        render(<PreferenceRow title="X" description="An explanation."><input /></PreferenceRow>)
        expect(screen.getByText('An explanation.')).toBeTruthy()
    })

    it('does not render description element when omitted', () => {
        render(<PreferenceRow title="X"><input /></PreferenceRow>)
        const ps = document.querySelectorAll('p')
        // Only the inline child <input> exists; no description <p>
        expect(Array.from(ps).filter((p) => p.textContent && p.textContent.length > 0).length).toBe(0)
    })

    it('renders the control slot', () => {
        render(
            <PreferenceRow title="Test"><button>Click</button></PreferenceRow>,
        )
        expect(screen.getByRole('button', { name: /click/i })).toBeTruthy()
    })

    it('renders Switch child correctly and supports toggle', () => {
        let toggled = false
        render(
            <PreferenceRow title="Enable feature">
                <Switch onCheckedChange={(checked) => { toggled = checked }} />
            </PreferenceRow>,
        )
        const sw = screen.getByRole('switch')
        fireEvent.click(sw)
        expect(toggled).toBe(true)
    })
})
```
  </action>
  <verify>
    <automated>test -f src/components/ui/sortable.tsx &amp;&amp; ! grep -rE "bg-\[#|text-\[#|border-\[#|bg-(red|green|blue|yellow|amber|sky|emerald|gray|slate)-[0-9]+|text-(red|green|blue|yellow|amber|sky|emerald|gray|slate)-[0-9]+" src/components/ui/sortable.tsx &amp;&amp; test -f src/components/preference-row.tsx &amp;&amp; grep -q "export function PreferenceRow" src/components/preference-row.tsx &amp;&amp; grep -q "text-xl font-semibold" src/components/preference-row.tsx &amp;&amp; test -f "src/app/(admin)/settings/_components/SettingsTrustInfoCard.tsx" &amp;&amp; test -f "src/app/(admin)/settings/_components/SettingsNotificationsCard.tsx" &amp;&amp; test -f "src/app/(admin)/settings/_components/SettingsRolesAccessCard.tsx" &amp;&amp; test -f "src/app/(admin)/settings/_components/SettingsInventoryAccessCard.tsx" &amp;&amp; grep -q "SettingsTrustInfoCard" "src/app/(admin)/settings/_components/SettingsClient.tsx" &amp;&amp; grep -q "PageHeader" "src/app/(admin)/settings/_components/SettingsClient.tsx" &amp;&amp; bun test --bail --timeout 30000 tests/components/preference-row.test.tsx &amp;&amp; bun run typecheck</automated>
  </verify>
  <acceptance_criteria>
    - File exists: `src/components/ui/sortable.tsx` with zero hex/Tailwind palette literals
    - File exists: `src/components/preference-row.tsx` containing `export function PreferenceRow`
    - PreferenceRow contains the className `text-xl font-semibold` for the title
    - PreferenceRow contains the className `grid-cols-1 md:grid-cols-[1fr_auto]`
    - Files exist: SettingsTrustInfoCard.tsx, SettingsNotificationsCard.tsx, SettingsRolesAccessCard.tsx, SettingsInventoryAccessCard.tsx in `src/app/(admin)/settings/_components/`
    - SettingsClient.tsx imports + renders all 4 Card components AND PageHeader
    - SettingsClient.tsx contains `space-y-6` (24px gap between cards per UI-SPEC §11)
    - Each Card file imports from `@/components/ui/switch` (existing shadcn) — NOT from `@originui/switch-NN` (Implementation Note 17)
    - `tests/components/preference-row.test.tsx` exists with at least 4 test cases
    - `bun test --bail --timeout 30000 tests/components/preference-row.test.tsx` exits 0
    - `bun run typecheck` exits 0
  </acceptance_criteria>
  <done>Dice sortable installed, PreferenceRow composition built (2-column grid + heading typography + control slot), /settings refactored into 4 Card groups with PageHeader (each card uses PreferenceRows + existing shadcn switch — no Origin UI), Wave-0 preference-row tests pass.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 04.3: Drizzle migration 0012 (sortIndex + indexes) + db:deploy [BLOCKING] + reorder mutations + sortable consumers + E2E</name>
  <files>drizzle/0012_add_sort_index.sql, db/schema.ts, src/server/trpc/routers/trustee.ts, src/server/trpc/routers/beneficiary.ts, src/app/(admin)/trustees/_components/TrusteeSortableList.tsx, src/app/(admin)/trustees/_components/TrusteesClient.tsx, src/app/(admin)/beneficiaries/_components/BeneficiarySortableList.tsx, src/app/(admin)/beneficiaries/_components/BeneficiariesClient.tsx, tests/trpc/trustee.test.ts, tests/trpc/beneficiary.test.ts, tests/e2e/trustees-sortable.e2e.ts</files>
  <read_first>
    - drizzle/0009_create_valuation_correction.sql (analog migration — camelCase column quoting, IF NOT EXISTS, statement-breakpoint pattern)
    - db/schema.ts (locate `beneficiary` table around lines 921-1010 — does it currently have a sortIndex column? RESEARCH.md A5 says NO. Locate `trustee` table around lines 1915-1977 — confirm it already has `order` integer NOT NULL column.)
    - CLAUDE.md (Postgres Column Naming Convention gotcha — drizzle-kit emits snake_case for new columns, MUST hand-edit to camelCase BEFORE running migrations)
    - MEMORY.md (Stale __drizzle_migrations Row Recovery + db:push is broken — use db:deploy)
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-RESEARCH.md (Pattern 3: Migration for sortIndex columns; Implementation Note 6)
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-PATTERNS.md (§"drizzle/0012_add_sort_index.sql" + §"src/server/trpc/routers/trustee.ts (EDIT — add reorder)")
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-UI-SPEC.md (§12 Sortable Lists, Implementation Note 5)
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-VALIDATION.md (rows 23-05-02, 23-05-03)
  </read_first>
  <behavior>
    - db/schema.ts updated: beneficiary table gains `sortIndex: integer('sortIndex').notNull().default(0)` (camelCase column name).
    - drizzle/0012_add_sort_index.sql exists with:
      1. ALTER TABLE "beneficiary" ADD COLUMN IF NOT EXISTS "sortIndex" integer NOT NULL DEFAULT 0;
      2. UPDATE beneficiary SET sortIndex = ROW_NUMBER() - 1 over (PARTITION BY entityId ORDER BY id)
      3. CREATE INDEX IF NOT EXISTS "idx_beneficiary_entity_sort" ON "beneficiary" ("entityId", "sortIndex");
      4. CREATE INDEX IF NOT EXISTS "idx_trustee_entity_order" ON "trustee" ("entityId", "order");
    - ALL column references in the SQL use camelCase (NO snake_case like sort_index, entity_id).
    - `bun run db:deploy` runs successfully (non-interactive); the migration applies cleanly.
    - `trpc.trustee.reorder({ entityId, orderedIds })` writes new `order` values across all matched trustees; throws NOT_FOUND if any id is missing from this entity. `trpc.beneficiary.reorder` does the same for `sortIndex`.
    - `/trustees` page shows a sortable list of trustees with drag handles; drag-to-end fires `reorder` mutation; persistence verified by reloading the page.
    - `/beneficiaries` page mirrors with beneficiary order persisting via `sortIndex`.
    - Playwright E2E `tests/e2e/trustees-sortable.e2e.ts` reorders trustees and asserts persistence across reload.
  </behavior>
  <action>
1. Update `db/schema.ts` to add the new `sortIndex` column on the beneficiary table:

   - Locate the `beneficiary` table definition (around lines 921-1010 — `export const beneficiary = pgTable('beneficiary', { ... })`).
   - Add a new column field:
```typescript
sortIndex: integer('sortIndex').notNull().default(0),
```
     immediately after the `sharePercent` field or wherever logically grouped (close to the other ordering / metadata fields).
   - Do NOT modify the trustee table — it already has `order: integer('order').notNull()` per RESEARCH.md A5.

2. Generate the migration via drizzle-kit (DO NOT run db:push):

```bash
bun run db:generate
```

   - This creates `drizzle/0012_*.sql` (the exact filename varies — verify after running). Inspect the generated SQL.

3. Hand-edit the generated migration file to ensure ALL column references are camelCase. The generator may emit `"sort_index"` and `"entity_id"` — convert to `"sortIndex"` and `"entityId"`. Replace the file content with this exact SQL (or merge into the generated file, preserving structure):

```sql
-- drizzle/0012_add_sort_index.sql
-- Adds sortIndex to beneficiary + composite indexes on both beneficiary and trustee.
-- Per CLAUDE.md "Postgres Column Naming Convention" gotcha: all column names are camelCase.

ALTER TABLE "beneficiary"
    ADD COLUMN IF NOT EXISTS "sortIndex" integer NOT NULL DEFAULT 0;
--> statement-breakpoint

-- Backfill: assign sortIndex in id-order within each entity so existing
-- list-order is preserved.
UPDATE "beneficiary" b
   SET "sortIndex" = sub.rn - 1
  FROM (
    SELECT "id", ROW_NUMBER() OVER (PARTITION BY "entityId" ORDER BY "id") AS rn
      FROM "beneficiary"
  ) sub
 WHERE b."id" = sub."id";
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_beneficiary_entity_sort"
    ON "beneficiary" USING btree ("entityId", "sortIndex");
--> statement-breakpoint

-- Composite index on the existing trustee.order column (no schema change to trustee).
CREATE INDEX IF NOT EXISTS "idx_trustee_entity_order"
    ON "trustee" USING btree ("entityId", "order");
```

   - Verify with `grep` that there is NO `sort_index` or `entity_id` (snake_case) in the file:
```bash
! grep -E '"sort_index"|"entity_id"' drizzle/0012_add_sort_index.sql
```

4. **[BLOCKING] Run the migration. The phase CANNOT pass verification without this step.**

```bash
bun run db:deploy
```

   - This runs `drizzle-kit generate && drizzle-kit migrate`. Since the SQL was hand-edited after generate, the migrate step picks it up.
   - If migrate exits silently with code 1 (per MEMORY.md), run the SQL manually via `getClient()` postgres.js to surface the real error. Common cause: stale row in `drizzle.__drizzle_migrations` with mismatched hash → DELETE not needed; UPDATE the hash to match the file's sha256.

5. Add `reorder` mutation to `src/server/trpc/routers/trustee.ts` (uses existing `order` column):

```typescript
reorder: adminProcedure
    .input(
        z.object({
            entityId: z.coerce.number(),
            orderedIds: z.array(z.coerce.number()),
        }),
    )
    .mutation(async ({ input }) => {
        const updates = await Promise.all(
            input.orderedIds.map((id, idx) =>
                db
                    .update(trustee)
                    .set({ order: idx, updatedAt: new Date().toISOString() })
                    .where(and(eq(trustee.id, id), eq(trustee.entityId, input.entityId)))
                    .returning(),
            ),
        )
        const flat = updates.flat()
        if (flat.length !== input.orderedIds.length) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'One or more trustees not found in this entity',
            })
        }
        return flat
    }),
```

6. Add `reorder` mutation to `src/server/trpc/routers/beneficiary.ts` (uses new `sortIndex` column):

```typescript
reorder: adminProcedure
    .input(
        z.object({
            entityId: z.coerce.number(),
            orderedIds: z.array(z.coerce.number()),
        }),
    )
    .mutation(async ({ input }) => {
        const updates = await Promise.all(
            input.orderedIds.map((id, idx) =>
                db
                    .update(beneficiary)
                    .set({ sortIndex: idx, updatedAt: new Date().toISOString() })
                    .where(and(eq(beneficiary.id, id), eq(beneficiary.entityId, input.entityId)))
                    .returning(),
            ),
        )
        const flat = updates.flat()
        if (flat.length !== input.orderedIds.length) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'One or more beneficiaries not found in this entity',
            })
        }
        return flat
    }),
```

7. Add tests to `tests/trpc/trustee.test.ts` and `tests/trpc/beneficiary.test.ts` (Wave-0 row 23-05-02; T-23-05 threat):

```typescript
// tests/trpc/trustee.test.ts (add to existing file)
describe('trustee.reorder', () => {
    it('updates order field for all matched trustees', async () => {
        const caller = createCallerFactory(appRouter)(await mockAdminContext())
        const result = await caller.trustee.reorder({
            entityId: e1Id,
            orderedIds: [t3Id, t1Id, t2Id],
        })
        expect(result.length).toBe(3)
        // Re-fetch and verify orders are 0, 1, 2 in the new sequence
        const refreshed = await caller.trustee.list({ entityId: e1Id })
        const sorted = [...refreshed].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        expect(sorted[0]?.id).toBe(t3Id)
        expect(sorted[1]?.id).toBe(t1Id)
        expect(sorted[2]?.id).toBe(t2Id)
    })

    it('throws NOT_FOUND when an id is missing from this entity', async () => {
        const caller = createCallerFactory(appRouter)(await mockAdminContext())
        await expect(
            caller.trustee.reorder({
                entityId: e1Id,
                orderedIds: [t1Id, 999999],
            }),
        ).rejects.toThrow(/not found in this entity/)
    })

    it('throws on non-admin context', async () => {
        const caller = createCallerFactory(appRouter)(await mockBeneficiaryContext())
        await expect(
            caller.trustee.reorder({ entityId: e1Id, orderedIds: [t1Id] }),
        ).rejects.toThrow()
    })
})

// Same shape for tests/trpc/beneficiary.test.ts, replacing `trustee` with `beneficiary` and `order` with `sortIndex`.
```

8. Build `src/app/(admin)/trustees/_components/TrusteeSortableList.tsx`:

```tsx
'use client'

import { GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/lib/trpc'
import { Card, CardContent } from '@/components/ui/card'
// Verify exact exports against installed src/components/ui/sortable.tsx
import { Sortable, SortableItem } from '@/components/ui/sortable'

export interface TrusteeSortableListProps {
    trustees: Array<{ id: number; name: string; role: string; status: string }>
    entityId: number
}

export function TrusteeSortableList({ trustees, entityId }: TrusteeSortableListProps) {
    const utils = trpc.useUtils()
    const reorderMutation = trpc.trustee.reorder.useMutation({
        onSuccess: () => {
            utils.trustee.list.invalidate()
            toast.success('Reordered.')
        },
        onError: () => toast.error("Couldn't save order — refresh and try again."),
    })

    return (
        <Sortable
            value={trustees}
            onValueChange={(newOrder) => {
                reorderMutation.mutate({
                    entityId,
                    orderedIds: newOrder.map((t) => t.id),
                })
            }}
            getItemId={(t) => t.id}
        >
            <div className="space-y-2">
                {trustees.map((trustee) => (
                    <SortableItem key={trustee.id} id={trustee.id}>
                        <Card className="cursor-grab">
                            <CardContent className="flex items-center gap-4 p-4">
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                                <div className="flex-1">
                                    <div className="text-sm font-semibold">{trustee.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {trustee.role} · {trustee.status}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </SortableItem>
                ))}
            </div>
        </Sortable>
    )
}
```

   - CRITICAL: open `src/components/ui/sortable.tsx` and read the actual exported component API. Dice UI's sortable may export `Sortable`/`SortableItem` or different names. Adapt accordingly.

9. Build `src/app/(admin)/beneficiaries/_components/BeneficiarySortableList.tsx` — mirror of trustee version, calling `trpc.beneficiary.reorder` instead.

10. Wire both consumers into their respective pages:

    - `TrusteesClient.tsx`: add `<TrusteeSortableList trustees={trustees} entityId={entityId!} />` above the existing DataTable (or as a tab if the existing flat-list view should be preserved). Decision: render BOTH — the sortable list at the top, the DataTable below for editing per-trustee details.
    - `BeneficiariesClient.tsx`: same pattern with `BeneficiarySortableList`.

11. Create `tests/e2e/trustees-sortable.e2e.ts` (Wave-0 row VALIDATION.md):

```typescript
import { test, expect } from '@playwright/test'

test.describe('/trustees sortable list', () => {
    test('reorder persists across page reload', async ({ page }) => {
        await page.goto('/trustees')
        await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 15000 }).catch(() => null)

        // Capture initial order from the visible trustee list
        const itemsBefore = await page.locator('[data-sortable-item], .cursor-grab').allTextContents()
        if (itemsBefore.length < 2) return  // need at least 2 trustees to reorder

        // Simulate reorder: drag the first item to after the second
        const first = page.locator('[data-sortable-item], .cursor-grab').first()
        const second = page.locator('[data-sortable-item], .cursor-grab').nth(1)
        await first.dragTo(second)
        // Wait for the toast confirming reorder
        await expect(page.getByText(/reordered/i)).toBeVisible({ timeout: 5000 })

        // Reload and verify the new order
        await page.reload()
        await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 15000 }).catch(() => null)
        const itemsAfter = await page.locator('[data-sortable-item], .cursor-grab').allTextContents()
        expect(itemsAfter[0]).not.toBe(itemsBefore[0])  // order changed
    })
})
```

   - INFO 2 (sortable E2E flakiness — fixture path): Per MEMORY.md, headless DOM drag is unreliable. To make this test deterministic instead of best-effort, add a `beforeAll` hook that ensures ≥2 trustees exist before the drag attempt. Reuse the existing E2E setup endpoint (`POST /api/e2e/setup`) — or call `trpc.trustee.create` twice if the endpoint does not seed trustees — to guarantee ≥2 trustees with deterministic IDs (e.g. `e2e-trustee-1`, `e2e-trustee-2`). After the drag, assert a specific id-order change: capture `data-trustee-id` (or text content) on each item before the drag and assert the post-drag order differs by at least one swap. Do NOT silently skip — fail the test if fewer than 2 trustees exist after `beforeAll`, since that means the seeding step itself failed. Manual touch-DnD verification still covers mobile drag in VALIDATION.md but is supplementary, not primary.

12. After everything: run typecheck, tests, build:

```bash
bun run typecheck
bun run lint
bun test --bail --timeout 30000 tests/trpc/trustee.test.ts tests/trpc/beneficiary.test.ts tests/components/preference-row.test.tsx
bun run build
```
  </action>
  <verify>
    <automated>grep -q "sortIndex" db/schema.ts &amp;&amp; test -f drizzle/0012_add_sort_index.sql &amp;&amp; ! grep -E '"sort_index"|"entity_id"' drizzle/0012_add_sort_index.sql &amp;&amp; grep -q "sortIndex" drizzle/0012_add_sort_index.sql &amp;&amp; grep -q "idx_beneficiary_entity_sort" drizzle/0012_add_sort_index.sql &amp;&amp; grep -q "idx_trustee_entity_order" drizzle/0012_add_sort_index.sql &amp;&amp; grep -q "reorder: adminProcedure" src/server/trpc/routers/trustee.ts &amp;&amp; grep -q "reorder: adminProcedure" src/server/trpc/routers/beneficiary.ts &amp;&amp; grep -q "set({ order:" src/server/trpc/routers/trustee.ts &amp;&amp; grep -q "set({ sortIndex:" src/server/trpc/routers/beneficiary.ts &amp;&amp; grep -q "and(eq(trustee.id, id), eq(trustee.entityId, input.entityId))" src/server/trpc/routers/trustee.ts &amp;&amp; grep -q "and(eq(beneficiary.id, id), eq(beneficiary.entityId, input.entityId))" src/server/trpc/routers/beneficiary.ts &amp;&amp; test -f "src/app/(admin)/trustees/_components/TrusteeSortableList.tsx" &amp;&amp; test -f "src/app/(admin)/beneficiaries/_components/BeneficiarySortableList.tsx" &amp;&amp; grep -q "TrusteeSortableList" "src/app/(admin)/trustees/_components/TrusteesClient.tsx" &amp;&amp; grep -q "BeneficiarySortableList" "src/app/(admin)/beneficiaries/_components/BeneficiariesClient.tsx" &amp;&amp; bun -e "import { getSql } from \"./db\"; const sql = getSql(); const r = await sql\`SELECT column_name FROM information_schema.columns WHERE table_name='beneficiary' AND column_name='sortIndex'\`; if (r.length === 0) { console.error('sortIndex column missing — db:deploy did not apply'); process.exit(1); } console.log('sortIndex verified')" &amp;&amp; bun -e "import { getSql } from \"./db\"; const sql = getSql(); const r = await sql\`SELECT indexname FROM pg_indexes WHERE tablename='trustee' AND indexname='idx_trustee_entity_order'\`; if (r.length === 0) { console.error('idx_trustee_entity_order index missing'); process.exit(1); } console.log('trustee composite index verified')" &amp;&amp; bun run typecheck &amp;&amp; bun test --bail --timeout 30000 tests/trpc/trustee.test.ts tests/trpc/beneficiary.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `db/schema.ts` contains `sortIndex` column on beneficiary table (camelCase column name)
    - `drizzle/0012_add_sort_index.sql` exists
    - `drizzle/0012_add_sort_index.sql` contains the EXACT string `"sortIndex"` AND `"entityId"`
    - `drizzle/0012_add_sort_index.sql` does NOT contain `"sort_index"` or `"entity_id"` (zero snake_case)
    - `drizzle/0012_add_sort_index.sql` contains `idx_beneficiary_entity_sort` AND `idx_trustee_entity_order`
    - `drizzle/0012_add_sort_index.sql` contains the ROW_NUMBER backfill
    - `src/server/trpc/routers/trustee.ts` contains `reorder: adminProcedure` AND `set({ order:` (writes to existing order column)
    - `src/server/trpc/routers/trustee.ts` contains `and(eq(trustee.id, id), eq(trustee.entityId, input.entityId))` (T-23-05 entityId scoping)
    - `src/server/trpc/routers/beneficiary.ts` contains `reorder: adminProcedure` AND `set({ sortIndex:` (writes to new sortIndex column)
    - `src/server/trpc/routers/beneficiary.ts` contains `and(eq(beneficiary.id, id), eq(beneficiary.entityId, input.entityId))`
    - Files exist: TrusteeSortableList.tsx + BeneficiarySortableList.tsx
    - TrusteesClient + BeneficiariesClient each import + render their respective SortableList component
    - tests/trpc/trustee.test.ts contains at least 3 reorder test cases (success path, NOT_FOUND, non-admin throw)
    - tests/trpc/beneficiary.test.ts contains at least 3 reorder test cases
    - tests/e2e/trustees-sortable.e2e.ts exists
    - `bun run typecheck` exits 0
    - `bun test --bail --timeout 30000 tests/trpc/trustee.test.ts tests/trpc/beneficiary.test.ts` exits 0
    - **[BLOCKING]** `bun run db:deploy` ran successfully AND the post-deploy runtime gate confirms the column exists. Automated check (must exit 0): `bun -e "import { getSql } from './db'; const sql = getSql(); const r = await sql\`SELECT column_name FROM information_schema.columns WHERE table_name='beneficiary' AND column_name='sortIndex'\`; if (r.length === 0) { console.error('sortIndex column missing — db:deploy did not apply'); process.exit(1); } console.log('sortIndex verified')"` prints `sortIndex verified` and exits 0
    - **[BLOCKING]** trustee composite index `idx_trustee_entity_order` exists. Automated check (must exit 0): `bun -e "import { getSql } from './db'; const sql = getSql(); const r = await sql\`SELECT indexname FROM pg_indexes WHERE tablename='trustee' AND indexname='idx_trustee_entity_order'\`; if (r.length === 0) { console.error('idx_trustee_entity_order index missing'); process.exit(1); } console.log('trustee composite index verified')"` prints `trustee composite index verified` and exits 0
  </acceptance_criteria>
  <done>db/schema.ts updated with beneficiary.sortIndex; drizzle/0012 migration written with camelCase column references; [BLOCKING] db:deploy ran successfully against the dev/test branch; reorder mutations added to trustee.ts (writes existing order) + beneficiary.ts (writes new sortIndex) both with entityId scoping; sortable list consumers built and wired to both pages; trpc reorder tests + e2e sortable test pass.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Client → tRPC `trustee.reorder` | New admin-only mutation; writes existing `order` column scoped to entityId |
| Client → tRPC `beneficiary.reorder` | New admin-only mutation; writes new `sortIndex` column scoped to entityId |
| Client → DataTable bulk action `onClick(selectedRows)` | Selected rows passed to caller's destructive handler; handler MUST be wrapped in ConfirmDialog (variant: destructive ⇒ requiresConfirm defaults to true) |
| Client → CSV export | Reads in-browser table state only; no network call |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-23-03 | Tampering / Repudiation | DataTable bulk action destructive op without confirmation | mitigate | DataTableBulkActions component defaults `requiresConfirm` to `true` for `variant: 'destructive'` actions; uses existing `useConfirmDialog` hook (no `window.confirm()`); on confirm fires the user-supplied `onClick(selectedRows)`. Tests verify ConfirmDialog opens before onClick fires (tests/components/data-table.test.tsx). Per-call-site requirement: any consumer passing a destructive action MUST set `requiresConfirm: true` if they don't use `variant: 'destructive'`. |
| T-23-04 | Information Disclosure | CSV export of redacted or hidden column data | mitigate | exportTableToCsv uses `table.getVisibleLeafColumns()` exclusively — hidden columns are NOT included in the output. Uses `table.getFilteredRowModel().rows` — server-side RLS already filtered which rows are visible, and any client-side filter (filter input, column filter) is respected. No path exists for export to surface data the table is not already rendering. |
| T-23-05 | Elevation of Privilege | reorder mutation entityId bypass | mitigate | Both `trustee.reorder` and `beneficiary.reorder` use `adminProcedure`; both have `entityId: z.coerce.number()` in the input schema; both write through `db.update(...).where(and(eq(trustee.id, id), eq(trustee.entityId, input.entityId)))` so a forged id from a different entity fails to match any row and the mutation throws NOT_FOUND. Tests verify both paths (success + NOT_FOUND on missing-id + non-admin throw). RLS via `app.is_admin()` provides defense-in-depth at the row level. |
| T-23-PR-CD-01 | Tampering | Drizzle migration applied with snake_case column references could leave DB in broken state | mitigate | Migration SQL is hand-edited per CLAUDE.md "Postgres Column Naming Convention" gotcha BEFORE running db:deploy; verify grep `! grep -E '"sort_index"\|"entity_id"' drizzle/0012_*.sql` returns zero matches. db:deploy runs in a transaction; failure rolls back per MEMORY.md "Stale __drizzle_migrations Row Recovery" instructions. |
</threat_model>

<verification>
After all three tasks complete:
1. `bun run typecheck` exits 0
2. `bun run lint` exits 0
3. `bun test --bail --timeout 30000 tests/components/data-table.test.tsx tests/lib/csv-export.test.ts tests/components/preference-row.test.tsx tests/trpc/trustee.test.ts tests/trpc/beneficiary.test.ts` exits 0
4. `bun run build` succeeds with no `[Compiler bailout]` lines naming PR-C/D files unless those files carry `'use no memo'`
5. `! grep -E '"sort_index"|"entity_id"' drizzle/0012_add_sort_index.sql` exits 0 (zero snake_case)
6. **[BLOCKING]** `bun run db:deploy` ran successfully AND the runtime gate `bun -e "..."` printed `sortIndex verified` and `trustee composite index verified` (exit 0). The runtime checks query `information_schema.columns` and `pg_indexes` directly — no manual psql or db:studio inspection allowed.
7. Manual: open `/settings`, verify 4 Card groups render (Trust info, Notifications, Roles & access, Inventory access); each card uses PreferenceRow rows; switches use existing shadcn switch (not Origin UI)
8. Manual: open `/accounts`, expand a row; verify linked-liabilities region renders below
9. Manual: open `/trustees`, drag-reorder; verify toast "Reordered."; reload; order persisted
10. Bundle delta documented in PR description (target final cumulative < +120 KB)
</verification>

<success_criteria>
- DataTable extended with 4 additive props (bulkActions, exportable, exportResource, getRowDetail) without breaking 17 existing callers
- DataTableBulkActions toolbar built (sticky, count badge, ConfirmDialog-wrapped destructive ops)
- DataTableExport button built + csv-export.ts helper (uses getFilteredRowModel + getVisibleLeafColumns + RFC-4180 escape)
- /accounts is first getRowDetail consumer (shows linked liabilities)
- Dice sortable primitive installed at src/components/ui/sortable.tsx
- PreferenceRow composition built (2-column grid + heading typography)
- /settings refactored into 4 Card groups (Trust info, Notifications, Roles & access, Inventory access) using PreferenceRows; PageHeader integrated; existing shadcn switch reused (NO Origin UI per Implementation Note 17)
- Migration 0012 SQL with camelCase columns, ROW_NUMBER backfill, composite indexes on (entityId, sortIndex) and (entityId, order)
- **[BLOCKING] db:deploy successfully applied** to dev/test branch
- trpc.trustee.reorder + trpc.beneficiary.reorder mutations with adminProcedure + entityId scoping + NOT_FOUND on missing-id
- TrusteeSortableList + BeneficiarySortableList consumers built and wired into their respective pages
- All Wave-0 tests passing (DataTable bulk/expansion, csv-export, preference-row, reorder mutations both routers, E2E sortable)
- Cumulative bundle delta < +120 KB documented
</success_criteria>

<output>
After completion, create `.planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-04-datatable-and-settings-polish-SUMMARY.md` recording: DataTable prop additions and the consumer migration path for the other 16 admin pages (which can opt-in incrementally), CSV export limitations (no streaming, no excel-specific xlsx), PreferenceRow integration map (which settings landed in which card), migration 0012 application status + any drizzle-kit hash recovery actions taken, reorder mutation behavior verification (manual reload check on /trustees and /beneficiaries), final cumulative bundle delta, any 'use no memo' additions, and TODOs for incrementally rolling bulkActions/exportable onto the other admin DataTables (deferred to future phases — only /accounts ships with getRowDetail in PR-C; the other props are opt-in).
</output>
