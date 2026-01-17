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
import { adminProcedure, createTRPCRouter } from '../index'

const recordPaymentSchema = z.object({
    liabilityId: z.string(),
    paymentDate: z.string(),
    amount: z.string(),
    principalPortion: z.string().optional(),
    interestPortion: z.string().optional(),
    escrowPortion: z.string().optional(),
    paymentMethod: z.enum(['CHECK', 'ACH', 'WIRE', 'CASH', 'OTHER']),
    checkNumber: z.string().optional(),
    referenceNumber: z.string().optional(),
    notes: z.string().optional(),
    paidFromAccountId: z.string().optional(),
})

export const liabilityRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.string().optional() }).optional())
        .query(async ({ input }) => {
            const result = await liabilityCrud.getAll(input?.entityId)
            return Array.isArray(result) ? result : result.data
        }),

    byId: adminProcedure.input(z.string()).query(async ({ input }) => {
        return liabilityCrud.getById(input)
    }),

    create: adminProcedure
        .input(insertLiabilitySchema)
        .mutation(async ({ input }) => {
            return liabilityCrud.create(input)
        }),

    update: adminProcedure
        .input(z.object({ id: z.string(), data: updateLiabilitySchema }))
        .mutation(async ({ input }) => {
            return liabilityCrud.update(input.id, input.data)
        }),

    delete: adminProcedure.input(z.string()).mutation(async ({ input }) => {
        return liabilityCrud.delete(input)
    }),

    // Special: Record payment with auto-accounting entry
    recordPayment: adminProcedure
        .input(recordPaymentSchema)
        .mutation(async ({ input }) => {
            return recordLiabilityPayment(input)
        }),

    // Special: Get payments for a liability
    getPayments: adminProcedure.input(z.string()).query(async ({ input }) => {
        return getLiabilityPayments(input)
    }),

    // Special: Get payoff projection for a liability
    getPayoffProjection: adminProcedure
        .input(z.string())
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
