import { z } from 'zod'
import { distributionCrud, getDistributions } from '../../../../db/queries'
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
            const all = await getDistributions()
            if (input?.entityId) {
                return all.filter((d) => d.entityId === input.entityId)
            }
            return all
        }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return distributionCrud.getById(input)
    }),

    create: adminProcedure
        .input(insertDistributionSchema)
        .mutation(async ({ input }) => {
            return distributionCrud.create(input)
        }),

    update: adminProcedure
        .input(z.object({ id: z.coerce.number(), data: updateDistributionSchema }))
        .mutation(async ({ input }) => {
            return distributionCrud.update(input.id, input.data)
        }),

    delete: adminProcedure.input(z.coerce.number()).mutation(async ({ input }) => {
        return distributionCrud.delete(input)
    }),

    // Portal: Beneficiary views their distributions
    myDistributions: beneficiaryProcedure.query(async ({ ctx }) => {
        if (!ctx.user.beneficiaryId) {
            return []
        }
        // Filter by beneficiaryId - need to implement this filter
        const all = await getDistributions()
        return all.filter((d) => d.beneficiaryId === ctx.user.beneficiaryId)
    }),
})
