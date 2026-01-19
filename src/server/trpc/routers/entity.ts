import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../../db'
import { getEntityById } from '../../../../db/queries'
import { entity } from '../../../../db/schema'
import {
    insertEntitySchema,
    updateEntitySchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const entityRouter = createTRPCRouter({
    list: adminProcedure.query(async () => {
        return db.select().from(entity)
    }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return getEntityById(input)
    }),

    create: adminProcedure
        .input(insertEntitySchema)
        .mutation(async ({ input }) => {
            const [created] = await db
                .insert(entity)
                .values({ ...input, updatedAt: new Date().toISOString() })
                .returning()
            return created
        }),

    update: adminProcedure
        .input(z.object({ id: z.coerce.number(), data: updateEntitySchema }))
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(entity)
                .set({ ...input.data, updatedAt: new Date().toISOString() })
                .where(eq(entity.id, input.id))
                .returning()
            return updated
        }),

    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            const [deleted] = await db
                .delete(entity)
                .where(eq(entity.id, input))
                .returning()
            return deleted
        }),
})
