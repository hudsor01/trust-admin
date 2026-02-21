import { describe, expect, test } from 'bun:test'
import {
    calculateAnnualCompensation,
    calculateTrusteeFees,
    calculateYear1Compensation,
    DEFAULT_FEE_SCHEDULE,
    type FeeSchedule,
} from '@/lib/fee-calculator'

/**
 * Unit tests for Trustee Fee Calculator
 * Based on Texas Property Code 114.061 - Reasonable Compensation
 */

describe('Trustee Fee Calculator', () => {
    describe('Default Fee Schedule', () => {
        test('DEFAULT_FEE_SCHEDULE has correct values', () => {
            expect(DEFAULT_FEE_SCHEDULE.executorFeePercent).toBe(5.0)
            expect(DEFAULT_FEE_SCHEDULE.annualAssetPercent).toBe(1.5)
            expect(DEFAULT_FEE_SCHEDULE.incomePercent).toBe(8.0)
            expect(DEFAULT_FEE_SCHEDULE.hourlyRate).toBe(125.0)
        })
    })

    describe('Executor Fee (One-Time Probate)', () => {
        test('Calculates 5% of estate value', () => {
            const result = calculateTrusteeFees({
                schedule: DEFAULT_FEE_SCHEDULE,
                estateValue: 1000000, // $1M estate
            })

            expect(result.executorFee).toBe(50000) // 5% = $50k
            expect(result.totalFee).toBe(50000)
            expect(result.breakdown.executorFee).not.toBeNull()
            expect(result.breakdown.executorFee?.basis).toBe(1000000)
            expect(result.breakdown.executorFee?.rate).toBe(5.0)
        })

        test('Returns zero when no estate value provided', () => {
            const result = calculateTrusteeFees({
                schedule: DEFAULT_FEE_SCHEDULE,
            })

            expect(result.executorFee).toBe(0)
            expect(result.breakdown.executorFee).toBeNull()
        })

        test('Returns zero when estate value is zero', () => {
            const result = calculateTrusteeFees({
                schedule: DEFAULT_FEE_SCHEDULE,
                estateValue: 0,
            })

            expect(result.executorFee).toBe(0)
        })

        test('Handles negative estate value gracefully', () => {
            const result = calculateTrusteeFees({
                schedule: DEFAULT_FEE_SCHEDULE,
                estateValue: -1000,
            })

            // Should not throw, and should clamp to 0 (no negative fees)
            expect(result.executorFee).toBe(0)
        })
    })

    describe('Asset Fee (Annual, Pro-rated)', () => {
        test('Calculates 1.5% of trust assets for full year', () => {
            const result = calculateTrusteeFees({
                schedule: DEFAULT_FEE_SCHEDULE,
                trustAssetValue: 1000000,
                periodMonths: 12,
            })

            expect(result.assetFee).toBe(15000) // 1.5% = $15k
            expect(result.breakdown.assetFee?.annualAmount).toBe(15000)
        })

        test('Pro-rates for partial year (6 months)', () => {
            const result = calculateTrusteeFees({
                schedule: DEFAULT_FEE_SCHEDULE,
                trustAssetValue: 1000000,
                periodMonths: 6,
            })

            expect(result.assetFee).toBe(7500) // 1.5% * 6/12 = $7.5k
            expect(result.breakdown.assetFee?.months).toBe(6)
        })

        test('Pro-rates for one quarter (3 months)', () => {
            const result = calculateTrusteeFees({
                schedule: DEFAULT_FEE_SCHEDULE,
                trustAssetValue: 1000000,
                periodMonths: 3,
            })

            expect(result.assetFee).toBe(3750) // 1.5% * 3/12 = $3.75k
        })

        test('Defaults to 12 months when not specified', () => {
            const result = calculateTrusteeFees({
                schedule: DEFAULT_FEE_SCHEDULE,
                trustAssetValue: 1000000,
            })

            expect(result.assetFee).toBe(15000)
            expect(result.breakdown.assetFee?.months).toBe(12)
        })

        test('Returns zero when trust asset value is zero', () => {
            const result = calculateTrusteeFees({
                schedule: DEFAULT_FEE_SCHEDULE,
                trustAssetValue: 0,
            })

            expect(result.assetFee).toBe(0)
        })
    })

    describe('Income Fee (Property Management)', () => {
        test('Calculates 8% of gross income', () => {
            const result = calculateTrusteeFees({
                schedule: DEFAULT_FEE_SCHEDULE,
                grossIncome: 50000, // $50k rental income
            })

            expect(result.incomeFee).toBe(4000) // 8% = $4k
            expect(result.breakdown.incomeFee?.rate).toBe(8.0)
        })

        test('Returns zero when no income provided', () => {
            const result = calculateTrusteeFees({
                schedule: DEFAULT_FEE_SCHEDULE,
            })

            expect(result.incomeFee).toBe(0)
            expect(result.breakdown.incomeFee).toBeNull()
        })

        test('Handles small income amounts', () => {
            const result = calculateTrusteeFees({
                schedule: DEFAULT_FEE_SCHEDULE,
                grossIncome: 100,
            })

            expect(result.incomeFee).toBe(8) // 8% of $100
        })
    })

    describe('Hourly Fee (Extraordinary Services)', () => {
        test('Calculates hours * rate', () => {
            const result = calculateTrusteeFees({
                schedule: DEFAULT_FEE_SCHEDULE,
                hoursWorked: 10,
            })

            expect(result.hourlyFee).toBe(1250) // 10 hours * $125/hr
            expect(result.breakdown.hourlyFee?.hours).toBe(10)
            expect(result.breakdown.hourlyFee?.rate).toBe(125)
        })

        test('Returns zero when no hours worked', () => {
            const result = calculateTrusteeFees({
                schedule: DEFAULT_FEE_SCHEDULE,
                hoursWorked: 0,
            })

            expect(result.hourlyFee).toBe(0)
        })

        test('Handles fractional hours', () => {
            const result = calculateTrusteeFees({
                schedule: DEFAULT_FEE_SCHEDULE,
                hoursWorked: 2.5,
            })

            expect(result.hourlyFee).toBe(312.5) // 2.5 * $125
        })
    })

    describe('Combined Fees', () => {
        test('Sums all fee components correctly', () => {
            const result = calculateTrusteeFees({
                schedule: DEFAULT_FEE_SCHEDULE,
                estateValue: 1000000, // Executor: $50k
                trustAssetValue: 1000000, // Asset: $15k
                periodMonths: 12,
                grossIncome: 50000, // Income: $4k
                hoursWorked: 10, // Hourly: $1.25k
            })

            expect(result.executorFee).toBe(50000)
            expect(result.assetFee).toBe(15000)
            expect(result.incomeFee).toBe(4000)
            expect(result.hourlyFee).toBe(1250)
            expect(result.totalFee).toBe(70250)
        })

        test('Returns zero total when all components are zero', () => {
            const result = calculateTrusteeFees({
                schedule: DEFAULT_FEE_SCHEDULE,
            })

            expect(result.totalFee).toBe(0)
        })
    })

    describe('Custom Fee Schedules', () => {
        test('Applies custom rate schedule', () => {
            const customSchedule: FeeSchedule = {
                executorFeePercent: 3.0, // Lower than default
                annualAssetPercent: 1.0, // Lower than default
                incomePercent: 10.0, // Higher than default
                hourlyRate: 150.0, // Higher than default
            }

            const result = calculateTrusteeFees({
                schedule: customSchedule,
                estateValue: 1000000,
                trustAssetValue: 1000000,
                periodMonths: 12,
                grossIncome: 50000,
                hoursWorked: 10,
            })

            expect(result.executorFee).toBe(30000) // 3%
            expect(result.assetFee).toBe(10000) // 1%
            expect(result.incomeFee).toBe(5000) // 10%
            expect(result.hourlyFee).toBe(1500) // $150/hr
            expect(result.totalFee).toBe(46500)
        })
    })

    describe('Year 1 Compensation (With Executor Fee)', () => {
        test('Includes executor fee for probate work', () => {
            const result = calculateYear1Compensation(
                1000000, // Estate value
                1000000, // Trust asset value
                50000, // Annual rental income
                40, // Probate hours
            )

            expect(result.executorFee).toBeGreaterThan(0)
            expect(result.assetFee).toBeGreaterThan(0)
            expect(result.incomeFee).toBeGreaterThan(0)
            expect(result.hourlyFee).toBeGreaterThan(0)
            expect(result.totalFee).toBeGreaterThan(50000)
        })

        test('Uses default schedule when not specified', () => {
            const result = calculateYear1Compensation(
                1000000,
                1000000,
                50000,
                40,
            )

            expect(result.breakdown.executorFee?.rate).toBe(5.0)
        })
    })

    describe('Annual Compensation (No Executor Fee)', () => {
        test('Excludes executor fee after year 1', () => {
            const result = calculateAnnualCompensation(
                1000000, // Trust asset value
                50000, // Annual rental income
                10, // Regular hours
            )

            expect(result.executorFee).toBe(0)
            expect(result.breakdown.executorFee).toBeNull()
            expect(result.assetFee).toBe(15000)
            expect(result.incomeFee).toBe(4000)
            expect(result.hourlyFee).toBe(1250)
        })

        test('Defaults hours to zero when not specified', () => {
            const result = calculateAnnualCompensation(1000000, 50000)

            expect(result.hourlyFee).toBe(0)
        })
    })

    describe('Real-World Scenarios', () => {
        test('Scenario: Hudson Trust Year 1 (high asset, moderate income)', () => {
            // Estate: $1M, Trust assets: $1M, Rental income: $36k/yr, Probate work: 80 hours
            const result = calculateYear1Compensation(
                1000000,
                1000000,
                36000,
                80,
            )

            expect(result.executorFee).toBe(50000) // 5% of estate
            expect(result.assetFee).toBe(15000) // 1.5% of assets
            expect(result.incomeFee).toBe(2880) // 8% of income
            expect(result.hourlyFee).toBe(10000) // 80 * $125
            expect(result.totalFee).toBe(77880)
        })

        test('Scenario: Year 2 ongoing (no executor fee, less hours)', () => {
            const result = calculateAnnualCompensation(
                1000000,
                36000,
                20, // Fewer hours after initial setup
            )

            expect(result.executorFee).toBe(0)
            expect(result.assetFee).toBe(15000)
            expect(result.incomeFee).toBe(2880)
            expect(result.hourlyFee).toBe(2500)
            expect(result.totalFee).toBe(20380)
        })

        test('Scenario: Small trust, no rental properties', () => {
            const result = calculateAnnualCompensation(
                250000, // Smaller trust
                0, // No rental income
                5, // Minimal work
            )

            expect(result.assetFee).toBe(3750) // 1.5% of $250k
            expect(result.incomeFee).toBe(0)
            expect(result.hourlyFee).toBe(625)
            expect(result.totalFee).toBe(4375)
        })

        test('Scenario: Large trust with significant rental income', () => {
            const result = calculateAnnualCompensation(
                5000000, // $5M in assets
                200000, // $200k rental income
                0, // No extraordinary work
            )

            expect(result.assetFee).toBe(75000) // 1.5% of $5M
            expect(result.incomeFee).toBe(16000) // 8% of $200k
            expect(result.hourlyFee).toBe(0)
            expect(result.totalFee).toBe(91000)
        })
    })

    describe('Edge Cases', () => {
        test('Handles very large numbers', () => {
            const result = calculateTrusteeFees({
                schedule: DEFAULT_FEE_SCHEDULE,
                estateValue: 100000000, // $100M
            })

            expect(result.executorFee).toBe(5000000) // $5M
        })

        test('Handles very small fractional amounts', () => {
            const result = calculateTrusteeFees({
                schedule: DEFAULT_FEE_SCHEDULE,
                grossIncome: 0.01,
            })

            expect(result.incomeFee).toBeCloseTo(0.0008, 4)
        })

        test('All breakdowns are null when no fees calculated', () => {
            const result = calculateTrusteeFees({
                schedule: DEFAULT_FEE_SCHEDULE,
            })

            expect(result.breakdown.executorFee).toBeNull()
            expect(result.breakdown.assetFee).toBeNull()
            expect(result.breakdown.incomeFee).toBeNull()
            expect(result.breakdown.hourlyFee).toBeNull()
        })
    })
})
