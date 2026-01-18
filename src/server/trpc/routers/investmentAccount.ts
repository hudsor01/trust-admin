import { z } from 'zod'
import { investmentAccountCrud } from '../../../../db/queries'
import {
    insertInvestmentAccountSchema,
    updateInvestmentAccountSchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const investmentAccountRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number().optional() }).optional())
        .query(async ({ input }) => {
            return investmentAccountCrud.getAllArray(input?.entityId)
        }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return investmentAccountCrud.getById(input)
    }),

    create: adminProcedure
        .input(insertInvestmentAccountSchema)
        .mutation(async ({ input }) => {
            return investmentAccountCrud.create(input)
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                data: updateInvestmentAccountSchema,
            }),
        )
        .mutation(async ({ input }) => {
            return investmentAccountCrud.update(input.id, input.data)
        }),

    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            return investmentAccountCrud.delete(input)
        }),
})
