'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Calendar, Mail, Pencil, Phone, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import {
    EditableDateCell,
    EditableSelectCell,
    EditableTextCell,
} from '@/components/editable-cells'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import {
    asTrusteeStatus,
    enumToOptions,
    TRUSTEE_STATUS_VALUES,
    type TrusteeStatus,
} from '@/lib/type-utils'
import { formatDate } from '@/utils/formatters'

export const STATUS_OPTIONS = enumToOptions(TRUSTEE_STATUS_VALUES)

/** Rows matching this email are read-only to prevent accidental self-lockout. */
const PRIMARY_TRUSTEE_EMAIL = 'rhudsontspr@gmail.com'

export type TrusteeRow = {
    id: number
    entityId: number
    name: string
    email: string | null
    phone: string | null
    dob: string | null
    status: TrusteeStatus | null
    order: number
    isCo: boolean | null
    startDate: string | null
    endDate: string | null
}

interface TrusteeTableProps {
    trustees: TrusteeRow[]
    allowPrimaryLock?: boolean
    onDelete: (id: number) => void
    onEdit?: (trustee: TrusteeRow) => void
    onUpdateField: (id: number, data: Partial<TrusteeRow>) => Promise<void>
}

/** Plain read-only display used for the primary-trustee lock. */
function ReadOnlyCell({
    value,
    bold,
}: {
    value: React.ReactNode
    bold?: boolean
}) {
    return (
        <div className="px-2 py-1 -mx-2 -my-1 min-h-7 flex items-center">
            <span className={bold ? 'text-sm font-medium' : 'text-sm'}>
                {value}
            </span>
        </div>
    )
}

export function TrusteeTable({
    trustees,
    allowPrimaryLock = false,
    onDelete,
    onEdit,
    onUpdateField,
}: TrusteeTableProps) {
    const columns = useMemo<ColumnDef<TrusteeRow>[]>(() => {
        const isPrimary = (row: TrusteeRow) =>
            allowPrimaryLock && row.email === PRIMARY_TRUSTEE_EMAIL

        return [
            {
                accessorKey: 'name',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title="Name" />
                ),
                cell: ({ row }) =>
                    isPrimary(row.original) ? (
                        <ReadOnlyCell value={row.original.name} bold />
                    ) : (
                        <EditableTextCell
                            value={row.original.name}
                            onSave={async (val) => {
                                await onUpdateField(row.original.id, {
                                    name: val as string,
                                })
                            }}
                        />
                    ),
            },
            {
                accessorKey: 'email',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title="Email" />
                ),
                cell: ({ row }) => (
                    <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                        {isPrimary(row.original) ? (
                            <ReadOnlyCell value={row.original.email} />
                        ) : (
                            <EditableTextCell
                                value={row.original.email}
                                placeholder="Add email"
                                onSave={async (val) => {
                                    await onUpdateField(row.original.id, {
                                        email: val,
                                    })
                                }}
                            />
                        )}
                    </div>
                ),
            },
            {
                accessorKey: 'phone',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title="Phone" />
                ),
                cell: ({ row }) => (
                    <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                        {isPrimary(row.original) ? (
                            <ReadOnlyCell value={row.original.phone} />
                        ) : (
                            <EditableTextCell
                                value={row.original.phone}
                                placeholder="Add phone"
                                onSave={async (val) => {
                                    await onUpdateField(row.original.id, {
                                        phone: val,
                                    })
                                }}
                            />
                        )}
                    </div>
                ),
            },
            {
                accessorKey: 'dob',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title="Birthday" />
                ),
                cell: ({ row }) => (
                    <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                        {isPrimary(row.original) ? (
                            <ReadOnlyCell
                                value={formatDate(row.original.dob)}
                            />
                        ) : (
                            <EditableDateCell
                                value={row.original.dob}
                                onSave={async (val) => {
                                    await onUpdateField(row.original.id, {
                                        dob: val,
                                    })
                                }}
                            />
                        )}
                    </div>
                ),
            },
            {
                accessorKey: 'status',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title="Status" />
                ),
                cell: ({ row }) =>
                    isPrimary(row.original) ? (
                        <ReadOnlyCell
                            value={
                                STATUS_OPTIONS.find(
                                    (o) => o.value === row.original.status,
                                )?.label ?? row.original.status
                            }
                        />
                    ) : (
                        <EditableSelectCell
                            value={row.original.status ?? ''}
                            options={STATUS_OPTIONS}
                            onSave={async (val) => {
                                await onUpdateField(row.original.id, {
                                    status: asTrusteeStatus(val as string),
                                })
                            }}
                        />
                    ),
            },
            {
                accessorKey: 'startDate',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title="Start Date" />
                ),
                cell: ({ row }) =>
                    isPrimary(row.original) ? (
                        <ReadOnlyCell
                            value={formatDate(row.original.startDate)}
                        />
                    ) : (
                        <EditableDateCell
                            value={row.original.startDate}
                            onSave={async (val) => {
                                await onUpdateField(row.original.id, {
                                    startDate: val,
                                })
                            }}
                        />
                    ),
            },
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => {
                    if (isPrimary(row.original)) return null
                    return (
                        <div className="flex items-center gap-1">
                            {onEdit && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                aria-label="Edit trustee"
                                                onClick={() =>
                                                    onEdit(row.original)
                                                }
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Edit</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                            aria-label="Delete trustee"
                                            onClick={() =>
                                                onDelete(row.original.id)
                                            }
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Delete</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    )
                },
            },
        ]
    }, [onUpdateField, onEdit, onDelete, allowPrimaryLock])

    return <DataTable tableId="trustees" columns={columns} data={trustees} />
}
