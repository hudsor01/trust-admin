// React Compiler can bail out on Kibo gantt's jotai-driven mount;
// opt out of memo to avoid the reconciliation warning in dev builds.
'use no memo'
'use client'

import { differenceInDays, parseISO } from 'date-fns'
import { useMemo } from 'react'
import {
    GanttFeatureItem,
    GanttFeatureList,
    GanttHeader,
    GanttProvider,
    GanttSidebar,
    GanttSidebarItem,
    GanttTimeline,
    GanttToday,
} from '@/components/kibo-ui/gantt'
import { Skeleton } from '@/components/ui/skeleton'
import { toCents } from '@/lib/money'
import { trpc } from '@/lib/trpc'
import { formatCurrency } from '@/utils/formatters'

export interface LiabilityGanttProps {
    entityId: number
}

type ProjectionRow = {
    id: number
    creditor: string
    startDate: string | Date | null
    currentBalance: string | null
    originalAmount: string | null
    status: string
    projection: {
        payoffDate: string
        monthsRemaining: number
        totalInterest: string
    } | null
}

type LiabilityBar = {
    id: number
    name: string
    startAt: Date
    endAt: Date
    /** Tailwind className for the bar fill + border (UI-SPEC §Color Gantt rules) */
    className: string
    statusColor: string
    label: string
}

function deriveBarStyle(
    daysToPayoff: number,
    status: string,
): { className: string; statusColor: string } {
    if (status === 'PAID' || status === 'CLOSED') {
        return {
            className: 'bg-success/30 border-success',
            statusColor: 'var(--success)',
        }
    }
    if (daysToPayoff < 0) {
        return {
            className: 'bg-destructive/30 border-destructive',
            statusColor: 'var(--destructive)',
        }
    }
    if (daysToPayoff <= 30) {
        return {
            className: 'bg-warning/30 border-warning',
            statusColor: 'var(--warning)',
        }
    }
    return {
        className: 'bg-primary/30 border-primary',
        statusColor: 'var(--primary)',
    }
}

function coerceDate(value: string | Date | null | undefined): Date | null {
    if (!value) return null
    if (value instanceof Date) return value
    try {
        return parseISO(value)
    } catch {
        return null
    }
}

export function LiabilityGantt({ entityId }: LiabilityGanttProps) {
    const { data: projections = [], isLoading } =
        trpc.liability.payoffProjections.useQuery(
            { entityId },
            { enabled: !!entityId },
        )

    const bars: LiabilityBar[] = useMemo(() => {
        const today = new Date()
        return (projections as ProjectionRow[])
            .filter((p) => p.projection !== null)
            .map((p) => {
                const start = coerceDate(p.startDate) ?? today
                // projection is non-null here per filter above
                const end = parseISO(p.projection!.payoffDate)
                const daysToPayoff = differenceInDays(end, today)
                const { className, statusColor } = deriveBarStyle(
                    daysToPayoff,
                    p.status,
                )
                return {
                    id: p.id,
                    name: p.creditor,
                    startAt: start,
                    endAt: end,
                    className,
                    statusColor,
                    label: `${p.creditor} · ${formatCurrency(p.currentBalance ?? '0')}`,
                }
            })
            .sort(
                (a, b) =>
                    toCents(
                        (projections as ProjectionRow[]).find(
                            (p) => p.id === b.id,
                        )?.currentBalance ?? null,
                    ) -
                    toCents(
                        (projections as ProjectionRow[]).find(
                            (p) => p.id === a.id,
                        )?.currentBalance ?? null,
                    ),
            )
    }, [projections])

    if (isLoading) {
        return <Skeleton className="h-64 w-full" />
    }

    if (bars.length === 0) {
        return (
            <div className="border border-border rounded-md p-12 text-center">
                <p className="text-sm font-semibold">
                    No projectable liabilities
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                    Add a liability with an interest rate and monthly payment to
                    see payoff projections.
                </p>
            </div>
        )
    }

    return (
        <div className="border border-border rounded-md overflow-hidden">
            <GanttProvider range="monthly" zoom={100} className="h-80">
                <GanttSidebar>
                    {bars.map((b) => (
                        <GanttSidebarItem
                            key={b.id}
                            feature={{
                                id: String(b.id),
                                name: b.name,
                                startAt: b.startAt,
                                endAt: b.endAt,
                                status: {
                                    id: b.id.toString(),
                                    name: 'liability',
                                    color: b.statusColor,
                                },
                            }}
                        />
                    ))}
                </GanttSidebar>
                <GanttTimeline>
                    <GanttHeader />
                    <GanttFeatureList>
                        {bars.map((b) => (
                            <GanttFeatureItem
                                key={b.id}
                                id={String(b.id)}
                                name={b.name}
                                startAt={b.startAt}
                                endAt={b.endAt}
                                status={{
                                    id: b.id.toString(),
                                    name: 'liability',
                                    color: b.statusColor,
                                }}
                                className={b.className}
                            />
                        ))}
                    </GanttFeatureList>
                    <GanttToday />
                </GanttTimeline>
            </GanttProvider>
        </div>
    )
}
