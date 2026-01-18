import { z } from 'zod'
import { trusteeFeeScheduleCrud } from '../../../../db/queries'
import {
    insertTrusteeFeeScheduleSchema,
    updateTrusteeFeeScheduleSchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const trusteeFeeScheduleRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.string().optional() }).optional())
        .query(async ({ input }) => {
            const result = await trusteeFeeScheduleCrud.getAll(input?.entityId)
            return Array.isArray(result) ? result : result.data
        }),

    byId: adminProcedure.input(z.string()).query(async ({ input }) => {
        return trusteeFeeScheduleCrud.getById(input)
    }),

    create: adminProcedure
        .input(insertTrusteeFeeScheduleSchema)
        .mutation(async ({ input }) => {
            return trusteeFeeScheduleCrud.create(input)
        }),

    update: adminProcedure
        .input(
            z.object({ id: z.string(), data: updateTrusteeFeeScheduleSchema }),
        )
        .mutation(async ({ input }) => {
            return trusteeFeeScheduleCrud.update(input.id, input.data)
        }),

    delete: adminProcedure.input(z.string()).mutation(async ({ input }) => {
        return trusteeFeeScheduleCrud.delete(input)
    }),
})
