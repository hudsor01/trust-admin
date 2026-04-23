import { TRPCError } from '@trpc/server'
import { and, eq, ne } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { personalProperty } from '@/db/schema'
import {
    insertPersonalPropertySchema,
    updatePersonalPropertySchema,
} from '@/db/validation'
import { adminProcedure, createTRPCRouter } from '../init'

export const personalPropertyRouter = createTRPCRouter({
    /**
     * Lists rows with optional category filter. Admin views split on
     * this column: /artwork lists `category = 'ART'`, /personal-property
     * lists everything else. One canonical table, two views — the ART
     * enum value does the work of what was historically a separate
     * `artwork` table.
     */
    list: adminProcedure
        .input(
            z.object({
                entityId: z.coerce.number(),
                category: z
                    .enum([
                        'JEWELRY',
                        'ART',
                        'COLLECTIBLES',
                        'ELECTRONICS',
                        'FURNITURE',
                        'OTHER',
                    ])
                    .optional(),
                excludeCategory: z
                    .enum([
                        'JEWELRY',
                        'ART',
                        'COLLECTIBLES',
                        'ELECTRONICS',
                        'FURNITURE',
                        'OTHER',
                    ])
                    .optional(),
            }),
        )
        .query(({ input }) => {
            const filters = [eq(personalProperty.entityId, input.entityId)]
            if (input.category) {
                filters.push(eq(personalProperty.category, input.category))
            }
            if (input.excludeCategory) {
                filters.push(
                    ne(personalProperty.category, input.excludeCategory),
                )
            }
            return db
                .select()
                .from(personalProperty)
                .where(and(...filters))
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
                    message: 'Personal property not found in this entity',
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
                    message: 'Personal property not found in this entity',
                })
            return deleted
        }),
})
