import { describe, expect, test } from 'bun:test'
import {
    calculateMonthlyPayment,
    calculatePaymentSplit,
    estimatePayoffDate,
    getCurrentLoanPosition,
} from '../../src/lib/amortization'

/**
 * Unit tests for Amortization Calculation Utilities
 *
 * Tests for loan payment calculations including:
 * - Payment splitting (principal/interest/escrow)
 * - Monthly payment calculation from loan terms
 * - Payoff date estimation
 * - Current loan position analysis
 *
 * All money values use string inputs/outputs for database compatibility.
 */

describe('Amortization Calculation Utilities', () => {
    describe('calculatePaymentSplit', () => {
        describe('Standard calculations', () => {
            test('splits payment into principal, interest, and escrow', () => {
                // Standard mortgage: $250,000 balance, 6.5% rate, $1800 payment, $350 escrow
                const result = calculatePaymentSplit(
                    '250000.00', // currentBalance
                    '0.065', // annualRate (6.5%)
                    '1800.00', // paymentAmount
                    '350.00', // escrowAmount
                )

                expect(result).not.toBeNull()
                // Interest = 250000 * (0.065 / 12) = 1354.17
                // Principal = 1800 - 1354.17 - 350 = 95.83
                expect(result!.interest).toBe('1354.17')
                expect(result!.principal).toBe('95.83')
                expect(result!.escrow).toBe('350.00')
                // New balance = 250000 - 95.83 = 249904.17
                expect(result!.newBalance).toBe('249904.17')
            })

            test('handles payment without escrow', () => {
                const result = calculatePaymentSplit(
                    '100000.00',
                    '0.06', // 6% rate
                    '1000.00',
                    // no escrow
                )

                expect(result).not.toBeNull()
                // Interest = 100000 * (0.06 / 12) = 500.00
                // Principal = 1000 - 500 = 500.00
                expect(result!.interest).toBe('500.00')
                expect(result!.principal).toBe('500.00')
                expect(result!.escrow).toBe('0.00')
                expect(result!.newBalance).toBe('99500.00')
            })

            test('handles escrow as zero string', () => {
                const result = calculatePaymentSplit(
                    '100000.00',
                    '0.06',
                    '1000.00',
                    '0.00',
                )

                expect(result).not.toBeNull()
                expect(result!.escrow).toBe('0.00')
                expect(result!.principal).toBe('500.00')
            })
        })

        describe('Edge cases', () => {
            test('zero interest rate puts all payment toward principal', () => {
                const result = calculatePaymentSplit(
                    '50000.00',
                    '0', // 0% rate
                    '1000.00',
                    '100.00',
                )

                expect(result).not.toBeNull()
                expect(result!.interest).toBe('0.00')
                // Principal = 1000 - 0 - 100 = 900
                expect(result!.principal).toBe('900.00')
                expect(result!.newBalance).toBe('49100.00')
            })

            test('payment less than interest results in negative principal', () => {
                // Payment doesn't cover interest - balance increases
                const result = calculatePaymentSplit(
                    '500000.00',
                    '0.12', // 12% rate = 5000/month interest
                    '3000.00', // Only paying 3000
                    '0.00',
                )

                expect(result).not.toBeNull()
                // Interest = 500000 * (0.12 / 12) = 5000.00
                // Principal = 3000 - 5000 = -2000.00
                expect(result!.interest).toBe('5000.00')
                expect(result!.principal).toBe('-2000.00')
                // New balance = 500000 - (-2000) = 502000.00
                expect(result!.newBalance).toBe('502000.00')
            })

            test('zero balance returns zero interest', () => {
                const result = calculatePaymentSplit('0.00', '0.065', '1000.00')

                expect(result).not.toBeNull()
                expect(result!.interest).toBe('0.00')
                expect(result!.principal).toBe('1000.00')
                expect(result!.newBalance).toBe('-1000.00') // Overpayment
            })

            test('handles very small balance', () => {
                const result = calculatePaymentSplit(
                    '50.00', // Small remaining balance
                    '0.065',
                    '1000.00',
                )

                expect(result).not.toBeNull()
                // Interest = 50 * (0.065 / 12) = 0.27
                expect(result!.interest).toBe('0.27')
            })
        })
    })

    describe('estimatePayoffDate', () => {
        describe('Standard calculations', () => {
            test('estimates payoff for standard mortgage', () => {
                // $250,000 at 6.5%, $1800/month payment, $350 escrow
                const result = estimatePayoffDate(
                    '250000.00',
                    '0.065',
                    '1800.00',
                    '350.00',
                )

                expect(result).not.toBeNull()
                // With effective payment of $1450 (1800 - 350) toward P&I
                // At 6.5% rate, ~503 months to pay off (much longer due to low effective payment)
                expect(result!.monthsRemaining).toBeGreaterThan(400)
                expect(result!.monthsRemaining).toBeLessThan(600)
                expect(result!.payoffDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
                expect(result!.totalInterest).toBeDefined()
            })

            test('estimates payoff with no escrow', () => {
                const result = estimatePayoffDate(
                    '100000.00',
                    '0.06',
                    '1000.00',
                    // no escrow
                )

                expect(result).not.toBeNull()
                // Interest = 500/month, Principal = 500/month
                // ~139 months to pay off (less as principal decreases interest)
                expect(result!.monthsRemaining).toBeGreaterThan(100)
                expect(result!.monthsRemaining).toBeLessThan(200)
            })

            test('uses custom start date for payoff calculation', () => {
                const result = estimatePayoffDate(
                    '100000.00',
                    '0.06',
                    '1000.00',
                    '0.00',
                    '2025-01-15',
                )

                expect(result).not.toBeNull()
                // Payoff date should be relative to start date
                expect(result!.payoffDate).toMatch(/^202[6-9]|203[0-9]/)
            })
        })

        describe('Edge cases', () => {
            test('returns null when payment equals interest (never pays off)', () => {
                // Payment exactly equals monthly interest
                const result = estimatePayoffDate(
                    '100000.00',
                    '0.12', // 12% = 1000/month interest
                    '1000.00', // Exactly covers interest
                )

                expect(result).toBeNull()
            })

            test('returns null when payment less than interest', () => {
                const result = estimatePayoffDate(
                    '500000.00',
                    '0.12', // 5000/month interest
                    '3000.00', // Not enough
                )

                expect(result).toBeNull()
            })

            test('zero balance returns immediate payoff', () => {
                const result = estimatePayoffDate('0.00', '0.065', '1000.00')

                expect(result).not.toBeNull()
                expect(result!.monthsRemaining).toBe(0)
                expect(result!.totalInterest).toBe('0.00')
            })

            test('zero interest rate calculates simple division', () => {
                const result = estimatePayoffDate(
                    '12000.00',
                    '0', // 0% rate
                    '1000.00',
                )

                expect(result).not.toBeNull()
                expect(result!.monthsRemaining).toBe(12) // Simple: 12000 / 1000
                expect(result!.totalInterest).toBe('0.00')
            })

            test('escrow reduces effective payment for payoff calculation', () => {
                const withoutEscrow = estimatePayoffDate(
                    '100000.00',
                    '0.06',
                    '1000.00',
                )

                const withEscrow = estimatePayoffDate(
                    '100000.00',
                    '0.06',
                    '1000.00',
                    '200.00', // $200/month goes to escrow
                )

                expect(withoutEscrow).not.toBeNull()
                expect(withEscrow).not.toBeNull()
                // With escrow should take longer
                expect(withEscrow!.monthsRemaining).toBeGreaterThan(
                    withoutEscrow!.monthsRemaining,
                )
            })
        })
    })

    describe('calculateMonthlyPayment', () => {
        describe('Standard calculations', () => {
            test('calculates standard 30-year mortgage payment', () => {
                // $250,000 at 6.5% for 30 years
                const result = calculateMonthlyPayment(
                    '250000.00',
                    '0.065',
                    360, // 30 years
                )

                expect(result).not.toBeNull()
                // Standard amortization formula: ~$1580.17
                expect(parseFloat(result!)).toBeCloseTo(1580.17, 0)
            })

            test('calculates 15-year mortgage payment', () => {
                const result = calculateMonthlyPayment(
                    '250000.00',
                    '0.065',
                    180, // 15 years
                )

                expect(result).not.toBeNull()
                // 15-year should be higher than 30-year
                expect(parseFloat(result!)).toBeGreaterThan(2000)
            })

            test('calculates car loan payment', () => {
                // $30,000 at 7% for 5 years
                const result = calculateMonthlyPayment(
                    '30000.00',
                    '0.07',
                    60, // 5 years
                )

                expect(result).not.toBeNull()
                expect(parseFloat(result!)).toBeCloseTo(594.04, 0)
            })
        })

        describe('Edge cases', () => {
            test('zero interest rate returns principal divided by term', () => {
                const result = calculateMonthlyPayment(
                    '12000.00',
                    '0', // 0% rate
                    12,
                )

                expect(result).not.toBeNull()
                expect(result).toBe('1000.00') // Simple: 12000 / 12
            })

            test('zero term returns null', () => {
                const result = calculateMonthlyPayment('100000.00', '0.065', 0)

                expect(result).toBeNull()
            })

            test('negative term returns null', () => {
                const result = calculateMonthlyPayment(
                    '100000.00',
                    '0.065',
                    -12,
                )

                expect(result).toBeNull()
            })

            test('zero principal returns zero payment', () => {
                const result = calculateMonthlyPayment('0.00', '0.065', 360)

                expect(result).not.toBeNull()
                expect(result).toBe('0.00')
            })
        })
    })

    describe('getCurrentLoanPosition', () => {
        describe('Standard calculations', () => {
            test('calculates position for loan partway through term', () => {
                // Original: $300,000, 6.5%, 30 years, started 2020-01-01
                // Current balance: $280,000 (4 years in)
                const result = getCurrentLoanPosition(
                    '300000.00',
                    '0.065',
                    360,
                    '2020-01-01',
                    '280000.00',
                )

                expect(result).not.toBeNull()
                // Simulated payments until balance drops to $280k
                // This is approximately 63 payments due to amortization math
                expect(result!.paymentsMade).toBeGreaterThan(50)
                expect(result!.paymentsMade).toBeLessThan(80)
                // Remaining payments based on current balance at rate
                expect(result!.paymentsRemaining).toBeGreaterThan(200)
                expect(result!.paymentsRemaining).toBeLessThan(350)
                // Principal paid = 300000 - 280000 = 20000
                expect(result!.principalPaid).toBe('20000.00')
                // Interest paid should be significant
                expect(parseFloat(result!.interestPaid)).toBeGreaterThan(50000)
            })

            test('handles loan that is paid ahead', () => {
                // Balance lower than expected for payment count
                const result = getCurrentLoanPosition(
                    '200000.00',
                    '0.06',
                    360,
                    '2022-01-01',
                    '150000.00', // Paid down more than scheduled
                )

                expect(result).not.toBeNull()
                expect(result!.principalPaid).toBe('50000.00')
                // Remaining payments should be less than expected
                expect(result!.paymentsRemaining).toBeLessThan(360 - 48)
            })
        })

        describe('Edge cases', () => {
            test('brand new loan (no payments made)', () => {
                const result = getCurrentLoanPosition(
                    '250000.00',
                    '0.065',
                    360,
                    '2026-01-01', // Just started
                    '250000.00', // No reduction yet
                )

                expect(result).not.toBeNull()
                expect(result!.paymentsMade).toBe(0)
                // Remaining payments estimated from current balance (may be 360 or 361 due to rounding)
                expect(result!.paymentsRemaining).toBeGreaterThanOrEqual(360)
                expect(result!.paymentsRemaining).toBeLessThanOrEqual(362)
                expect(result!.principalPaid).toBe('0.00')
                expect(result!.interestPaid).toBe('0.00')
            })

            test('fully paid loan', () => {
                const result = getCurrentLoanPosition(
                    '100000.00',
                    '0.06',
                    360,
                    '1990-01-01',
                    '0.00', // Fully paid
                )

                expect(result).not.toBeNull()
                expect(result!.paymentsRemaining).toBe(0)
                expect(result!.principalPaid).toBe('100000.00')
            })

            test('zero interest loan', () => {
                const result = getCurrentLoanPosition(
                    '24000.00',
                    '0',
                    24,
                    '2025-01-01',
                    '12000.00',
                )

                expect(result).not.toBeNull()
                expect(result!.paymentsMade).toBe(12)
                expect(result!.paymentsRemaining).toBe(12)
                expect(result!.principalPaid).toBe('12000.00')
                expect(result!.interestPaid).toBe('0.00')
            })
        })
    })

    describe('Integration scenarios', () => {
        test('Real-world: Hudson Trust mortgage tracking', () => {
            // Homestead mortgage: $325,000 original, 6.25%, started 2019-06-01
            // Current balance: ~$290,000 after ~5 years
            const position = getCurrentLoanPosition(
                '325000.00',
                '0.0625',
                360,
                '2019-06-01',
                '290000.00',
            )

            expect(position).not.toBeNull()
            expect(position!.principalPaid).toBe('35000.00')

            // Calculate what a payment split looks like
            const split = calculatePaymentSplit(
                '290000.00',
                '0.0625',
                '2000.00',
                '400.00', // Escrow for taxes/insurance
            )

            expect(split).not.toBeNull()
            expect(parseFloat(split!.interest)).toBeGreaterThan(1000)

            // Estimate remaining payoff
            const payoff = estimatePayoffDate(
                '290000.00',
                '0.0625',
                '2000.00',
                '400.00',
            )

            expect(payoff).not.toBeNull()
            expect(payoff!.monthsRemaining).toBeGreaterThan(200)
        })

        test('Real-world: Auto loan tracking', () => {
            // Vehicle loan: $45,000, 7.5%, 72 months, started 2024-01-01
            // Current balance after 2 years: ~$30,000
            const payment = calculateMonthlyPayment('45000.00', '0.075', 72)

            expect(payment).not.toBeNull()
            // Standard amortization formula gives ~$778/month
            expect(parseFloat(payment!)).toBeCloseTo(778.06, 0)

            const position = getCurrentLoanPosition(
                '45000.00',
                '0.075',
                72,
                '2024-01-01',
                '30000.00',
            )

            expect(position).not.toBeNull()
            expect(position!.principalPaid).toBe('15000.00')
        })
    })
})
