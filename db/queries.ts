/**
 * Database Queries
 *
 * Direct Drizzle queries for all database operations.
 * No generic factory - just straightforward type-safe queries.
 */
import { and, desc, eq, sql } from 'drizzle-orm'
import { calculatePaymentSplit } from '../src/lib/amortization'
import {
    type ExpenseType,
    type IncomeType,
    isPrincipalTransaction,
} from '../src/lib/classification-rules'
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
    insurancePolicy,
    investmentAccount,
    liability,
    liabilityPayment,
    pendingInventoryItem,
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

// Re-export all Drizzle-inferred types for use in components
export type * from './schema'

// =============================================================================
// ENTITY QUERIES
// =============================================================================

export async function getEntities() {
    return db.select().from(entity)
}

/**
 * Get entity by ID with all related assets (heavy query)
 * Use getEntityByIdLite() when you only need entity fields
 */
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

/**
 * PERF: Lite variant - returns only entity fields without relations
 * Use for dashboards, dropdowns, and contexts where relations aren't needed
 */
export async function getEntityByIdLite(id: number) {
    return db.query.entity.findFirst({
        where: eq(entity.id, id),
    })
}

export async function createEntity(data: typeof entity.$inferInsert) {
    const [created] = await db
        .insert(entity)
        .values({ ...data, updatedAt: new Date().toISOString() })
        .returning()
    return created
}

export async function updateEntity(
    id: number,
    data: Partial<typeof entity.$inferInsert>,
) {
    const [updated] = await db
        .update(entity)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(entity.id, id))
        .returning()
    return updated
}

export async function deleteEntity(id: number) {
    const [deleted] = await db
        .delete(entity)
        .where(eq(entity.id, id))
        .returning()
    return deleted
}

// =============================================================================
// BENEFICIARY QUERIES
// =============================================================================

export async function getBeneficiaries(entityId?: number) {
    if (entityId) {
        return db
            .select()
            .from(beneficiary)
            .where(eq(beneficiary.entityId, entityId))
    }
    return db.select().from(beneficiary)
}

/**
 * Get beneficiary by ID with recent distributions
 * Use getBeneficiaryByIdLite() when you only need beneficiary fields
 */
export async function getBeneficiaryById(id: number) {
    return db.query.beneficiary.findFirst({
        where: eq(beneficiary.id, id),
        with: {
            distributions: {
                orderBy: (d, { desc }) => [desc(d.distributionDate)],
                limit: 20, // PERF: Limit to recent distributions
            },
        },
    })
}

/**
 * PERF: Lite variant - returns only beneficiary fields without relations
 * Use for dropdowns, validation checks, and contexts where relations aren't needed
 */
export async function getBeneficiaryByIdLite(id: number) {
    return db.query.beneficiary.findFirst({
        where: eq(beneficiary.id, id),
    })
}

interface BeneficiaryDistributionOptions {
    limit?: number
    offset?: number
    distributionLimit?: number // Limit distributions per beneficiary
}

/**
 * Get beneficiaries with their distributions (paginated)
 * PERF: Limits both beneficiaries and distributions per beneficiary
 */
export async function getBeneficiariesWithDistributions(
    entityId?: number,
    options?: BeneficiaryDistributionOptions,
) {
    return db.query.beneficiary.findMany({
        where: entityId ? eq(beneficiary.entityId, entityId) : undefined,
        with: {
            distributions: {
                orderBy: (d, { desc }) => [desc(d.distributionDate)],
                limit: options?.distributionLimit ?? 20, // Limit distributions per beneficiary
            },
        },
        limit: options?.limit ?? 100,
        offset: options?.offset ?? 0,
    })
}

export async function createBeneficiary(data: typeof beneficiary.$inferInsert) {
    const [created] = await db
        .insert(beneficiary)
        .values({ ...data, updatedAt: new Date().toISOString() })
        .returning()
    return created
}

export async function updateBeneficiary(
    id: number,
    data: Partial<typeof beneficiary.$inferInsert>,
) {
    const [updated] = await db
        .update(beneficiary)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(beneficiary.id, id))
        .returning()
    return updated
}

export async function deleteBeneficiary(id: number) {
    const [deleted] = await db
        .delete(beneficiary)
        .where(eq(beneficiary.id, id))
        .returning()
    return deleted
}

// =============================================================================
// DISTRIBUTION QUERIES
// =============================================================================

export async function getDistributions(entityId?: number) {
    return db.query.distribution.findMany({
        where: entityId ? eq(distribution.entityId, entityId) : undefined,
        with: { beneficiary: true },
        orderBy: (d, { desc }) => [desc(d.distributionDate)],
    })
}

export async function getDistributionsByBeneficiary(beneficiaryId: number) {
    return db.query.distribution.findMany({
        where: eq(distribution.beneficiaryId, beneficiaryId),
        with: { beneficiary: true },
        orderBy: (d, { desc }) => [desc(d.distributionDate)],
    })
}

export async function createDistribution(
    data: typeof distribution.$inferInsert,
) {
    const [created] = await db
        .insert(distribution)
        .values({ ...data, updatedAt: new Date().toISOString() })
        .returning()
    return created
}

// =============================================================================
// VEHICLE QUERIES
// =============================================================================

export async function getVehicles(entityId?: number) {
    if (entityId) {
        return db.select().from(vehicle).where(eq(vehicle.entityId, entityId))
    }
    return db.select().from(vehicle)
}

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

export async function createVehicle(data: typeof vehicle.$inferInsert) {
    const [created] = await db
        .insert(vehicle)
        .values({ ...data, updatedAt: new Date().toISOString() })
        .returning()
    return created
}

export async function updateVehicle(
    id: number,
    data: Partial<typeof vehicle.$inferInsert>,
) {
    const [updated] = await db
        .update(vehicle)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(vehicle.id, id))
        .returning()
    return updated
}

