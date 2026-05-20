/**
 * ActivityTimelineView — thin page-level wrapper around <ActivityTimeline>.
 * Exists so the page component has a stable import path matching the heatmap
 * consumer pattern.
 */
'use client'

import {
    type ActivityLogEntry,
    ActivityTimeline,
} from '@/components/activity-timeline'

export interface ActivityTimelineViewProps {
    entries: ActivityLogEntry[]
    selectedDay?: string
    isLoading?: boolean
}

export function ActivityTimelineView({
    entries,
    selectedDay,
    isLoading,
}: ActivityTimelineViewProps) {
    return (
        <ActivityTimeline
            entries={entries}
            selectedDay={selectedDay}
            isLoading={isLoading}
        />
    )
}
