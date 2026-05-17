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

export function ExportAssetsButton({ table }: { table: Table<AssetRow> }) {
    // Export the filtered/sorted view (canonical UX) — `getFilteredRowModel`
    // returns rows after column filters and global search, ordered by the
    // current sort. To dump everything, the user clears filters first.
    const rows = table.getFilteredRowModel().rows
    const disabled = rows.length === 0

    return (
        <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={disabled}
            onClick={() => {
                const today = new Date().toISOString().slice(0, 10)
                exportRowsToCsv(
                    HEADERS,
                    rows.map((r) => toRow(r.original)),
                    `hudson-trust-assets-${today}.csv`,
                )
            }}
        >
            <Download className="h-4 w-4" />
            Export CSV
        </Button>
    )
}
