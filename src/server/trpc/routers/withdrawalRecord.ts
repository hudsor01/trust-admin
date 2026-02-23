import { TRPCError } from '@trpc/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { withdrawalRecord } from '@/db/schema'
import {
    insertWithdrawalRecordSchema,
    updateWithdrawalRecordSchema,
} from '@/db/validation'
import { adminProcedure, createTRPCRouter } from '../init'

export const withdrawalRecordRouter = createTRPCRouter({
    list: adminProcedure
        .input(
            z.object({
                entityId: z.coerce.number(),
                beneficiaryId: z.coerce.number().optional(),
            }),
        )
        .query(async ({ input }) => {
            if (input.beneficiaryId) {
                return db
                    .select()
                    .from(withdrawalRecord)
                    .where(
                        and(
                            eq(withdrawalRecord.entityId, input.entityId),
                            eq(
                                withdrawalRecord.beneficiaryId,
                                input.beneficiaryId,
                            ),
                        ),
                    )
            }
            return db
                .select()
                .from(withdrawalRecord)
                .where(eq(withdrawalRecord.entityId, input.entityId))
        }),

    byId: adminProcedure
        .input(z.object({ id: z.coerce.number(), entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            return db.query.withdrawalRecord.findFirst({
                where: and(
                    eq(withdrawalRecord.id, input.id),
                    eq(withdrawalRecord.entityId, input.entityId),
                ),
            })
        }),

    create: adminProcedure
        .input(insertWithdrawalRecordSchema)
        .mutation(async ({ input }) => {
            const [created] = await db
                .insert(withdrawalRecord)
                .values({ ...input, updatedAt: new Date().toISOString() })
                .returning()
            if (!created)
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create withdrawal record',
                })
            return created
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                entityId: z.coerce.number(),
                data: updateWithdrawalRecordSchema,
            }),
        )
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(withdrawalRecord)
                .set({ ...input.data, updatedAt: new Date().toISOString() })
                .where(
                    and(
                        eq(withdrawalRecord.id, input.id),
                        eq(withdrawalRecord.entityId, input.entityId),
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
                .delete(withdrawalRecord)
                .where(
                    and(
                        eq(withdrawalRecord.id, input.id),
                        eq(withdrawalRecord.entityId, input.entityId),
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
