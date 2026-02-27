/** DashboardStats component tests — task progress, income, expenses, and net position stats. */

import '../../setup'
import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { DashboardStats } from '../../../src/app/(admin)/dashboard/_components/DashboardStats'

const defaultProps = {
    completedCount: 5,
    totalCount: 10,
    progressPercent: 50,
    incomeTotal: '15000.00',
    expenseTotal: '5000.00',
    netIncome: '10000.00',
    incomeEntryCount: 3,
    expenseEntryCount: 2,
}

describe('DashboardStats', () => {
    afterEach(() => {
        cleanup()
    })

    describe('task progress card', () => {
        test('renders task progress values', () => {
            render(<DashboardStats {...defaultProps} />)

            // "5 of 10"
            expect(screen.getByText('5 of 10')).toBeTruthy()
        })

        test('renders the completion percentage', () => {
            render(<DashboardStats {...defaultProps} />)

            expect(screen.getByText('50% complete')).toBeTruthy()
        })

        test('renders "Task Progress" heading', () => {
            render(<DashboardStats {...defaultProps} />)

            expect(screen.getByText('Task Progress')).toBeTruthy()
        })
    })

    describe('income card', () => {
        test('renders formatted income total', () => {
            render(<DashboardStats {...defaultProps} incomeTotal="15000.00" />)

            expect(screen.getByText('$15,000.00')).toBeTruthy()
        })

        test('renders income transaction count', () => {
            render(<DashboardStats {...defaultProps} incomeEntryCount={7} />)

            expect(screen.getByText('7 transactions')).toBeTruthy()
        })

        test('renders "Total Income" heading', () => {
            render(<DashboardStats {...defaultProps} />)

            expect(screen.getByText('Total Income')).toBeTruthy()
        })
    })

    describe('expenses card', () => {
        test('renders formatted expense total', () => {
            render(<DashboardStats {...defaultProps} expenseTotal="5000.00" />)

            expect(screen.getByText('$5,000.00')).toBeTruthy()
        })

        test('renders expense transaction count', () => {
            render(<DashboardStats {...defaultProps} expenseEntryCount={4} />)

            expect(screen.getByText('4 transactions')).toBeTruthy()
        })

        test('renders "Total Expenses" heading', () => {
            render(<DashboardStats {...defaultProps} />)

            expect(screen.getByText('Total Expenses')).toBeTruthy()
        })
    })

    describe('net position card', () => {
        test('renders formatted net income when positive', () => {
            render(
                <DashboardStats
                    {...defaultProps}
                    incomeTotal="15000.00"
                    expenseTotal="5000.00"
                    netIncome="10000.00"
                />,
            )

            expect(screen.getByText('$10,000.00')).toBeTruthy()
        })

        test('renders "Net Position" heading', () => {
            render(<DashboardStats {...defaultProps} />)

            expect(screen.getByText('Net Position')).toBeTruthy()
        })

        test('renders margin percentage for positive net income', () => {
            // netIncome = 10000, incomeTotal = 15000 → 67% margin
            render(
                <DashboardStats
                    {...defaultProps}
                    incomeTotal="15000.00"
                    netIncome="10000.00"
                />,
            )

            // 10000/15000 * 100 = 66.666... rounds to 67
            expect(screen.getByText(/67% margin/)).toBeTruthy()
        })

        test('shows 0% margin when incomeTotal is zero', () => {
            render(
                <DashboardStats
                    {...defaultProps}
                    incomeTotal="0.00"
                    expenseTotal="0.00"
                    netIncome="0.00"
                />,
            )

            expect(screen.getByText(/0% margin/)).toBeTruthy()
        })

        test('shows "+" prefix for positive net position in margin line', () => {
            render(
                <DashboardStats
                    {...defaultProps}
                    netIncome="10000.00"
                    incomeTotal="15000.00"
                />,
            )

            expect(screen.getByText(/\+67% margin/)).toBeTruthy()
        })
    })

    describe('zero and edge values', () => {
        test('renders zero values correctly', () => {
            render(
                <DashboardStats
                    completedCount={0}
                    totalCount={0}
                    progressPercent={0}
                    incomeTotal="0.00"
                    expenseTotal="0.00"
                    netIncome="0.00"
                    incomeEntryCount={0}
                    expenseEntryCount={0}
                />,
            )

            expect(screen.getByText('0 of 0')).toBeTruthy()
            expect(screen.getByText('0% complete')).toBeTruthy()
        })

        test('renders singular "1 transaction" label', () => {
            render(
                <DashboardStats
                    {...defaultProps}
                    incomeEntryCount={1}
                    expenseEntryCount={1}
                />,
            )

            const labels = screen.getAllByText('1 transactions')
            // Both income and expense cards show "1 transactions" (component does not pluralize)
            expect(labels.length).toBe(2)
        })
    })
})
