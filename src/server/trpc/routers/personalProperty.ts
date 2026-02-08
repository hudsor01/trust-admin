import { TRPCError } from '@trpc/server'
import { and, eq } from 'drizzle-orm'
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
        .input(z.object({ entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            return db
                .select()
                .from(personalProperty)
                .where(eq(personalProperty.entityId, input.entityId))
        }),

    byId: adminProcedure
        .input(z.object({ id: z.coerce.number(), entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            return db.query.personalProperty.findFirst({
                where: and(
                    eq(personalProperty.id, input.id),
                    eq(personalProperty.entityId, input.entityId),
                ),
            })
        }),

    create: adminProcedure
        .input(insertPersonalPropertySchema)
        .mutation(async ({ input }) => {
            const [created] = await db
                .insert(personalProperty)
                .values({ ...input, updatedAt: new Date().toISOString() })
                .returning()
            if (!created)
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create personal property',
                })
            return created
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                entityId: z.coerce.number(),
                data: updatePersonalPropertySchema,
            }),
        )
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(personalProperty)
                .set({ ...input.data, updatedAt: new Date().toISOString() })
                .where(
                    and(
                        eq(personalProperty.id, input.id),
                        eq(personalProperty.entityId, input.entityId),
                    ),
                )
                .returning()
            if (!updated)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Record not found in this entity',
                })
            return updated
        }),

    delete: adminProcedure
        .input(z.object({ id: z.coerce.number(), entityId: z.coerce.number() }))
        .mutation(async ({ input }) => {
            const [deleted] = await db
                .delete(personalProperty)
                .where(
                    and(
                        eq(personalProperty.id, input.id),
                        eq(personalProperty.entityId, input.entityId),
                    ),
                )
                .returning()
            if (!deleted)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Record not found in this entity',
                })
            return deleted
        }),
})
