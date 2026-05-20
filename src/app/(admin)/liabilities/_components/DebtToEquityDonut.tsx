'use client'

import { Cell, Label, Pie, PieChart } from 'recharts'
import {
    type ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { toCents } from '@/lib/money'
import { formatCurrency } from '@/utils/formatters'

export interface DebtToEquityDonutProps {
    /** Sum of liability.currentBalance, as a money string */
    totalDebt: string
    /** Sum of asset values minus debt, as a money string (caller computes) */
    totalEquity: string
    isLoading?: boolean
}

const chartConfig = {
    debt: { label: 'Debt', color: 'var(--destructive)' },
    equity: { label: 'Equity', color: 'var(--success)' },
} satisfies ChartConfig

export function DebtToEquityDonut({
    totalDebt,
    totalEquity,
    isLoading,
}: DebtToEquityDonutProps) {
    if (isLoading) {
        return (
            <div className="flex flex-col items-center gap-2">
                <Skeleton className="h-40 w-40 rounded-full" />
            </div>
        )
    }

    // Cent-level integer math to avoid float drift
    const debtCents = toCents(totalDebt)
    const equityCents = toCents(totalEquity)
    const totalCents = debtCents + equityCents
    const debtPct =
        totalCents > 0 ? Math.round((debtCents / totalCents) * 100) : 0

    const data = [
        {
            name: 'Debt',
            value: debtCents / 100,
            fill: 'var(--destructive)',
        },
        {
            name: 'Equity',
            value: equityCents / 100,
            fill: 'var(--success)',
        },
    ]

    return (
        <div className="flex flex-col items-center gap-2">
            <ChartContainer config={chartConfig} className="mx-auto h-40 w-40">
                <PieChart>
                    <ChartTooltip
                        content={
                            <ChartTooltipContent
                                formatter={(value, name) =>
                                    `${name}: ${formatCurrency(String(value))}`
                                }
                            />
                        }
                    />
                    <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={60}
                        innerRadius={40}
                        strokeWidth={2}
                        isAnimationActive={false}
                    >
                        {data.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} />
                        ))}
                        <Label
                            value={`${debtPct}%`}
                            position="center"
                            className="fill-foreground text-xl font-semibold"
                        />
                    </Pie>
                </PieChart>
            </ChartContainer>
            <p className="text-xs text-muted-foreground">debt to equity</p>
            <div className="text-xs text-muted-foreground space-y-1 text-center">
                <div>Debt: {formatCurrency(totalDebt)}</div>
                <div>Equity: {formatCurrency(totalEquity)}</div>
            </div>
        </div>
    )
}
