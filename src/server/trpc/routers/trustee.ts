import { TRPCError } from '@trpc/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, getClient, type TxSql } from '@/db'
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
                .where(eq(trustee.entityId, input.entityId)),
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

    /**
     * Persist a new display order for trustees. Writes the existing `order`
     * integer column to the position of each id in `orderedIds`.
     *
     * Each UPDATE is scoped by `and("id", "entityId")` so a forged id
     * belonging to a different entity matches no row — the count mismatch
     * then throws NOT_FOUND. This is the T-23-05 entityId-bypass mitigation;
     * RLS via `app.is_admin()` is defense-in-depth on top.
     *
     * The whole batch runs inside a transaction so a partial failure (or a
     * count mismatch from a forged id) rolls back every write — the `order`
     * column can never be left half-applied (WR-06).
     */
    reorder: adminProcedure
        .input(
            z.object({
                entityId: z.coerce.number(),
                orderedIds: z.array(z.coerce.number()),
            }),
        )
        .mutation(async ({ input }) => {
            const now = new Date().toISOString()
            return getClient().begin(async (_tx) => {
                const tx = _tx as TxSql
                const updated: unknown[] = []
                for (const [idx, id] of input.orderedIds.entries()) {
                    const [row] = await tx`
                        UPDATE trustee
                        SET "order" = ${idx}, "updatedAt" = ${now}
                        WHERE id = ${id} AND "entityId" = ${input.entityId}
                        RETURNING *
                    `
                    if (row) updated.push(row)
                }
                // Throw INSIDE the transaction so a partial batch rolls back.
                if (updated.length !== input.orderedIds.length) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message:
                            'One or more trustees not found in this entity',
                    })
                }
                return updated
            })
        }),
})