export async function deleteVehicle(id: number) {
    const [deleted] = await db
        .delete(vehicle)
        .where(eq(vehicle.id, id))
        .returning()
    return deleted
}

// =============================================================================
// HOMESTEAD QUERIES
// =============================================================================

export async function getHomesteads(entityId?: number) {
    if (entityId) {
        return db
            .select()
            .from(homestead)
            .where(eq(homestead.entityId, entityId))
    }
    return db.select().from(homestead)
}

export async function getHomesteadById(id: number) {
    return db.query.homestead.findFirst({
        where: eq(homestead.id, id),
        with: {
            entity: true,
            valuations: true,
            documents: true,
            transactions: true,
        },
    })
}

export async function createHomestead(data: typeof homestead.$inferInsert) {
    const [created] = await db
        .insert(homestead)
        .values({ ...data, updatedAt: new Date().toISOString() })
        .returning()
    return created
}

export async function updateHomestead(
    id: number,
    data: Partial<typeof homestead.$inferInsert>,
) {
    const [updated] = await db
        .update(homestead)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(homestead.id, id))
        .returning()
    return updated
}

export async function deleteHomestead(id: number) {
    const [deleted] = await db
        .delete(homestead)
        .where(eq(homestead.id, id))
        .returning()
    return deleted
}

// =============================================================================
// RENTAL PROPERTY QUERIES
// =============================================================================

export async function getRentalProperties(entityId?: number) {
    if (entityId) {
        return db
            .select()
            .from(rentalProperty)
            .where(eq(rentalProperty.entityId, entityId))
    }
    return db.select().from(rentalProperty)
}

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

export async function createRentalProperty(
    data: typeof rentalProperty.$inferInsert,
) {
    const [created] = await db
        .insert(rentalProperty)
        .values({ ...data, updatedAt: new Date().toISOString() })
        .returning()
    return created
}

export async function updateRentalProperty(
    id: number,
    data: Partial<typeof rentalProperty.$inferInsert>,
) {
    const [updated] = await db
        .update(rentalProperty)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(rentalProperty.id, id))
        .returning()
    return updated
}

export async function deleteRentalProperty(id: number) {
    const [deleted] = await db
        .delete(rentalProperty)
        .where(eq(rentalProperty.id, id))
        .returning()
    return deleted
}

// =============================================================================
// BANK ACCOUNT QUERIES
// =============================================================================

export async function getBankAccounts(entityId?: number) {
    if (entityId) {
        return db
            .select()
            .from(bankAccount)
            .where(eq(bankAccount.entityId, entityId))
    }
    return db.select().from(bankAccount)
}

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

export async function createBankAccount(data: typeof bankAccount.$inferInsert) {
    const [created] = await db
        .insert(bankAccount)
        .values({ ...data, updatedAt: new Date().toISOString() })
        .returning()
    return created
}

export async function updateBankAccount(
    id: number,
    data: Partial<typeof bankAccount.$inferInsert>,
) {
    const [updated] = await db
        .update(bankAccount)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(bankAccount.id, id))
        .returning()
    return updated
}

export async function deleteBankAccount(id: number) {
    const [deleted] = await db
        .delete(bankAccount)
        .where(eq(bankAccount.id, id))
        .returning()
    return deleted
}

// =============================================================================
// INVESTMENT ACCOUNT QUERIES
// =============================================================================

export async function getInvestmentAccounts(entityId?: number) {
    if (entityId) {
        return db
            .select()
            .from(investmentAccount)
            .where(eq(investmentAccount.entityId, entityId))
    }
    return db.select().from(investmentAccount)
}

export async function getInvestmentAccountById(id: number) {
    return db.query.investmentAccount.findFirst({
        where: eq(investmentAccount.id, id),
        with: {
            entity: true,
            valuations: true,
            documents: true,
        },
    })
}

export async function createInvestmentAccount(
    data: typeof investmentAccount.$inferInsert,
) {
    const [created] = await db
        .insert(investmentAccount)
        .values({ ...data, updatedAt: new Date().toISOString() })
        .returning()
    return created
}

export async function updateInvestmentAccount(
    id: number,
    data: Partial<typeof investmentAccount.$inferInsert>,
) {
    const [updated] = await db
        .update(investmentAccount)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(investmentAccount.id, id))
        .returning()
    return updated
}

export async function deleteInvestmentAccount(id: number) {
    const [deleted] = await db
        .delete(investmentAccount)
        .where(eq(investmentAccount.id, id))
        .returning()
    return deleted
}

// =============================================================================
// INSURANCE POLICY QUERIES
// =============================================================================

export async function getInsurancePolicies(entityId?: number) {
    if (entityId) {
        return db
            .select()
            .from(insurancePolicy)
            .where(eq(insurancePolicy.entityId, entityId))
    }
    return db.select().from(insurancePolicy)
}

export async function getInsurancePolicyById(id: number) {
    return db.query.insurancePolicy.findFirst({
        where: eq(insurancePolicy.id, id),
    })
}

export async function createInsurancePolicy(
    data: typeof insurancePolicy.$inferInsert,
) {
    const [created] = await db
        .insert(insurancePolicy)
        .values({ ...data, updatedAt: new Date().toISOString() })
        .returning()
    return created
}

export async function updateInsurancePolicy(
    id: number,
    data: Partial<typeof insurancePolicy.$inferInsert>,
) {
    const [updated] = await db
        .update(insurancePolicy)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(insurancePolicy.id, id))
        .returning()
    return updated
}

export async function deleteInsurancePolicy(id: number) {
    const [deleted] = await db
        .delete(insurancePolicy)
        .where(eq(insurancePolicy.id, id))
        .returning()
    return deleted
}

// =============================================================================
// PERSONAL PROPERTY QUERIES
// =============================================================================

