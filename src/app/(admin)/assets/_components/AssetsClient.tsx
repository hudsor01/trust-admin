'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import { DataTableFacetedFilter } from '@/components/ui/data-table-faceted-filter'
import { STATUS_VARIANTS } from '@/lib/constants'
import { trpc } from '@/lib/trpc'
import type { AssetRow } from '@/server/trpc/routers/asset'
import { formatCurrency } from '@/utils/formatters'
import { KIND_LABELS } from './_labels'
import { ExportAssetsButton } from './ExportAssetsButton'

const includesArrayFilter = <T,>(
    row: { getValue: (id: string) => T },
    id: string,
    value: T[],
): boolean =>
    Array.isArray(value) && value.length > 0
        ? value.includes(row.getValue(id))
        : true

export function AssetsClient() {
    const router = useRouter()
    const { data: entities } = trpc.entity.list.useQuery()
    const entityId = entities?.[0]?.id

    const { data: rows = [], isLoading } = trpc.asset.listAll.useQuery(
        { entityId: entityId! },
        { enabled: !!entityId },
    )

    const columns = useMemo<ColumnDef<AssetRow>[]>(
        () => [
            {
                accessorKey: 'name',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title="Name" />
                ),
                cell: ({ row }) => (
                    <span className="font-medium">{row.original.name}</span>
                ),
                filterFn: 'includesString',
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
                accessorKey: 'kind',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title="Type" />
                ),
                cell: ({ row }) => (
                    <span className="text-sm text-muted-foreground">
                        {KIND_LABELS[row.original.kind]}
                    </span>
                ),
                filterFn: includesArrayFilter,
            },
            {
                accessorKey: 'category',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title="Category" />
                ),
                cell: ({ row }) => (
                    <Badge variant="outline">{row.original.category}</Badge>
                ),
                filterFn: includesArrayFilter,
            },
            {
                accessorKey: 'value',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title="Value" />
                ),
                cell: ({ row }) =>
                    row.original.value ? (
                        <span className="font-mono text-sm">
                            {formatCurrency(row.original.value)}
                        </span>
                    ) : (
                        <span className="text-xs text-muted-foreground italic">
                            —
                        </span>
                    ),
                // Custom sort: push null values to the end regardless of
                // direction so unvalued rows don't blend with $0. (TanStack's
                // sortUndefined doesn't apply since `value` is `string | null`,
                // not `string | undefined` — handle null explicitly here.)
                sortingFn: (a, b) => {
                    const av = a.original.value
                    const bv = b.original.value
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

    // Derive filter option lists from the full row set so de-selecting an
    // option doesn't make it disappear (TanStack's getFacetedUniqueValues
    // only sees post-filter rows). Sort with localeCompare so case folds
    // and the order is stable across locales. Deriving from rows (rather
    // than the static KIND_LABELS map) means the Type filter only lists
    // kinds that actually exist in this entity's data — empty filters
    // never appear.
    const kindOptions = useMemo(
        () =>
            Array.from(new Set(rows.map((r) => r.kind)))
                .sort((a, b) => KIND_LABELS[a].localeCompare(KIND_LABELS[b]))
                .map((v) => ({ label: KIND_LABELS[v], value: v })),
        [rows],
    )
    const categoryOptions = useMemo(
        () =>
            Array.from(new Set(rows.map((r) => r.category)))
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

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold tracking-tight">
                    All Assets
                </h2>
                <p className="text-sm text-muted-foreground">
                    Every asset across vehicles, properties, accounts,
                    insurance, personal property, and artwork — sortable and
                    filterable in one place.
                </p>
            </div>

            <DataTable
                tableId="assets"
                columns={columns}
                data={rows}
                isLoading={isLoading || !entityId}
                searchKey="name"
                searchPlaceholder="Search by name…"
                emptyMessage="No assets recorded yet."
                onRowClick={(row) => router.push(row.href)}
                toolbar={(table) => (
                    <>
                        <DataTableFacetedFilter
                            column={table.getColumn('kind')}
                            title="Type"
                            options={kindOptions}
                        />
                        <DataTableFacetedFilter
                            column={table.getColumn('category')}
                            title="Category"
                            options={categoryOptions}
                        />
                        <DataTableFacetedFilter
                            column={table.getColumn('status')}
                            title="Status"
                            options={statusOptions}
                        />
                        <ExportAssetsButton table={table} />
                    </>
                )}
            />
        </div>
    )
}
