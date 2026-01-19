import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../../db'
import { getTrusteeFeeEntriesWithSchedule } from '../../../../db/queries'
import { trusteeFeeEntry } from '../../../../db/schema'
import {
    insertTrusteeFeeEntrySchema,
    updateTrusteeFeeEntrySchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const trusteeFeeEntryRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number().optional() }).optional())
        .query(async ({ input }) => {
            if (input?.entityId) {
                return db
                    .select()
                    .from(trusteeFeeEntry)
                    .where(eq(trusteeFeeEntry.entityId, input.entityId))
            }
            return db.select().from(trusteeFeeEntry)
        }),

    // List with schedule info
    listWithSchedule: adminProcedure
        .input(z.object({ entityId: z.coerce.number().optional() }).optional())
        .query(async ({ input }) => {
            return getTrusteeFeeEntriesWithSchedule(input?.entityId)
        }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return db.query.trusteeFeeEntry.findFirst({
            where: eq(trusteeFeeEntry.id, input),
        })
    }),

    create: adminProcedure
        .input(insertTrusteeFeeEntrySchema)
        .mutation(async ({ input }) => {
            const [created] = await db
                .insert(trusteeFeeEntry)
                .values({ ...input, updatedAt: new Date().toISOString() })
                .returning()
            return created
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                data: updateTrusteeFeeEntrySchema,
            }),
        )
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(trusteeFeeEntry)
                .set({ ...input.data, updatedAt: new Date().toISOString() })
                .where(eq(trusteeFeeEntry.id, input.id))
                .returning()
            return updated
        }),

    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            const [deleted] = await db
                .delete(trusteeFeeEntry)
                .where(eq(trusteeFeeEntry.id, input))
                .returning()
            return deleted
        }),
})
