import { z } from 'zod'
import { liabilityPaymentCrud } from '../../../../db/queries'
import {
    insertLiabilityPaymentSchema,
    updateLiabilityPaymentSchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const liabilityPaymentRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ liabilityId: z.coerce.number().optional() }).optional())
        .query(async ({ input }) => {
            const result = await liabilityPaymentCrud.getAll(input?.liabilityId)
            return Array.isArray(result) ? result : result.data
        }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return liabilityPaymentCrud.getById(input)
    }),

    create: adminProcedure
        .input(insertLiabilityPaymentSchema)
        .mutation(async ({ input }) => {
            return liabilityPaymentCrud.create(input)
        }),

    update: adminProcedure
        .input(z.object({ id: z.coerce.number(), data: updateLiabilityPaymentSchema }))
        .mutation(async ({ input }) => {
            return liabilityPaymentCrud.update(input.id, input.data)
        }),

    delete: adminProcedure.input(z.coerce.number()).mutation(async ({ input }) => {
        return liabilityPaymentCrud.delete(input)
    }),
})
