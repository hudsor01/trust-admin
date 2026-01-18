import { z } from 'zod'
import { getVehicleById, vehicleCrud } from '../../../../db/queries'
import {
    insertVehicleSchema,
    updateVehicleSchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const vehicleRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number().optional() }).optional())
        .query(async ({ input }) => {
            return vehicleCrud.getAllArray(input?.entityId)
        }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return getVehicleById(input)
    }),

    create: adminProcedure
        .input(insertVehicleSchema)
        .mutation(async ({ input }) => {
            return vehicleCrud.create(input)
        }),

    update: adminProcedure
        .input(z.object({ id: z.coerce.number(), data: updateVehicleSchema }))
        .mutation(async ({ input }) => {
            return vehicleCrud.update(input.id, input.data)
        }),

    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            return vehicleCrud.delete(input)
        }),
})
