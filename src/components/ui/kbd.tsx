import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Kbd({
    children,
    className,
}: {
    children: ReactNode
    className?: string
}) {
    return (
        <kbd
            className={cn(
                'inline-flex items-center justify-center',
                'min-w-[1.5rem] h-5 px-1.5',
                'font-mono text-xs font-semibold',
                'bg-muted text-muted-foreground',
                'border border-border rounded',
                'shadow-[0_1px_0_0_var(--border)]',
                className,
            )}
        >
            {children}
        </kbd>
    )
}
