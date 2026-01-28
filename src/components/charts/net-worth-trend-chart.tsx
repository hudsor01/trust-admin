/**
 * Net Worth Trend Chart
 *
 * Line chart showing net worth over time.
 * Uses Recharts LineChart for time-series visualization.
 */
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
    /** Date label (e.g., "Jan 2026") */
    date: string
    /** Total assets value */
    assets: number
    /** Total liabilities value */
    liabilities: number
    /** Net worth (assets - liabilities) */
    netWorth: number
}

interface NetWorthTrendChartProps {
    /** Time series data points */
    data: NetWorthDataPoint[]
    /** Chart height in pixels */
    height?: number
    /** Show assets and liabilities lines */
    showBreakdown?: boolean
}

const chartConfig = {
    netWorth: {
        label: 'Net Worth',
        color: 'hsl(221, 83%, 53%)', // Blue
    },
    assets: {
        label: 'Total Assets',
        color: 'hsl(142, 76%, 36%)', // Green
    },
    liabilities: {
        label: 'Total Liabilities',
        color: 'hsl(0, 84%, 60%)', // Red
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

    // Find if net worth ever goes negative to show reference line
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
                        stroke="hsl(var(--muted-foreground))"
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
