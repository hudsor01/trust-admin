import { TRPCError } from '@trpc/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { getLiabilityPayments, recordLiabilityPayment } from '@/db/queries'
import { bankAccount, investmentAccount, liability } from '@/db/schema'
import { insertLiabilitySchema, updateLiabilitySchema } from '@/db/validation'
import { estimatePayoffDate } from '@/lib/amortization'
import { addBreadcrumb, traceBusinessOperation } from '@/lib/sentry'
import {
    ALLOCATION_CLASS_VALUES,
    LIABILITY_TYPE_VALUES,
    PAYMENT_METHOD_VALUES,
} from '@/lib/type-utils'
import { adminProcedure, createTRPCRouter } from '../init'

// Simplified subset for rapid bulk entry
const bulkLiabilityRowSchema = z.object({
    liabilityType: z.enum(LIABILITY_TYPE_VALUES),
    creditor: z.string().min(1),
    currentBalance: z.string().regex(/^[\d,]+\.?\d*$/),
    interestRate: z.string().optional(),
    monthlyPayment: z.string().optional(),
    loanTermMonths: z.string().optional(),
    escrowMonthly: z.string().optional(),
})

const recordPaymentSchema = z.object({
    entityId: z.coerce.number(),
    liabilityId: z.coerce.number(),
    paymentDate: z.string(),
    amount: z.string(),
    bankAccountId: z.coerce.number(),
    principalPortion: z.string().optional(),
    interestPortion: z.string().optional(),
    escrowPortion: z.string().optional(),
    paymentMethod: z.enum(PAYMENT_METHOD_VALUES),
    checkNumber: z.string().optional(),
    confirmationNumber: z.string().optional(),
    notes: z.string().optional(),
    allocationClass: z.enum(ALLOCATION_CLASS_VALUES).optional(),
})

/**
 * Verify each non-null linked-account FK on a liability payload belongs to the
 * SAME entity as the liability (cross-entity tampering guard — T-26-01).
 *
 * A `bankAccountId` / `investmentAccountId` is attacker-controllable: a request
 * scoped to entity A could otherwise attach an account belonging to entity B
 * and leak it through /accounts row-detail. For each supplied FK we look the
 * account up scoped by `and(eq(id, fkId), eq(entityId, entityId))` — mirroring
 * the proven recordPayment guard — and throw BAD_REQUEST when it does not
 * resolve. `null`/`undefined` FKs (the liability is unlinked) are skipped.
 */
async function assertLinkedAccountsInEntity(params: {
    entityId: number
    bankAccountId?: number | null
    investmentAccountId?: number | null
}): Promise<void> {
    if (params.bankAccountId !== null && params.bankAccountId !== undefined) {
        const account = await db.query.bankAccount.findFirst({
            where: and(
                eq(bankAccount.id, params.bankAccountId),
                eq(bankAccount.entityId, params.entityId),
            ),
        })
        if (!account) {
            throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Linked account does not belong to this entity',
            })
        }
    }

    if (
        params.investmentAccountId !== null &&
        params.investmentAccountId !== undefined
    ) {
        const account = await db.query.investmentAccount.findFirst({
            where: and(
                eq(investmentAccount.id, params.investmentAccountId),
                eq(investmentAccount.entityId, params.entityId),
            ),
        })
        if (!account) {
            throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Linked account does not belong to this entity',
            })
        }
    }
}

