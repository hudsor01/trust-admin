import { TRPCError } from '@trpc/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, getClient } from '@/db'
import { contact, contactAssociation } from '@/db/schema'
import { insertContactSchema, updateContactSchema } from '@/db/validation'
import { adminProcedure, createTRPCRouter } from '../init'

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
            if (!created)
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create contact',
                })
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
            if (!updated)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Contact not found',
                })
            return updated
        }),

    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            const sql = getClient()
            const [deleted] = await sql.begin(async (tx) => {
                await tx`DELETE FROM contact_association WHERE "contactId" = ${input}`
                return tx`DELETE FROM contact WHERE id = ${input} RETURNING *`
            })
            if (!deleted)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Contact not found',
                })
            // postgres.js returns bigint as string — coerce to match Drizzle shape
            return {
                id: Number(deleted.id),
                name: deleted.name as string,
            }
        }),
})
