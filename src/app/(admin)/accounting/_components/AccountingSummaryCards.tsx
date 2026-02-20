'use client'

import { ArrowRightLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { isNegative } from '@/lib/money'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/utils/formatters'

interface UnconvertedYearData {
    fiscalYear: number
    entryCount: number
    totalAmount: string
}

interface AccountingSummaryCardsProps {
    incomeTotal: string
    expenseTotal: string
    netIncome: string
    deductibleExpenses: string
    principalReceipts: string
    incomeReceipts: string
    principalDisbursements: string
    incomeDisbursements: string
    unconvertedSummary: UnconvertedYearData[]
    convertingYear: number | null
    onConvertYear: (fiscalYear: number) => void
}

export function AccountingSummaryCards({
    incomeTotal,
    expenseTotal,
    netIncome,
    deductibleExpenses,
    principalReceipts,
    incomeReceipts,
    principalDisbursements,
    incomeDisbursements,
    unconvertedSummary,
    convertingYear,
    onConvertYear,
}: AccountingSummaryCardsProps) {
    return (
        <div className="@container">
            <div className="grid gap-4 @xs:grid-cols-2 @lg:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Total Receipts
                        </p>
                        <p className="mt-2 text-2xl font-bold text-success">
                            {formatCurrency(incomeTotal)}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Total Disbursements
                        </p>
                        <p className="mt-2 text-2xl font-bold text-destructive">
                            {formatCurrency(expenseTotal)}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Net Change
                        </p>
                        <p
                            className={cn(
                                'mt-2 text-2xl font-bold',
                                isNegative(netIncome)
                                    ? 'text-destructive'
                                    : 'text-success',
                            )}
                        >
                            {formatCurrency(netIncome)}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Tax Deductible
                        </p>
                        <p className="mt-2 text-2xl font-bold">
                            {formatCurrency(deductibleExpenses)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Texas 113.152(2) - Principal vs Income Breakdown */}
            <Card className="mt-4">
                <CardContent className="pt-6">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                        Principal vs Income Allocation (Texas 113.152)
                    </p>
                    <div className="grid gap-6 @xs:grid-cols-2">
                        <div className="space-y-3">
                            <p className="text-sm font-medium">Receipts</p>
                            <div className="flex justify-between items-center py-2 border-b">
                                <span className="text-sm text-muted-foreground">
                                    Principal
                                </span>
                                <span className="font-medium tabular-nums">
                                    {formatCurrency(principalReceipts)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b">
                                <span className="text-sm text-muted-foreground">
                                    Income
                                </span>
                                <span className="font-medium tabular-nums">
                                    {formatCurrency(incomeReceipts)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-2 font-medium">
                                <span className="text-sm">Total</span>
                                <span className="tabular-nums text-success">
                                    {formatCurrency(incomeTotal)}
                                </span>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <p className="text-sm font-medium">Disbursements</p>
                            <div className="flex justify-between items-center py-2 border-b">
                                <span className="text-sm text-muted-foreground">
                                    Principal
                                </span>
                                <span className="font-medium tabular-nums">
                                    {formatCurrency(principalDisbursements)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b">
                                <span className="text-sm text-muted-foreground">
                                    Income
                                </span>
                                <span className="font-medium tabular-nums">
                                    {formatCurrency(incomeDisbursements)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-2 font-medium">
                                <span className="text-sm">Total</span>
                                <span className="tabular-nums text-destructive">
                                    {formatCurrency(expenseTotal)}
                                </span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Year-End Income to Principal Conversion - Section 7.10(c) */}
            <Card className="mt-4">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Year-End Conversion
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Section 7.10(c): Undistributed income added to
                                principal annually
                            </p>
                        </div>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="max-w-xs">
                                        Per the trust agreement, all income not
                                        distributed to beneficiaries shall be
                                        added to principal at least annually.
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>

                    {unconvertedSummary.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            No unconverted income entries found. All income has
                            been converted to principal.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {unconvertedSummary.map((yearData) => (
                                <div
                                    key={yearData.fiscalYear}
                                    className="flex items-center justify-between py-3 px-4 rounded-lg border bg-muted/30"
                                >
                                    <div>
                                        <p className="font-medium">
                                            Fiscal Year {yearData.fiscalYear}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {yearData.entryCount}{' '}
                                            {yearData.entryCount === 1
                                                ? 'entry'
                                                : 'entries'}{' '}
                                            •{' '}
                                            {formatCurrency(
                                                yearData.totalAmount,
                                            )}
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                            onConvertYear(yearData.fiscalYear)
                                        }
                                        disabled={
                                            convertingYear ===
                                            yearData.fiscalYear
                                        }
                                        className="shrink-0"
                                    >
                                        {convertingYear ===
                                        yearData.fiscalYear ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Converting...
                                            </>
                                        ) : (
                                            <>
                                                <ArrowRightLeft className="mr-2 h-4 w-4" />
                                                Convert to Principal
                                            </>
                                        )}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
