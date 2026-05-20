/** PageHeader composition tests — title typography, description, breadcrumb aria-current, actions slot. */

import '../setup'
import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { PageHeader } from '../../src/components/page-header'

describe('PageHeader', () => {
    afterEach(() => {
        cleanup()
    })

    test('renders title as an h1 with display typography', () => {
        render(<PageHeader title="Liabilities" />)
        const h1 = screen.getByRole('heading', { level: 1 })
        expect(h1.textContent).toBe('Liabilities')
        expect(h1.className).toContain('text-2xl')
        expect(h1.className).toContain('font-semibold')
        expect(h1.className).toContain('leading-tight')
    })

    test('renders description when provided', () => {
        render(<PageHeader title="X" description="A summary line" />)
        expect(screen.getByText('A summary line')).toBeTruthy()
    })

    test('renders breadcrumb with current-page marker on last item', () => {
        render(
            <PageHeader
                title="Beneficiary"
                breadcrumb={[
                    { label: 'Admin', href: '/' },
                    { label: 'Beneficiaries', href: '/beneficiaries' },
                    { label: 'Detail' },
                ]}
            />,
        )
        const nav = screen.getByRole('navigation', { name: /breadcrumb/i })
        expect(nav).toBeTruthy()
        const current = screen.getByText('Detail')
        expect(current.getAttribute('aria-current')).toBe('page')
    })

    test('renders actions slot', () => {
        render(<PageHeader title="X" actions={<button>Save</button>} />)
        expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy()
    })

    test('omits breadcrumb when not provided', () => {
        render(<PageHeader title="X" />)
        expect(
            screen.queryByRole('navigation', { name: /breadcrumb/i }),
        ).toBeNull()
    })
})
