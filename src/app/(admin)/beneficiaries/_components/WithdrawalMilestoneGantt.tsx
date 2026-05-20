'use client'

import { addYears, differenceInDays, parseISO } from 'date-fns'
import { useMemo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export interface WithdrawalMilestoneGanttProps {
    beneficiaries: Array<{
        id: number
        name: string
        dob: string | null
        withdrawalAge1: number | null
        withdrawalPct1: number | null
        withdrawalAge2: number | null
        withdrawalPct2: number | null
    }>
    /** Used as fallback reference point when a beneficiary has no DOB on file. */
    entityDod?: string | Date | null
    isLoading?: boolean
}

type Milestone = {
    date: Date
    leftPct: number
    pct: number | null
}

/**
 * Hand-rolled horizontal-timeline visual rather than reusing Kibo gantt:
 * withdrawal milestones are point-in-time markers, not date-range bars, so the
 * gantt primitive's bar-segment optimization doesn't fit. UI-SPEC §7 documents
 * the marker-on-axis design.
 */
export function WithdrawalMilestoneGantt({
    beneficiaries,
    entityDod,
    isLoading,
}: WithdrawalMilestoneGanttProps) {
    const today = useMemo(() => new Date(), [])
    const endDate = useMemo(() => addYears(today, 30), [today])
    const totalDays = useMemo(
        () => differenceInDays(endDate, today),
        [endDate, today],
    )

    const rows = useMemo(() => {
        return beneficiaries.map((b) => {
            // parseISO avoids engine-dependent / timezone-ambiguous parsing
            // of date-only strings — consistent with LiabilityGantt.
            const reference = b.dob
                ? parseISO(b.dob)
                : entityDod
                  ? entityDod instanceof Date
                      ? entityDod
                      : parseISO(entityDod)
                  : today
            const milestone = (
                age: number | null,
                pct: number | null,
            ): Milestone | null => {
                if (!age) return null
                const date = addYears(reference, age)
                const dayOffset = differenceInDays(date, today)
                if (dayOffset < 0 || dayOffset > totalDays) return null
                return {
                    date,
                    leftPct: (dayOffset / totalDays) * 100,
                    pct,
                }
            }
            return {
                id: b.id,
                name: b.name,
                m1: milestone(b.withdrawalAge1, b.withdrawalPct1),
                m2: milestone(b.withdrawalAge2, b.withdrawalPct2),
            }
        })
    }, [beneficiaries, entityDod, today, totalDays])

    if (isLoading) return <Skeleton className="h-64 w-full" />

    if (beneficiaries.length === 0) {
        return (
            <div className="border border-border rounded-md p-12 text-center">
                <p className="text-sm font-semibold">
                    No beneficiaries to chart
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                    Add a beneficiary with a withdrawal age to see milestones.
                </p>
            </div>
        )
    }

    return (
        <div className="border border-border rounded-md p-4">
            <div className="space-y-2">
                {rows.map((row) => (
                    <div key={row.id} className="flex items-center gap-4">
                        <div className="w-32 text-sm font-semibold truncate">
                            {row.name}
                        </div>
                        <div className="relative flex-1 h-6 bg-muted rounded">
                            {/* Today line */}
                            <div
                                className="absolute inset-y-0 left-0 w-0.5 bg-primary"
                                title="Today"
                            />
                            {row.m1 && (
                                <div
                                    className="absolute top-1/2 -translate-y-1/2 h-2 w-2 rotate-45 bg-chart-1 ring-2 ring-background"
                                    style={{ left: `${row.m1.leftPct}%` }}
                                    title={`Age 1 withdrawal${row.m1.pct ? ` (${row.m1.pct}%)` : ''}: ${row.m1.date.toISOString().slice(0, 10)}`}
                                />
                            )}
                            {row.m2 && (
                                <div
                                    className="absolute top-1/2 -translate-y-1/2 h-2 w-2 rotate-45 bg-chart-2 ring-2 ring-background"
                                    style={{ left: `${row.m2.leftPct}%` }}
                                    title={`Age 2 withdrawal${row.m2.pct ? ` (${row.m2.pct}%)` : ''}: ${row.m2.date.toISOString().slice(0, 10)}`}
                                />
                            )}
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-4 flex justify-between text-xs text-muted-foreground">
                <span>Today</span>
                <span>+15y</span>
                <span>+30y</span>
            </div>
        </div>
    )
}
