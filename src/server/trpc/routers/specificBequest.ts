import { TRPCError } from '@trpc/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { specificBequest } from '@/db/schema'
import {
    insertSpecificBequestSchema,
    updateSpecificBequestSchema,
} from '@/db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const specificBequestRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            return db
                .select()
                .from(specificBequest)
                .where(eq(specificBequest.entityId, input.entityId))
        }),

    byId: adminProcedure
        .input(z.object({ id: z.coerce.number(), entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            return db.query.specificBequest.findFirst({
                where: and(
                    eq(specificBequest.id, input.id),
                    eq(specificBequest.entityId, input.entityId),
                ),
            })
        }),

    create: adminProcedure
        .input(insertSpecificBequestSchema)
        .mutation(async ({ input }) => {
            const [created] = await db
                .insert(specificBequest)
                .values({ ...input, updatedAt: new Date().toISOString() })
                .returning()
            if (!created)
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create specific bequest',
                })
            return created
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                entityId: z.coerce.number(),
                data: updateSpecificBequestSchema,
            }),
        )
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(specificBequest)
                .set({ ...input.data, updatedAt: new Date().toISOString() })
                .where(
                    and(
                        eq(specificBequest.id, input.id),
                        eq(specificBequest.entityId, input.entityId),
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
                .delete(specificBequest)
                .where(
                    and(
                        eq(specificBequest.id, input.id),
                        eq(specificBequest.entityId, input.entityId),
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
