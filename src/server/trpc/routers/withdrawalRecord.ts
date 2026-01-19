import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../../db'
import { withdrawalRecord } from '../../../../db/schema'
import {
    insertWithdrawalRecordSchema,
    updateWithdrawalRecordSchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const withdrawalRecordRouter = createTRPCRouter({
    list: adminProcedure
        .input(
            z
                .object({ beneficiaryId: z.coerce.number().optional() })
                .optional(),
        )
        .query(async ({ input }) => {
            if (input?.beneficiaryId) {
                return db
                    .select()
                    .from(withdrawalRecord)
                    .where(
                        eq(withdrawalRecord.beneficiaryId, input.beneficiaryId),
                    )
            }
            return db.select().from(withdrawalRecord)
        }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return db.query.withdrawalRecord.findFirst({
            where: eq(withdrawalRecord.id, input),
        })
    }),

    create: adminProcedure
        .input(insertWithdrawalRecordSchema)
        .mutation(async ({ input }) => {
            const [created] = await db
                .insert(withdrawalRecord)
                .values({ ...input, updatedAt: new Date().toISOString() })
                .returning()
            return created
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                data: updateWithdrawalRecordSchema,
            }),
        )
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(withdrawalRecord)
                .set({ ...input.data, updatedAt: new Date().toISOString() })
                .where(eq(withdrawalRecord.id, input.id))
                .returning()
            return updated
        }),

    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            const [deleted] = await db
                .delete(withdrawalRecord)
                .where(eq(withdrawalRecord.id, input))
                .returning()
            return deleted
        }),
})
