import { z } from 'zod'
import { specificBequestCrud } from '../../../../db/queries'
import {
    insertSpecificBequestSchema,
    updateSpecificBequestSchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const specificBequestRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.string().optional() }).optional())
        .query(async ({ input }) => {
            const result = await specificBequestCrud.getAll(input?.entityId)
            return Array.isArray(result) ? result : result.data
        }),

    byId: adminProcedure.input(z.string()).query(async ({ input }) => {
        return specificBequestCrud.getById(input)
    }),

    create: adminProcedure
        .input(insertSpecificBequestSchema)
        .mutation(async ({ input }) => {
            return specificBequestCrud.create(input)
        }),

    update: adminProcedure
        .input(z.object({ id: z.string(), data: updateSpecificBequestSchema }))
        .mutation(async ({ input }) => {
            return specificBequestCrud.update(input.id, input.data)
        }),

    delete: adminProcedure.input(z.string()).mutation(async ({ input }) => {
        return specificBequestCrud.delete(input)
    }),
})
