import { z } from 'zod'
import { getVehicleById, vehicleCrud } from '../../../../db/queries'
import {
    insertVehicleSchema,
    updateVehicleSchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const vehicleRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.string().optional() }).optional())
        .query(async ({ input }) => {
            const result = await vehicleCrud.getAll(input?.entityId)
            return Array.isArray(result) ? result : result.data
        }),

    byId: adminProcedure.input(z.string()).query(async ({ input }) => {
        return getVehicleById(input)
    }),

    create: adminProcedure
        .input(insertVehicleSchema)
        .mutation(async ({ input }) => {
            return vehicleCrud.create(input)
        }),

    update: adminProcedure
        .input(z.object({ id: z.string(), data: updateVehicleSchema }))
        .mutation(async ({ input }) => {
            return vehicleCrud.update(input.id, input.data)
        }),

    delete: adminProcedure.input(z.string()).mutation(async ({ input }) => {
        return vehicleCrud.delete(input)
    }),
})
