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
                sortingFn: (a, b) => {
                    const av = parseFloat(a.original.value ?? '0')
                    const bv = parseFloat(b.original.value ?? '0')
                    return av - bv
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
    // only sees post-filter rows).
    const categoryOptions = useMemo(
        () =>
            Array.from(new Set(rows.map((r) => r.category)))
                .sort()
                .map((v) => ({ label: v, value: v })),
        [rows],
    )
    const statusOptions = useMemo(
        () =>
            Array.from(new Set(rows.map((r) => r.status)))
                .sort()
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
                            column={table.getColumn('category')}
                            title="Category"
                            options={categoryOptions}
                        />
                        <DataTableFacetedFilter
                            column={table.getColumn('status')}
                            title="Status"
                            options={statusOptions}
                        />
                    </>
                )}
            />
        </div>
    )
}
