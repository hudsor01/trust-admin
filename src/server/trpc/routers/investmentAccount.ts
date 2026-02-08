import { TRPCError } from '@trpc/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../../db'
import { investmentAccount } from '../../../../db/schema'
import {
    insertInvestmentAccountSchema,
    updateInvestmentAccountSchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const investmentAccountRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            return db
                .select()
                .from(investmentAccount)
                .where(eq(investmentAccount.entityId, input.entityId))
        }),

    byId: adminProcedure
        .input(z.object({ id: z.coerce.number(), entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            return db.query.investmentAccount.findFirst({
                where: and(
                    eq(investmentAccount.id, input.id),
                    eq(investmentAccount.entityId, input.entityId),
                ),
            })
        }),

    create: adminProcedure
        .input(insertInvestmentAccountSchema)
        .mutation(async ({ input }) => {
            const [created] = await db
                .insert(investmentAccount)
                .values({ ...input, updatedAt: new Date().toISOString() })
                .returning()
            if (!created)
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create investment account',
                })
            return created
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                entityId: z.coerce.number(),
                data: updateInvestmentAccountSchema,
            }),
        )
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(investmentAccount)
                .set({ ...input.data, updatedAt: new Date().toISOString() })
                .where(
                    and(
                        eq(investmentAccount.id, input.id),
                        eq(investmentAccount.entityId, input.entityId),
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
                .delete(investmentAccount)
                .where(
                    and(
                        eq(investmentAccount.id, input.id),
                        eq(investmentAccount.entityId, input.entityId),
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
