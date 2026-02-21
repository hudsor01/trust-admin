import { TRPCError } from '@trpc/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { document } from '@/db/schema'
import { insertDocumentSchema, updateDocumentSchema } from '@/db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const documentRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            return db
                .select()
                .from(document)
                .where(eq(document.entityId, input.entityId))
        }),

    byId: adminProcedure
        .input(z.object({ id: z.coerce.number(), entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            return db.query.document.findFirst({
                where: and(
                    eq(document.id, input.id),
                    eq(document.entityId, input.entityId),
                ),
            })
        }),

    create: adminProcedure
        .input(insertDocumentSchema)
        .mutation(async ({ input }) => {
            const [created] = await db
                .insert(document)
                .values({ ...input, updatedAt: new Date().toISOString() })
                .returning()
            if (!created)
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create document',
                })
            return created
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                entityId: z.coerce.number(),
                data: updateDocumentSchema,
            }),
        )
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(document)
                .set({ ...input.data, updatedAt: new Date().toISOString() })
                .where(
                    and(
                        eq(document.id, input.id),
                        eq(document.entityId, input.entityId),
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
                .delete(document)
                .where(
                    and(
                        eq(document.id, input.id),
                        eq(document.entityId, input.entityId),
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
