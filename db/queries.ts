/**
 * Database Queries
 *
 * Consolidated query functions using the CRUD factory for standard operations.
 * Custom queries are kept for complex operations that need specific logic.
 */
import { eq } from "drizzle-orm"
import {
  type ExpenseType,
  type IncomeType,
  isPrincipalTransaction,
} from "../src/lib/classification-rules"
import { createCrud } from "./crud-factory"
import { generateId } from "./helpers"
import { db } from "./index"
import {
  activityLog,
  artwork,
  bankAccount,
  beneficiary,
  contact,
  distribution,
  entity,
  hemsRequest,
  homestead,
  investmentAccount,
  liability,
  liabilityPayment,
  personalProperty,
  rentalProperty,
  specificBequest,
  task,
  trustAccounting,
  trustee,
  trusteeFeeEntry,
  trusteeFeeSchedule,
  valuation,
  vehicle,
  withdrawalRecord,
} from "./schema"

export { generateId }

// Re-export all Drizzle-inferred types for use in components
export type * from "./schema"

// =============================================================================
// CRUD FACTORIES
// =============================================================================

// Core entities
export const entityCrud = createCrud(entity)
export const beneficiaryCrud = createCrud(beneficiary)
export const contactCrud = createCrud(contact)
export const taskCrud = createCrud(task)
export const distributionCrud = createCrud(distribution)
export const valuationCrud = createCrud(valuation, { hasUpdatedAt: false })

// Assets with entityId filter
export const vehicleCrud = createCrud(vehicle, { filterColumn: "entityId" })
export const homesteadCrud = createCrud(homestead, { filterColumn: "entityId" })
export const rentalPropertyCrud = createCrud(rentalProperty, { filterColumn: "entityId" })
export const bankAccountCrud = createCrud(bankAccount, { filterColumn: "entityId" })
export const investmentAccountCrud = createCrud(investmentAccount, { filterColumn: "entityId" })
export const personalPropertyCrud = createCrud(personalProperty, { filterColumn: "entityId" })
export const artworkCrud = createCrud(artwork, { filterColumn: "entityId" })
export const trusteeCrud = createCrud(trustee, { filterColumn: "entityId" })
export const specificBequestCrud = createCrud(specificBequest, { filterColumn: "entityId" })
export const trustAccountingCrud = createCrud(trustAccounting, { filterColumn: "entityId" })
export const withdrawalRecordCrud = createCrud(withdrawalRecord, { filterColumn: "beneficiaryId" })

// Texas 113.152(5) - Liabilities
export const liabilityCrud = createCrud(liability, { filterColumn: "entityId" })
export const liabilityPaymentCrud = createCrud(liabilityPayment, {
  filterColumn: "liabilityId",
  hasUpdatedAt: false,
})

// HEMS Request Workflow
export const hemsRequestCrud = createCrud(hemsRequest, { filterColumn: "beneficiaryId" })

// Trustee Fee Tracking
export const trusteeFeeScheduleCrud = createCrud(trusteeFeeSchedule, {
  filterColumn: "entityId",
  hasUpdatedAt: false,
})
export const trusteeFeeEntryCrud = createCrud(trusteeFeeEntry, { filterColumn: "entityId" })

// Activity Log (read-only audit trail)
export const activityLogCrud = createCrud(activityLog, { hasUpdatedAt: false })

// =============================================================================
// ENTITY QUERIES (with custom getById for relations)
// =============================================================================

export const getEntities = () => entityCrud.getAll()
export const createEntity = entityCrud.create
export const updateEntity = entityCrud.update
export const deleteEntity = entityCrud.delete

export async function getEntityById(id: string) {
  return db.query.entity.findFirst({
    where: eq(entity.id, id),
    with: {
      vehicles: true,
      homesteads: true,
      rentalProperties: true,
      bankAccounts: true,
      investmentAccounts: true,
      insurancePolicies: true,
      personalProperties: true,
      documents: true,
    },
  })
}

