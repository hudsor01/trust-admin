import { TRPCError } from '@trpc/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { homestead } from '@/db/schema'
import { insertHomesteadSchema, updateHomesteadSchema } from '@/db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const homesteadRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            return db
                .select()
                .from(homestead)
                .where(eq(homestead.entityId, input.entityId))
        }),

    byId: adminProcedure
        .input(z.object({ id: z.coerce.number(), entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            return db.query.homestead.findFirst({
                where: and(
                    eq(homestead.id, input.id),
                    eq(homestead.entityId, input.entityId),
                ),
                with: {
                    entity: true,
                    valuations: true,
                    documents: true,
                },
            })
        }),

    create: adminProcedure
        .input(insertHomesteadSchema)
        .mutation(async ({ input }) => {
            const [created] = await db
                .insert(homestead)
                .values({ ...input, updatedAt: new Date().toISOString() })
                .returning()
            if (!created)
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create homestead',
                })
            return created
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                entityId: z.coerce.number(),
                data: updateHomesteadSchema,
            }),
        )
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(homestead)
                .set({ ...input.data, updatedAt: new Date().toISOString() })
                .where(
                    and(
                        eq(homestead.id, input.id),
                        eq(homestead.entityId, input.entityId),
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
                .delete(homestead)
                .where(
                    and(
                        eq(homestead.id, input.id),
                        eq(homestead.entityId, input.entityId),
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
