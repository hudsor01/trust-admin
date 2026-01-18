import { z } from 'zod'
import { investmentAccountCrud } from '../../../../db/queries'
import {
    insertInvestmentAccountSchema,
    updateInvestmentAccountSchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const investmentAccountRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.string().optional() }).optional())
        .query(async ({ input }) => {
            const result = await investmentAccountCrud.getAll(input?.entityId)
            return Array.isArray(result) ? result : result.data
        }),

    byId: adminProcedure.input(z.string()).query(async ({ input }) => {
        return investmentAccountCrud.getById(input)
    }),

    create: adminProcedure
        .input(insertInvestmentAccountSchema)
        .mutation(async ({ input }) => {
            return investmentAccountCrud.create(input)
        }),

    update: adminProcedure
        .input(
            z.object({ id: z.string(), data: updateInvestmentAccountSchema }),
        )
        .mutation(async ({ input }) => {
            return investmentAccountCrud.update(input.id, input.data)
        }),

    delete: adminProcedure.input(z.string()).mutation(async ({ input }) => {
        return investmentAccountCrud.delete(input)
    }),
})
