import { z } from 'zod'
import {
    convertIncomeToPrincipal,
    createTrustAccountingEntry,
    getUnconvertedIncomeSummary,
    trustAccountingCrud,
} from '../../../../db/queries'
import {
    insertTrustAccountingSchema,
    updateTrustAccountingSchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const trustAccountingRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.string().optional() }).optional())
        .query(async ({ input }) => {
            const result = await trustAccountingCrud.getAll(input?.entityId)
            return Array.isArray(result) ? result : result.data
        }),

    listPaginated: adminProcedure
        .input(
            z.object({
                entityId: z.string().optional(),
                limit: z.number().optional(),
                offset: z.number().optional(),
            }),
        )
        .query(async ({ input }) => {
            const result = await trustAccountingCrud.getAll(input?.entityId, {
                limit: input?.limit,
                offset: input?.offset,
                includeTotalCount: true,
            })
            return Array.isArray(result)
                ? { data: result, totalCount: result.length }
                : result
        }),

    byId: adminProcedure.input(z.string()).query(async ({ input }) => {
        return trustAccountingCrud.getById(input)
    }),

    create: adminProcedure
        .input(insertTrustAccountingSchema)
        .mutation(async ({ input }) => {
            return trustAccountingCrud.create(input)
        }),

    // Special: Create entry with auto-classification
    createEntry: adminProcedure
        .input(insertTrustAccountingSchema)
        .mutation(async ({ input }) => {
            return createTrustAccountingEntry(input)
        }),

    update: adminProcedure
        .input(z.object({ id: z.string(), data: updateTrustAccountingSchema }))
        .mutation(async ({ input }) => {
            return trustAccountingCrud.update(input.id, input.data)
        }),

    delete: adminProcedure.input(z.string()).mutation(async ({ input }) => {
        return trustAccountingCrud.delete(input)
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
        .input(z.object({ entityId: z.string() }))
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
                entityId: z.string(),
                fiscalYear: z.number(),
                bankAccountId: z.string(),
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
