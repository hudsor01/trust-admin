'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import {
    EditableCurrencyCell,
    EditableNumberCell,
    EditableSelectCell,
    EditableTextCell,
} from '@/components/editable-cells'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import type { RentalProperty } from '@/db/schema'
import { RENTAL_STATUS, STATUS_VARIANTS, TRANSFER_STATUS } from '@/lib/constants'
import { asRentalStatus, asTransferStatus } from '@/lib/type-utils'

interface RentalPropertyTableProps {
    rentals: RentalProperty[]
    rentalsLoading: boolean
    selectedEntity: number | undefined
    onAdd: () => void
    onEdit: (r: RentalProperty) => void
    onDelete: (id: number) => void
    onUpdateRental: (id: number, data: Partial<RentalProperty>) => Promise<void>
}

export function RentalPropertyTable({
    rentals,
    rentalsLoading,
    selectedEntity,
    onAdd,
    onEdit,
    onDelete,
    onUpdateRental,
}: RentalPropertyTableProps) {
    const columns: ColumnDef<RentalProperty>[] = [
        {
            accessorKey: 'name',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Name" />
            ),
            cell: ({ row }) => (
                <EditableTextCell
                    value={row.original.name}
                    onSave={async (v) =>
                        onUpdateRental(row.original.id, { name: v as string })
                    }
                />
            ),
        },
        {
            accessorKey: 'streetAddress',
            header: 'Address',
            cell: ({ row }) => (
                <>
                    <p className="text-sm">{row.original.streetAddress}</p>
                    <p className="text-xs text-muted-foreground">
                        {row.original.city}, {row.original.state}{' '}
                        {row.original.zip}
                    </p>
                </>
            ),
        },
        {
            accessorKey: 'units',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Units" />
            ),
            cell: ({ row }) => (
                <EditableNumberCell
                    value={row.original.units}
                    onSave={async (v) =>
                        onUpdateRental(row.original.id, { units: v as number })
                    }
                />
            ),
        },
        {
            accessorKey: 'monthlyRent',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Monthly Rent" />
            ),
            cell: ({ row }) => (
                <EditableCurrencyCell
                    value={row.original.monthlyRent}
                    onSave={async (v) =>
                        onUpdateRental(row.original.id, { monthlyRent: v })
                    }
                />
            ),
        },
        {
            accessorKey: 'dodValue',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="DOD Value" />
            ),
            cell: ({ row }) => (
                <EditableCurrencyCell
                    value={row.original.dodValue}
                    onSave={async (v) =>
                        onUpdateRental(row.original.id, { dodValue: v })
                    }
                />
            ),
        },
        {
            accessorKey: 'rentalStatus',
            header: 'Status',
            cell: ({ row }) => (
                <EditableSelectCell
                    value={row.original.rentalStatus}
                    options={RENTAL_STATUS}
                    onSave={async (v) =>
                        onUpdateRental(row.original.id, {
                            rentalStatus: asRentalStatus(v),
                        })
                    }
                    variants={STATUS_VARIANTS}
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
                    onSave={async (v) =>
                        onUpdateRental(row.original.id, {
                            transferStatus: asTransferStatus(v),
                        })
                    }
                    variants={STATUS_VARIANTS}
                />
            ),
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => (
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEdit(row.original)}
                        title="Edit property"
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => onDelete(row.original.id)}
                        title="Delete property"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ]

    return (
        <>
            <div className="mb-4 flex justify-end">
                <Button onClick={onAdd} disabled={!selectedEntity}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Rental Property
                </Button>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <DataTable
                        data={rentals}
                        columns={columns}
                        searchKey="name"
                        searchPlaceholder="Filter by name..."
                        isLoading={rentalsLoading}
                        emptyMessage="No rental properties. Click Add to create one."
                        enableColumnVisibility={true}
                        enablePagination={true}
                    />
                </CardContent>
            </Card>
        </>
    )
}
