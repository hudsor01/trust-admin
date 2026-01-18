import { z } from 'zod'
import { personalPropertyCrud } from '../../../../db/queries'
import {
    insertPersonalPropertySchema,
    updatePersonalPropertySchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const personalPropertyRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.string().optional() }).optional())
        .query(async ({ input }) => {
            const result = await personalPropertyCrud.getAll(input?.entityId)
            return Array.isArray(result) ? result : result.data
        }),

    byId: adminProcedure.input(z.string()).query(async ({ input }) => {
        return personalPropertyCrud.getById(input)
    }),

    create: adminProcedure
        .input(insertPersonalPropertySchema)
        .mutation(async ({ input }) => {
            return personalPropertyCrud.create(input)
        }),

    update: adminProcedure
        .input(z.object({ id: z.string(), data: updatePersonalPropertySchema }))
        .mutation(async ({ input }) => {
            return personalPropertyCrud.update(input.id, input.data)
        }),

    delete: adminProcedure.input(z.string()).mutation(async ({ input }) => {
        return personalPropertyCrud.delete(input)
    }),
})
