import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../../db'
import {
    getHemsRequestsWithBeneficiary,
    getPendingHemsRequests,
} from '../../../../db/queries'
import { hemsRequest } from '../../../../db/schema'
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
            if (input?.beneficiaryId) {
                return db
                    .select()
                    .from(hemsRequest)
                    .where(eq(hemsRequest.beneficiaryId, input.beneficiaryId))
            }
            if (input?.entityId) {
                return db
                    .select()
                    .from(hemsRequest)
                    .where(eq(hemsRequest.entityId, input.entityId))
            }
            return db.select().from(hemsRequest)
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
        return db.query.hemsRequest.findFirst({
            where: eq(hemsRequest.id, input),
        })
    }),

    create: adminProcedure
        .input(insertHemsRequestSchema)
        .mutation(async ({ input }) => {
            const [created] = await db
                .insert(hemsRequest)
                .values({ ...input, updatedAt: new Date().toISOString() })
                .returning()
            return created
        }),

    update: adminProcedure
        .input(
            z.object({ id: z.coerce.number(), data: updateHemsRequestSchema }),
        )
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(hemsRequest)
                .set({ ...input.data, updatedAt: new Date().toISOString() })
                .where(eq(hemsRequest.id, input.id))
                .returning()
            return updated
        }),

    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            const [deleted] = await db
                .delete(hemsRequest)
                .where(eq(hemsRequest.id, input))
                .returning()
            return deleted
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
            const [updated] = await db
                .update(hemsRequest)
                .set({
                    status: 'APPROVED',
                    approvedAmount: input.approvedAmount,
                    reviewNotes: input.reviewNotes,
                    reviewedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                })
                .where(eq(hemsRequest.id, input.id))
                .returning()
            return updated
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
            const [updated] = await db
                .update(hemsRequest)
                .set({
                    status: 'DENIED',
                    reviewNotes: input.reviewNotes,
                    reviewedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                })
                .where(eq(hemsRequest.id, input.id))
                .returning()
            return updated
        }),

    // Portal: Beneficiary submits request
    submit: beneficiaryProcedure
        .input(insertHemsRequestSchema)
        .mutation(async ({ input, ctx }) => {
            // Ensure beneficiary can only submit for themselves
            if (input.beneficiaryId !== ctx.user.beneficiaryId) {
                throw new Error('Can only submit requests for yourself')
            }

            const [created] = await db
                .insert(hemsRequest)
                .values({
                    ...input,
                    status: 'PENDING',
                    updatedAt: new Date().toISOString(),
                })
                .returning()
            return created
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
