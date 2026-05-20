/**
 * ActivityTimeline — hand-rolled replacement for `@kibo-ui/timeline` (returns HTTP 500).
 * Groups ActivityLog entries by day, latest first; renders colored action dots and
 * a Collapsible JSON diff per row. UI-SPEC §4 + §Color action dots.
 */
'use client'

import { format, parseISO } from 'date-fns'
import { ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react'
import { type ReactNode, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

const ACTION_DOT_COLOR: Record<string, string> = {
    INSERT: 'bg-success',
    UPDATE: 'bg-primary',
    DELETE: 'bg-destructive',
}

const ACTION_ICON: Record<string, ReactNode> = {
    INSERT: <Plus className="h-3 w-3" />,
    UPDATE: <Pencil className="h-3 w-3" />,
    DELETE: <Trash2 className="h-3 w-3" />,
}

export interface ActivityLogEntry {
    id: number
    tableName: string
    recordId: number | string | null
    action: 'INSERT' | 'UPDATE' | 'DELETE' | string
    oldValues: Record<string, unknown> | null
    newValues: Record<string, unknown> | null
    changedBy: string
    createdAt: string
}

export interface ActivityTimelineProps {
    entries: ActivityLogEntry[]
    isLoading?: boolean
    selectedDay?: string
}

export function ActivityTimeline({
    entries,
    isLoading = false,
    selectedDay,
}: ActivityTimelineProps) {
    const filtered = useMemo(() => {
        if (!selectedDay) return entries
        return entries.filter(
            (e) => format(parseISO(e.createdAt), 'yyyy-MM-dd') === selectedDay,
        )
    }, [entries, selectedDay])

    const grouped = useMemo(() => {
        return Object.entries(
            filtered.reduce<Record<string, ActivityLogEntry[]>>((acc, e) => {
                const day = format(parseISO(e.createdAt), 'yyyy-MM-dd')
                ;(acc[day] ??= []).push(e)
                return acc
            }, {}),
        ).sort(([a], [b]) => b.localeCompare(a))
    }, [filtered])

    if (isLoading) {
        return (
            <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div
                        key={`skeleton-${i}`}
                        className="h-12 w-full bg-muted rounded animate-pulse"
                    />
                ))}
            </div>
        )
    }

    if (grouped.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm font-semibold text-muted-foreground">
                    No activity yet
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                    When users make changes, they'll show up here.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {grouped.map(([day, items]) => (
                <section key={day}>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                        {format(parseISO(day), 'EEEE, MMM d')}
                    </h3>
                    <ol className="relative border-l border-border pl-6 space-y-2">
                        {items.map((e) => (
                            <TimelineRow key={e.id} entry={e} />
                        ))}
                    </ol>
                </section>
            ))}
        </div>
    )
}

function TimelineRow({ entry }: { entry: ActivityLogEntry }) {
    const [open, setOpen] = useState(false)
    return (
        <li className="relative">
            <span
                className={cn(
                    'absolute -left-[1.65rem] top-2 h-2 w-2 rounded-full ring-4 ring-background',
                    ACTION_DOT_COLOR[entry.action] ?? 'bg-muted',
                )}
                aria-hidden="true"
            />
            <Collapsible open={open} onOpenChange={setOpen}>
                <Card>
                    <CardContent className="py-2 px-3 flex items-center gap-3 text-sm">
                        <Badge variant="outline" className="text-xs gap-1">
                            {ACTION_ICON[entry.action]}
                            {entry.action}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">
                            {entry.tableName}#{entry.recordId ?? '?'}
                        </span>
                        <span
                            className="flex-1 truncate"
                            title={entry.changedBy}
                        >
                            {entry.changedBy}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                            {format(parseISO(entry.createdAt), 'HH:mm:ss')}
                        </span>
                        <CollapsibleTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 p-0"
                                aria-label={
                                    open ? 'Collapse diff' : 'Expand diff'
                                }
                                aria-expanded={open}
                            >
                                <ChevronDown
                                    className={cn(
                                        'h-3 w-3 transition-transform',
                                        open && 'rotate-180',
                                    )}
                                />
                            </Button>
                        </CollapsibleTrigger>
                    </CardContent>
                    <CollapsibleContent>
                        <div className="grid grid-cols-2 gap-2 px-3 pb-3 text-xs font-mono">
                            <pre className="bg-muted/40 p-2 rounded overflow-auto max-h-[200px]">
                                {JSON.stringify(entry.oldValues, null, 2)}
                            </pre>
                            <pre className="bg-muted/40 p-2 rounded overflow-auto max-h-[200px]">
                                {JSON.stringify(entry.newValues, null, 2)}
                            </pre>
                        </div>
                    </CollapsibleContent>
                </Card>
            </Collapsible>
        </li>
    )
}