export async function getPersonalProperties(entityId?: number) {
    if (entityId) {
        return db
            .select()
            .from(personalProperty)
            .where(eq(personalProperty.entityId, entityId))
    }
    return db.select().from(personalProperty)
}

export async function getPersonalPropertyById(id: number) {
    return db.query.personalProperty.findFirst({
        where: eq(personalProperty.id, id),
        with: {
            entity: true,
            valuations: true,
            documents: true,
        },
    })
}

export async function createPersonalProperty(
    data: typeof personalProperty.$inferInsert,
) {
    const [created] = await db
        .insert(personalProperty)
        .values({ ...data, updatedAt: new Date().toISOString() })
        .returning()
    return created
}

export async function updatePersonalProperty(
    id: number,
    data: Partial<typeof personalProperty.$inferInsert>,
) {
    const [updated] = await db
        .update(personalProperty)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(personalProperty.id, id))
        .returning()
    return updated
}

export async function deletePersonalProperty(id: number) {
    const [deleted] = await db
        .delete(personalProperty)
        .where(eq(personalProperty.id, id))
        .returning()
    return deleted
}

// =============================================================================
// ARTWORK QUERIES
// =============================================================================

export async function getArtworks(entityId?: number) {
    if (entityId) {
        return db.select().from(artwork).where(eq(artwork.entityId, entityId))
    }
    return db.select().from(artwork)
}

export async function getArtworkById(id: number) {
    return db.query.artwork.findFirst({
        where: eq(artwork.id, id),
        with: {
            entity: true,
            valuations: true,
        },
    })
}

export async function createArtwork(data: typeof artwork.$inferInsert) {
    const [created] = await db
        .insert(artwork)
        .values({ ...data, updatedAt: new Date().toISOString() })
        .returning()
    return created
}

export async function updateArtwork(
    id: number,
    data: Partial<typeof artwork.$inferInsert>,
) {
    const [updated] = await db
        .update(artwork)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(artwork.id, id))
        .returning()
    return updated
}

export async function deleteArtwork(id: number) {
    const [deleted] = await db
        .delete(artwork)
        .where(eq(artwork.id, id))
        .returning()
    return deleted
}

// =============================================================================
// VALUATION QUERIES
// =============================================================================

export async function createValuation(data: typeof valuation.$inferInsert) {
    const [created] = await db.insert(valuation).values(data).returning()
    return created
}

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

export async function getContacts() {
    return db.select().from(contact)
}

export async function getContactById(id: number) {
    return db.query.contact.findFirst({
        where: eq(contact.id, id),
    })
}

export async function createContact(data: typeof contact.$inferInsert) {
    const [created] = await db
        .insert(contact)
        .values({ ...data, updatedAt: new Date().toISOString() })
        .returning()
    return created
}

export async function updateContact(
    id: number,
    data: Partial<typeof contact.$inferInsert>,
) {
    const [updated] = await db
        .update(contact)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(contact.id, id))
        .returning()
    return updated
}

export async function deleteContact(id: number) {
    const [deleted] = await db
        .delete(contact)
        .where(eq(contact.id, id))
        .returning()
    return deleted
}

// =============================================================================
// TASK QUERIES
// =============================================================================

export async function getTasks() {
    return db.select().from(task)
}

export async function getTaskById(id: number) {
    return db.query.task.findFirst({
        where: eq(task.id, id),
    })
}

export async function createTask(data: typeof task.$inferInsert) {
    const [created] = await db
        .insert(task)
        .values({ ...data, updatedAt: new Date().toISOString() })
        .returning()
    return created
}

export async function updateTask(
    id: number,
    data: Partial<typeof task.$inferInsert>,
) {
    const [updated] = await db
        .update(task)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(task.id, id))
        .returning()
    return updated
}

export async function deleteTask(id: number) {
    const [deleted] = await db.delete(task).where(eq(task.id, id)).returning()
    return deleted
}

// =============================================================================
// TRUSTEE QUERIES
// =============================================================================

export async function getTrustees(entityId?: number) {
    if (entityId) {
        return db.select().from(trustee).where(eq(trustee.entityId, entityId))
    }
    return db.select().from(trustee)
}

export async function getTrusteeById(id: number) {
    return db.query.trustee.findFirst({
        where: eq(trustee.id, id),
    })
}

export async function createTrustee(data: typeof trustee.$inferInsert) {
    const [created] = await db
        .insert(trustee)
        .values({ ...data, updatedAt: new Date().toISOString() })
        .returning()
    return created
}

export async function updateTrustee(
    id: number,
    data: Partial<typeof trustee.$inferInsert>,
) {
    const [updated] = await db
        .update(trustee)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(trustee.id, id))
        .returning()
    return updated
}

export async function deleteTrustee(id: number) {
    const [deleted] = await db
        .delete(trustee)
        .where(eq(trustee.id, id))
        .returning()
    return deleted
}

// =============================================================================
// SPECIFIC BEQUEST QUERIES
// =============================================================================

export async function getSpecificBequests(entityId?: number) {
    if (entityId) {
        return db
            .select()
            .from(specificBequest)
            .where(eq(specificBequest.entityId, entityId))
    }
    return db.select().from(specificBequest)
}

export async function getSpecificBequestById(id: number) {
    return db.query.specificBequest.findFirst({
        where: eq(specificBequest.id, id),
    })
}

export async function createSpecificBequest(
    data: typeof specificBequest.$inferInsert,
) {
    const [created] = await db
        .insert(specificBequest)
        .values({ ...data, updatedAt: new Date().toISOString() })
        .returning()
    return created
}

export async function updateSpecificBequest(
    id: number,
    data: Partial<typeof specificBequest.$inferInsert>,
) {
    const [updated] = await db
        .update(specificBequest)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(specificBequest.id, id))
        .returning()
    return updated
}

