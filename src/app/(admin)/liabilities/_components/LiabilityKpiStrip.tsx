'use client'

import { AlertCircle, DollarSign, Percent, TrendingDown } from 'lucide-react'
import { KpiStrip, type KpiStripItem } from '@/components/kpi-strip'
import { sumStrings, toCents } from '@/lib/money'
import { formatCurrency, formatPercent } from '@/utils/formatters'

type Liability = {
    id: number
    status: string
    originalAmount: string | null
    currentBalance: string | null
    interestRate: string | null
}

export interface LiabilityKpiStripProps {
    liabilities: Liability[]
    isLoading?: boolean
}

export function LiabilityKpiStrip({
    liabilities,
    isLoading,
}: LiabilityKpiStripProps) {
    const active = liabilities.filter(
        (l) =>
            l.status === 'ACTIVE' ||
            l.status === 'CURRENT' ||
            l.status === 'OPEN',
    )
    const totalOriginal = sumStrings(liabilities.map((l) => l.originalAmount))
    const totalBalance = sumStrings(liabilities.map((l) => l.currentBalance))

    // Weighted average APR = SUM(currentBalance * interestRate) / SUM(currentBalance)
    // interestRate is stored as a decimal (e.g. "0.065" = 6.5%). Use cent-level
    // weights (integer math) and multiply by 100 at render time for formatPercent.
    let weightedNumerator = 0
    let weightedDenominator = 0
    for (const l of liabilities) {
        if (!l.interestRate || !l.currentBalance) continue
        const balanceCents = toCents(l.currentBalance)
        const rate = Number.parseFloat(l.interestRate)
        if (Number.isNaN(rate) || balanceCents === 0) continue
        weightedNumerator += balanceCents * rate
        weightedDenominator += balanceCents
    }
    const weightedAvgApr =
        weightedDenominator > 0
            ? (weightedNumerator / weightedDenominator) * 100
            : 0

    const data: KpiStripItem[] = [
        { label: 'Active', value: active.length, icon: AlertCircle },
        {
            label: 'Original principal',
            value: formatCurrency(totalOriginal),
            icon: DollarSign,
        },
        {
            label: 'Current balance',
            value: formatCurrency(totalBalance),
            icon: TrendingDown,
            invertDelta: true, // balance going DOWN is GOOD
        },
        {
            label: 'Weighted avg APR',
            value: formatPercent(weightedAvgApr),
            icon: Percent,
        },
    ]

    return <KpiStrip data={data} isLoading={isLoading} />
}
