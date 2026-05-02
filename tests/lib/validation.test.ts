import { describe, expect, it } from 'bun:test'
import {
    updateBankAccountSchema,
    updateBeneficiarySchema,
    updateContactSchema,
    updateDistributionSchema,
    updateDocumentSchema,
    updateEntitySchema,
    updateHemsRequestSchema,
    updateHomesteadSchema,
    updateInsurancePolicySchema,
    updateInvestmentAccountSchema,
    updateLiabilityPaymentSchema,
    updateLiabilitySchema,
    updatePersonalPropertySchema,
    updateRentalPropertySchema,
    updateSpecificBequestSchema,
    updateTaskSchema,
    updateTrustAccountingSchema,
    updateTrusteeFeeEntrySchema,
    updateTrusteeFeeScheduleSchema,
    updateTrusteeSchema,
    updateUserProfileSchema,
    updateValuationSchema,
    updateVehicleSchema,
    updateWithdrawalRecordSchema,
} from '@/db/validation'

const allUpdateSchemas = {
    updateTrusteeSchema,
    updateVehicleSchema,
    updateWithdrawalRecordSchema,
    updateContactSchema,
    updateBeneficiarySchema,
    updateEntitySchema,
    updateHomesteadSchema,
    updateRentalPropertySchema,
    updateBankAccountSchema,
    updateInvestmentAccountSchema,
    updateLiabilitySchema,
    updateSpecificBequestSchema,
    updateDistributionSchema,
    updateTaskSchema,
    updateTrustAccountingSchema,
    updateHemsRequestSchema,
    updatePersonalPropertySchema,
    updateTrusteeFeeEntrySchema,
    updateTrusteeFeeScheduleSchema,
    updateValuationSchema,
    updateDocumentSchema,
    updateLiabilityPaymentSchema,
    updateInsurancePolicySchema,
    updateUserProfileSchema,
} as const

describe('Update schema non-empty validation', () => {
    describe('rejects empty objects', () => {
        for (const [name, schema] of Object.entries(allUpdateSchemas)) {
            it(`${name} rejects empty object {}`, () => {
                const result = schema.safeParse({})
                expect(result.success).toBe(false)
                if (!result.success) {
                    const messages = result.error.issues.map((i) => i.message)
                    expect(
                        messages.some((m) => m.includes('at least one field')),
                    ).toBe(true)
                }
            })
        }
    })

    describe('accepts valid single-field updates', () => {
        it('updateEntitySchema accepts { name: "Test" }', () => {
            const result = updateEntitySchema.safeParse({ name: 'Test' })
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.name).toBe('Test')
            }
        })

        it('updateBeneficiarySchema accepts { firstName: "John" }', () => {
            const result = updateBeneficiarySchema.safeParse({
                firstName: 'John',
            })
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.firstName).toBe('John')
            }
        })

        it.each([
            'admin',
            'trustee',
            'arbiter',
            'beneficiary',
        ])('updateUserProfileSchema accepts { role: %p }', (role) => {
            const result = updateUserProfileSchema.safeParse({ role })
            expect(result.success).toBe(true)
        })

        it('updateUserProfileSchema rejects unknown roles', () => {
            const result = updateUserProfileSchema.safeParse({ role: 'owner' })
            expect(result.success).toBe(false)
        })
    })

    describe('edge cases', () => {
        it('rejects object with all undefined values', () => {
            const result = updateEntitySchema.safeParse({ name: undefined })
            expect(result.success).toBe(false)
            if (!result.success) {
                const messages = result.error.issues.map((i) => i.message)
                expect(
                    messages.some((m) => m.includes('at least one field')),
                ).toBe(true)
            }
        })
    })
})
