import { cn } from '@/lib/utils'

function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                'animate-pulse rounded-md bg-muted contrast-more:bg-muted/80 contrast-more:border contrast-more:border-border',
                className,
            )}
            {...props}
        />
    )
}

export { Skeleton }
