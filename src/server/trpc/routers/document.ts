import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../../db'
import { document } from '../../../../db/schema'
import {
    insertDocumentSchema,
    updateDocumentSchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const documentRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number().optional() }).optional())
        .query(async ({ input }) => {
            if (input?.entityId) {
                return db
                    .select()
                    .from(document)
                    .where(eq(document.entityId, input.entityId))
            }
            return db.select().from(document)
        }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return db.query.document.findFirst({ where: eq(document.id, input) })
    }),

    create: adminProcedure
        .input(insertDocumentSchema)
        .mutation(async ({ input }) => {
            const [created] = await db
                .insert(document)
                .values({ ...input, updatedAt: new Date().toISOString() })
                .returning()
            return created
        }),

    update: adminProcedure
        .input(z.object({ id: z.coerce.number(), data: updateDocumentSchema }))
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(document)
                .set({ ...input.data, updatedAt: new Date().toISOString() })
                .where(eq(document.id, input.id))
                .returning()
            return updated
        }),

    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            const [deleted] = await db
                .delete(document)
                .where(eq(document.id, input))
                .returning()
            return deleted
        }),
})
