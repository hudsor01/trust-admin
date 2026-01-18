import { z } from 'zod'
import { contactCrud } from '../../../../db/queries'
import {
    insertContactSchema,
    updateContactSchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const contactRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number().optional() }).optional())
        .query(async ({ input }) => {
            return contactCrud.getAllArray(input?.entityId)
        }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return contactCrud.getById(input)
    }),

    create: adminProcedure
        .input(insertContactSchema)
        .mutation(async ({ input }) => {
            return contactCrud.create(input)
        }),

    update: adminProcedure
        .input(z.object({ id: z.coerce.number(), data: updateContactSchema }))
        .mutation(async ({ input }) => {
            return contactCrud.update(input.id, input.data)
        }),

    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            return contactCrud.delete(input)
        }),
})
