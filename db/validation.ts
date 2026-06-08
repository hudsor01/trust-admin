import { createInsertSchema } from 'drizzle-zod'
import { z } from 'zod'
import {
    bankAccount,
    beneficiary,
    contact,
    distribution,
    document,
    entity,
    firearm,
    hemsRequest,
    homestead,
    insurancePolicy,
    investmentAccount,
    liability,
    liabilityPayment,
    noteReceivable,
    personalProperty,
    rentalProperty,
    specificBequest,
    task,
    trustAccounting,
    trustee,
    trusteeFeeEntry,
    trusteeFeeSchedule,
    userProfile,
    valuation,
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

/**
 * Magnitude ceiling for the widest money columns — numeric(14,2), whose
 * true max is 99,999,999,999,999.99 (~100 trillion). That exact value is
 * not representable as an IEEE-754 double, so the bound is expressed as
 * 1e14 — an exact power of ten just above the column max. The DB column
 * itself still rejects an actual overflow on write; this bound only keeps
 * Zod from rejecting a value the 14,2 column would accept.
 * `positiveNumberValidation` (applied to estimatedValue, dodValue, etc.)
 * uses this. Narrower columns (numeric(12,2), 10,2) remain protected by
 * their own DB precision on write.
 */
const MAX_CURRENCY_VALUE_14 = 1e14

/**
 * Required (non-nullable) money string. Anchored shape regex first — that
 * rejects "abc", "", "1e9" (scientific notation bypass), "NaN", "Infinity",
 * "+5", "5.", ".5", whitespace — before any parseFloat math gets a chance
 * to hide a NaN. Magnitude bound keeps callers within the numeric(12,2)
 * column. Use this for tRPC inputs where the field MUST have a real value;
 * for createInsertSchema overrides on nullable columns, use
 * positiveNumberValidation below (which adds .nullable().optional()).
 */
export const requiredCurrencyAmount = z
    .string()
    .regex(
        /^\d+(\.\d{1,2})?$/,
        'Must be a non-negative number with at most 2 decimal places',
    )
    .refine(
        (val) => parseFloat(val) <= MAX_CURRENCY_VALUE,
        `Must be at most ${MAX_CURRENCY_VALUE.toLocaleString()}`,
    )

const positiveNumberValidation = z
    .string()
    .refine((val) => {
        if (!val) return true
        const num = parseFloat(val)
        return (
            !Number.isNaN(num) &&
            Number.isFinite(num) &&
            num >= 0 &&
            num <= MAX_CURRENCY_VALUE_14
        )
    }, `Must be a valid positive number (max ${MAX_CURRENCY_VALUE_14.toLocaleString()})`)
    .refine((val) => {
        if (!val) return true
        return !/\.\d{3,}/.test(val) // DB money columns are numeric(14,2)
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

// ATF Form 4473 Box 16 allows up to 40 alphanumeric chars; we accept 50 +
// hyphens as a tolerant superset matching real-world serial formats.
const serialNumberValidation = z
    .string()
    .min(1, 'Serial number is required')
    .max(50, 'Serial number must be 50 characters or fewer')
    .trim()
    .regex(
        /^[A-Za-z0-9-]+$/,
        'Serial number must contain only letters, numbers, and hyphens',
    )

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

export const insertBankAccountSchema = createInsertSchema(bankAccount, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
    name: (schema) => schema.min(1, 'Name is required'),
})

// `sortIndex` is omitted from the input surface: the drag-to-reorder UI and
// `beneficiary.reorder` adminProcedure were removed in Phase 33 (D-04), but
// the column + its composite index + the `orderBy(asc(sortIndex))` clause in
// beneficiary.list / beneficiary.listWithDistributions are preserved per
// BENE-04. With no external writer left, accepting `sortIndex` on create or
// update would be silently ignored (column has `default 0`) or worse — let a
// future caller drift the persisted display order out of admin control. The
// schema lock makes that contract enforced at the type system.
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
}).omit({ sortIndex: true })

export const insertContactSchema = createInsertSchema(contact, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
    email: () => emailValidation,
    phone: () => phoneValidation,
    zip: () => zipValidation,
})

export const insertDistributionSchema = createInsertSchema(distribution, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
    amount: (schema) =>
        schema.refine(
            (val) => parseFloat(val) > 0,
            'Distribution amount must be positive',
        ),
})

const insertDocumentSchema = createInsertSchema(document, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
})

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

// Base schema (no .refine()) so insertFirearmSchema.partial() — used by
// updateFirearmSchema below — does not throw in Zod v4, which forbids
// .partial() on refined object schemas.
export const insertFirearmSchemaBase = createInsertSchema(firearm, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
    name: (schema) => schema.min(1, 'Name is required'),
    make: (schema) => schema.min(1, 'Make is required'),
    model: (schema) => schema.min(1, 'Model is required'),
    serialNumber: () => serialNumberValidation,
    caliber: (schema) => schema.trim().optional(),
    acquisitionCost: () => positiveNumberValidation,
    dodValue: () => positiveNumberValidation,
})
export const insertFirearmSchema = insertFirearmSchemaBase.refine(
    (data) => !data.isNfa || data.nfaClass != null,
    {
        message: 'NFA class is required when firearm is classified as NFA',
        path: ['nfaClass'],
    },
)

