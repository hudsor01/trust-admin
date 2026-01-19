import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../../db'
import { personalProperty } from '../../../../db/schema'
import {
    insertPersonalPropertySchema,
    updatePersonalPropertySchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const personalPropertyRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number().optional() }).optional())
        .query(async ({ input }) => {
            if (input?.entityId) {
                return db
                    .select()
                    .from(personalProperty)
                    .where(eq(personalProperty.entityId, input.entityId))
            }
            return db.select().from(personalProperty)
        }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return db.query.personalProperty.findFirst({
            where: eq(personalProperty.id, input),
        })
    }),

    create: adminProcedure
        .input(insertPersonalPropertySchema)
        .mutation(async ({ input }) => {
            const [created] = await db
                .insert(personalProperty)
                .values({ ...input, updatedAt: new Date().toISOString() })
                .returning()
            return created
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                data: updatePersonalPropertySchema,
            }),
        )
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(personalProperty)
                .set({ ...input.data, updatedAt: new Date().toISOString() })
                .where(eq(personalProperty.id, input.id))
                .returning()
            return updated
        }),

    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            const [deleted] = await db
                .delete(personalProperty)
                .where(eq(personalProperty.id, input))
                .returning()
            return deleted
        }),
})
