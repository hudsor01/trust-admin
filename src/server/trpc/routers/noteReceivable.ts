import { TRPCError } from '@trpc/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { getReceivablePayments, recordReceivablePayment } from '@/db/queries'
import { bankAccount, beneficiary, noteReceivable } from '@/db/schema'
import {
    insertNoteReceivableSchema,
    updateNoteReceivableSchema,
} from '@/db/validation'
import { addBreadcrumb, traceBusinessOperation } from '@/lib/sentry'
import { PAYMENT_METHOD_VALUES } from '@/lib/type-utils'
import { adminProcedure, createTRPCRouter } from '../init'

const recordPaymentSchema = z.object({
    entityId: z.coerce.number(),
    receivableId: z.coerce.number(),
    paymentDate: z.string(),
    amount: z.string(),
    bankAccountId: z.coerce.number(),
    principalPortion: z.string().optional(),
    interestPortion: z.string().optional(),
    paymentMethod: z.enum(PAYMENT_METHOD_VALUES),
    checkNumber: z.string().optional(),
    confirmationNumber: z.string().optional(),
    notes: z.string().optional(),
})

/**
 * When a receivable is linked to a beneficiary (debtor is also a beneficiary),
 * verify that beneficiary belongs to the SAME entity — same cross-entity
 * tampering guard used on liability's linked-account FKs.
 */
async function assertBeneficiaryInEntity(params: {
    entityId: number
    beneficiaryId?: number | null
}): Promise<void> {
    if (params.beneficiaryId === null || params.beneficiaryId === undefined) {
        return
    }
    const row = await db.query.beneficiary.findFirst({
        where: and(
            eq(beneficiary.id, params.beneficiaryId),
            eq(beneficiary.entityId, params.entityId),
        ),
    })
    if (!row) {
        throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Linked beneficiary does not belong to this entity',
        })
    }
}

export const noteReceivableRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            return db
                .select()
                .from(noteReceivable)
                .where(eq(noteReceivable.entityId, input.entityId))
        }),

    byId: adminProcedure
        .input(z.object({ id: z.coerce.number(), entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            return db.query.noteReceivable.findFirst({
                where: and(
                    eq(noteReceivable.id, input.id),
                    eq(noteReceivable.entityId, input.entityId),
                ),
                with: { entity: true, beneficiary: true, payments: true },
            })
        }),

    create: adminProcedure
        .input(insertNoteReceivableSchema)
        .mutation(async ({ input }) => {
            await assertBeneficiaryInEntity({
                entityId: input.entityId,
                beneficiaryId: input.beneficiaryId,
            })
            const [created] = await db
                .insert(noteReceivable)
                .values({ ...input, updatedAt: new Date().toISOString() })
                .returning()
            if (!created)
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create note receivable',
                })
            return created
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                entityId: z.coerce.number(),
                data: updateNoteReceivableSchema,
            }),
        )
        .mutation(async ({ input }) => {
            // Confirm the row exists in the caller's entity FIRST, so a probe for
            // an out-of-scope row 404s rather than leaking entity membership via
            // the beneficiary FK guard's BAD_REQUEST.
            const existing = await db.query.noteReceivable.findFirst({
                where: and(
                    eq(noteReceivable.id, input.id),
                    eq(noteReceivable.entityId, input.entityId),
                ),
            })
            if (!existing) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Record not found in this entity',
                })
            }
            await assertBeneficiaryInEntity({
                entityId: input.entityId,
                beneficiaryId: input.data.beneficiaryId,
            })
            const [updated] = await db
                .update(noteReceivable)
                .set({ ...input.data, updatedAt: new Date().toISOString() })
                .where(
                    and(
                        eq(noteReceivable.id, input.id),
                        eq(noteReceivable.entityId, input.entityId),
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
                .delete(noteReceivable)
                .where(
                    and(
                        eq(noteReceivable.id, input.id),
                        eq(noteReceivable.entityId, input.entityId),
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

    /** Record a repayment, subtract principal from balance, and post a trust accounting INCOME entry. */
    recordPayment: adminProcedure
        .input(recordPaymentSchema)
        .mutation(async ({ input }) => {
            const receivableRecord = await db.query.noteReceivable.findFirst({
                where: and(
                    eq(noteReceivable.id, input.receivableId),
                    eq(noteReceivable.entityId, input.entityId),
                ),
            })
            if (!receivableRecord) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Note receivable not found in this entity',
                })
            }

            const account = await db.query.bankAccount.findFirst({
                where: and(
                    eq(bankAccount.id, input.bankAccountId),
                    eq(bankAccount.entityId, input.entityId),
                ),
            })
            if (!account) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Bank account does not belong to this entity',
                })
            }

            addBreadcrumb('receivable', 'Recording receivable payment', {
                receivableId: input.receivableId,
                amount: input.amount,
                paymentMethod: input.paymentMethod,
            })

            return traceBusinessOperation(
                'receivable.recordPayment',
                {
                    receivableId: input.receivableId,
                    amount: input.amount,
                    paymentMethod: input.paymentMethod ?? 'unknown',
                },
                async () => recordReceivablePayment(input),
            )
        }),

    getPayments: adminProcedure
        .input(
            z.object({
                receivableId: z.coerce.number(),
                entityId: z.coerce.number(),
            }),
        )
        .query(async ({ input }) => {
            const receivableRecord = await db.query.noteReceivable.findFirst({
                where: and(
                    eq(noteReceivable.id, input.receivableId),
                    eq(noteReceivable.entityId, input.entityId),
                ),
            })
            if (!receivableRecord) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Note receivable not found in this entity',
                })
            }
            return getReceivablePayments(input.receivableId)
        }),
})
