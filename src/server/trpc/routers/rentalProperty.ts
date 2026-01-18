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
        .input(z.object({ entityId: z.string().optional() }).optional())
        .query(async ({ input }) => {
            const result = await rentalPropertyCrud.getAll(input?.entityId)
            return Array.isArray(result) ? result : result.data
        }),

    byId: adminProcedure.input(z.string()).query(async ({ input }) => {
        return getRentalPropertyById(input)
    }),

    create: adminProcedure
        .input(insertRentalPropertySchema)
        .mutation(async ({ input }) => {
            return rentalPropertyCrud.create(input)
        }),

    update: adminProcedure
        .input(z.object({ id: z.string(), data: updateRentalPropertySchema }))
        .mutation(async ({ input }) => {
            return rentalPropertyCrud.update(input.id, input.data)
        }),

    delete: adminProcedure.input(z.string()).mutation(async ({ input }) => {
        return rentalPropertyCrud.delete(input)
    }),
})
