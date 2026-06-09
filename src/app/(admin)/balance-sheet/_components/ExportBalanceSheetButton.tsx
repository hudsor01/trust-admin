'use client'

import type { Table } from '@tanstack/react-table'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { exportRowsToCsv, todayLocalIso } from '@/lib/csv'
import type { BalanceSheetRow } from '@/server/trpc/routers/balanceSheet'
import { CATEGORY_LABELS } from './_labels'

const HEADERS = [
    'Category',
    'Type',
    'Name / Party',
    'Description',
    'Amount',
    'Status',
    'Updated',
] as const

function toRow(r: BalanceSheetRow): (string | number | null)[] {
    return [
        CATEGORY_LABELS[r.category],
        r.type,
        r.party,
        r.description ?? '',
        // Raw Postgres numeric string — Excel parses it as a number so SUM()
        // works. Formatting it (e.g. $12,500.00) would force text typing.
        r.amount ?? '',
        r.status,
        r.updatedAt.slice(0, 10),
    ]
}

export function ExportBalanceSheetButton({
    table,
}: {
    table: Table<BalanceSheetRow>
}) {
    'use no memo'
    // React Compiler opt-out — same reasoning as ExportAssetsButton: the
    // `table` prop is reference-stable while TanStack's internal state
    // mutates, so the Compiler would otherwise freeze `disabled`.
    const filteredRowCount = table.getFilteredRowModel().rows.length
    const disabled = filteredRowCount === 0

    return (
        <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={disabled}
            onClick={() => {
                // Re-read at click time, sorted so the CSV respects the
                // active sort. With no filter applied this is the full
                // set — assets, receivables, and liabilities in one file.
                const rowsAtClick = table.getSortedRowModel().rows
                exportRowsToCsv(
                    HEADERS,
                    rowsAtClick.map((r) => toRow(r.original)),
                    `hudson-trust-balance-sheet-${todayLocalIso()}.csv`,
                )
            }}
        >
            <Download className="h-4 w-4" />
            Export CSV
        </Button>
    )
}
