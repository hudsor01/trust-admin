import { count, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../../db'
import {
    convertIncomeToPrincipal,
    createTrustAccountingEntry,
    getUnconvertedIncomeSummary,
} from '../../../../db/queries'
import { trustAccounting } from '../../../../db/schema'
import {
    insertTrustAccountingSchema,
    updateTrustAccountingSchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const trustAccountingRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number().optional() }).optional())
        .query(async ({ input }) => {
            if (input?.entityId) {
                return db
                    .select()
                    .from(trustAccounting)
                    .where(eq(trustAccounting.entityId, input.entityId))
                    .orderBy(desc(trustAccounting.accountingDate))
            }
            return db
                .select()
                .from(trustAccounting)
                .orderBy(desc(trustAccounting.accountingDate))
        }),

    listPaginated: adminProcedure
        .input(
            z.object({
                entityId: z.coerce.number().optional(),
                limit: z.number().optional(),
                offset: z.number().optional(),
            }),
        )
        .query(async ({ input }) => {
            const baseQuery = input?.entityId
                ? eq(trustAccounting.entityId, input.entityId)
                : undefined

            const [data, countResult] = await Promise.all([
                db
                    .select()
                    .from(trustAccounting)
                    .where(baseQuery)
                    .orderBy(desc(trustAccounting.accountingDate))
                    .limit(input?.limit ?? 100)
                    .offset(input?.offset ?? 0),
                db
                    .select({ totalCount: count() })
                    .from(trustAccounting)
                    .where(baseQuery),
            ])

            return { data, totalCount: countResult[0]?.totalCount ?? 0 }
        }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return db.query.trustAccounting.findFirst({
            where: eq(trustAccounting.id, input),
        })
    }),

    create: adminProcedure
        .input(insertTrustAccountingSchema)
        .mutation(async ({ input }) => {
            const [created] = await db
                .insert(trustAccounting)
                .values({ ...input, updatedAt: new Date().toISOString() })
                .returning()
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
                data: updateTrustAccountingSchema,
            }),
        )
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(trustAccounting)
                .set({ ...input.data, updatedAt: new Date().toISOString() })
                .where(eq(trustAccounting.id, input.id))
                .returning()
            return updated
        }),

    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            const [deleted] = await db
                .delete(trustAccounting)
                .where(eq(trustAccounting.id, input))
                .returning()
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
            return convertIncomeToPrincipal(
                input.entityId,
                input.fiscalYear,
                input.bankAccountId,
            )
        }),
})
