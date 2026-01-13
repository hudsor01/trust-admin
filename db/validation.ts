/**
 * Zod Validation Schemas
 *
 * Generated from Drizzle schema using drizzle-zod
 * Provides type-safe validation for insert/update/select operations
 *
 * @see https://orm.drizzle.team/docs/zod
 */
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";
import type { PgTable } from "drizzle-orm/pg-core";
import {
  entity,
  beneficiary,
  distribution,
  vehicle,
  homestead,
  rentalProperty,
  bankAccount,
  investmentAccount,
  insurancePolicy,
  personalProperty,
  artwork,
  valuation,
  document,
  transaction,
  contact,
  contactAssociation,
  task,
  trustee,
  specificBequest,
  trustAccounting,
  withdrawalRecord,
  activityLog,
  liability,
  liabilityPayment,
  hemsRequest,
  trusteeFeeSchedule,
  trusteeFeeEntry,
} from "./schema";

// =============================================================================
// SCHEMA WRAPPER UTILITY
// =============================================================================

/**
 * Wrapper around createInsertSchema that automatically makes auto-generated
 * fields optional (id, createdAt, updatedAt).
 *
 * This fixes drizzle-zod v0.8.3 behavior where ALL fields are required by default.
 *
 * @param table - Drizzle table definition
 * @param customizations - Custom Zod refinements for specific fields
 * @returns Zod schema with auto-generated fields marked optional
 */
export function createInsertSchemaWithDefaults<T extends PgTable>(
  table: T,
  customizations: Record<string, (schema: any) => any> = {}
) {
  return createInsertSchema(table, {
    // Auto-generated fields should always be optional
    // Using 'as any' because Drizzle's createInsertSchema doesn't know about id/timestamps
    id: (schema: any) => schema.optional(),
    createdAt: (schema: any) => schema.optional(),
    updatedAt: (schema: any) => schema.optional(),
    // Apply custom validations for other fields
    ...customizations,
  } as any);
}

// =============================================================================
// ENTITY SCHEMAS
// =============================================================================

export const insertEntitySchema = createInsertSchemaWithDefaults(entity, {
  name: (schema: any) => schema.min(1, "Name is required").max(255),
  ein: (schema: any) => schema.regex(/^\d{2}-\d{7}$/, "EIN must be in format XX-XXXXXXX").optional(),
  governingLaw: (schema: any) => schema.max(100).optional(),
});

export const selectEntitySchema = createSelectSchema(entity);

export const updateEntitySchema = createUpdateSchema(entity, {
  name: (schema: any) => schema.min(1).max(255).optional(),
});

// =============================================================================
// BENEFICIARY SCHEMAS
// =============================================================================

export const insertBeneficiarySchema = createInsertSchemaWithDefaults(beneficiary, {
  firstName: (schema: any) => schema.min(1, "First name is required").max(100),
  lastName: (schema: any) => schema.min(1, "Last name is required").max(100),
  email: (schema: any) => schema.email("Invalid email address").optional(),
  phone: (schema: any) => schema.regex(/^[\d\s\-\+\(\)]+$/, "Invalid phone number").optional(),
  sharePercent: (schema: any) => schema.refine(
    (val: any) => val === null || (parseFloat(val) >= 0 && parseFloat(val) <= 100),
    "Share percent must be between 0 and 100"
  ),
  taxId: (schema: any) => schema.regex(/^\d{3}-\d{2}-\d{4}$/, "Tax ID must be in format XXX-XX-XXXX").optional(),
  zip: (schema: any) => schema.regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code").optional(),
});

export const selectBeneficiarySchema = createSelectSchema(beneficiary);

export const updateBeneficiarySchema = createUpdateSchema(beneficiary);

// =============================================================================
// DISTRIBUTION SCHEMAS
// =============================================================================

export const insertDistributionSchema = createInsertSchemaWithDefaults(distribution, {
  amount: (schema: any) => schema.refine(
    (val: any) => parseFloat(val) > 0,
    "Amount must be greater than 0"
  ),
});

export const selectDistributionSchema = createSelectSchema(distribution);

export const updateDistributionSchema = createUpdateSchema(distribution);

// =============================================================================
// VEHICLE SCHEMAS
// =============================================================================

