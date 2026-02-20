/**
 * TrusteeTable Component Tests
 *
 * Tests for the TrusteeTable component that displays trustee rows
 * with inline editing for name, email, phone, status, dates,
 * and a delete action for non-primary trustees.
 */

import '../../setup'
import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TrusteeTable } from '../../../src/app/(admin)/trustees/_components/TrusteeTable'

type TrusteeRow = {
    id: number
    entityId: number
    name: string
    email: string | null
    phone: string | null
    dob: string | null
    status: string | null
    order: number
    isCo: boolean | null
    coTrusteeId: number | null
    startDate: string | null
    endDate: string | null
}

const makeTrustee = (overrides: Partial<TrusteeRow> = {}): TrusteeRow => ({
    id: 1,
    entityId: 1,
    name: 'Richard Hudson',
    email: 'rhudsontspr@gmail.com',
    phone: '555-1234',
    dob: null,
    status: 'ACTIVE',
    order: 1,
    isCo: false,
    coTrusteeId: null,
    startDate: null,
    endDate: null,
    ...overrides,
})

describe('TrusteeTable', () => {
    afterEach(() => {
        cleanup()
    })

    test('renders empty table body when no trustees', () => {
        const { container } = render(
            <TrusteeTable
                trustees={[]}
                selectedEntity={1}
                onDelete={mock(() => {})}
                onUpdateField={mock(async () => {})}
            />,
        )

        // Table should render with no rows in tbody
        const table = container.querySelector('table')
        expect(table).toBeTruthy()
        const tbody = container.querySelector('tbody')
        expect(tbody).toBeTruthy()
        // tbody should have no rows
        const rows = tbody?.querySelectorAll('tr')
        expect(rows?.length ?? 0).toBe(0)
    })

    test('renders trustee name in table row', () => {
        const trustees = [
            makeTrustee({ id: 1, name: 'Jane Doe', email: 'jane@example.com' }),
        ]

        render(
            <TrusteeTable
                trustees={trustees}
                selectedEntity={1}
                onDelete={mock(() => {})}
                onUpdateField={mock(async () => {})}
            />,
        )

        expect(screen.getByText('Jane Doe')).toBeTruthy()
    })

    test('renders multiple trustees', () => {
        const trustees = [
            makeTrustee({
                id: 1,
                name: 'Alice Trustee',
                email: 'alice@trust.com',
            }),
            makeTrustee({
                id: 2,
                name: 'Bob Successor',
                email: 'bob@trust.com',
                order: 2,
            }),
        ]

        render(
            <TrusteeTable
                trustees={trustees}
                selectedEntity={1}
                onDelete={mock(() => {})}
                onUpdateField={mock(async () => {})}
            />,
        )

        expect(screen.getByText('Alice Trustee')).toBeTruthy()
        expect(screen.getByText('Bob Successor')).toBeTruthy()
    })

    test('renders column headers', () => {
        render(
            <TrusteeTable
                trustees={[]}
                selectedEntity={1}
                onDelete={mock(() => {})}
                onUpdateField={mock(async () => {})}
            />,
        )

        expect(screen.getByText('Order')).toBeTruthy()
        expect(screen.getByText('Name')).toBeTruthy()
        expect(screen.getByText('Email')).toBeTruthy()
        expect(screen.getByText('Phone')).toBeTruthy()
        expect(screen.getByText('Status')).toBeTruthy()
        expect(screen.getByText('Actions')).toBeTruthy()
    })

    test('locks primary trustee fields when allowPrimaryLock=true', () => {
        const trustees = [
            makeTrustee({
                id: 1,
                name: 'Richard Hudson',
                email: 'rhudsontspr@gmail.com',
                order: 1,
            }),
        ]

        render(
            <TrusteeTable
                trustees={trustees}
                selectedEntity={1}
                allowPrimaryLock={true}
                onDelete={mock(() => {})}
                onUpdateField={mock(async () => {})}
            />,
        )

        // Primary trustee name should show as static span, not editable
        expect(screen.getByText('Richard Hudson')).toBeTruthy()
        // No delete button for primary trustee
        const deleteButtons = screen.queryAllByRole('button')
        expect(deleteButtons.length).toBe(0)
    })

    test('shows delete button for non-primary trustee', () => {
        const trustees = [
            makeTrustee({
                id: 2,
                name: 'Second Trustee',
                email: 'second@trust.com',
                order: 2,
            }),
        ]

        render(
            <TrusteeTable
                trustees={trustees}
                selectedEntity={1}
                allowPrimaryLock={true}
                onDelete={mock(() => {})}
                onUpdateField={mock(async () => {})}
            />,
        )

        // Non-primary trustee should have a delete button
        const deleteButtons = screen.getAllByRole('button')
        expect(deleteButtons.length).toBeGreaterThan(0)
    })

    test('calls onDelete when delete button clicked for non-primary trustee', async () => {
        const user = userEvent.setup()
        const onDelete = mock(() => {})
        const trustees = [
            makeTrustee({
                id: 42,
                name: 'Successor Trustee',
                email: 'successor@trust.com',
                order: 2,
            }),
        ]

        render(
            <TrusteeTable
                trustees={trustees}
                selectedEntity={1}
                onDelete={onDelete}
                onUpdateField={mock(async () => {})}
            />,
        )

        const deleteButton = screen.getByRole('button')
        await user.click(deleteButton)

        expect(onDelete.mock.calls.length).toBeGreaterThan(0)
        expect(onDelete.mock.calls[0]?.[0]).toBe(42)
    })
})
