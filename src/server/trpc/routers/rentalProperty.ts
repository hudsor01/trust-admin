import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../../db'
import { rentalProperty } from '../../../../db/schema'
import {
    insertRentalPropertySchema,
    updateRentalPropertySchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const rentalPropertyRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number().optional() }).optional())
        .query(async ({ input }) => {
            if (input?.entityId) {
                return db
                    .select()
                    .from(rentalProperty)
                    .where(eq(rentalProperty.entityId, input.entityId))
            }
            return db.select().from(rentalProperty)
        }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return db.query.rentalProperty.findFirst({
            where: eq(rentalProperty.id, input),
            with: {
                entity: true,
                valuations: true,
                documents: true,
            },
        })
    }),

    create: adminProcedure
        .input(insertRentalPropertySchema)
        .mutation(async ({ input }) => {
            const [created] = await db
                .insert(rentalProperty)
                .values({ ...input, updatedAt: new Date().toISOString() })
                .returning()
            return created
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                data: updateRentalPropertySchema,
            }),
        )
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(rentalProperty)
                .set({ ...input.data, updatedAt: new Date().toISOString() })
                .where(eq(rentalProperty.id, input.id))
                .returning()
            return updated
        }),

    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            const [deleted] = await db
                .delete(rentalProperty)
                .where(eq(rentalProperty.id, input))
                .returning()
            return deleted
        }),
})
