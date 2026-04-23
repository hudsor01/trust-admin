/** Drizzle queries for trust database operations (active exports only). */
import { and, desc, eq, sql } from 'drizzle-orm'
import { calculatePaymentSplit } from '../src/lib/amortization'
import {
    type ExpenseType,
    type IncomeType,
    isPrincipalTransaction,
} from '../src/lib/classification-rules'
import { addBreadcrumb, traceBusinessOperation } from '../src/lib/sentry'
import { db, getClient, type TxSql } from './index'

import {
    activityLog,
    beneficiary,
    distribution,
    entity,
    hemsRequest,
    liabilityPayment,
    personalProperty,
    trustAccounting,
    valuation,
} from './schema'

// =============================================================================
// ENTITY QUERIES
// =============================================================================

/** Eager-loads all asset relations -- prefer direct entity query unless relations are needed. */
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
// BENEFICIARY QUERIES
// =============================================================================

/** Eager-loads recent distributions. */
export async function getBeneficiaryById(id: number) {
    return db.query.beneficiary.findFirst({
        where: eq(beneficiary.id, id),
        with: {
            distributions: {
                orderBy: (d, { desc }) => [desc(d.distributionDate)],
                limit: 20,
            },
        },
    })
}

interface BeneficiaryDistributionOptions {
    limit?: number
    offset?: number
    distributionLimit?: number
}

