import type { LucideIcon } from 'lucide-react'
import { Line, LineChart } from 'recharts'
import { SummaryCard } from '@/components/summary-card'

export interface KpiStripItem {
    label: string
    value: string | number
    delta?: { value: number; label: string }
    invertDelta?: boolean
    sparklineSeries?: number[]
    icon?: LucideIcon
}

export interface KpiStripProps {
    data: KpiStripItem[]
    isLoading?: boolean
}

export function KpiStrip({ data, isLoading = false }: KpiStripProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <SummaryCard
                        key={`kpi-skeleton-${i}`}
                        title=""
                        value=""
                        isLoading
                    />
                ))}
            </div>
        )
    }

    if (data.length === 0) {
        return <p className="text-sm text-muted-foreground">No data yet.</p>
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.map((item) => {
                // Color inversion rule (UI-SPEC §Color): when invertDelta is
                // true, flip isPositive — e.g. a shrinking liability balance is
                // good, so a negative delta should render green.
                const positive = item.delta
                    ? item.invertDelta
                        ? item.delta.value <= 0
                        : item.delta.value >= 0
                    : false
                const trend = item.delta
                    ? { value: item.delta.value, isPositive: positive }
                    : undefined

                const sparkline =
                    item.sparklineSeries && item.sparklineSeries.length > 0 ? (
                        <LineChart
                            width={64}
                            height={16}
                            data={item.sparklineSeries.map((v, i) => ({
                                i,
                                v,
                            }))}
                        >
                            <Line
                                type="monotone"
                                dataKey="v"
                                stroke="var(--primary)"
                                dot={false}
                                strokeWidth={1.5}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    ) : undefined

                return (
                    <SummaryCard
                        key={item.label}
                        title={item.label}
                        value={item.value}
                        icon={item.icon}
                        trend={trend}
                        accessory={sparkline}
                    />
                )
            })}
        </div>
    )
}
