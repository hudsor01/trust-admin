import { z } from 'zod'
import { specificBequestCrud } from '../../../../db/queries'
import {
    insertSpecificBequestSchema,
    updateSpecificBequestSchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const specificBequestRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number().optional() }).optional())
        .query(async ({ input }) => {
            const result = await specificBequestCrud.getAll(input?.entityId)
            return Array.isArray(result) ? result : result.data
        }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return specificBequestCrud.getById(input)
    }),

    create: adminProcedure
        .input(insertSpecificBequestSchema)
        .mutation(async ({ input }) => {
            return specificBequestCrud.create(input)
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                data: updateSpecificBequestSchema,
            }),
        )
        .mutation(async ({ input }) => {
            return specificBequestCrud.update(input.id, input.data)
        }),

    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            return specificBequestCrud.delete(input)
        }),
})
