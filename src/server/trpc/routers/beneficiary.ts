import { TRPCError } from '@trpc/server'
import { and, asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import {
    getBeneficiariesWithDistributions,
    getBeneficiaryById,
    markBeneficiaryDeceased,
    recalculateBeneficiaryShares,
} from '@/db/queries'
import { beneficiary } from '@/db/schema'
import {
    insertBeneficiarySchema,
    updateBeneficiarySchema,
} from '@/db/validation'
import { addBreadcrumb, traceBusinessOperation } from '@/lib/sentry'
import { adminProcedure, beneficiaryProcedure, createTRPCRouter } from '../init'

export const beneficiaryRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            // .orderBy(asc(sortIndex)) matches idx_beneficiary_entity_sort
            // (entityId, sortIndex) — the composite index backs the query.
            return db
                .select()
                .from(beneficiary)
                .where(eq(beneficiary.entityId, input.entityId))
                .orderBy(asc(beneficiary.sortIndex))
        }),

    listWithDistributions: adminProcedure
        .input(z.object({ entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            return getBeneficiariesWithDistributions(input.entityId)
        }),

    byId: adminProcedure
        .input(z.object({ id: z.coerce.number(), entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            return db.query.beneficiary.findFirst({
                where: and(
                    eq(beneficiary.id, input.id),
                    eq(beneficiary.entityId, input.entityId),
                ),
            })
        }),

    create: adminProcedure
        .input(insertBeneficiarySchema)
        .mutation(async ({ input }) => {
            const [created] = await db
                .insert(beneficiary)
                .values({ ...input, updatedAt: new Date().toISOString() })
                .returning()
            if (!created)
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create beneficiary',
                })
            return created
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                entityId: z.coerce.number(),
                data: updateBeneficiarySchema,
            }),
        )
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(beneficiary)
                .set({ ...input.data, updatedAt: new Date().toISOString() })
                .where(
                    and(
                        eq(beneficiary.id, input.id),
                        eq(beneficiary.entityId, input.entityId),
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
                .delete(beneficiary)
                .where(
                    and(
                        eq(beneficiary.id, input.id),
                        eq(beneficiary.entityId, input.entityId),
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

    me: beneficiaryProcedure.query(async ({ ctx }) => {
        if (!ctx.user.beneficiaryId) {
            return null
        }
        return getBeneficiaryById(ctx.user.beneficiaryId)
    }),

    updateMyContact: beneficiaryProcedure
        .input(
            z.object({
                email: z.email('Invalid email format').optional().nullable(),
                phone: z.string().optional().nullable(),
                streetAddress: z
                    .string()
                    .min(5, 'Street address must be at least 5 characters')
                    .regex(
                        /^[A-Za-z0-9\s#.',-]+$/,
                        'Street address must contain only letters, numbers, and common punctuation',
                    )
                    .optional()
                    .nullable(),
                city: z
                    .string()
                    .min(2, 'City must be at least 2 characters')
                    .regex(/^[A-Za-z\s'.-]+$/, 'City must contain only letters')
                    .optional()
                    .nullable(),
                state: z
                    .string()
                    .regex(
                        /^[A-Z]{2}$/,
                        'State must be 2 uppercase letters (e.g. TX)',
                    )
                    .optional()
                    .nullable(),
                zip: z
                    .string()
                    .regex(/^\d{5}$/, 'ZIP code must be exactly 5 digits')
                    .optional()
                    .nullable(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            if (!ctx.user.beneficiaryId) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'No beneficiary profile linked to this account',
                })
            }
            const [updated] = await db
                .update(beneficiary)
                .set({ ...input, updatedAt: new Date().toISOString() })
                .where(eq(beneficiary.id, ctx.user.beneficiaryId))
                .returning()
            if (!updated) {
                throw new TRPCError({ code: 'NOT_FOUND' })
            }
            return updated
        }),

    // =========================================================================
    // DEATH HANDLING - Trust Section 7.01
    // If beneficiary dies before complete distribution, share goes pro-rata
    // =========================================================================

    /** Per Trust Section 7.01: deceased beneficiary's share goes pro-rata to living beneficiaries. */
    markDeceased: adminProcedure
        .input(
            z.object({
                beneficiaryId: z.coerce.number(),
                entityId: z.coerce.number(),
                deceasedDate: z.string(),
            }),
        )
        .mutation(async ({ input }) => {
            addBreadcrumb('beneficiary', 'Marking beneficiary as deceased', {
                beneficiaryId: input.beneficiaryId,
                deceasedDate: input.deceasedDate,
            })

            return traceBusinessOperation(
                'beneficiary.markDeceased',
                {
                    beneficiaryId: input.beneficiaryId,
                    deceasedDate: input.deceasedDate,
                },
                async () => {
                    const ben = await db.query.beneficiary.findFirst({
                        where: and(
                            eq(beneficiary.id, input.beneficiaryId),
                            eq(beneficiary.entityId, input.entityId),
                        ),
                        columns: { id: true },
                    })
                    if (!ben)
                        throw new TRPCError({
                            code: 'NOT_FOUND',
                            message: 'Beneficiary not found in this entity',
                        })
                    return markBeneficiaryDeceased({
                        beneficiaryId: input.beneficiaryId,
                        deceasedDate: input.deceasedDate,
                    })
                },
            )
        }),

    recalculateShares: adminProcedure
        .input(
            z.object({
                entityId: z.coerce.number(),
                excludeBeneficiaryId: z.coerce.number(),
            }),
        )
        .mutation(async ({ input }) => {
            addBreadcrumb('beneficiary', 'Recalculating beneficiary shares', {
                entityId: input.entityId,
                excludeBeneficiaryId: input.excludeBeneficiaryId,
            })

            return traceBusinessOperation(
                'beneficiary.recalculateShares',
                {
                    entityId: input.entityId,
                    excludeBeneficiaryId: input.excludeBeneficiaryId,
                },
                async () => {
                    return recalculateBeneficiaryShares(
                        input.entityId,
                        input.excludeBeneficiaryId,
                    )
                },
            )
        }),
})
