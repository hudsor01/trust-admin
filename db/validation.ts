import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { z } from "zod"
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
  personalProperty,
  rentalProperty,
  specificBequest,
  task,
  transaction,
  trustAccounting,
  trustee,
  trusteeFeeEntry,
  trusteeFeeSchedule,
  valuation,
  vehicle,
  withdrawalRecord,
} from "./schema"

// ============================================
// Reusable Validation Helpers
// ============================================

const emailValidation = z.string().email("Invalid email format").nullable().optional()

const phoneValidation = z
  .string()
  .regex(/^[\d\s\-().]+$/, "Invalid phone number format")
  .min(10, "Phone number must be at least 10 digits")
  .max(20, "Phone number is too long")
  .nullable()
  .optional()

const positiveNumberValidation = z
  .string()
  .refine((val) => !val || parseFloat(val) >= 0, "Must be a positive number")
  .nullable()
  .optional()

const percentageValidation = z
  .string()
  .refine(
    (val) => !val || (parseFloat(val) >= 0 && parseFloat(val) <= 100),
    "Must be between 0 and 100",
  )
  .nullable()
  .optional()

const vinValidation = z
  .string()
  .length(17, "VIN must be exactly 17 characters")
  .regex(/^[A-HJ-NPR-Z0-9]{17}$/, "Invalid VIN format")

const zipValidation = z
  .string()
  .regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code format")
  .nullable()
  .optional()

export const insertActivityLogSchema = createInsertSchema(activityLog, {
  id: (schema) => schema.optional(),
  createdAt: (schema) => schema.optional(),
})
export const selectActivityLogSchema = createSelectSchema(activityLog)

export const insertArtworkSchema = createInsertSchema(artwork, {
  id: (schema) => schema.optional(),
  createdAt: (schema) => schema.optional(),
  updatedAt: (schema) => schema.optional(),
})
export const selectArtworkSchema = createSelectSchema(artwork)

export const insertBankAccountSchema = createInsertSchema(bankAccount, {
  id: (schema) => schema.optional(),
  createdAt: (schema) => schema.optional(),
  updatedAt: (schema) => schema.optional(),
})
export const selectBankAccountSchema = createSelectSchema(bankAccount)

export const insertBeneficiarySchema = createInsertSchema(beneficiary, {
  id: (schema) => schema.optional(),
  createdAt: (schema) => schema.optional(),
  updatedAt: (schema) => schema.optional(),
  email: () => emailValidation,
  phone: () => phoneValidation,
  zip: () => zipValidation,
  sharePercent: () => percentageValidation,
})
export const selectBeneficiarySchema = createSelectSchema(beneficiary)

export const insertContactSchema = createInsertSchema(contact, {
  id: (schema) => schema.optional(),
  createdAt: (schema) => schema.optional(),
  updatedAt: (schema) => schema.optional(),
  email: () => emailValidation,
  phone: () => phoneValidation,
  zip: () => zipValidation,
})
export const selectContactSchema = createSelectSchema(contact)

export const insertContactAssociationSchema = createInsertSchema(contactAssociation, {
  id: (schema) => schema.optional(),
  createdAt: (schema) => schema.optional(),
})
export const selectContactAssociationSchema = createSelectSchema(contactAssociation)

export const insertDistributionSchema = createInsertSchema(distribution, {
  id: (schema) => schema.optional(),
  createdAt: (schema) => schema.optional(),
  updatedAt: (schema) => schema.optional(),
  amount: (schema) =>
    schema.refine((val) => parseFloat(val) > 0, "Distribution amount must be positive"),
})
export const selectDistributionSchema = createSelectSchema(distribution)

export const insertDocumentSchema = createInsertSchema(document, {
  id: (schema) => schema.optional(),
  createdAt: (schema) => schema.optional(),
  updatedAt: (schema) => schema.optional(),
})
export const selectDocumentSchema = createSelectSchema(document)