// =============================================================================
// BENEFICIARY QUERIES (with custom getById for distributions)
// =============================================================================

export const getBeneficiaries = () => beneficiaryCrud.getAll()
export const createBeneficiary = beneficiaryCrud.create
export const updateBeneficiary = beneficiaryCrud.update
export const deleteBeneficiary = beneficiaryCrud.delete

export async function getBeneficiaryById(id: string) {
  return db.query.beneficiary.findFirst({
    where: eq(beneficiary.id, id),
    with: {
      distributions: {
        orderBy: (d, { desc }) => [desc(d.distributionDate)],
      },
    },
  })
}

// =============================================================================
// DISTRIBUTION QUERIES
// =============================================================================

export async function getDistributions() {
  return db.query.distribution.findMany({
    with: { beneficiary: true },
    orderBy: (d, { desc }) => [desc(d.distributionDate)],
  })
}

export const createDistribution = distributionCrud.create

// =============================================================================
// VEHICLE QUERIES (with custom getById for relations)
// =============================================================================

export const getVehicles = vehicleCrud.getAll
export const createVehicle = vehicleCrud.create
export const updateVehicle = vehicleCrud.update
export const deleteVehicle = vehicleCrud.delete

export async function getVehicleById(id: string) {
  return db.query.vehicle.findFirst({
    where: eq(vehicle.id, id),
    with: { entity: true, valuations: true, documents: true, transactions: true },
  })
}

// =============================================================================
// HOMESTEAD QUERIES (with custom getById for relations)
// =============================================================================

export const getHomesteads = homesteadCrud.getAll
export const createHomestead = homesteadCrud.create
export const updateHomestead = homesteadCrud.update
export const deleteHomestead = homesteadCrud.delete

export async function getHomesteadById(id: string) {
  return db.query.homestead.findFirst({
    where: eq(homestead.id, id),
    with: { entity: true, valuations: true, documents: true },
  })
}

// =============================================================================
// RENTAL PROPERTY QUERIES (with custom getById for relations)
// =============================================================================

export const getRentalProperties = rentalPropertyCrud.getAll
export const createRentalProperty = rentalPropertyCrud.create
export const updateRentalProperty = rentalPropertyCrud.update
export const deleteRentalProperty = rentalPropertyCrud.delete

export async function getRentalPropertyById(id: string) {
  return db.query.rentalProperty.findFirst({
    where: eq(rentalProperty.id, id),
    with: { entity: true, valuations: true, documents: true, transactions: true },
  })
}

// =============================================================================
// BANK ACCOUNT QUERIES (with custom getById for relations)
// =============================================================================

export const getBankAccounts = bankAccountCrud.getAll
export const createBankAccount = bankAccountCrud.create
export const updateBankAccount = bankAccountCrud.update
export const deleteBankAccount = bankAccountCrud.delete

export async function getBankAccountById(id: string) {
  return db.query.bankAccount.findFirst({
    where: eq(bankAccount.id, id),
    with: { entity: true, valuations: true, documents: true, transactions: true },
  })
}

// =============================================================================
// INVESTMENT ACCOUNT QUERIES
// =============================================================================

export const getInvestmentAccounts = investmentAccountCrud.getAll
export const getInvestmentAccountById = investmentAccountCrud.getById
export const createInvestmentAccount = investmentAccountCrud.create
export const updateInvestmentAccount = investmentAccountCrud.update
export const deleteInvestmentAccount = investmentAccountCrud.delete

// =============================================================================
// PERSONAL PROPERTY QUERIES
// =============================================================================

export const getPersonalProperties = personalPropertyCrud.getAll
export const createPersonalProperty = personalPropertyCrud.create
export const updatePersonalProperty = personalPropertyCrud.update
export const deletePersonalProperty = personalPropertyCrud.delete

// =============================================================================
// VALUATION QUERIES
// =============================================================================

export const createValuation = valuationCrud.create

