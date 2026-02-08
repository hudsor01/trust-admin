import { TRPCError } from '@trpc/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../../db'
import { bankAccount } from '../../../../db/schema'
import {
    insertBankAccountSchema,
    updateBankAccountSchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const bankAccountRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            return db
                .select()
                .from(bankAccount)
                .where(eq(bankAccount.entityId, input.entityId))
        }),

    byId: adminProcedure
        .input(z.object({ id: z.coerce.number(), entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            return db.query.bankAccount.findFirst({
                where: and(
                    eq(bankAccount.id, input.id),
                    eq(bankAccount.entityId, input.entityId),
                ),
                with: {
                    entity: true,
                    valuations: true,
                    documents: true,
                    transactions: true,
                },
            })
        }),

    create: adminProcedure
        .input(insertBankAccountSchema)
        .mutation(async ({ input }) => {
            const [created] = await db
                .insert(bankAccount)
                .values({ ...input, updatedAt: new Date().toISOString() })
                .returning()
            if (!created)
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create bank account',
                })
            return created
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                entityId: z.coerce.number(),
                data: updateBankAccountSchema,
            }),
        )
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(bankAccount)
                .set({ ...input.data, updatedAt: new Date().toISOString() })
                .where(
                    and(
                        eq(bankAccount.id, input.id),
                        eq(bankAccount.entityId, input.entityId),
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
                .delete(bankAccount)
                .where(
                    and(
                        eq(bankAccount.id, input.id),
                        eq(bankAccount.entityId, input.entityId),
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
