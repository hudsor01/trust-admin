import { z } from 'zod'
import { artworkCrud } from '../../../../db/queries'
import {
    insertArtworkSchema,
    updateArtworkSchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const artworkRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.string().optional() }).optional())
        .query(async ({ input }) => {
            const result = await artworkCrud.getAll(input?.entityId)
            return Array.isArray(result) ? result : result.data
        }),

    byId: adminProcedure.input(z.string()).query(async ({ input }) => {
        return artworkCrud.getById(input)
    }),

    create: adminProcedure
        .input(insertArtworkSchema)
        .mutation(async ({ input }) => {
            return artworkCrud.create(input)
        }),

    update: adminProcedure
        .input(z.object({ id: z.string(), data: updateArtworkSchema }))
        .mutation(async ({ input }) => {
            return artworkCrud.update(input.id, input.data)
        }),

    delete: adminProcedure.input(z.string()).mutation(async ({ input }) => {
        return artworkCrud.delete(input)
    }),
})
