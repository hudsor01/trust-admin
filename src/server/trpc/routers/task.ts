import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../../db'
import { task } from '../../../../db/schema'
import { insertTaskSchema, updateTaskSchema } from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const taskRouter = createTRPCRouter({
    list: adminProcedure.query(async () => {
        return db.select().from(task)
    }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return db.query.task.findFirst({
            where: eq(task.id, input),
        })
    }),

    create: adminProcedure
        .input(insertTaskSchema)
        .mutation(async ({ input }) => {
            const [created] = await db
                .insert(task)
                .values({ ...input, updatedAt: new Date().toISOString() })
                .returning()
            return created
        }),

    update: adminProcedure
        .input(z.object({ id: z.coerce.number(), data: updateTaskSchema }))
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(task)
                .set({ ...input.data, updatedAt: new Date().toISOString() })
                .where(eq(task.id, input.id))
                .returning()
            return updated
        }),

    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            const [deleted] = await db
                .delete(task)
                .where(eq(task.id, input))
                .returning()
            return deleted
        }),
})
