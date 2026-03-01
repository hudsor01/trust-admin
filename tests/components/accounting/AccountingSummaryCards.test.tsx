/** AccountingSummaryCards component tests — income/expense totals, net change, deductible, principal vs income. */

import '../../setup'
import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
    AccountingCompliancePanel,
    AccountingSummaryStats,
} from '../../../src/app/(admin)/accounting/_components/AccountingSummaryCards'

const statsProps = {
    incomeTotal: '5000.00',
    expenseTotal: '2000.00',
    netIncome: '3000.00',
    deductibleExpenses: '1500.00',
}

const complianceProps = {
    principalReceipts: '3000.00',
    incomeReceipts: '2000.00',
    principalDisbursements: '1200.00',
    incomeDisbursements: '800.00',
    unconvertedSummary: [] as {
        fiscalYear: number
        entryCount: number
        totalAmount: string
    }[],
    convertingYear: null as number | null,
    onConvertYear: mock(() => {}),
}

describe('AccountingSummaryStats', () => {
    afterEach(() => {
        cleanup()
    })

    test('renders income total', () => {
        render(<AccountingSummaryStats {...statsProps} />)

        expect(screen.getByText('Receipts')).toBeTruthy()
        expect(screen.getByText('$5,000.00')).toBeTruthy()
    })

    test('renders expense total', () => {
        render(<AccountingSummaryStats {...statsProps} />)

        expect(screen.getByText('Disbursements')).toBeTruthy()
        expect(screen.getByText('$2,000.00')).toBeTruthy()
    })

    test('renders net income', () => {
        render(<AccountingSummaryStats {...statsProps} />)

        expect(screen.getByText('Net Change')).toBeTruthy()
        expect(screen.getByText('$3,000.00')).toBeTruthy()
    })

    test('renders deductible expenses', () => {
        render(<AccountingSummaryStats {...statsProps} />)

        expect(screen.getByText('Tax Deductible')).toBeTruthy()
        expect(screen.getByText('$1,500.00')).toBeTruthy()
    })

    test('renders zero values correctly', () => {
        render(
            <AccountingSummaryStats
                incomeTotal="0"
                expenseTotal="0"
                netIncome="0"
                deductibleExpenses="0"
            />,
        )

        const zeroCurrencies = screen.getAllByText('$0.00')
        expect(zeroCurrencies.length).toBeGreaterThan(0)
    })
})

describe('AccountingCompliancePanel', () => {
    afterEach(() => {
        cleanup()
    })

    test('renders collapsible trigger', () => {
        render(<AccountingCompliancePanel {...complianceProps} />)

        expect(screen.getByText(/Principal & Income Details/)).toBeTruthy()
    })

    test('shows "All income converted to principal" when unconvertedSummary is empty', async () => {
        const user = userEvent.setup()
        render(
            <AccountingCompliancePanel
                {...complianceProps}
                unconvertedSummary={[]}
            />,
        )

        // Open the collapsible
        await user.click(screen.getByText(/Principal & Income Details/))

        expect(
            screen.getByText(/All income converted to principal/),
        ).toBeTruthy()
    })

    test('renders unconverted year data when unconvertedSummary has entries', () => {
        // Panel opens by default when there are unconverted entries
        render(
            <AccountingCompliancePanel
                {...complianceProps}
                unconvertedSummary={[
                    {
                        fiscalYear: 2025,
                        entryCount: 3,
                        totalAmount: '1200.00',
                    },
                ]}
            />,
        )

        expect(screen.getByText('FY 2025')).toBeTruthy()
        expect(screen.getByText(/3 entries/)).toBeTruthy()
        expect(screen.getByText('Convert')).toBeTruthy()
    })

    test('shows badge count for unconverted years', () => {
        render(
            <AccountingCompliancePanel
                {...complianceProps}
                unconvertedSummary={[
                    {
                        fiscalYear: 2025,
                        entryCount: 3,
                        totalAmount: '1200.00',
                    },
                ]}
            />,
        )

        expect(screen.getByText('1 unconverted')).toBeTruthy()
    })

    test('shows singular "entry" for one entry count', () => {
        // Panel opens by default when there are unconverted entries
        render(
            <AccountingCompliancePanel
                {...complianceProps}
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
        // Panel opens by default when there are unconverted entries
        render(
            <AccountingCompliancePanel
                {...complianceProps}
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

        // When converting, the button shows a spinner and is disabled
        const buttons = screen.getAllByRole('button')
        const convertButton = buttons.find((btn) =>
            btn.hasAttribute('disabled'),
        )
        expect(convertButton).toBeTruthy()
    })

    test('calls onConvertYear when Convert button clicked', async () => {
        const user = userEvent.setup()
        const onConvertYear = mock(() => {})

        // Panel opens by default when there are unconverted entries
        render(
            <AccountingCompliancePanel
                {...complianceProps}
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
            name: /^Convert$/i,
        })
        await user.click(convertButton)

        expect(onConvertYear.mock.calls.length).toBe(1)
        expect(onConvertYear.mock.calls[0][0]).toBe(2025)
    })
})
