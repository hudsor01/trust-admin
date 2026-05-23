/** KpiStrip composition tests — render, delta color tokens, invertDelta flip, sparkline svg, loading, empty. */

import '../setup'
import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { KpiStrip } from '../../src/components/kpi-strip'

describe('KpiStrip', () => {
    afterEach(() => {
        cleanup()
    })

    test('renders one card per item', () => {
        render(
            <KpiStrip
                data={[
                    { label: 'Active', value: 4 },
                    { label: 'Total', value: '$120,000' },
                    { label: 'APR', value: '4.5%' },
                    { label: 'Trend', value: 12 },
                ]}
            />,
        )
        expect(screen.getByText('Active')).toBeTruthy()
        expect(screen.getByText('Total')).toBeTruthy()
        expect(screen.getByText('APR')).toBeTruthy()
        expect(screen.getByText('Trend')).toBeTruthy()
    })

    test('renders positive delta in text-success', () => {
        const { container } = render(
            <KpiStrip
                data={[
                    {
                        label: 'X',
                        value: '$1',
                        delta: { value: 12, label: 'vs 30d' },
                    },
                ]}
            />,
        )
        expect(container.querySelector('.text-success')).toBeTruthy()
    })

    test('renders negative delta in text-destructive', () => {
        const { container } = render(
            <KpiStrip
                data={[
                    {
                        label: 'X',
                        value: '$1',
                        delta: { value: -3, label: 'vs 30d' },
                    },
                ]}
            />,
        )
        expect(container.querySelector('.text-destructive')).toBeTruthy()
    })

    test('inverts delta color when invertDelta is true', () => {
        // Balance going down is good — invertDelta=true flips negative→success.
        const { container } = render(
            <KpiStrip
                data={[
                    {
                        label: 'Balance',
                        value: '$1',
                        delta: { value: -10, label: 'vs 30d' },
                        invertDelta: true,
                    },
                ]}
            />,
        )
        expect(container.querySelector('.text-success')).toBeTruthy()
        expect(container.querySelector('.text-destructive')).toBeFalsy()
    })

    test('renders a sparkline svg when sparklineSeries is provided', () => {
        const { container } = render(
            <KpiStrip
                data={[
                    {
                        label: 'X',
                        value: '$1',
                        sparklineSeries: [1, 2, 3, 4, 5],
                    },
                ]}
            />,
        )
        expect(container.querySelector('svg')).toBeTruthy()
    })

    test('renders loading skeletons when isLoading is true', () => {
        const { container } = render(
            <KpiStrip
                data={[
                    { label: 'A', value: 1 },
                    { label: 'B', value: 2 },
                    { label: 'C', value: 3 },
                    { label: 'D', value: 4 },
                ]}
                isLoading
            />,
        )
        const skeletons = container.querySelectorAll(
            '[data-slot="skeleton"], .animate-pulse',
        )
        expect(skeletons.length).toBeGreaterThan(0)
    })

    test('renders empty state when data is empty and not loading', () => {
        render(<KpiStrip data={[]} />)
        expect(screen.getByText(/no data yet/i)).toBeTruthy()
    })
})
