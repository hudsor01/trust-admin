import { TRPCError } from '@trpc/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { liability, liabilityPayment } from '@/db/schema'
import {
    insertLiabilityPaymentSchema,
    updateLiabilityPaymentSchema,
} from '@/db/validation'
import { adminProcedure, createTRPCRouter } from '../init'

export const liabilityPaymentRouter = createTRPCRouter({
    list: adminProcedure
        .input(
            z.object({
                liabilityId: z.coerce.number(),
                entityId: z.coerce.number(),
            }),
        )
        .query(async ({ input }) => {
            // Payments lack entityId; join on liability to enforce entity isolation
            return db
                .select({ liabilityPayment })
                .from(liabilityPayment)
                .innerJoin(
                    liability,
                    and(
                        eq(liability.id, liabilityPayment.liabilityId),
                        eq(liability.entityId, input.entityId),
                    ),
                )
                .where(eq(liabilityPayment.liabilityId, input.liabilityId))
                .then((rows) => rows.map((r) => r.liabilityPayment))
        }),

    byId: adminProcedure
        .input(z.object({ id: z.coerce.number(), entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            const rows = await db
                .select({ liabilityPayment })
                .from(liabilityPayment)
                .innerJoin(
                    liability,
                    and(
                        eq(liability.id, liabilityPayment.liabilityId),
                        eq(liability.entityId, input.entityId),
                    ),
                )
                .where(eq(liabilityPayment.id, input.id))
                .limit(1)
            return rows[0]?.liabilityPayment ?? null
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
                entityId: z.coerce.number(),
                data: updateLiabilityPaymentSchema,
            }),
        )
        .mutation(async ({ input }) => {
            const existing = await db
                .select({ liabilityPayment })
                .from(liabilityPayment)
                .innerJoin(
                    liability,
                    and(
                        eq(liability.id, liabilityPayment.liabilityId),
                        eq(liability.entityId, input.entityId),
                    ),
                )
                .where(eq(liabilityPayment.id, input.id))
                .limit(1)
            if (!existing[0])
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Liability payment not found',
                })
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
        .input(z.object({ id: z.coerce.number(), entityId: z.coerce.number() }))
        .mutation(async ({ input }) => {
            const existing = await db
                .select({ liabilityPayment })
                .from(liabilityPayment)
                .innerJoin(
                    liability,
                    and(
                        eq(liability.id, liabilityPayment.liabilityId),
                        eq(liability.entityId, input.entityId),
                    ),
                )
                .where(eq(liabilityPayment.id, input.id))
                .limit(1)
            if (!existing[0])
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Liability payment not found',
                })
            const [deleted] = await db
                .delete(liabilityPayment)
                .where(eq(liabilityPayment.id, input.id))
                .returning()
            if (!deleted)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Liability payment not found',
                })
            return deleted
        }),
})