/** Paginated beneficiaries with capped distributions per row to bound query cost. */
export async function getBeneficiariesWithDistributions(
    entityId?: number,
    options?: BeneficiaryDistributionOptions,
) {
    return db.query.beneficiary.findMany({
        where: entityId ? eq(beneficiary.entityId, entityId) : undefined,
        with: {
            distributions: {
                orderBy: (d, { desc }) => [desc(d.distributionDate)],
                limit: options?.distributionLimit ?? 20,
            },
        },
        limit: options?.limit ?? 100,
        offset: options?.offset ?? 0,
    })
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

// =============================================================================
// VALUATION QUERIES
// =============================================================================

async function createValuation(data: typeof valuation.$inferInsert) {
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
// PERSONAL PROPERTY QUERIES (used by personalPropertyCrud)
// =============================================================================

async function getPersonalProperties(entityId?: number) {
    if (entityId) {
        return db
            .select()
            .from(personalProperty)
            .where(eq(personalProperty.entityId, entityId))
    }
    return db.select().from(personalProperty)
}

async function createPersonalProperty(
    data: typeof personalProperty.$inferInsert,
) {
    const [created] = await db
        .insert(personalProperty)
        .values({ ...data, updatedAt: new Date().toISOString() })
        .returning()
    return created
}

async function updatePersonalProperty(
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

async function deletePersonalProperty(id: number) {
    const [deleted] = await db
        .delete(personalProperty)
        .where(eq(personalProperty.id, id))
        .returning()
    return deleted
}

// =============================================================================
// TRUST ACCOUNTING QUERIES
// =============================================================================

/**
 * Auto-classifies isPrincipal per Texas Property Code 116 when not explicitly set:
 * income types (rent, dividends) -> false, capital types (gains, sale proceeds) -> true.
 */
export async function createTrustAccountingEntry(
    data: typeof trustAccounting.$inferInsert,
) {
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
// HEMS REQUEST QUERIES
// =============================================================================

/** Transactional: creates distribution + links it to HEMS request atomically to prevent orphaned records. */
export async function approveHemsRequest(params: {
    id: number
    entityId: number
    approvedAmount?: string
    reviewNotes?: string
    distributionType?:
        | 'INCOME'
        | 'PRINCIPAL'
        | 'CAPITAL_GAIN'
        | 'EXPENSE_REIMBURSEMENT'
        | 'OTHER'
    existing: {
        beneficiaryId: number
        category: string
        justification: string
        amountRequested: string
    }
}) {
    const { id, entityId, reviewNotes, existing } = params
    const now = new Date().toISOString()
    const distributionAmount = params.approvedAmount ?? existing.amountRequested
    const distType = params.distributionType ?? 'INCOME'
    const notes = `HEMS request #${id}${reviewNotes ? `: ${reviewNotes}` : ''}`

    const client = getClient()
    return client.begin(async (_tx) => {
        const tx = _tx as TxSql

        // SELECT FOR UPDATE prevents TOCTOU race on concurrent approvals
        const [locked] = await tx`
            SELECT id, status FROM hems_request
            WHERE id = ${id} AND "entityId" = ${entityId}
            FOR UPDATE
        `
        if (!locked) throw new Error('HEMS request not found in this entity')
        if (locked.status !== 'PENDING')
            throw new Error(
                `Cannot approve a request with status: ${locked.status}`,
            )

        const [newDistribution] = await tx`
            INSERT INTO distribution (
                "entityId", "beneficiaryId", "distributionDate", amount,
                "distributionType", "hemsCategory", "hemsJustification",
                "paymentMethod", notes, "updatedAt"
            ) VALUES (
                ${entityId}, ${existing.beneficiaryId}, ${now},
                ${distributionAmount}, ${distType}, ${existing.category},
                ${existing.justification}, ${'CHECK'},
                ${notes}, ${now}
            )
            RETURNING *
        `
        if (!newDistribution)
            throw new Error('Failed to create distribution record')

        const [updated] = await tx`
            UPDATE hems_request
            SET
                status = 'APPROVED',
                "approvedAmount" = ${distributionAmount},
                "reviewNotes" = ${reviewNotes ?? null},
                "reviewedAt" = ${now},
                "distributionId" = ${newDistribution.id},
                "updatedAt" = ${now}
            WHERE id = ${id} AND "entityId" = ${entityId} AND status = 'PENDING'
            RETURNING *
        `
        if (!updated)
            throw new Error('HEMS request not found or no longer PENDING')

        return updated
    })
}

interface HemsRequestPaginationOptions {
    limit?: number
    offset?: number
}

/** HEMS requests joined with beneficiary, paginated (default 100). */
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
    return traceBusinessOperation(
        'liability.recordPayment',
        { liabilityId: data.liabilityId, amount: data.amount },
        async () => {
            const client = getClient()

            return client.begin(async (_tx) => {
                const tx = _tx as TxSql

                // Lock liability row to prevent concurrent balance modifications
                addBreadcrumb(
                    'db.transaction',
                    'Acquiring lock on liability row',
                    {
                        liabilityId: data.liabilityId,
                    },
                )
                const [liabilityRecord] = await tx`
                    SELECT * FROM liability
                    WHERE id = ${data.liabilityId}
                    FOR UPDATE
                `

                if (!liabilityRecord) {
                    throw new Error('Liability not found')
                }

                const shouldAutoCalculate =
                    liabilityRecord.interestRate &&
                    parseFloat(liabilityRecord.interestRate) > 0 &&
                    !liabilityRecord.isRevolvingCredit &&
                    data.principalPortion == null &&
                    data.interestPortion == null

                let calculatedSplit: {
                    principal: string
                    interest: string
                    escrow: string
                    newBalance: string
                } | null = null

                if (shouldAutoCalculate && liabilityRecord.interestRate) {
                    calculatedSplit = calculatePaymentSplit(
                        liabilityRecord.currentBalance ?? '0',
                        liabilityRecord.interestRate,
                        data.amount,
                        data.escrowPortion ??
                            liabilityRecord.escrowMonthly ??
                            undefined,
                    )
                }

                const principalPortion =
                    data.principalPortion ?? calculatedSplit?.principal ?? null
                const interestPortion =
                    data.interestPortion ?? calculatedSplit?.interest ?? null
                const escrowPortion =
                    data.escrowPortion ?? calculatedSplit?.escrow ?? null

                const currentBalance =
                    parseFloat(liabilityRecord.currentBalance ?? '0') || 0
                const newBalance = calculatedSplit
                    ? parseFloat(calculatedSplit.newBalance)
                    : Math.max(
                          0,
                          currentBalance -
                              parseFloat(data.principalPortion ?? '0'),
                      )

                addBreadcrumb('db.transaction', 'Inserting liability payment', {
                    amount: data.amount,
                })
                const [payment] = await tx`
                    INSERT INTO liability_payment (
                        "liabilityId", "paymentDate", amount,
                        "principalPortion", "interestPortion", "escrowPortion",
                        "paymentMethod", "checkNumber", "confirmationNumber", notes
                    ) VALUES (
                        ${data.liabilityId}, ${data.paymentDate}, ${data.amount},
                        ${principalPortion}, ${interestPortion}, ${escrowPortion},
                        ${data.paymentMethod || null}, ${data.checkNumber || null},
                        ${data.confirmationNumber || null}, ${data.notes || null}
                    )
                    RETURNING *
                `
                if (!payment) throw new Error('Failed to create payment record')

                addBreadcrumb('db.transaction', 'Updating liability balance', {
                    newBalance: newBalance.toFixed(2),
                })
                await tx`
                    UPDATE liability
                    SET "currentBalance" = ${newBalance.toFixed(2)},
                        "currentBalanceDate" = ${data.paymentDate}
                    WHERE id = ${data.liabilityId}
                `

                let accountingEntry: { id: number } | null = null
                if (data.createExpenseEntry !== false) {
                    const expenseDescription = `${liabilityRecord.liabilityType.replace(/_/g, ' ')} payment to ${liabilityRecord.creditor}`

                    const effectiveAllocation =
                        data.allocationClass ||
                        liabilityRecord.allocationClass ||
                        'PRINCIPAL'
                    const isPrincipal = effectiveAllocation === 'PRINCIPAL'

                    const expenseType =
                        liabilityRecord.liabilityType === 'TAX_OWED'
                            ? 'TAX'
                            : 'OTHER'

                    const taxDeductible =
                        liabilityRecord.liabilityType === 'MORTGAGE' ||
                        liabilityRecord.liabilityType === 'TAX_OWED'

                    const checkNum =
                        data.checkNumber || data.confirmationNumber || null
                    const fiscalYear = new Date(data.paymentDate).getFullYear()
                    const now = new Date().toISOString()

                    addBreadcrumb(
                        'db.transaction',
                        'Inserting trust accounting entry',
                        {
                            expenseType,
                            isPrincipal,
                        },
                    )
                    const [entry] = await tx`
                        INSERT INTO trust_accounting (
                            "entityId", "accountingDate", "entryType", "expenseType",
                            amount, description, "bankAccountId", "isPrincipal",
                            "taxDeductible", "checkNumber", "fiscalYear",
                            "sourceAssetType", "sourceAssetId", "updatedAt"
                        ) VALUES (
                            ${liabilityRecord.entityId}, ${data.paymentDate}, 'EXPENSE', ${expenseType},
                            ${data.amount}, ${expenseDescription}, ${data.bankAccountId}, ${isPrincipal},
                            ${taxDeductible}, ${checkNum}, ${fiscalYear},
                            'LIABILITY', ${data.liabilityId}, ${now}
                        )
                        RETURNING *
                    `
                    if (!entry)
                        throw new Error('Failed to create accounting entry')

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
            })
        },
    )
}

interface LiabilityPaymentOptions {
    limit?: number
    offset?: number
}

/** Liability payments ordered newest-first, paginated (default 50). */
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

export async function createActivityLog(data: typeof activityLog.$inferInsert) {
    const [created] = await db.insert(activityLog).values(data).returning()
    return created
}

/** Uses PG17 JSON_TABLE to extract old/new field values from JSONB audit columns. */
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
    FROM "activity_log" al
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
// BENEFICIARY DEATH HANDLING - Trust Section 7.01
// =============================================================================

interface MarkDeceasedData {
    beneficiaryId: number
    deceasedDate: string
}

export async function markBeneficiaryDeceased(data: MarkDeceasedData) {
    const deceased = await db.query.beneficiary.findFirst({
        where: eq(beneficiary.id, data.beneficiaryId),
    })

    if (!deceased?.entityId) {
        return { success: true, shareRecalculated: false }
    }

    return recalculateBeneficiaryShares(
        deceased.entityId,
        data.beneficiaryId,
        data.deceasedDate,
    )
}

export async function recalculateBeneficiaryShares(
    entityId: number,
    excludeBeneficiaryId: number,
    markDeceasedDate?: string,
) {
    return traceBusinessOperation(
        'beneficiary.recalculateShares',
        { entityId, excludeBeneficiaryId },
        async () => {
            const client = getClient()

            return client.begin(async (_tx) => {
                const tx = _tx as TxSql

                // Optionally set deceasedDate within the same transaction as share redistribution
                if (markDeceasedDate !== undefined) {
                    await tx`
                        UPDATE beneficiary
                        SET "deceasedDate" = ${markDeceasedDate},
                            "updatedAt"    = ${new Date().toISOString()}
                        WHERE id = ${excludeBeneficiaryId}
                    `
                }

                // FOR UPDATE lock prevents concurrent share modifications
                addBreadcrumb(
                    'db.transaction',
                    'Acquiring locks on beneficiary rows',
                    {
                        entityId,
                    },
                )
                interface BeneficiaryRow {
                    id: number
                    sharePercent: string | null
                    deceasedDate: string | null
                }
                const allBeneficiaries = await tx<BeneficiaryRow[]>`
                    SELECT * FROM beneficiary
                    WHERE "entityId" = ${entityId}
                    FOR UPDATE
                `

                const deceased = allBeneficiaries.find(
                    (b) => b.id === excludeBeneficiaryId,
                )
                const living = allBeneficiaries.filter(
                    (b) => b.id !== excludeBeneficiaryId && !b.deceasedDate,
                )

                if (!deceased?.sharePercent) {
                    return { success: true, shareRecalculated: false }
                }

                const deceasedShare = parseFloat(deceased.sharePercent)

                const totalLivingShares = living.reduce(
                    (sum, b) => sum + (parseFloat(b.sharePercent || '0') || 0),
                    0,
                )

                if (totalLivingShares <= 0) {
                    return {
                        success: true,
                        shareRecalculated: false,
                        error: 'No living beneficiaries',
                    }
                }

                const updates: { id: number; newShare: string }[] = []
                const now = new Date().toISOString()

                // Redistribute deceased share proportionally among living beneficiaries
                for (const b of living) {
                    const currentShare = parseFloat(b.sharePercent || '0') || 0
                    const proportion = currentShare / totalLivingShares
                    const additionalShare = deceasedShare * proportion
                    const newShare = (currentShare + additionalShare).toFixed(2)
                    updates.push({ id: b.id, newShare })
                }

                addBreadcrumb('db.transaction', 'Updating beneficiary shares', {
                    updateCount: updates.length,
                })
                if (updates.length > 0) {
                    // Bulk UPDATE: single statement instead of N sequential UPDATEs
                    // IDs are integers from DB, shares are computed decimals -- safe for interpolation
                    const ids = updates.map((u) => u.id)
                    const caseFragments = updates
                        .map((u) => `WHEN id = ${u.id} THEN '${u.newShare}'`)
                        .join(' ')
                    await tx.unsafe(
                        `UPDATE beneficiary
                         SET "sharePercent" = CASE ${caseFragments} END,
                             "updatedAt" = $1
                         WHERE id = ANY($2::int[])`,
                        [now, ids],
                    )
                }

                await tx`
                    UPDATE beneficiary
                    SET "sharePercent" = '0.00',
                        "updatedAt" = ${now}
                    WHERE id = ${excludeBeneficiaryId}
                `

                return {
                    success: true,
                    shareRecalculated: true,
                    deceasedShare,
                    updates,
                }
            })
        },
    )
}

// =============================================================================
// INCOME TO PRINCIPAL CONVERSION - Trust Section 7.10(c)
// =============================================================================

export async function convertIncomeToPrincipal(
    entityId: number,
    fiscalYear: number,
    bankAccountId: number,
) {
    return traceBusinessOperation(
        'accounting.convertIncomeToPrincipal',
        { entityId, fiscalYear, bankAccountId },
        async () => {
            const client = getClient()

            return client.begin(async (_tx) => {
                const tx = _tx as TxSql

                // FOR UPDATE lock on unconverted income prevents concurrent conversion
                addBreadcrumb(
                    'db.transaction',
                    'Acquiring locks on trust accounting rows',
                    {
                        entityId,
                        fiscalYear,
                    },
                )
                interface AccountingRow {
                    id: number
                    amount: string
                }
                const incomeEntries = await tx<AccountingRow[]>`
                    SELECT * FROM trust_accounting
                    WHERE "entityId" = ${entityId}
                      AND "entryType" = 'INCOME'
                      AND "isPrincipal" = false
                      AND "convertedToPrincipal" = false
                      AND "fiscalYear" = ${fiscalYear}
                    FOR UPDATE
                `

                if (incomeEntries.length === 0) {
                    return {
                        success: true,
                        converted: 0,
                        totalAmount: '0.00',
                        entries: [],
                    }
                }

                // Integer cents avoid IEEE 754 rounding errors in decimal summation
                const totalCents = incomeEntries.reduce(
                    (sum, entry) =>
                        sum + Math.round(parseFloat(entry.amount || '0') * 100),
                    0,
                )
                const totalIncome = (totalCents / 100).toFixed(2)

                const now = new Date().toISOString()
                const description = `FY${fiscalYear} undistributed income added to principal per Trust Section 7.10(c)`
                const notes = `Converted ${incomeEntries.length} income entries totaling $${totalIncome}`

                addBreadcrumb(
                    'db.transaction',
                    'Inserting principal conversion entry',
                    {
                        totalIncome,
                        entryCount: incomeEntries.length,
                    },
                )
                interface InsertedRow {
                    id: number
                }
                const [principalEntry] = await tx<InsertedRow[]>`
                    INSERT INTO trust_accounting (
                        "entityId", "accountingDate", "entryType", "incomeType",
                        amount, description, "bankAccountId", "isPrincipal",
                        "fiscalYear", notes, "updatedAt"
                    ) VALUES (
                        ${entityId}, ${now}, 'INCOME', 'INCOME_TO_PRINCIPAL_CONVERSION',
                        ${totalIncome}, ${description}, ${bankAccountId}, true,
                        ${fiscalYear}, ${notes}, ${now}
                    )
                    RETURNING *
                `
                if (!principalEntry)
                    throw new Error('Failed to create principal entry')

                const convertedIds = incomeEntries.map((entry) => entry.id)

                addBreadcrumb(
                    'db.transaction',
                    'Marking income entries as converted',
                    {
                        convertedCount: convertedIds.length,
                    },
                )
                await tx`
                    UPDATE trust_accounting
                    SET "convertedToPrincipal" = true,
                        "conversionDate" = ${now},
                        "conversionEntryId" = ${principalEntry.id},
                        "updatedAt" = ${now}
                    WHERE id = ANY(${convertedIds})
                `

                return {
                    success: true,
                    converted: incomeEntries.length,
                    totalAmount: totalIncome,
                    principalEntryId: principalEntry.id,
                    convertedIds,
                }
            })
        },
    )
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
// CRUD OBJECTS (aggregated for router consumption)
// =============================================================================

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
