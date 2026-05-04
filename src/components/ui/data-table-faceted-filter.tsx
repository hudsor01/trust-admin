'use client'

import type { Column } from '@tanstack/react-table'
import { Check, PlusCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface DataTableFacetedFilterProps<TData, TValue> {
    column?: Column<TData, TValue>
    title?: string
    /** When omitted, options are derived from the column's faceted unique
     *  values. Pass an explicit list to override the order or labels. */
    options?: { label: string; value: string }[]
}

/**
 * Multi-select faceted filter rendered in a Popover with a cmdk Command
 * palette. Pattern adapted from sadmann7/shadcn-table — Popover + Command
 * + getFacetedUniqueValues() — implemented locally with our shadcn UI
 * primitives and TS types so we own the surface.
 */
export function DataTableFacetedFilter<TData, TValue>({
    column,
    title,
    options,
}: DataTableFacetedFilterProps<TData, TValue>) {
    const facets = column?.getFacetedUniqueValues()
    const filterValue = column?.getFilterValue()
    const selectedValues = new Set(
        Array.isArray(filterValue) ? (filterValue as string[]) : [],
    )

    // Derive options from facets when no explicit list is passed. Sort by
    // descending count so the most common values surface first.
    const resolvedOptions =
        options ??
        (facets
            ? Array.from(facets.entries())
                  .map(([value, count]) => ({
                      value: String(value),
                      label: String(value),
                      count: count as number,
                  }))
                  .sort((a, b) => b.count - a.count)
            : [])

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 border-dashed"
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {title}
                    {selectedValues.size > 0 && (
                        <>
                            <Separator
                                orientation="vertical"
                                className="mx-2 h-4"
                            />
                            <Badge
                                variant="secondary"
                                className="rounded-sm px-1 font-normal lg:hidden"
                            >
                                {selectedValues.size}
                            </Badge>
                            <div className="hidden space-x-1 lg:flex">
                                {selectedValues.size > 2 ? (
                                    <Badge
                                        variant="secondary"
                                        className="rounded-sm px-1 font-normal"
                                    >
                                        {selectedValues.size} selected
                                    </Badge>
                                ) : (
                                    resolvedOptions
                                        .filter((opt) =>
                                            selectedValues.has(opt.value),
                                        )
                                        .map((opt) => (
                                            <Badge
                                                key={opt.value}
                                                variant="secondary"
                                                className="rounded-sm px-1 font-normal"
                                            >
                                                {opt.label}
                                            </Badge>
                                        ))
                                )}
                            </div>
                        </>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={title} />
                    <CommandList>
                        <CommandEmpty>No results.</CommandEmpty>
                        <CommandGroup>
                            {resolvedOptions.map((option) => {
                                const isSelected = selectedValues.has(
                                    option.value,
                                )
                                const count =
                                    'count' in option
                                        ? (
                                              option as {
                                                  count: number
                                              }
                                          ).count
                                        : facets?.get(option.value)
                                return (
                                    <CommandItem
                                        key={option.value}
                                        onSelect={() => {
                                            if (isSelected) {
                                                selectedValues.delete(
                                                    option.value,
                                                )
                                            } else {
                                                selectedValues.add(option.value)
                                            }
                                            const next =
                                                Array.from(selectedValues)
                                            column?.setFilterValue(
                                                next.length ? next : undefined,
                                            )
                                        }}
                                    >
                                        <div
                                            className={cn(
                                                'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                                                isSelected
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'opacity-50 [&_svg]:invisible',
                                            )}
                                        >
                                            <Check className="h-3 w-3" />
                                        </div>
                                        <span>{option.label}</span>
                                        {typeof count === 'number' && (
                                            <span className="ml-auto flex h-4 w-4 items-center justify-center font-mono text-xs text-muted-foreground">
                                                {count}
                                            </span>
                                        )}
                                    </CommandItem>
                                )
                            })}
                        </CommandGroup>
                        {selectedValues.size > 0 && (
                            <>
                                <CommandSeparator />
                                <CommandGroup>
                                    <CommandItem
                                        onSelect={() =>
                                            column?.setFilterValue(undefined)
                                        }
                                        className="justify-center text-center"
                                    >
                                        Clear filters
                                    </CommandItem>
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
