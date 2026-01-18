import { z } from 'zod'
import {
    getRentalPropertyById,
    rentalPropertyCrud,
} from '../../../../db/queries'
import {
    insertRentalPropertySchema,
    updateRentalPropertySchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const rentalPropertyRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number().optional() }).optional())
        .query(async ({ input }) => {
            return rentalPropertyCrud.getAllArray(input?.entityId)
        }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return getRentalPropertyById(input)
    }),

    create: adminProcedure
        .input(insertRentalPropertySchema)
        .mutation(async ({ input }) => {
            return rentalPropertyCrud.create(input)
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                data: updateRentalPropertySchema,
            }),
        )
        .mutation(async ({ input }) => {
            return rentalPropertyCrud.update(input.id, input.data)
        }),

    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            return rentalPropertyCrud.delete(input)
        }),
})
