import { TRPCError } from '@trpc/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../../db'
import { getHemsRequestsWithBeneficiary } from '../../../../db/queries'
import { beneficiary, distribution, hemsRequest } from '../../../../db/schema'
import {
    insertHemsRequestSchema,
    updateHemsRequestSchema,
} from '../../../../db/validation'
import { addBreadcrumb, traceBusinessOperation } from '../../../lib/sentry'
import {
    adminProcedure,
    beneficiaryProcedure,
    createTRPCRouter,
} from '../index'

export const hemsRequestRouter = createTRPCRouter({
    list: adminProcedure
        .input(
            z.object({
                entityId: z.coerce.number(),
                beneficiaryId: z.coerce.number().optional(),
            }),
        )
        .query(async ({ input }) => {
            if (input.beneficiaryId) {
                return db
                    .select()
                    .from(hemsRequest)
                    .where(
                        and(
                            eq(hemsRequest.entityId, input.entityId),
                            eq(hemsRequest.beneficiaryId, input.beneficiaryId),
                        ),
                    )
            }
            return db
                .select()
                .from(hemsRequest)
                .where(eq(hemsRequest.entityId, input.entityId))
        }),

    // List with beneficiary info
    listWithBeneficiary: adminProcedure
        .input(
            z.object({
                entityId: z.coerce.number(),
                beneficiaryId: z.coerce.number().optional(),
            }),
        )
        .query(async ({ input }) => {
            return getHemsRequestsWithBeneficiary({
                beneficiaryId: input.beneficiaryId,
                entityId: input.entityId,
            })
        }),

    // Get pending requests for queue
    pending: adminProcedure
        .input(z.object({ entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            return db
                .select()
                .from(hemsRequest)
                .where(
                    and(
                        eq(hemsRequest.entityId, input.entityId),
                        eq(hemsRequest.status, 'PENDING'),
                    ),
                )
        }),

    byId: adminProcedure
        .input(z.object({ id: z.coerce.number(), entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            return db.query.hemsRequest.findFirst({
                where: and(
                    eq(hemsRequest.id, input.id),
                    eq(hemsRequest.entityId, input.entityId),
                ),
            })
        }),

    create: adminProcedure
        .input(insertHemsRequestSchema)
        .mutation(async ({ input }) => {
            const [created] = await db
                .insert(hemsRequest)
                .values({ ...input, updatedAt: new Date().toISOString() })
                .returning()
            if (!created)
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create HEMS request',
                })
            return created
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                entityId: z.coerce.number(),
                data: updateHemsRequestSchema,
            }),
        )
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(hemsRequest)
                .set({ ...input.data, updatedAt: new Date().toISOString() })
                .where(
                    and(
                        eq(hemsRequest.id, input.id),
                        eq(hemsRequest.entityId, input.entityId),
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
                .delete(hemsRequest)
                .where(
                    and(
                        eq(hemsRequest.id, input.id),
                        eq(hemsRequest.entityId, input.entityId),
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

    // Special: Approve HEMS request
    approve: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                entityId: z.coerce.number(),
                approvedAmount: z.string().optional(),
                reviewNotes: z.string().optional(),
            }),
        )
        .mutation(async ({ input }) => {
            addBreadcrumb('hems', `Approving HEMS request ${input.id}`, {
                approvedAmount: input.approvedAmount,
            })

            return traceBusinessOperation(
                'hems.approve',
                {
                    requestId: input.id,
                    approvedAmount: input.approvedAmount ?? 'full',
                },
                async () => {
                    // Verify request exists and is in PENDING status
                    const existing = await db.query.hemsRequest.findFirst({
                        where: and(
                            eq(hemsRequest.id, input.id),
                            eq(hemsRequest.entityId, input.entityId),
                        ),
                    })
                    if (!existing)
                        throw new TRPCError({
                            code: 'NOT_FOUND',
                            message: 'Request not found in this entity',
                        })
                    if (existing.status !== 'PENDING') {
                        throw new TRPCError({
                            code: 'CONFLICT',
                            message: `Cannot approve a request with status: ${existing.status}`,
                        })
                    }

                    const now = new Date().toISOString()
                    const distributionAmount =
                        input.approvedAmount ?? existing.amountRequested

                    // Create distribution record first so we can link it
                    const [newDistribution] = await db
                        .insert(distribution)
                        .values({
                            entityId: input.entityId,
                            beneficiaryId: existing.beneficiaryId,
                            distributionDate: now,
                            amount: distributionAmount,
                            distributionType: 'INCOME',
                            hemsCategory: existing.category,
                            hemsJustification: existing.justification,
                            paymentMethod: 'CHECK',
                            notes: `HEMS request #${input.id}${input.reviewNotes ? `: ${input.reviewNotes}` : ''}`,
                            updatedAt: now,
                        })
                        .returning()

                    const [updated] = await db
                        .update(hemsRequest)
                        .set({
                            status: 'APPROVED',
                            approvedAmount: distributionAmount,
                            reviewNotes: input.reviewNotes,
                            reviewedAt: now,
                            distributionId: newDistribution?.id,
                            updatedAt: now,
                        })
                        .where(
                            and(
                                eq(hemsRequest.id, input.id),
                                eq(hemsRequest.entityId, input.entityId),
                            ),
                        )
                        .returning()
                    if (!updated)
                        throw new TRPCError({
                            code: 'NOT_FOUND',
                            message: 'Request not found in this entity',
                        })

                    return updated
                },
            )
        }),

    // Special: Deny HEMS request
    deny: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                entityId: z.coerce.number(),
                reviewNotes: z.string().optional(),
            }),
        )
        .mutation(async ({ input }) => {
            addBreadcrumb('hems', `Denying HEMS request ${input.id}`)

            return traceBusinessOperation(
                'hems.deny',
                { requestId: input.id },
                async () => {
                    // Verify request exists and is in PENDING status
                    const existing = await db.query.hemsRequest.findFirst({
                        where: and(
                            eq(hemsRequest.id, input.id),
                            eq(hemsRequest.entityId, input.entityId),
                        ),
                    })
                    if (!existing)
                        throw new TRPCError({
                            code: 'NOT_FOUND',
                            message: 'Request not found in this entity',
                        })
                    if (existing.status !== 'PENDING') {
                        throw new TRPCError({
                            code: 'CONFLICT',
                            message: `Cannot deny a request with status: ${existing.status}`,
                        })
                    }

                    const [updated] = await db
                        .update(hemsRequest)
                        .set({
                            status: 'DENIED',
                            reviewNotes: input.reviewNotes,
                            reviewedAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                        })
                        .where(
                            and(
                                eq(hemsRequest.id, input.id),
                                eq(hemsRequest.entityId, input.entityId),
                            ),
                        )
                        .returning()
                    if (!updated)
                        throw new TRPCError({
                            code: 'NOT_FOUND',
                            message: 'Request not found in this entity',
                        })
                    return updated
                },
            )
        }),

    // Portal: Beneficiary submits request
    submit: beneficiaryProcedure
        .input(insertHemsRequestSchema)
        .mutation(async ({ input, ctx }) => {
            // Ensure beneficiary can only submit for themselves
            if (
                !ctx.user.beneficiaryId ||
                input.beneficiaryId !== ctx.user.beneficiaryId
            ) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Can only submit requests for yourself',
                })
            }

            // Verify entityId matches the beneficiary's actual entity
            if (input.entityId) {
                const [ben] = await db
                    .select({ entityId: beneficiary.entityId })
                    .from(beneficiary)
                    .where(eq(beneficiary.id, ctx.user.beneficiaryId))
                    .limit(1)
                if (!ben || ben.entityId !== input.entityId) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'Invalid entity for this beneficiary',
                    })
                }
            }

            addBreadcrumb('hems', 'Beneficiary submitting HEMS request', {
                beneficiaryId: input.beneficiaryId,
                category: input.category,
            })

            return traceBusinessOperation(
                'hems.submit',
                {
                    beneficiaryId: input.beneficiaryId ?? 0,
                    category: input.category ?? 'unknown',
                },
                async () => {
                    const [created] = await db
                        .insert(hemsRequest)
                        .values({
                            ...input,
                            status: 'PENDING',
                            updatedAt: new Date().toISOString(),
                        })
                        .returning()
                    if (!created)
                        throw new TRPCError({
                            code: 'INTERNAL_SERVER_ERROR',
                            message: 'Failed to submit HEMS request',
                        })
                    return created
                },
            )
        }),

    // Portal: Beneficiary views own requests
    myRequests: beneficiaryProcedure.query(async ({ ctx }) => {
        if (!ctx.user.beneficiaryId) {
            return []
        }
        return db
            .select()
            .from(hemsRequest)
            .where(eq(hemsRequest.beneficiaryId, ctx.user.beneficiaryId))
    }),
})
