import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../../db'
import {
    getDistributions,
    getDistributionsByBeneficiary,
} from '../../../../db/queries'
import { distribution } from '../../../../db/schema'
import {
    insertDistributionSchema,
    updateDistributionSchema,
} from '../../../../db/validation'
import {
    adminProcedure,
    beneficiaryProcedure,
    createTRPCRouter,
} from '../index'

export const distributionRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number().optional() }).optional())
        .query(async ({ input }) => {
            return getDistributions(input?.entityId)
        }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return db.query.distribution.findFirst({
            where: eq(distribution.id, input),
        })
    }),

    create: adminProcedure
        .input(insertDistributionSchema)
        .mutation(async ({ input }) => {
            const [created] = await db
                .insert(distribution)
                .values({ ...input, updatedAt: new Date().toISOString() })
                .returning()
            return created
        }),

    update: adminProcedure
        .input(
            z.object({ id: z.coerce.number(), data: updateDistributionSchema }),
        )
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(distribution)
                .set({ ...input.data, updatedAt: new Date().toISOString() })
                .where(eq(distribution.id, input.id))
                .returning()
            return updated
        }),

    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            const [deleted] = await db
                .delete(distribution)
                .where(eq(distribution.id, input))
                .returning()
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
