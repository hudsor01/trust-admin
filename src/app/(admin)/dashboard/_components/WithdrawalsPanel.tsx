'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import { cn } from '@/lib/utils'
import { formatDate } from '@/utils/formatters'
import type { WithdrawalRow } from './types'

export const withdrawalColumns: ColumnDef<WithdrawalRow>[] = [
    {
        accessorKey: 'beneficiary',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Beneficiary" />
        ),
        cell: ({ row }) => (
            <span className="font-medium">
                {row.original.beneficiary.firstName}{' '}
                {row.original.beneficiary.lastName}
            </span>
        ),
    },
    {
        accessorKey: 'currentAge',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Age" />
        ),
        cell: ({ row }) => row.original.currentAge ?? '—',
    },
    {
        id: 'sharePercent',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Share" />
        ),
        cell: ({ row }) => `${row.original.beneficiary.sharePercent}%`,
    },
    {
        accessorKey: 'age25',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Age 25 (50%)" />
        ),
        cell: ({ row }) =>
            row.original.age25 ? (
                <div>
                    <p
                        className={cn(
                            'text-sm',
                            row.original.age25.withdrawn
                                ? 'text-muted-foreground'
                                : row.original.age25.status.daysUntil === 0
                                  ? 'text-green-600 dark:text-green-400 font-medium'
                                  : '',
                        )}
                    >
                        {row.original.age25.withdrawn
                            ? 'Withdrawn'
                            : row.original.age25.status.status}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {formatDate(row.original.age25.eligibleDate)}
                    </p>
                </div>
            ) : (
                <span className="text-muted-foreground">—</span>
            ),
    },
    {
        accessorKey: 'age30',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Age 30 (50%)" />
        ),
        cell: ({ row }) =>
            row.original.age30 ? (
                <div>
                    <p
                        className={cn(
                            'text-sm',
                            row.original.age30.withdrawn
                                ? 'text-muted-foreground'
                                : row.original.age30.status.daysUntil === 0
                                  ? 'text-green-600 dark:text-green-400 font-medium'
                                  : '',
                        )}
                    >
                        {row.original.age30.withdrawn
                            ? 'Withdrawn'
                            : row.original.age30.status.status}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {formatDate(row.original.age30.eligibleDate)}
                    </p>
                </div>
            ) : (
                <span className="text-muted-foreground">—</span>
            ),
    },
]

interface WithdrawalsPanelProps {
    withdrawalData: WithdrawalRow[]
}

export function WithdrawalsPanel({ withdrawalData }: WithdrawalsPanelProps) {
    return (
        <div>
            <div className="mb-4">
                <p className="font-medium mb-1">
                    Grandchild Withdrawal Eligibility
                </p>
                <p className="text-sm text-muted-foreground">
                    Per trust terms: 50% at age 25, remaining 50% at age 30
                </p>
            </div>

            <DataTable
                data={withdrawalData}
                columns={withdrawalColumns}
                emptyMessage="No grandchild beneficiaries with withdrawal schedules found."
                enableColumnVisibility={true}
                enablePagination={true}
            />
        </div>
    )
}
