/**
 * LiabilityTable Component Tests
 *
 * Tests for the LiabilityTable component that displays liabilities in a
 * DataTable with inline editing, bulk mode, payment recording, and CRUD actions.
 */

import '../../setup'
import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LiabilityTable } from '../../../src/app/(admin)/liabilities/_components/LiabilityTable'
import type { Liability } from '../../../src/db/schema'

const makeLiability = (overrides: Partial<Liability> = {}): Liability => ({
    id: 1,
    entityId: 1,
    liabilityType: 'MORTGAGE',
    creditor: 'Wells Fargo',
    description: 'Primary home mortgage',
    originalAmount: '350000.00',
    currentBalance: '320000.00',
    currentBalanceDate: null,
    interestRate: '0.065',
    monthlyPayment: '2200.00',
    dueDate: null,
    paymentDueDay: 1,
    loanTermMonths: 360,
    loanStartDate: null,
    escrowMonthly: '400.00',
    isRevolvingCredit: false,
    rentalPropertyId: null,
    homesteadId: null,
    vehicleId: null,
    status: 'ACTIVE',
    allocationClass: 'PRINCIPAL',
    notes: null,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    effectiveBalance: '340800.00',
    ...overrides,
})

const defaultProps = {
    liabilities: [] as Liability[],
    isLoading: false,
    bulkMode: false,
    bulkCreatePending: false,
    onBulkModeToggle: mock(() => {}),
    onAdd: mock(() => {}),
    onEdit: mock(() => {}),
    onDelete: mock(() => {}),
    onRecordPayment: mock(() => {}),
    onBulkSave: mock(() => Promise.resolve()),
    onBulkCancel: mock(() => {}),
    onUpdateLiability: mock(() => Promise.resolve()),
    selectedEntity: 1 as number | undefined,
}

describe('LiabilityTable', () => {
    afterEach(() => {
        cleanup()
    })

    test('renders empty message when no liabilities', () => {
        render(<LiabilityTable {...defaultProps} />)
        expect(
            screen.getByText(
                'No liabilities recorded. Click Add to create one.',
            ),
        ).toBeTruthy()
    })

    test('renders table with liability data', () => {
        const liabilities = [
            makeLiability({ id: 1, creditor: 'Wells Fargo' }),
            makeLiability({
                id: 2,
                creditor: 'Chase Auto',
                liabilityType: 'LOAN',
            }),
        ]

        render(<LiabilityTable {...defaultProps} liabilities={liabilities} />)

        expect(screen.getByText('Wells Fargo')).toBeTruthy()
        expect(screen.getByText('Chase Auto')).toBeTruthy()
    })

    test('renders loading state without crashing', () => {
        render(<LiabilityTable {...defaultProps} isLoading={true} />)
        expect(screen.getByRole('table')).toBeTruthy()
    })

    test('renders Add Liability button when not in bulk mode', () => {
        render(<LiabilityTable {...defaultProps} bulkMode={false} />)
        expect(screen.getByText('Add Liability')).toBeTruthy()
    })

    test('Add Liability button is disabled when no entity selected', () => {
        render(
            <LiabilityTable
                {...defaultProps}
                selectedEntity={undefined}
                bulkMode={false}
            />,
        )
        const addButton = screen.getByText('Add Liability').closest('button')
        expect(addButton?.disabled).toBe(true)
    })

    test('calls onAdd when Add Liability button clicked', async () => {
        const user = userEvent.setup()
        const onAdd = mock(() => {})

        render(
            <LiabilityTable {...defaultProps} onAdd={onAdd} bulkMode={false} />,
        )

        await user.click(screen.getByText('Add Liability'))
        expect(onAdd.mock.calls.length).toBe(1)
    })

    test('renders Bulk Entry toggle button', () => {
        render(<LiabilityTable {...defaultProps} bulkMode={false} />)
        expect(screen.getByText('Bulk Entry')).toBeTruthy()
    })

    test('calls onBulkModeToggle when Bulk Entry button clicked', async () => {
        const user = userEvent.setup()
        const onBulkModeToggle = mock(() => {})

        render(
            <LiabilityTable
                {...defaultProps}
                onBulkModeToggle={onBulkModeToggle}
                bulkMode={false}
            />,
        )

        await user.click(screen.getByText('Bulk Entry'))
        expect(onBulkModeToggle.mock.calls.length).toBe(1)
    })

    test('renders bulk entry UI when bulkMode is true', () => {
        render(<LiabilityTable {...defaultProps} bulkMode={true} />)
        expect(screen.getByText('Bulk Entry Mode')).toBeTruthy()
    })

    test('hides Add Liability button in bulk mode', () => {
        render(<LiabilityTable {...defaultProps} bulkMode={true} />)
        expect(screen.queryByText('Add Liability')).toBeNull()
    })

    test('shows Single Entry toggle when in bulk mode', () => {
        render(<LiabilityTable {...defaultProps} bulkMode={true} />)
        expect(screen.getByText('Single Entry')).toBeTruthy()
    })

    test('renders search filter input', () => {
        render(
            <LiabilityTable
                {...defaultProps}
                liabilities={[makeLiability()]}
                bulkMode={false}
            />,
        )
        expect(
            screen.getByPlaceholderText('Filter by creditor...'),
        ).toBeTruthy()
    })

    test('renders column headers', () => {
        render(<LiabilityTable {...defaultProps} />)
        expect(screen.getByText('Creditor')).toBeTruthy()
        expect(screen.getByText('Type')).toBeTruthy()
        expect(screen.getByText('Actions')).toBeTruthy()
    })

    test('renders liability type badge for each row', () => {
        const liability = makeLiability({ liabilityType: 'MORTGAGE' })
        render(<LiabilityTable {...defaultProps} liabilities={[liability]} />)
        // The MORTGAGE type should be rendered (may be label "Mortgage")
        const mortgageBadges = screen.queryAllByText('Mortgage')
        expect(mortgageBadges.length).toBeGreaterThan(0)
    })

    test('renders action buttons for each liability row', () => {
        const liabilities = [
            makeLiability({ id: 1, creditor: 'Action Test Creditor' }),
        ]

        render(<LiabilityTable {...defaultProps} liabilities={liabilities} />)

        // The row actions section has DollarSign, Pencil, and Trash2 icon buttons
        // Verify multiple icon buttons render in the table
        const buttons = screen.getAllByRole('button')
        const svgButtons = buttons.filter((btn) => btn.querySelector('svg'))
        // There should be at least: Bulk Entry toggle + 3 action buttons per row
        expect(svgButtons.length).toBeGreaterThanOrEqual(4)
    })
})