export const insertVehicleSchema = createInsertSchemaWithDefaults(vehicle, {
  year: (schema: any) => schema.min(1900).max(new Date().getFullYear() + 1),
  vin: (schema: any) => schema.length(17, "VIN must be exactly 17 characters"),
  mileage: (schema: any) => schema.min(0).optional(),
});

export const selectVehicleSchema = createSelectSchema(vehicle);

export const updateVehicleSchema = createUpdateSchema(vehicle);

// =============================================================================
// REAL PROPERTY SCHEMAS
// =============================================================================

export const insertHomesteadSchema = createInsertSchemaWithDefaults(homestead, {
  streetAddress: (schema: any) => schema.min(1, "Street address is required"),
  city: (schema: any) => schema.min(1, "City is required"),
  state: (schema: any) => schema.length(2, "State must be 2-letter code"),
  zip: (schema: any) => schema.regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code"),
  yearBuilt: (schema: any) => schema.min(1800).max(new Date().getFullYear()).optional(),
  squareFeet: (schema: any) => schema.min(0).optional(),
  bedrooms: (schema: any) => schema.min(0).max(50).optional(),
});

export const selectHomesteadSchema = createSelectSchema(homestead);

export const updateHomesteadSchema = createUpdateSchema(homestead);

export const insertRentalPropertySchema = createInsertSchemaWithDefaults(rentalProperty, {
  name: (schema: any) => schema.min(1, "Property name is required"),
  streetAddress: (schema: any) => schema.min(1, "Street address is required"),
  city: (schema: any) => schema.min(1, "City is required"),
  state: (schema: any) => schema.length(2, "State must be 2-letter code"),
  zip: (schema: any) => schema.regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code"),
  units: (schema: any) => schema.min(1),
});

export const selectRentalPropertySchema = createSelectSchema(rentalProperty);

export const updateRentalPropertySchema = createUpdateSchema(rentalProperty);

// =============================================================================
// FINANCIAL ACCOUNT SCHEMAS
// =============================================================================

export const insertBankAccountSchema = createInsertSchemaWithDefaults(bankAccount, {
  institution: (schema: any) => schema.min(1, "Institution is required"),
  accountNumber: (schema: any) => schema.min(4, "Account number is required"),
  routingNumber: (schema: any) => schema.length(9, "Routing number must be 9 digits").optional(),
});

export const selectBankAccountSchema = createSelectSchema(bankAccount);

export const updateBankAccountSchema = createUpdateSchema(bankAccount);

export const insertInvestmentAccountSchema = createInsertSchemaWithDefaults(investmentAccount, {
  institution: (schema: any) => schema.min(1, "Institution is required"),
  accountNumber: (schema: any) => schema.min(4, "Account number is required"),
});

export const selectInvestmentAccountSchema = createSelectSchema(investmentAccount);

export const updateInvestmentAccountSchema = createUpdateSchema(investmentAccount);

// =============================================================================
// INSURANCE SCHEMAS
// =============================================================================

export const insertInsurancePolicySchema = createInsertSchemaWithDefaults(insurancePolicy, {
  carrier: (schema: any) => schema.min(1, "Carrier is required"),
  policyNumber: (schema: any) => schema.min(1, "Policy number is required"),
});

export const selectInsurancePolicySchema = createSelectSchema(insurancePolicy);

export const updateInsurancePolicySchema = createUpdateSchema(insurancePolicy);

// =============================================================================
// PERSONAL PROPERTY SCHEMAS
// =============================================================================

export const insertPersonalPropertySchema = createInsertSchemaWithDefaults(personalProperty, {
  name: (schema: any) => schema.min(1, "Name is required"),
});

export const selectPersonalPropertySchema = createSelectSchema(personalProperty);

export const updatePersonalPropertySchema = createUpdateSchema(personalProperty);

export const insertArtworkSchema = createInsertSchemaWithDefaults(artwork, {
  title: (schema: any) => schema.min(1, "Title is required"),
});

export const selectArtworkSchema = createSelectSchema(artwork);

export const updateArtworkSchema = createUpdateSchema(artwork);

// =============================================================================
// VALUATION SCHEMAS
// =============================================================================

export const insertValuationSchema = createInsertSchemaWithDefaults(valuation, {
  value: (schema: any) => schema.refine(
    (val: any) => parseFloat(val) >= 0,
    "Value must be non-negative"
  ),
});

export const selectValuationSchema = createSelectSchema(valuation);

// =============================================================================
// DOCUMENT SCHEMAS
// =============================================================================

