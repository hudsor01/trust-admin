import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { pendingInventoryItemCrud, personalPropertyCrud } from '@/db/queries'
import { updatePendingInventoryItemSchema } from '@/db/validation'
import { adminProcedure, createTRPCRouter } from '../init'

export const pendingInventoryItemRouter = createTRPCRouter({
    // List all pending items
    // PERF: Push status filter to database instead of filtering in memory
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
            // Database-level filtering - no N+1
            return pendingInventoryItemCrud.getAllArray(input?.status)
        }),

    // Get pending items only (for queue)
    // PERF: Use database filter instead of loading all + filtering in memory
    pending: adminProcedure.query(async () => {
        return pendingInventoryItemCrud.getAllArray('PENDING')
    }),

    // Get by ID
    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return pendingInventoryItemCrud.getById(input)
    }),

    // Update
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

    // Delete
    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            return pendingInventoryItemCrud.delete(input)
        }),

    // Approve: creates personalProperty record and updates status
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
        .mutation(async ({ input, ctx }) => {
            // Get the pending item
            const pendingItem = await pendingInventoryItemCrud.getById(input.id)
            if (!pendingItem) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Pending item not found',
                })
            }

            // Create personalProperty record
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

            // Update pending item status
            await pendingInventoryItemCrud.update(input.id, {
                status: 'APPROVED',
                entityId: input.entityId,
                reviewNotes: input.reviewNotes || null,
                approvedAt: new Date().toISOString(),
                approvedById: ctx.user.id ? Number(ctx.user.id) : null,
            })

            return { pendingItem, property }
        }),

    // Reject
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
