'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Trash2 } from 'lucide-react'
import {
    EditableCurrencyCell,
    EditableSelectCell,
    EditableTextCell,
} from '@/components/editable-cells'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import type { Vehicle } from '@/db/schema'
import { STATUS_VARIANTS, TRANSFER_STATUS } from '@/lib/constants'
import {
    asRecordStatus,
    asTitleStatus,
    asTransferStatus,
    enumToOptions,
    RECORD_STATUS_VALUES,
    TITLE_STATUS_VALUES,
} from '@/lib/type-utils'

// Derive options from schema enums (single source of truth)
export const TITLE_STATUS = enumToOptions(TITLE_STATUS_VALUES)
export const ASSET_STATUS = enumToOptions(RECORD_STATUS_VALUES, (v) =>
    ['ACTIVE', 'SOLD', 'TRANSFERRED', 'DISPOSED'].includes(v),
)

interface VehicleTableProps {
    vehicles: Vehicle[]
    isLoading: boolean
    onEdit: (vehicle: Vehicle) => void
    onDelete: (vehicle: Vehicle) => void
    onInlineUpdate: (id: number, updates: Partial<Vehicle>) => Promise<void>
}

export function VehicleTable({
    vehicles,
    isLoading,
    onEdit,
    onDelete,
    onInlineUpdate,
}: VehicleTableProps) {
    const columns: ColumnDef<Vehicle>[] = [
        {
            id: 'vehicle',
            accessorFn: (row) =>
                `${row.year} ${row.make} ${row.model}`.toLowerCase(),
            header: ({ column }) => (
                <DataTableColumnHeader
                    column={column}
                    title="Year/Make/Model"
                />
            ),
            cell: ({ row }) => (
                <div>
                    <p className="font-medium">
                        {row.original.year} {row.original.make}{' '}
                        {row.original.model}
                    </p>
                    {row.original.mileage && (
                        <p className="text-xs text-muted-foreground">
                            {row.original.mileage.toLocaleString()} miles
                        </p>
                    )}
                </div>
            ),
            filterFn: 'includesString',
        },
        {
            accessorKey: 'vin',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="VIN" />
            ),
            cell: ({ row }) => (
                <code className="text-xs">{row.original.vin.slice(-6)}</code>
            ),
        },
        {
            accessorKey: 'color',
            header: 'Color',
            cell: ({ row }) => (
                <EditableTextCell
                    value={row.original.color}
                    onSave={(val) =>
                        onInlineUpdate(row.original.id, { color: val })
                    }
                    placeholder="Add color"
                />
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
            accessorKey: 'titleStatus',
            header: 'Title',
            cell: ({ row }) => (
                <EditableSelectCell
                    value={row.original.titleStatus}
                    options={TITLE_STATUS}
                    variants={STATUS_VARIANTS}
                    onSave={(val) =>
                        onInlineUpdate(row.original.id, {
                            titleStatus: asTitleStatus(val),
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
            data={vehicles}
            searchKey="vehicle"
            searchPlaceholder="Search vehicles..."
            isLoading={isLoading}
            emptyMessage="No vehicles. Click Add Vehicle to create one."
            enablePagination={true}
        />
    )
}
