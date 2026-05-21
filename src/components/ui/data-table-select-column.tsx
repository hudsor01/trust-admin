'use client'

/**
 * Shared select-column helper for DataTable bulk-action consumers.
 *
 * The phase-23 DataTable wires `enableRowSelection` *state* and a sticky
 * bulk-action toolbar (`DataTableBulkActions`), but ships no UI for the user
 * to select rows. This factory fills that gap: spread `selectColumn()` as the
 * first entry of a table's `columns` array and pass `enableRowSelection` to
 * render a header "select all" checkbox plus a per-row checkbox, both bound to
 * TanStack's row-selection API. The bulk-action toolbar reads the same
 * `rowSelection` state via `getSelectedRowModel()`.
 *
 * The column carries `id: 'select'` and no exportable data. `enableHiding:
 * false` only removes it from the column-visibility *menu* — it stays visible,
 * so `csv-export.ts` filters `id === 'select'` explicitly to keep it out of
 * exports.
 */
import type { ColumnDef } from '@tanstack/react-table'
import { Checkbox } from '@/components/ui/checkbox'

/**
 * Returns a `ColumnDef` rendering a selection checkbox column. Place it as the
 * first column of a DataTable used with `enableRowSelection` (and, optionally,
 * `bulkActions`).
 */
export function selectColumn<TData>(): ColumnDef<TData, unknown> {
    return {
        id: 'select',
        size: 40,
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        header: ({ table }) => (
            <Checkbox
                checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && 'indeterminate')
                }
                onCheckedChange={(value) =>
                    table.toggleAllPageRowsSelected(!!value)
                }
                aria-label="Select all rows"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
                // Prevent a select click from also firing the table's
                // onRowClick handler on row-clickable tables.
                onClick={(e) => e.stopPropagation()}
            />
        ),
    }
}