export async function getValuationsForAsset(assetType: string, assetId: string) {
  const columnMap = {
    vehicle: valuation.vehicleId,
    homestead: valuation.homesteadId,
    rentalProperty: valuation.rentalPropertyId,
    bankAccount: valuation.bankAccountId,
    investmentAccount: valuation.investmentAccountId,
    personalProperty: valuation.personalPropertyId,
  } as const

  const column = columnMap[assetType as keyof typeof columnMap]
  if (!column) throw new Error(`Unknown asset type: ${assetType}`)

  return db.query.valuation.findMany({
    where: eq(column, assetId),
    orderBy: (v, { desc }) => [desc(v.valuationDate)],
  })
}

// =============================================================================
// CONTACT QUERIES
// =============================================================================

export const getContacts = () => contactCrud.getAll()
export const createContact = contactCrud.create
export const updateContact = contactCrud.update
export const deleteContact = contactCrud.delete

// =============================================================================
// TASK QUERIES
// =============================================================================

export const getTasks = () => taskCrud.getAll()
export const createTask = taskCrud.create
export const updateTask = taskCrud.update
export const deleteTask = taskCrud.delete

// =============================================================================
// ARTWORK QUERIES
// =============================================================================

export const getArtworks = artworkCrud.getAll
export const createArtwork = artworkCrud.create
export const updateArtwork = artworkCrud.update
export const deleteArtwork = artworkCrud.delete

// =============================================================================
// TRUSTEE QUERIES
// =============================================================================

export const getTrustees = trusteeCrud.getAll
export const getTrusteeById = trusteeCrud.getById
export const createTrustee = trusteeCrud.create
export const updateTrustee = trusteeCrud.update
export const deleteTrustee = trusteeCrud.delete

// =============================================================================
// SPECIFIC BEQUEST QUERIES
// =============================================================================

export const getSpecificBequests = specificBequestCrud.getAll
export const getSpecificBequestById = specificBequestCrud.getById
export const createSpecificBequest = specificBequestCrud.create
export const updateSpecificBequest = specificBequestCrud.update
export const deleteSpecificBequest = specificBequestCrud.delete

// =============================================================================
// TRUST ACCOUNTING QUERIES
// =============================================================================

export const getTrustAccountingEntries = trustAccountingCrud.getAll
export const updateTrustAccountingEntry = trustAccountingCrud.update
export const deleteTrustAccountingEntry = trustAccountingCrud.delete

/**
 * Create a trust accounting entry with auto-classification
 *
 * Automatically determines isPrincipal based on Texas Property Code 116:
 * - Income types (rent, dividends, interest) → isPrincipal: false
 * - Principal types (capital gains, sale proceeds) → isPrincipal: true
 */
export async function createTrustAccountingEntry(
  data: Parameters<typeof trustAccountingCrud.create>[0],
) {
  // Auto-classify if isPrincipal not explicitly provided
  const isPrincipal =
    data.isPrincipal ??
    isPrincipalTransaction(
      data.incomeType as IncomeType | undefined,
      data.expenseType as ExpenseType | undefined,
      undefined, // category for special rules
    )

  return trustAccountingCrud.create({
    ...data,
    isPrincipal,
  })
}

// =============================================================================
// WITHDRAWAL RECORD QUERIES
// =============================================================================

export const getWithdrawalRecords = withdrawalRecordCrud.getAll
export const createWithdrawalRecord = withdrawalRecordCrud.create
export const updateWithdrawalRecord = withdrawalRecordCrud.update
export const deleteWithdrawalRecord = withdrawalRecordCrud.delete

// =============================================================================
// HEMS REQUEST QUERIES
// =============================================================================

export const getHemsRequests = hemsRequestCrud.getAll
export const getHemsRequestById = hemsRequestCrud.getById
export const createHemsRequest = hemsRequestCrud.create
export const updateHemsRequest = hemsRequestCrud.update
export const deleteHemsRequest = hemsRequestCrud.delete

export async function getHemsRequestsWithBeneficiary(filterValue?: string) {
  return db.query.hemsRequest.findMany({
    where: filterValue ? eq(hemsRequest.beneficiaryId, filterValue) : undefined,
    with: { beneficiary: true },
    orderBy: (r, { desc }) => [desc(r.createdAt)],
  })
}