export async function deleteSpecificBequest(id: number) {
    const [deleted] = await db
        .delete(specificBequest)
        .where(eq(specificBequest.id, id))
        .returning()
    return deleted
}

// =============================================================================
// TRUST ACCOUNTING QUERIES
// =============================================================================

export async function getTrustAccountingEntries(entityId?: number) {
    if (entityId) {
        return db
            .select()
            .from(trustAccounting)
            .where(eq(trustAccounting.entityId, entityId))
    }
    return db.select().from(trustAccounting)
}

export async function getTrustAccountingEntryById(id: number) {
    return db.query.trustAccounting.findFirst({
        where: eq(trustAccounting.id, id),
    })
}

export async function updateTrustAccountingEntry(
    id: number,
    data: Partial<typeof trustAccounting.$inferInsert>,
) {
    const [updated] = await db
        .update(trustAccounting)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(trustAccounting.id, id))
        .returning()
    return updated
}

export async function deleteTrustAccountingEntry(id: number) {
    const [deleted] = await db
        .delete(trustAccounting)
        .where(eq(trustAccounting.id, id))
        .returning()
    return deleted
}

/**
 * Create a trust accounting entry with auto-classification
 *
 * Automatically determines isPrincipal based on Texas Property Code 116:
 * - Income types (rent, dividends, interest) -> isPrincipal: false
 * - Principal types (capital gains, sale proceeds) -> isPrincipal: true
 */
export async function createTrustAccountingEntry(
    data: typeof trustAccounting.$inferInsert,
) {
    // Auto-classify if isPrincipal not explicitly provided
    const isPrincipal =
        data.isPrincipal ??
        isPrincipalTransaction(
            data.incomeType as IncomeType | undefined,
            data.expenseType as ExpenseType | undefined,
            undefined,
        )

    const [created] = await db
        .insert(trustAccounting)
        .values({
            ...data,
            isPrincipal,
            updatedAt: new Date().toISOString(),
        })
        .returning()
    return created
}

// =============================================================================
// WITHDRAWAL RECORD QUERIES
// =============================================================================

export async function getWithdrawalRecords(beneficiaryId?: number) {
    if (beneficiaryId) {
        return db
            .select()
            .from(withdrawalRecord)
            .where(eq(withdrawalRecord.beneficiaryId, beneficiaryId))
    }
    return db.select().from(withdrawalRecord)
}

export async function getWithdrawalRecordById(id: number) {
    return db.query.withdrawalRecord.findFirst({
        where: eq(withdrawalRecord.id, id),
    })
}

export async function createWithdrawalRecord(
    data: typeof withdrawalRecord.$inferInsert,
) {
    const [created] = await db
        .insert(withdrawalRecord)
        .values({ ...data, updatedAt: new Date().toISOString() })
        .returning()
    return created
}

export async function updateWithdrawalRecord(
    id: number,
    data: Partial<typeof withdrawalRecord.$inferInsert>,
) {
    const [updated] = await db
        .update(withdrawalRecord)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(withdrawalRecord.id, id))
        .returning()
    return updated
}

export async function deleteWithdrawalRecord(id: number) {
    const [deleted] = await db
        .delete(withdrawalRecord)
        .where(eq(withdrawalRecord.id, id))
        .returning()
    return deleted
}

// =============================================================================
// HEMS REQUEST QUERIES
// =============================================================================

export async function getHemsRequests(beneficiaryId?: number) {
    if (beneficiaryId) {
        return db
            .select()
            .from(hemsRequest)
            .where(eq(hemsRequest.beneficiaryId, beneficiaryId))
    }
    return db.select().from(hemsRequest)
}

export async function getHemsRequestById(id: number) {
    return db.query.hemsRequest.findFirst({
        where: eq(hemsRequest.id, id),
    })
}

export async function createHemsRequest(data: typeof hemsRequest.$inferInsert) {
    const [created] = await db
        .insert(hemsRequest)
        .values({ ...data, updatedAt: new Date().toISOString() })
        .returning()
    return created
}

export async function updateHemsRequest(
    id: number,
    data: Partial<typeof hemsRequest.$inferInsert>,
) {
    const [updated] = await db
        .update(hemsRequest)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(hemsRequest.id, id))
        .returning()
    return updated
}

export async function deleteHemsRequest(id: number) {
    const [deleted] = await db
        .delete(hemsRequest)
        .where(eq(hemsRequest.id, id))
        .returning()
    return deleted
}

interface HemsRequestPaginationOptions {
    limit?: number
    offset?: number
}

/**
 * Get HEMS requests with beneficiary info (paginated, default limit: 100)
 * PERF: Always paginated to prevent unbounded growth
 */
export async function getHemsRequestsWithBeneficiary(
    filters?: { beneficiaryId?: number; entityId?: number },
    options?: HemsRequestPaginationOptions,
) {
    const conditions = []
    if (filters?.beneficiaryId) {
        conditions.push(eq(hemsRequest.beneficiaryId, filters.beneficiaryId))
    }
    if (filters?.entityId) {
        conditions.push(eq(hemsRequest.entityId, filters.entityId))
    }

    return db.query.hemsRequest.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: { beneficiary: true },
        orderBy: (r, { desc }) => [desc(r.createdAt)],
        limit: options?.limit ?? 100,
        offset: options?.offset ?? 0,
    })
}

/**
 * Get pending HEMS requests for admin queue (paginated, default limit: 50)
 * PERF: Limited to reasonable queue size
 */
export async function getPendingHemsRequests(
    options?: HemsRequestPaginationOptions,
) {
    return db.query.hemsRequest.findMany({
        where: eq(hemsRequest.status, 'PENDING'),
        with: { beneficiary: true },
        orderBy: (r, { asc }) => [asc(r.createdAt)],
        limit: options?.limit ?? 50,
        offset: options?.offset ?? 0,
    })
}

