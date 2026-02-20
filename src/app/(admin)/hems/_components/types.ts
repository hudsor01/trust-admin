export interface HemsFormData {
    beneficiaryId: string
    amount: string
    hemsCategory: string
    hemsJustification: string
    paymentMethod: string
    notes: string
}

export interface WithdrawalFormData {
    amount: string
    paymentMethod: string
    notes: string
}
