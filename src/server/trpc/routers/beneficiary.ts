import { z } from 'zod'
import {
    beneficiaryCrud,
    getBeneficiariesWithDistributions,
    getBeneficiaryById,
    markBeneficiaryDeceased,
    recalculateBeneficiaryShares,
} from '../../../../db/queries'
import {
    insertBeneficiarySchema,
    updateBeneficiarySchema,
} from '../../../../db/validation'
import {
    adminProcedure,
    beneficiaryProcedure,
    createTRPCRouter,
} from '../index'

export const beneficiaryRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.string().optional() }).optional())
        .query(async ({ input }) => {
            const result = await beneficiaryCrud.getAll(input?.entityId)
            return Array.isArray(result) ? result : result.data
        }),

    // Optimized query that includes distributions in a single query (avoids N+1)
    listWithDistributions: adminProcedure
        .input(z.object({ entityId: z.string().optional() }).optional())
        .query(async ({ input }) => {
            return getBeneficiariesWithDistributions(input?.entityId)
        }),

    byId: adminProcedure.input(z.string()).query(async ({ input }) => {
        return getBeneficiaryById(input)
    }),

    create: adminProcedure
        .input(insertBeneficiarySchema)
        .mutation(async ({ input }) => {
            return beneficiaryCrud.create(input)
        }),

    update: adminProcedure
        .input(z.object({ id: z.string(), data: updateBeneficiarySchema }))
        .mutation(async ({ input }) => {
            return beneficiaryCrud.update(input.id, input.data)
        }),

    delete: adminProcedure.input(z.string()).mutation(async ({ input }) => {
        return beneficiaryCrud.delete(input)
    }),

    // Portal: Get own beneficiary data
    me: beneficiaryProcedure.query(async ({ ctx }) => {
        if (!ctx.user.beneficiaryId) {
            return null
        }
        return getBeneficiaryById(ctx.user.beneficiaryId)
    }),

    // =========================================================================
    // DEATH HANDLING - Trust Section 7.01
    // If beneficiary dies before complete distribution, share goes pro-rata
    // =========================================================================

    /**
     * Mark a beneficiary as deceased and recalculate shares
     *
     * Per Trust Section 7.01: If a beneficiary dies before complete distribution,
     * their share goes pro-rata to other living beneficiaries.
     */
    markDeceased: adminProcedure
        .input(
            z.object({
                beneficiaryId: z.string(),
                deceasedDate: z.string(),
            }),
        )
        .mutation(async ({ input }) => {
            return markBeneficiaryDeceased(input)
        }),

    /**
     * Manually recalculate shares after a beneficiary death
     */
    recalculateShares: adminProcedure
        .input(
            z.object({
                entityId: z.string(),
                excludeBeneficiaryId: z.string(),
            }),
        )
        .mutation(async ({ input }) => {
            return recalculateBeneficiaryShares(
                input.entityId,
                input.excludeBeneficiaryId,
            )
        }),
})