// =============================================================================
// TRUSTEE FEE SCHEDULE QUERIES
// =============================================================================

export async function getTrusteeFeeSchedules(entityId?: number) {
    if (entityId) {
        return db
            .select()
            .from(trusteeFeeSchedule)
            .where(eq(trusteeFeeSchedule.entityId, entityId))
    }
    return db.select().from(trusteeFeeSchedule)
}

export async function getTrusteeFeeScheduleById(id: number) {
    return db.query.trusteeFeeSchedule.findFirst({
        where: eq(trusteeFeeSchedule.id, id),
    })
}

export async function createTrusteeFeeSchedule(
    data: typeof trusteeFeeSchedule.$inferInsert,
) {
    const [created] = await db
        .insert(trusteeFeeSchedule)
        .values(data)
        .returning()
    return created
}

export async function updateTrusteeFeeSchedule(
    id: number,
    data: Partial<typeof trusteeFeeSchedule.$inferInsert>,
) {
    const [updated] = await db
        .update(trusteeFeeSchedule)
        .set(data)
        .where(eq(trusteeFeeSchedule.id, id))
        .returning()
    return updated
}

export async function deleteTrusteeFeeSchedule(id: number) {
    const [deleted] = await db
        .delete(trusteeFeeSchedule)
        .where(eq(trusteeFeeSchedule.id, id))
        .returning()
    return deleted
}

// =============================================================================
// TRUSTEE FEE ENTRY QUERIES
// =============================================================================

export async function getTrusteeFeeEntries(entityId?: number) {
    if (entityId) {
        return db
            .select()
            .from(trusteeFeeEntry)
            .where(eq(trusteeFeeEntry.entityId, entityId))
    }
    return db.select().from(trusteeFeeEntry)
}

export async function getTrusteeFeeEntryById(id: number) {
    return db.query.trusteeFeeEntry.findFirst({
        where: eq(trusteeFeeEntry.id, id),
    })
}

export async function createTrusteeFeeEntry(
    data: typeof trusteeFeeEntry.$inferInsert,
) {
    const [created] = await db
        .insert(trusteeFeeEntry)
        .values({ ...data, updatedAt: new Date().toISOString() })
        .returning()
    return created
}

export async function updateTrusteeFeeEntry(
    id: number,
    data: Partial<typeof trusteeFeeEntry.$inferInsert>,
) {
    const [updated] = await db
        .update(trusteeFeeEntry)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(trusteeFeeEntry.id, id))
        .returning()
    return updated
}

export async function deleteTrusteeFeeEntry(id: number) {
    const [deleted] = await db
        .delete(trusteeFeeEntry)
        .where(eq(trusteeFeeEntry.id, id))
        .returning()
    return deleted
}

export async function getTrusteeFeeEntriesWithSchedule(entityId?: number) {
    return db.query.trusteeFeeEntry.findMany({
        where: entityId ? eq(trusteeFeeEntry.entityId, entityId) : undefined,
        with: { schedule: true, trustee: true },
        orderBy: (e, { desc }) => [desc(e.periodEnd)],
    })
}

// =============================================================================
// LIABILITY QUERIES
// =============================================================================

export async function getLiabilities(entityId?: number) {
    if (entityId) {
        return db
            .select()
            .from(liability)
            .where(eq(liability.entityId, entityId))
    }
    return db.select().from(liability)
}

export async function getLiabilityById(id: number) {
    return db.query.liability.findFirst({
        where: eq(liability.id, id),
    })
}

export async function createLiability(data: typeof liability.$inferInsert) {
    const [created] = await db
        .insert(liability)
        .values({ ...data, updatedAt: new Date().toISOString() })
        .returning()
    return created
}

export async function updateLiability(
    id: number,
    data: Partial<typeof liability.$inferInsert>,
) {
    const [updated] = await db
        .update(liability)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(liability.id, id))
        .returning()
    return updated
}

export async function deleteLiability(id: number) {
    const [deleted] = await db
        .delete(liability)
        .where(eq(liability.id, id))
        .returning()
    return deleted
}

// =============================================================================
// LIABILITY PAYMENT QUERIES
// =============================================================================

interface RecordPaymentData {
    liabilityId: number
    paymentDate: string
    amount: string
    bankAccountId: number
    principalPortion?: string | null
    interestPortion?: string | null
    escrowPortion?: string | null
    paymentMethod?: 'CHECK' | 'ACH' | 'WIRE' | 'CASH' | 'OTHER' | null
    checkNumber?: string | null
    confirmationNumber?: string | null
    notes?: string | null
    createExpenseEntry?: boolean
    allocationClass?: 'PRINCIPAL' | 'INCOME' | null
}

