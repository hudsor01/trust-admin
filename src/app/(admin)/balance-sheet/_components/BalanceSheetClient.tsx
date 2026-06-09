'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { KpiStrip, type KpiStripItem } from '@/components/kpi-strip'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import { DataTableFacetedFilter } from '@/components/ui/data-table-faceted-filter'
import { STATUS_VARIANTS } from '@/lib/constants'
import { fromCents, sumStrings, toCents } from '@/lib/money'
import { includesArrayFilter } from '@/lib/table-filters'
import { trpc } from '@/lib/trpc'
import type {
    BalanceSheetCategory,
    BalanceSheetRow,
} from '@/server/trpc/routers/balanceSheet'
import { formatCurrency } from '@/utils/formatters'
import { CATEGORY_BADGE_VARIANT, CATEGORY_LABELS } from './_labels'
import { ExportBalanceSheetButton } from './ExportBalanceSheetButton'

const CATEGORY_ORDER: BalanceSheetCategory[] = [
    'ASSET',
    'RECEIVABLE',
    'LIABILITY',
]

export function BalanceSheetClient() {
    const router = useRouter()
    const { data: entities } = trpc.entity.list.useQuery()
    const entityId = entities?.[0]?.id

    const { data: rows = [], isLoading } = trpc.balanceSheet.listAll.useQuery(
        { entityId: entityId! },
        { enabled: !!entityId },
    )

    const columns = useMemo<ColumnDef<BalanceSheetRow>[]>(
        () => [
            {
                accessorKey: 'category',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title="Category" />
                ),
                cell: ({ row }) => (
                    <Badge
                        variant={CATEGORY_BADGE_VARIANT[row.original.category]}
                    >
                        {CATEGORY_LABELS[row.original.category]}
                    </Badge>
                ),
                filterFn: includesArrayFilter,
            },
            {
                accessorKey: 'party',
                header: ({ column }) => (
                    <DataTableColumnHeader
                        column={column}
                        title="Name / Party"
                    />
                ),
                cell: ({ row }) => (
                    <span className="font-medium">{row.original.party}</span>
                ),
                filterFn: 'includesString',
            },
            {
                accessorKey: 'type',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title="Type" />
                ),
                cell: ({ row }) => (
                    <span className="text-sm text-muted-foreground">
                        {row.original.type}
                    </span>
                ),
                filterFn: includesArrayFilter,
            },
            {
                accessorKey: 'description',
                header: ({ column }) => (
                    <DataTableColumnHeader
                        column={column}
                        title="Description"
                    />
                ),
                cell: ({ row }) =>
                    row.original.description ? (
                        <span
                            className="text-sm text-muted-foreground line-clamp-1"
                            title={row.original.description}
                        >
                            {row.original.description}
                        </span>
                    ) : (
                        <span className="text-xs text-muted-foreground italic">
                            —
                        </span>
                    ),
                filterFn: 'includesString',
            },
            {
                accessorKey: 'amount',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title="Amount" />
                ),
                cell: ({ row }) =>
                    row.original.amount ? (
                        <span className="font-mono text-sm">
                            {formatCurrency(row.original.amount)}
                        </span>
                    ) : (
                        <span className="text-xs text-muted-foreground italic">
                            —
                        </span>
                    ),
                // Null amounts sort to the end regardless of direction so
                // unvalued rows don't blend with $0.
                sortingFn: (a, b) => {
                    const av = a.original.amount
                    const bv = b.original.amount
                    if (av == null && bv == null) return 0
                    if (av == null) return 1
                    if (bv == null) return -1
                    return parseFloat(av) - parseFloat(bv)
                },
            },
            {
                accessorKey: 'status',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title="Status" />
                ),
                cell: ({ row }) => {
                    const variant =
                        STATUS_VARIANTS[
                            row.original.status as keyof typeof STATUS_VARIANTS
                        ] ?? 'secondary'
                    return (
                        <Badge variant={variant}>{row.original.status}</Badge>
                    )
                },
                filterFn: includesArrayFilter,
            },
        ],
        [],
    )

    // Faceted-filter options derived from the full row set so de-selecting an
    // option doesn't make it vanish (TanStack's getFacetedUniqueValues only
    // sees post-filter rows).
    const categoryOptions = useMemo(
        () =>
            CATEGORY_ORDER.filter((c) =>
                rows.some((r) => r.category === c),
            ).map((c) => ({ label: CATEGORY_LABELS[c], value: c })),
        [rows],
    )
    const typeOptions = useMemo(
        () =>
            Array.from(new Set(rows.map((r) => r.type)))
                .sort((a, b) => a.localeCompare(b))
                .map((v) => ({ label: v, value: v })),
        [rows],
    )
    const statusOptions = useMemo(
        () =>
            Array.from(new Set(rows.map((r) => r.status)))
                .sort((a, b) => a.localeCompare(b))
                .map((v) => ({ label: v, value: v })),
        [rows],
    )

    // Category totals (positive magnitudes) and net worth. Net worth uses
    // integer-cent arithmetic to avoid float drift: assets + receivables
    // owed to the trust, minus liabilities it owes.
    const sumFor = (category: BalanceSheetCategory): string =>
        sumStrings(
            rows
                .filter((r) => r.category === category)
                .map((r) => r.amount ?? '0'),
        )
    const totalAssets = sumFor('ASSET')
    const totalReceivables = sumFor('RECEIVABLE')
    const totalLiabilities = sumFor('LIABILITY')
    const netWorth = fromCents(
        toCents(totalAssets) +
            toCents(totalReceivables) -
            toCents(totalLiabilities),
    )

    const kpiData: KpiStripItem[] = [
        { label: 'Total assets', value: formatCurrency(totalAssets) },
        { label: 'Receivables', value: formatCurrency(totalReceivables) },
        { label: 'Total liabilities', value: formatCurrency(totalLiabilities) },
        { label: 'Net worth', value: formatCurrency(netWorth) },
    ]

    return (
        <div className="space-y-6">
            <PageHeader
                title="Balance Sheet"
                description="Every asset, receivable, and liability the trust holds — consolidated in one place and exportable to a single CSV."
            />

            <KpiStrip data={kpiData} isLoading={isLoading || !entityId} />

            <DataTable
                tableId="balance-sheet"
                columns={columns}
                data={rows}
                isLoading={isLoading || !entityId}
                searchKey="party"
                searchPlaceholder="Search by name or party…"
                emptyMessage="No assets, receivables, or liabilities recorded yet."
                onRowClick={(row) => router.push(row.href)}
                toolbar={(table) => (
                    <>
                        <DataTableFacetedFilter
                            column={table.getColumn('category')}
                            title="Category"
                            options={categoryOptions}
                        />
                        <DataTableFacetedFilter
                            column={table.getColumn('type')}
                            title="Type"
                            options={typeOptions}
                        />
                        <DataTableFacetedFilter
                            column={table.getColumn('status')}
                            title="Status"
                            options={statusOptions}
                        />
                        <ExportBalanceSheetButton table={table} />
                    </>
                )}
            />
        </div>
    )
}
