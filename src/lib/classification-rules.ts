/**
 * Principal/Income classification per Texas Property Code 116 (UPIA).
 * PRINCIPAL = trust corpus (assets, capital); INCOME = earnings from principal.
 */

import type { AllocationClass } from '@/lib/type-utils'

export type { AllocationClass }

export type IncomeType =
    | 'DIVIDEND'
    | 'INTEREST'
    | 'RENT'
    | 'ROYALTY'
    | 'CAPITAL_GAIN'
    | 'SALE_PROCEEDS'
    | 'DISTRIBUTION'
    | 'OTHER'

export type ExpenseType =
    | 'TAX'
    | 'INSURANCE'
    | 'MAINTENANCE'
    | 'REPAIR'
    | 'PROFESSIONAL_FEE'
    | 'TRUSTEE_FEE'
    | 'FILING_FEE'
    | 'UTILITY'
    | 'OTHER'

/** Texas Property Code 116 income classification */
const INCOME_TYPE_RULES: Record<IncomeType, AllocationClass> = {
    // Regular earnings from assets -> INCOME
    DIVIDEND: 'INCOME',
    INTEREST: 'INCOME',
    RENT: 'INCOME',
    ROYALTY: 'INCOME',

    // Capital transactions -> PRINCIPAL
    CAPITAL_GAIN: 'PRINCIPAL',
    SALE_PROCEEDS: 'PRINCIPAL',
    DISTRIBUTION: 'PRINCIPAL', // Pass-through from another entity
    OTHER: 'PRINCIPAL', // Conservative default
}

const EXPENSE_TYPE_RULES: Record<ExpenseType, AllocationClass> = {
    // Ordinary expenses charged to INCOME
    TAX: 'INCOME',
    INSURANCE: 'INCOME',
    MAINTENANCE: 'INCOME',
    REPAIR: 'INCOME',
    UTILITY: 'INCOME',

    // Texas 116.204 allows 50/50 split for admin fees; simplified to INCOME here
    PROFESSIONAL_FEE: 'INCOME',
    TRUSTEE_FEE: 'INCOME',
    FILING_FEE: 'INCOME',
    OTHER: 'INCOME',
}

/** Special-case overrides (highest priority in classification) */
const SPECIAL_RULES: Record<string, AllocationClass> = {
    CAPITAL_IMPROVEMENT: 'PRINCIPAL', // Increases corpus value
    INSURANCE_PROCEEDS: 'PRINCIPAL', // Replaces destroyed asset
    CONDEMNATION_PROCEEDS: 'PRINCIPAL', // Eminent domain
    STOCK_SPLIT: 'PRINCIPAL', // No new income created
    RETURN_OF_CAPITAL: 'PRINCIPAL',
}

/** Classify a transaction as PRINCIPAL or INCOME per Texas Property Code 116. */
export function classifyTransaction(
    incomeType?: IncomeType | null,
    expenseType?: ExpenseType | null,
    category?: string | null,
): AllocationClass {
    // Special rules take highest priority
    if (category) {
        const specialRule = SPECIAL_RULES[category.toUpperCase()]
        if (specialRule) {
            return specialRule
        }
    }

    if (incomeType && INCOME_TYPE_RULES[incomeType]) {
        return INCOME_TYPE_RULES[incomeType]
    }

    if (expenseType && EXPENSE_TYPE_RULES[expenseType]) {
        return EXPENSE_TYPE_RULES[expenseType]
    }

    // Conservative default: unclassified transactions go to principal
    return 'PRINCIPAL'
}

/** Boolean wrapper for the DB `isPrincipal` field. */
export function isPrincipalTransaction(
    incomeType?: IncomeType | null,
    expenseType?: ExpenseType | null,
    category?: string | null,
): boolean {
    return (
        classifyTransaction(incomeType, expenseType, category) === 'PRINCIPAL'
    )
}

/** Human-readable explanation of why a transaction was classified this way. */
export function getClassificationReason(
    incomeType?: IncomeType | null,
    expenseType?: ExpenseType | null,
    category?: string | null,
): string {
    const classification = classifyTransaction(
        incomeType,
        expenseType,
        category,
    )

    if (category && SPECIAL_RULES[category.toUpperCase()]) {
        return `${category} is classified as ${classification} per Texas Property Code 116`
    }

    if (incomeType) {
        if (classification === 'INCOME') {
            return `${incomeType} is regular earnings from trust assets (Income)`
        } else {
            return `${incomeType} affects trust corpus/capital (Principal)`
        }
    }

    if (expenseType) {
        if (classification === 'INCOME') {
            return `${expenseType} is an ordinary expense charged to Income`
        } else {
            return `${expenseType} is a capital expense charged to Principal`
        }
    }

    return `Classified as ${classification} by default`
}

/** Income types with classifications for UI dropdowns. */
export function getIncomeTypeOptions(): Array<{
    value: IncomeType
    label: string
    classification: AllocationClass
}> {
    return [
        { value: 'RENT', label: 'Rent', classification: 'INCOME' },
        { value: 'DIVIDEND', label: 'Dividend', classification: 'INCOME' },
        { value: 'INTEREST', label: 'Interest', classification: 'INCOME' },
        { value: 'ROYALTY', label: 'Royalty', classification: 'INCOME' },
        {
            value: 'CAPITAL_GAIN',
            label: 'Capital Gain',
            classification: 'PRINCIPAL',
        },
        {
            value: 'SALE_PROCEEDS',
            label: 'Sale Proceeds',
            classification: 'PRINCIPAL',
        },
        {
            value: 'DISTRIBUTION',
            label: 'Distribution (from entity)',
            classification: 'PRINCIPAL',
        },
        { value: 'OTHER', label: 'Other', classification: 'PRINCIPAL' },
    ]
}

/** Expense types with classifications for UI dropdowns. */
export function getExpenseTypeOptions(): Array<{
    value: ExpenseType
    label: string
    classification: AllocationClass
}> {
    return [
        { value: 'TAX', label: 'Taxes', classification: 'INCOME' },
        { value: 'INSURANCE', label: 'Insurance', classification: 'INCOME' },
        {
            value: 'MAINTENANCE',
            label: 'Maintenance',
            classification: 'INCOME',
        },
        { value: 'REPAIR', label: 'Repairs', classification: 'INCOME' },
        { value: 'UTILITY', label: 'Utilities', classification: 'INCOME' },
        {
            value: 'PROFESSIONAL_FEE',
            label: 'Professional Fees',
            classification: 'INCOME',
        },
        {
            value: 'TRUSTEE_FEE',
            label: 'Trustee Fee',
            classification: 'INCOME',
        },
        { value: 'FILING_FEE', label: 'Filing Fees', classification: 'INCOME' },
        { value: 'OTHER', label: 'Other', classification: 'INCOME' },
    ]
}
