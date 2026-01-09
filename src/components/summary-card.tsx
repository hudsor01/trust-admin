import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

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
}

/**
 * Reusable summary card for displaying metrics
 *
 * @param title - Card title/label
 * @param value - Metric value (string or number)
 * @param icon - Optional lucide-react icon component
 * @param trend - Optional trend indicator { value: number, isPositive: boolean }
 * @param isLoading - Show skeleton loading state
 * @param formatter - Optional formatter function for numeric values
 *
 * @example
 * ```typescript
 * // Basic usage
 * <SummaryCard title="Total Assets" value="42" />
 * ```
 *
 * @example
 * ```typescript
 * // Advanced usage with icon, trend, and formatter
 * import { DollarSign } from "lucide-react"
 * import { formatCurrency } from "@/utils/formatters"
 *
 * <SummaryCard
 *   title="Total Liabilities"
 *   value={totalLiabilities}
 *   icon={DollarSign}
 *   trend={{ value: 5.2, isPositive: false }}
 *   formatter={formatCurrency}
 * />
 * ```
 */
export function SummaryCard({
  title,
  value,
  icon: Icon,
  trend,
  isLoading = false,
  formatter,
}: SummaryCardProps) {
  const formattedValue =
    typeof value === "number" && formatter ? formatter(value) : value

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
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          {Icon && <Icon className="h-4 w-4" />}
          {title}
        </div>
        <div className="text-2xl font-bold">{formattedValue}</div>
        {trend && (
          <div
            className={`flex items-center gap-1 text-xs mt-2 ${
              trend.isPositive ? "text-green-600" : "text-red-600"
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
