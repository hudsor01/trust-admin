'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { DollarSign, List, Pencil, Plus, Table2, Trash2 } from 'lucide-react'
import {
    BulkEntryTable,
    type BulkLiabilityRow,
} from '@/components/bulk-entry-table'
import {
    EditableCurrencyCell,
    EditableSelectCell,
    EditableTextCell,
} from '@/components/editable-cells'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import { Progress } from '@/components/ui/progress'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import type { Liability } from '@/db/schema'
import { STATUS_VARIANTS } from '@/lib/constants'
import { asRecordStatus } from '@/lib/type-utils'
import { LIABILITY_STATUS, LIABILITY_TYPES } from './LiabilityConstants'

interface LiabilityTableProps {
    liabilities: Liability[]
    isLoading: boolean
    bulkMode: boolean
    bulkCreatePending: boolean
    onBulkModeToggle: () => void
    onAdd: () => void
    onEdit: (l: Liability) => void
    onDelete: (id: number) => void
    onRecordPayment: (l: Liability) => void
    onBulkSave: (rows: BulkLiabilityRow[]) => Promise<void>
    onBulkCancel: () => void
    onUpdateLiability: (id: number, data: Partial<Liability>) => Promise<void>
}

export function LiabilityTable({
    liabilities,
    isLoading,
    bulkMode,
    bulkCreatePending,
    onBulkModeToggle,
    onAdd,
    onEdit,
    onDelete,
    onRecordPayment,
    onBulkSave,
    onBulkCancel,
    onUpdateLiability,
}: LiabilityTableProps) {
    const columns: ColumnDef<Liability>[] = [
        {
            accessorKey: 'creditor',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Creditor" />
            ),
            cell: ({ row }) => (
                <EditableTextCell
                    value={row.original.creditor}
                    onSave={async (v) =>
                        onUpdateLiability(row.original.id, {
                            creditor: v || '',
                        })
                    }
                />
            ),
        },
        {
            accessorKey: 'liabilityType',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Type" />
            ),
            cell: ({ row }) => {
                const typeLabel =
                    LIABILITY_TYPES.find(
                        (t) => t.value === row.original.liabilityType,
                    )?.label || row.original.liabilityType
                return (
                    <Badge variant="outline" className="text-xs">
                        {typeLabel}
                    </Badge>
                )
            },
        },
        {
            accessorKey: 'originalAmount',
            header: ({ column }) => (
                <DataTableColumnHeader
                    column={column}
                    title="Original Amount"
                />
            ),
            cell: ({ row }) => (
                <EditableCurrencyCell
                    value={row.original.originalAmount}
                    onSave={async (v) =>
                        onUpdateLiability(row.original.id, {
                            originalAmount: v || '0',
                        })
                    }
                />
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
                <EditableCurrencyCell
                    value={row.original.currentBalance}
                    onSave={async (v) =>
                        onUpdateLiability(row.original.id, {
                            currentBalance: v || '0',
                        })
                    }
                />
            ),
        },
        {
            id: 'progress',
            header: 'Progress',
            cell: ({ row }) => {
                const original = parseFloat(row.original.originalAmount ?? '0')
                const current = parseFloat(row.original.currentBalance ?? '0')
                const percent =
                    original > 0
                        ? Math.round(((original - current) / original) * 100)
                        : 0
                const isPaidOff = current <= 0

                return (
                    <div className="flex items-center gap-2 min-w-[100px]">
                        <Progress
                            value={percent}
                            className={
                                isPaidOff
                                    ? 'h-2 flex-1 [&>div]:bg-green-500'
                                    : percent >= 75
                                      ? 'h-2 flex-1 [&>div]:bg-green-500'
                                      : percent >= 25
                                        ? 'h-2 flex-1 [&>div]:bg-yellow-500'
                                        : 'h-2 flex-1'
                            }
                        />
                        <span className="text-xs text-muted-foreground w-10 text-right">
                            {isPaidOff ? 'Paid' : `${percent}%`}
                        </span>
                    </div>
                )
            },
        },
        {
            accessorKey: 'monthlyPayment',
            header: ({ column }) => (
                <DataTableColumnHeader
                    column={column}
                    title="Monthly Payment"
                />
            ),
            cell: ({ row }) => (
                <EditableCurrencyCell
                    value={row.original.monthlyPayment}
                    onSave={async (v) =>
                        onUpdateLiability(row.original.id, {
                            monthlyPayment: v,
                        })
                    }
                />
            ),
        },
        {
            accessorKey: 'status',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Status" />
            ),
            cell: ({ row }) => (
                <EditableSelectCell
                    value={row.original.status}
                    options={LIABILITY_STATUS}
                    variants={STATUS_VARIANTS}
                    onSave={async (v) =>
                        onUpdateLiability(row.original.id, {
                            status: asRecordStatus(v),
                        })
                    }
                />
            ),
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
                <Button variant="outline" onClick={onBulkModeToggle}>
                    {bulkMode ? (
                        <>
                            <List className="h-4 w-4 mr-2" />
                            Single Entry
                        </>
                    ) : (
                        <>
                            <Table2 className="h-4 w-4 mr-2" />
                            Bulk Entry
                        </>
                    )}
                </Button>
                {!bulkMode && (
                    <Button onClick={onAdd}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Liability
                    </Button>
                )}
            </div>

            {/* Bulk Entry Mode */}
            {bulkMode && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold">
                                Bulk Entry Mode
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Enter multiple liabilities at once. Tab through
                                cells, Enter adds rows. Paste from Excel/Sheets.
                            </p>
                        </div>
                        <BulkEntryTable
                            onSave={onBulkSave}
                            onCancel={onBulkCancel}
                            isLoading={bulkCreatePending}
                        />
                    </CardContent>
                </Card>
            )}

            {/* Table */}
            {!bulkMode && (
                <DataTable
                    columns={columns}
                    data={liabilities}
                    searchKey="creditor"
                    searchPlaceholder="Filter by creditor..."
                    isLoading={isLoading}
                    emptyMessage="No liabilities recorded. Click Add to create one."
                    enableColumnVisibility={true}
                    enablePagination={true}
                />
            )}
        </>
    )
}
