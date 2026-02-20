'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { isNegative, isPositive } from '@/lib/money'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/utils/formatters'

interface DashboardStatsProps {
    completedCount: number
    totalCount: number
    progressPercent: number
    incomeTotal: string
    expenseTotal: string
    netIncome: string
    incomeEntryCount: number
    expenseEntryCount: number
}

export function DashboardStats({
    completedCount,
    totalCount,
    progressPercent,
    incomeTotal,
    expenseTotal,
    netIncome,
    incomeEntryCount,
    expenseEntryCount,
}: DashboardStatsProps) {
    return (
        <div className="@container">
            <div className="grid gap-4 @sm:grid-cols-2 @lg:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">
                            Task Progress
                        </p>
                        <p className="text-2xl font-semibold mb-2">
                            {completedCount} of {totalCount}
                        </p>
                        <Progress value={progressPercent} className="h-2 mb-2" />
                        <p className="text-xs text-muted-foreground">
                            {progressPercent}% complete
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">
                            Total Income
                        </p>
                        <p className="text-2xl font-semibold mb-2">
                            {formatCurrency(incomeTotal)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {incomeEntryCount} transactions
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">
                            Total Expenses
                        </p>
                        <p className="text-2xl font-semibold mb-2">
                            {formatCurrency(expenseTotal)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {expenseEntryCount} transactions
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">
                            Net Position
                        </p>
                        <p
                            className={cn(
                                'text-2xl font-semibold mb-2',
                                isNegative(netIncome)
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-green-600 dark:text-green-400',
                            )}
                        >
                            {formatCurrency(netIncome)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {!isNegative(netIncome) ? '+' : ''}
                            {isPositive(incomeTotal)
                                ? Math.round(
                                      (parseFloat(netIncome) /
                                          parseFloat(incomeTotal)) *
                                          100,
                                  )
                                : 0}
                            % margin
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