export async function getPendingHemsRequests() {
  return db.query.hemsRequest.findMany({
    where: eq(hemsRequest.status, "PENDING"),
    with: { beneficiary: true },
    orderBy: (r, { asc }) => [asc(r.createdAt)],
  })
}

// =============================================================================
// TRUSTEE FEE QUERIES
// =============================================================================

export const getTrusteeFeeSchedules = trusteeFeeScheduleCrud.getAll
export const getTrusteeFeeScheduleById = trusteeFeeScheduleCrud.getById
export const createTrusteeFeeSchedule = trusteeFeeScheduleCrud.create
export const updateTrusteeFeeSchedule = trusteeFeeScheduleCrud.update
export const deleteTrusteeFeeSchedule = trusteeFeeScheduleCrud.delete

export const getTrusteeFeeEntries = trusteeFeeEntryCrud.getAll
export const getTrusteeFeeEntryById = trusteeFeeEntryCrud.getById
export const createTrusteeFeeEntry = trusteeFeeEntryCrud.create
export const updateTrusteeFeeEntry = trusteeFeeEntryCrud.update
export const deleteTrusteeFeeEntry = trusteeFeeEntryCrud.delete

export async function getTrusteeFeeEntriesWithSchedule(entityId?: string) {
  return db.query.trusteeFeeEntry.findMany({
    where: entityId ? eq(trusteeFeeEntry.entityId, entityId) : undefined,
    with: { schedule: true, trustee: true },
    orderBy: (e, { desc }) => [desc(e.periodEnd)],
  })
}

// =============================================================================
// LIABILITY PAYMENT QUERIES
// =============================================================================

interface RecordPaymentData {
  liabilityId: string
  paymentDate: string
  amount: string
  principalPortion?: string | null
  interestPortion?: string | null
  escrowPortion?: string | null
  paymentMethod?: "CHECK" | "ACH" | "WIRE" | "CASH" | "OTHER" | null
  checkNumber?: string | null
  confirmationNumber?: string | null
  notes?: string | null
  createExpenseEntry?: boolean // Whether to auto-create trust accounting entry
}

export async function recordLiabilityPayment(data: RecordPaymentData) {
  // 1. Get the liability to update and get entityId
  const liabilityRecord = await db.query.liability.findFirst({
    where: eq(liability.id, data.liabilityId),
  })

  if (!liabilityRecord) {
    throw new Error("Liability not found")
  }

  const paymentId = generateId()
  const paymentAmount = parseFloat(data.amount) || 0
  const currentBalance = parseFloat(liabilityRecord.currentBalance || "0") || 0
  const newBalance = Math.max(0, currentBalance - paymentAmount)

  // 2. Create the payment record
  await db.insert(liabilityPayment).values({
    id: paymentId,
    liabilityId: data.liabilityId,
    paymentDate: data.paymentDate,
    amount: data.amount,
    principalPortion: data.principalPortion || null,
    interestPortion: data.interestPortion || null,
    escrowPortion: data.escrowPortion || null,
    paymentMethod: data.paymentMethod || null,
    checkNumber: data.checkNumber || null,
    confirmationNumber: data.confirmationNumber || null,
    notes: data.notes || null,
  })

  // 3. Update the liability's current balance
  await db
    .update(liability)
    .set({
      currentBalance: newBalance.toFixed(2),
      currentBalanceDate: data.paymentDate,
    })
    .where(eq(liability.id, data.liabilityId))

  // 4. Optionally create a trust accounting expense entry
  let accountingEntry = null
  if (data.createExpenseEntry !== false) {
    const accountingId = generateId()
    const expenseDescription = `${liabilityRecord.liabilityType.replace(/_/g, " ")} payment to ${liabilityRecord.creditor}`

    // Determine if principal based on liability's allocation class
    const isPrincipal = liabilityRecord.allocationClass === "PRINCIPAL"

    // Determine expense type based on liability type
    const expenseType = liabilityRecord.liabilityType === "TAX_OWED" ? "TAX" : "OTHER"

    await db.insert(trustAccounting).values({
      id: accountingId,
      entityId: liabilityRecord.entityId,
      accountingDate: data.paymentDate,
      entryType: "EXPENSE",
      expenseType,
      amount: data.amount,
      description: expenseDescription,
      isPrincipal,
      taxDeductible:
        liabilityRecord.liabilityType === "MORTGAGE" ||
        liabilityRecord.liabilityType === "TAX_OWED",
      checkNumber: data.checkNumber || data.confirmationNumber || null,
      fiscalYear: new Date(data.paymentDate).getFullYear(),
      sourceAssetType: "LIABILITY",
      sourceAssetId: data.liabilityId,
      updatedAt: new Date().toISOString(),
    })

    accountingEntry = { id: accountingId }
  }

  // Return the payment with updated liability info
  return {
    payment: { id: paymentId, ...data },
    liability: {
      id: liabilityRecord.id,
      currentBalance: newBalance.toFixed(2),
    },
    accountingEntry,
  }
}

