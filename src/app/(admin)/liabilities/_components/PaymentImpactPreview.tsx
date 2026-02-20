'use client'

import { useStore } from '@tanstack/react-store'
import { useDeferredValue, useMemo } from 'react'
import type { UseResourceFormReturn } from '@/hooks/use-resource-form'
import {
    calculatePaymentSplit,
    estimatePayoffDate,
} from '@/lib/amortization'
import { formatCurrency } from '@/utils/formatters'
import type { Liability } from '@/db/schema'
import type { PaymentFormData } from './LiabilityConstants'
import { isRevolvingType } from './LiabilityConstants'

/** Shorthand for the TanStack Form instance returned by useResourceForm for payments */
type PaymentFormInstance =
    UseResourceFormReturn<PaymentFormData>['formInstance']

/**
 * PaymentImpactPreview component - shows real-time principal/interest split as user types payment amount.
 * Uses useDeferredValue for smooth typing experience without calculation lag.
 * Displays: Principal, Interest, Escrow, New Balance, and estimated payoff date.
 */
export function PaymentImpactPreview({
    formInstance,
    liability,
}: {
    // biome-ignore lint/suspicious/noExplicitAny: TanStack Form Field type is complex; passed through from page.tsx
    formInstance: any
    liability: Liability
}) {
    // Subscribe to payment amount - hooks must be called unconditionally
    const amount = useStore(
        (formInstance as PaymentFormInstance).store,
        (s) => s.values.amount,
    ) as string | undefined

    // Defer input for smooth typing
    const deferredAmount = useDeferredValue(amount)

    // Skip for revolving credit (credit cards don't have fixed amortization)
    const isRevolving = isRevolvingType(liability.liabilityType)

    // Calculate payment split when deferred value settles
    const calculated = useMemo(() => {
        // No calculation preview for credit cards
        if (isRevolving) return null

        // Need amount, balance, and interest rate
        if (
            !deferredAmount ||
            !liability.currentBalance ||
            !liability.interestRate
        )
            return null

        const paymentNum = parseFloat(deferredAmount.replace(/[,$]/g, ''))
        if (Number.isNaN(paymentNum) || paymentNum <= 0) return null

        // CRITICAL: Interest rate is stored as percentage (e.g., "6.5"), must convert to decimal
        const rateDecimal = (
            parseFloat(liability.interestRate) / 100
        ).toString()

        // Get escrow if set
        const escrow = liability.escrowMonthly || '0'

        const split = calculatePaymentSplit(
            liability.currentBalance,
            rateDecimal,
            deferredAmount.replace(/[,$]/g, ''),
            escrow,
        )

        if (!split) return null

        // Calculate updated payoff date
        const payoff = estimatePayoffDate(
            split.newBalance,
            rateDecimal,
            liability.monthlyPayment || deferredAmount.replace(/[,$]/g, ''),
            escrow,
        )

        return { split, payoff }
    }, [
        deferredAmount,
        liability.currentBalance,
        liability.interestRate,
        liability.escrowMonthly,
        liability.monthlyPayment,
        isRevolving,
    ])

    // Don't render for revolving credit or if no valid calculation
    if (isRevolving || !calculated?.split) return null

    const { split, payoff } = calculated
    const principalNum = parseFloat(split.principal)
    const monthlyPayment = parseFloat(liability.monthlyPayment || '0')
    const paymentAmount = parseFloat(
        deferredAmount?.replace(/[,$]/g, '') || '0',
    )

    // Determine payment status
    const isPartialPayment =
        monthlyPayment > 0 && paymentAmount < monthlyPayment * 0.9
    const isExtraPayment = monthlyPayment > 0 && paymentAmount > monthlyPayment
    const isNegativePrincipal = principalNum < 0

    return (
        <div className="space-y-3 mt-4">
            {/* Warning for payment that doesn't cover interest */}
            {isNegativePrincipal && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                    Payment doesn't cover interest. Balance will increase.
                </div>
            )}

            {/* Warning for partial payment */}
            {isPartialPayment && !isNegativePrincipal && (
                <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
                    This is less than the expected payment of{' '}
                    {formatCurrency(liability.monthlyPayment)}
                </div>
            )}

            {/* Payment Breakdown */}
            <div className="rounded-lg bg-muted/50 p-3">
                <div className="text-sm font-medium mb-2">
                    Payment Breakdown
                </div>
                <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">
                            Principal:
                        </span>
                        <span
                            className={principalNum < 0 ? 'text-red-600' : ''}
                        >
                            {formatCurrency(split.principal)}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Interest:</span>
                        <span>{formatCurrency(split.interest)}</span>
                    </div>
                    {parseFloat(split.escrow) > 0 && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">
                                Escrow:
                            </span>
                            <span>{formatCurrency(split.escrow)}</span>
                        </div>
                    )}
                    <div className="flex justify-between pt-1.5 border-t font-medium">
                        <span>New Balance:</span>
                        <span>{formatCurrency(split.newBalance)}</span>
                    </div>
                </div>

                {/* Payoff date projection */}
                {payoff?.payoffDate && (
                    <div className="mt-3 pt-3 border-t text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">
                                Est. Payoff:
                            </span>
                            <span className="flex items-center gap-2">
                                {new Date(
                                    payoff.payoffDate,
                                ).toLocaleDateString()}
                                {isExtraPayment && (
                                    <span className="text-green-600 text-xs">
                                        Extra payment accelerates payoff!
                                    </span>
                                )}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
