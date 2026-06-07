'use client'

import {
    AlertCircle,
    AlertTriangle,
    DollarSign,
    TrendingUp,
} from 'lucide-react'
import { KpiStrip, type KpiStripItem } from '@/components/kpi-strip'
import { sumStrings, toCents } from '@/lib/money'
import { formatCurrency } from '@/utils/formatters'

type Receivable = {
    id: number
    status: string
    originalPrincipal: string | null
    currentBalance: string | null
    dueDate: string | null
}

export interface ReceivableKpiStripProps {
    receivables: Receivable[]
    isLoading?: boolean
}

export function ReceivableKpiStrip({
    receivables,
    isLoading,
}: ReceivableKpiStripProps) {
    const active = receivables.filter(
        (r) => r.status === 'ACTIVE' || r.status === 'OPEN',
    )
    const totalOriginal = sumStrings(
        receivables.map((r) => r.originalPrincipal),
    )
    const totalBalance = sumStrings(receivables.map((r) => r.currentBalance))

    const now = Date.now()
    const overdue = receivables.filter(
        (r) =>
            r.dueDate !== null &&
            new Date(r.dueDate).getTime() < now &&
            toCents(r.currentBalance) > 0,
    )

    const data: KpiStripItem[] = [
        {
            label: 'Total outstanding',
            value: formatCurrency(totalBalance),
            icon: DollarSign,
        },
        { label: 'Active', value: active.length, icon: AlertCircle },
        { label: 'Overdue', value: overdue.length, icon: AlertTriangle },
        {
            label: 'Original principal',
            value: formatCurrency(totalOriginal),
            icon: TrendingUp,
        },
    ]

    return <KpiStrip data={data} isLoading={isLoading} />
}
