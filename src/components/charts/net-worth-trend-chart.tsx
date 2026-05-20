/** Net worth over time line chart. */
'use client'

import {
    CartesianGrid,
    Line,
    LineChart,
    ReferenceLine,
    XAxis,
    YAxis,
} from 'recharts'
import {
    type ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart'
import { formatCurrency } from '@/utils/formatters'

export interface NetWorthDataPoint {
    date: string
    assets: number
    liabilities: number
    netWorth: number
}

interface NetWorthTrendChartProps {
    data: NetWorthDataPoint[]
    height?: number
    showBreakdown?: boolean
}

const chartConfig = {
    netWorth: {
        label: 'Net Worth',
        color: 'var(--chart-1)', // Primary (blue)
    },
    assets: {
        label: 'Total Assets',
        color: 'var(--chart-2)', // Success (green)
    },
    liabilities: {
        label: 'Total Liabilities',
        color: 'var(--chart-3)', // Destructive (red)
    },
} satisfies ChartConfig

export function NetWorthTrendChart({
    data,
    height = 300,
    showBreakdown = false,
}: NetWorthTrendChartProps) {
    if (!data || data.length === 0) {
        return (
            <div
                className="flex items-center justify-center text-muted-foreground"
                style={{ height }}
            >
                No trend data available
            </div>
        )
    }

    const hasNegative = data.some((d) => d.netWorth < 0)

    return (
        <ChartContainer
            config={chartConfig}
            className="w-full"
            style={{ height }}
        >
            <LineChart
                data={data}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
            >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                />
                <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => {
                        if (Math.abs(value) >= 1000000) {
                            return `$${(value / 1000000).toFixed(1)}M`
                        }
                        if (Math.abs(value) >= 1000) {
                            return `$${(value / 1000).toFixed(0)}K`
                        }
                        return `$${value}`
                    }}
                />
                <ChartTooltip
                    content={
                        <ChartTooltipContent
                            formatter={(value, name) => {
                                const label =
                                    chartConfig[
                                        name as keyof typeof chartConfig
                                    ]?.label || name
                                return (
                                    <div className="flex items-center justify-between gap-4">
                                        <span>{label}</span>
                                        <span className="font-mono font-medium">
                                            {formatCurrency(String(value))}
                                        </span>
                                    </div>
                                )
                            }}
                        />
                    }
                />
                {hasNegative && (
                    <ReferenceLine
                        y={0}
                        stroke="var(--muted-foreground)"
                        strokeDasharray="3 3"
                    />
                )}
                {showBreakdown && (
                    <>
                        <Line
                            type="monotone"
                            dataKey="assets"
                            stroke="var(--color-assets)"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="liabilities"
                            stroke="var(--color-liabilities)"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                        />
                    </>
                )}
                <Line
                    type="monotone"
                    dataKey="netWorth"
                    stroke="var(--color-netWorth)"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6 }}
                />
            </LineChart>
        </ChartContainer>
    )
}
