/**
 * Withdrawal Eligibility Tracker
 *
 * Tracks when grandchildren become eligible to withdraw
 * their share of the trust principal.
 *
 * Hudson Living Trust rules:
 * - Grandchildren can withdraw 50% at age 25
 * - Remaining 50% at age 30
 * - Adults (children of settlor) have no withdrawal rights
 */

export interface BeneficiaryWithdrawalInfo {
    id: string
    firstName: string
    lastName: string
    dob: Date | string | null

    // Withdrawal rules from trust
    withdrawalAge1: number | null // e.g., 25
    withdrawalPct1: number | null // e.g., 50
    withdrawalAge2: number | null // e.g., 30
    withdrawalPct2: number | null // e.g., 50

    // Track what's been withdrawn
    withdrawnAtAge1?: number
    withdrawnAtAge2?: number
}

export interface WithdrawalEligibility {
    beneficiaryId: string
    name: string
    dob: Date | null
    hasWithdrawalRights: boolean

    // Age 25 (or first withdrawal age)
    age1: {
        targetAge: number
        targetDate: Date | null
        isEligible: boolean
        daysUntilEligible: number | null
        percentAvailable: number
        amountAvailable: number
        amountWithdrawn: number
        amountRemaining: number
    } | null

    // Age 30 (or second withdrawal age)
    age2: {
        targetAge: number
        targetDate: Date | null
        isEligible: boolean
        daysUntilEligible: number | null
        percentAvailable: number
        amountAvailable: number
        amountWithdrawn: number
        amountRemaining: number
    } | null

    // Totals
    totalEligibleNow: number
    totalWithdrawn: number
    totalRemaining: number

    // For alerts
    upcomingEligibility: {
        date: Date
        age: number
        amount: number
        daysUntil: number
    } | null
}

/**
 * Calculate age in years from date of birth
 */
function _calculateAge(dob: Date, asOfDate: Date = new Date()): number {
    const birthDate = new Date(dob)
    let age = asOfDate.getFullYear() - birthDate.getFullYear()
    const monthDiff = asOfDate.getMonth() - birthDate.getMonth()

    if (
        monthDiff < 0 ||
        (monthDiff === 0 && asOfDate.getDate() < birthDate.getDate())
    ) {
        age--
    }

    return age
}

/**
 * Calculate date when someone reaches a specific age
 * Returns the exact birthday date in the year they turn the target age,
 * handling leap year edge cases properly
 */
function dateAtAge(dob: Date, age: number): Date {
    const targetYear = dob.getFullYear() + age
    const targetMonth = dob.getMonth()
    const targetDay = dob.getDate()

    // Handle February 29 in non-leap years
    if (targetMonth === 1 && targetDay === 29) {
        // February 29
        const isLeapYear =
            (targetYear % 4 === 0 && targetYear % 100 !== 0) ||
            targetYear % 400 === 0
        if (!isLeapYear) {
            // February 29 in non-leap year - use February 28
            return new Date(targetYear, 1, 28)
        }
    }

    return new Date(targetYear, targetMonth, targetDay)
}

/**
 * Calculate days between two dates
 */
function daysBetween(date1: Date, date2: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000
    return Math.ceil((date2.getTime() - date1.getTime()) / msPerDay)
}

/**
 * Calculate withdrawal eligibility for a beneficiary
 */
export function calculateWithdrawalEligibility(
    beneficiary: BeneficiaryWithdrawalInfo,
    trustShareValue: number, // Their share of trust value
    asOfDate: Date = new Date(),
): WithdrawalEligibility {
    const name = `${beneficiary.firstName} ${beneficiary.lastName}`
    const dob = beneficiary.dob ? new Date(beneficiary.dob) : null

    // No withdrawal rights if no ages defined
    const hasWithdrawalRights = !!(
        beneficiary.withdrawalAge1 && beneficiary.withdrawalPct1
    )

    if (!hasWithdrawalRights || !dob) {
        return {
            beneficiaryId: beneficiary.id,
            name,
            dob,
            hasWithdrawalRights: false,
            age1: null,
            age2: null,
            totalEligibleNow: 0,
            totalWithdrawn: 0,
            totalRemaining: 0,
            upcomingEligibility: null,
        }
    }

    // Calculate age 1 eligibility
    const age1 = beneficiary.withdrawalAge1!
    const pct1 = beneficiary.withdrawalPct1!
    const date1 = dateAtAge(dob, age1)
    const isEligible1 = asOfDate >= date1
    const daysUntil1 = isEligible1 ? null : daysBetween(asOfDate, date1)
    const amount1 = trustShareValue * (pct1 / 100)
    const withdrawn1 = beneficiary.withdrawnAtAge1 || 0
    const remaining1 = isEligible1 ? Math.max(0, amount1 - withdrawn1) : 0

    // Calculate age 2 eligibility (if defined)
    let age2Result = null
    if (beneficiary.withdrawalAge2 && beneficiary.withdrawalPct2) {
        const age2 = beneficiary.withdrawalAge2
        const pct2 = beneficiary.withdrawalPct2
        const date2 = dateAtAge(dob, age2)
        const isEligible2 = asOfDate >= date2
        const daysUntil2 = isEligible2 ? null : daysBetween(asOfDate, date2)
        const amount2 = trustShareValue * (pct2 / 100)
        const withdrawn2 = beneficiary.withdrawnAtAge2 || 0
        const remaining2 = isEligible2 ? Math.max(0, amount2 - withdrawn2) : 0

        age2Result = {
            targetAge: age2,
            targetDate: date2,
            isEligible: isEligible2,
            daysUntilEligible: daysUntil2,
            percentAvailable: pct2,
            amountAvailable: amount2,
            amountWithdrawn: withdrawn2,
            amountRemaining: remaining2,
        }
    }

    // Calculate totals
    const totalEligibleNow = remaining1 + (age2Result?.amountRemaining || 0)
    const totalWithdrawn = withdrawn1 + (age2Result?.amountWithdrawn || 0)
    const totalRemaining = totalEligibleNow

    // Determine upcoming eligibility (next milestone)
    let upcomingEligibility = null
    if (!isEligible1) {
        upcomingEligibility = {
            date: date1,
            age: age1,
            amount: amount1,
            daysUntil: daysUntil1!,
        }
    } else if (age2Result && !age2Result.isEligible) {
        upcomingEligibility = {
            date: age2Result.targetDate!,
            age: age2Result.targetAge,
            amount: age2Result.amountAvailable,
            daysUntil: age2Result.daysUntilEligible!,
        }
    }

    return {
        beneficiaryId: beneficiary.id,
        name,
        dob,
        hasWithdrawalRights: true,
        age1: {
            targetAge: age1,
            targetDate: date1,
            isEligible: isEligible1,
            daysUntilEligible: daysUntil1,
            percentAvailable: pct1,
            amountAvailable: amount1,
            amountWithdrawn: withdrawn1,
            amountRemaining: remaining1,
        },
        age2: age2Result,
        totalEligibleNow,
        totalWithdrawn,
        totalRemaining,
        upcomingEligibility,
    }
}

