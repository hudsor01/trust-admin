import { TRPCError } from '@trpc/server'
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
        .input(z.object({ liabilityId: z.coerce.number() }))
        .query(async ({ input }) => {
            return db
                .select()
                .from(liabilityPayment)
                .where(eq(liabilityPayment.liabilityId, input.liabilityId))
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
            if (!created)
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create liability payment',
                })
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
            if (!updated)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Liability payment not found',
                })
            return updated
        }),

    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            const [deleted] = await db
                .delete(liabilityPayment)
                .where(eq(liabilityPayment.id, input))
                .returning()
            if (!deleted)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Liability payment not found',
                })
            return deleted
        }),
})
