'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Trash2 } from 'lucide-react'
import {
    EditableCurrencyCell,
    EditableTextCell,
} from '@/components/editable-cells'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import type { BulkAction } from '@/components/ui/data-table-bulk-actions'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import { selectColumn } from '@/components/ui/data-table-select-column'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { TrustAccounting } from '@/db/schema'
import { cn } from '@/lib/utils'
import { formatDate } from '@/utils/formatters'
import { EXPENSE_TYPES, INCOME_TYPES } from './accounting-constants'

interface AccountingTableProps {
    data: TrustAccounting[]
    totalCount: number
    incomeCount: number
    expenseCount: number
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
    activeTab: string
    isLoading: boolean
    onTabChange: (tab: string) => void
    onEditEntry: (entry: TrustAccounting) => void
    onDeleteEntry: (id: number) => void
    onBulkDelete: (rows: TrustAccounting[]) => Promise<void>
    onUpdateEntry: (id: number, updates: Partial<TrustAccounting>) => void
}

export function AccountingTable({
    data,
    totalCount,
    incomeCount,
    expenseCount,
    currentPage,
    totalPages,
    onPageChange,
    activeTab,
    isLoading,
    onTabChange,
    onEditEntry,
    onDeleteEntry,
    onBulkDelete,
    onUpdateEntry,
}: AccountingTableProps) {
    const accountingColumns: ColumnDef<TrustAccounting>[] = [
        selectColumn<TrustAccounting>(),
        {
            accessorKey: 'accountingDate',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Date" />
            ),
            cell: ({ row }) => (
                <div className="text-sm">
                    {formatDate(row.original.accountingDate)}
                </div>
            ),
        },
        {
            id: 'category',
            header: 'Category',
            cell: ({ row }) => (
                <div
                    className={cn(
                        'text-sm',
                        row.original.reconciled && 'opacity-60',
                    )}
                >
                    {row.original.entryType === 'INCOME'
                        ? INCOME_TYPES.find(
                              (t) => t.value === row.original.incomeType,
                          )?.label || row.original.incomeType
                        : EXPENSE_TYPES.find(
                              (t) => t.value === row.original.expenseType,
                          )?.label || row.original.expenseType}
                </div>
            ),
        },
        {
            accessorKey: 'description',
            header: 'Description',
            cell: ({ row }) => (
                <div className={cn(row.original.reconciled && 'opacity-60')}>
                    <EditableTextCell
                        value={row.original.description}
                        onSave={async (v) =>
                            onUpdateEntry(row.original.id, {
                                description: v || undefined,
                            })
                        }
                        placeholder="Add description"
                    />
                </div>
            ),
        },
        {
            id: 'flags',
            header: 'Flags',
            cell: ({ row }) => {
                const flags: string[] = []
                if (row.original.isPrincipal) flags.push('P')
                if (row.original.taxDeductible) flags.push('D')
                if (flags.length === 0) return null
                return (
                    <div
                        className={cn(
                            'flex gap-1',
                            row.original.reconciled && 'opacity-60',
                        )}
                    >
                        {flags.map((f) => (
                            <Badge
                                key={f}
                                variant="outline"
                                className="text-xs px-1.5"
                                title={
                                    f === 'P' ? 'Principal' : 'Tax Deductible'
                                }
                            >
                                {f}
                            </Badge>
                        ))}
                    </div>
                )
            },
        },
        {
            accessorKey: 'amount',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Amount" />
            ),
            cell: ({ row }) => (
                <div
                    className={cn(
                        'text-right',
                        row.original.entryType === 'INCOME'
                            ? 'text-success'
                            : 'text-destructive',
                    )}
                >
                    <EditableCurrencyCell
                        value={row.original.amount}
                        onSave={async (v) =>
                            onUpdateEntry(row.original.id, {
                                amount: v || '',
                            })
                        }
                    />
                </div>
            ),
        },
        {
            id: 'reconciled',
            header: 'Reconciled',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Switch
                        checked={row.original.reconciled ?? false}
                        onCheckedChange={(checked) =>
                            onUpdateEntry(row.original.id, {
                                reconciled: checked,
                                reconciledDate: checked
                                    ? new Date().toISOString()
                                    : null,
                            })
                        }
                    />
                    {row.original.reconciledDate && (
                        <span className="text-xs text-muted-foreground">
                            {formatDate(row.original.reconciledDate)}
                        </span>
                    )}
                </div>
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
                        onClick={() => onEditEntry(row.original)}
                        title="Edit entry"
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => onDeleteEntry(row.original.id)}
                        title="Delete entry"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ]

    const bulkActions: BulkAction<TrustAccounting>[] = [
        {
            label: 'Delete',
            icon: Trash2,
            variant: 'destructive',
            onClick: onBulkDelete,
        },
    ]

    return (
        <Card>
            <Tabs value={activeTab} onValueChange={onTabChange}>
                <div className="px-6 pt-6">
                    <TabsList>
                        <TabsTrigger value="all">
                            All Entries
                            <Badge variant="secondary" className="ml-2">
                                {incomeCount + expenseCount}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger value="income" className="text-success">
                            Income
                            <Badge className="ml-2 bg-success">
                                {incomeCount}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger
                            value="expense"
                            className="text-destructive"
                        >
                            Expenses
                            <Badge variant="destructive" className="ml-2">
                                {expenseCount}
                            </Badge>
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value={activeTab} className="m-0">
                    <CardContent className="pt-4">
                        <DataTable
                            tableId="accounting"
                            columns={accountingColumns}
                            data={data}
                            searchKey="description"
                            searchPlaceholder="Filter by description..."
                            isLoading={isLoading}
                            emptyMessage="No entries recorded yet. Click 'Add Entry' to start tracking."
                            enableColumnVisibility={true}
                            enablePagination={false}
                            enableRowSelection
                            bulkActions={bulkActions}
                            exportable
                            exportResource="accounting"
                        />
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between pt-4">
                                <p className="text-sm text-muted-foreground">
                                    Page {currentPage} of {totalPages} (
                                    {totalCount} entries)
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            onPageChange(currentPage - 1)
                                        }
                                        disabled={currentPage <= 1}
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            onPageChange(currentPage + 1)
                                        }
                                        disabled={currentPage >= totalPages}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </TabsContent>
            </Tabs>
        </Card>
    )
}
