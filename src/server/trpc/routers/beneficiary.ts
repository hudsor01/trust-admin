import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../../db'
import {
    getBeneficiariesWithDistributions,
    getBeneficiaryById,
    markBeneficiaryDeceased,
    recalculateBeneficiaryShares,
} from '../../../../db/queries'
import { beneficiary } from '../../../../db/schema'
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
        .input(z.object({ entityId: z.coerce.number().optional() }).optional())
        .query(async ({ input }) => {
            if (input?.entityId) {
                return db
                    .select()
                    .from(beneficiary)
                    .where(eq(beneficiary.entityId, input.entityId))
            }
            return db.select().from(beneficiary)
        }),

    // Optimized query that includes distributions in a single query (avoids N+1)
    listWithDistributions: adminProcedure
        .input(z.object({ entityId: z.coerce.number().optional() }).optional())
        .query(async ({ input }) => {
            return getBeneficiariesWithDistributions(input?.entityId)
        }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return getBeneficiaryById(input)
    }),

    create: adminProcedure
        .input(insertBeneficiarySchema)
        .mutation(async ({ input }) => {
            const [created] = await db
                .insert(beneficiary)
                .values({ ...input, updatedAt: new Date().toISOString() })
                .returning()
            return created
        }),

    update: adminProcedure
        .input(
            z.object({ id: z.coerce.number(), data: updateBeneficiarySchema }),
        )
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(beneficiary)
                .set({ ...input.data, updatedAt: new Date().toISOString() })
                .where(eq(beneficiary.id, input.id))
                .returning()
            return updated
        }),

    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            const [deleted] = await db
                .delete(beneficiary)
                .where(eq(beneficiary.id, input))
                .returning()
            return deleted
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
                beneficiaryId: z.coerce.number(),
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
                entityId: z.coerce.number(),
                excludeBeneficiaryId: z.coerce.number(),
            }),
        )
        .mutation(async ({ input }) => {
            return recalculateBeneficiaryShares(
                input.entityId,
                input.excludeBeneficiaryId,
            )
        }),
})
