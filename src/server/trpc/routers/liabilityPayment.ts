import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../../db'
import { liabilityPayment } from '../../../../db/schema'
import {
    insertLiabilityPaymentSchema,
    updateLiabilityPaymentSchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const liabilityPaymentRouter = createTRPCRouter({
    list: adminProcedure
        .input(
            z.object({ liabilityId: z.coerce.number().optional() }).optional(),
        )
        .query(async ({ input }) => {
            if (input?.liabilityId) {
                return db
                    .select()
                    .from(liabilityPayment)
                    .where(eq(liabilityPayment.liabilityId, input.liabilityId))
            }
            return db.select().from(liabilityPayment)
        }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return db.query.liabilityPayment.findFirst({
            where: eq(liabilityPayment.id, input),
        })
    }),

    create: adminProcedure
        .input(insertLiabilityPaymentSchema)
        .mutation(async ({ input }) => {
            const [created] = await db
                .insert(liabilityPayment)
                .values(input)
                .returning()
            return created
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                data: updateLiabilityPaymentSchema,
            }),
        )
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(liabilityPayment)
                .set(input.data)
                .where(eq(liabilityPayment.id, input.id))
                .returning()
            return updated
        }),

    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            const [deleted] = await db
                .delete(liabilityPayment)
                .where(eq(liabilityPayment.id, input))
                .returning()
            return deleted
        }),
})
