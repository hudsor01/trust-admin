/** TrusteeTable component tests — sortable DataTable, primary-trustee lock, delete action. */

import '../../setup'
import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
    type TrusteeRow,
    TrusteeTable,
} from '../../../src/app/(admin)/trustees/_components/TrusteeTable'

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
    startDate: null,
    endDate: null,
    ...overrides,
})

describe('TrusteeTable', () => {
    afterEach(() => {
        cleanup()
    })

    test('renders a trustee name', () => {
        render(
            <TrusteeTable
                trustees={[
                    makeTrustee({
                        name: 'Jane Doe',
                        email: 'jane@example.com',
                    }),
                ]}
                onDelete={mock(() => {})}
                onUpdateField={mock(async () => {})}
            />,
        )
        expect(screen.getByText('Jane Doe')).toBeTruthy()
    })

    test('renders multiple trustees', () => {
        render(
            <TrusteeTable
                trustees={[
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
                ]}
                onDelete={mock(() => {})}
                onUpdateField={mock(async () => {})}
            />,
        )
        expect(screen.getByText('Alice Trustee')).toBeTruthy()
        expect(screen.getByText('Bob Successor')).toBeTruthy()
    })

    test('renders sortable column headers and no Order column', () => {
        render(
            <TrusteeTable
                trustees={[makeTrustee()]}
                onDelete={mock(() => {})}
                onUpdateField={mock(async () => {})}
            />,
        )
        expect(screen.getByText('Name')).toBeTruthy()
        expect(screen.getByText('Email')).toBeTruthy()
        expect(screen.getByText('Phone')).toBeTruthy()
        expect(screen.getByText('Status')).toBeTruthy()
        expect(screen.getByText('Start Date')).toBeTruthy()
        // Order column was removed — sorting is now via the column headers.
        expect(screen.queryByText('Order')).toBeNull()
    })

    test('locks the primary trustee — no Edit/Delete actions', () => {
        render(
            <TrusteeTable
                trustees={[makeTrustee({ email: 'rhudsontspr@gmail.com' })]}
                allowPrimaryLock
                onDelete={mock(() => {})}
                onEdit={mock(() => {})}
                onUpdateField={mock(async () => {})}
            />,
        )
        expect(screen.getByText('Richard Hudson')).toBeTruthy()
        expect(
            screen.queryByRole('button', { name: /delete trustee/i }),
        ).toBeNull()
        expect(
            screen.queryByRole('button', { name: /edit trustee/i }),
        ).toBeNull()
    })

    test('shows a Delete action for a non-primary trustee', () => {
        render(
            <TrusteeTable
                trustees={[
                    makeTrustee({
                        id: 2,
                        name: 'Second Trustee',
                        email: 'second@trust.com',
                        order: 2,
                    }),
                ]}
                allowPrimaryLock
                onDelete={mock(() => {})}
                onUpdateField={mock(async () => {})}
            />,
        )
        expect(
            screen.getByRole('button', { name: /delete trustee/i }),
        ).toBeTruthy()
    })

    test('calls onDelete with the trustee id when Delete is clicked', async () => {
        const user = userEvent.setup()
        const onDelete = mock(() => {})
        render(
            <TrusteeTable
                trustees={[
                    makeTrustee({
                        id: 42,
                        name: 'Successor Trustee',
                        email: 'successor@trust.com',
                        order: 2,
                    }),
                ]}
                onDelete={onDelete}
                onUpdateField={mock(async () => {})}
            />,
        )
        await user.click(
            screen.getByRole('button', { name: /delete trustee/i }),
        )
        expect(onDelete.mock.calls.length).toBeGreaterThan(0)
        expect(onDelete.mock.calls[0]?.[0]).toBe(42)
    })
})
