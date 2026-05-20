import { type LucideIcon, TrendingDown, TrendingUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export interface SummaryCardProps {
    title: string
    value: string | number
    icon?: LucideIcon
    trend?: {
        value: number
        isPositive: boolean
    }
    isLoading?: boolean
    formatter?: (value: number) => string
    accessory?: ReactNode
}

export function SummaryCard({
    title,
    value,
    icon: Icon,
    trend,
    isLoading = false,
    formatter,
    accessory,
}: SummaryCardProps) {
    const formattedValue =
        typeof value === 'number' && formatter ? formatter(value) : value

    if (isLoading) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-8 w-32" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardContent className="pt-6 relative">
                {accessory && (
                    <div className="absolute top-3 right-3">{accessory}</div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    {Icon && <Icon className="h-4 w-4" />}
                    {title}
                </div>
                <div className="text-2xl font-semibold tabular-nums">
                    {formattedValue}
                </div>
                {trend && (
                    <div
                        className={`flex items-center gap-1 text-xs mt-2 ${
                            trend.isPositive
                                ? 'text-success'
                                : 'text-destructive'
                        }`}
                    >
                        {trend.isPositive ? (
                            <TrendingUp className="h-3 w-3" />
                        ) : (
                            <TrendingDown className="h-3 w-3" />
                        )}
                        <span>{Math.abs(trend.value)}%</span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
