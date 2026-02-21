import { TRPCError } from '@trpc/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { getDistributions, getDistributionsByBeneficiary } from '@/db/queries'
import { distribution } from '@/db/schema'
import {
    insertDistributionSchema,
    updateDistributionSchema,
} from '@/db/validation'
import { addBreadcrumb, traceBusinessOperation } from '@/lib/sentry'
import {
    adminProcedure,
    beneficiaryProcedure,
    createTRPCRouter,
} from '../index'

export const distributionRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            return getDistributions(input.entityId)
        }),

    byId: adminProcedure
        .input(z.object({ id: z.coerce.number(), entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            return db.query.distribution.findFirst({
                where: and(
                    eq(distribution.id, input.id),
                    eq(distribution.entityId, input.entityId),
                ),
            })
        }),

    create: adminProcedure
        .input(insertDistributionSchema)
        .mutation(async ({ input }) => {
            addBreadcrumb('distribution', 'Creating distribution', {
                beneficiaryId: input.beneficiaryId,
                amount: input.amount,
                distributionType: input.distributionType,
            })

            return traceBusinessOperation(
                'distribution.create',
                {
                    beneficiaryId: input.beneficiaryId ?? 0,
                    amount: input.amount ?? '0',
                    distributionType: input.distributionType ?? 'unknown',
                },
                async () => {
                    const [created] = await db
                        .insert(distribution)
                        .values({
                            ...input,
                            updatedAt: new Date().toISOString(),
                        })
                        .returning()
                    if (!created)
                        throw new TRPCError({
                            code: 'INTERNAL_SERVER_ERROR',
                            message: 'Failed to create distribution',
                        })
                    return created
                },
            )
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                entityId: z.coerce.number(),
                data: updateDistributionSchema,
            }),
        )
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(distribution)
                .set({ ...input.data, updatedAt: new Date().toISOString() })
                .where(
                    and(
                        eq(distribution.id, input.id),
                        eq(distribution.entityId, input.entityId),
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
                .delete(distribution)
                .where(
                    and(
                        eq(distribution.id, input.id),
                        eq(distribution.entityId, input.entityId),
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

    // Portal: Beneficiary views their distributions (database-level filtering)
    myDistributions: beneficiaryProcedure.query(async ({ ctx }) => {
        if (!ctx.user.beneficiaryId) {
            return []
        }
        return getDistributionsByBeneficiary(ctx.user.beneficiaryId)
    }),
})
