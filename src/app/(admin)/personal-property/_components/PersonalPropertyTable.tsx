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
import type { PersonalProperty } from '@/db/schema'
import { STATUS_VARIANTS, TRANSFER_STATUS } from '@/lib/constants'
import {
    asPersonalPropertyCategory,
    asRecordStatus,
    asTransferStatus,
    enumToOptions,
    PERSONAL_PROPERTY_CATEGORY_VALUES,
    RECORD_STATUS_VALUES,
} from '@/lib/type-utils'

export const CATEGORY_OPTIONS = enumToOptions(PERSONAL_PROPERTY_CATEGORY_VALUES)
export const ASSET_STATUS = enumToOptions(RECORD_STATUS_VALUES, (v) =>
    ['ACTIVE', 'SOLD', 'TRANSFERRED', 'DISPOSED'].includes(v),
)

interface PersonalPropertyTableProps {
    items: PersonalProperty[]
    isLoading: boolean
    onEdit: (item: PersonalProperty) => void
    onDelete: (item: PersonalProperty) => void
    onInlineUpdate: (
        id: number,
        updates: Partial<PersonalProperty>,
    ) => Promise<void>
    categoryOptions?: { value: string; label: string }[]
    searchPlaceholder?: string
    emptyMessage?: string
}

export function PersonalPropertyTable({
    items,
    isLoading,
    onEdit,
    onDelete,
    onInlineUpdate,
    categoryOptions = CATEGORY_OPTIONS,
    searchPlaceholder = 'Search personal property...',
    emptyMessage = 'No personal property. Click Add Personal Property to create one.',
}: PersonalPropertyTableProps) {
    const columns: ColumnDef<PersonalProperty>[] = [
        {
            accessorKey: 'name',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Name" />
            ),
            cell: ({ row }) => (
                <EditableTextCell
                    value={row.original.name}
                    onSave={(val) =>
                        onInlineUpdate(row.original.id, { name: val ?? '' })
                    }
                    validate={(val) =>
                        val.trim().length === 0 ? 'Name is required' : null
                    }
                    placeholder="Add name"
                />
            ),
            filterFn: 'includesString',
        },
        {
            accessorKey: 'description',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Description" />
            ),
            cell: ({ row }) => (
                <EditableTextCell
                    value={row.original.description}
                    onSave={(val) =>
                        onInlineUpdate(row.original.id, { description: val })
                    }
                    placeholder="Add description"
                />
            ),
            filterFn: 'includesString',
        },
        {
            accessorKey: 'category',
            header: 'Category',
            cell: ({ row }) => (
                <EditableSelectCell
                    value={row.original.category}
                    options={categoryOptions}
                    variants={STATUS_VARIANTS}
                    onSave={(val) =>
                        onInlineUpdate(row.original.id, {
                            category: asPersonalPropertyCategory(val),
                        })
                    }
                />
            ),
        },
        {
            accessorKey: 'location',
            header: 'Location',
            cell: ({ row }) => (
                <EditableTextCell
                    value={row.original.location}
                    onSave={(val) =>
                        onInlineUpdate(row.original.id, { location: val })
                    }
                    placeholder="Add location"
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
            data={items}
            searchKey="name"
            searchPlaceholder={searchPlaceholder}
            isLoading={isLoading}
            emptyMessage={emptyMessage}
            enablePagination={true}
        />
    )
}
