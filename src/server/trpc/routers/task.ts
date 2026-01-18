import { z } from 'zod'
import { taskCrud } from '../../../../db/queries'
import { insertTaskSchema, updateTaskSchema } from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const taskRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.string().optional() }).optional())
        .query(async ({ input }) => {
            const result = await taskCrud.getAll(input?.entityId)
            return Array.isArray(result) ? result : result.data
        }),

    byId: adminProcedure.input(z.string()).query(async ({ input }) => {
        return taskCrud.getById(input)
    }),

    create: adminProcedure
        .input(insertTaskSchema)
        .mutation(async ({ input }) => {
            return taskCrud.create(input)
        }),

    update: adminProcedure
        .input(z.object({ id: z.string(), data: updateTaskSchema }))
        .mutation(async ({ input }) => {
            return taskCrud.update(input.id, input.data)
        }),

    delete: adminProcedure.input(z.string()).mutation(async ({ input }) => {
        return taskCrud.delete(input)
    }),
})
