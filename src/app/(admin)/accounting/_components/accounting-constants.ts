export const INCOME_TYPES = [
    { value: 'DIVIDEND', label: 'Dividend' },
    { value: 'INTEREST', label: 'Interest' },
    { value: 'RENT', label: 'Rental Income' },
    { value: 'ROYALTY', label: 'Royalty' },
    { value: 'CAPITAL_GAIN', label: 'Capital Gain' },
    { value: 'SALE_PROCEEDS', label: 'Sale Proceeds' },
    { value: 'DISTRIBUTION', label: 'Distribution Received' },
    { value: 'OTHER', label: 'Other Income' },
]

export const EXPENSE_TYPES = [
    { value: 'TAX', label: 'Tax Payment' },
    { value: 'INSURANCE', label: 'Insurance' },
    { value: 'MAINTENANCE', label: 'Maintenance' },
    { value: 'REPAIR', label: 'Repair' },
    { value: 'PROFESSIONAL_FEE', label: 'Professional Fee' },
    { value: 'TRUSTEE_FEE', label: 'Trustee Fee' },
    { value: 'FILING_FEE', label: 'Filing Fee' },
    { value: 'UTILITY', label: 'Utility' },
    { value: 'OTHER', label: 'Other Expense' },
]

export interface AccountingFormData {
    accountingDate: string
    entryType: 'INCOME' | 'EXPENSE'
    incomeType: string
    expenseType: string
    amount: string
    description: string
    bankAccountId: string
    isPrincipal: boolean
    taxDeductible: boolean
    checkNumber: string
}
