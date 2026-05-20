/**
 * NOTE: The ActivityHeatmap consumer lands in Task 02.3 (next commit).
 * Until then, this whole suite is skipped — bun's module resolver will throw
 * on the import before describe() runs, so we lazy-import inside an `it`.
 * Task 02.3 will flip the .skip flag.
 */
import { afterEach, describe, expect, it } from 'bun:test'
import { cleanup, fireEvent, render } from '@testing-library/react'
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

describe.skip('ActivityHeatmap (enabled after Task 02.3 consumer lands)', () => {
    afterEach(cleanup)

    it('renders 30 day cells (trailing 30-day window)', async () => {
        const { ActivityHeatmap } = await import(
            '@/app/(admin)/activity-log/_components/ActivityHeatmap'
        )
        const { container } = render(<ActivityHeatmap entries={[]} />)
        const cells = container.querySelectorAll('[data-day]')
        expect(cells.length).toBe(30)
    })

    it('uses fill-chart-2 scale (NOT default muted-foreground)', async () => {
        const { ActivityHeatmap } = await import(
            '@/app/(admin)/activity-log/_components/ActivityHeatmap'
        )
        const today = new Date().toISOString().slice(0, 10)
        const entries = Array.from({ length: 5 }).map((_, i) =>
            makeEntry(i, today),
        )
        const { container } = render(<ActivityHeatmap entries={entries} />)
        expect(container.innerHTML).toMatch(/fill-chart-2/)
        expect(container.innerHTML).toMatch(/bg-chart-2/)
    })

    it('renders fill-chart-2 opacity tiers /20 /40 /60 (level 1/2/3)', async () => {
        const { ActivityHeatmap } = await import(
            '@/app/(admin)/activity-log/_components/ActivityHeatmap'
        )
        const today = new Date().toISOString().slice(0, 10)
        const { container } = render(
            <ActivityHeatmap entries={[makeEntry(1, today)]} />,
        )
        const html = container.innerHTML
        expect(html).toMatch(/bg-chart-2\/20/)
        expect(html).toMatch(/bg-chart-2\/40/)
        expect(html).toMatch(/bg-chart-2\/60/)
    })

    it('invokes onDayClick(day) when a cell is clicked', async () => {
        const { ActivityHeatmap } = await import(
            '@/app/(admin)/activity-log/_components/ActivityHeatmap'
        )
        let clicked: string | undefined = 'sentinel'
        const today = new Date().toISOString().slice(0, 10)
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

    it('clicking a selected cell clears the filter (toggles undefined)', async () => {
        const { ActivityHeatmap } = await import(
            '@/app/(admin)/activity-log/_components/ActivityHeatmap'
        )
        let clicked: string | undefined = 'sentinel'
        const today = new Date().toISOString().slice(0, 10)
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
