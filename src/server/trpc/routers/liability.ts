import { z } from 'zod'
import {
    getLiabilityPayments,
    liabilityCrud,
    recordLiabilityPayment,
} from '../../../../db/queries'
import {
    insertLiabilitySchema,
    updateLiabilitySchema,
} from '../../../../db/validation'
import { estimatePayoffDate } from '../../../lib/amortization'
import {
    ALLOCATION_CLASS_VALUES,
    LIABILITY_TYPE_VALUES,
    PAYMENT_METHOD_VALUES,
} from '../../../lib/type-utils'
import { adminProcedure, createTRPCRouter } from '../index'

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
    liabilityId: z.coerce.number(),
    paymentDate: z.string(),
    amount: z.string(),
    bankAccountId: z.coerce.number(), // Required: which account the payment came from
    principalPortion: z.string().optional(),
    interestPortion: z.string().optional(),
    escrowPortion: z.string().optional(),
    paymentMethod: z.enum(PAYMENT_METHOD_VALUES),
    checkNumber: z.string().optional(),
    referenceNumber: z.string().optional(),
    notes: z.string().optional(),
    // Allocation class for trust accounting (Principal vs Income)
    allocationClass: z.enum(ALLOCATION_CLASS_VALUES).optional(),
})

export const liabilityRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number().optional() }).optional())
        .query(async ({ input }) => {
            const result = await liabilityCrud.getAll(input?.entityId)
            return Array.isArray(result) ? result : result.data
        }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return liabilityCrud.getById(input)
    }),

    create: adminProcedure
        .input(insertLiabilitySchema)
        .mutation(async ({ input }) => {
            return liabilityCrud.create(input)
        }),

    update: adminProcedure
        .input(z.object({ id: z.coerce.number(), data: updateLiabilitySchema }))
        .mutation(async ({ input }) => {
            return liabilityCrud.update(input.id, input.data)
        }),

    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            return liabilityCrud.delete(input)
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
            const results = await Promise.all(
                input.liabilities.map((row) => {
                    // Clean numeric strings (remove commas)
                    const cleanBalance = row.currentBalance.replace(/,/g, '')
                    const cleanRate =
                        row.interestRate?.replace(/,/g, '') || null
                    const cleanPayment =
                        row.monthlyPayment?.replace(/,/g, '') || null
                    const cleanEscrow =
                        row.escrowMonthly?.replace(/,/g, '') || null
                    const cleanTerm = row.loanTermMonths
                        ? parseInt(row.loanTermMonths, 10)
                        : null

                    return liabilityCrud.create({
                        entityId: input.entityId,
                        liabilityType: row.liabilityType,
                        creditor: row.creditor,
                        originalAmount: cleanBalance, // Use current balance as original for new entries
                        currentBalance: cleanBalance,
                        interestRate: cleanRate,
                        monthlyPayment: cleanPayment,
                        escrowMonthly: cleanEscrow,
                        loanTermMonths: cleanTerm,
                        isRevolvingCredit: row.liabilityType === 'CREDIT_CARD',
                        status: 'ACTIVE',
                    })
                }),
            )
            return results
        }),

    // Special: Record payment with auto-accounting entry
    recordPayment: adminProcedure
        .input(recordPaymentSchema)
        .mutation(async ({ input }) => {
            return recordLiabilityPayment(input)
        }),

    // Special: Get payments for a liability
    getPayments: adminProcedure
        .input(z.coerce.number())
        .query(async ({ input }) => {
            return getLiabilityPayments(input)
        }),

    // Special: Get payoff projection for a liability
    getPayoffProjection: adminProcedure
        .input(z.coerce.number())
        .query(async ({ input }) => {
            const liabilityRecord = await liabilityCrud.getById(input)
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
