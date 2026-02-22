import { TRPCError } from '@trpc/server'
import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { getEntityById } from '@/db/queries'
import { entity } from '@/db/schema'
import { insertEntitySchema, updateEntitySchema } from '@/db/validation'
import { adminProcedure, createTRPCRouter } from '../init'

export const entityRouter = createTRPCRouter({
    list: adminProcedure.query(async () => {
        return db.select().from(entity).orderBy(asc(entity.id))
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
            if (!created)
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create entity',
                })
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
            if (!updated)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Entity not found',
                })
            return updated
        }),

    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            const [deleted] = await db
                .delete(entity)
                .where(eq(entity.id, input))
                .returning()
            if (!deleted)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Entity not found',
                })
            return deleted
        }),
})
