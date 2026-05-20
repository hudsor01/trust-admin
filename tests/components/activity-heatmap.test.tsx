import { afterEach, describe, expect, it } from 'bun:test'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { ActivityHeatmap } from '@/app/(admin)/activity-log/_components/ActivityHeatmap'
import type { ActivityLogEntry } from '@/components/activity-timeline'

function makeEntry(id: number, day: string): ActivityLogEntry {
    return {
        id,
        tableName: 'x',
        recordId: 1,
        action: 'INSERT',
        oldValues: null,
        newValues: { v: 1 },
        changedBy: 'u-1',
        createdAt: `${day}T12:00:00Z`,
    }
}

describe('ActivityHeatmap', () => {
    afterEach(cleanup)

    it('renders 30 day cells (trailing 30-day window)', () => {
        const { container } = render(<ActivityHeatmap entries={[]} />)
        const cells = container.querySelectorAll('[data-day]')
        expect(cells.length).toBe(30)
    })

    it('uses fill-chart-2 scale (NOT default muted-foreground)', () => {
        // Build entries on the most recent rendered day so they land in the window.
        const { container: tmp } = render(<ActivityHeatmap entries={[]} />)
        const lastCell = tmp.querySelectorAll('[data-day]')[29]
        const today = lastCell?.getAttribute('data-day') ?? ''
        cleanup()
        const entries = Array.from({ length: 5 }).map((_, i) =>
            makeEntry(i, today),
        )
        const { container } = render(<ActivityHeatmap entries={entries} />)
        expect(container.innerHTML).toMatch(/fill-chart-2/)
        expect(container.innerHTML).toMatch(/bg-chart-2/)
    })

    it('renders fill-chart-2 opacity tiers /20 /40 /60 (legend)', () => {
        const today = new Date().toISOString().slice(0, 10)
        const { container } = render(
            <ActivityHeatmap entries={[makeEntry(1, today)]} />,
        )
        // The legend always renders all four opacity tiers regardless of data
        const html = container.innerHTML
        expect(html).toMatch(/bg-chart-2\/20/)
        expect(html).toMatch(/bg-chart-2\/40/)
        expect(html).toMatch(/bg-chart-2\/60/)
    })

    it('invokes onDayClick(day) when a cell is clicked', () => {
        // Resolve a real cell day from a probe render to avoid TZ mismatch.
        const { container: probe } = render(<ActivityHeatmap entries={[]} />)
        const lastCell = probe.querySelectorAll('[data-day]')[29]
        const today = lastCell?.getAttribute('data-day') ?? ''
        cleanup()

        let clicked: string | undefined = 'sentinel'
        const { container } = render(
            <ActivityHeatmap
                entries={[makeEntry(1, today)]}
                onDayClick={(d) => {
                    clicked = d
                }}
            />,
        )
        const todayCell = container.querySelector(`[data-day="${today}"]`)
        expect(todayCell).toBeTruthy()
        if (todayCell) {
            fireEvent.click(todayCell)
            expect(clicked).toBe(today)
        }
    })

    it('clicking a selected cell clears the filter (toggles undefined)', () => {
        const { container: probe } = render(<ActivityHeatmap entries={[]} />)
        const lastCell = probe.querySelectorAll('[data-day]')[29]
        const today = lastCell?.getAttribute('data-day') ?? ''
        cleanup()

        let clicked: string | undefined = 'sentinel'
        const { container } = render(
            <ActivityHeatmap
                entries={[makeEntry(1, today)]}
                selectedDay={today}
                onDayClick={(d) => {
                    clicked = d
                }}
            />,
        )
        const todayCell = container.querySelector(`[data-day="${today}"]`)
        if (todayCell) {
            fireEvent.click(todayCell)
            expect(clicked).toBeUndefined()
        }
    })
})
