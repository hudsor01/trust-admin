'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { Liability } from '@/db/schema'
import { estimatePayoffDate, getCurrentLoanPosition } from '@/lib/amortization'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/utils/formatters'

interface LiabilityProgressCardProps {
    liability: Liability
    showDetails?: boolean
    compact?: boolean
}

const LIABILITY_TYPE_LABELS: Record<string, string> = {
    MORTGAGE: 'Mortgage',
    LOAN: 'Loan',
    CREDIT_CARD: 'Credit Card',
    TAX_OWED: 'Tax Owed',
    ACCOUNTS_PAYABLE: 'Accounts Payable',
    LEGAL_JUDGMENT: 'Legal Judgment',
    OTHER: 'Other',
}

/**
 * LiabilityProgressCard - Visual representation of liability payoff progress
 *
 * Shows:
 * - Creditor name and liability type badge
 * - Progress bar (% paid off)
 * - Payment position (X of Y payments) for loans with terms
 * - Estimated payoff date
 * - Monthly payment amount
 */
export function LiabilityProgressCard({
    liability,
    showDetails = true,
    compact = false,
}: LiabilityProgressCardProps) {
    const original = parseFloat(liability.originalAmount ?? '0')
    const current = parseFloat(liability.currentBalance ?? '0')
    const isRevolvingCredit =
        liability.isRevolvingCredit || liability.liabilityType === 'CREDIT_CARD'

    // Calculate progress percentage
    const progressPercent =
        original > 0 ? Math.round(((original - current) / original) * 100) : 0
    const isPaidOff = current <= 0

    // Get loan position (for loans with terms)
    let loanPosition: {
        paymentsMade: number
        paymentsRemaining: number
    } | null = null
    if (
        !isRevolvingCredit &&
        liability.originalAmount &&
        liability.interestRate &&
        liability.loanTermMonths &&
        liability.loanStartDate &&
        liability.currentBalance
    ) {
        const position = getCurrentLoanPosition(
            liability.originalAmount,
            (parseFloat(liability.interestRate) / 100).toString(),
            liability.loanTermMonths,
            liability.loanStartDate,
            liability.currentBalance,
        )
        if (position) {
            loanPosition = position
        }
    }

    // Get payoff estimate
    let payoffEstimate: { payoffDate: string; monthsRemaining: number } | null =
        null
    if (
        !isPaidOff &&
        liability.currentBalance &&
        liability.interestRate &&
        liability.monthlyPayment &&
        parseFloat(liability.monthlyPayment) > 0
    ) {
        const estimate = estimatePayoffDate(
            liability.currentBalance,
            (parseFloat(liability.interestRate) / 100).toString(),
            liability.monthlyPayment,
            liability.escrowMonthly ?? undefined,
        )
        if (estimate) {
            payoffEstimate = estimate
        }
    }

    const typeLabel =
        LIABILITY_TYPE_LABELS[liability.liabilityType] ||
        liability.liabilityType

    if (compact) {
        // Compact version for dashboard list
        return (
            <div className="flex items-center gap-3 py-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                            {liability.creditor}
                        </span>
                        <Badge variant="outline" className="text-xs shrink-0">
                            {typeLabel}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <Progress
                            value={progressPercent}
                            className={cn(
                                'h-2 flex-1',
                                isPaidOff && '[&>div]:bg-green-500',
                            )}
                        />
                        <span className="text-xs text-muted-foreground w-12 text-right">
                            {isPaidOff ? 'Paid' : `${progressPercent}%`}
                        </span>
                    </div>
                </div>
                <div className="text-right shrink-0">
                    <div className="text-sm font-semibold">
                        {formatCurrency(liability.currentBalance ?? '0')}
                    </div>
                    {payoffEstimate && showDetails && (
                        <div className="text-xs text-muted-foreground">
                            {formatDate(payoffEstimate.payoffDate)}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // Full card version
    return (
        <Card>
            <CardContent className="pt-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="font-medium">
                            {liability.creditor}
                        </span>
                        <Badge variant="outline" className="text-xs">
                            {typeLabel}
                        </Badge>
                    </div>
                    {isPaidOff && (
                        <Badge className="bg-green-500 hover:bg-green-600">
                            Paid Off
                        </Badge>
                    )}
                </div>

                {/* Progress bar */}
                <div className="space-y-2">
                    <Progress
                        value={progressPercent}
                        className={cn(
                            'h-3',
                            progressPercent >= 75 && '[&>div]:bg-green-500',
                            progressPercent >= 25 &&
                                progressPercent < 75 &&
                                '[&>div]:bg-yellow-500',
                        )}
                    />
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                            {isPaidOff
                                ? 'Paid in full'
                                : `${progressPercent}% paid off`}
                        </span>
                        {!isPaidOff && (
                            <span className="font-medium">
                                {formatCurrency(
                                    liability.currentBalance ?? '0',
                                )}{' '}
                                remaining
                            </span>
                        )}
                    </div>
                </div>

                {/* Details */}
                {showDetails && !isPaidOff && (
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        {/* Payment position (for loans with terms) */}
                        {loanPosition && (
                            <div>
                                <div className="text-muted-foreground">
                                    Payment
                                </div>
                                <div className="font-medium">
                                    {loanPosition.paymentsMade} of{' '}
                                    {loanPosition.paymentsMade +
                                        loanPosition.paymentsRemaining}
                                </div>
                            </div>
                        )}

                        {/* Payoff date */}
                        {payoffEstimate && (
                            <div>
                                <div className="text-muted-foreground">
                                    Est. Payoff
                                </div>
                                <div className="font-medium">
                                    {formatDate(payoffEstimate.payoffDate)}
                                </div>
                            </div>
                        )}

                        {/* Monthly payment */}
                        {liability.monthlyPayment && (
                            <div>
                                <div className="text-muted-foreground">
                                    {isRevolvingCredit
                                        ? 'Min. Payment'
                                        : 'Monthly Payment'}
                                </div>
                                <div className="font-medium">
                                    {formatCurrency(liability.monthlyPayment)}
                                </div>
                            </div>
                        )}

                        {/* Interest rate */}
                        {liability.interestRate && (
                            <div>
                                <div className="text-muted-foreground">
                                    {isRevolvingCredit
                                        ? 'APR'
                                        : 'Interest Rate'}
                                </div>
                                <div className="font-medium">
                                    {liability.interestRate}%
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* No original amount edge case */}
                {!original && !isPaidOff && (
                    <div className="mt-2 text-xs text-muted-foreground">
                        Original amount not recorded - showing current balance
                        only
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
