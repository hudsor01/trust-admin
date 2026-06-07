'use client'

import {
    ALLOCATION_CLASS_VALUES,
    enumToOptions,
    NOTE_TYPE_VALUES,
    PAYMENT_METHOD_VALUES,
    RECEIVABLE_TYPE_VALUES,
    RECORD_STATUS_VALUES,
} from '@/lib/type-utils'

export const RECEIVABLE_TYPES = enumToOptions(RECEIVABLE_TYPE_VALUES)
export const NOTE_TYPES = enumToOptions(NOTE_TYPE_VALUES)
export const RECEIVABLE_STATUS = enumToOptions(RECORD_STATUS_VALUES, (v) =>
    [
        'ACTIVE',
        'PAST_DUE',
        'COLLECTIONS',
        'DISPUTED',
        'PAID_OFF',
        'WRITTEN_OFF',
        'CANCELLED',
    ].includes(v),
)
export const ALLOCATION_CLASS = enumToOptions(ALLOCATION_CLASS_VALUES)
export const PAYMENT_METHODS = enumToOptions(PAYMENT_METHOD_VALUES)

export interface ReceivableFormData {
    receivableType: string
    debtor: string
    debtorAddress: string
    noteType: string
    description: string
    originalPrincipal: string
    currentBalance: string
    currentBalanceDate: string | null
    dodValue: string
    dodValueDate: string | null
    interestRate: string
    monthlyPayment: string
    originationDate: string | null
    dueDate: string | null
    loanTermMonths: string
    secured: boolean
    collateralDescription: string
    status: string
    allocationClass: string
    collectionNotes: string
    notes: string
}

export interface PaymentFormData {
    paymentDate: string
    amount: string
    bankAccountId: string
    paymentMethod: string
    principalPortion: string
    interestPortion: string
    checkNumber: string
    confirmationNumber: string
    notes: string
}

export const defaultFormData = (): ReceivableFormData => ({
    receivableType: 'PROMISSORY_NOTE',
    debtor: '',
    debtorAddress: '',
    noteType: 'NON_NEGOTIABLE',
    description: '',
    originalPrincipal: '',
    currentBalance: '',
    currentBalanceDate: null,
    dodValue: '',
    dodValueDate: null,
    interestRate: '',
    monthlyPayment: '',
    originationDate: null,
    dueDate: null,
    loanTermMonths: '',
    secured: false,
    collateralDescription: '',
    status: 'ACTIVE',
    allocationClass: 'PRINCIPAL',
    collectionNotes: '',
    notes: '',
})

export const defaultPaymentForm = (): PaymentFormData => {
    const today = new Date().toISOString().split('T')[0]
    return {
        paymentDate: today ?? '',
        amount: '',
        bankAccountId: '',
        paymentMethod: 'CHECK',
        principalPortion: '',
        interestPortion: '',
        checkNumber: '',
        confirmationNumber: '',
        notes: '',
    }
}
