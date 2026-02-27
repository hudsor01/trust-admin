'use client'

import { useStore } from '@tanstack/react-store'
import { useDeferredValue, useMemo } from 'react'
import type { UseResourceFormReturn } from '@/hooks/use-resource-form'
import { calculateMonthlyPayment, estimatePayoffDate } from '@/lib/amortization'
import { formatCurrency } from '@/utils/formatters'
import type { LiabilityFormData } from './LiabilityConstants'
import { isRevolvingType } from './LiabilityConstants'

type LiabilityFormInstance =
    UseResourceFormReturn<LiabilityFormData>['formInstance']

/** Avoids repeating FormApi's 12 generic type params at each call site. */
function useFormValues(formInstance: LiabilityFormInstance) {
    return useStore(formInstance.store, (s) => ({
        originalAmount: s.values.originalAmount,
        interestRate: s.values.interestRate,
        loanTermMonths: s.values.loanTermMonths,
        liabilityType: s.values.liabilityType,
    }))
}

/** Shows estimated monthly payment as loan terms are typed. */
export function PaymentPreview({
    formInstance,
}: {
    formInstance: LiabilityFormInstance
}) {
    const { originalAmount, interestRate, loanTermMonths, liabilityType } =
        useFormValues(formInstance)

    const deferredPrincipal = useDeferredValue(originalAmount)
    const deferredRate = useDeferredValue(interestRate)
    const deferredTerm = useDeferredValue(loanTermMonths)

    const calculated = useMemo(() => {
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
