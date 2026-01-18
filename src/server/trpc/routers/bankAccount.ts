import { z } from 'zod'
import { bankAccountCrud, getBankAccountById } from '../../../../db/queries'
import {
    insertBankAccountSchema,
    updateBankAccountSchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const bankAccountRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.string().optional() }).optional())
        .query(async ({ input }) => {
            const result = await bankAccountCrud.getAll(input?.entityId)
            return Array.isArray(result) ? result : result.data
        }),

    byId: adminProcedure.input(z.string()).query(async ({ input }) => {
        return getBankAccountById(input)
    }),

    create: adminProcedure
        .input(insertBankAccountSchema)
        .mutation(async ({ input }) => {
            return bankAccountCrud.create(input)
        }),

    update: adminProcedure
        .input(z.object({ id: z.string(), data: updateBankAccountSchema }))
        .mutation(async ({ input }) => {
            return bankAccountCrud.update(input.id, input.data)
        }),

    delete: adminProcedure.input(z.string()).mutation(async ({ input }) => {
        return bankAccountCrud.delete(input)
    }),
})
