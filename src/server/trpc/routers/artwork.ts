import { z } from 'zod'
import { artworkCrud } from '../../../../db/queries'
import {
    insertArtworkSchema,
    updateArtworkSchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const artworkRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number().optional() }).optional())
        .query(async ({ input }) => {
            const result = await artworkCrud.getAll(input?.entityId)
            return Array.isArray(result) ? result : result.data
        }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return artworkCrud.getById(input)
    }),

    create: adminProcedure
        .input(insertArtworkSchema)
        .mutation(async ({ input }) => {
            return artworkCrud.create(input)
        }),

    update: adminProcedure
        .input(z.object({ id: z.coerce.number(), data: updateArtworkSchema }))
        .mutation(async ({ input }) => {
            return artworkCrud.update(input.id, input.data)
        }),

    delete: adminProcedure.input(z.coerce.number()).mutation(async ({ input }) => {
        return artworkCrud.delete(input)
    }),
})
