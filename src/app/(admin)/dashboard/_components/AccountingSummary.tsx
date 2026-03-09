'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { isNegative } from '@/lib/money'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/utils/formatters'

interface AccountingEntry {
    id: number
    entryType: string
    amount: string
    description: string | null
    incomeType: string | null
    expenseType: string | null
    accountingDate: string
    taxDeductible: boolean | null
}

interface AccountingSummaryProps {
    recentAccountingEntries: AccountingEntry[]
    incomeTotal: string
    expenseTotal: string
    netIncome: string
}

export function AccountingSummary({
    recentAccountingEntries,
    incomeTotal,
    expenseTotal,
    netIncome,
}: AccountingSummaryProps) {
    const incomeEntries = recentAccountingEntries.filter(
        (e) => e.entryType === 'INCOME',
    )
    const expenseEntries = recentAccountingEntries.filter(
        (e) => e.entryType === 'EXPENSE',
    )

    return (
        <div className="space-y-6">
            <div className="@container">
                <div className="grid gap-6 @md:grid-cols-2">
                    {/* Income Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                Income
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {incomeEntries.length === 0 ? (
                                <p className="text-muted-foreground text-sm">
                                    No income entries recorded yet.
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {incomeEntries.map((entry) => (
                                        <div
                                            key={entry.id}
                                            className="flex items-center justify-between"
                                        >
                                            <div>
                                                <p className="text-sm">
                                                    {entry.description ||
                                                        entry.incomeType}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatDate(
                                                        entry.accountingDate,
                                                    )}
                                                </p>
                                            </div>
                                            <p className="text-sm font-medium">
                                                {formatCurrency(entry.amount)}
                                            </p>
                                        </div>
                                    ))}
                                    <Separator />
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium">
                                            Total
                                        </p>
                                        <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                                            {formatCurrency(incomeTotal)}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Expense Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                Expenses
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {expenseEntries.length === 0 ? (
                                <p className="text-muted-foreground text-sm">
                                    No expense entries recorded yet.
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {expenseEntries.map((entry) => (
                                        <div
                                            key={entry.id}
                                            className="flex items-center justify-between"
                                        >
                                            <div>
                                                <p className="text-sm">
                                                    {entry.description ||
                                                        entry.expenseType}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatDate(
                                                        entry.accountingDate,
                                                    )}
                                                    {entry.taxDeductible &&
                                                        ' · Tax deductible'}
                                                </p>
                                            </div>
                                            <p className="text-sm font-medium">
                                                {formatCurrency(entry.amount)}
                                            </p>
                                        </div>
                                    ))}
                                    <Separator />
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium">
                                            Total
                                        </p>
                                        <p className="text-sm font-semibold">
                                            {formatCurrency(expenseTotal)}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Form 1041 Summary */}
            <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">
                    Form 1041 Summary
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                    Trust income tax return summary for the current fiscal year
                </p>
                <div className="@container">
                    <div className="grid gap-4 @sm:grid-cols-3">
                        <Card>
                            <CardContent className="pt-6">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">
                                    Gross Income
                                </p>
                                <p className="text-2xl font-semibold">
                                    {formatCurrency(incomeTotal)}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">
                                    Deductions
                                </p>
                                <p className="text-2xl font-semibold">
                                    {formatCurrency(expenseTotal)}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">
                                    Distributable Net Income
                                </p>
                                <p
                                    className={cn(
                                        'text-2xl font-semibold',
                                        isNegative(netIncome)
                                            ? 'text-red-600 dark:text-red-400'
                                            : 'text-green-600 dark:text-green-400',
                                    )}
                                >
                                    {formatCurrency(netIncome)}
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
