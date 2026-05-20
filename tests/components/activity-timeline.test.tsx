import { afterEach, describe, expect, it } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import {
    type ActivityLogEntry,
    ActivityTimeline,
} from '@/components/activity-timeline'

const sample = (
    id: number,
    action: 'INSERT' | 'UPDATE' | 'DELETE',
    day: string,
): ActivityLogEntry => ({
    id,
    tableName: 'beneficiary',
    recordId: id * 10,
    action,
    oldValues: action === 'INSERT' ? null : { name: 'old' },
    newValues: action === 'DELETE' ? null : { name: 'new' },
    changedBy: 'user-1',
    createdAt: `${day}T10:30:00Z`,
})

describe('ActivityTimeline', () => {
    afterEach(cleanup)

    it('groups entries by day, latest day first', () => {
        render(
            <ActivityTimeline
                entries={[
                    sample(1, 'INSERT', '2026-05-18'),
                    sample(2, 'UPDATE', '2026-05-19'),
                    sample(3, 'DELETE', '2026-05-19'),
                ]}
            />,
        )
        const headings = screen.getAllByRole('heading', { level: 3 })
        expect(headings.length).toBe(2)
        // Latest day (2026-05-19, Tuesday) renders first
        expect(headings[0]?.textContent).toMatch(/Tuesday/)
        expect(headings[1]?.textContent).toMatch(/Monday/)
    })

    it('renders action dots with correct token classes', () => {
        const { container } = render(
            <ActivityTimeline
                entries={[
                    sample(1, 'INSERT', '2026-05-19'),
                    sample(2, 'UPDATE', '2026-05-19'),
                    sample(3, 'DELETE', '2026-05-19'),
                ]}
            />,
        )
        expect(container.querySelector('.bg-success')).toBeTruthy()
        expect(container.querySelector('.bg-primary')).toBeTruthy()
        expect(container.querySelector('.bg-destructive')).toBeTruthy()
    })

    it('expands JSON diff on chevron click', () => {
        render(
            <ActivityTimeline entries={[sample(1, 'UPDATE', '2026-05-19')]} />,
        )
        const trigger = screen.getByRole('button', { name: /expand diff/i })
        fireEvent.click(trigger)
        // Look for the JSON keys rendered inside the <pre> blocks
        const oldPre = screen.getAllByText(
            (_, el) =>
                (el?.tagName === 'PRE' &&
                    (el?.textContent ?? '').includes('old')) ||
                false,
        )
        expect(oldPre.length).toBeGreaterThan(0)
    })

    it('filters entries when selectedDay is provided', () => {
        render(
            <ActivityTimeline
                entries={[
                    sample(1, 'INSERT', '2026-05-18'),
                    sample(2, 'UPDATE', '2026-05-19'),
                ]}
                selectedDay="2026-05-19"
            />,
        )
        const headings = screen.getAllByRole('heading', { level: 3 })
        expect(headings.length).toBe(1)
        expect(headings[0]?.textContent).toMatch(/Tuesday/)
    })

    it('renders empty state when entries is empty', () => {
        render(<ActivityTimeline entries={[]} />)
        expect(screen.getByText(/no activity yet/i)).toBeTruthy()
    })

    it('renders loading skeleton when isLoading is true', () => {
        const { container } = render(
            <ActivityTimeline entries={[]} isLoading={true} />,
        )
        const skeletons = container.querySelectorAll('.animate-pulse')
        expect(skeletons.length).toBe(5)
    })
})
