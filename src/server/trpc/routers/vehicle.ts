import { TRPCError } from '@trpc/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { vehicle } from '@/db/schema'
import { insertVehicleSchema, updateVehicleSchema } from '@/db/validation'
import { adminProcedure, createTRPCRouter } from '../init'

export const vehicleRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number() }))
        .query(({ input }) =>
            db
                .select()
                .from(vehicle)
                .where(eq(vehicle.entityId, input.entityId)),
        ),

    create: adminProcedure
        .input(insertVehicleSchema)
        .mutation(async ({ input }) => {
            const [created] = await db
                .insert(vehicle)
                .values({ ...input, updatedAt: new Date().toISOString() })
                .returning()
            if (!created)
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create vehicle',
                })
            return created
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                entityId: z.coerce.number(),
                data: updateVehicleSchema,
            }),
        )
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(vehicle)
                .set({ ...input.data, updatedAt: new Date().toISOString() })
                .where(
                    and(
                        eq(vehicle.id, input.id),
                        eq(vehicle.entityId, input.entityId),
                    ),
                )
                .returning()
            if (!updated)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Vehicle not found in this entity',
                })
            return updated
        }),

    delete: adminProcedure
        .input(z.object({ id: z.coerce.number(), entityId: z.coerce.number() }))
        .mutation(async ({ input }) => {
            const [deleted] = await db
                .delete(vehicle)
                .where(
                    and(
                        eq(vehicle.id, input.id),
                        eq(vehicle.entityId, input.entityId),
                    ),
                )
                .returning()
            if (!deleted)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Vehicle not found in this entity',
                })
            return deleted
        }),
})
