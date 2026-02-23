import { TRPCError } from '@trpc/server'
import { and, count, desc, eq, sql, sum } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import {
    convertIncomeToPrincipal,
    createTrustAccountingEntry,
    getUnconvertedIncomeSummary,
} from '@/db/queries'
import { trustAccounting } from '@/db/schema'
import {
    insertTrustAccountingSchema,
    updateTrustAccountingSchema,
} from '@/db/validation'
import { addBreadcrumb, traceBusinessOperation } from '@/lib/sentry'
import { adminProcedure, createTRPCRouter } from '../init'

export const trustAccountingRouter = createTRPCRouter({
    // PERF: Add default limit to prevent unbounded queries
    // For large result sets, use listPaginated instead
    list: adminProcedure
        .input(
            z.object({
                entityId: z.coerce.number(),
                limit: z.number().min(1).max(1000).optional(),
            }),
        )
        .query(async ({ input }) => {
            const limit = input.limit ?? 500 // Default limit to prevent memory issues
            return db
                .select()
                .from(trustAccounting)
                .where(eq(trustAccounting.entityId, input.entityId))
                .orderBy(desc(trustAccounting.accountingDate))
                .limit(limit)
        }),

    listPaginated: adminProcedure
        .input(
            z.object({
                entityId: z.coerce.number(),
                limit: z.number().optional(),
                offset: z.number().optional(),
            }),
        )
        .query(async ({ input }) => {
            const whereClause = eq(trustAccounting.entityId, input.entityId)

            const [data, countResult] = await Promise.all([
                db
                    .select()
                    .from(trustAccounting)
                    .where(whereClause)
                    .orderBy(desc(trustAccounting.accountingDate))
                    .limit(input.limit ?? 100)
                    .offset(input.offset ?? 0),
                db
                    .select({ totalCount: count() })
                    .from(trustAccounting)
                    .where(whereClause),
            ])

            return { data, totalCount: countResult[0]?.totalCount ?? 0 }
        }),

    byId: adminProcedure
        .input(z.object({ id: z.coerce.number(), entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            return db.query.trustAccounting.findFirst({
                where: and(
                    eq(trustAccounting.id, input.id),
                    eq(trustAccounting.entityId, input.entityId),
                ),
            })
        }),

    create: adminProcedure
        .input(insertTrustAccountingSchema)
        .mutation(async ({ input }) => {
            const [created] = await db
                .insert(trustAccounting)
                .values({ ...input, updatedAt: new Date().toISOString() })
                .returning()
            if (!created)
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create trust accounting entry',
                })
            return created
        }),

    // Special: Create entry with auto-classification
    createEntry: adminProcedure
        .input(insertTrustAccountingSchema)
        .mutation(async ({ input }) => {
            return createTrustAccountingEntry({
                ...input,
                updatedAt: new Date().toISOString(),
            })
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                entityId: z.coerce.number(),
                data: updateTrustAccountingSchema,
            }),
        )
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(trustAccounting)
                .set({ ...input.data, updatedAt: new Date().toISOString() })
                .where(
                    and(
                        eq(trustAccounting.id, input.id),
                        eq(trustAccounting.entityId, input.entityId),
                    ),
                )
                .returning()
            if (!updated)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Record not found in this entity',
                })
            return updated
        }),

    delete: adminProcedure
        .input(z.object({ id: z.coerce.number(), entityId: z.coerce.number() }))
        .mutation(async ({ input }) => {
            const [deleted] = await db
                .delete(trustAccounting)
                .where(
                    and(
                        eq(trustAccounting.id, input.id),
                        eq(trustAccounting.entityId, input.entityId),
                    ),
                )
                .returning()
            if (!deleted)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Record not found in this entity',
                })
            return deleted
        }),

    // =========================================================================
    // INCOME TO PRINCIPAL CONVERSION - Trust Section 7.10(c)
    // "All income not distributed shall be added to principal at least annually"
    // =========================================================================

    /**
     * Get summary of unconverted income by fiscal year
     *
     * Shows how much undistributed income is pending conversion to principal
     * for each fiscal year.
     */
    /**
     * Server-side aggregate totals across ALL entries (not just one page).
     * Used for summary cards so they always reflect the full ledger.
     */
    totals: adminProcedure
        .input(z.object({ entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            const rows = await db
                .select({
                    entryType: trustAccounting.entryType,
                    isPrincipal: trustAccounting.isPrincipal,
                    taxDeductible: trustAccounting.taxDeductible,
                    total: sql<string>`COALESCE(${sum(trustAccounting.amount)}, '0')`,
                })
                .from(trustAccounting)
                .where(eq(trustAccounting.entityId, input.entityId))
                .groupBy(
                    trustAccounting.entryType,
                    trustAccounting.isPrincipal,
                    trustAccounting.taxDeductible,
                )
            return rows
        }),

    unconvertedIncomeSummary: adminProcedure
        .input(z.object({ entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            return getUnconvertedIncomeSummary(input.entityId)
        }),

    /**
     * Convert undistributed income to principal for a fiscal year
     *
     * Per Trust Section 7.10(c): All income not distributed shall be added
     * to principal at least annually. This procedure:
     * 1. Finds all unconverted income entries for the fiscal year
     * 2. Creates a single principal entry for the total
     * 3. Marks all original entries as converted
     *
     * @param entityId - The trust entity
     * @param fiscalYear - The fiscal year to convert (e.g., 2024)
     */
    convertIncomeToPrincipal: adminProcedure
        .input(
            z.object({
                entityId: z.coerce.number(),
                fiscalYear: z.number(),
                bankAccountId: z.coerce.number(),
            }),
        )
        .mutation(async ({ input }) => {
            addBreadcrumb('accounting', 'Converting income to principal', {
                entityId: input.entityId,
                fiscalYear: input.fiscalYear,
            })

            return traceBusinessOperation(
                'accounting.convertIncomeToPrincipal',
                {
                    entityId: input.entityId,
                    fiscalYear: input.fiscalYear,
                    bankAccountId: input.bankAccountId,
                },
                async () => {
                    return convertIncomeToPrincipal(
                        input.entityId,
                        input.fiscalYear,
                        input.bankAccountId,
                    )
                },
            )
        }),
})