export async function getLiabilityPayments(liabilityId: string) {
  return db.query.liabilityPayment.findMany({
    where: eq(liabilityPayment.liabilityId, liabilityId),
    orderBy: (p, { desc }) => [desc(p.paymentDate)],
  })
}

// =============================================================================
// PostgreSQL 17 ADVANCED FEATURES
// =============================================================================

import { sql } from "drizzle-orm"

/**
 * PostgreSQL 17 JSON_TABLE - Extract structured data from ActivityLog JSONB columns
 *
 * This function demonstrates PostgreSQL 17's JSON_TABLE feature for extracting
 * structured data from JSONB columns without manual parsing in application code.
 *
 * Use case: Audit trail queries that need to analyze specific field changes
 * across multiple log entries.
 *
 * @param recordId - The record ID to fetch activity logs for
 * @returns Activity log entries with extracted JSONB fields
 */
export async function getActivityLogWithChanges(recordId: string) {
  return db.execute(sql`
    SELECT
      al.id,
      al.table_name,
      al.record_id,
      al.action,
      al.changed_by,
      al.created_at,
      old_data.value as old_value,
      old_data.status as old_status,
      new_data.value as new_value,
      new_data.status as new_status
    FROM "ActivityLog" al
    LEFT JOIN LATERAL json_table(
      al.old_values,
      '$' COLUMNS (
        value TEXT PATH '$.value',
        status TEXT PATH '$.status'
      )
    ) AS old_data ON true
    LEFT JOIN LATERAL json_table(
      al.new_values,
      '$' COLUMNS (
        value TEXT PATH '$.value',
        status TEXT PATH '$.status'
      )
    ) AS new_data ON true
    WHERE al.record_id = ${recordId}
    ORDER BY al.created_at DESC
  `)
}

/**
 * Search ActivityLog for changes to specific fields using JSON_TABLE
 *
 * Example: Find all entries where status changed from "ACTIVE" to "INACTIVE"
 *
 * @param fieldName - The JSONB field name to search for (e.g., "status", "value")
 * @param fieldValue - The value to match
 * @returns Matching activity log entries with extracted field values
 */
export async function searchActivityLogByField(fieldName: string, fieldValue: string) {
  // Use parameterized query for field value, but field name must be static
  // This is safe because fieldName is controlled by application code
  const query = sql.raw(`
    SELECT
      al.id,
      al.table_name,
      al.record_id,
      al.action,
      al.changed_by,
      al.created_at,
      field_data.value as field_value
    FROM "ActivityLog" al
    LEFT JOIN LATERAL json_table(
      al.new_values,
      '$' COLUMNS (
        value TEXT PATH '$.${fieldName}'
      )
    ) AS field_data ON true
    WHERE field_data.value = '${fieldValue}'
    ORDER BY al.created_at DESC
    LIMIT 100
  `)

  return db.execute(query)
}
