import { TRPCError } from '@trpc/server'
import { and, asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { trustee } from '@/db/schema'
import { insertTrusteeSchema, updateTrusteeSchema } from '@/db/validation'
import { adminProcedure, createTRPCRouter } from '../init'

export const trusteeRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number() }))
        .query(({ input }) =>
            db
                .select()
                .from(trustee)
                .where(eq(trustee.entityId, input.entityId))
                // Matches idx_trustee_entity_order (entityId, order) — the
                // composite index backs both the WHERE and the ORDER BY.
                .orderBy(asc(trustee.order)),
        ),

    create: adminProcedure
        .input(insertTrusteeSchema)
        .mutation(async ({ input }) => {
            const [created] = await db
                .insert(trustee)
                .values({ ...input, updatedAt: new Date().toISOString() })
                .returning()
            if (!created)
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create trustee',
                })
            return created
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                entityId: z.coerce.number(),
                data: updateTrusteeSchema,
            }),
        )
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(trustee)
                .set({ ...input.data, updatedAt: new Date().toISOString() })
                .where(
                    and(
                        eq(trustee.id, input.id),
                        eq(trustee.entityId, input.entityId),
                    ),
                )
                .returning()
            if (!updated)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Trustee not found in this entity',
                })
            return updated
        }),

    delete: adminProcedure
        .input(z.object({ id: z.coerce.number(), entityId: z.coerce.number() }))
        .mutation(async ({ input }) => {
            const [deleted] = await db
                .delete(trustee)
                .where(
                    and(
                        eq(trustee.id, input.id),
                        eq(trustee.entityId, input.entityId),
                    ),
                )
                .returning()
            if (!deleted)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Trustee not found in this entity',
                })
            return deleted
        }),
})
