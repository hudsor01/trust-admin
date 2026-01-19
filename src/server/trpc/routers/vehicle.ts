import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../../db'
import { vehicle } from '../../../../db/schema'
import {
    insertVehicleSchema,
    updateVehicleSchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const vehicleRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number().optional() }).optional())
        .query(async ({ input }) => {
            if (input?.entityId) {
                return db
                    .select()
                    .from(vehicle)
                    .where(eq(vehicle.entityId, input.entityId))
            }
            return db.select().from(vehicle)
        }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return db.query.vehicle.findFirst({
            where: eq(vehicle.id, input),
            with: {
                entity: true,
                valuations: true,
                documents: true,
            },
        })
    }),

    create: adminProcedure
        .input(insertVehicleSchema)
        .mutation(async ({ input }) => {
            const [created] = await db
                .insert(vehicle)
                .values({ ...input, updatedAt: new Date().toISOString() })
                .returning()
            return created
        }),

    update: adminProcedure
        .input(z.object({ id: z.coerce.number(), data: updateVehicleSchema }))
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(vehicle)
                .set({ ...input.data, updatedAt: new Date().toISOString() })
                .where(eq(vehicle.id, input.id))
                .returning()
            return updated
        }),

    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            const [deleted] = await db
                .delete(vehicle)
                .where(eq(vehicle.id, input))
                .returning()
            return deleted
        }),
})
