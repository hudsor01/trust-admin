import { describe, expect, it } from 'bun:test'
import {
    updateArtworkSchema,
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
    updatePendingInventoryItemSchema,
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

// All 27 update schemas (26 + userProfile)
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
    updateArtworkSchema,
    updateHemsRequestSchema,
    updatePersonalPropertySchema,
    updateTrusteeFeeEntrySchema,
    updateTrusteeFeeScheduleSchema,
    updateValuationSchema,
    updateDocumentSchema,
    updateLiabilityPaymentSchema,
    updateInsurancePolicySchema,
    updatePendingInventoryItemSchema,
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

        it('updateUserProfileSchema accepts { role: "admin" }', () => {
            const result = updateUserProfileSchema.safeParse({ role: 'admin' })
            expect(result.success).toBe(true)
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