export const liabilityRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            return db
                .select()
                .from(liability)
                .where(eq(liability.entityId, input.entityId))
        }),

    byId: adminProcedure
        .input(z.object({ id: z.coerce.number(), entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            return db.query.liability.findFirst({
                where: and(
                    eq(liability.id, input.id),
                    eq(liability.entityId, input.entityId),
                ),
                with: { entity: true, payments: true },
            })
        }),

    /**
     * Liabilities linked to a single bank or investment account.
     *
     * Tested forward API for a future single-account view. The phase-26
     * /accounts row-detail deliberately does NOT consume this — it filters the
     * already-loaded `liability.list` result client-side to avoid an N+1 query
     * per expanded row. Kept entityId-scoped so the explicit filter and RLS
     * `app.is_admin()` both apply. Exactly one account id is supplied per call;
     * if neither is supplied, returns `[]`.
     */
    getLinked: adminProcedure
        .input(
            z.object({
                entityId: z.coerce.number(),
                bankAccountId: z.coerce.number().optional(),
                investmentAccountId: z.coerce.number().optional(),
            }),
        )
        .query(async ({ input }) => {
            if (input.bankAccountId !== undefined) {
                return db
                    .select()
                    .from(liability)
                    .where(
                        and(
                            eq(liability.entityId, input.entityId),
                            eq(liability.bankAccountId, input.bankAccountId),
                        ),
                    )
            }
            if (input.investmentAccountId !== undefined) {
                return db
                    .select()
                    .from(liability)
                    .where(
                        and(
                            eq(liability.entityId, input.entityId),
                            eq(
                                liability.investmentAccountId,
                                input.investmentAccountId,
                            ),
                        ),
                    )
            }
            return []
        }),

    create: adminProcedure
        .input(insertLiabilitySchema)
        .mutation(async ({ input }) => {
            await assertLinkedAccountsInEntity({
                entityId: input.entityId,
                bankAccountId: input.bankAccountId,
                investmentAccountId: input.investmentAccountId,
            })
            const [created] = await db
                .insert(liability)
                .values({ ...input, updatedAt: new Date().toISOString() })
                .returning()
            if (!created)
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create liability',
                })
            return created
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                entityId: z.coerce.number(),
                data: updateLiabilitySchema,
            }),
        )
        .mutation(async ({ input }) => {
            // Verify the target liability exists in the caller's entity FIRST,
            // so a probe for a row the caller does not own always 404s rather
            // than leaking entity-membership signal via the cross-entity FK
            // guard's BAD_REQUEST (WR-01). Only after the row is confirmed in
            // scope do we validate the linked-account FKs.
            const existing = await db.query.liability.findFirst({
                where: and(
                    eq(liability.id, input.id),
                    eq(liability.entityId, input.entityId),
                ),
            })
            if (!existing) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Record not found in this entity',
                })
            }
            await assertLinkedAccountsInEntity({
                entityId: input.entityId,
                bankAccountId: input.data.bankAccountId,
                investmentAccountId: input.data.investmentAccountId,
            })
            const [updated] = await db
                .update(liability)
                .set({ ...input.data, updatedAt: new Date().toISOString() })
                .where(
                    and(
                        eq(liability.id, input.id),
                        eq(liability.entityId, input.entityId),
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
                .delete(liability)
                .where(
                    and(
                        eq(liability.id, input.id),
                        eq(liability.entityId, input.entityId),
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

    bulkCreate: adminProcedure
        .input(
            z.object({
                entityId: z.coerce.number(),
                liabilities: z.array(bulkLiabilityRowSchema),
            }),
        )
        .mutation(async ({ input }) => {
            addBreadcrumb('liability', 'Bulk creating liabilities', {
                entityId: input.entityId,
                count: input.liabilities.length,
            })

            return traceBusinessOperation(
                'liability.bulkCreate',
                {
                    entityId: input.entityId,
                    count: input.liabilities.length,
                },
                async () => {
                    const results = await Promise.all(
                        input.liabilities.map((row) => {
                            const cleanBalance = row.currentBalance.replace(
                                /,/g,
                                '',
                            )
                            const cleanRate =
                                row.interestRate?.replace(/,/g, '') || null
                            const cleanPayment =
                                row.monthlyPayment?.replace(/,/g, '') || null
                            const cleanEscrow =
                                row.escrowMonthly?.replace(/,/g, '') || null
                            const cleanTerm = row.loanTermMonths
                                ? parseInt(row.loanTermMonths, 10)
                                : null

                            return db
                                .insert(liability)
                                .values({
                                    entityId: input.entityId,
                                    liabilityType: row.liabilityType,
                                    creditor: row.creditor,
                                    originalAmount: cleanBalance,
                                    currentBalance: cleanBalance,
                                    interestRate: cleanRate,
                                    monthlyPayment: cleanPayment,
                                    escrowMonthly: cleanEscrow,
                                    loanTermMonths: cleanTerm,
                                    isRevolvingCredit:
                                        row.liabilityType === 'CREDIT_CARD',
                                    status: 'ACTIVE',
                                    updatedAt: new Date().toISOString(),
                                })
                                .returning()
                                .then(([created]) => {
                                    if (!created)
                                        throw new TRPCError({
                                            code: 'INTERNAL_SERVER_ERROR',
                                            message:
                                                'Failed to create liability',
                                        })
                                    return created
                                })
                        }),
                    )
                    return results
                },
            )
        }),

    /** Record payment, auto-subtract from balance, and create trust accounting EXPENSE entry. */
    recordPayment: adminProcedure
        .input(recordPaymentSchema)
        .mutation(async ({ input }) => {
            const liabilityRecord = await db.query.liability.findFirst({
                where: and(
                    eq(liability.id, input.liabilityId),
                    eq(liability.entityId, input.entityId),
                ),
            })
            if (!liabilityRecord) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Liability not found in this entity',
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

            addBreadcrumb('liability', 'Recording liability payment', {
                liabilityId: input.liabilityId,
                amount: input.amount,
                paymentMethod: input.paymentMethod,
            })

            return traceBusinessOperation(
                'liability.recordPayment',
                {
                    liabilityId: input.liabilityId,
                    amount: input.amount,
                    paymentMethod: input.paymentMethod ?? 'unknown',
                },
                async () => {
                    return recordLiabilityPayment(input)
                },
            )
        }),

    getPayments: adminProcedure
        .input(
            z.object({
                liabilityId: z.coerce.number(),
                entityId: z.coerce.number(),
            }),
        )
        .query(async ({ input }) => {
            const liabilityRecord = await db.query.liability.findFirst({
                where: and(
                    eq(liability.id, input.liabilityId),
                    eq(liability.entityId, input.entityId),
                ),
            })
            if (!liabilityRecord) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Liability not found in this entity',
                })
            }
            return getLiabilityPayments(input.liabilityId)
        }),

    getPayoffProjection: adminProcedure
        .input(z.object({ id: z.coerce.number(), entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            const liabilityRecord = await db.query.liability.findFirst({
                where: and(
                    eq(liability.id, input.id),
                    eq(liability.entityId, input.entityId),
                ),
            })
            if (
                !liabilityRecord?.interestRate ||
                liabilityRecord.isRevolvingCredit
            ) {
                return null
            }

            return estimatePayoffDate(
                liabilityRecord.currentBalance || '0',
                liabilityRecord.interestRate,
                liabilityRecord.monthlyPayment || '0',
                liabilityRecord.escrowMonthly || undefined,
            )
        }),

    /**
     * Batched payoff projections for every liability in the entity. Used by
     * LiabilityGantt to render one bar per loan in a single round-trip.
     *
     * projection is `null` when the liability is revolving credit, missing
     * interestRate, or missing monthlyPayment — those bars are skipped/rendered
     * as "—" by the consumer.
     */
    payoffProjections: adminProcedure
        .input(z.object({ entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            const liabs = await db
                .select()
                .from(liability)
                .where(eq(liability.entityId, input.entityId))

            return liabs.map((l) => ({
                id: l.id,
                creditor: l.creditor,
                startDate: l.loanStartDate ?? l.createdAt,
                currentBalance: l.currentBalance,
                originalAmount: l.originalAmount,
                status: l.status,
                projection:
                    !l.interestRate || !l.monthlyPayment || l.isRevolvingCredit
                        ? null
                        : estimatePayoffDate(
                              l.currentBalance ?? '0',
                              l.interestRate,
                              l.monthlyPayment,
                              l.escrowMonthly ?? undefined,
                              l.loanStartDate ?? undefined,
                          ),
            }))
        }),
})
