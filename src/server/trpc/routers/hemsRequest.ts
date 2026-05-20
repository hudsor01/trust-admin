import { TRPCError } from '@trpc/server'
import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import {
    approveHemsRequest,
    getHemsRequestsWithBeneficiary,
} from '@/db/queries'
import { beneficiary, hemsRequest } from '@/db/schema'
import {
    insertHemsRequestSchema,
    updateHemsRequestSchema,
} from '@/db/validation'
import { addBreadcrumb, traceBusinessOperation } from '@/lib/sentry'
import { adminProcedure, beneficiaryProcedure, createTRPCRouter } from '../init'

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

    /** Approve: sets APPROVED status and auto-creates a distribution record. */
    approve: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                entityId: z.coerce.number(),
                approvedAmount: z.string().optional(),
                reviewNotes: z.string().optional(),
                distributionType: z
                    .enum([
                        'INCOME',
                        'PRINCIPAL',
                        'CAPITAL_GAIN',
                        'EXPENSE_REIMBURSEMENT',
                        'OTHER',
                    ])
                    .optional(),
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

                    return approveHemsRequest({
                        id: input.id,
                        entityId: input.entityId,
                        approvedAmount: input.approvedAmount,
                        reviewNotes: input.reviewNotes,
                        distributionType: input.distributionType,
                        existing: {
                            beneficiaryId: existing.beneficiaryId,
                            category: existing.category,
                            justification: existing.justification,
                            amountRequested: existing.amountRequested,
                        },
                    })
                },
            )
        }),

    /** Mark distributed: flip APPROVED -> DISTRIBUTED. Distribution record was already created by approve. */
    markDistributed: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                entityId: z.coerce.number(),
            }),
        )
        .mutation(async ({ input }) => {
            addBreadcrumb(
                'hems',
                `Marking HEMS request ${input.id} distributed`,
            )

            return traceBusinessOperation(
                'hems.markDistributed',
                { requestId: input.id, entityId: input.entityId },
                async () => {
                    const existing = await db.query.hemsRequest.findFirst({
                        where: and(
                            eq(hemsRequest.id, input.id),
                            eq(hemsRequest.entityId, input.entityId),
                        ),
                    })
                    if (!existing)
                        throw new TRPCError({
                            code: 'NOT_FOUND',
                            message: 'HEMS request not found in this entity',
                        })
                    if (existing.status !== 'APPROVED') {
                        throw new TRPCError({
                            code: 'CONFLICT',
                            message: `Cannot mark distributed: current status is ${existing.status}. Request must be APPROVED first.`,
                        })
                    }
                    const [updated] = await db
                        .update(hemsRequest)
                        .set({
                            status: 'DISTRIBUTED',
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
                            code: 'INTERNAL_SERVER_ERROR',
                            message: 'Failed to mark request distributed',
                        })
                    return updated
                },
            )
        }),

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
                                eq(hemsRequest.status, 'PENDING'),
                            ),
                        )
                        .returning()
                    if (!updated)
                        throw new TRPCError({
                            code: 'CONFLICT',
                            message:
                                'Request is no longer PENDING — it may have been approved or denied concurrently',
                        })
                    return updated
                },
            )
        }),

    cancel: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                entityId: z.coerce.number(),
                reviewNotes: z.string().optional(),
            }),
        )
        .mutation(async ({ input }) => {
            addBreadcrumb('hems', `Cancelling HEMS request ${input.id}`)

            return traceBusinessOperation(
                'hems.cancel',
                { requestId: input.id },
                async () => {
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

                    // Allow cancel of ANY status -- do NOT check existing.status
                    // If request was APPROVED with a linked distribution, the distribution remains untouched
                    const [updated] = await db
                        .update(hemsRequest)
                        .set({
                            status: 'CANCELLED',
                            reviewNotes:
                                input.reviewNotes ??
                                `Cancelled by admin${existing.status !== 'PENDING' ? ` (was ${existing.status})` : ''}`,
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
                            code: 'INTERNAL_SERVER_ERROR',
                            message: 'Failed to cancel request',
                        })
                    return updated
                },
            )
        }),

    submit: beneficiaryProcedure
        .input(insertHemsRequestSchema)
        .mutation(async ({ input, ctx }) => {
            // Beneficiaries can only submit requests for themselves
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

    myRequests: beneficiaryProcedure.query(async ({ ctx }) => {
        if (!ctx.user.beneficiaryId) {
            return []
        }
        return db
            .select()
            .from(hemsRequest)
            .where(eq(hemsRequest.beneficiaryId, ctx.user.beneficiaryId))
            .orderBy(desc(hemsRequest.createdAt))
            .limit(50)
    }),
})
