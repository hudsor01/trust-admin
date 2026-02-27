import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import {
    getActivityLogWithChanges,
    SEARCHABLE_ACTIVITY_LOG_FIELDS,
    searchActivityLogByField,
} from '@/db/queries'
import { activityLog } from '@/db/schema'
import { adminProcedure, createTRPCRouter } from '../init'

// Allowlist prevents arbitrary column injection in search queries
const searchableFieldSchema = z.enum(SEARCHABLE_ACTIVITY_LOG_FIELDS)

export const activityLogRouter = createTRPCRouter({
    list: adminProcedure
        .input(
            z
                .object({
                    limit: z.number().optional(),
                    offset: z.number().optional(),
                })
                .optional(),
        )
        .query(async ({ input }) => {
            const limit = input?.limit ?? 100
            const offset = input?.offset ?? 0
            return db
                .select()
                .from(activityLog)
                .orderBy(desc(activityLog.createdAt))
                .limit(limit)
                .offset(offset)
        }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return db.query.activityLog.findFirst({
            where: eq(activityLog.id, input),
        })
    }),

    withChanges: adminProcedure.input(z.string()).query(async ({ input }) => {
        return getActivityLogWithChanges(input)
    }),

    search: adminProcedure
        .input(
            z.object({
                fieldName: searchableFieldSchema,
                fieldValue: z.string().max(500),
            }),
        )
        .query(async ({ input }) => {
            return searchActivityLogByField(input.fieldName, input.fieldValue)
        }),
})
