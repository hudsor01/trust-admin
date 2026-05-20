'use client'

import { Cell, Label, Pie, PieChart } from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import {
    type ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'

export interface BeneficiaryShareDonutsItem {
    id: number
    name: string
    sharePercent: string | null
    relationship?: string | null
}

export interface BeneficiaryShareDonutsProps {
    beneficiaries: BeneficiaryShareDonutsItem[]
    isLoading?: boolean
}

const chartConfig: ChartConfig = {
    share: { label: 'Share' },
    remainder: { label: 'Remainder', color: 'var(--muted)' },
}

export function BeneficiaryShareDonuts({
    beneficiaries,
    isLoading,
}: BeneficiaryShareDonutsProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton
                        // biome-ignore lint/suspicious/noArrayIndexKey: "skeleton placeholders have no stable id"
                        key={`benef-donut-skeleton-${i}`}
                        className="h-48 w-full rounded-lg"
                    />
                ))}
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {beneficiaries.map((b, idx) => (
                <BeneficiaryDonut key={b.id} beneficiary={b} index={idx} />
            ))}
        </div>
    )
}

function BeneficiaryDonut({
    beneficiary,
    index,
}: {
    beneficiary: BeneficiaryShareDonutsItem
    index: number
}) {
    const sharePct = beneficiary.sharePercent
        ? Number.parseFloat(beneficiary.sharePercent)
        : 0
    const hasShare = !Number.isNaN(sharePct) && sharePct > 0
    const sliceColor = `var(--chart-${(index % 5) + 1})`
    const data = hasShare
        ? [
              { name: 'share', value: sharePct, fill: sliceColor },
              {
                  name: 'remainder',
                  value: Math.max(0, 100 - sharePct),
                  fill: 'var(--muted)',
              },
          ]
        : [{ name: 'unset', value: 100, fill: 'var(--muted)' }]

    return (
        <Card className="p-6">
            <CardContent className="p-0 flex flex-col items-center gap-2">
                <ChartContainer config={chartConfig} className="h-32 w-32">
                    <PieChart>
                        <ChartTooltip
                            content={
                                <ChartTooltipContent
                                    formatter={(value, name) =>
                                        `${name}: ${value}%`
                                    }
                                />
                            }
                        />
                        <Pie
                            data={data}
                            dataKey="value"
                            nameKey="name"
                            outerRadius={48}
                            innerRadius={32}
                            strokeWidth={2}
                            isAnimationActive={false}
                        >
                            {data.map((entry, i) => (
                                <Cell
                                    // biome-ignore lint/suspicious/noArrayIndexKey: "Pie cells are stable per render"
                                    key={`${entry.name}-${i}`}
                                    fill={entry.fill}
                                />
                            ))}
                            <Label
                                value={
                                    hasShare ? `${sharePct.toFixed(0)}%` : '—'
                                }
                                position="center"
                                className={
                                    hasShare
                                        ? 'fill-foreground text-xl font-semibold'
                                        : 'fill-muted-foreground text-xl'
                                }
                            />
                        </Pie>
                    </PieChart>
                </ChartContainer>
                <div className="text-sm font-semibold text-center">
                    {beneficiary.name}
                    {!hasShare && (
                        <span className="text-muted-foreground">
                            {' '}
                            (share not set)
                        </span>
                    )}
                </div>
                {beneficiary.relationship && (
                    <div className="text-xs text-muted-foreground">
                        {beneficiary.relationship}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
