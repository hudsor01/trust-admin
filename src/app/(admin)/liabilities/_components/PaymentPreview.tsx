'use client'

import { useStore } from '@tanstack/react-store'
import { useDeferredValue, useMemo } from 'react'
import type { UseResourceFormReturn } from '@/hooks/use-resource-form'
import {
    calculateMonthlyPayment,
    estimatePayoffDate,
} from '@/lib/amortization'
import { formatCurrency } from '@/utils/formatters'
import type { LiabilityFormData } from './LiabilityConstants'
import { isRevolvingType } from './LiabilityConstants'

/** Shorthand for the TanStack Form instance returned by useResourceForm */
type LiabilityFormInstance =
    UseResourceFormReturn<LiabilityFormData>['formInstance']

/**
 * Hook to subscribe to form values from a FormApi instance.
 * Encapsulates the store access since FormApi has 12 generic params.
 */
function useFormValues(formInstance: LiabilityFormInstance) {
    return useStore(formInstance.store, (s) => ({
        originalAmount: s.values.originalAmount,
        interestRate: s.values.interestRate,
        loanTermMonths: s.values.loanTermMonths,
        liabilityType: s.values.liabilityType,
    }))
}

/**
 * PaymentPreview component - shows estimated monthly payment as user types loan terms.
 * Uses useDeferredValue for smooth typing experience without calculation lag.
 */
export function PaymentPreview({
    formInstance,
}: {
    // biome-ignore lint/suspicious/noExplicitAny: TanStack Form Field type is complex; passed through from page.tsx
    formInstance: any
}) {
    // Subscribe to relevant form values - all hooks must be called unconditionally
    // FormApi has 12 generic params; this component accepts any form with LiabilityFormData values.
    // We extract the store and use typed selectors via a helper to avoid scattered any annotations.
    const { originalAmount, interestRate, loanTermMonths, liabilityType } =
        useFormValues(formInstance as LiabilityFormInstance)

    // Defer inputs for smooth typing - hooks must be called before any early returns
    const deferredPrincipal = useDeferredValue(originalAmount)
    const deferredRate = useDeferredValue(interestRate)
    const deferredTerm = useDeferredValue(loanTermMonths)

    // Calculate payment only when deferred values settle
    const calculated = useMemo(() => {
        // Skip calculation for revolving credit (no fixed term)
        if (isRevolvingType(liabilityType)) return null
        if (!deferredPrincipal || !deferredRate || !deferredTerm) return null

        const p = parseFloat(deferredPrincipal)
        const r = parseFloat(deferredRate)
        const t = parseInt(deferredTerm, 10)

        if (
            Number.isNaN(p) ||
            Number.isNaN(r) ||
            Number.isNaN(t) ||
            p <= 0 ||
            r < 0 ||
            t <= 0
        )
            return null

        const rateDecimal = (r / 100).toString()
        const payment = calculateMonthlyPayment(
            deferredPrincipal,
            rateDecimal,
            t,
        )
        const payoffDate = payment
            ? estimatePayoffDate(deferredPrincipal, rateDecimal, payment)
            : null

        return { payment, payoffDate }
    }, [deferredPrincipal, deferredRate, deferredTerm, liabilityType])

    // Render null if no valid calculation (revolving, incomplete data, etc.)
    if (!calculated?.payment) return null

    return (
        <div className="rounded-lg bg-muted/50 p-3 mt-4 transition-all duration-200">
            <div className="text-sm text-muted-foreground">
                Estimated Monthly Payment (P&I)
            </div>
            <div className="text-lg font-semibold">
                {formatCurrency(calculated.payment)}
            </div>
            {calculated.payoffDate?.payoffDate && (
                <div className="text-xs text-muted-foreground mt-1">
                    Payoff date:{' '}
                    {new Date(
                        calculated.payoffDate.payoffDate,
                    ).toLocaleDateString()}
                </div>
            )}
        </div>
    )
}
