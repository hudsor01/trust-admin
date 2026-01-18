import { z } from 'zod'
import { getHomesteadById, homesteadCrud } from '../../../../db/queries'
import {
    insertHomesteadSchema,
    updateHomesteadSchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const homesteadRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number().optional() }).optional())
        .query(async ({ input }) => {
            return homesteadCrud.getAllArray(input?.entityId)
        }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return getHomesteadById(input)
    }),

    create: adminProcedure
        .input(insertHomesteadSchema)
        .mutation(async ({ input }) => {
            return homesteadCrud.create(input)
        }),

    update: adminProcedure
        .input(z.object({ id: z.coerce.number(), data: updateHomesteadSchema }))
        .mutation(async ({ input }) => {
            return homesteadCrud.update(input.id, input.data)
        }),

    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            return homesteadCrud.delete(input)
        }),
})
