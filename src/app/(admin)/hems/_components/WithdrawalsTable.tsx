'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import type { Beneficiary, WithdrawalRecord } from '@/db/schema'
import { cn } from '@/lib/utils'
import {
    calculateAge,
    formatDate,
    getWithdrawalStatus,
} from '@/utils/formatters'

export type WithdrawalRow = {
    beneficiary: Beneficiary
    age25: WithdrawalRecord | null
    age30: WithdrawalRecord | null
}

interface WithdrawalsTableProps {
    grandchildrenWithdrawals: WithdrawalRow[]
    isLoading: boolean
    onProcessWithdrawal: (withdrawal: WithdrawalRecord) => void
}

function getStatusVariant(
    status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (status) {
        case 'ELIGIBLE':
            return 'default'
        case 'COMPLETE':
            return 'secondary'
        default:
            return 'outline'
    }
}

export function WithdrawalsTable({
    grandchildrenWithdrawals,
    isLoading,
    onProcessWithdrawal,
}: WithdrawalsTableProps) {
    const withdrawalColumns: ColumnDef<WithdrawalRow>[] = [
        {
            id: 'beneficiary',
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
            id: 'age',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Age" />
            ),
            cell: ({ row }) =>
                row.original.beneficiary.dob
                    ? calculateAge(row.original.beneficiary.dob)
                    : '—',
        },
        {
            id: 'share',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Share" />
            ),
            cell: ({ row }) => `${row.original.beneficiary.sharePercent}%`,
        },
        {
            id: 'age25',
            header: 'Age 25 (50%)',
            cell: ({ row }) => {
                if (!row.original.age25) return '—'
                const status = getWithdrawalStatus(
                    row.original.age25.eligibleDate,
                )
                return (
                    <div className="flex items-center gap-2">
                        <Badge
                            variant={
                                row.original.age25.status === 'COMPLETE'
                                    ? 'secondary'
                                    : getStatusVariant(status?.status || '')
                            }
                            className={cn(
                                row.original.age25.status !== 'COMPLETE' &&
                                    status?.isEligible &&
                                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
                            )}
                        >
                            {row.original.age25.status === 'COMPLETE'
                                ? 'WITHDRAWN'
                                : status?.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                            {formatDate(row.original.age25.eligibleDate)}
                        </span>
                    </div>
                )
            },
        },
        {
            id: 'age30',
            header: 'Age 30 (50%)',
            cell: ({ row }) => {
                if (!row.original.age30) return '—'
                const status = getWithdrawalStatus(
                    row.original.age30.eligibleDate,
                )
                return (
                    <div className="flex items-center gap-2">
                        <Badge
                            variant={
                                row.original.age30.status === 'COMPLETE'
                                    ? 'secondary'
                                    : getStatusVariant(status?.status || '')
                            }
                            className={cn(
                                row.original.age30.status !== 'COMPLETE' &&
                                    status?.isEligible &&
                                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
                            )}
                        >
                            {row.original.age30.status === 'COMPLETE'
                                ? 'WITHDRAWN'
                                : status?.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                            {formatDate(row.original.age30.eligibleDate)}
                        </span>
                    </div>
                )
            },
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => {
                const age25Status = row.original.age25
                    ? getWithdrawalStatus(row.original.age25.eligibleDate)
                    : null
                const age30Status = row.original.age30
                    ? getWithdrawalStatus(row.original.age30.eligibleDate)
                    : null
                return (
                    <div className="flex gap-2">
                        {row.original.age25 &&
                            age25Status?.isEligible &&
                            row.original.age25.status !== 'COMPLETE' && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300"
                                    onClick={() =>
                                        onProcessWithdrawal(row.original.age25!)
                                    }
                                >
                                    Process 25
                                </Button>
                            )}
                        {row.original.age30 &&
                            age30Status?.isEligible &&
                            row.original.age30.status !== 'COMPLETE' && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300"
                                    onClick={() =>
                                        onProcessWithdrawal(row.original.age30!)
                                    }
                                >
                                    Process 30
                                </Button>
                            )}
                    </div>
                )
            },
        },
    ]

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">
                    Grandchild Age-Based Withdrawals
                </CardTitle>
                <CardDescription>
                    Per trust terms: 50% at age 25, remaining 50% at age 30
                </CardDescription>
            </CardHeader>
            <CardContent>
                <DataTable
                    tableId="hems-withdrawals"
                    data={grandchildrenWithdrawals}
                    columns={withdrawalColumns}
                    isLoading={isLoading}
                    emptyMessage="No grandchild withdrawal schedules found."
                />
            </CardContent>
        </Card>
    )
}
