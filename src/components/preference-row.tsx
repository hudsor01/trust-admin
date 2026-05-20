/**
 * Settings preference row composition per UI-SPEC §11.
 *
 * Layout: 2-column grid on md+ (title/description left, control slot right),
 * single column on mobile. Title typography is `text-xl font-semibold`
 * (20px / 600 weight) per UI-SPEC rev 1's promotion of the section heading.
 */
import type { ReactNode } from 'react'

export interface PreferenceRowProps {
    title: string
    description?: string
    children: ReactNode
}

export function PreferenceRow({
    title,
    description,
    children,
}: PreferenceRowProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 py-4 px-6 border-b border-border last:border-0">
            <div>
                <div className="text-xl font-semibold leading-snug">
                    {title}
                </div>
                {description && (
                    <p className="text-sm text-muted-foreground mt-1">
                        {description}
                    </p>
                )}
            </div>
            <div className="flex items-center justify-end">{children}</div>
        </div>
    )
}
