import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'
import {
    activityLog,
    artwork,
    bankAccount,
    beneficiary,
    contact,
    contactAssociation,
    distribution,
    document,
    entity,
    hemsRequest,
    homestead,
    insurancePolicy,
    investmentAccount,
    liability,
    liabilityPayment,
    pendingInventoryItem,
    personalProperty,
    rentalProperty,
    specificBequest,
    task,
    transaction,
    trustAccounting,
    trustee,
    trusteeFeeEntry,
    trusteeFeeSchedule,
    userProfile,
    valuation,
    vehicle,
    withdrawalRecord,
} from './schema'

// ============================================
// Reusable Validation Helpers
// ============================================

const emailValidation = z
    .string()
    .email('Invalid email format')
    .nullable()
    .optional()

const phoneValidation = z
    .string()
    .regex(/^[\d\s\-().]+$/, 'Invalid phone number format')
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number is too long')
    .nullable()
    .optional()

/**
 * VULN-009 FIX: Improved numeric validation
 * - Checks for NaN and Infinity
 * - Enforces maximum value bounds
 * - Prevents scientific notation bypass
 */
const MAX_CURRENCY_VALUE = 999_999_999_999.99 // ~1 trillion

const positiveNumberValidation = z
    .string()
    .refine((val) => {
        if (!val) return true // null/empty is ok (optional field)
        const num = parseFloat(val)
        return (
            !Number.isNaN(num) &&
            Number.isFinite(num) &&
            num >= 0 &&
            num <= MAX_CURRENCY_VALUE
        )
    }, `Must be a valid positive number (max ${MAX_CURRENCY_VALUE.toLocaleString()})`)
    .refine((val) => {
        if (!val) return true
        // Enforce max 2 decimal places to match DB numeric(12,2)
        return !/\.\d{3,}/.test(val)
    }, 'Must have at most 2 decimal places')
    .nullable()
    .optional()

const percentageValidation = z
    .string()
    .refine(
        (val) => !val || (parseFloat(val) >= 0 && parseFloat(val) <= 100),
        'Must be between 0 and 100',
    )
    .nullable()
    .optional()

const vinValidation = z
    .string()
    .length(17, 'VIN must be exactly 17 characters')
    .regex(/^[A-HJ-NPR-Z0-9]{17}$/, 'Invalid VIN format')

const zipValidation = z
    .string()
    .regex(/^\d{5}$/, 'ZIP code must be exactly 5 digits')
    .nullable()
    .optional()

const requiredZipValidation = z
    .string()
    .regex(/^\d{5}$/, 'ZIP code must be exactly 5 digits')

// City: letters, spaces, hyphens, apostrophes, periods (handles "Fort Worth", "St. Paul", "O'Brien")
const cityValidation = z
    .string()
    .min(2, 'City must be at least 2 characters')
    .regex(/^[A-Za-z\s'.-]+$/, 'City must contain only letters')
    .nullable()
    .optional()

// State: exactly 2 uppercase letters (US state abbreviation)
const stateValidation = z
    .string()
    .regex(/^[A-Z]{2}$/, 'State must be 2 uppercase letters (e.g. TX)')
    .nullable()
    .optional()

// Street address: letters, numbers, spaces, and common address characters (#, ., -)
const streetAddressValidation = z
    .string()
    .min(5, 'Street address must be at least 5 characters')
    .regex(
        /^[A-Za-z0-9\s#.',-]+$/,
        'Street address must contain only letters, numbers, and common punctuation',
    )
    .nullable()
    .optional()

export const insertActivityLogSchema = createInsertSchema(activityLog, {
    createdAt: (schema) => schema.optional(),
})
export const selectActivityLogSchema = createSelectSchema(activityLog)

export const insertArtworkSchema = createInsertSchema(artwork, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
})
export const selectArtworkSchema = createSelectSchema(artwork)

export const insertBankAccountSchema = createInsertSchema(bankAccount, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
})
export const selectBankAccountSchema = createSelectSchema(bankAccount)

export const insertBeneficiarySchema = createInsertSchema(beneficiary, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
    email: () => emailValidation,
    phone: () => phoneValidation,
    zip: () => zipValidation,
    city: () => cityValidation,
    state: () => stateValidation,
    streetAddress: () => streetAddressValidation,
    sharePercent: () => percentageValidation,
})
export const selectBeneficiarySchema = createSelectSchema(beneficiary)

