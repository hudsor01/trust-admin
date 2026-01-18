import { z } from 'zod'
import { trusteeCrud } from '../../../../db/queries'
import {
    insertTrusteeSchema,
    updateTrusteeSchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const trusteeRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number().optional() }).optional())
        .query(async ({ input }) => {
            const result = await trusteeCrud.getAll(input?.entityId)
            return Array.isArray(result) ? result : result.data
        }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return trusteeCrud.getById(input)
    }),

    create: adminProcedure
        .input(insertTrusteeSchema)
        .mutation(async ({ input }) => {
            return trusteeCrud.create(input)
        }),

    update: adminProcedure
        .input(z.object({ id: z.coerce.number(), data: updateTrusteeSchema }))
        .mutation(async ({ input }) => {
            return trusteeCrud.update(input.id, input.data)
        }),

    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            return trusteeCrud.delete(input)
        }),
})
