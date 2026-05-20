'use client'

import { Label, Pie, PieChart } from 'recharts'
import {
    type ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart'
import { formatCurrency } from '@/utils/formatters'

interface NetWorthChartProps {
    totalAssets: string
    totalLiabilities: string
}

const chartConfig = {
    assets: {
        label: 'Assets',
        color: 'var(--chart-2)', // Success (green)
    },
    liabilities: {
        label: 'Liabilities',
        color: 'var(--chart-3)', // Destructive (red)
    },
} satisfies ChartConfig

export function NetWorthChart({
    totalAssets,
    totalLiabilities,
}: NetWorthChartProps) {
    const assetsValue = Number.parseFloat(totalAssets) || 0
    const liabilitiesValue = Number.parseFloat(totalLiabilities) || 0
    const netWorth = assetsValue - liabilitiesValue

    const chartData = [
        { name: 'assets', value: assetsValue, fill: 'var(--color-assets)' },
        {
            name: 'liabilities',
            value: liabilitiesValue,
            fill: 'var(--color-liabilities)',
        },
    ].filter((d) => d.value > 0)

    if (chartData.length === 0) {
        return (
            <div className="flex h-[250px] w-full items-center justify-center text-muted-foreground">
                No financial data available
            </div>
        )
    }

    return (
        <ChartContainer
            config={chartConfig}
            className="mx-auto h-[250px] w-full"
        >
            <PieChart>
                <ChartTooltip
                    cursor={false}
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
                <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={100}
                    strokeWidth={2}
                >
                    <Label
                        content={({ viewBox }) => {
                            if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                                return (
                                    <text
                                        x={viewBox.cx}
                                        y={viewBox.cy}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                    >
                                        <tspan
                                            x={viewBox.cx}
                                            y={viewBox.cy}
                                            className="fill-foreground text-xl font-bold"
                                        >
                                            {formatCurrency(String(netWorth))}
                                        </tspan>
                                        <tspan
                                            x={viewBox.cx}
                                            y={(viewBox.cy || 0) + 20}
                                            className="fill-muted-foreground text-xs"
                                        >
                                            Net Worth
                                        </tspan>
                                    </text>
                                )
                            }
                        }}
                    />
                </Pie>
            </PieChart>
        </ChartContainer>
    )
}
