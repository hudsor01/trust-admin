'use client'

import type { Table } from '@tanstack/react-table'
import { Download } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { exportRowsToCsv } from '@/lib/csv'
import type { AssetRow } from '@/server/trpc/routers/asset'
import { KIND_LABELS } from './_labels'

const HEADERS = [
    'ID',
    'Name',
    'Description',
    'Type',
    'Category',
    'Value',
    'Status',
    'Updated',
] as const

function toRow(asset: AssetRow): (string | number | null)[] {
    return [
        asset.id,
        asset.name,
        asset.description ?? '',
        KIND_LABELS[asset.kind],
        asset.category,
        // Pass the raw Postgres numeric string straight through — Excel
        // parses it as a number. Formatting (e.g. $12,500.00) would force
        // text typing and break SUM().
        asset.value ?? '',
        asset.status,
        asset.updatedAt.slice(0, 10),
    ]
}

// Local date in YYYY-MM-DD, not UTC — a user clicking Export at 10 PM
// Central time would otherwise get tomorrow's date in the filename.
function todayLocalIso(): string {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

export function ExportAssetsButton({ table }: { table: Table<AssetRow> }) {
    // Destructure the state slices the disabled prop depends on. Browser-
    // tested observation: when the filter narrowed the table to zero rows,
    // the table body correctly showed the empty state and the click-time
    // row-model read returned zero, but the render-time read returned a
    // stale non-zero count — leaving `disabled` false. The pattern is a
    // TanStack v8 memo-ordering edge case where the row-model getter
    // returns a cached value tied to the prior render's state. Driving
    // the disabled count through a useMemo whose deps are explicit state
    // slices forces a recompute on every render where filter/sort state
    // changed, sidestepping the stale-cache window. `getFilteredRowModel`
    // is preferred over `getSortedRowModel` here — fewer memo layers
    // between state and row count.
    const { columnFilters, globalFilter, sorting } = table.getState()
    const filteredRowCount = useMemo(
        () => table.getFilteredRowModel().rows.length,
        [table, columnFilters, globalFilter, sorting],
    )
    const disabled = filteredRowCount === 0

    return (
        <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={disabled}
            onClick={() => {
                // Re-read at click time. `getSortedRowModel` here (not
                // `getFilteredRowModel`) so the exported CSV respects
                // the user's active sort order, not just the filter.
                const rowsAtClick = table.getSortedRowModel().rows
                exportRowsToCsv(
                    HEADERS,
                    rowsAtClick.map((r) => toRow(r.original)),
                    `hudson-trust-assets-${todayLocalIso()}.csv`,
                )
            }}
        >
            <Download className="h-4 w-4" />
            Export CSV
        </Button>
    )
}