export const insertDocumentSchema = createInsertSchemaWithDefaults(document, {
  name: (schema: any) => schema.min(1, "Document name is required"),
  filePath: (schema: any) => schema.min(1, "File path is required"),
});

export const selectDocumentSchema = createSelectSchema(document);

export const updateDocumentSchema = createUpdateSchema(document);

// =============================================================================
// TRANSACTION SCHEMAS
// =============================================================================

export const insertTransactionSchema = createInsertSchemaWithDefaults(transaction, {
  category: (schema: any) => schema.min(1, "Category is required"),
  amount: (schema: any) => schema.refine(
    (val: any) => parseFloat(val) !== 0,
    "Amount cannot be zero"
  ),
});

export const selectTransactionSchema = createSelectSchema(transaction);

export const updateTransactionSchema = createUpdateSchema(transaction);

// =============================================================================
// CONTACT SCHEMAS
// =============================================================================

export const insertContactSchema = createInsertSchemaWithDefaults(contact, {
  name: (schema: any) => schema.min(1, "Name is required"),
  email: (schema: any) => schema.email("Invalid email address").optional(),
  phone: (schema: any) => schema.regex(/^[\d\s\-\+\(\)]+$/, "Invalid phone number").optional(),
  zip: (schema: any) => schema.regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code").optional(),
});

export const selectContactSchema = createSelectSchema(contact);

export const updateContactSchema = createUpdateSchema(contact);

export const insertContactAssociationSchema = createInsertSchemaWithDefaults(contactAssociation);

export const selectContactAssociationSchema = createSelectSchema(contactAssociation);

// =============================================================================
// TASK SCHEMAS
// =============================================================================

export const insertTaskSchema = createInsertSchemaWithDefaults(task, {
  title: (schema: any) => schema.min(1, "Title is required").max(500),
});

export const selectTaskSchema = createSelectSchema(task);

export const updateTaskSchema = createUpdateSchema(task);

// =============================================================================
// TRUSTEE SCHEMAS
// =============================================================================

export const insertTrusteeSchema = createInsertSchemaWithDefaults(trustee, {
  name: (schema: any) => schema.min(1, "Name is required"),
  order: (schema: any) => schema.min(1, "Order must be at least 1"),
});

export const selectTrusteeSchema = createSelectSchema(trustee);

export const updateTrusteeSchema = createUpdateSchema(trustee);

// =============================================================================
// SPECIFIC BEQUEST SCHEMAS
// =============================================================================

export const insertSpecificBequestSchema = createInsertSchemaWithDefaults(specificBequest, {
  description: (schema: any) => schema.min(1, "Description is required"),
});

export const selectSpecificBequestSchema = createSelectSchema(specificBequest);

export const updateSpecificBequestSchema = createUpdateSchema(specificBequest);

// =============================================================================
// TRUST ACCOUNTING SCHEMAS
// =============================================================================

export const insertTrustAccountingSchema = createInsertSchemaWithDefaults(trustAccounting, {
  entryType: (schema: any) => z.enum(["INCOME", "EXPENSE"]),
  description: (schema: any) => schema.min(1, "Description is required"),
  amount: (schema: any) => schema.refine(
    (val: any) => parseFloat(val) !== 0,
    "Amount cannot be zero"
  ),
});

export const selectTrustAccountingSchema = createSelectSchema(trustAccounting);

export const updateTrustAccountingSchema = createUpdateSchema(trustAccounting);

// =============================================================================
// WITHDRAWAL RECORD SCHEMAS
// =============================================================================

export const insertWithdrawalRecordSchema = createInsertSchemaWithDefaults(withdrawalRecord, {
  withdrawalType: (schema: any) => schema.min(1, "Withdrawal type is required"),
});

export const selectWithdrawalRecordSchema = createSelectSchema(withdrawalRecord);

export const updateWithdrawalRecordSchema = createUpdateSchema(withdrawalRecord);

// =============================================================================
// ACTIVITY LOG SCHEMAS
// =============================================================================

export const insertActivityLogSchema = createInsertSchemaWithDefaults(activityLog);

export const selectActivityLogSchema = createSelectSchema(activityLog);

// =============================================================================
// LIABILITY SCHEMAS (Texas Property Code 113.152(5))
// =============================================================================