export const insertEntitySchema = createInsertSchema(entity, {
  id: (schema) => schema.optional(),
  createdAt: (schema) => schema.optional(),
  updatedAt: (schema) => schema.optional(),
})
export const selectEntitySchema = createSelectSchema(entity)

export const insertHemsRequestSchema = createInsertSchema(hemsRequest, {
  id: (schema) => schema.optional(),
  createdAt: (schema) => schema.optional(),
  updatedAt: (schema) => schema.optional(),
})
export const selectHemsRequestSchema = createSelectSchema(hemsRequest)

export const insertHomesteadSchema = createInsertSchema(homestead, {
  id: (schema) => schema.optional(),
  createdAt: (schema) => schema.optional(),
  updatedAt: (schema) => schema.optional(),
  zip: () => zipValidation,
  acquisitionCost: () => positiveNumberValidation,
  dodValue: () => positiveNumberValidation,
})
export const selectHomesteadSchema = createSelectSchema(homestead)

export const insertInsurancePolicySchema = createInsertSchema(insurancePolicy, {
  id: (schema) => schema.optional(),
  createdAt: (schema) => schema.optional(),
  updatedAt: (schema) => schema.optional(),
})
export const selectInsurancePolicySchema = createSelectSchema(insurancePolicy)

export const insertInvestmentAccountSchema = createInsertSchema(investmentAccount, {
  id: (schema) => schema.optional(),
  createdAt: (schema) => schema.optional(),
  updatedAt: (schema) => schema.optional(),
})
export const selectInvestmentAccountSchema = createSelectSchema(investmentAccount)

export const insertLiabilitySchema = createInsertSchema(liability, {
  id: (schema) => schema.optional(),
  createdAt: (schema) => schema.optional(),
  updatedAt: (schema) => schema.optional(),
  originalAmount: (schema) =>
    schema.refine((val) => parseFloat(val) > 0, "Original amount must be positive"),
  currentBalance: (schema) =>
    schema.refine((val) => parseFloat(val) >= 0, "Current balance must be non-negative"),
  monthlyPayment: () => positiveNumberValidation,
})
export const selectLiabilitySchema = createSelectSchema(liability)

export const insertLiabilityPaymentSchema = createInsertSchema(liabilityPayment, {
  id: (schema) => schema.optional(),
  createdAt: (schema) => schema.optional(),
})
export const selectLiabilityPaymentSchema = createSelectSchema(liabilityPayment)

export const insertPersonalPropertySchema = createInsertSchema(personalProperty, {
  id: (schema) => schema.optional(),
  createdAt: (schema) => schema.optional(),
  updatedAt: (schema) => schema.optional(),
})
export const selectPersonalPropertySchema = createSelectSchema(personalProperty)

export const insertRentalPropertySchema = createInsertSchema(rentalProperty, {
  id: (schema) => schema.optional(),
  createdAt: (schema) => schema.optional(),
  updatedAt: (schema) => schema.optional(),
  zip: () => zipValidation,
  acquisitionCost: () => positiveNumberValidation,
  dodValue: () => positiveNumberValidation,
  monthlyRent: () => positiveNumberValidation,
  mortgageBalance: () => positiveNumberValidation,
})
export const selectRentalPropertySchema = createSelectSchema(rentalProperty)

export const insertSpecificBequestSchema = createInsertSchema(specificBequest, {
  id: (schema) => schema.optional(),
  createdAt: (schema) => schema.optional(),
  updatedAt: (schema) => schema.optional(),
})
export const selectSpecificBequestSchema = createSelectSchema(specificBequest)

export const insertTaskSchema = createInsertSchema(task, {
  id: (schema) => schema.optional(),
  createdAt: (schema) => schema.optional(),
  updatedAt: (schema) => schema.optional(),
})
export const selectTaskSchema = createSelectSchema(task)

