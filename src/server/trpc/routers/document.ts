import { z } from 'zod'
import { createCrud } from '../../../../db/crud-factory'
import { document } from '../../../../db/schema'
import {
    insertDocumentSchema,
    updateDocumentSchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

// Document CRUD not exported from queries.ts, create it here
const documentCrud = createCrud(document)

export const documentRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.string().optional() }).optional())
        .query(async ({ input }) => {
            const result = await documentCrud.getAll(input?.entityId)
            return Array.isArray(result) ? result : result.data
        }),

    byId: adminProcedure.input(z.string()).query(async ({ input }) => {
        return documentCrud.getById(input)
    }),

    create: adminProcedure
        .input(insertDocumentSchema)
        .mutation(async ({ input }) => {
            return documentCrud.create(input)
        }),

    update: adminProcedure
        .input(z.object({ id: z.string(), data: updateDocumentSchema }))
        .mutation(async ({ input }) => {
            return documentCrud.update(input.id, input.data)
        }),

    delete: adminProcedure.input(z.string()).mutation(async ({ input }) => {
        return documentCrud.delete(input)
    }),
})
