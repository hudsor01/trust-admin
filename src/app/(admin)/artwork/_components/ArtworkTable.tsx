'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Trash2 } from 'lucide-react'
import {
    EditableCurrencyCell,
    EditableSelectCell,
} from '@/components/editable-cells'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import type { Artwork } from '@/db/schema'
import { STATUS_VARIANTS, TRANSFER_STATUS } from '@/lib/constants'
import {
    asRecordStatus,
    asTransferStatus,
    enumToOptions,
    RECORD_STATUS_VALUES,
} from '@/lib/type-utils'

export const ASSET_STATUS = enumToOptions(RECORD_STATUS_VALUES, (v) =>
    ['ACTIVE', 'SOLD', 'TRANSFERRED', 'DISPOSED'].includes(v),
)

interface ArtworkTableProps {
    artworks: Artwork[]
    isLoading: boolean
    onEdit: (artwork: Artwork) => void
    onDelete: (artwork: Artwork) => void
    onInlineUpdate: (id: number, updates: Partial<Artwork>) => Promise<void>
}

export function ArtworkTable({
    artworks,
    isLoading,
    onEdit,
    onDelete,
    onInlineUpdate,
}: ArtworkTableProps) {
    const columns: ColumnDef<Artwork>[] = [
        {
            id: 'artwork',
            accessorFn: (row) =>
                `${row.title} ${row.artist ?? ''}`.toLowerCase(),
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Title / Artist" />
            ),
            cell: ({ row }) => (
                <div>
                    <p className="font-medium">{row.original.title}</p>
                    {row.original.artist && (
                        <p className="text-xs text-muted-foreground">
                            {row.original.artist}
                        </p>
                    )}
                </div>
            ),
            filterFn: 'includesString',
        },
        {
            accessorKey: 'medium',
            header: 'Medium',
            cell: ({ row }) => (
                <span className="text-sm">{row.original.medium || '--'}</span>
            ),
        },
        {
            accessorKey: 'dimensions',
            header: 'Dimensions',
            cell: ({ row }) => (
                <span className="text-sm">
                    {row.original.dimensions || '--'}
                </span>
            ),
        },
        {
            accessorKey: 'dodValue',
            header: 'DOD Value',
            cell: ({ row }) => (
                <EditableCurrencyCell
                    value={row.original.dodValue}
                    onSave={(val) =>
                        onInlineUpdate(row.original.id, {
                            dodValue: val,
                        })
                    }
                />
            ),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => (
                <EditableSelectCell
                    value={row.original.status}
                    options={ASSET_STATUS}
                    variants={STATUS_VARIANTS}
                    onSave={(val) =>
                        onInlineUpdate(row.original.id, {
                            status: asRecordStatus(val),
                        })
                    }
                />
            ),
        },
        {
            accessorKey: 'transferStatus',
            header: 'Transfer',
            cell: ({ row }) => (
                <EditableSelectCell
                    value={row.original.transferStatus}
                    options={TRANSFER_STATUS}
                    variants={STATUS_VARIANTS}
                    onSave={(val) =>
                        onInlineUpdate(row.original.id, {
                            transferStatus: asTransferStatus(val),
                        })
                    }
                />
            ),
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => (
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEdit(row.original)}
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => onDelete(row.original)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ]

    return (
        <DataTable
            columns={columns}
            data={artworks}
            searchKey="artwork"
            searchPlaceholder="Search artwork..."
            isLoading={isLoading}
            emptyMessage="No artwork. Click Add Artwork to create one."
            enablePagination={true}
        />
    )
}