export const insertTransactionSchema = createInsertSchema(transaction, {
  id: (schema) => schema.optional(),
  createdAt: (schema) => schema.optional(),
  updatedAt: (schema) => schema.optional(),
})
export const selectTransactionSchema = createSelectSchema(transaction)

export const insertTrustAccountingSchema = createInsertSchema(trustAccounting, {
  id: (schema) => schema.optional(),
  createdAt: (schema) => schema.optional(),
  updatedAt: (schema) => schema.optional(),
  amount: (schema) => schema.refine((val) => parseFloat(val) !== 0, "Amount cannot be zero"),
})
export const selectTrustAccountingSchema = createSelectSchema(trustAccounting)

export const insertTrusteeSchema = createInsertSchema(trustee, {
  id: (schema) => schema.optional(),
  createdAt: (schema) => schema.optional(),
  updatedAt: (schema) => schema.optional(),
})
export const selectTrusteeSchema = createSelectSchema(trustee)

export const insertTrusteeFeeEntrySchema = createInsertSchema(trusteeFeeEntry, {
  id: (schema) => schema.optional(),
  createdAt: (schema) => schema.optional(),
  updatedAt: (schema) => schema.optional(),
})
export const selectTrusteeFeeEntrySchema = createSelectSchema(trusteeFeeEntry)

export const insertTrusteeFeeScheduleSchema = createInsertSchema(trusteeFeeSchedule, {
  id: (schema) => schema.optional(),
  createdAt: (schema) => schema.optional(),
})
export const selectTrusteeFeeScheduleSchema = createSelectSchema(trusteeFeeSchedule)

export const insertValuationSchema = createInsertSchema(valuation, {
  id: (schema) => schema.optional(),
  createdAt: (schema) => schema.optional(),
})
export const selectValuationSchema = createSelectSchema(valuation)

export const insertVehicleSchema = createInsertSchema(vehicle, {
  id: (schema) => schema.optional(),
  createdAt: (schema) => schema.optional(),
  updatedAt: (schema) => schema.optional(),
  vin: () => vinValidation,
  acquisitionCost: () => positiveNumberValidation,
  dodValue: () => positiveNumberValidation,
})
export const selectVehicleSchema = createSelectSchema(vehicle)

export const insertWithdrawalRecordSchema = createInsertSchema(withdrawalRecord, {
  id: (schema) => schema.optional(),
  createdAt: (schema) => schema.optional(),
  updatedAt: (schema) => schema.optional(),
})
export const selectWithdrawalRecordSchema = createSelectSchema(withdrawalRecord)

// Update schemas - for resources that need specific update validation
export const updateTrusteeSchema = insertTrusteeSchema.partial()
export const updateVehicleSchema = insertVehicleSchema.partial()
export const updateWithdrawalRecordSchema = insertWithdrawalRecordSchema.partial()
export const updateContactSchema = insertContactSchema.partial()
export const updateBeneficiarySchema = insertBeneficiarySchema.partial()
export const updateEntitySchema = insertEntitySchema.partial()
export const updateHomesteadSchema = insertHomesteadSchema.partial()
export const updateRentalPropertySchema = insertRentalPropertySchema.partial()
export const updateBankAccountSchema = insertBankAccountSchema.partial()
export const updateInvestmentAccountSchema = insertInvestmentAccountSchema.partial()
export const updateLiabilitySchema = insertLiabilitySchema.partial()
export const updateSpecificBequestSchema = insertSpecificBequestSchema.partial()
export const updateDistributionSchema = insertDistributionSchema.partial()
export const updateTaskSchema = insertTaskSchema.partial()
export const updateTrustAccountingSchema = insertTrustAccountingSchema.partial()
export const updateArtworkSchema = insertArtworkSchema.partial()
export const updateHemsRequestSchema = insertHemsRequestSchema.partial()
export const updatePersonalPropertySchema = insertPersonalPropertySchema.partial()
export const updateTrusteeFeeEntrySchema = insertTrusteeFeeEntrySchema.partial()
