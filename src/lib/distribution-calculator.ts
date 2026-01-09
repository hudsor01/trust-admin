/**
 * Share Distribution Calculator
 *
 * Calculates how income should be distributed among beneficiaries
 * based on their share percentages, after deducting expenses and trustee fees.
 */

import { calculateTrusteeFees, DEFAULT_FEE_SCHEDULE, type FeeSchedule } from './fee-calculator'

export interface Beneficiary {
  id: string
  firstName: string
  lastName: string
  sharePercent: number
  // For withdrawal eligibility
  dob?: string | Date | null
  withdrawalAge1?: number | null
  withdrawalPct1?: number | null
  withdrawalAge2?: number | null
  withdrawalPct2?: number | null
}

export interface DistributionInput {
  // Income and expenses for the period
  grossIncome: number
  totalExpenses: number

  // Trust info for fee calculation
  trustAssetValue: number
  feeSchedule?: FeeSchedule

  // Period info
  periodMonths?: number

  // Beneficiaries with their shares
  beneficiaries: Beneficiary[]
}

export interface BeneficiaryShare {
  beneficiaryId: string
  name: string
  sharePercent: number
  amount: number
}

export interface DistributionCalculation {
  // Gross income for period
  grossIncome: number

  // Deductions
  expenses: number
  trusteeFee: number
  totalDeductions: number

  // Net available
  netDistributable: number

  // Per-beneficiary breakdown
  beneficiaryShares: BeneficiaryShare[]

  // Validation
  totalSharePercent: number
  isValid: boolean
  validationMessage?: string
}

/**
 * Calculate income distribution among beneficiaries
 *
 * Flow:
 * 1. Start with gross income
 * 2. Subtract operating expenses
 * 3. Subtract trustee fee
 * 4. Divide remainder by beneficiary shares
 */
export function calculateDistribution(input: DistributionInput): DistributionCalculation {
  const {
    grossIncome,
    totalExpenses,
    trustAssetValue,
    feeSchedule = DEFAULT_FEE_SCHEDULE,
    periodMonths = 12,
    beneficiaries,
  } = input

  // Validate share percentages add up to 100%
  const totalSharePercent = beneficiaries.reduce((sum, b) => sum + (b.sharePercent || 0), 0)
  const isValid = Math.abs(totalSharePercent - 100) < 0.01 // Allow small rounding errors

  // Calculate trustee fee
  const feeResult = calculateTrusteeFees({
    schedule: feeSchedule,
    trustAssetValue,
    periodMonths,
    grossIncome,
  })

  // Note: We use incomeFee (percentage of income) for distribution purposes
  // Asset fee is separate and charged regardless of distributions
  const trusteeFee = feeResult.incomeFee

  // Calculate net distributable
  const totalDeductions = totalExpenses + trusteeFee
  const netDistributable = Math.max(0, grossIncome - totalDeductions)

  // Calculate each beneficiary's share
  const beneficiaryShares: BeneficiaryShare[] = beneficiaries.map(b => {
    const sharePercent = b.sharePercent || 0
    const amount = netDistributable * (sharePercent / 100)

    return {
      beneficiaryId: b.id,
      name: `${b.firstName} ${b.lastName}`,
      sharePercent,
      amount: Math.round(amount * 100) / 100, // Round to cents
    }
  })

  return {
    grossIncome,
    expenses: totalExpenses,
    trusteeFee,
    totalDeductions,
    netDistributable,
    beneficiaryShares,
    totalSharePercent,
    isValid,
    validationMessage: isValid
      ? undefined
      : `Share percentages total ${totalSharePercent.toFixed(2)}%, should be 100%`,
  }
}

/**
 * Calculate a specific amount to distribute (manual distribution)
 *
 * Unlike calculateDistribution which uses all available income,
 * this calculates shares for a specific amount the trustee wants to distribute.
 */
export function calculateManualDistribution(
  amountToDistribute: number,
  beneficiaries: Beneficiary[]
): {
  beneficiaryShares: BeneficiaryShare[]
  totalSharePercent: number
  isValid: boolean
} {
  const totalSharePercent = beneficiaries.reduce((sum, b) => sum + (b.sharePercent || 0), 0)
  const isValid = Math.abs(totalSharePercent - 100) < 0.01

  const beneficiaryShares: BeneficiaryShare[] = beneficiaries.map(b => {
    const sharePercent = b.sharePercent || 0
    const amount = amountToDistribute * (sharePercent / 100)

    return {
      beneficiaryId: b.id,
      name: `${b.firstName} ${b.lastName}`,
      sharePercent,
      amount: Math.round(amount * 100) / 100,
    }
  })

  return {
    beneficiaryShares,
    totalSharePercent,
    isValid,
  }
}

/**
 * Format distribution summary for display
 */
export function formatDistributionSummary(calc: DistributionCalculation): string {
  const lines: string[] = [
    `Gross Income: $${calc.grossIncome.toLocaleString()}`,
    ``,
    `Deductions:`,
    `  Operating Expenses: -$${calc.expenses.toLocaleString()}`,
    `  Trustee Fee: -$${calc.trusteeFee.toLocaleString()}`,
    `  Total Deductions: -$${calc.totalDeductions.toLocaleString()}`,
    ``,
    `Net Distributable: $${calc.netDistributable.toLocaleString()}`,
    ``,
    `Beneficiary Shares:`,
  ]

  for (const share of calc.beneficiaryShares) {
    lines.push(`  ${share.name} (${share.sharePercent}%): $${share.amount.toLocaleString()}`)
  }

  if (!calc.isValid) {
    lines.push(``)
    lines.push(`WARNING: ${calc.validationMessage}`)
  }

  return lines.join('\n')
}

/**
 * Create distribution records from calculation
 * (Returns data ready to insert into Distribution table)
 */
export function createDistributionRecords(
  calc: DistributionCalculation,
  entityId: string,
  distributionDate: Date = new Date(),
  options: {
    paymentMethod?: 'CHECK' | 'ACH' | 'WIRE' | 'CASH' | 'OTHER'
    isShareDistribution?: boolean
    batchId?: string
  } = {}
): Array<{
  beneficiaryId: string
  entityId: string
  distributionDate: string
  amount: string
  distributionType: 'INCOME'
  paymentMethod: string
  isShareDistribution: boolean
  notes: string
}> {
  const {
    paymentMethod = 'CHECK',
    isShareDistribution = true,
    batchId,
  } = options

  return calc.beneficiaryShares
    .filter(share => share.amount > 0) // Only create records for non-zero amounts
    .map(share => ({
      beneficiaryId: share.beneficiaryId,
      entityId,
      distributionDate: distributionDate.toISOString(),
      amount: share.amount.toFixed(2),
      distributionType: 'INCOME' as const,
      paymentMethod,
      isShareDistribution,
      notes: batchId
        ? `Share distribution (${share.sharePercent}%) - Batch: ${batchId}`
        : `Share distribution (${share.sharePercent}%)`,
    }))
}
