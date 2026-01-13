export interface SummaryCardGridProps {
  children: React.ReactNode
  columns?: number
}

/**
 * Grid layout wrapper for SummaryCard components
 *
 * Provides responsive grid with consistent spacing.
 * - Mobile: 1 column
 * - Tablet: 2 columns
 * - Desktop: specified columns (default 3)
 *
 * @param children - SummaryCard components
 * @param columns - Number of columns on desktop (default: 3)
 *
 * @example
 * ```typescript
 * <SummaryCardGrid columns={4}>
 *   <SummaryCard title="Total Assets" value={assets} />
 *   <SummaryCard title="Total Liabilities" value={liabilities} />
 *   <SummaryCard title="Net Worth" value={netWorth} />
 *   <SummaryCard title="Monthly Income" value={income} />
 * </SummaryCardGrid>
 * ```
 */
export function SummaryCardGrid({ children, columns = 3 }: SummaryCardGridProps) {
  const columnClasses = {
    1: "lg:grid-cols-1",
    2: "lg:grid-cols-2",
    3: "lg:grid-cols-3",
    4: "lg:grid-cols-4",
  }

  const lgColClass = columnClasses[columns as keyof typeof columnClasses] || "lg:grid-cols-3"

  return <div className={`grid gap-6 grid-cols-1 md:grid-cols-2 ${lgColClass}`}>{children}</div>
}
