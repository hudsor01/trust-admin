'use client'

import type { Table } from '@tanstack/react-table'
import { Download } from 'lucide-react'
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
    // Explicit reads of state slices so React reconciler treats this
    // render as state-dependent. Without these reads, browser-tested
    // observation has shown the `disabled` prop staying false on a
    // filter-narrowed-to-zero state — even though the table body
    // correctly shows the empty state and the click-time read returns
    // zero rows. The pattern is a TanStack memo-ordering edge case
    // where the row-model cache is stale at render time but fresh by
    // click time. Reading these state slices forces a recompute on
    // every render whose state changed.
    const state = table.getState()
    void state.columnFilters
    void state.globalFilter
    void state.sorting

    // Use `getFilteredRowModel` (filter only, no sort cache layer) for
    // the disabled check — it's the row count that semantically drives
    // disabled state, and going through fewer memo layers reduces the
    // window where the cache can be stale relative to current state.
    const filteredRowCount = table.getFilteredRowModel().rows.length
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
