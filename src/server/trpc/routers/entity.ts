import { z } from 'zod'
import { entityCrud, getEntityById } from '../../../../db/queries'
import {
    insertEntitySchema,
    updateEntitySchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const entityRouter = createTRPCRouter({
    list: adminProcedure.query(async () => {
        const result = await entityCrud.getAll()
        return Array.isArray(result) ? result : result.data
    }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return getEntityById(input)
    }),

    create: adminProcedure
        .input(insertEntitySchema)
        .mutation(async ({ input }) => {
            return entityCrud.create(input)
        }),

    update: adminProcedure
        .input(z.object({ id: z.coerce.number(), data: updateEntitySchema }))
        .mutation(async ({ input }) => {
            return entityCrud.update(input.id, input.data)
        }),

    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            return entityCrud.delete(input)
        }),
})
