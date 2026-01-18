'use client'

import { ChevronDownIcon } from 'lucide-react'
import type * as React from 'react'
import { cn } from '@/lib/utils'

function NativeSelect({
    className,
    size = 'default',
    ...props
}: Omit<React.ComponentProps<'select'>, 'size'> & { size?: 'sm' | 'default' }) {
    return (
        <div
            className="group/native-select relative w-fit has-[select:disabled]:opacity-50"
            data-slot="native-select-wrapper"
        >
            <select
                data-slot="native-select"
                data-size={size}
                className={cn(
                    'border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex w-full cursor-pointer appearance-none items-center rounded-md border text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed',
                    'has-[option[disabled]:checked]:text-muted-foreground',
                    size === 'default' && 'h-9 py-2 pr-8 pl-3',
                    size === 'sm' && 'h-8 py-1.5 pr-7 pl-2.5 text-xs',
                    className,
                )}
                {...props}
            />
            <ChevronDownIcon
                className={cn(
                    'text-muted-foreground pointer-events-none absolute top-1/2 -translate-y-1/2 group-has-[select:disabled]/native-select:opacity-50',
                    size === 'default' && 'right-2.5 size-4',
                    size === 'sm' && 'right-2 size-3.5',
                )}
                aria-hidden="true"
                data-slot="native-select-icon"
            />
        </div>
    )
}

function NativeSelectOption({ ...props }: React.ComponentProps<'option'>) {
    return <option data-slot="native-select-option" {...props} />
}

function NativeSelectOptGroup({
    className,
    ...props
}: React.ComponentProps<'optgroup'>) {
    return (
        <optgroup
            data-slot="native-select-optgroup"
            className={cn(className)}
            {...props}
        />
    )
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption }
