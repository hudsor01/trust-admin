import { describe, expect, test } from "bun:test"
import {
  type Beneficiary,
  calculateDistribution,
  calculateManualDistribution,
  createDistributionRecords,
  type DistributionInput,
  formatDistributionSummary,
} from "../../src/lib/distribution-calculator"

/**
 * Unit tests for Distribution Calculator
 * Handles share-based income distribution among beneficiaries
 */

describe("Distribution Calculator", () => {
  // Test beneficiaries
  const testBeneficiaries: Beneficiary[] = [
    {
      id: "ben1",
      firstName: "Alice",
      lastName: "Smith",
      sharePercent: 50,
    },
    {
      id: "ben2",
      firstName: "Bob",
      lastName: "Jones",
      sharePercent: 30,
    },
    {
      id: "ben3",
      firstName: "Carol",
      lastName: "Davis",
      sharePercent: 20,
    },
  ]

  describe("Basic Distribution Calculation", () => {
    test("Calculates distribution from gross income, expenses, and trustee fee", () => {
      const input: DistributionInput = {
        grossIncome: 50000, // $50k rental income
        totalExpenses: 10000, // $10k expenses
        trustAssetValue: 1000000, // $1M trust
        periodMonths: 12,
        beneficiaries: testBeneficiaries,
      }

      const result = calculateDistribution(input)

      // Trustee fee: 8% of $50k = $4k
      expect(result.trusteeFee).toBe(4000)

      // Total deductions: $10k expenses + $4k fee = $14k
      expect(result.totalDeductions).toBe(14000)

      // Net distributable: $50k - $14k = $36k
      expect(result.netDistributable).toBe(36000)

      // Share validation
      expect(result.totalSharePercent).toBe(100)
      expect(result.isValid).toBe(true)

      // Beneficiary shares
      expect(result.beneficiaryShares).toHaveLength(3)
      expect(result.beneficiaryShares[0].amount).toBe(18000) // 50% of $36k
      expect(result.beneficiaryShares[1].amount).toBe(10800) // 30% of $36k
      expect(result.beneficiaryShares[2].amount).toBe(7200) // 20% of $36k
    })

    test("Returns correct breakdown in result", () => {
      const input: DistributionInput = {
        grossIncome: 100000,
        totalExpenses: 20000,
        trustAssetValue: 1000000,
        beneficiaries: testBeneficiaries,
      }

      const result = calculateDistribution(input)

      expect(result.grossIncome).toBe(100000)
      expect(result.expenses).toBe(20000)
      expect(result.trusteeFee).toBe(8000) // 8% of $100k
      expect(result.totalDeductions).toBe(28000)
      expect(result.netDistributable).toBe(72000)
    })
  })

  describe("Share Percentage Validation", () => {
    test("Validates shares total 100%", () => {
      const validBeneficiaries: Beneficiary[] = [
        { id: "b1", firstName: "A", lastName: "B", sharePercent: 60 },
        { id: "b2", firstName: "C", lastName: "D", sharePercent: 40 },
      ]

      const result = calculateDistribution({
        grossIncome: 10000,
        totalExpenses: 0,
        trustAssetValue: 1000000,
        beneficiaries: validBeneficiaries,
      })

      expect(result.isValid).toBe(true)
      expect(result.totalSharePercent).toBe(100)
      expect(result.validationMessage).toBeUndefined()
    })

    test("Flags invalid shares (total > 100%)", () => {
      const invalidBeneficiaries: Beneficiary[] = [
        { id: "b1", firstName: "A", lastName: "B", sharePercent: 60 },
        { id: "b2", firstName: "C", lastName: "D", sharePercent: 50 }, // Total: 110%
      ]

      const result = calculateDistribution({
        grossIncome: 10000,
        totalExpenses: 0,
        trustAssetValue: 1000000,
        beneficiaries: invalidBeneficiaries,
      })

      expect(result.isValid).toBe(false)
      expect(result.totalSharePercent).toBe(110)
      expect(result.validationMessage).toContain("110.00%")
      expect(result.validationMessage).toContain("should be 100%")
    })

    test("Flags invalid shares (total < 100%)", () => {
      const invalidBeneficiaries: Beneficiary[] = [
        { id: "b1", firstName: "A", lastName: "B", sharePercent: 30 },
        { id: "b2", firstName: "C", lastName: "D", sharePercent: 20 }, // Total: 50%
      ]

      const result = calculateDistribution({
        grossIncome: 10000,
        totalExpenses: 0,
        trustAssetValue: 1000000,
        beneficiaries: invalidBeneficiaries,
      })

      expect(result.isValid).toBe(false)
      expect(result.totalSharePercent).toBe(50)
      expect(result.validationMessage).toContain("50.00%")
    })

    test("Allows small rounding errors (99.99% - 100.01%)", () => {
      const beneficiaries: Beneficiary[] = [
        { id: "b1", firstName: "A", lastName: "B", sharePercent: 33.33 },
        { id: "b2", firstName: "C", lastName: "D", sharePercent: 33.33 },
        { id: "b3", firstName: "E", lastName: "F", sharePercent: 33.34 },
      ]

      const result = calculateDistribution({
        grossIncome: 10000,
        totalExpenses: 0,
        trustAssetValue: 1000000,
        beneficiaries,
      })

      expect(result.isValid).toBe(true) // 99.99% + 0.01 tolerance
      expect(result.totalSharePercent).toBe(100)
    })
  })

  describe("Trustee Fee Deduction", () => {
    test("Deducts trustee income fee (8% of gross income)", () => {
      const result = calculateDistribution({
        grossIncome: 50000,
        totalExpenses: 0,
        trustAssetValue: 1000000,
        beneficiaries: [{ id: "b1", firstName: "A", lastName: "B", sharePercent: 100 }],
      })

      // 8% of $50k = $4k
      expect(result.trusteeFee).toBe(4000)
      expect(result.netDistributable).toBe(46000) // $50k - $4k
    })

    test("Uses only income fee, not asset management fee", () => {
      // Asset management fee is 1.5% annually, but shouldn't affect distribution
      const result = calculateDistribution({
        grossIncome: 100000,
        totalExpenses: 0,
        trustAssetValue: 5000000, // Large asset value
        periodMonths: 12,
        beneficiaries: [{ id: "b1", firstName: "A", lastName: "B", sharePercent: 100 }],
      })

      // Should only deduct income fee (8% of $100k = $8k)
      // NOT asset fee (1.5% of $5M = $75k)
      expect(result.trusteeFee).toBe(8000)
      expect(result.netDistributable).toBe(92000)
    })

    test("Pro-rates trustee fee for partial periods", () => {
      const result = calculateDistribution({
        grossIncome: 50000,
        totalExpenses: 0,
        trustAssetValue: 1000000,
        periodMonths: 6, // 6 months
        beneficiaries: [{ id: "b1", firstName: "A", lastName: "B", sharePercent: 100 }],
      })

      // Income fee is NOT pro-rated (it's a percentage of income)
      // So still 8% of $50k = $4k
      expect(result.trusteeFee).toBe(4000)
    })
  })

  describe("Beneficiary Share Calculations", () => {
    test("Calculates shares with correct names", () => {
      const result = calculateDistribution({
        grossIncome: 30000,
        totalExpenses: 0,
        trustAssetValue: 1000000,
        beneficiaries: testBeneficiaries,
      })

      expect(result.beneficiaryShares[0].name).toBe("Alice Smith")
      expect(result.beneficiaryShares[1].name).toBe("Bob Jones")
      expect(result.beneficiaryShares[2].name).toBe("Carol Davis")
    })

    test("Rounds amounts to cents", () => {
      const result = calculateDistribution({
        grossIncome: 100,
        totalExpenses: 0,
        trustAssetValue: 1000000,
        beneficiaries: [{ id: "b1", firstName: "A", lastName: "B", sharePercent: 33.33 }],
      })

      // $100 - 8% = $92
      // 33.33% of $92 = $30.6636 → $30.66
      expect(result.beneficiaryShares[0].amount).toBe(30.66)
    })

    test("Handles zero share percentage", () => {
      const beneficiaries: Beneficiary[] = [
        { id: "b1", firstName: "A", lastName: "B", sharePercent: 100 },
        { id: "b2", firstName: "C", lastName: "D", sharePercent: 0 },
      ]

      const result = calculateDistribution({
        grossIncome: 10000,
        totalExpenses: 0,
        trustAssetValue: 1000000,
        beneficiaries,
      })

      expect(result.beneficiaryShares[1].amount).toBe(0)
    })

    test("Handles single beneficiary", () => {
      const result = calculateDistribution({
        grossIncome: 50000,
        totalExpenses: 10000,
        trustAssetValue: 1000000,
        beneficiaries: [
          { id: "b1", firstName: "Solo", lastName: "Beneficiary", sharePercent: 100 },
        ],
      })

      // $50k - $10k expenses - $4k fee = $36k
      expect(result.beneficiaryShares).toHaveLength(1)
      expect(result.beneficiaryShares[0].amount).toBe(36000)
    })
  })

  describe("Edge Cases", () => {
    test("Handles zero gross income", () => {
      const result = calculateDistribution({
        grossIncome: 0,
        totalExpenses: 5000,
        trustAssetValue: 1000000,
        beneficiaries: testBeneficiaries,
      })

      expect(result.netDistributable).toBe(0)
      expect(result.beneficiaryShares[0].amount).toBe(0)
      expect(result.beneficiaryShares[1].amount).toBe(0)
      expect(result.beneficiaryShares[2].amount).toBe(0)
    })

    test("Handles expenses exceeding income (no negative distribution)", () => {
      const result = calculateDistribution({
        grossIncome: 10000,
        totalExpenses: 15000, // More than income
        trustAssetValue: 1000000,
        beneficiaries: testBeneficiaries,
      })

      // Should clamp to zero, not negative
      expect(result.netDistributable).toBe(0)
      expect(result.beneficiaryShares[0].amount).toBe(0)
    })

    test("Handles very small amounts", () => {
      const result = calculateDistribution({
        grossIncome: 1,
        totalExpenses: 0,
        trustAssetValue: 1000000,
        beneficiaries: [{ id: "b1", firstName: "A", lastName: "B", sharePercent: 100 }],
      })

      // $1 - 8% = $0.92
      expect(result.netDistributable).toBe(0.92)
      expect(result.beneficiaryShares[0].amount).toBe(0.92)
    })

    test("Handles very large amounts", () => {
      const result = calculateDistribution({
        grossIncome: 10000000, // $10M
        totalExpenses: 1000000, // $1M
        trustAssetValue: 100000000, // $100M
        beneficiaries: [{ id: "b1", firstName: "A", lastName: "B", sharePercent: 100 }],
      })

      // $10M - $1M - $800k = $8.2M
      expect(result.netDistributable).toBe(8200000)
      expect(result.beneficiaryShares[0].amount).toBe(8200000)
    })

    test("Handles empty beneficiaries array", () => {
      const result = calculateDistribution({
        grossIncome: 10000,
        totalExpenses: 0,
        trustAssetValue: 1000000,
        beneficiaries: [],
      })

      expect(result.beneficiaryShares).toHaveLength(0)
      expect(result.totalSharePercent).toBe(0)
      expect(result.isValid).toBe(false)
    })
  })

  describe("Manual Distribution", () => {
    test("Calculates shares for specific amount", () => {
      const result = calculateManualDistribution(10000, testBeneficiaries)

      expect(result.beneficiaryShares).toHaveLength(3)
      expect(result.beneficiaryShares[0].amount).toBe(5000) // 50% of $10k
      expect(result.beneficiaryShares[1].amount).toBe(3000) // 30% of $10k
      expect(result.beneficiaryShares[2].amount).toBe(2000) // 20% of $10k
    })

    test("Validates share percentages", () => {
      const invalidBeneficiaries: Beneficiary[] = [
        { id: "b1", firstName: "A", lastName: "B", sharePercent: 60 },
        { id: "b2", firstName: "C", lastName: "D", sharePercent: 50 }, // Total: 110%
      ]

      const result = calculateManualDistribution(10000, invalidBeneficiaries)

      expect(result.isValid).toBe(false)
      expect(result.totalSharePercent).toBe(110)
    })

    test("Rounds amounts to cents", () => {
      const beneficiaries: Beneficiary[] = [
        { id: "b1", firstName: "A", lastName: "B", sharePercent: 33.33 },
        { id: "b2", firstName: "C", lastName: "D", sharePercent: 66.67 },
      ]

      const result = calculateManualDistribution(100, beneficiaries)

      // 33.33% of $100 = $33.33
      // 66.67% of $100 = $66.67
      expect(result.beneficiaryShares[0].amount).toBe(33.33)
      expect(result.beneficiaryShares[1].amount).toBe(66.67)
    })

    test("Handles zero amount", () => {
      const result = calculateManualDistribution(0, testBeneficiaries)

      expect(result.beneficiaryShares[0].amount).toBe(0)
      expect(result.beneficiaryShares[1].amount).toBe(0)
      expect(result.beneficiaryShares[2].amount).toBe(0)
    })
  })

  describe("Real-World Scenarios", () => {
    test("Scenario: Hudson Trust quarterly distribution (3 grandchildren)", () => {
      const grandchildren: Beneficiary[] = [
        {
          id: "g1",
          firstName: "Emma",
          lastName: "Hudson",
          sharePercent: 33.33,
        },
        {
          id: "g2",
          firstName: "Liam",
          lastName: "Hudson",
          sharePercent: 33.33,
        },
        {
          id: "g3",
          firstName: "Sophia",
          lastName: "Hudson",
          sharePercent: 33.34,
        },
      ]

      // Quarterly income: $9k rent per quarter
      const result = calculateDistribution({
        grossIncome: 9000,
        totalExpenses: 2000, // Property maintenance
        trustAssetValue: 1000000,
        periodMonths: 3,
        beneficiaries: grandchildren,
      })

      // $9k - $2k expenses - $720 fee (8% of $9k) = $6,280
      expect(result.netDistributable).toBe(6280)

      // Each gets roughly 1/3
      expect(result.beneficiaryShares[0].amount).toBeCloseTo(2093.12, 2)
      expect(result.beneficiaryShares[1].amount).toBeCloseTo(2093.12, 2)
      expect(result.beneficiaryShares[2].amount).toBeCloseTo(2093.75, 2)

      expect(result.isValid).toBe(true)
    })

    test("Scenario: Annual distribution with two children", () => {
      const children: Beneficiary[] = [
        { id: "c1", firstName: "Robert", lastName: "Smith", sharePercent: 50 },
        { id: "c2", firstName: "Jane", lastName: "Smith", sharePercent: 50 },
      ]

      // Annual rental income: $36k
      const result = calculateDistribution({
        grossIncome: 36000,
        totalExpenses: 8000,
        trustAssetValue: 1000000,
        periodMonths: 12,
        beneficiaries: children,
      })

      // $36k - $8k - $2,880 (8% of $36k) = $25,120
      expect(result.netDistributable).toBe(25120)

      // Each gets 50%
      expect(result.beneficiaryShares[0].amount).toBe(12560)
      expect(result.beneficiaryShares[1].amount).toBe(12560)
    })

    test("Scenario: High-income trust with multiple beneficiaries", () => {
      const beneficiaries: Beneficiary[] = [
        { id: "b1", firstName: "A", lastName: "B", sharePercent: 40 },
        { id: "b2", firstName: "C", lastName: "D", sharePercent: 30 },
        { id: "b3", firstName: "E", lastName: "F", sharePercent: 20 },
        { id: "b4", firstName: "G", lastName: "H", sharePercent: 10 },
      ]

      // High rental income: $200k annually from multiple properties
      const result = calculateDistribution({
        grossIncome: 200000,
        totalExpenses: 50000,
        trustAssetValue: 5000000,
        periodMonths: 12,
        beneficiaries,
      })

      // $200k - $50k - $16k (8% of $200k) = $134k
      expect(result.netDistributable).toBe(134000)

      expect(result.beneficiaryShares[0].amount).toBe(53600) // 40%
      expect(result.beneficiaryShares[1].amount).toBe(40200) // 30%
      expect(result.beneficiaryShares[2].amount).toBe(26800) // 20%
      expect(result.beneficiaryShares[3].amount).toBe(13400) // 10%
    })

    test("Scenario: Low-income year with operating loss", () => {
      // Property had major repairs, resulting in low net income
      const result = calculateDistribution({
        grossIncome: 15000, // Reduced rental income
        totalExpenses: 12000, // High maintenance costs
        trustAssetValue: 1000000,
        beneficiaries: testBeneficiaries,
      })

      // $15k - $12k - $1,200 (8% of $15k) = $1,800
      expect(result.netDistributable).toBe(1800)

      expect(result.beneficiaryShares[0].amount).toBe(900) // 50%
      expect(result.beneficiaryShares[1].amount).toBe(540) // 30%
      expect(result.beneficiaryShares[2].amount).toBe(360) // 20%
    })
  })

  describe("Distribution Record Creation", () => {
    test("Creates distribution records from calculation", () => {
      const calc = calculateDistribution({
        grossIncome: 30000,
        totalExpenses: 5000,
        trustAssetValue: 1000000,
        beneficiaries: testBeneficiaries,
      })

      const records = createDistributionRecords(calc, "entity123")

      expect(records).toHaveLength(3)

      // Check first record
      expect(records[0].beneficiaryId).toBe("ben1")
      expect(records[0].entityId).toBe("entity123")
      expect(records[0].distributionType).toBe("INCOME")
      expect(records[0].paymentMethod).toBe("CHECK") // Default
      expect(records[0].isShareDistribution).toBe(true)
      expect(records[0].amount).toBe("11300.00") // String format ($30k - $5k - $2.4k = $22.6k, 50% = $11.3k)
    })

    test("Filters out zero-amount distributions", () => {
      const beneficiaries: Beneficiary[] = [
        { id: "b1", firstName: "A", lastName: "B", sharePercent: 100 },
        { id: "b2", firstName: "C", lastName: "D", sharePercent: 0 },
      ]

      const calc = calculateDistribution({
        grossIncome: 10000,
        totalExpenses: 0,
        trustAssetValue: 1000000,
        beneficiaries,
      })

      const records = createDistributionRecords(calc, "entity123")

      // Should only create record for non-zero beneficiary
      expect(records).toHaveLength(1)
      expect(records[0].beneficiaryId).toBe("b1")
    })

    test("Includes batch ID in notes when provided", () => {
      const calc = calculateDistribution({
        grossIncome: 10000,
        totalExpenses: 0,
        trustAssetValue: 1000000,
        beneficiaries: [{ id: "b1", firstName: "A", lastName: "B", sharePercent: 100 }],
      })

      const records = createDistributionRecords(calc, "entity123", new Date(), {
        batchId: "Q1-2024",
      })

      expect(records[0].notes).toContain("Batch: Q1-2024")
    })

    test("Supports different payment methods", () => {
      const calc = calculateDistribution({
        grossIncome: 10000,
        totalExpenses: 0,
        trustAssetValue: 1000000,
        beneficiaries: [{ id: "b1", firstName: "A", lastName: "B", sharePercent: 100 }],
      })

      const records = createDistributionRecords(calc, "entity123", new Date(), {
        paymentMethod: "ACH",
      })

      expect(records[0].paymentMethod).toBe("ACH")
    })

    test("Formats distribution date as ISO string", () => {
      const calc = calculateDistribution({
        grossIncome: 10000,
        totalExpenses: 0,
        trustAssetValue: 1000000,
        beneficiaries: [{ id: "b1", firstName: "A", lastName: "B", sharePercent: 100 }],
      })

      const testDate = new Date("2024-03-15")
      const records = createDistributionRecords(calc, "entity123", testDate)

      expect(records[0].distributionDate).toBe(testDate.toISOString())
    })

    test("Formats amount as string with 2 decimal places", () => {
      const calc = calculateDistribution({
        grossIncome: 10000,
        totalExpenses: 0,
        trustAssetValue: 1000000,
        beneficiaries: [{ id: "b1", firstName: "A", lastName: "B", sharePercent: 33.33 }],
      })

      const records = createDistributionRecords(calc, "entity123")

      // Should have exactly 2 decimal places
      expect(records[0].amount).toMatch(/^\d+\.\d{2}$/)
    })
  })

  describe("Format Distribution Summary", () => {
    test("Formats calculation as human-readable summary", () => {
      const calc = calculateDistribution({
        grossIncome: 50000,
        totalExpenses: 10000,
        trustAssetValue: 1000000,
        beneficiaries: testBeneficiaries,
      })

      const summary = formatDistributionSummary(calc)

      expect(summary).toContain("Gross Income: $50,000")
      expect(summary).toContain("Operating Expenses: -$10,000")
      expect(summary).toContain("Trustee Fee: -$4,000")
      expect(summary).toContain("Net Distributable: $36,000")
      expect(summary).toContain("Alice Smith (50%): $18,000")
      expect(summary).toContain("Bob Jones (30%): $10,800")
      expect(summary).toContain("Carol Davis (20%): $7,200")
    })

    test("Includes validation warning for invalid shares", () => {
      const invalidBeneficiaries: Beneficiary[] = [
        { id: "b1", firstName: "A", lastName: "B", sharePercent: 60 },
        { id: "b2", firstName: "C", lastName: "D", sharePercent: 50 },
      ]

      const calc = calculateDistribution({
        grossIncome: 10000,
        totalExpenses: 0,
        trustAssetValue: 1000000,
        beneficiaries: invalidBeneficiaries,
      })

      const summary = formatDistributionSummary(calc)

      expect(summary).toContain("WARNING:")
      expect(summary).toContain("110.00%")
    })
  })
})
