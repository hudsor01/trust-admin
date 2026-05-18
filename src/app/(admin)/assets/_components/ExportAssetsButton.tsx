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
    // `getSortedRowModel` returns rows after column filters, global search,
    // AND the current sort applied — but BEFORE pagination, so we get
    // every visible row across all pages. This is what we want to export.
    //
    // Reactivity contract: this component re-renders whenever its parent
    // DataTable re-renders, which happens whenever TanStack updates any
    // state (filters, sort, search). Do not wrap with React.memo — that
    // would break the contract and leave `visible` stale on filter change.
    const visible = table.getSortedRowModel().rows
    const disabled = visible.length === 0

    return (
        <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={disabled}
            onClick={() => {
                // Re-read at click time so we're never dependent on the
                // closure captured during the last render — guards against
                // any timing window where the user clicks between a state
                // change and the subsequent re-render.
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
