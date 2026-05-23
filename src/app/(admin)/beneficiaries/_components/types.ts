import type { Beneficiary } from '@/db/schema'
import { calculateAge } from '@/utils/formatters'

interface Distribution {
    id: number
    distributionDate: string
    amount: string
    paymentMethod: string
    hemsCategory: string | null
    hemsJustification: string | null
    isWithdrawal: boolean | null
    notes: string | null
    taxReported: boolean
    tax1099Issued: boolean
}

export interface BeneficiaryWithDistributions extends Beneficiary {
    distributions?: Distribution[]
}

export const WITHDRAWAL_AGE_50_PERCENT = 25
export const WITHDRAWAL_AGE_100_PERCENT = 30

export function calculateEligibility(
    dob: string | null,
    withdrawalAge1?: number | null,
    withdrawalAge2?: number | null,
): {
    percent: number
    status: 'none' | 'partial' | 'full'
    label: string
    nextMilestone?: { age: number; date: Date; percent: number }
} {
    const age50 = withdrawalAge1 ?? WITHDRAWAL_AGE_50_PERCENT
    const age100 = withdrawalAge2 ?? WITHDRAWAL_AGE_100_PERCENT

    if (!dob) {
        return { percent: 0, status: 'none', label: 'Set birthday' }
    }

    const age = calculateAge(dob)

    if (age >= age100) {
        return { percent: 100, status: 'full', label: '100% eligible' }
    }

    if (age >= age50) {
        const birthDate = new Date(dob)
        const fullEligibleDate = new Date(birthDate)
        fullEligibleDate.setFullYear(birthDate.getFullYear() + age100)
        return {
            percent: 50,
            status: 'partial',
            label: '50% eligible',
            nextMilestone: {
                age: age100,
                date: fullEligibleDate,
                percent: 100,
            },
        }
    }

    const birthDate = new Date(dob)
    const partialEligibleDate = new Date(birthDate)
    partialEligibleDate.setFullYear(birthDate.getFullYear() + age50)
    return {
        percent: 0,
        status: 'none',
        label: 'Not yet eligible',
        nextMilestone: {
            age: age50,
            date: partialEligibleDate,
            percent: 50,
        },
    }
}
