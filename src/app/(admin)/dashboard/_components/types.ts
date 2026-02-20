export interface WithdrawalStatus {
    status: string
    daysUntil: number
}

export interface WithdrawalRow {
    beneficiary: {
        id: number
        firstName: string | null
        lastName: string | null
        sharePercent: string | null
        relationshipType: string | null
        dob: string | null
    }
    currentAge: number | null
    age25: {
        eligibleDate: string
        status: WithdrawalStatus
        withdrawn: boolean
    } | null
    age30: {
        eligibleDate: string
        status: WithdrawalStatus
        withdrawn: boolean
    } | null
}
