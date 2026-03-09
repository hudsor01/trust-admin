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
    list: adminProcedure
        .input(
            z.object({
                entityId: z.coerce.number(),
                limit: z.number().min(1).max(1000).optional(),
            }),
        )
        .query(async ({ input }) => {
            const limit = input.limit ?? 500
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
                limit: z.number().min(1).max(100).optional(),
                offset: z.number().min(0).optional(),
                entryType: z.enum(['INCOME', 'EXPENSE']).optional(),
            }),
        )
        .query(async ({ input }) => {
            const conditions = [eq(trustAccounting.entityId, input.entityId)]
            if (input.entryType) {
                conditions.push(eq(trustAccounting.entryType, input.entryType))
            }
            const whereClause = and(...conditions)

            const [data, countResult] = await Promise.all([
                db
                    .select()
                    .from(trustAccounting)
                    .where(whereClause)
                    .orderBy(desc(trustAccounting.accountingDate))
                    .limit(input.limit ?? 50)
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

    /** Aggregate totals across ALL entries (not just one page) for summary cards. */
    totals: adminProcedure
        .input(z.object({ entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            const rows = await db
                .select({
                    entryType: trustAccounting.entryType,
                    isPrincipal: trustAccounting.isPrincipal,
                    taxDeductible: trustAccounting.taxDeductible,
                    total: sql<string>`COALESCE(${sum(trustAccounting.amount)}, '0')`,
                    entryCount: count(),
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
