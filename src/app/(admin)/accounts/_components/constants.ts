'use client'

export const BANK_ACCOUNT_TYPES = [
    { value: 'CHECKING', label: 'Checking' },
    { value: 'SAVINGS', label: 'Savings' },
    { value: 'CD', label: 'Certificate of Deposit' },
    { value: 'MONEY_MARKET', label: 'Money Market' },
    { value: 'BUSINESS_CHECKING', label: 'Business Checking' },
    { value: 'BUSINESS_SAVINGS', label: 'Business Savings' },
]

export const INVESTMENT_ACCOUNT_TYPES = [
    { value: 'BROKERAGE', label: 'Brokerage' },
    { value: 'IRA_TRADITIONAL', label: 'Traditional IRA' },
    { value: 'IRA_ROTH', label: 'Roth IRA' },
    { value: 'K401', label: '401(k)' },
    { value: 'ANNUITY', label: 'Annuity' },
    { value: 'HSA', label: 'HSA' },
    { value: 'FIVE29', label: '529 Plan' },
    { value: 'OTHER', label: 'Other' },
]

export const ACCOUNT_STATUS = [
    { value: 'OPEN', label: 'Open' },
    { value: 'CLOSED', label: 'Closed' },
    { value: 'FROZEN', label: 'Frozen' },
]

export function maskAccountNumber(num: string | null): string {
    if (!num) return '—'
    if (num.length <= 4) return num
    return `****${num.slice(-4)}`
}

export interface BankFormData {
    institution: string
    accountType: string
    accountName: string
    accountNumber: string
    routingNumber: string
    dodValue: string
    dodValueDate: string | null
    status: string
    transferStatus: string
    notes: string
}

export interface InvestmentFormData {
    institution: string
    accountType: string
    accountName: string
    accountNumber: string
    dodValue: string
    dodValueDate: string | null
    costBasis: string
    status: string
    transferStatus: string
    notes: string
}
