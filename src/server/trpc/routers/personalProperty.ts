import { z } from 'zod'
import { personalPropertyCrud } from '../../../../db/queries'
import {
    insertPersonalPropertySchema,
    updatePersonalPropertySchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const personalPropertyRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number().optional() }).optional())
        .query(async ({ input }) => {
            return personalPropertyCrud.getAllArray(input?.entityId)
        }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return personalPropertyCrud.getById(input)
    }),

    create: adminProcedure
        .input(insertPersonalPropertySchema)
        .mutation(async ({ input }) => {
            return personalPropertyCrud.create(input)
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                data: updatePersonalPropertySchema,
            }),
        )
        .mutation(async ({ input }) => {
            return personalPropertyCrud.update(input.id, input.data)
        }),

    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            return personalPropertyCrud.delete(input)
        }),
})
