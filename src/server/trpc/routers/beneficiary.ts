import { TRPCError } from '@trpc/server'
import { and, eq } from 'drizzle-orm'
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
import { addBreadcrumb, traceBusinessOperation } from '../../../lib/sentry'
import {
    adminProcedure,
    beneficiaryProcedure,
    createTRPCRouter,
} from '../index'

export const beneficiaryRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            return db
                .select()
                .from(beneficiary)
                .where(eq(beneficiary.entityId, input.entityId))
        }),

    // Optimized query that includes distributions in a single query (avoids N+1)
    listWithDistributions: adminProcedure
        .input(z.object({ entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            return getBeneficiariesWithDistributions(input.entityId)
        }),

    byId: adminProcedure
        .input(z.object({ id: z.coerce.number(), entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            return db.query.beneficiary.findFirst({
                where: and(
                    eq(beneficiary.id, input.id),
                    eq(beneficiary.entityId, input.entityId),
                ),
            })
        }),

    create: adminProcedure
        .input(insertBeneficiarySchema)
        .mutation(async ({ input }) => {
            const [created] = await db
                .insert(beneficiary)
                .values({ ...input, updatedAt: new Date().toISOString() })
                .returning()
            if (!created)
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create beneficiary',
                })
            return created
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                entityId: z.coerce.number(),
                data: updateBeneficiarySchema,
            }),
        )
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(beneficiary)
                .set({ ...input.data, updatedAt: new Date().toISOString() })
                .where(
                    and(
                        eq(beneficiary.id, input.id),
                        eq(beneficiary.entityId, input.entityId),
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
                .delete(beneficiary)
                .where(
                    and(
                        eq(beneficiary.id, input.id),
                        eq(beneficiary.entityId, input.entityId),
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
            addBreadcrumb('beneficiary', 'Marking beneficiary as deceased', {
                beneficiaryId: input.beneficiaryId,
                deceasedDate: input.deceasedDate,
            })

            return traceBusinessOperation(
                'beneficiary.markDeceased',
                {
                    beneficiaryId: input.beneficiaryId,
                    deceasedDate: input.deceasedDate,
                },
                async () => {
                    return markBeneficiaryDeceased(input)
                },
            )
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
            addBreadcrumb('beneficiary', 'Recalculating beneficiary shares', {
                entityId: input.entityId,
                excludeBeneficiaryId: input.excludeBeneficiaryId,
            })

            return traceBusinessOperation(
                'beneficiary.recalculateShares',
                {
                    entityId: input.entityId,
                    excludeBeneficiaryId: input.excludeBeneficiaryId,
                },
                async () => {
                    return recalculateBeneficiaryShares(
                        input.entityId,
                        input.excludeBeneficiaryId,
                    )
                },
            )
        }),
})
