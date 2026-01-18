import { z } from 'zod'
import {
    getHemsRequestsWithBeneficiary,
    getPendingHemsRequests,
    hemsRequestCrud,
} from '../../../../db/queries'
import {
    insertHemsRequestSchema,
    updateHemsRequestSchema,
} from '../../../../db/validation'
import {
    adminProcedure,
    beneficiaryProcedure,
    createTRPCRouter,
} from '../index'

export const hemsRequestRouter = createTRPCRouter({
    list: adminProcedure
        .input(
            z
                .object({
                    beneficiaryId: z.coerce.number().optional(),
                    entityId: z.coerce.number().optional(),
                })
                .optional(),
        )
        .query(async ({ input }) => {
            const data = await hemsRequestCrud.getAllArray(input?.beneficiaryId)
            // Note: entityId filtering done in-memory as HEMS requests are typically <100 records
            // and entityId filter path is rare (most filtering is by beneficiaryId at DB level)
            if (input?.entityId) {
                return data.filter((r) => r.entityId === input.entityId)
            }
            return data
        }),

    // List with beneficiary info
    listWithBeneficiary: adminProcedure
        .input(
            z
                .object({ beneficiaryId: z.coerce.number().optional() })
                .optional(),
        )
        .query(async ({ input }) => {
            return getHemsRequestsWithBeneficiary(input?.beneficiaryId)
        }),

    // Get pending requests for queue
    pending: adminProcedure.query(async () => {
        return getPendingHemsRequests()
    }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return hemsRequestCrud.getById(input)
    }),

    create: adminProcedure
        .input(insertHemsRequestSchema)
        .mutation(async ({ input }) => {
            return hemsRequestCrud.create(input)
        }),

    update: adminProcedure
        .input(
            z.object({ id: z.coerce.number(), data: updateHemsRequestSchema }),
        )
        .mutation(async ({ input }) => {
            return hemsRequestCrud.update(input.id, input.data)
        }),

    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            return hemsRequestCrud.delete(input)
        }),

    // Special: Approve HEMS request
    approve: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                approvedAmount: z.string().optional(),
                reviewNotes: z.string().optional(),
            }),
        )
        .mutation(async ({ input }) => {
            return hemsRequestCrud.update(input.id, {
                status: 'APPROVED',
                approvedAmount: input.approvedAmount,
                reviewNotes: input.reviewNotes,
                reviewedAt: new Date().toISOString(),
            })
        }),

    // Special: Deny HEMS request
    deny: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                reviewNotes: z.string().optional(),
            }),
        )
        .mutation(async ({ input }) => {
            return hemsRequestCrud.update(input.id, {
                status: 'DENIED',
                reviewNotes: input.reviewNotes,
                reviewedAt: new Date().toISOString(),
            })
        }),

    // Portal: Beneficiary submits request
    submit: beneficiaryProcedure
        .input(insertHemsRequestSchema)
        .mutation(async ({ input, ctx }) => {
            // Ensure beneficiary can only submit for themselves
            if (input.beneficiaryId !== ctx.user.beneficiaryId) {
                throw new Error('Can only submit requests for yourself')
            }

            return hemsRequestCrud.create({
                ...input,
                status: 'PENDING',
            })
        }),

    // Portal: Beneficiary views own requests
    myRequests: beneficiaryProcedure.query(async ({ ctx }) => {
        if (!ctx.user.beneficiaryId) {
            return []
        }
        return hemsRequestCrud.getAllArray(ctx.user.beneficiaryId)
    }),
})
