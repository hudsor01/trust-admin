/**
 * ActivityHeatmap — 30-day trailing activity heatmap with chart-2 opacity scale.
 *
 * Implementation note (per RESEARCH.md Open Question 2): hand-rendered rather
 * than wrapping Kibo's <ContributionGraph>. The Kibo component defaults to
 * `data-[level=N]:fill-muted-foreground/N0` (grey scale); overriding via
 * className selectors is brittle. A 30-cell grid of styled buttons is
 * trivially small and gives us the chart-2 scale per UI-SPEC §Color directly.
 *
 * The installed Kibo contribution-graph remains available for future,
 * larger-window use cases (e.g. 12-month view).
 */
'use client'

import { format, parseISO, subDays } from 'date-fns'
import { useMemo } from 'react'
import type { ActivityLogEntry } from '@/components/activity-timeline'
import { cn } from '@/lib/utils'

export interface ActivityHeatmapProps {
    entries: ActivityLogEntry[]
    selectedDay?: string
    onDayClick?: (day: string | undefined) => void
}

interface DayCell {
    day: string
    count: number
    level: 0 | 1 | 2 | 3 | 4
}

export function ActivityHeatmap({
    entries,
    selectedDay,
    onDayClick,
}: ActivityHeatmapProps) {
    const days = useMemo<DayCell[]>(() => {
        const today = new Date()
        const start = subDays(today, 29)
        const counts = new Map<string, number>()
        for (const e of entries) {
            const day = format(parseISO(e.createdAt), 'yyyy-MM-dd')
            counts.set(day, (counts.get(day) ?? 0) + 1)
        }
        const result: DayCell[] = []
        for (let i = 0; i < 30; i++) {
            const d = new Date(start)
            d.setDate(start.getDate() + i)
            const day = format(d, 'yyyy-MM-dd')
            const count = counts.get(day) ?? 0
            const level: DayCell['level'] =
                count === 0
                    ? 0
                    : count === 1
                      ? 1
                      : count === 2
                        ? 2
                        : count === 3
                          ? 3
                          : 4
            result.push({ day, count, level })
        }
        return result
    }, [entries])

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                    Activity, last 30 days
                </h3>
                {selectedDay && (
                    <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground underline"
                        onClick={() => onDayClick?.(undefined)}
                    >
                        Clear filter
                    </button>
                )}
            </div>
            <div
                className="flex gap-1 overflow-x-auto"
                role="grid"
                aria-label="Activity heatmap"
            >
                {days.map(({ day, count, level }) => (
                    <button
                        key={day}
                        type="button"
                        data-day={day}
                        data-level={level}
                        data-selected={selectedDay === day || undefined}
                        title={`${count} ${count === 1 ? 'activity' : 'activities'} on ${format(parseISO(day), 'EEEE, MMM d')}`}
                        className={cn(
                            'h-4 w-4 rounded-sm cursor-pointer transition-colors',
                            level === 0 && 'fill-muted bg-muted',
                            level === 1 && 'fill-chart-2/20 bg-chart-2/20',
                            level === 2 && 'fill-chart-2/40 bg-chart-2/40',
                            level === 3 && 'fill-chart-2/60 bg-chart-2/60',
                            level === 4 && 'fill-chart-2 bg-chart-2',
                            selectedDay === day && 'ring-2 ring-primary',
                        )}
                        onClick={() =>
                            onDayClick?.(selectedDay === day ? undefined : day)
                        }
                        aria-label={`${count} activities on ${day}`}
                        aria-pressed={selectedDay === day}
                    />
                ))}
            </div>
            <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                <span>Less</span>
                <span className="h-4 w-4 rounded-sm bg-muted" />
                <span className="h-4 w-4 rounded-sm bg-chart-2/20" />
                <span className="h-4 w-4 rounded-sm bg-chart-2/40" />
                <span className="h-4 w-4 rounded-sm bg-chart-2/60" />
                <span className="h-4 w-4 rounded-sm bg-chart-2" />
                <span>More</span>
            </div>
        </div>
    )
}
