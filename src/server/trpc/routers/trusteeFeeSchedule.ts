import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../../db'
import { trusteeFeeSchedule } from '../../../../db/schema'
import {
    insertTrusteeFeeScheduleSchema,
    updateTrusteeFeeScheduleSchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const trusteeFeeScheduleRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number().optional() }).optional())
        .query(async ({ input }) => {
            if (input?.entityId) {
                return db
                    .select()
                    .from(trusteeFeeSchedule)
                    .where(eq(trusteeFeeSchedule.entityId, input.entityId))
            }
            return db.select().from(trusteeFeeSchedule)
        }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return db.query.trusteeFeeSchedule.findFirst({
            where: eq(trusteeFeeSchedule.id, input),
        })
    }),

    create: adminProcedure
        .input(insertTrusteeFeeScheduleSchema)
        .mutation(async ({ input }) => {
            const [created] = await db
                .insert(trusteeFeeSchedule)
                .values(input)
                .returning()
            return created
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                data: updateTrusteeFeeScheduleSchema,
            }),
        )
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(trusteeFeeSchedule)
                .set(input.data)
                .where(eq(trusteeFeeSchedule.id, input.id))
                .returning()
            return updated
        }),

    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            const [deleted] = await db
                .delete(trusteeFeeSchedule)
                .where(eq(trusteeFeeSchedule.id, input))
                .returning()
            return deleted
        }),
})
