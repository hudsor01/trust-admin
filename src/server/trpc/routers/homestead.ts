import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../../db'
import { homestead } from '../../../../db/schema'
import {
    insertHomesteadSchema,
    updateHomesteadSchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const homesteadRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number().optional() }).optional())
        .query(async ({ input }) => {
            if (input?.entityId) {
                return db
                    .select()
                    .from(homestead)
                    .where(eq(homestead.entityId, input.entityId))
            }
            return db.select().from(homestead)
        }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return db.query.homestead.findFirst({
            where: eq(homestead.id, input),
            with: {
                entity: true,
                valuations: true,
                documents: true,
            },
        })
    }),

    create: adminProcedure
        .input(insertHomesteadSchema)
        .mutation(async ({ input }) => {
            const [created] = await db
                .insert(homestead)
                .values({ ...input, updatedAt: new Date().toISOString() })
                .returning()
            return created
        }),

    update: adminProcedure
        .input(z.object({ id: z.coerce.number(), data: updateHomesteadSchema }))
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(homestead)
                .set({ ...input.data, updatedAt: new Date().toISOString() })
                .where(eq(homestead.id, input.id))
                .returning()
            return updated
        }),

    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            const [deleted] = await db
                .delete(homestead)
                .where(eq(homestead.id, input))
                .returning()
            return deleted
        }),
})