export const insertLiabilitySchema = createInsertSchemaWithDefaults(liability, {
  creditor: (schema: any) => schema.min(1, "Creditor is required"),
  originalAmount: (schema: any) => schema.refine(
    (val: any) => parseFloat(val) > 0,
    "Original amount must be greater than 0"
  ),
  currentBalance: (schema: any) => schema.refine(
    (val: any) => parseFloat(val) >= 0,
    "Current balance must be non-negative"
  ),
  interestRate: (schema: any) => schema.refine(
    (val: any) => val === null || (parseFloat(val) >= 0 && parseFloat(val) <= 100),
    "Interest rate must be between 0 and 100"
  ).optional(),
  paymentDueDay: (schema: any) => schema.min(1).max(31).optional(),
});

export const selectLiabilitySchema = createSelectSchema(liability);

export const updateLiabilitySchema = createUpdateSchema(liability, {
  originalAmount: (schema: any) => schema.refine(
    (val: any) => val === undefined || parseFloat(val) > 0,
    "Original amount must be greater than 0"
  ).optional(),
  currentBalance: (schema: any) => schema.refine(
    (val: any) => val === undefined || parseFloat(val) >= 0,
    "Current balance must be non-negative"
  ).optional(),
});

// =============================================================================
// LIABILITY PAYMENT SCHEMAS
// =============================================================================

export const insertLiabilityPaymentSchema = createInsertSchemaWithDefaults(liabilityPayment, {
  amount: (schema: any) => schema.refine(
    (val: any) => parseFloat(val) > 0,
    "Payment amount must be greater than 0"
  ),
  principalPortion: (schema: any) => schema.refine(
    (val: any) => val === null || parseFloat(val) >= 0,
    "Principal portion must be non-negative"
  ).optional(),
  interestPortion: (schema: any) => schema.refine(
    (val: any) => val === null || parseFloat(val) >= 0,
    "Interest portion must be non-negative"
  ).optional(),
  escrowPortion: (schema: any) => schema.refine(
    (val: any) => val === null || parseFloat(val) >= 0,
    "Escrow portion must be non-negative"
  ).optional(),
});

export const selectLiabilityPaymentSchema = createSelectSchema(liabilityPayment);

// Note: No update schema - payments are immutable records

// =============================================================================
// HEMS REQUEST SCHEMAS
// =============================================================================

export const insertHemsRequestSchema = createInsertSchemaWithDefaults(hemsRequest, {
  amountRequested: (schema: any) => schema.refine(
    (val: any) => parseFloat(val) > 0,
    "Amount requested must be greater than 0"
  ),
  justification: (schema: any) => schema.min(1, "Justification is required"),
});

export const selectHemsRequestSchema = createSelectSchema(hemsRequest);

export const updateHemsRequestSchema = createUpdateSchema(hemsRequest, {
  approvedAmount: (schema: any) => schema.refine(
    (val: any) => val === null || val === undefined || parseFloat(val) >= 0,
    "Approved amount must be non-negative"
  ).optional(),
});

// =============================================================================
// TRUSTEE FEE SCHEDULE SCHEMAS
// =============================================================================

export const insertTrusteeFeeScheduleSchema = createInsertSchemaWithDefaults(trusteeFeeSchedule, {
  executorFeePercent: (schema: any) => schema.refine(
    (val: any) => val === null || (parseFloat(val) >= 0 && parseFloat(val) <= 100),
    "Executor fee percent must be between 0 and 100"
  ).optional(),
  annualAssetPercent: (schema: any) => schema.refine(
    (val: any) => val === null || (parseFloat(val) >= 0 && parseFloat(val) <= 100),
    "Annual asset percent must be between 0 and 100"
  ).optional(),
  incomePercent: (schema: any) => schema.refine(
    (val: any) => val === null || (parseFloat(val) >= 0 && parseFloat(val) <= 100),
    "Income percent must be between 0 and 100"
  ).optional(),
  hourlyRate: (schema: any) => schema.refine(
    (val: any) => val === null || parseFloat(val) >= 0,
    "Hourly rate must be non-negative"
  ).optional(),
});

export const selectTrusteeFeeScheduleSchema = createSelectSchema(trusteeFeeSchedule);

// Note: No update schema - schedules have hasUpdatedAt: false

// =============================================================================
// TRUSTEE FEE ENTRY SCHEMAS
// =============================================================================