export const insertHemsRequestSchema = createInsertSchema(hemsRequest, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
})

export const insertHomesteadSchema = createInsertSchema(homestead, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
    zip: () => requiredZipValidation,
    acquisitionCost: () => positiveNumberValidation,
    dodValue: () => positiveNumberValidation,
    name: (schema) => schema.min(1, 'Name is required'),
})

export const insertInsurancePolicySchema = createInsertSchema(insurancePolicy, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
    name: (schema) => schema.min(1, 'Name is required'),
})

export const insertInvestmentAccountSchema = createInsertSchema(
    investmentAccount,
    {
        createdAt: (schema) => schema.optional(),
        updatedAt: (schema) => schema.optional(),
        name: (schema) => schema.min(1, 'Name is required'),
    },
)

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

export const insertLiabilityPaymentSchema = createInsertSchema(
    liabilityPayment,
    {
        createdAt: (schema) => schema.optional(),
    },
)

export const insertNoteReceivableSchema = createInsertSchema(noteReceivable, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
    originalPrincipal: (schema) =>
        schema.refine(
            (val) => parseFloat(val) > 0,
            'Original principal must be positive',
        ),
    currentBalance: (schema) =>
        schema.refine(
            (val) => parseFloat(val) >= 0,
            'Current balance must be non-negative',
        ),
    dodValue: () => positiveNumberValidation,
    monthlyPayment: () => positiveNumberValidation,
    loanTermMonths: (schema) =>
        schema
            .refine(
                (val) => val === null || val === undefined || val > 0,
                'Loan term must be positive',
            )
            .nullable()
            .optional(),
})

export const insertPersonalPropertySchema = createInsertSchema(
    personalProperty,
    {
        createdAt: (schema) => schema.optional(),
        updatedAt: (schema) => schema.optional(),
        name: (schema) => schema.min(1, 'Name is required'),
    },
)

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

export const insertSpecificBequestSchema = createInsertSchema(specificBequest, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
    // Nullable money column — 2-decimal, non-negative, magnitude-bounded;
    // allows null/empty (most bequests are non-monetary item descriptions).
    estimatedValue: () => positiveNumberValidation,
})

export const insertTaskSchema = createInsertSchema(task, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
})

export const insertTrustAccountingSchema = createInsertSchema(trustAccounting, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
    amount: (schema) =>
        schema.refine(
            (val) => parseFloat(val) > 0,
            'Amount must be greater than zero',
        ),
})

// NOTE: Unlike `beneficiary.sortIndex` (which has `.default(0)` at the DB
// level so it can be omitted from the insert schema), `trustee.order` is
// `notNull` with no DB default — omitting it from the schema breaks the
// `trustee.create` callers (TrusteeDialog passes `order: <count>` for the
// new row). The drag-to-reorder UI and the `trustee.reorder` adminProcedure
// are gone, so the only remaining writer is `trustee.create` itself which
// supplies the value at insert time. Hardening to schema-level omission
// would require migration 0015 adding `.default(0)`; deferred until a
// future cleanup phase.
// `order` is omitted from the input surface (mirrors beneficiary.sortIndex,
// D-04): display order is admin-controlled, not client-settable. The column now
// carries a DB default(0) so create still works without it (migration 0018).
export const insertTrusteeSchema = createInsertSchema(trustee, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
}).omit({ order: true })
const insertTrusteeFeeEntrySchema = createInsertSchema(trusteeFeeEntry, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
})

const insertTrusteeFeeScheduleSchema = createInsertSchema(trusteeFeeSchedule, {
    createdAt: (schema) => schema.optional(),
})

export const insertValuationSchema = createInsertSchema(valuation, {
    createdAt: (schema) => schema.optional(),
})
export const insertVehicleSchema = createInsertSchema(vehicle, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
    vin: () => vinValidation,
    acquisitionCost: () => positiveNumberValidation,
    dodValue: () => positiveNumberValidation,
    name: (schema) => schema.min(1, 'Name is required'),
})

export const insertWithdrawalRecordSchema = createInsertSchema(
    withdrawalRecord,
    {
        createdAt: (schema) => schema.optional(),
        updatedAt: (schema) => schema.optional(),
    },
)

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
// Partial off the base (no refine) — Zod v4 forbids .partial() on a
// refined schema. The NFA-conditional refine is reapplied here so an
// UPDATE that sets isNfa=true still requires nfaClass.
export const updateFirearmSchema = requireAtLeastOneField(
    insertFirearmSchemaBase
        .partial()
        .refine((data) => !data.isNfa || data.nfaClass != null, {
            message: 'NFA class is required when firearm is classified as NFA',
            path: ['nfaClass'],
        }),
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
export const updateNoteReceivableSchema = requireAtLeastOneField(
    insertNoteReceivableSchema.partial(),
)
export const updateInsurancePolicySchema = requireAtLeastOneField(
    insertInsurancePolicySchema.partial(),
)

const insertUserProfileSchema = createInsertSchema(userProfile, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
})
export const updateUserProfileSchema = requireAtLeastOneField(
    insertUserProfileSchema.partial(),
)
