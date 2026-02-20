'use client'

import { DollarSign } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/utils/formatters'

interface LiabilitySummaryCardsProps {
    totalLiabilities: string
    totalActive: string
    activeLiabilitiesCount: number
    totalRecords: number
}

export function LiabilitySummaryCards({
    totalLiabilities,
    totalActive,
    activeLiabilitiesCount,
    totalRecords,
}: LiabilitySummaryCardsProps) {
    return (
        <div className="grid grid-cols-3 gap-4">
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        Total Liabilities
                    </div>
                    <div className="text-2xl font-bold text-destructive">
                        {formatCurrency(totalLiabilities)}
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">
                        Active Debts
                    </div>
                    <div className="text-2xl font-bold">
                        {formatCurrency(totalActive)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {activeLiabilitiesCount} active{' '}
                        {activeLiabilitiesCount === 1
                            ? 'liability'
                            : 'liabilities'}
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">
                        Total Records
                    </div>
                    <div className="text-2xl font-bold">{totalRecords}</div>
                </CardContent>
            </Card>
        </div>
    )
}
