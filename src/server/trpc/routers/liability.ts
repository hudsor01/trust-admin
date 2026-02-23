import { TRPCError } from '@trpc/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { getLiabilityPayments, recordLiabilityPayment } from '@/db/queries'
import { bankAccount, liability } from '@/db/schema'
import { insertLiabilitySchema, updateLiabilitySchema } from '@/db/validation'
import { estimatePayoffDate } from '@/lib/amortization'
import { addBreadcrumb, traceBusinessOperation } from '@/lib/sentry'
import {
    ALLOCATION_CLASS_VALUES,
    LIABILITY_TYPE_VALUES,
    PAYMENT_METHOD_VALUES,
} from '@/lib/type-utils'
import { adminProcedure, createTRPCRouter } from '../init'

// Schema for bulk entry rows (simplified subset for rapid entry)
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
    bankAccountId: z.coerce.number(), // Required: which account the payment came from
    principalPortion: z.string().optional(),
    interestPortion: z.string().optional(),
    escrowPortion: z.string().optional(),
    paymentMethod: z.enum(PAYMENT_METHOD_VALUES),
    checkNumber: z.string().optional(),
    confirmationNumber: z.string().optional(),
    notes: z.string().optional(),
    // Allocation class for trust accounting (Principal vs Income)
    allocationClass: z.enum(ALLOCATION_CLASS_VALUES).optional(),
})

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

    create: adminProcedure
        .input(insertLiabilitySchema)
        .mutation(async ({ input }) => {
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

    // Special: Bulk create multiple liabilities at once
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
                            // Clean numeric strings (remove commas)
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
                                    originalAmount: cleanBalance, // Use current balance as original for new entries
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

    // Special: Record payment with auto-accounting entry
    recordPayment: adminProcedure
        .input(recordPaymentSchema)
        .mutation(async ({ input }) => {
            // Validate liability belongs to this entity
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

            // Validate bank account belongs to same entity
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

    // Special: Get payments for a liability
    getPayments: adminProcedure
        .input(
            z.object({
                liabilityId: z.coerce.number(),
                entityId: z.coerce.number(),
            }),
        )
        .query(async ({ input }) => {
            // Validate liability belongs to entity
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

    // Special: Get payoff projection for a liability
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
                !liabilityRecord ||
                !liabilityRecord.interestRate ||
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
})
