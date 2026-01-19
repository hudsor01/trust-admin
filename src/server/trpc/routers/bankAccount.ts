import { eq } from 'drizzle-orm'
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
        .input(z.object({ entityId: z.coerce.number().optional() }).optional())
        .query(async ({ input }) => {
            if (input?.entityId) {
                return db
                    .select()
                    .from(bankAccount)
                    .where(eq(bankAccount.entityId, input.entityId))
            }
            return db.select().from(bankAccount)
        }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return db.query.bankAccount.findFirst({
            where: eq(bankAccount.id, input),
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
            return created
        }),

    update: adminProcedure
        .input(
            z.object({ id: z.coerce.number(), data: updateBankAccountSchema }),
        )
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(bankAccount)
                .set({ ...input.data, updatedAt: new Date().toISOString() })
                .where(eq(bankAccount.id, input.id))
                .returning()
            return updated
        }),

    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            const [deleted] = await db
                .delete(bankAccount)
                .where(eq(bankAccount.id, input))
                .returning()
            return deleted
        }),
})
