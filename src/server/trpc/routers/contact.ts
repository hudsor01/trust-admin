import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../../db'
import { contact } from '../../../../db/schema'
import {
    insertContactSchema,
    updateContactSchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const contactRouter = createTRPCRouter({
    // Contacts are shared across entities (attorneys, accountants, advisors)
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number().optional() }).optional())
        .query(async ({ input: _input }) => {
            return db.select().from(contact)
        }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return db.query.contact.findFirst({
            where: eq(contact.id, input),
        })
    }),

    create: adminProcedure
        .input(insertContactSchema)
        .mutation(async ({ input }) => {
            const [created] = await db
                .insert(contact)
                .values({ ...input, updatedAt: new Date().toISOString() })
                .returning()
            return created
        }),

    update: adminProcedure
        .input(z.object({ id: z.coerce.number(), data: updateContactSchema }))
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(contact)
                .set({ ...input.data, updatedAt: new Date().toISOString() })
                .where(eq(contact.id, input.id))
                .returning()
            return updated
        }),

    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            const [deleted] = await db
                .delete(contact)
                .where(eq(contact.id, input))
                .returning()
            return deleted
        }),
})
