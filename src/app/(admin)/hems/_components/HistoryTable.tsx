'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { EditableTextCell } from '@/components/editable-cells'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import type { Beneficiary, Distribution } from '@/db/schema'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/utils/formatters'

interface HistoryTableProps {
    distributions: Distribution[]
    beneficiaries: Beneficiary[]
    isLoading: boolean
    onUpdateDistribution: (
        id: number,
        updates: Partial<Distribution>,
    ) => Promise<void>
}

export function HistoryTable({
    distributions,
    beneficiaries,
    isLoading,
    onUpdateDistribution,
}: HistoryTableProps) {
    const historyColumns: ColumnDef<Distribution>[] = [
        {
            accessorKey: 'distributionDate',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Date" />
            ),
            cell: ({ row }) => formatDate(row.original.distributionDate),
        },
        {
            accessorKey: 'beneficiaryId',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Beneficiary" />
            ),
            cell: ({ row }) => {
                const beneficiary = beneficiaries.find(
                    (b) => b.id === row.original.beneficiaryId,
                )
                return beneficiary
                    ? `${beneficiary.firstName} ${beneficiary.lastName}`
                    : '—'
            },
        },
        {
            accessorKey: 'distributionType',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Type" />
            ),
            cell: ({ row }) => (
                <Badge
                    variant={
                        row.original.isWithdrawal ? 'default' : 'secondary'
                    }
                    className={cn(
                        row.original.isWithdrawal &&
                            'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-100',
                    )}
                >
                    {row.original.isWithdrawal
                        ? 'Withdrawal'
                        : row.original.hemsCategory ||
                          row.original.distributionType}
                </Badge>
            ),
        },
        {
            accessorKey: 'amount',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Amount" />
            ),
            cell: ({ row }) => (
                <span className="font-medium">
                    {formatCurrency(row.original.amount)}
                </span>
            ),
        },
        {
            accessorKey: 'paymentMethod',
            header: 'Method',
            cell: ({ row }) => row.original.paymentMethod,
        },
        {
            accessorKey: 'notes',
            header: 'Notes',
            cell: ({ row }) => (
                <EditableTextCell
                    value={row.original.notes}
                    onSave={async (val) => {
                        await onUpdateDistribution(row.original.id, {
                            notes: val,
                        })
                    }}
                />
            ),
        },
    ]

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">All Distributions</CardTitle>
            </CardHeader>
            <CardContent>
                <DataTable
                    tableId="hems-history"
                    data={distributions}
                    columns={historyColumns}
                    isLoading={isLoading}
                    emptyMessage="No distributions recorded"
                />
            </CardContent>
        </Card>
    )
}
