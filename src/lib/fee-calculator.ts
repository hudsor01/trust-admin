/**
 * Trustee Fee Calculator
 *
 * Texas Property Code 114.061 - Reasonable Compensation
 *
 * Three fee components:
 * 1. Executor Fee (one-time): 5% of estate value for probate work
 * 2. Annual Asset Fee: 1.5% of trust assets under management
 * 3. Income Fee: 8% of gross income collected (property management)
 * 4. Hourly Fee: For extraordinary services at $125/hr default
 */

export interface FeeSchedule {
  executorFeePercent: number    // Default: 5.0%
  annualAssetPercent: number    // Default: 1.5%
  incomePercent: number         // Default: 8.0%
  hourlyRate: number            // Default: $125/hr
}

export interface FeeCalculationInput {
  schedule: FeeSchedule

  // For executor fee (one-time, probate)
  estateValue?: number

  // For annual asset fee
  trustAssetValue?: number
  periodMonths?: number         // How many months (for pro-rating annual fee)

  // For income fee
  grossIncome?: number

  // For hourly fee
  hoursWorked?: number
}

export interface FeeCalculationResult {
  executorFee: number
  assetFee: number
  incomeFee: number
  hourlyFee: number
  totalFee: number

  // Breakdowns for display
  breakdown: {
    executorFee: {
      basis: number
      rate: number
      amount: number
      description: string
    } | null
    assetFee: {
      basis: number
      rate: number
      months: number
      annualAmount: number
      amount: number
      description: string
    } | null
    incomeFee: {
      basis: number
      rate: number
      amount: number
      description: string
    } | null
    hourlyFee: {
      hours: number
      rate: number
      amount: number
      description: string
    } | null
  }
}

/**
 * Default fee schedule based on Texas standards
 */
export const DEFAULT_FEE_SCHEDULE: FeeSchedule = {
  executorFeePercent: 5.0,      // 5% executor fee
  annualAssetPercent: 1.5,      // 1.5% of assets annually
  incomePercent: 8.0,           // 8% of income (property management)
  hourlyRate: 125.00,           // $125/hr for extraordinary work
}

/**
 * Calculate trustee fees for a given period
 */
export function calculateTrusteeFees(input: FeeCalculationInput): FeeCalculationResult {
  const { schedule } = input

  // Executor fee (one-time, for probate)
  let executorFee = 0
  let executorBreakdown = null
  if (input.estateValue && input.estateValue > 0) {
    executorFee = input.estateValue * (schedule.executorFeePercent / 100)
    executorBreakdown = {
      basis: input.estateValue,
      rate: schedule.executorFeePercent,
      amount: executorFee,
      description: `${schedule.executorFeePercent}% of $${input.estateValue.toLocaleString()} estate value`,
    }
  }

  // Asset fee (annual, pro-rated if partial period)
  let assetFee = 0
  let assetBreakdown = null
  if (input.trustAssetValue && input.trustAssetValue > 0) {
    const months = input.periodMonths || 12
    const annualFee = input.trustAssetValue * (schedule.annualAssetPercent / 100)
    assetFee = annualFee * (months / 12)
    assetBreakdown = {
      basis: input.trustAssetValue,
      rate: schedule.annualAssetPercent,
      months,
      annualAmount: annualFee,
      amount: assetFee,
      description: `${schedule.annualAssetPercent}% of $${input.trustAssetValue.toLocaleString()} (${months} months)`,
    }
  }

  // Income fee (percentage of gross income collected)
  let incomeFee = 0
  let incomeBreakdown = null
  if (input.grossIncome && input.grossIncome > 0) {
    incomeFee = input.grossIncome * (schedule.incomePercent / 100)
    incomeBreakdown = {
      basis: input.grossIncome,
      rate: schedule.incomePercent,
      amount: incomeFee,
      description: `${schedule.incomePercent}% of $${input.grossIncome.toLocaleString()} gross income`,
    }
  }

  // Hourly fee (for extraordinary services)
  let hourlyFee = 0
  let hourlyBreakdown = null
  if (input.hoursWorked && input.hoursWorked > 0) {
    hourlyFee = input.hoursWorked * schedule.hourlyRate
    hourlyBreakdown = {
      hours: input.hoursWorked,
      rate: schedule.hourlyRate,
      amount: hourlyFee,
      description: `${input.hoursWorked} hours @ $${schedule.hourlyRate}/hr`,
    }
  }

  const totalFee = executorFee + assetFee + incomeFee + hourlyFee

  return {
    executorFee,
    assetFee,
    incomeFee,
    hourlyFee,
    totalFee,
    breakdown: {
      executorFee: executorBreakdown,
      assetFee: assetBreakdown,
      incomeFee: incomeBreakdown,
      hourlyFee: hourlyBreakdown,
    },
  }
}

/**
 * Calculate what trustee compensation would look like for Year 1
 * (includes executor fee for probate)
 */
export function calculateYear1Compensation(
  estateValue: number,
  trustAssetValue: number,
  annualRentalIncome: number,
  probateHours: number,
  schedule: FeeSchedule = DEFAULT_FEE_SCHEDULE
): FeeCalculationResult {
  return calculateTrusteeFees({
    schedule,
    estateValue,
    trustAssetValue,
    periodMonths: 12,
    grossIncome: annualRentalIncome,
    hoursWorked: probateHours,
  })
}

/**
 * Calculate ongoing annual trustee compensation
 * (no executor fee after year 1)
 */
export function calculateAnnualCompensation(
  trustAssetValue: number,
  annualRentalIncome: number,
  hoursWorked: number = 0,
  schedule: FeeSchedule = DEFAULT_FEE_SCHEDULE
): FeeCalculationResult {
  return calculateTrusteeFees({
    schedule,
    trustAssetValue,
    periodMonths: 12,
    grossIncome: annualRentalIncome,
    hoursWorked,
  })
}

/**
 * Format fee amount as currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

/**
 * Generate a fee summary for display
 */
export function generateFeeSummary(result: FeeCalculationResult): string {
  const lines: string[] = []

  if (result.breakdown.executorFee) {
    lines.push(`Executor Fee: ${formatCurrency(result.executorFee)}`)
    lines.push(`  ${result.breakdown.executorFee.description}`)
  }

  if (result.breakdown.assetFee) {
    lines.push(`Asset Management Fee: ${formatCurrency(result.assetFee)}`)
    lines.push(`  ${result.breakdown.assetFee.description}`)
  }

  if (result.breakdown.incomeFee) {
    lines.push(`Income/Property Management Fee: ${formatCurrency(result.incomeFee)}`)
    lines.push(`  ${result.breakdown.incomeFee.description}`)
  }

  if (result.breakdown.hourlyFee) {
    lines.push(`Extraordinary Services: ${formatCurrency(result.hourlyFee)}`)
    lines.push(`  ${result.breakdown.hourlyFee.description}`)
  }

  lines.push(``)
  lines.push(`TOTAL: ${formatCurrency(result.totalFee)}`)

  return lines.join('\n')
}
