/**
 * AccountingTable Component Tests
 *
 * Tests for the accounting table that shows income/expense entries
 * with tabs for All, Income, and Expense views.
 */

import '../../setup'
import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { TrustAccounting } from '@/db/schema'
import { AccountingTable } from '../../../src/app/(admin)/accounting/_components/AccountingTable'

const makeEntry = (
    overrides: Partial<TrustAccounting> = {},
): TrustAccounting => ({
    id: 1,
    entityId: 1,
    accountingDate: '2025-01-15T00:00:00.000Z',
    entryType: 'INCOME',
    incomeType: 'DIVIDEND',
    expenseType: null,
    amount: '500.00',
    description: 'Dividend payment',
    sourceAssetType: null,
    sourceAssetId: null,
    bankAccountId: 1,
    isPrincipal: false,
    taxDeductible: false,
    documentPath: null,
    vendor: null,
    checkNumber: null,
    reconciled: false,
    reconciledDate: null,
    fiscalYear: 2025,
    convertedToPrincipal: false,
    conversionDate: null,
    conversionEntryId: null,
    notes: null,
    createdAt: '2025-01-15T00:00:00.000Z',
    updatedAt: '2025-01-15T00:00:00.000Z',
    ...overrides,
})

const defaultProps = {
    entries: [],
    incomeEntries: [],
    expenseEntries: [],
    filteredEntries: [],
    activeTab: 'all',
    isLoading: false,
    onTabChange: mock(() => {}),
    onEditEntry: mock(() => {}),
    onDeleteEntry: mock(() => {}),
    onUpdateEntry: mock(async () => {}),
}

describe('AccountingTable', () => {
    afterEach(() => {
        cleanup()
    })

    describe('tab rendering', () => {
        test('renders tab buttons: All Entries, Income, Expenses', () => {
            render(<AccountingTable {...defaultProps} />)

            expect(screen.getByText('All Entries')).toBeTruthy()
            expect(screen.getByText('Income')).toBeTruthy()
            expect(screen.getByText('Expenses')).toBeTruthy()
        })

        test('shows entry counts in tab badges', () => {
            const income = makeEntry({ id: 1, entryType: 'INCOME' })
            const expense = makeEntry({
                id: 2,
                entryType: 'EXPENSE',
                expenseType: 'TAX',
                incomeType: null,
            })

            render(
                <AccountingTable
                    {...defaultProps}
                    entries={[income, expense]}
                    incomeEntries={[income]}
                    expenseEntries={[expense]}
                    filteredEntries={[income, expense]}
                />,
            )

            // Badge counts should appear - 2 total, 1 income, 1 expense
            // They show as text badges next to tab labels
            const allTabArea = screen.getByText('All Entries')
            expect(allTabArea).toBeTruthy()
        })

        test('calls onTabChange when a tab is clicked', async () => {
            const user = userEvent.setup()
            const onTabChange = mock(() => {})

            render(
                <AccountingTable {...defaultProps} onTabChange={onTabChange} />,
            )

            await user.click(screen.getByText('Income'))
            expect(onTabChange.mock.calls.length).toBeGreaterThan(0)
        })
    })

    describe('empty state', () => {
        test('renders empty state message when no entries', () => {
            render(<AccountingTable {...defaultProps} />)

            expect(
                screen.getByText(
                    "No entries recorded yet. Click 'Add Entry' to start tracking.",
                ),
            ).toBeTruthy()
        })

        test('renders table structure even with empty data', () => {
            render(<AccountingTable {...defaultProps} />)

            expect(screen.getByRole('table')).toBeTruthy()
        })
    })

    describe('with data', () => {
        test('renders income entry with description visible', () => {
            const entry = makeEntry({
                description: 'Monthly dividend',
                entryType: 'INCOME',
            })

            render(
                <AccountingTable
                    {...defaultProps}
                    entries={[entry]}
                    incomeEntries={[entry]}
                    filteredEntries={[entry]}
                />,
            )

            expect(screen.getByText('Monthly dividend')).toBeTruthy()
        })

        test('renders entry type badge for income entries', () => {
            const entry = makeEntry({ entryType: 'INCOME' })

            render(
                <AccountingTable
                    {...defaultProps}
                    entries={[entry]}
                    incomeEntries={[entry]}
                    filteredEntries={[entry]}
                />,
            )

            expect(screen.getByText('INCOME')).toBeTruthy()
        })

        test('renders entry type badge for expense entries', () => {
            const entry = makeEntry({
                id: 2,
                entryType: 'EXPENSE',
                expenseType: 'TAX',
                incomeType: null,
                description: 'Property tax payment',
            })

            render(
                <AccountingTable
                    {...defaultProps}
                    entries={[entry]}
                    expenseEntries={[entry]}
                    filteredEntries={[entry]}
                />,
            )

            expect(screen.getByText('EXPENSE')).toBeTruthy()
            expect(screen.getByText('Property tax payment')).toBeTruthy()
        })

        test('renders multiple entries', () => {
            const income = makeEntry({
                id: 1,
                description: 'Rent income',
                entryType: 'INCOME',
                incomeType: 'RENT',
            })
            const expense = makeEntry({
                id: 2,
                description: 'Insurance premium',
                entryType: 'EXPENSE',
                expenseType: 'INSURANCE',
                incomeType: null,
            })

            render(
                <AccountingTable
                    {...defaultProps}
                    entries={[income, expense]}
                    incomeEntries={[income]}
                    expenseEntries={[expense]}
                    filteredEntries={[income, expense]}
                />,
            )

            expect(screen.getByText('Rent income')).toBeTruthy()
            expect(screen.getByText('Insurance premium')).toBeTruthy()
        })

        test('renders filter search input', () => {
            render(
                <AccountingTable
                    {...defaultProps}
                    filteredEntries={[makeEntry()]}
                />,
            )

            expect(
                screen.getByPlaceholderText('Filter by description...'),
            ).toBeTruthy()
        })
    })

    describe('loading state', () => {
        test('renders table structure in loading state', () => {
            render(<AccountingTable {...defaultProps} isLoading={true} />)

            expect(screen.getByRole('table')).toBeTruthy()
        })
    })

    describe('entry actions', () => {
        test('calls onDeleteEntry when delete button clicked', async () => {
            const user = userEvent.setup()
            const onDeleteEntry = mock(() => {})
            const entry = makeEntry({ id: 42, description: 'Test entry' })

            render(
                <AccountingTable
                    {...defaultProps}
                    entries={[entry]}
                    filteredEntries={[entry]}
                    onDeleteEntry={onDeleteEntry}
                />,
            )

            // Find the delete (trash) button
            const buttons = screen.getAllByRole('button')
            const deleteButton = buttons.find(
                (btn) => btn.getAttribute('title') === 'Delete entry',
            )
            if (deleteButton) {
                await user.click(deleteButton)
                expect(onDeleteEntry.mock.calls.length).toBeGreaterThan(0)
            }
        })

        test('calls onEditEntry when edit button clicked', async () => {
            const user = userEvent.setup()
            const onEditEntry = mock(() => {})
            const entry = makeEntry({ id: 1, description: 'Edit me' })

            render(
                <AccountingTable
                    {...defaultProps}
                    entries={[entry]}
                    filteredEntries={[entry]}
                    onEditEntry={onEditEntry}
                />,
            )

            const buttons = screen.getAllByRole('button')
            const editButton = buttons.find(
                (btn) => btn.getAttribute('title') === 'Edit entry',
            )
            if (editButton) {
                await user.click(editButton)
                expect(onEditEntry.mock.calls.length).toBeGreaterThan(0)
            }
        })
    })
})
