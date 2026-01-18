import { z } from 'zod'
import {
    distributionCrud,
    getDistributions,
    getDistributionsByBeneficiary,
} from '../../../../db/queries'
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
        return distributionCrud.getById(input)
    }),

    create: adminProcedure
        .input(insertDistributionSchema)
        .mutation(async ({ input }) => {
            return distributionCrud.create(input)
        }),

    update: adminProcedure
        .input(
            z.object({ id: z.coerce.number(), data: updateDistributionSchema }),
        )
        .mutation(async ({ input }) => {
            return distributionCrud.update(input.id, input.data)
        }),

    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            return distributionCrud.delete(input)
        }),

    // Portal: Beneficiary views their distributions (database-level filtering)
    myDistributions: beneficiaryProcedure.query(async ({ ctx }) => {
        if (!ctx.user.beneficiaryId) {
            return []
        }
        return getDistributionsByBeneficiary(ctx.user.beneficiaryId)
    }),
})