export const insertContactSchema = createInsertSchema(contact, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
    email: () => emailValidation,
    phone: () => phoneValidation,
    zip: () => zipValidation,
})
export const selectContactSchema = createSelectSchema(contact)

export const insertContactAssociationSchema = createInsertSchema(
    contactAssociation,
    {
        createdAt: (schema) => schema.optional(),
    },
)
export const selectContactAssociationSchema =
    createSelectSchema(contactAssociation)

export const insertDistributionSchema = createInsertSchema(distribution, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
    amount: (schema) =>
        schema.refine(
            (val) => parseFloat(val) > 0,
            'Distribution amount must be positive',
        ),
})
export const selectDistributionSchema = createSelectSchema(distribution)

export const insertDocumentSchema = createInsertSchema(document, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
})
export const selectDocumentSchema = createSelectSchema(document)

export const insertEntitySchema = createInsertSchema(entity, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
    dod: (schema) =>
        schema
            .refine(
                (val) => !val || new Date(val) <= new Date(),
                'Date of death cannot be in the future',
            )
            .optional(),
})
export const selectEntitySchema = createSelectSchema(entity)

export const insertHemsRequestSchema = createInsertSchema(hemsRequest, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
})
export const selectHemsRequestSchema = createSelectSchema(hemsRequest)

export const insertHomesteadSchema = createInsertSchema(homestead, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
    zip: () => requiredZipValidation,
    acquisitionCost: () => positiveNumberValidation,
    dodValue: () => positiveNumberValidation,
})
export const selectHomesteadSchema = createSelectSchema(homestead)

export const insertInsurancePolicySchema = createInsertSchema(insurancePolicy, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
})
export const selectInsurancePolicySchema = createSelectSchema(insurancePolicy)

export const insertInvestmentAccountSchema = createInsertSchema(
    investmentAccount,
    {
        createdAt: (schema) => schema.optional(),
        updatedAt: (schema) => schema.optional(),
    },
)
export const selectInvestmentAccountSchema =
    createSelectSchema(investmentAccount)

export const insertLiabilitySchema = createInsertSchema(liability, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
    originalAmount: (schema) =>
        schema.refine(
            (val) => parseFloat(val) > 0,
            'Original amount must be positive',
        ),
    currentBalance: (schema) =>
        schema.refine(
            (val) => parseFloat(val) >= 0,
            'Current balance must be non-negative',
        ),
    monthlyPayment: () => positiveNumberValidation,
    loanTermMonths: (schema) =>
        schema
            .refine(
                (val) => val === null || val === undefined || val > 0,
                'Loan term must be positive',
            )
            .nullable()
            .optional(),
    escrowMonthly: () => positiveNumberValidation,
})
export const selectLiabilitySchema = createSelectSchema(liability)

export const insertLiabilityPaymentSchema = createInsertSchema(
    liabilityPayment,
    {
        createdAt: (schema) => schema.optional(),
    },
)
export const selectLiabilityPaymentSchema = createSelectSchema(liabilityPayment)

export const insertPersonalPropertySchema = createInsertSchema(
    personalProperty,
    {
        createdAt: (schema) => schema.optional(),
        updatedAt: (schema) => schema.optional(),
    },
)
export const selectPersonalPropertySchema = createSelectSchema(personalProperty)

export const insertPendingInventoryItemSchema = createInsertSchema(
    pendingInventoryItem,
    {
        createdAt: (schema) => schema.optional(),
        updatedAt: (schema) => schema.optional(),
        estimatedValue: () => positiveNumberValidation,
        submitterEmail: () => emailValidation,
        submitterPhone: () => phoneValidation,
    },
)
export const selectPendingInventoryItemSchema =
    createSelectSchema(pendingInventoryItem)

export const insertRentalPropertySchema = createInsertSchema(rentalProperty, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
    zip: () => requiredZipValidation,
    acquisitionCost: () => positiveNumberValidation,
    dodValue: () => positiveNumberValidation,
    monthlyRent: () => positiveNumberValidation,
    mortgageBalance: () => positiveNumberValidation,
})
export const selectRentalPropertySchema = createSelectSchema(rentalProperty)

