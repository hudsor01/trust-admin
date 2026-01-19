import { eq } from 'drizzle-orm'
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
        .input(z.object({ entityId: z.coerce.number().optional() }).optional())
        .query(async ({ input }) => {
            if (input?.entityId) {
                return db
                    .select()
                    .from(investmentAccount)
                    .where(eq(investmentAccount.entityId, input.entityId))
            }
            return db.select().from(investmentAccount)
        }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return db.query.investmentAccount.findFirst({
            where: eq(investmentAccount.id, input),
        })
    }),

    create: adminProcedure
        .input(insertInvestmentAccountSchema)
        .mutation(async ({ input }) => {
            const [created] = await db
                .insert(investmentAccount)
                .values({ ...input, updatedAt: new Date().toISOString() })
                .returning()
            return created
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                data: updateInvestmentAccountSchema,
            }),
        )
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(investmentAccount)
                .set({ ...input.data, updatedAt: new Date().toISOString() })
                .where(eq(investmentAccount.id, input.id))
                .returning()
            return updated
        }),

    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            const [deleted] = await db
                .delete(investmentAccount)
                .where(eq(investmentAccount.id, input))
                .returning()
            return deleted
        }),
})
