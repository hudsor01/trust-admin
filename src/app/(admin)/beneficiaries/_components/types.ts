import type { Beneficiary } from '@/db/schema'
import { calculateAge } from '@/utils/formatters'

export interface Distribution {
    id: number
    distributionDate: string
    amount: string
    paymentMethod: string
    hemsCategory: string | null
    hemsJustification: string | null
    isWithdrawal: boolean | null
    notes: string | null
}

export interface BeneficiaryWithDistributions extends Beneficiary {
    distributions?: Distribution[]
}

export const WITHDRAWAL_AGE_50_PERCENT = 25
export const WITHDRAWAL_AGE_100_PERCENT = 30

export function calculateEligibility(dob: string | null): {
    percent: number
    status: 'none' | 'partial' | 'full'
    label: string
    nextMilestone?: { age: number; date: Date; percent: number }
} {
    if (!dob) {
        return { percent: 0, status: 'none', label: 'Set birthday' }
    }

    const age = calculateAge(dob)

    if (age >= WITHDRAWAL_AGE_100_PERCENT) {
        return { percent: 100, status: 'full', label: '100% eligible' }
    }

    if (age >= WITHDRAWAL_AGE_50_PERCENT) {
        const birthDate = new Date(dob)
        const fullEligibleDate = new Date(birthDate)
        fullEligibleDate.setFullYear(
            birthDate.getFullYear() + WITHDRAWAL_AGE_100_PERCENT,
        )
        return {
            percent: 50,
            status: 'partial',
            label: '50% eligible',
            nextMilestone: {
                age: WITHDRAWAL_AGE_100_PERCENT,
                date: fullEligibleDate,
                percent: 100,
            },
        }
    }

    const birthDate = new Date(dob)
    const partialEligibleDate = new Date(birthDate)
    partialEligibleDate.setFullYear(
        birthDate.getFullYear() + WITHDRAWAL_AGE_50_PERCENT,
    )
    return {
        percent: 0,
        status: 'none',
        label: 'Not yet eligible',
        nextMilestone: {
            age: WITHDRAWAL_AGE_50_PERCENT,
            date: partialEligibleDate,
            percent: 50,
        },
    }
}
