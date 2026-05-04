import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'
import {
    activityLog,
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
    valuationCorrection,
    vehicle,
    withdrawalRecord,
} from './schema'

// ---------------------------------------------------------------------------
// Validation Helpers
// ---------------------------------------------------------------------------

/**
 * Wraps a partial schema to require at least one field to be defined.
 * Prevents silent no-op UPDATE statements from empty payloads.
 */
function requireAtLeastOneField<T extends z.ZodObject<z.ZodRawShape>>(
    schema: T,
) {
    return schema.refine(
        (data) => Object.values(data).some((v) => v !== undefined),
        { message: 'Update requires at least one field to be provided' },
    )
}

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

/** Rejects NaN, Infinity, and scientific notation bypass (VULN-009). */
const MAX_CURRENCY_VALUE = 999_999_999_999.99

const positiveNumberValidation = z
    .string()
    .refine((val) => {
        if (!val) return true
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
        return !/\.\d{3,}/.test(val) // DB columns are numeric(12,2)
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

// Allows "Fort Worth", "St. Paul", "O'Brien"
const cityValidation = z
    .string()
    .min(2, 'City must be at least 2 characters')
    .regex(/^[A-Za-z\s'.-]+$/, 'City must contain only letters')
    .nullable()
    .optional()

const stateValidation = z
    .string()
    .regex(/^[A-Z]{2}$/, 'State must be 2 uppercase letters (e.g. TX)')
    .nullable()
    .optional()

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

export const insertBankAccountSchema = createInsertSchema(bankAccount, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
    name: (schema) => schema.min(1, 'Name is required'),
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
    name: (schema) => schema.min(1, 'Name is required'),
})
export const selectHomesteadSchema = createSelectSchema(homestead)

export const insertInsurancePolicySchema = createInsertSchema(insurancePolicy, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
    name: (schema) => schema.min(1, 'Name is required'),
})
export const selectInsurancePolicySchema = createSelectSchema(insurancePolicy)

export const insertInvestmentAccountSchema = createInsertSchema(
    investmentAccount,
    {
        createdAt: (schema) => schema.optional(),
        updatedAt: (schema) => schema.optional(),
        name: (schema) => schema.min(1, 'Name is required'),
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
        name: (schema) => schema.min(1, 'Name is required'),
    },
)
export const selectPersonalPropertySchema = createSelectSchema(personalProperty)

export const insertRentalPropertySchema = createInsertSchema(rentalProperty, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
    zip: () => requiredZipValidation,
    acquisitionCost: () => positiveNumberValidation,
    dodValue: () => positiveNumberValidation,
    monthlyRent: () => positiveNumberValidation,
    mortgageBalance: () => positiveNumberValidation,
    name: (schema) => schema.min(1, 'Name is required'),
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

export const insertValuationCorrectionSchema = createInsertSchema(
    valuationCorrection,
    {
        createdAt: (schema) => schema.optional(),
    },
).omit({
    correctionRatio: true,
})

export const insertVehicleSchema = createInsertSchema(vehicle, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
    vin: () => vinValidation,
    acquisitionCost: () => positiveNumberValidation,
    dodValue: () => positiveNumberValidation,
    name: (schema) => schema.min(1, 'Name is required'),
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

export const updateTrusteeSchema = requireAtLeastOneField(
    insertTrusteeSchema.partial(),
)
export const updateVehicleSchema = requireAtLeastOneField(
    insertVehicleSchema.partial(),
)
export const updateWithdrawalRecordSchema = requireAtLeastOneField(
    insertWithdrawalRecordSchema.partial(),
)
export const updateContactSchema = requireAtLeastOneField(
    insertContactSchema.partial(),
)
export const updateBeneficiarySchema = requireAtLeastOneField(
    insertBeneficiarySchema.partial(),
)
export const updateEntitySchema = requireAtLeastOneField(
    insertEntitySchema.partial(),
)
export const updateHomesteadSchema = requireAtLeastOneField(
    insertHomesteadSchema.partial(),
)
export const updateRentalPropertySchema = requireAtLeastOneField(
    insertRentalPropertySchema.partial(),
)
export const updateBankAccountSchema = requireAtLeastOneField(
    insertBankAccountSchema.partial(),
)
export const updateInvestmentAccountSchema = requireAtLeastOneField(
    insertInvestmentAccountSchema.partial(),
)
export const updateLiabilitySchema = requireAtLeastOneField(
    insertLiabilitySchema.partial(),
)
export const updateSpecificBequestSchema = requireAtLeastOneField(
    insertSpecificBequestSchema.partial(),
)
export const updateDistributionSchema = requireAtLeastOneField(
    insertDistributionSchema.partial(),
)
export const updateTaskSchema = requireAtLeastOneField(
    insertTaskSchema.partial(),
)
export const updateTrustAccountingSchema = requireAtLeastOneField(
    insertTrustAccountingSchema.partial(),
)
export const updateHemsRequestSchema = requireAtLeastOneField(
    insertHemsRequestSchema.partial(),
)
export const updatePersonalPropertySchema = requireAtLeastOneField(
    insertPersonalPropertySchema.partial(),
)
export const updateTrusteeFeeEntrySchema = requireAtLeastOneField(
    insertTrusteeFeeEntrySchema.partial(),
)
export const updateTrusteeFeeScheduleSchema = requireAtLeastOneField(
    insertTrusteeFeeScheduleSchema.partial(),
)
export const updateValuationSchema = requireAtLeastOneField(
    insertValuationSchema.partial(),
)
export const updateDocumentSchema = requireAtLeastOneField(
    insertDocumentSchema.partial(),
)
export const updateLiabilityPaymentSchema = requireAtLeastOneField(
    insertLiabilityPaymentSchema.partial(),
)
export const updateInsurancePolicySchema = requireAtLeastOneField(
    insertInsurancePolicySchema.partial(),
)

export const insertUserProfileSchema = createInsertSchema(userProfile, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
})
export const selectUserProfileSchema = createSelectSchema(userProfile)
export const updateUserProfileSchema = requireAtLeastOneField(
    insertUserProfileSchema.partial(),
)
