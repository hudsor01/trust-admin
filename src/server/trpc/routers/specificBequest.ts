import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../../db'
import { specificBequest } from '../../../../db/schema'
import {
    insertSpecificBequestSchema,
    updateSpecificBequestSchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const specificBequestRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number().optional() }).optional())
        .query(async ({ input }) => {
            if (input?.entityId) {
                return db
                    .select()
                    .from(specificBequest)
                    .where(eq(specificBequest.entityId, input.entityId))
            }
            return db.select().from(specificBequest)
        }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return db.query.specificBequest.findFirst({
            where: eq(specificBequest.id, input),
        })
    }),

    create: adminProcedure
        .input(insertSpecificBequestSchema)
        .mutation(async ({ input }) => {
            const [created] = await db
                .insert(specificBequest)
                .values({ ...input, updatedAt: new Date().toISOString() })
                .returning()
            return created
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                data: updateSpecificBequestSchema,
            }),
        )
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(specificBequest)
                .set({ ...input.data, updatedAt: new Date().toISOString() })
                .where(eq(specificBequest.id, input.id))
                .returning()
            return updated
        }),

    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            const [deleted] = await db
                .delete(specificBequest)
                .where(eq(specificBequest.id, input))
                .returning()
            return deleted
        }),
})
