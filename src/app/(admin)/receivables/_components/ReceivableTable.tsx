'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { DollarSign, Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import type { NoteReceivable } from '@/db/schema'
import { STATUS_VARIANTS } from '@/lib/constants'
import { formatCurrency, formatDate, formatPercent } from '@/utils/formatters'
import { RECEIVABLE_STATUS, RECEIVABLE_TYPES } from './ReceivableConstants'

interface ReceivableTableProps {
    receivables: NoteReceivable[]
    isLoading: boolean
    onAdd: () => void
    onEdit: (r: NoteReceivable) => void
    onDelete: (id: number) => void
    onRecordPayment: (r: NoteReceivable) => void
}

export function ReceivableTable({
    receivables,
    isLoading,
    onAdd,
    onEdit,
    onDelete,
    onRecordPayment,
}: ReceivableTableProps) {
    const columns: ColumnDef<NoteReceivable>[] = [
        {
            accessorKey: 'debtor',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Debtor" />
            ),
            cell: ({ row }) => (
                <span className="font-medium">{row.original.debtor}</span>
            ),
        },
        {
            accessorKey: 'receivableType',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Type" />
            ),
            cell: ({ row }) => {
                const typeLabel =
                    RECEIVABLE_TYPES.find(
                        (t) => t.value === row.original.receivableType,
                    )?.label || row.original.receivableType
                return (
                    <Badge variant="outline" className="text-xs">
                        {typeLabel}
                    </Badge>
                )
            },
        },
        {
            accessorKey: 'originalPrincipal',
            header: ({ column }) => (
                <DataTableColumnHeader
                    column={column}
                    title="Original Principal"
                />
            ),
            cell: ({ row }) => (
                <span className="tabular-nums">
                    {formatCurrency(row.original.originalPrincipal)}
                </span>
            ),
        },
        {
            accessorKey: 'currentBalance',
            header: ({ column }) => (
                <DataTableColumnHeader
                    column={column}
                    title="Current Balance"
                />
            ),
            cell: ({ row }) => (
                <span className="tabular-nums font-medium">
                    {formatCurrency(row.original.currentBalance)}
                </span>
            ),
        },
        {
            accessorKey: 'interestRate',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Interest Rate" />
            ),
            cell: ({ row }) =>
                row.original.interestRate ? (
                    <span className="tabular-nums">
                        {formatPercent(row.original.interestRate)}
                    </span>
                ) : (
                    <span className="text-muted-foreground">—</span>
                ),
        },
        {
            accessorKey: 'dueDate',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Due Date" />
            ),
            cell: ({ row }) => (
                <span className="text-sm">
                    {formatDate(row.original.dueDate)}
                </span>
            ),
        },
        {
            accessorKey: 'status',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Status" />
            ),
            cell: ({ row }) => {
                const statusLabel =
                    RECEIVABLE_STATUS.find(
                        (s) => s.value === row.original.status,
                    )?.label || row.original.status
                return (
                    <Badge
                        variant={
                            STATUS_VARIANTS[row.original.status] ?? 'secondary'
                        }
                    >
                        {statusLabel}
                    </Badge>
                )
            },
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => (
                <div className="flex items-center justify-center gap-1">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() =>
                                        onRecordPayment(row.original)
                                    }
                                >
                                    <DollarSign className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Record Payment</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => onEdit(row.original)}
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => onDelete(row.original.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            ),
        },
    ]

    return (
        <>
            {/* Actions */}
            <div className="flex justify-end gap-2">
                <Button onClick={onAdd}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Receivable
                </Button>
            </div>

            {/* Table */}
            <DataTable
                tableId="receivables"
                columns={columns}
                data={receivables}
                searchKey="debtor"
                searchPlaceholder="Filter by debtor..."
                isLoading={isLoading}
                emptyMessage="No receivables recorded. Click Add to create one."
                enableColumnVisibility={true}
                enablePagination={true}
                exportable
                exportResource="receivables"
            />
        </>
    )
}
