'use client'

import { Cell, Pie, PieChart } from 'recharts'
import {
    type ChartConfig,
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart'
import { formatCurrency } from '@/utils/formatters'

interface AssetAllocationData {
    name: string
    value: number
    fill: string
    [key: string]: string | number
}

interface AssetAllocationChartProps {
    data: AssetAllocationData[]
}

export function AssetAllocationChart({ data }: AssetAllocationChartProps) {
    // Show placeholder if no data
    if (data.length === 0) {
        return (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No asset data available
            </div>
        )
    }

    // Calculate total for percentage display
    const total = data.reduce((sum, item) => sum + item.value, 0)

    // Create chart config from data
    const chartConfig = data.reduce(
        (config, item) => {
            config[item.name] = {
                label: item.name,
                color: item.fill,
            }
            return config
        },
        {} as Record<string, { label: string; color: string }>,
    ) satisfies ChartConfig

    return (
        <ChartContainer config={chartConfig} className="mx-auto min-h-[300px]">
            <PieChart>
                <ChartTooltip
                    cursor={false}
                    content={
                        <ChartTooltipContent
                            formatter={(value, name) => {
                                const numValue = Number(value)
                                const percentage =
                                    total > 0
                                        ? ((numValue / total) * 100).toFixed(1)
                                        : '0'
                                return (
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-medium">
                                            {name}
                                        </span>
                                        <span className="text-muted-foreground">
                                            {formatCurrency(String(value))} (
                                            {percentage}%)
                                        </span>
                                    </div>
                                )
                            }}
                        />
                    }
                />
                <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={100}
                    strokeWidth={2}
                    label={({ value }) => {
                        const percentage =
                            total > 0 ? ((value / total) * 100).toFixed(0) : '0'
                        return `${percentage}%`
                    }}
                    labelLine={true}
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                </Pie>
                <ChartLegend
                    content={<ChartLegendContent nameKey="name" />}
                    className="flex-wrap gap-2"
                />
            </PieChart>
        </ChartContainer>
    )
}
