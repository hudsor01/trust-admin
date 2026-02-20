/**
 * AccountingSummaryCards Component Tests
 *
 * Tests for the summary cards that display income totals, expense totals,
 * net change, deductible expenses, and principal vs income breakdown.
 */

import '../../setup'
import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AccountingSummaryCards } from '../../../src/app/(admin)/accounting/_components/AccountingSummaryCards'

const defaultProps = {
    incomeTotal: '5000.00',
    expenseTotal: '2000.00',
    netIncome: '3000.00',
    deductibleExpenses: '1500.00',
    principalReceipts: '3000.00',
    incomeReceipts: '2000.00',
    principalDisbursements: '1200.00',
    incomeDisbursements: '800.00',
    unconvertedSummary: [],
    convertingYear: null,
    onConvertYear: mock(() => {}),
}

describe('AccountingSummaryCards', () => {
    afterEach(() => {
        cleanup()
    })

    test('renders income total', () => {
        render(<AccountingSummaryCards {...defaultProps} />)

        expect(screen.getByText('Total Receipts')).toBeTruthy()
        // $5,000.00 appears in both the card and the breakdown totals row
        const incomeTotals = screen.getAllByText('$5,000.00')
        expect(incomeTotals.length).toBeGreaterThan(0)
    })

    test('renders expense total', () => {
        render(<AccountingSummaryCards {...defaultProps} />)

        expect(screen.getByText('Total Disbursements')).toBeTruthy()
        // $2,000.00 appears in both the card and the breakdown totals row
        const expenseTotals = screen.getAllByText('$2,000.00')
        expect(expenseTotals.length).toBeGreaterThan(0)
    })

    test('renders net income', () => {
        render(<AccountingSummaryCards {...defaultProps} />)

        expect(screen.getByText('Net Change')).toBeTruthy()
        // $3,000.00 appears in both Net Change card and Principal Receipts breakdown
        const netIncomeAmounts = screen.getAllByText('$3,000.00')
        expect(netIncomeAmounts.length).toBeGreaterThan(0)
    })

    test('renders deductible expenses', () => {
        render(<AccountingSummaryCards {...defaultProps} />)

        expect(screen.getByText('Tax Deductible')).toBeTruthy()
        expect(screen.getByText('$1,500.00')).toBeTruthy()
    })

    test('renders principal vs income breakdown section', () => {
        render(<AccountingSummaryCards {...defaultProps} />)

        expect(
            screen.getByText(/Principal vs Income Allocation/),
        ).toBeTruthy()
        // Values appear in breakdown rows
        const principalAmounts = screen.getAllByText('$3,000.00')
        expect(principalAmounts.length).toBeGreaterThan(0)
    })

    test('renders zero values correctly', () => {
        render(
            <AccountingSummaryCards
                {...defaultProps}
                incomeTotal="0"
                expenseTotal="0"
                netIncome="0"
                deductibleExpenses="0"
            />,
        )

        // $0.00 should appear multiple times for different fields
        const zeroCurrencies = screen.getAllByText('$0.00')
        expect(zeroCurrencies.length).toBeGreaterThan(0)
    })

    test('shows "All income has been converted" message when unconvertedSummary is empty', () => {
        render(
            <AccountingSummaryCards
                {...defaultProps}
                unconvertedSummary={[]}
            />,
        )

        expect(
            screen.getByText(
                /All income has been converted to principal/,
            ),
        ).toBeTruthy()
    })

    test('renders unconverted year data when unconvertedSummary has entries', () => {
        render(
            <AccountingSummaryCards
                {...defaultProps}
                unconvertedSummary={[
                    {
                        fiscalYear: 2025,
                        entryCount: 3,
                        totalAmount: '1200.00',
                    },
                ]}
            />,
        )

        expect(screen.getByText('Fiscal Year 2025')).toBeTruthy()
        expect(screen.getByText(/3 entries/)).toBeTruthy()
        expect(screen.getByText('Convert to Principal')).toBeTruthy()
    })

    test('shows singular "entry" for one entry count', () => {
        render(
            <AccountingSummaryCards
                {...defaultProps}
                unconvertedSummary={[
                    {
                        fiscalYear: 2024,
                        entryCount: 1,
                        totalAmount: '500.00',
                    },
                ]}
            />,
        )

        expect(screen.getByText(/1 entry/)).toBeTruthy()
    })

    test('disables convert button when convertingYear matches', () => {
        render(
            <AccountingSummaryCards
                {...defaultProps}
                unconvertedSummary={[
                    {
                        fiscalYear: 2025,
                        entryCount: 2,
                        totalAmount: '800.00',
                    },
                ]}
                convertingYear={2025}
            />,
        )

        const convertButton = screen.getByRole('button', {
            name: /Converting/i,
        })
        expect(convertButton).toBeTruthy()
        // Button should be disabled while converting
        expect(convertButton.hasAttribute('disabled')).toBe(true)
    })

    test('calls onConvertYear when Convert to Principal button clicked', async () => {
        const user = userEvent.setup()
        const onConvertYear = mock(() => {})

        render(
            <AccountingSummaryCards
                {...defaultProps}
                unconvertedSummary={[
                    {
                        fiscalYear: 2025,
                        entryCount: 2,
                        totalAmount: '800.00',
                    },
                ]}
                onConvertYear={onConvertYear}
            />,
        )

        const convertButton = screen.getByRole('button', {
            name: /Convert to Principal/i,
        })
        await user.click(convertButton)

        expect(onConvertYear.mock.calls.length).toBe(1)
        expect(onConvertYear.mock.calls[0][0]).toBe(2025)
    })
})