export async function recordLiabilityPayment(data: RecordPaymentData) {
    const liabilityRecord = await db.query.liability.findFirst({
        where: eq(liability.id, data.liabilityId),
    })

    if (!liabilityRecord) {
        throw new Error('Liability not found')
    }

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

    const principalPortion =
        data.principalPortion || calculatedSplit?.principal || null
    const interestPortion =
        data.interestPortion || calculatedSplit?.interest || null
    const escrowPortion = data.escrowPortion || calculatedSplit?.escrow || null

    const paymentAmount = parseFloat(data.amount) || 0
    const currentBalance =
        parseFloat(liabilityRecord.currentBalance || '0') || 0
    const newBalance = calculatedSplit
        ? parseFloat(calculatedSplit.newBalance)
        : Math.max(0, currentBalance - paymentAmount)

    const [payment] = await db
        .insert(liabilityPayment)
        .values({
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
        })
        .returning()
    if (!payment) throw new Error('Failed to create payment record')

    await db
        .update(liability)
        .set({
            currentBalance: newBalance.toFixed(2),
            currentBalanceDate: data.paymentDate,
        })
        .where(eq(liability.id, data.liabilityId))

    let accountingEntry: { id: number } | null = null
    if (data.createExpenseEntry !== false) {
        const expenseDescription = `${liabilityRecord.liabilityType.replace(/_/g, ' ')} payment to ${liabilityRecord.creditor}`

        const effectiveAllocation =
            data.allocationClass ||
            liabilityRecord.allocationClass ||
            'PRINCIPAL'
        const isPrincipal = effectiveAllocation === 'PRINCIPAL'

        const expenseType =
            liabilityRecord.liabilityType === 'TAX_OWED' ? 'TAX' : 'OTHER'

        const [entry] = await db
            .insert(trustAccounting)
            .values({
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
                checkNumber:
                    data.checkNumber || data.confirmationNumber || null,
                fiscalYear: new Date(data.paymentDate).getFullYear(),
                sourceAssetType: 'LIABILITY',
                sourceAssetId: data.liabilityId,
                updatedAt: new Date().toISOString(),
            })
            .returning()
        if (!entry) throw new Error('Failed to create accounting entry')

        accountingEntry = { id: entry.id }
    }

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
        autoCalculated: calculatedSplit
            ? {
                  principal: calculatedSplit.principal,
                  interest: calculatedSplit.interest,
                  escrow: calculatedSplit.escrow,
              }
            : null,
    }
}

interface LiabilityPaymentOptions {
    limit?: number
    offset?: number
}

/**
 * Get liability payments with pagination (default limit: 50)
 * PERF: Paginated for liabilities with extensive payment history
 */
export async function getLiabilityPayments(
    liabilityId: number,
    options?: LiabilityPaymentOptions,
) {
    return db.query.liabilityPayment.findMany({
        where: eq(liabilityPayment.liabilityId, liabilityId),
        orderBy: (p, { desc }) => [desc(p.paymentDate)],
        limit: options?.limit ?? 50,
        offset: options?.offset ?? 0,
    })
}

// =============================================================================
// ACTIVITY LOG QUERIES
// =============================================================================

interface ActivityLogPaginationOptions {
    limit?: number
    offset?: number
}

/**
 * Get activity logs with pagination (default limit: 100)
 * PERF: Always paginated to prevent OOM on large audit trails
 */
export async function getActivityLogs(options?: ActivityLogPaginationOptions) {
    return db
        .select()
        .from(activityLog)
        .orderBy(desc(activityLog.createdAt))
        .limit(options?.limit ?? 100)
        .offset(options?.offset ?? 0)
}

export async function createActivityLog(data: typeof activityLog.$inferInsert) {
    const [created] = await db.insert(activityLog).values(data).returning()
    return created
}

