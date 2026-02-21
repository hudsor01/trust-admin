import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import {
    getActivityLogWithChanges,
    SEARCHABLE_ACTIVITY_LOG_FIELDS,
    searchActivityLogByField,
} from '@/db/queries'
import { activityLog } from '@/db/schema'
import { adminProcedure, createTRPCRouter } from '../index'

// Zod enum for searchable fields - enforces allowlist at API level
const searchableFieldSchema = z.enum(SEARCHABLE_ACTIVITY_LOG_FIELDS)

export const activityLogRouter = createTRPCRouter({
    // List all activity logs (with optional pagination)
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

    // Get activity log with parsed changes (by recordId which is text/polymorphic)
    withChanges: adminProcedure.input(z.string()).query(async ({ input }) => {
        return getActivityLogWithChanges(input)
    }),

    // Search by field - SECURE: uses allowlist for field names, parameterized values
    search: adminProcedure
        .input(
            z.object({
                fieldName: searchableFieldSchema,
                fieldValue: z.string().max(500), // Limit value length
            }),
        )
        .query(async ({ input }) => {
            return searchActivityLogByField(input.fieldName, input.fieldValue)
        }),

    // Activity logs are read-only - no create/update/delete
})
