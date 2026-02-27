export interface SummaryCardGridProps {
    children: React.ReactNode
    columns?: number
}

/** Responsive grid: 1 col mobile, 2 col tablet, `columns` on desktop (default 3). */
export function SummaryCardGrid({
    children,
    columns = 3,
}: SummaryCardGridProps) {
    const columnClasses = {
        1: 'lg:grid-cols-1',
        2: 'lg:grid-cols-2',
        3: 'lg:grid-cols-3',
        4: 'lg:grid-cols-4',
    }

    const lgColClass =
        columnClasses[columns as keyof typeof columnClasses] || 'lg:grid-cols-3'

    return (
        <div className={`grid gap-6 grid-cols-1 md:grid-cols-2 ${lgColClass}`}>
            {children}
        </div>
    )
}