/**
 * PostgreSQL 17 JSON_TABLE - Extract structured data from ActivityLog JSONB columns
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
// PENDING INVENTORY ITEM QUERIES
// =============================================================================

export async function getPendingInventoryItems(
    status?: 'PENDING' | 'APPROVED' | 'REJECTED',
) {
    if (status) {
        return db
            .select()
            .from(pendingInventoryItem)
            .where(eq(pendingInventoryItem.status, status))
    }
    return db.select().from(pendingInventoryItem)
}

export async function getPendingInventoryItemById(id: number) {
    return db.query.pendingInventoryItem.findFirst({
        where: eq(pendingInventoryItem.id, id),
    })
}

export async function createPendingInventoryItem(
    data: typeof pendingInventoryItem.$inferInsert,
) {
    const [created] = await db
        .insert(pendingInventoryItem)
        .values({ ...data, updatedAt: new Date().toISOString() })
        .returning()
    return created
}

export async function updatePendingInventoryItem(
    id: number,
    data: Partial<typeof pendingInventoryItem.$inferInsert>,
) {
    const [updated] = await db
        .update(pendingInventoryItem)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(pendingInventoryItem.id, id))
        .returning()
    return updated
}

export async function deletePendingInventoryItem(id: number) {
    const [deleted] = await db
        .delete(pendingInventoryItem)
        .where(eq(pendingInventoryItem.id, id))
        .returning()
    return deleted
}

// =============================================================================
// BENEFICIARY DEATH HANDLING - Trust Section 7.01
// =============================================================================

interface MarkDeceasedData {
    beneficiaryId: number
    deceasedDate: string
}

export async function markBeneficiaryDeceased(data: MarkDeceasedData) {
    await db
        .update(beneficiary)
        .set({
            deceasedDate: data.deceasedDate,
            updatedAt: new Date().toISOString(),
        })
        .where(eq(beneficiary.id, data.beneficiaryId))

    const deceased = await db.query.beneficiary.findFirst({
        where: eq(beneficiary.id, data.beneficiaryId),
    })

    if (!deceased || !deceased.entityId) {
        return { success: true, shareRecalculated: false }
    }

    return recalculateBeneficiaryShares(deceased.entityId, data.beneficiaryId)
}

export async function recalculateBeneficiaryShares(
    entityId: number,
    excludeBeneficiaryId: number,
) {
    const allBeneficiaries = await db.query.beneficiary.findMany({
        where: eq(beneficiary.entityId, entityId),
    })

    const deceased = allBeneficiaries.find((b) => b.id === excludeBeneficiaryId)
    const living = allBeneficiaries.filter(
        (b) => b.id !== excludeBeneficiaryId && !b.deceasedDate,
    )

    if (!deceased || !deceased.sharePercent) {
        return { success: true, shareRecalculated: false }
    }

    const deceasedShare = parseFloat(deceased.sharePercent)

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

    const updates: { id: number; newShare: string }[] = []
    const now = new Date().toISOString()

    // Calculate new shares for all living beneficiaries
    for (const b of living) {
        const currentShare = parseFloat(b.sharePercent || '0') || 0
        const proportion = currentShare / totalLivingShares
        const additionalShare = deceasedShare * proportion
        const newShare = (currentShare + additionalShare).toFixed(2)
        updates.push({ id: b.id, newShare })
    }

    // PERF: Use individual parameterized updates instead of raw SQL CASE
    // This is safer (no SQL injection) and still efficient for typical beneficiary counts (<100)
    // For extremely large beneficiary lists, consider a stored procedure
    if (updates.length > 0) {
        await Promise.all(
            updates.map((u) =>
                db
                    .update(beneficiary)
                    .set({ sharePercent: u.newShare, updatedAt: now })
                    .where(eq(beneficiary.id, u.id)),
            ),
        )
    }

    // Update deceased beneficiary share to 0
    await db
        .update(beneficiary)
        .set({
            sharePercent: '0.00',
            updatedAt: now,
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
// =============================================================================

export async function convertIncomeToPrincipal(
    entityId: number,
    fiscalYear: number,
    bankAccountId: number,
) {
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

    const totalIncome = incomeEntries.reduce(
        (sum, entry) => sum + (parseFloat(entry.amount) || 0),
        0,
    )

    const now = new Date().toISOString()

    const [principalEntry] = await db
        .insert(trustAccounting)
        .values({
            entityId,
            accountingDate: now,
            entryType: 'INCOME',
            incomeType: 'INCOME_TO_PRINCIPAL_CONVERSION',
            amount: totalIncome.toFixed(2),
            description: `FY${fiscalYear} undistributed income added to principal per Trust Section 7.10(c)`,
            bankAccountId,
            isPrincipal: true,
            fiscalYear,
            notes: `Converted ${incomeEntries.length} income entries totaling $${totalIncome.toFixed(2)}`,
            updatedAt: now,
        })
        .returning()
    if (!principalEntry) throw new Error('Failed to create principal entry')

    // Batch update: Mark all income entries as converted in a single query
    const convertedIds = incomeEntries.map((entry) => entry.id)

    if (convertedIds.length > 0) {
        await db
            .update(trustAccounting)
            .set({
                convertedToPrincipal: true,
                conversionDate: now,
                conversionEntryId: principalEntry.id,
                updatedAt: now,
            })
            .where(sql`id IN (${sql.raw(convertedIds.join(','))})`)
    }

    return {
        success: true,
        converted: incomeEntries.length,
        totalAmount: totalIncome.toFixed(2),
        principalEntryId: principalEntry.id,
        convertedIds,
    }
}

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

// =============================================================================
// ACTIVITY LOG SEARCH
// =============================================================================

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

export function isSearchableActivityLogField(
    field: string,
): field is SearchableActivityLogField {
    return SEARCHABLE_ACTIVITY_LOG_FIELDS.includes(
        field as SearchableActivityLogField,
    )
}

export async function searchActivityLogByField(
    fieldName: SearchableActivityLogField,
    fieldValue: string,
) {
    if (!isSearchableActivityLogField(fieldName)) {
        throw new Error(
            `Invalid field name: ${fieldName}. Allowed fields: ${SEARCHABLE_ACTIVITY_LOG_FIELDS.join(', ')}`,
        )
    }

    return db
        .select({
            id: activityLog.id,
            tableName: activityLog.tableName,
            recordId: activityLog.recordId,
            action: activityLog.action,
            changedBy: activityLog.changedBy,
            createdAt: activityLog.createdAt,
            fieldValue: sql<string>`${activityLog.newValues}->>${fieldName}`,
        })
        .from(activityLog)
        .where(sql`${activityLog.newValues}->>${fieldName} = ${fieldValue}`)
        .orderBy(desc(activityLog.createdAt))
        .limit(100)
}

// =============================================================================
// CRUD WRAPPERS - For createCrudRouter compatibility
// These wrap the individual functions into the object format the router expects
// =============================================================================

export const entityCrud = {
    getAllArray: getEntities,
    getById: getEntityById,
    create: createEntity,
    update: updateEntity,
    delete: deleteEntity,
}

export const beneficiaryCrud = {
    getAllArray: getBeneficiaries,
    getById: getBeneficiaryById,
    create: createBeneficiary,
    update: updateBeneficiary,
    delete: deleteBeneficiary,
}

export const distributionCrud = {
    getAllArray: getDistributions,
    getById: async (id: number) =>
        db.query.distribution.findFirst({ where: eq(distribution.id, id) }),
    create: createDistribution,
    update: async (
        id: number,
        data: Partial<typeof distribution.$inferInsert>,
    ) => {
        const [updated] = await db
            .update(distribution)
            .set({ ...data, updatedAt: new Date().toISOString() })
            .where(eq(distribution.id, id))
            .returning()
        return updated
    },
    delete: async (id: number) => {
        const [deleted] = await db
            .delete(distribution)
            .where(eq(distribution.id, id))
            .returning()
        return deleted
    },
}

export const vehicleCrud = {
    getAllArray: getVehicles,
    getById: async (id: number) =>
        db.query.vehicle.findFirst({ where: eq(vehicle.id, id) }),
    create: createVehicle,
    update: updateVehicle,
    delete: deleteVehicle,
}

export const homesteadCrud = {
    getAllArray: getHomesteads,
    getById: async (id: number) =>
        db.query.homestead.findFirst({ where: eq(homestead.id, id) }),
    create: createHomestead,
    update: updateHomestead,
    delete: deleteHomestead,
}

export const rentalPropertyCrud = {
    getAllArray: getRentalProperties,
    getById: async (id: number) =>
        db.query.rentalProperty.findFirst({ where: eq(rentalProperty.id, id) }),
    create: createRentalProperty,
    update: updateRentalProperty,
    delete: deleteRentalProperty,
}

export const bankAccountCrud = {
    getAllArray: getBankAccounts,
    getById: async (id: number) =>
        db.query.bankAccount.findFirst({ where: eq(bankAccount.id, id) }),
    create: createBankAccount,
    update: updateBankAccount,
    delete: deleteBankAccount,
}

export const investmentAccountCrud = {
    getAllArray: getInvestmentAccounts,
    getById: async (id: number) =>
        db.query.investmentAccount.findFirst({
            where: eq(investmentAccount.id, id),
        }),
    create: createInvestmentAccount,
    update: updateInvestmentAccount,
    delete: deleteInvestmentAccount,
}

export const insurancePolicyCrud = {
    getAllArray: getInsurancePolicies,
    getById: getInsurancePolicyById,
    create: createInsurancePolicy,
    update: updateInsurancePolicy,
    delete: deleteInsurancePolicy,
}

export const personalPropertyCrud = {
    getAllArray: getPersonalProperties,
    getById: async (id: number) =>
        db.query.personalProperty.findFirst({
            where: eq(personalProperty.id, id),
        }),
    create: createPersonalProperty,
    update: updatePersonalProperty,
    delete: deletePersonalProperty,
}

export const artworkCrud = {
    getAllArray: getArtworks,
    getById: async (id: number) =>
        db.query.artwork.findFirst({ where: eq(artwork.id, id) }),
    create: createArtwork,
    update: updateArtwork,
    delete: deleteArtwork,
}

export const contactCrud = {
    getAllArray: getContacts,
    getById: getContactById,
    create: createContact,
    update: updateContact,
    delete: deleteContact,
}

export const taskCrud = {
    getAllArray: getTasks,
    getById: getTaskById,
    create: createTask,
    update: updateTask,
    delete: deleteTask,
}

export const trusteeCrud = {
    getAllArray: getTrustees,
    getById: getTrusteeById,
    create: createTrustee,
    update: updateTrustee,
    delete: deleteTrustee,
}

export const specificBequestCrud = {
    getAllArray: getSpecificBequests,
    getById: getSpecificBequestById,
    create: createSpecificBequest,
    update: updateSpecificBequest,
    delete: deleteSpecificBequest,
}

export const trustAccountingCrud = {
    getAllArray: getTrustAccountingEntries,
    getById: getTrustAccountingEntryById,
    create: createTrustAccountingEntry,
    update: updateTrustAccountingEntry,
    delete: deleteTrustAccountingEntry,
}

export const withdrawalRecordCrud = {
    getAllArray: getWithdrawalRecords,
    getById: getWithdrawalRecordById,
    create: createWithdrawalRecord,
    update: updateWithdrawalRecord,
    delete: deleteWithdrawalRecord,
}

export const hemsRequestCrud = {
    getAllArray: getHemsRequests,
    getById: getHemsRequestById,
    create: createHemsRequest,
    update: updateHemsRequest,
    delete: deleteHemsRequest,
}

export const trusteeFeeScheduleCrud = {
    getAllArray: getTrusteeFeeSchedules,
    getById: getTrusteeFeeScheduleById,
    create: createTrusteeFeeSchedule,
    update: updateTrusteeFeeSchedule,
    delete: deleteTrusteeFeeSchedule,
}

export const trusteeFeeEntryCrud = {
    getAllArray: getTrusteeFeeEntries,
    getById: getTrusteeFeeEntryById,
    create: createTrusteeFeeEntry,
    update: updateTrusteeFeeEntry,
    delete: deleteTrusteeFeeEntry,
}

export const liabilityCrud = {
    getAllArray: getLiabilities,
    getById: getLiabilityById,
    create: createLiability,
    update: updateLiability,
    delete: deleteLiability,
}

export const liabilityPaymentCrud = {
    getAllArray: getLiabilityPayments,
    getById: async (id: number) =>
        db.query.liabilityPayment.findFirst({
            where: eq(liabilityPayment.id, id),
        }),
    create: async (data: typeof liabilityPayment.$inferInsert) => {
        const [created] = await db
            .insert(liabilityPayment)
            .values(data)
            .returning()
        return created
    },
    update: async (
        id: number,
        data: Partial<typeof liabilityPayment.$inferInsert>,
    ) => {
        const [updated] = await db
            .update(liabilityPayment)
            .set(data)
            .where(eq(liabilityPayment.id, id))
            .returning()
        return updated
    },
    delete: async (id: number) => {
        const [deleted] = await db
            .delete(liabilityPayment)
            .where(eq(liabilityPayment.id, id))
            .returning()
        return deleted
    },
}

export const activityLogCrud = {
    getAllArray: getActivityLogs,
    getById: async (id: number) =>
        db.query.activityLog.findFirst({ where: eq(activityLog.id, id) }),
    create: createActivityLog,
    update: async (
        id: number,
        data: Partial<typeof activityLog.$inferInsert>,
    ) => {
        const [updated] = await db
            .update(activityLog)
            .set(data)
            .where(eq(activityLog.id, id))
            .returning()
        return updated
    },
    delete: async (id: number) => {
        const [deleted] = await db
            .delete(activityLog)
            .where(eq(activityLog.id, id))
            .returning()
        return deleted
    },
}

export const pendingInventoryItemCrud = {
    getAllArray: getPendingInventoryItems,
    getById: getPendingInventoryItemById,
    create: createPendingInventoryItem,
    update: updatePendingInventoryItem,
    delete: deletePendingInventoryItem,
}

export const valuationCrud = {
    getAllArray: async () => db.select().from(valuation),
    getById: async (id: number) =>
        db.query.valuation.findFirst({ where: eq(valuation.id, id) }),
    create: createValuation,
    update: async (
        id: number,
        data: Partial<typeof valuation.$inferInsert>,
    ) => {
        const [updated] = await db
            .update(valuation)
            .set(data)
            .where(eq(valuation.id, id))
            .returning()
        return updated
    },
    delete: async (id: number) => {
        const [deleted] = await db
            .delete(valuation)
            .where(eq(valuation.id, id))
            .returning()
        return deleted
    },
}
