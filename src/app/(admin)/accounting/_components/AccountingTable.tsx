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
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { TrustAccounting } from '@/db/schema'
import { cn } from '@/lib/utils'
import { formatDate } from '@/utils/formatters'
import { EXPENSE_TYPES, INCOME_TYPES } from './accounting-constants'

interface AccountingTableProps {
    entries: TrustAccounting[]
    incomeEntries: TrustAccounting[]
    expenseEntries: TrustAccounting[]
    filteredEntries: TrustAccounting[]
    activeTab: string
    isLoading: boolean
    onTabChange: (tab: string) => void
    onEditEntry: (entry: TrustAccounting) => void
    onDeleteEntry: (id: number) => void
    onUpdateEntry: (id: number, updates: Partial<TrustAccounting>) => void
}

export function AccountingTable({
    entries,
    incomeEntries,
    expenseEntries,
    filteredEntries,
    activeTab,
    isLoading,
    onTabChange,
    onEditEntry,
    onDeleteEntry,
    onUpdateEntry,
}: AccountingTableProps) {
    const accountingColumns: ColumnDef<TrustAccounting>[] = [
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
                <div className="text-sm">
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
                <EditableTextCell
                    value={row.original.description}
                    onSave={async (v) =>
                        onUpdateEntry(row.original.id, {
                            description: v || undefined,
                        })
                    }
                    placeholder="Add description"
                />
            ),
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

    return (
        <Card>
            <Tabs value={activeTab} onValueChange={onTabChange}>
                <div className="px-6 pt-6">
                    <TabsList>
                        <TabsTrigger value="all">
                            All Entries
                            <Badge variant="secondary" className="ml-2">
                                {entries.length}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger value="income" className="text-success">
                            Income
                            <Badge className="ml-2 bg-success">
                                {incomeEntries.length}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger
                            value="expense"
                            className="text-destructive"
                        >
                            Expenses
                            <Badge variant="destructive" className="ml-2">
                                {expenseEntries.length}
                            </Badge>
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value={activeTab} className="m-0">
                    <CardContent className="pt-4">
                        <DataTable
                            columns={accountingColumns}
                            data={filteredEntries}
                            searchKey="description"
                            searchPlaceholder="Filter by description..."
                            isLoading={isLoading}
                            emptyMessage="No entries recorded yet. Click 'Add Entry' to start tracking."
                            enableColumnVisibility={true}
                            enablePagination={true}
                        />
                    </CardContent>
                </TabsContent>
            </Tabs>
        </Card>
    )
}