export const insertSpecificBequestSchema = createInsertSchema(specificBequest, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
})
export const selectSpecificBequestSchema = createSelectSchema(specificBequest)

export const insertTaskSchema = createInsertSchema(task, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
})
export const selectTaskSchema = createSelectSchema(task)

export const insertTransactionSchema = createInsertSchema(transaction, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
})
export const selectTransactionSchema = createSelectSchema(transaction)

export const insertTrustAccountingSchema = createInsertSchema(trustAccounting, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
    amount: (schema) =>
        schema.refine(
            (val) => parseFloat(val) > 0,
            'Amount must be greater than zero',
        ),
})
export const selectTrustAccountingSchema = createSelectSchema(trustAccounting)

export const insertTrusteeSchema = createInsertSchema(trustee, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
})
export const selectTrusteeSchema = createSelectSchema(trustee)

export const insertTrusteeFeeEntrySchema = createInsertSchema(trusteeFeeEntry, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
})
export const selectTrusteeFeeEntrySchema = createSelectSchema(trusteeFeeEntry)

export const insertTrusteeFeeScheduleSchema = createInsertSchema(
    trusteeFeeSchedule,
    {
        createdAt: (schema) => schema.optional(),
    },
)
export const selectTrusteeFeeScheduleSchema =
    createSelectSchema(trusteeFeeSchedule)

export const insertValuationSchema = createInsertSchema(valuation, {
    createdAt: (schema) => schema.optional(),
})
export const selectValuationSchema = createSelectSchema(valuation)

export const insertVehicleSchema = createInsertSchema(vehicle, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
    vin: () => vinValidation,
    acquisitionCost: () => positiveNumberValidation,
    dodValue: () => positiveNumberValidation,
})
export const selectVehicleSchema = createSelectSchema(vehicle)

export const insertWithdrawalRecordSchema = createInsertSchema(
    withdrawalRecord,
    {
        createdAt: (schema) => schema.optional(),
        updatedAt: (schema) => schema.optional(),
    },
)
export const selectWithdrawalRecordSchema = createSelectSchema(withdrawalRecord)

// Update schemas - for resources that need specific update validation
export const updateTrusteeSchema = insertTrusteeSchema.partial()
export const updateVehicleSchema = insertVehicleSchema.partial()
export const updateWithdrawalRecordSchema =
    insertWithdrawalRecordSchema.partial()
export const updateContactSchema = insertContactSchema.partial()
export const updateBeneficiarySchema = insertBeneficiarySchema.partial()
export const updateEntitySchema = insertEntitySchema.partial()
export const updateHomesteadSchema = insertHomesteadSchema.partial()
export const updateRentalPropertySchema = insertRentalPropertySchema.partial()
export const updateBankAccountSchema = insertBankAccountSchema.partial()
export const updateInvestmentAccountSchema =
    insertInvestmentAccountSchema.partial()
export const updateLiabilitySchema = insertLiabilitySchema.partial()
export const updateSpecificBequestSchema = insertSpecificBequestSchema.partial()
export const updateDistributionSchema = insertDistributionSchema.partial()
export const updateTaskSchema = insertTaskSchema.partial()
export const updateTrustAccountingSchema = insertTrustAccountingSchema.partial()
export const updateArtworkSchema = insertArtworkSchema.partial()
export const updateHemsRequestSchema = insertHemsRequestSchema.partial()
export const updatePersonalPropertySchema =
    insertPersonalPropertySchema.partial()
export const updateTrusteeFeeEntrySchema = insertTrusteeFeeEntrySchema.partial()
export const updateTrusteeFeeScheduleSchema =
    insertTrusteeFeeScheduleSchema.partial()
export const updateValuationSchema = insertValuationSchema.partial()
export const updateDocumentSchema = insertDocumentSchema.partial()
export const updateLiabilityPaymentSchema =
    insertLiabilityPaymentSchema.partial()
export const updateInsurancePolicySchema = insertInsurancePolicySchema.partial()
export const updatePendingInventoryItemSchema =
    insertPendingInventoryItemSchema.partial()

// User Profile schemas
export const insertUserProfileSchema = createInsertSchema(userProfile, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
})
export const selectUserProfileSchema = createSelectSchema(userProfile)
export const updateUserProfileSchema = insertUserProfileSchema.partial()
