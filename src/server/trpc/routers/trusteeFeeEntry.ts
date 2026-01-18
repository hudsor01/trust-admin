import { z } from 'zod'
import {
    getTrusteeFeeEntriesWithSchedule,
    trusteeFeeEntryCrud,
} from '../../../../db/queries'
import {
    insertTrusteeFeeEntrySchema,
    updateTrusteeFeeEntrySchema,
} from '../../../../db/validation'
import { adminProcedure, createTRPCRouter } from '../index'

export const trusteeFeeEntryRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number().optional() }).optional())
        .query(async ({ input }) => {
            return trusteeFeeEntryCrud.getAllArray(input?.entityId)
        }),

    // List with schedule info
    listWithSchedule: adminProcedure
        .input(z.object({ entityId: z.coerce.number().optional() }).optional())
        .query(async ({ input }) => {
            return getTrusteeFeeEntriesWithSchedule(input?.entityId)
        }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return trusteeFeeEntryCrud.getById(input)
    }),

    create: adminProcedure
        .input(insertTrusteeFeeEntrySchema)
        .mutation(async ({ input }) => {
            return trusteeFeeEntryCrud.create(input)
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                data: updateTrusteeFeeEntrySchema,
            }),
        )
        .mutation(async ({ input }) => {
            return trusteeFeeEntryCrud.update(input.id, input.data)
        }),

    delete: adminProcedure
        .input(z.coerce.number())
        .mutation(async ({ input }) => {
            return trusteeFeeEntryCrud.delete(input)
        }),
})
