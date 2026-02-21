import { TRPCError } from '@trpc/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { trusteeFeeSchedule } from '@/db/schema'
import {
    insertTrusteeFeeScheduleSchema,
    updateTrusteeFeeScheduleSchema,
} from '@/db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const trusteeFeeScheduleRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            return db
                .select()
                .from(trusteeFeeSchedule)
                .where(eq(trusteeFeeSchedule.entityId, input.entityId))
        }),

    byId: adminProcedure
        .input(z.object({ id: z.coerce.number(), entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            return db.query.trusteeFeeSchedule.findFirst({
                where: and(
                    eq(trusteeFeeSchedule.id, input.id),
                    eq(trusteeFeeSchedule.entityId, input.entityId),
                ),
            })
        }),

    create: adminProcedure
        .input(insertTrusteeFeeScheduleSchema)
        .mutation(async ({ input }) => {
            const [created] = await db
                .insert(trusteeFeeSchedule)
                .values(input)
                .returning()
            if (!created)
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create trustee fee schedule',
                })
            return created
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                entityId: z.coerce.number(),
                data: updateTrusteeFeeScheduleSchema,
            }),
        )
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(trusteeFeeSchedule)
                .set(input.data)
                .where(
                    and(
                        eq(trusteeFeeSchedule.id, input.id),
                        eq(trusteeFeeSchedule.entityId, input.entityId),
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
                .delete(trusteeFeeSchedule)
                .where(
                    and(
                        eq(trusteeFeeSchedule.id, input.id),
                        eq(trusteeFeeSchedule.entityId, input.entityId),
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
