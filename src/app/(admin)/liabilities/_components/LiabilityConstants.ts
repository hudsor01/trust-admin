'use client'

import {
    ALLOCATION_CLASS_VALUES,
    enumToOptions,
    LIABILITY_TYPE_VALUES,
    PAYMENT_METHOD_VALUES,
    RECORD_STATUS_VALUES,
} from '@/lib/type-utils'

// Derive options from schema enums (single source of truth)
export const LIABILITY_TYPES = enumToOptions(LIABILITY_TYPE_VALUES)
export const LIABILITY_STATUS = enumToOptions(RECORD_STATUS_VALUES, (v) =>
    [
        'ACTIVE',
        'PAST_DUE',
        'COLLECTIONS',
        'PAID_OFF',
        'DISPUTED',
        'WRITTEN_OFF',
    ].includes(v),
)
export const ALLOCATION_CLASS = enumToOptions(ALLOCATION_CLASS_VALUES)
export const PAYMENT_METHODS = enumToOptions(PAYMENT_METHOD_VALUES)

export interface LiabilityFormData {
    liabilityType: string
    creditor: string
    description: string
    originalAmount: string
    currentBalance: string
    currentBalanceDate: string | null
    interestRate: string
    monthlyPayment: string
    dueDate: string | null
    paymentDueDay: string
    // Loan term fields (for amortization)
    loanTermMonths: string
    loanStartDate: string | null
    escrowMonthly: string
    status: string
    notes: string
}

export interface PaymentFormData {
    paymentDate: string
    amount: string
    bankAccountId: string
    paymentMethod: string
    checkNumber: string
    confirmationNumber: string
    allocationClass: string
    notes: string
}

// Revolving credit types do not have fixed terms
export const isRevolvingType = (type: string) => type === 'CREDIT_CARD'

// Loan types have amortization-specific fields
export const hasLoanTermFields = (type: string) =>
    type === 'MORTGAGE' || type === 'LOAN'

export const defaultFormData = (): LiabilityFormData => ({
    liabilityType: 'MORTGAGE',
    creditor: '',
    description: '',
    originalAmount: '',
    currentBalance: '',
    currentBalanceDate: null,
    interestRate: '',
    monthlyPayment: '',
    dueDate: null,
    paymentDueDay: '',
    loanTermMonths: '',
    loanStartDate: null,
    escrowMonthly: '',
    status: 'ACTIVE',
    notes: '',
})

export const defaultPaymentForm = (): PaymentFormData => {
    const today = new Date().toISOString().split('T')[0]
    return {
        paymentDate: today ?? '',
        amount: '',
        bankAccountId: '',
        paymentMethod: 'CHECK',
        checkNumber: '',
        confirmationNumber: '',
        allocationClass: 'PRINCIPAL',
        notes: '',
    }
}
