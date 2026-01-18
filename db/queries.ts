/**
 * Database Queries
 *
 * Consolidated query functions using the CRUD factory for standard operations.
 * Custom queries are kept for complex operations that need specific logic.
 */
import { desc, eq } from 'drizzle-orm'
import { calculatePaymentSplit } from '../src/lib/amortization'
import {
    type ExpenseType,
    type IncomeType,
    isPrincipalTransaction,
} from '../src/lib/classification-rules'
import { createCrud } from './crud-factory'
// generateId removed - using database IDENTITY columns
import { db } from './index'
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
} from './schema'

// generateId export removed - IDs now database-generated

// Re-export all Drizzle-inferred types for use in components
export type * from './schema'

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
export const vehicleCrud = createCrud(vehicle, { filterColumn: 'entityId' })
export const homesteadCrud = createCrud(homestead, { filterColumn: 'entityId' })
export const rentalPropertyCrud = createCrud(rentalProperty, {
    filterColumn: 'entityId',
})
export const bankAccountCrud = createCrud(bankAccount, {
    filterColumn: 'entityId',
})
export const investmentAccountCrud = createCrud(investmentAccount, {
    filterColumn: 'entityId',
})
export const personalPropertyCrud = createCrud(personalProperty, {
    filterColumn: 'entityId',
})
export const artworkCrud = createCrud(artwork, { filterColumn: 'entityId' })
export const trusteeCrud = createCrud(trustee, { filterColumn: 'entityId' })
export const specificBequestCrud = createCrud(specificBequest, {
    filterColumn: 'entityId',
})
export const trustAccountingCrud = createCrud(trustAccounting, {
    filterColumn: 'entityId',
})
export const withdrawalRecordCrud = createCrud(withdrawalRecord, {
    filterColumn: 'beneficiaryId',
})

// Texas 113.152(5) - Liabilities
export const liabilityCrud = createCrud(liability, { filterColumn: 'entityId' })
export const liabilityPaymentCrud = createCrud(liabilityPayment, {
    filterColumn: 'liabilityId',
    hasUpdatedAt: false,
})

// HEMS Request Workflow
export const hemsRequestCrud = createCrud(hemsRequest, {
    filterColumn: 'beneficiaryId',
})

// Trustee Fee Tracking
export const trusteeFeeScheduleCrud = createCrud(trusteeFeeSchedule, {
    filterColumn: 'entityId',
    hasUpdatedAt: false,
})
export const trusteeFeeEntryCrud = createCrud(trusteeFeeEntry, {
    filterColumn: 'entityId',
})

// Activity Log (read-only audit trail)
export const activityLogCrud = createCrud(activityLog, { hasUpdatedAt: false })

// =============================================================================
// ENTITY QUERIES (with custom getById for relations)
// =============================================================================

export const getEntities = () => entityCrud.getAll()
export const createEntity = entityCrud.create
export const updateEntity = entityCrud.update
export const deleteEntity = entityCrud.delete

