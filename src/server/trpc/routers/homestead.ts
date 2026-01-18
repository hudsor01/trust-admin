import { z } from 'zod'
import { getHomesteadById, homesteadCrud } from '../../../../db/queries'
import {
    insertHomesteadSchema,
    updateHomesteadSchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const homesteadRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.string().optional() }).optional())
        .query(async ({ input }) => {
            const result = await homesteadCrud.getAll(input?.entityId)
            return Array.isArray(result) ? result : result.data
        }),

    byId: adminProcedure.input(z.string()).query(async ({ input }) => {
        return getHomesteadById(input)
    }),

    create: adminProcedure
        .input(insertHomesteadSchema)
        .mutation(async ({ input }) => {
            return homesteadCrud.create(input)
        }),

    update: adminProcedure
        .input(z.object({ id: z.string(), data: updateHomesteadSchema }))
        .mutation(async ({ input }) => {
            return homesteadCrud.update(input.id, input.data)
        }),

    delete: adminProcedure.input(z.string()).mutation(async ({ input }) => {
        return homesteadCrud.delete(input)
    }),
})