/**
 * Calculate eligibility for all beneficiaries
 */
export function calculateAllWithdrawalEligibility(
    beneficiaries: BeneficiaryWithdrawalInfo[],
    trustTotalValue: number,
    asOfDate: Date = new Date(),
): WithdrawalEligibility[] {
    return beneficiaries.map((b) => {
        // Calculate this beneficiary's share of trust value
        // Assuming sharePercent is stored elsewhere, we'll need it passed in
        // For now, we'll use a placeholder - in real usage, pass the share value directly
        const shareValue = trustTotalValue // This should be beneficiary's specific share

        return calculateWithdrawalEligibility(b, shareValue, asOfDate)
    })
}

/**
 * Get beneficiaries with upcoming eligibility (for alerts)
 */
export function getUpcomingEligibilities(
    eligibilities: WithdrawalEligibility[],
    withinDays: number = 30,
): WithdrawalEligibility[] {
    return eligibilities.filter(
        (e) =>
            e.upcomingEligibility &&
            e.upcomingEligibility.daysUntil <= withinDays &&
            e.upcomingEligibility.daysUntil > 0,
    )
}

/**
 * Get beneficiaries currently eligible to withdraw
 */
export function getCurrentlyEligible(
    eligibilities: WithdrawalEligibility[],
): WithdrawalEligibility[] {
    return eligibilities.filter((e) => e.totalEligibleNow > 0)
}

/**
 * Format eligibility for display
 */
export function formatEligibility(e: WithdrawalEligibility): string {
    if (!e.hasWithdrawalRights) {
        return `${e.name}: No withdrawal rights (HEMS only)`
    }

    const lines: string[] = [e.name]

    if (e.age1) {
        if (e.age1.isEligible) {
            lines.push(`  Age ${e.age1.targetAge}: ELIGIBLE`)
            lines.push(
                `    Available: $${e.age1.amountRemaining.toLocaleString()} of $${e.age1.amountAvailable.toLocaleString()}`,
            )
            if (e.age1.amountWithdrawn > 0) {
                lines.push(
                    `    Already withdrawn: $${e.age1.amountWithdrawn.toLocaleString()}`,
                )
            }
        } else {
            lines.push(
                `  Age ${e.age1.targetAge}: ${e.age1.daysUntilEligible} days until eligible`,
            )
            lines.push(
                `    Will be able to withdraw: $${e.age1.amountAvailable.toLocaleString()}`,
            )
        }
    }

    if (e.age2) {
        if (e.age2.isEligible) {
            lines.push(`  Age ${e.age2.targetAge}: ELIGIBLE`)
            lines.push(
                `    Available: $${e.age2.amountRemaining.toLocaleString()} of $${e.age2.amountAvailable.toLocaleString()}`,
            )
            if (e.age2.amountWithdrawn > 0) {
                lines.push(
                    `    Already withdrawn: $${e.age2.amountWithdrawn.toLocaleString()}`,
                )
            }
        } else {
            lines.push(
                `  Age ${e.age2.targetAge}: ${e.age2.daysUntilEligible} days until eligible`,
            )
            lines.push(
                `    Will be able to withdraw: $${e.age2.amountAvailable.toLocaleString()}`,
            )
        }
    }

    if (e.totalEligibleNow > 0) {
        lines.push(
            `  TOTAL AVAILABLE NOW: $${e.totalEligibleNow.toLocaleString()}`,
        )
    }

    return lines.join('\n')
}

/**
 * Create withdrawal record data for database
 */
export function createWithdrawalRecord(
    beneficiaryId: string,
    entityId: string,
    withdrawalType: 'AGE_25' | 'AGE_30',
    eligibleDate: Date,
    eligibleAmount: number,
): {
    beneficiaryId: string
    entityId: string
    withdrawalType: string
    eligibleDate: string
    eligibleAmount: string
    withdrawnAmount: string
    remainingAmount: string
    status: 'ELIGIBLE' | 'NOT_YET_ELIGIBLE'
} {
    const now = new Date()
    const isEligible = now >= eligibleDate

    return {
        beneficiaryId,
        entityId,
        withdrawalType,
        eligibleDate: eligibleDate.toISOString(),
        eligibleAmount: eligibleAmount.toFixed(2),
        withdrawnAmount: '0',
        remainingAmount: eligibleAmount.toFixed(2),
        status: isEligible ? 'ELIGIBLE' : 'NOT_YET_ELIGIBLE',
    }
}