export const insertTrusteeFeeEntrySchema = createInsertSchemaWithDefaults(trusteeFeeEntry, {
  totalFee: (schema: any) => schema.refine(
    (val: any) => parseFloat(val) >= 0,
    "Total fee must be non-negative"
  ),
  assetFee: (schema: any) => schema.refine(
    (val: any) => val === null || parseFloat(val) >= 0,
    "Asset fee must be non-negative"
  ).optional(),
  incomeFee: (schema: any) => schema.refine(
    (val: any) => val === null || parseFloat(val) >= 0,
    "Income fee must be non-negative"
  ).optional(),
  hourlyFee: (schema: any) => schema.refine(
    (val: any) => val === null || parseFloat(val) >= 0,
    "Hourly fee must be non-negative"
  ).optional(),
  executorFee: (schema: any) => schema.refine(
    (val: any) => val === null || parseFloat(val) >= 0,
    "Executor fee must be non-negative"
  ).optional(),
  hoursWorked: (schema: any) => schema.refine(
    (val: any) => val === null || parseFloat(val) >= 0,
    "Hours worked must be non-negative"
  ).optional(),
});

export const selectTrusteeFeeEntrySchema = createSelectSchema(trusteeFeeEntry);

export const updateTrusteeFeeEntrySchema = createUpdateSchema(trusteeFeeEntry, {
  totalFee: (schema: any) => schema.refine(
    (val: any) => val === undefined || parseFloat(val) >= 0,
    "Total fee must be non-negative"
  ).optional(),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type InsertEntity = z.infer<typeof insertEntitySchema>;
export type SelectEntity = z.infer<typeof selectEntitySchema>;
export type UpdateEntity = z.infer<typeof updateEntitySchema>;

export type InsertBeneficiary = z.infer<typeof insertBeneficiarySchema>;
export type SelectBeneficiary = z.infer<typeof selectBeneficiarySchema>;
export type UpdateBeneficiary = z.infer<typeof updateBeneficiarySchema>;

export type InsertDistribution = z.infer<typeof insertDistributionSchema>;
export type SelectDistribution = z.infer<typeof selectDistributionSchema>;

export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type SelectVehicle = z.infer<typeof selectVehicleSchema>;

export type InsertHomestead = z.infer<typeof insertHomesteadSchema>;
export type SelectHomestead = z.infer<typeof selectHomesteadSchema>;

export type InsertRentalProperty = z.infer<typeof insertRentalPropertySchema>;
export type SelectRentalProperty = z.infer<typeof selectRentalPropertySchema>;

export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;
export type SelectBankAccount = z.infer<typeof selectBankAccountSchema>;

export type InsertInvestmentAccount = z.infer<typeof insertInvestmentAccountSchema>;
export type SelectInvestmentAccount = z.infer<typeof selectInvestmentAccountSchema>;

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type SelectTask = z.infer<typeof selectTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;

export type InsertContact = z.infer<typeof insertContactSchema>;
export type SelectContact = z.infer<typeof selectContactSchema>;

export type InsertTrustee = z.infer<typeof insertTrusteeSchema>;
export type SelectTrustee = z.infer<typeof selectTrusteeSchema>;

export type InsertLiability = z.infer<typeof insertLiabilitySchema>;
export type SelectLiability = z.infer<typeof selectLiabilitySchema>;
export type UpdateLiability = z.infer<typeof updateLiabilitySchema>;

export type InsertLiabilityPayment = z.infer<typeof insertLiabilityPaymentSchema>;
export type SelectLiabilityPayment = z.infer<typeof selectLiabilityPaymentSchema>;

export type InsertHemsRequest = z.infer<typeof insertHemsRequestSchema>;
export type SelectHemsRequest = z.infer<typeof selectHemsRequestSchema>;
export type UpdateHemsRequest = z.infer<typeof updateHemsRequestSchema>;

export type InsertTrusteeFeeSchedule = z.infer<typeof insertTrusteeFeeScheduleSchema>;
export type SelectTrusteeFeeSchedule = z.infer<typeof selectTrusteeFeeScheduleSchema>;

export type InsertTrusteeFeeEntry = z.infer<typeof insertTrusteeFeeEntrySchema>;
export type SelectTrusteeFeeEntry = z.infer<typeof selectTrusteeFeeEntrySchema>;
export type UpdateTrusteeFeeEntry = z.infer<typeof updateTrusteeFeeEntrySchema>;
