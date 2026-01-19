import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../../db'
import { artwork } from '../../../../db/schema'
import {
    insertArtworkSchema,
    updateArtworkSchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const artworkRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number().optional() }).optional())
        .query(async ({ input }) => {
            if (input?.entityId) {
                return db
                    .select()
                    .from(artwork)
                    .where(eq(artwork.entityId, input.entityId))
            }
            return db.select().from(artwork)
        }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return db.query.artwork.findFirst({
            where: eq(artwork.id, input),
        })
    }),

    create: adminProcedure
        .input(insertArtworkSchema)
        .mutation(async ({ input }) => {
            const [created] = await db
                .insert(artwork)
                .values({ ...input, updatedAt: new Date().toISOString() })
                .returning()
            return created
        }),

    update: adminProcedure
        .input(z.object({ id: z.coerce.number(), data: updateArtworkSchema }))
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(artwork)
                .set({ ...input.data, updatedAt: new Date().toISOString() })
                .where(eq(artwork.id, input.id))
                .returning()
            return updated
        }),

    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            const [deleted] = await db
                .delete(artwork)
                .where(eq(artwork.id, input))
                .returning()
            return deleted
        }),
})
