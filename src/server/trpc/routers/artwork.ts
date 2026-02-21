import { TRPCError } from '@trpc/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { artwork } from '@/db/schema'
import { insertArtworkSchema, updateArtworkSchema } from '@/db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const artworkRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            return db
                .select()
                .from(artwork)
                .where(eq(artwork.entityId, input.entityId))
        }),

    byId: adminProcedure
        .input(z.object({ id: z.coerce.number(), entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            return db.query.artwork.findFirst({
                where: and(
                    eq(artwork.id, input.id),
                    eq(artwork.entityId, input.entityId),
                ),
            })
        }),

    create: adminProcedure
        .input(insertArtworkSchema)
        .mutation(async ({ input }) => {
            const [created] = await db
                .insert(artwork)
                .values({ ...input, updatedAt: new Date().toISOString() })
                .returning()
            if (!created)
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create artwork',
                })
            return created
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                entityId: z.coerce.number(),
                data: updateArtworkSchema,
            }),
        )
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(artwork)
                .set({ ...input.data, updatedAt: new Date().toISOString() })
                .where(
                    and(
                        eq(artwork.id, input.id),
                        eq(artwork.entityId, input.entityId),
                    ),
                )
                .returning()
            if (!updated)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Record not found in this entity',
                })
            return updated
        }),

    delete: adminProcedure
        .input(z.object({ id: z.coerce.number(), entityId: z.coerce.number() }))
        .mutation(async ({ input }) => {
            const [deleted] = await db
                .delete(artwork)
                .where(
                    and(
                        eq(artwork.id, input.id),
                        eq(artwork.entityId, input.entityId),
                    ),
                )
                .returning()
            if (!deleted)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Record not found in this entity',
                })
            return deleted
        }),
})
