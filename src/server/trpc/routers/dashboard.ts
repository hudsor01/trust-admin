import { and, count, desc, eq, gte, inArray, sql, sum } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import {
    activityLog,
    bankAccount,
    beneficiary,
    distribution,
    hemsRequest,
    homestead,
    insurancePolicy,
    investmentAccount,
    liability,
    personalProperty,
    rentalProperty,
    task,
    trustAccounting,
    trustee,
    vehicle,
    withdrawalRecord,
} from '@/db/schema'
import { adminProcedure, createTRPCRouter } from '../init'

/**
 * Allowlist of audited table names the activity-count series can be scoped
 * to. T-25-02 mitigation: `tableName` is validated against this `z.enum`
 * before the resolver runs, so an off-allowlist value (e.g. `'drop_table'`)
 * is rejected by Zod. The allowlisted value is mapped to a Drizzle table
 * object via a static lookup — it is NEVER interpolated into raw SQL.
 *
 * Every name maps to a table that carries an `entityId` column, so the
 * activity count is always entity-scopable (T-25-01).
 */
const ACTIVITY_COUNTS_TABLES = [
    'bank_account',
    'investment_account',
    'beneficiary',
    'trustee',
    'liability',
    'distribution',
    'hems_request',
    'trust_accounting',
] as const

const activityCountsTableSchema = z.enum(ACTIVITY_COUNTS_TABLES)

/** Maps an allowlisted snake_case table name to its entity-scoped source. */
const ACTIVITY_COUNTS_SOURCE = {
    bank_account: bankAccount,
    investment_account: investmentAccount,
    beneficiary: beneficiary,
    trustee: trustee,
    liability: liability,
    distribution: distribution,
    hems_request: hemsRequest,
    trust_accounting: trustAccounting,
} as const

