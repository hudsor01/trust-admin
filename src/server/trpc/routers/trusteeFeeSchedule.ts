import { z } from 'zod'
import { trusteeFeeScheduleCrud } from '../../../../db/queries'
import {
    insertTrusteeFeeScheduleSchema,
    updateTrusteeFeeScheduleSchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const trusteeFeeScheduleRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number().optional() }).optional())
        .query(async ({ input }) => {
            const result = await trusteeFeeScheduleCrud.getAll(input?.entityId)
            return Array.isArray(result) ? result : result.data
        }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return trusteeFeeScheduleCrud.getById(input)
    }),

    create: adminProcedure
        .input(insertTrusteeFeeScheduleSchema)
        .mutation(async ({ input }) => {
            return trusteeFeeScheduleCrud.create(input)
        }),

    update: adminProcedure
        .input(
            z.object({ id: z.coerce.number(), data: updateTrusteeFeeScheduleSchema }),
        )
        .mutation(async ({ input }) => {
            return trusteeFeeScheduleCrud.update(input.id, input.data)
        }),

    delete: adminProcedure.input(z.coerce.number()).mutation(async ({ input }) => {
        return trusteeFeeScheduleCrud.delete(input)
    }),
})
