'use client'

import { ArrowRightLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible'
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

/** Compact inline summary stats (Receipts, Disbursements, Net, Tax Deductible) */
export function AccountingSummaryStats({
    incomeTotal,
    expenseTotal,
    netIncome,
    deductibleExpenses,
}: {
    incomeTotal: string
    expenseTotal: string
    netIncome: string
    deductibleExpenses: string
}) {
    return (
        <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
            <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Receipts
                </p>
                <p className="text-xl font-bold tabular-nums text-success">
                    {formatCurrency(incomeTotal)}
                </p>
            </div>
            <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Disbursements
                </p>
                <p className="text-xl font-bold tabular-nums text-destructive">
                    {formatCurrency(expenseTotal)}
                </p>
            </div>
            <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Net Change
                </p>
                <p
                    className={cn(
                        'text-xl font-bold tabular-nums',
                        isNegative(netIncome)
                            ? 'text-destructive'
                            : 'text-success',
                    )}
                >
                    {formatCurrency(netIncome)}
                </p>
            </div>
            <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Tax Deductible
                </p>
                <p className="text-xl font-bold tabular-nums">
                    {formatCurrency(deductibleExpenses)}
                </p>
            </div>
        </div>
    )
}

/** Collapsible panel for Principal/Income breakdown + Year-End Conversion */
export function AccountingCompliancePanel({
    principalReceipts,
    incomeReceipts,
    principalDisbursements,
    incomeDisbursements,
    unconvertedSummary,
    convertingYear,
    onConvertYear,
}: {
    principalReceipts: string
    incomeReceipts: string
    principalDisbursements: string
    incomeDisbursements: string
    unconvertedSummary: UnconvertedYearData[]
    convertingYear: number | null
    onConvertYear: (fiscalYear: number) => void
}) {
    const hasUnconverted = unconvertedSummary.length > 0

    return (
        <Collapsible defaultOpen={hasUnconverted}>
            <CollapsibleTrigger className="group flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                Principal &amp; Income Details
                {hasUnconverted && (
                    <span className="inline-flex items-center rounded-full bg-warning/20 px-2 py-0.5 text-xs font-medium text-warning">
                        {unconvertedSummary.length} unconverted
                    </span>
                )}
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    {/* Principal vs Income Breakdown */}
                    <Card>
                        <CardContent className="pt-4 pb-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                                Principal vs Income (Texas 113.152)
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">
                                        Receipts
                                    </p>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            Principal
                                        </span>
                                        <span className="tabular-nums">
                                            {formatCurrency(principalReceipts)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            Income
                                        </span>
                                        <span className="tabular-nums">
                                            {formatCurrency(incomeReceipts)}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">
                                        Disbursements
                                    </p>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            Principal
                                        </span>
                                        <span className="tabular-nums">
                                            {formatCurrency(
                                                principalDisbursements,
                                            )}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            Income
                                        </span>
                                        <span className="tabular-nums">
                                            {formatCurrency(
                                                incomeDisbursements,
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Year-End Conversion */}
                    <Card>
                        <CardContent className="pt-4 pb-4">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Year-End Conversion
                                </p>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="max-w-xs">
                                                Section 7.10(c): Undistributed
                                                income added to principal
                                                annually.
                                            </p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>

                            {unconvertedSummary.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    All income converted to principal.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {unconvertedSummary.map((yearData) => (
                                        <div
                                            key={yearData.fiscalYear}
                                            className="flex items-center justify-between py-2 px-3 rounded-md border bg-muted/30"
                                        >
                                            <div>
                                                <p className="text-sm font-medium">
                                                    FY {yearData.fiscalYear}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {yearData.entryCount}{' '}
                                                    {yearData.entryCount === 1
                                                        ? 'entry'
                                                        : 'entries'}{' '}
                                                    &bull;{' '}
                                                    {formatCurrency(
                                                        yearData.totalAmount,
                                                    )}
                                                </p>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                    onConvertYear(
                                                        yearData.fiscalYear,
                                                    )
                                                }
                                                disabled={
                                                    convertingYear ===
                                                    yearData.fiscalYear
                                                }
                                                className="shrink-0"
                                            >
                                                {convertingYear ===
                                                yearData.fiscalYear ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    'Convert'
                                                )}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </CollapsibleContent>
        </Collapsible>
    )
}
