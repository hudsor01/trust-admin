/** Income vs expense bar chart for period-based comparison. */
'use client'

import {
    Bar,
    BarChart,
    CartesianGrid,
    ReferenceLine,
    XAxis,
    YAxis,
} from 'recharts'
import {
    type ChartConfig,
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart'
import { formatCurrency } from '@/utils/formatters'

export interface IncomeExpenseDataPoint {
    period: string
    income: number
    expenses: number
    netCashFlow?: number
}

interface IncomeExpenseChartProps {
    data: IncomeExpenseDataPoint[]
    height?: number
    showNetCashFlow?: boolean
    showLegend?: boolean
}

const chartConfig = {
    income: {
        label: 'Income',
        color: 'hsl(142, 76%, 36%)', // Green
    },
    expenses: {
        label: 'Expenses',
        color: 'hsl(0, 84%, 60%)', // Red
    },
    netCashFlow: {
        label: 'Net Cash Flow',
        color: 'hsl(221, 83%, 53%)', // Blue
    },
} satisfies ChartConfig

export function IncomeExpenseChart({
    data,
    height = 300,
    showNetCashFlow = false,
    showLegend = true,
}: IncomeExpenseChartProps) {
    if (!data || data.length === 0) {
        return (
            <div
                className="flex items-center justify-center text-muted-foreground"
                style={{ height }}
            >
                No income/expense data available
            </div>
        )
    }

    const chartData = data.map((d) => ({
        ...d,
        netCashFlow: d.netCashFlow ?? d.income - d.expenses,
    }))

    return (
        <ChartContainer
            config={chartConfig}
            className="w-full"
            style={{ height }}
        >
            <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
            >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                    dataKey="period"
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
                {showLegend && <ChartLegend content={<ChartLegendContent />} />}
                <Bar
                    dataKey="income"
                    fill="var(--color-income)"
                    radius={[4, 4, 0, 0]}
                />
                <Bar
                    dataKey="expenses"
                    fill="var(--color-expenses)"
                    radius={[4, 4, 0, 0]}
                />
                {showNetCashFlow && (
                    <ReferenceLine
                        y={0}
                        stroke="hsl(var(--muted-foreground))"
                        strokeDasharray="3 3"
                    />
                )}
            </BarChart>
        </ChartContainer>
    )
}

export function IncomeExpenseStackedChart({
    data,
    height = 300,
}: {
    data: IncomeExpenseDataPoint[]
    height?: number
}) {
    if (!data || data.length === 0) {
        return (
            <div
                className="flex items-center justify-center text-muted-foreground"
                style={{ height }}
            >
                No income/expense data available
            </div>
        )
    }

    return (
        <ChartContainer
            config={chartConfig}
            className="w-full"
            style={{ height }}
        >
            <BarChart
                data={data}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
            >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                    dataKey="period"
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
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                    dataKey="income"
                    stackId="a"
                    fill="var(--color-income)"
                    radius={[0, 0, 0, 0]}
                />
                <Bar
                    dataKey="expenses"
                    stackId="b"
                    fill="var(--color-expenses)"
                    radius={[4, 4, 0, 0]}
                />
            </BarChart>
        </ChartContainer>
    )
}
