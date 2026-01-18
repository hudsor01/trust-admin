import { z } from 'zod'
import { getValuationsForAsset, valuationCrud } from '../../../../db/queries'
import {
    insertValuationSchema,
    updateValuationSchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const valuationRouter = createTRPCRouter({
    list: adminProcedure.query(async () => {
        const result = await valuationCrud.getAll()
        return Array.isArray(result) ? result : result.data
    }),

    byId: adminProcedure.input(z.string()).query(async ({ input }) => {
        return valuationCrud.getById(input)
    }),

    // Get valuations for a specific asset
    forAsset: adminProcedure
        .input(
            z.object({
                assetType: z.string(),
                assetId: z.string(),
            }),
        )
        .query(async ({ input }) => {
            return getValuationsForAsset(input.assetType, input.assetId)
        }),

    create: adminProcedure
        .input(insertValuationSchema)
        .mutation(async ({ input }) => {
            return valuationCrud.create(input)
        }),

    update: adminProcedure
        .input(z.object({ id: z.string(), data: updateValuationSchema }))
        .mutation(async ({ input }) => {
            return valuationCrud.update(input.id, input.data)
        }),

    delete: adminProcedure.input(z.string()).mutation(async ({ input }) => {
        return valuationCrud.delete(input)
    }),
})