export const dashboardRouter = createTRPCRouter({
    summary: adminProcedure
        .input(z.object({ entityId: z.coerce.number() }))
        .query(async ({ input: { entityId } }) => {
            const [
                beneficiaries,
                withdrawalRecords,
                recentIncomeEntries,
                recentExpenseEntries,
                hemsRequests,
                bankAccounts,
                investmentAccounts,
                homesteads,
                rentalProperties,
                vehicles,
                personalProperties,
                insurancePolicies,
                liabilities,
                tasks,
            ] = await Promise.all([
                db
                    .select()
                    .from(beneficiary)
                    .where(eq(beneficiary.entityId, entityId)),
                db
                    .select()
                    .from(withdrawalRecord)
                    .where(eq(withdrawalRecord.entityId, entityId)),
                db
                    .select()
                    .from(trustAccounting)
                    .where(
                        and(
                            eq(trustAccounting.entityId, entityId),
                            eq(trustAccounting.entryType, 'INCOME'),
                        ),
                    )
                    .orderBy(desc(trustAccounting.accountingDate))
                    .limit(10),
                db
                    .select()
                    .from(trustAccounting)
                    .where(
                        and(
                            eq(trustAccounting.entityId, entityId),
                            eq(trustAccounting.entryType, 'EXPENSE'),
                        ),
                    )
                    .orderBy(desc(trustAccounting.accountingDate))
                    .limit(10),
                db
                    .select()
                    .from(hemsRequest)
                    .where(eq(hemsRequest.entityId, entityId)),
                db
                    .select()
                    .from(bankAccount)
                    .where(eq(bankAccount.entityId, entityId)),
                db
                    .select()
                    .from(investmentAccount)
                    .where(eq(investmentAccount.entityId, entityId)),
                db
                    .select()
                    .from(homestead)
                    .where(eq(homestead.entityId, entityId)),
                db
                    .select()
                    .from(rentalProperty)
                    .where(eq(rentalProperty.entityId, entityId)),
                db.select().from(vehicle).where(eq(vehicle.entityId, entityId)),
                db
                    .select()
                    .from(personalProperty)
                    .where(eq(personalProperty.entityId, entityId)),
                db
                    .select()
                    .from(insurancePolicy)
                    .where(eq(insurancePolicy.entityId, entityId)),
                db
                    .select()
                    .from(liability)
                    .where(eq(liability.entityId, entityId)),
                // task table is global (no entityId column) -- intentional for single-trust app
                db.select().from(task),
            ])

            return {
                beneficiaries,
                withdrawalRecords,
                recentAccountingEntries: [
                    ...recentIncomeEntries,
                    ...recentExpenseEntries,
                ],
                hemsRequests,
                bankAccounts,
                investmentAccounts,
                homesteads,
                rentalProperties,
                vehicles,
                personalProperties,
                insurancePolicies,
                liabilities,
                tasks,
            }
        }),

    summaryTotals: adminProcedure
        .input(z.object({ entityId: z.coerce.number() }))
        .query(async ({ input: { entityId } }) => {
            const rows = await db
                .select({
                    entryType: trustAccounting.entryType,
                    total: sql<string>`COALESCE(${sum(trustAccounting.amount)}, '0')`,
                    entryCount: count(),
                })
                .from(trustAccounting)
                .where(eq(trustAccounting.entityId, entityId))
                .groupBy(trustAccounting.entryType)

            let incomeTotal = '0'
            let expenseTotal = '0'
            let incomeCount = 0
            let expenseCount = 0

            for (const row of rows) {
                if (row.entryType === 'INCOME') {
                    incomeTotal = row.total
                    incomeCount = row.entryCount
                } else if (row.entryType === 'EXPENSE') {
                    expenseTotal = row.total
                    expenseCount = row.entryCount
                }
            }

            return { incomeTotal, expenseTotal, incomeCount, expenseCount }
        }),

    /**
     * Per-day activity-count series from `activity_log` for one table,
     * scoped to a single entity. Returns a DENSE array of exactly `days`
     * buckets ({ date, count }), oldest → newest, so a sparkline can render
     * a continuous line (days with no activity are `count: 0`).
     *
     * Security (T-25-01 / T-25-02):
     * - `adminProcedure` — admin/trustee/arbiter only; RLS `app.is_admin()`
     *   on the `activity_log` SELECT policy is defense-in-depth.
     * - `tableName` is a `z.enum` allowlist; the allowlisted value is mapped
     *   to a Drizzle table via a static lookup, never string-built.
     * - `activity_log` has no `entityId` column, so the count is restricted
     *   to `recordId`s belonging to the requested entity's rows in the
     *   mapped source table — cross-entity activity cannot leak.
     * - `recordId` is a bare per-table id (e.g. `bank_account #5` and
     *   `beneficiary #5` both stringify to `"5"`); the `tableName` equality
     *   predicate in the WHERE clause is what prevents a same-id row in a
     *   different table from being counted.
     * - `days` is bounded 1..365.
     * - All day bucketing is done in UTC: the JS window uses `setUTCHours`/
     *   `setUTCDate`, bucket keys come from `toISOString()`, and the SQL
     *   truncation pins `createdAt` (a `timestamptz`) to UTC via
     *   `AT TIME ZONE 'UTC'` — so the three day computations agree
     *   regardless of the Postgres session time zone.
     */
    activityCounts: adminProcedure
        .input(
            z.object({
                entityId: z.coerce.number(),
                tableName: activityCountsTableSchema,
                days: z.coerce.number().int().min(1).max(365).default(30),
            }),
        )
        .query(async ({ input: { entityId, tableName, days } }) => {
            // Window start: start of the UTC day `days - 1` days ago, so the
            // series spans exactly `days` buckets inclusive of today. UTC math
            // keeps this aligned with the UTC bucket keys and the SQL day
            // labels (see the security note above re: time zones).
            const windowStart = new Date()
            windowStart.setUTCHours(0, 0, 0, 0)
            windowStart.setUTCDate(windowStart.getUTCDate() - (days - 1))

            // Entity scoping (T-25-01): collect the ids of the entity's rows
            // in the mapped source table. activity_log.recordId is text, so
            // cast the numeric ids with String().
            const sourceTable = ACTIVITY_COUNTS_SOURCE[tableName]
            const sourceRows = await db
                .select({ id: sourceTable.id })
                .from(sourceTable)
                .where(eq(sourceTable.entityId, entityId))
            const recordIds = sourceRows.map((r) => String(r.id))

            // Build the dense zero-filled series keyed by ISO date.
            const buckets = new Map<string, number>()
            for (let i = 0; i < days; i++) {
                const d = new Date(windowStart)
                d.setUTCDate(d.getUTCDate() + i)
                buckets.set(d.toISOString().slice(0, 10), 0)
            }

            // No rows for this entity → return the zero-filled series as-is.
            if (recordIds.length > 0) {
                const grouped = await db
                    .select({
                        day: sql<string>`to_char(date_trunc('day', ${activityLog.createdAt} AT TIME ZONE 'UTC'), 'YYYY-MM-DD')`,
                        count: count(),
                    })
                    .from(activityLog)
                    .where(
                        and(
                            eq(activityLog.tableName, tableName),
                            inArray(activityLog.recordId, recordIds),
                            gte(
                                activityLog.createdAt,
                                windowStart.toISOString(),
                            ),
                        ),
                    )
                    .groupBy(
                        sql`date_trunc('day', ${activityLog.createdAt} AT TIME ZONE 'UTC')`,
                    )

                for (const row of grouped) {
                    if (buckets.has(row.day)) {
                        buckets.set(row.day, row.count)
                    }
                }
            }

            return Array.from(buckets, ([date, count]) => ({ date, count }))
        }),
})