export async function getEntityById(id: number) {
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

export async function getBeneficiaryById(id: number) {
    return db.query.beneficiary.findFirst({
        where: eq(beneficiary.id, id),
        with: {
            distributions: {
                orderBy: (d, { desc }) => [desc(d.distributionDate)],
            },
        },
    })
}

export async function getBeneficiariesWithDistributions(entityId?: number) {
    return db.query.beneficiary.findMany({
        where: entityId ? eq(beneficiary.entityId, entityId) : undefined,
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

export async function getVehicleById(id: number) {
    return db.query.vehicle.findFirst({
        where: eq(vehicle.id, id),
        with: {
            entity: true,
            valuations: true,
            documents: true,
            transactions: true,
        },
    })
}

// =============================================================================
// HOMESTEAD QUERIES (with custom getById for relations)
// =============================================================================

export const getHomesteads = homesteadCrud.getAll
export const createHomestead = homesteadCrud.create
export const updateHomestead = homesteadCrud.update
export const deleteHomestead = homesteadCrud.delete

export async function getHomesteadById(id: number) {
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

export async function getRentalPropertyById(id: number) {
    return db.query.rentalProperty.findFirst({
        where: eq(rentalProperty.id, id),
        with: {
            entity: true,
            valuations: true,
            documents: true,
            transactions: true,
        },
    })
}

// =============================================================================
// BANK ACCOUNT QUERIES (with custom getById for relations)
// =============================================================================

export const getBankAccounts = bankAccountCrud.getAll
export const createBankAccount = bankAccountCrud.create
export const updateBankAccount = bankAccountCrud.update
export const deleteBankAccount = bankAccountCrud.delete

export async function getBankAccountById(id: number) {
    return db.query.bankAccount.findFirst({
        where: eq(bankAccount.id, id),
        with: {
            entity: true,
            valuations: true,
            documents: true,
            transactions: true,
        },
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

export async function getValuationsForAsset(
    assetType: string,
    assetId: number,
) {
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

export async function getHemsRequestsWithBeneficiary(filterValue?: number) {
    return db.query.hemsRequest.findMany({
        where: filterValue
            ? eq(hemsRequest.beneficiaryId, filterValue)
            : undefined,
        with: { beneficiary: true },
        orderBy: (r, { desc }) => [desc(r.createdAt)],
    })
}

export async function getPendingHemsRequests() {
    return db.query.hemsRequest.findMany({
        where: eq(hemsRequest.status, 'PENDING'),
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

export async function getTrusteeFeeEntriesWithSchedule(entityId?: number) {
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
    liabilityId: number
    paymentDate: string
    amount: string
    bankAccountId: number // Required: which account the payment came from
    principalPortion?: string | null
    interestPortion?: string | null
    escrowPortion?: string | null
    paymentMethod?: 'CHECK' | 'ACH' | 'WIRE' | 'CASH' | 'OTHER' | null
    checkNumber?: string | null
    confirmationNumber?: string | null
    notes?: string | null
    createExpenseEntry?: boolean // Whether to auto-create trust accounting entry
    allocationClass?: 'PRINCIPAL' | 'INCOME' | null // For trust accounting
}

export async function recordLiabilityPayment(data: RecordPaymentData) {
    // 1. Get the liability to update and get entityId
    const liabilityRecord = await db.query.liability.findFirst({
        where: eq(liability.id, data.liabilityId),
    })

    if (!liabilityRecord) {
        throw new Error('Liability not found')
    }

    // 2. Auto-calculate principal/interest split if applicable
    // Conditions: has interest rate, not revolving credit, user didn't provide portions
    const shouldAutoCalculate =
        liabilityRecord.interestRate &&
        parseFloat(liabilityRecord.interestRate) > 0 &&
        !liabilityRecord.isRevolvingCredit &&
        !data.principalPortion &&
        !data.interestPortion

    let calculatedSplit: {
        principal: string
        interest: string
        escrow: string
        newBalance: string
    } | null = null

    if (shouldAutoCalculate && liabilityRecord.interestRate) {
        calculatedSplit = calculatePaymentSplit(
            liabilityRecord.currentBalance || '0',
            liabilityRecord.interestRate,
            data.amount,
            data.escrowPortion || liabilityRecord.escrowMonthly || undefined,
        )
    }

    // Determine final values for principal/interest/escrow
    const principalPortion =
        data.principalPortion || calculatedSplit?.principal || null
    const interestPortion =
        data.interestPortion || calculatedSplit?.interest || null
    const escrowPortion = data.escrowPortion || calculatedSplit?.escrow || null

    // Calculate new balance - use calculated if available, otherwise simple subtraction
    const paymentAmount = parseFloat(data.amount) || 0
    const currentBalance =
        parseFloat(liabilityRecord.currentBalance || '0') || 0
    const newBalance = calculatedSplit
        ? parseFloat(calculatedSplit.newBalance)
        : Math.max(0, currentBalance - paymentAmount)

    // 3. Create the payment record
    const [payment] = await db.insert(liabilityPayment).values({
        liabilityId: data.liabilityId,
        paymentDate: data.paymentDate,
        amount: data.amount,
        principalPortion,
        interestPortion,
        escrowPortion,
        paymentMethod: data.paymentMethod || null,
        checkNumber: data.checkNumber || null,
        confirmationNumber: data.confirmationNumber || null,
        notes: data.notes || null,
    }).returning()
    if (!payment) throw new Error('Failed to create payment record')

    // 3. Update the liability's current balance
    await db
        .update(liability)
        .set({
            currentBalance: newBalance.toFixed(2),
            currentBalanceDate: data.paymentDate,
        })
        .where(eq(liability.id, data.liabilityId))

    // 4. Optionally create a trust accounting expense entry
    let accountingEntry: { id: number } | null = null
    if (data.createExpenseEntry !== false) {
        const expenseDescription = `${liabilityRecord.liabilityType.replace(/_/g, ' ')} payment to ${liabilityRecord.creditor}`

        // Determine if principal based on payment's allocation class (or fallback to liability's)
        const effectiveAllocation =
            data.allocationClass ||
            liabilityRecord.allocationClass ||
            'PRINCIPAL'
        const isPrincipal = effectiveAllocation === 'PRINCIPAL'

        // Determine expense type based on liability type
        const expenseType =
            liabilityRecord.liabilityType === 'TAX_OWED' ? 'TAX' : 'OTHER'

        const [entry] = await db.insert(trustAccounting).values({
            entityId: liabilityRecord.entityId,
            accountingDate: data.paymentDate,
            entryType: 'EXPENSE',
            expenseType,
            amount: data.amount,
            description: expenseDescription,
            bankAccountId: data.bankAccountId,
            isPrincipal,
            taxDeductible:
                liabilityRecord.liabilityType === 'MORTGAGE' ||
                liabilityRecord.liabilityType === 'TAX_OWED',
            checkNumber: data.checkNumber || data.confirmationNumber || null,
            fiscalYear: new Date(data.paymentDate).getFullYear(),
            sourceAssetType: 'LIABILITY',
            sourceAssetId: data.liabilityId,
            updatedAt: new Date().toISOString(),
        }).returning()
        if (!entry) throw new Error('Failed to create accounting entry')

        accountingEntry = { id: entry.id }
    }

    // Return the payment with updated liability info and calculated split
    return {
        payment: {
            id: payment.id,
            ...data,
            principalPortion,
            interestPortion,
            escrowPortion,
        },
        liability: {
            id: liabilityRecord.id,
            currentBalance: newBalance.toFixed(2),
        },
        accountingEntry,
        // Include calculated split info so UI can show auto-calculated values
        autoCalculated: calculatedSplit
            ? {
                  principal: calculatedSplit.principal,
                  interest: calculatedSplit.interest,
                  escrow: calculatedSplit.escrow,
              }
            : null,
    }
}

export async function getLiabilityPayments(liabilityId: number) {
    return db.query.liabilityPayment.findMany({
        where: eq(liabilityPayment.liabilityId, liabilityId),
        orderBy: (p, { desc }) => [desc(p.paymentDate)],
    })
}

// =============================================================================
// PostgreSQL 17 ADVANCED FEATURES
// =============================================================================

import { sql } from 'drizzle-orm'

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

// =============================================================================
// BENEFICIARY DEATH HANDLING - Trust Section 7.01
// If beneficiary dies before complete distribution without exercising LPOA,
// their share goes pro-rata to other beneficiaries
// =============================================================================

interface MarkDeceasedData {
    beneficiaryId: number
    deceasedDate: string
}

/**
 * Mark a beneficiary as deceased and recalculate shares
 *
 * Per Trust Section 7.01: If a beneficiary dies before complete distribution,
 * their share goes pro-rata to other living beneficiaries.
 */
export async function markBeneficiaryDeceased(data: MarkDeceasedData) {
    // 1. Update the beneficiary record
    await db
        .update(beneficiary)
        .set({
            deceasedDate: data.deceasedDate,
            updatedAt: new Date().toISOString(),
        })
        .where(eq(beneficiary.id, data.beneficiaryId))

    // 2. Get the deceased beneficiary's info
    const deceased = await db.query.beneficiary.findFirst({
        where: eq(beneficiary.id, data.beneficiaryId),
    })

    if (!deceased || !deceased.entityId) {
        return { success: true, shareRecalculated: false }
    }

    // 3. Recalculate shares for remaining beneficiaries
    return recalculateBeneficiaryShares(deceased.entityId, data.beneficiaryId)
}

/**
 * Recalculate beneficiary shares when a beneficiary dies without exercising LPOA
 *
 * The deceased beneficiary's share is distributed pro-rata among remaining
 * living beneficiaries based on their current share percentages.
 */
export async function recalculateBeneficiaryShares(
    entityId: number,
    excludeBeneficiaryId: number,
) {
    // Get all beneficiaries for this entity
    const allBeneficiaries = await db.query.beneficiary.findMany({
        where: eq(beneficiary.entityId, entityId),
    })

    // Find deceased and living beneficiaries
    const deceased = allBeneficiaries.find((b) => b.id === excludeBeneficiaryId)
    const living = allBeneficiaries.filter(
        (b) => b.id !== excludeBeneficiaryId && !b.deceasedDate,
    )

    if (!deceased || !deceased.sharePercent) {
        return { success: true, shareRecalculated: false }
    }

    const deceasedShare = parseFloat(deceased.sharePercent)

    // Calculate total shares of living beneficiaries
    const totalLivingShares = living.reduce((sum, b) => {
        return sum + (parseFloat(b.sharePercent || '0') || 0)
    }, 0)

    if (totalLivingShares <= 0) {
        return {
            success: true,
            shareRecalculated: false,
            error: 'No living beneficiaries',
        }
    }

    // Distribute deceased's share pro-rata
    const updates: { id: number; newShare: string }[] = []

    for (const b of living) {
        const currentShare = parseFloat(b.sharePercent || '0') || 0
        const proportion = currentShare / totalLivingShares
        const additionalShare = deceasedShare * proportion
        const newShare = (currentShare + additionalShare).toFixed(2)

        await db
            .update(beneficiary)
            .set({
                sharePercent: newShare,
                updatedAt: new Date().toISOString(),
            })
            .where(eq(beneficiary.id, b.id))

        updates.push({ id: b.id, newShare })
    }

    // Zero out the deceased beneficiary's share
    await db
        .update(beneficiary)
        .set({
            sharePercent: '0.00',
            updatedAt: new Date().toISOString(),
        })
        .where(eq(beneficiary.id, excludeBeneficiaryId))

    return {
        success: true,
        shareRecalculated: true,
        deceasedShare,
        updates,
    }
}

// =============================================================================
// INCOME TO PRINCIPAL CONVERSION - Trust Section 7.10(c)
// "All income not distributed shall be added to principal at least annually"
// =============================================================================

/**
 * Convert undistributed income to principal for a fiscal year
 *
 * Per Trust Section 7.10(c): All income not distributed shall be added
 * to principal at least annually. This function marks income entries as
 * converted and creates corresponding principal entries.
 */
export async function convertIncomeToPrincipal(
    entityId: number,
    fiscalYear: number,
    bankAccountId: number,
) {
    // 1. Find all unconverted income entries for the fiscal year
    const incomeEntries = await db.query.trustAccounting.findMany({
        where: (ta, { and, eq: eqOp }) =>
            and(
                eqOp(ta.entityId, entityId),
                eqOp(ta.entryType, 'INCOME'),
                eqOp(ta.isPrincipal, false),
                eqOp(ta.convertedToPrincipal, false),
                eqOp(ta.fiscalYear, fiscalYear),
            ),
    })

    if (incomeEntries.length === 0) {
        return {
            success: true,
            converted: 0,
            totalAmount: '0.00',
            entries: [],
        }
    }

    // 2. Calculate total income to convert
    const totalIncome = incomeEntries.reduce(
        (sum, entry) => sum + (parseFloat(entry.amount) || 0),
        0,
    )

    const now = new Date().toISOString()

    // 3. Create a principal entry for the converted income
    const [principalEntry] = await db.insert(trustAccounting).values({
        entityId,
        accountingDate: now,
        entryType: 'INCOME', // It's still income, but now classified as principal
        incomeType: 'INCOME_TO_PRINCIPAL_CONVERSION',
        amount: totalIncome.toFixed(2),
        description: `FY${fiscalYear} undistributed income added to principal per Trust Section 7.10(c)`,
        bankAccountId,
        isPrincipal: true, // Now treated as principal
        fiscalYear,
        notes: `Converted ${incomeEntries.length} income entries totaling $${totalIncome.toFixed(2)}`,
        updatedAt: now,
    }).returning()
    if (!principalEntry) throw new Error('Failed to create principal entry')

    // 4. Mark all the original income entries as converted
    const convertedIds: number[] = []
    for (const entry of incomeEntries) {
        await db
            .update(trustAccounting)
            .set({
                convertedToPrincipal: true,
                conversionDate: now,
                conversionEntryId: principalEntry.id,
                updatedAt: now,
            })
            .where(eq(trustAccounting.id, entry.id))
        convertedIds.push(entry.id)
    }

    return {
        success: true,
        converted: incomeEntries.length,
        totalAmount: totalIncome.toFixed(2),
        principalEntryId: principalEntry.id,
        convertedIds,
    }
}

/**
 * Get summary of unconverted income by fiscal year
 */
export async function getUnconvertedIncomeSummary(entityId: number) {
    const entries = await db.query.trustAccounting.findMany({
        where: (ta, { and, eq: eqOp }) =>
            and(
                eqOp(ta.entityId, entityId),
                eqOp(ta.entryType, 'INCOME'),
                eqOp(ta.isPrincipal, false),
                eqOp(ta.convertedToPrincipal, false),
            ),
        orderBy: (ta, { asc }) => [asc(ta.fiscalYear)],
    })

    // Group by fiscal year
    const byYear: Record<number, { count: number; total: number }> = {}
    for (const entry of entries) {
        const year =
            entry.fiscalYear || new Date(entry.accountingDate).getFullYear()
        if (!byYear[year]) {
            byYear[year] = { count: 0, total: 0 }
        }
        byYear[year].count++
        byYear[year].total += parseFloat(entry.amount) || 0
    }

    return Object.entries(byYear).map(([year, data]) => ({
        fiscalYear: parseInt(year, 10),
        entryCount: data.count,
        totalAmount: data.total.toFixed(2),
    }))
}

/**
 * Allowlist of searchable fields in ActivityLog newValues JSONB column.
 * Only these fields can be searched to prevent SQL injection.
 */
export const SEARCHABLE_ACTIVITY_LOG_FIELDS = [
    'status',
    'amount',
    'currentBalance',
    'name',
    'firstName',
    'lastName',
    'email',
    'action',
    'category',
    'distributionType',
    'liabilityType',
    'paymentMethod',
] as const

export type SearchableActivityLogField =
    (typeof SEARCHABLE_ACTIVITY_LOG_FIELDS)[number]

/**
 * Type guard to validate field name is in allowlist
 */
export function isSearchableActivityLogField(
    field: string,
): field is SearchableActivityLogField {
    return SEARCHABLE_ACTIVITY_LOG_FIELDS.includes(
        field as SearchableActivityLogField,
    )
}

/**
 * Search ActivityLog for changes to specific fields using JSONB operators
 *
 * SECURITY: Uses allowlist for field names and parameterized queries for values
 * to prevent SQL injection attacks.
 *
 * Example: Find all entries where status changed to "ACTIVE"
 *
 * @param fieldName - The JSONB field name to search for (must be in allowlist)
 * @param fieldValue - The value to match (safely parameterized)
 * @returns Matching activity log entries with extracted field values
 */
export async function searchActivityLogByField(
    fieldName: SearchableActivityLogField,
    fieldValue: string,
) {
    // Validate field name against allowlist (defense in depth - TypeScript enforces this too)
    if (!isSearchableActivityLogField(fieldName)) {
        throw new Error(
            `Invalid field name: ${fieldName}. Allowed fields: ${SEARCHABLE_ACTIVITY_LOG_FIELDS.join(', ')}`,
        )
    }

    // Use parameterized query with JSONB ->> operator
    // The field name is from allowlist (safe), the value is parameterized (safe)
    return db
        .select({
            id: activityLog.id,
            tableName: activityLog.tableName,
            recordId: activityLog.recordId,
            action: activityLog.action,
            changedBy: activityLog.changedBy,
            createdAt: activityLog.createdAt,
            // Extract the field value from newValues JSONB
            fieldValue: sql<string>`${activityLog.newValues}->>${fieldName}`,
        })
        .from(activityLog)
        .where(sql`${activityLog.newValues}->>${fieldName} = ${fieldValue}`)
        .orderBy(desc(activityLog.createdAt))
        .limit(100)
}
