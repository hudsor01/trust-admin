import { z } from 'zod'
import { withdrawalRecordCrud } from '../../../../db/queries'
import {
    insertWithdrawalRecordSchema,
    updateWithdrawalRecordSchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const withdrawalRecordRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ beneficiaryId: z.coerce.number().optional() }).optional())
        .query(async ({ input }) => {
            const result = await withdrawalRecordCrud.getAll(
                input?.beneficiaryId,
            )
            return Array.isArray(result) ? result : result.data
        }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return withdrawalRecordCrud.getById(input)
    }),

    create: adminProcedure
        .input(insertWithdrawalRecordSchema)
        .mutation(async ({ input }) => {
            return withdrawalRecordCrud.create(input)
        }),

    update: adminProcedure
        .input(z.object({ id: z.coerce.number(), data: updateWithdrawalRecordSchema }))
        .mutation(async ({ input }) => {
            return withdrawalRecordCrud.update(input.id, input.data)
        }),

    delete: adminProcedure.input(z.coerce.number()).mutation(async ({ input }) => {
        return withdrawalRecordCrud.delete(input)
    }),
})
