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
    // Opt out of the React Compiler for this component. With reactCompiler
    // enabled in next.config.ts, the Compiler memoizes this function based
    // on its `table` prop — which is reference-stable across DataTable
    // renders even as TanStack's internal state mutates. The Compiler
    // therefore skips re-running the body when filters/sort change, so
    // `disabled` reflects whatever the row count was on first render. The
    // table BODY updates fine (it lives inside DataTable, where the
    // Compiler can prove the state slice it reads), but this child
    // component's row-model read is stale. Two prior fix attempts (the
    // useMemo + state-slice deps approach, the direct getSortedRowModel
    // read) both passed local tests — bun:test doesn't run the Compiler
    // — and both failed in production. The escape-hatch directive forces
    // vanilla React rendering for this function: re-run on every parent
    // render, no Compiler-inserted memoization.
    'use no memo'
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
