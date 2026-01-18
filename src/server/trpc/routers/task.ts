import { z } from 'zod'
import { taskCrud } from '../../../../db/queries'
import { insertTaskSchema, updateTaskSchema } from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const taskRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number().optional() }).optional())
        .query(async ({ input }) => {
            const result = await taskCrud.getAll(input?.entityId)
            return Array.isArray(result) ? result : result.data
        }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return taskCrud.getById(input)
    }),

    create: adminProcedure
        .input(insertTaskSchema)
        .mutation(async ({ input }) => {
            return taskCrud.create(input)
        }),

    update: adminProcedure
        .input(z.object({ id: z.coerce.number(), data: updateTaskSchema }))
        .mutation(async ({ input }) => {
            return taskCrud.update(input.id, input.data)
        }),

    delete: adminProcedure.input(z.coerce.number()).mutation(async ({ input }) => {
        return taskCrud.delete(input)
    }),
})
