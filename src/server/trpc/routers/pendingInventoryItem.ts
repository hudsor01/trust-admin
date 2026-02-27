import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { pendingInventoryItemCrud, personalPropertyCrud } from '@/db/queries'
import { updatePendingInventoryItemSchema } from '@/db/validation'
import { adminProcedure, createTRPCRouter } from '../init'

export const pendingInventoryItemRouter = createTRPCRouter({
    list: adminProcedure
        .input(
            z
                .object({
                    status: z
                        .enum(['PENDING', 'APPROVED', 'REJECTED'])
                        .optional(),
                })
                .optional(),
        )
        .query(async ({ input }) => {
            return pendingInventoryItemCrud.getAllArray(input?.status)
        }),

    pending: adminProcedure.query(async () => {
        return pendingInventoryItemCrud.getAllArray('PENDING')
    }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return pendingInventoryItemCrud.getById(input)
    }),

    update: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                data: updatePendingInventoryItemSchema,
            }),
        )
        .mutation(async ({ input }) => {
            return pendingInventoryItemCrud.update(input.id, input.data)
        }),

    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            return pendingInventoryItemCrud.delete(input)
        }),

    /** Approve: creates a personalProperty record, then marks this item APPROVED. */
    approve: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                entityId: z.coerce.number(),
                reviewNotes: z.string().optional(),
                // Allow overriding values during approval
                name: z.string().optional(),
                category: z
                    .enum([
                        'JEWELRY',
                        'ART',
                        'COLLECTIBLES',
                        'ELECTRONICS',
                        'FURNITURE',
                        'OTHER',
                    ])
                    .optional(),
                description: z.string().optional(),
                dodValue: z.string().optional(),
            }),
        )
        .mutation(async ({ input }) => {
            const pendingItem = await pendingInventoryItemCrud.getById(input.id)
            if (!pendingItem) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Pending item not found',
                })
            }

            if (pendingItem.status !== 'PENDING') {
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: `Item has already been ${pendingItem.status.toLowerCase()}`,
                })
            }

            const property = await personalPropertyCrud.create({
                entityId: input.entityId,
                name: input.name || pendingItem.name,
                category: input.category || pendingItem.category,
                description:
                    input.description || pendingItem.description || null,
                dodValue: input.dodValue || pendingItem.estimatedValue || null,
                status: 'ACTIVE',
                transferStatus: 'PENDING',
                updatedAt: new Date().toISOString(),
            })

            // approvedById is bigint but ctx.user.id is UUID — incompatible, so null
            await pendingInventoryItemCrud.update(input.id, {
                status: 'APPROVED',
                entityId: input.entityId,
                reviewNotes: input.reviewNotes || null,
                approvedAt: new Date().toISOString(),
                approvedById: null,
            })

            return { pendingItem, property }
        }),

    reject: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                reviewNotes: z.string().optional(),
            }),
        )
        .mutation(async ({ input }) => {
            return pendingInventoryItemCrud.update(input.id, {
                status: 'REJECTED',
                reviewNotes: input.reviewNotes || null,
            })
        }),
})
