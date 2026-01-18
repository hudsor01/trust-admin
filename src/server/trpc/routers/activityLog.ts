import { z } from 'zod'
import {
    activityLogCrud,
    getActivityLogWithChanges,
    SEARCHABLE_ACTIVITY_LOG_FIELDS,
    searchActivityLogByField,
} from '../../../../db/queries'
import { adminProcedure, createTRPCRouter } from '../index'

// Zod enum for searchable fields - enforces allowlist at API level
const searchableFieldSchema = z.enum(SEARCHABLE_ACTIVITY_LOG_FIELDS)

export const activityLogRouter = createTRPCRouter({
    // List all activity logs (paginated via CRUD)
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
            if (input?.limit || input?.offset) {
                const result = await activityLogCrud.getAll(undefined, {
                    limit: input.limit,
                    offset: input.offset,
                })
                return Array.isArray(result) ? result : result.data
            }
            const result = await activityLogCrud.getAll()
            return Array.isArray(result) ? result : result.data
        }),

    byId: adminProcedure.input(z.coerce.number()).query(async ({ input }) => {
        return activityLogCrud.getById(input)
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
