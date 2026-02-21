/**
 * BequestTable Component Tests
 *
 * Tests for the BequestTable component that renders two sections:
 * - Pending Bequests (with edit/delete/mark-distributed actions)
 * - Distributed Bequests (read-only display)
 */

import '../../setup'
import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SpecificBequest } from '@/db/schema'
import { BequestTable } from '../../../src/app/(admin)/bequests/_components/BequestTable'

const makePendingBequest = (
    overrides: Partial<SpecificBequest> = {},
): SpecificBequest => ({
    id: 1,
    entityId: 1,
    beneficiaryId: null,
    description: 'Gold wedding ring',
    category: 'JEWELRY',
    recipientName: 'Jane Doe',
    notes: null,
    dateDistributed: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
})

const makeDistributedBequest = (
    overrides: Partial<SpecificBequest> = {},
): SpecificBequest => ({
    id: 2,
    entityId: 1,
    beneficiaryId: null,
    description: 'Family Bible',
    category: 'HEIRLOOM',
    recipientName: 'John Smith',
    notes: null,
    dateDistributed: '2025-03-15',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
})

const defaultBeneficiaries = [
    { id: 10, firstName: 'Alice', lastName: 'Johnson' },
    { id: 11, firstName: 'Bob', lastName: 'Williams' },
]

describe('BequestTable', () => {
    afterEach(() => {
        cleanup()
    })

    test('renders empty message for pending bequests when list is empty', () => {
        render(
            <BequestTable
                pendingBequests={[]}
                distributedBequests={[]}
                beneficiaries={[]}
                isLoading={false}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onMarkDistributed={mock(() => {})}
                onUpdate={mock(async () => {})}
            />,
        )

        expect(screen.getByText('No pending bequests')).toBeTruthy()
    })

    test('renders empty message for distributed bequests when list is empty', () => {
        render(
            <BequestTable
                pendingBequests={[]}
                distributedBequests={[]}
                beneficiaries={[]}
                isLoading={false}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onMarkDistributed={mock(() => {})}
                onUpdate={mock(async () => {})}
            />,
        )

        expect(screen.getByText('No distributed bequests')).toBeTruthy()
    })

    test('renders pending bequest descriptions in table', () => {
        const bequests = [
            makePendingBequest({ id: 1, description: 'Gold wedding ring' }),
            makePendingBequest({ id: 2, description: 'Antique clock' }),
        ]

        render(
            <BequestTable
                pendingBequests={bequests}
                distributedBequests={[]}
                beneficiaries={defaultBeneficiaries}
                isLoading={false}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onMarkDistributed={mock(() => {})}
                onUpdate={mock(async () => {})}
            />,
        )

        expect(screen.getByText('Gold wedding ring')).toBeTruthy()
        expect(screen.getByText('Antique clock')).toBeTruthy()
    })

    test('renders distributed bequest descriptions', () => {
        const distributed = [
            makeDistributedBequest({ id: 10, description: 'Family Bible' }),
        ]

        render(
            <BequestTable
                pendingBequests={[]}
                distributedBequests={distributed}
                beneficiaries={defaultBeneficiaries}
                isLoading={false}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onMarkDistributed={mock(() => {})}
                onUpdate={mock(async () => {})}
            />,
        )

        expect(screen.getByText('Family Bible')).toBeTruthy()
    })

    test('renders loading spinner when isLoading=true', () => {
        const { container } = render(
            <BequestTable
                pendingBequests={[]}
                distributedBequests={[]}
                beneficiaries={[]}
                isLoading={true}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onMarkDistributed={mock(() => {})}
                onUpdate={mock(async () => {})}
            />,
        )

        // Loader2 spinner should be present in the DOM
        const spinner = container.querySelector('.animate-spin')
        expect(spinner).toBeTruthy()
    })

    test('shows beneficiary name when beneficiaryId matches', () => {
        const bequest = makePendingBequest({
            id: 1,
            description: 'Pearl necklace',
            beneficiaryId: 10,
        })

        render(
            <BequestTable
                pendingBequests={[bequest]}
                distributedBequests={[]}
                beneficiaries={defaultBeneficiaries}
                isLoading={false}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onMarkDistributed={mock(() => {})}
                onUpdate={mock(async () => {})}
            />,
        )

        expect(screen.getByText('Alice Johnson')).toBeTruthy()
    })

    test('renders section headers for both pending and distributed', () => {
        render(
            <BequestTable
                pendingBequests={[]}
                distributedBequests={[]}
                beneficiaries={[]}
                isLoading={false}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onMarkDistributed={mock(() => {})}
                onUpdate={mock(async () => {})}
            />,
        )

        expect(screen.getByText('Pending Bequests')).toBeTruthy()
        expect(screen.getByText('Distributed Bequests')).toBeTruthy()
    })

    test('calls onEdit when edit button clicked for pending bequest', async () => {
        const user = userEvent.setup()
        const onEdit = mock(() => {})
        const bequest = makePendingBequest({
            id: 1,
            description: 'Pocket watch',
        })

        const { container } = render(
            <BequestTable
                pendingBequests={[bequest]}
                distributedBequests={[]}
                beneficiaries={[]}
                isLoading={false}
                onEdit={onEdit}
                onDelete={mock(() => {})}
                onMarkDistributed={mock(() => {})}
                onUpdate={mock(async () => {})}
            />,
        )

        // Actions cell has 3 buttons: mark-distributed (check), edit (pencil), delete (trash)
        // Find them inside the pending bequests table body row.
        const tbody = container.querySelector('tbody')
        const actionButtons = tbody?.querySelectorAll('button')
        // The second button (index 1) is the Edit (pencil) button
        if (actionButtons && actionButtons.length >= 2) {
            await user.click(actionButtons[1] as HTMLElement)
        }

        expect(onEdit.mock.calls.length).toBeGreaterThan(0)
    })

    test('calls onDelete when delete button clicked', async () => {
        const user = userEvent.setup()
        const onDelete = mock(() => {})
        const bequest = makePendingBequest({ id: 99, description: 'Old lamp' })

        render(
            <BequestTable
                pendingBequests={[bequest]}
                distributedBequests={[]}
                beneficiaries={[]}
                isLoading={false}
                onEdit={mock(() => {})}
                onDelete={onDelete}
                onMarkDistributed={mock(() => {})}
                onUpdate={mock(async () => {})}
            />,
        )

        // All buttons are ghost icon buttons; click the last one (delete)
        const buttons = screen.getAllByRole('button')
        const lastButton = buttons[buttons.length - 1]
        if (lastButton) {
            await user.click(lastButton)
        }

        expect(onDelete.mock.calls.length).toBeGreaterThan(0)
    })
})
