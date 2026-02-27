import { TRPCError } from '@trpc/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { rentalProperty } from '@/db/schema'
import {
    insertRentalPropertySchema,
    updateRentalPropertySchema,
} from '@/db/validation'
import { adminProcedure, createTRPCRouter } from '../init'

export const rentalPropertyRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number() }))
        .query(({ input }) =>
            db
                .select()
                .from(rentalProperty)
                .where(eq(rentalProperty.entityId, input.entityId)),
        ),

    create: adminProcedure
        .input(insertRentalPropertySchema)
        .mutation(async ({ input }) => {
            const [created] = await db
                .insert(rentalProperty)
                .values({ ...input, updatedAt: new Date().toISOString() })
                .returning()
            if (!created)
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create rental property',
                })
            return created
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                entityId: z.coerce.number(),
                data: updateRentalPropertySchema,
            }),
        )
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(rentalProperty)
                .set({ ...input.data, updatedAt: new Date().toISOString() })
                .where(
                    and(
                        eq(rentalProperty.id, input.id),
                        eq(rentalProperty.entityId, input.entityId),
                    ),
                )
                .returning()
            if (!updated)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Rental property not found in this entity',
                })
            return updated
        }),

    delete: adminProcedure
        .input(z.object({ id: z.coerce.number(), entityId: z.coerce.number() }))
        .mutation(async ({ input }) => {
            const [deleted] = await db
                .delete(rentalProperty)
                .where(
                    and(
                        eq(rentalProperty.id, input.id),
                        eq(rentalProperty.entityId, input.entityId),
                    ),
                )
                .returning()
            if (!deleted)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Rental property not found in this entity',
                })
            return deleted
        }),
})
