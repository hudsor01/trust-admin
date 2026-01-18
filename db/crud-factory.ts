/**
 * Generic CRUD Factory
 *
 * Creates reusable CRUD operations for any Drizzle table,
 * eliminating duplicate code across entity queries.
 */
import { eq, getTableColumns, sql } from 'drizzle-orm'
import type { PgTable, TableConfig } from 'drizzle-orm/pg-core'
import { generateId } from './helpers'
import { db } from './index'

interface CrudOptions {
    /** Column name to filter by (e.g., "entityId") */
    filterColumn?: string
    /** Whether table has updatedAt column */
    hasUpdatedAt?: boolean
}

/**
 * Type helper to add updatedAt to Update type
 */
type UpdateWithMeta<T> = T & {
    updatedAt?: string
}

/**
 * Type helper for insert input - makes id and updatedAt optional since they're auto-generated
 */
type InsertInput<T> = Omit<T, 'id' | 'updatedAt' | 'createdAt'> & {
    id?: string
    updatedAt?: string
    createdAt?: string
}

interface PaginationOptions {
    /** Maximum number of records to return */
    limit?: number
    /** Number of records to skip */
    offset?: number
    /** Whether to include total count in response */
    includeTotalCount?: boolean
}

interface PaginatedResult<T> {
    /** Array of data records */
    data: T[]
    /** Total count of matching records (if includeTotalCount=true) */
    totalCount?: number
    /** Limit used in query */
    limit?: number
    /** Offset used in query */
    offset?: number
    /** Whether more records exist beyond current page */
    hasMore?: boolean
}

/**
 * Creates standard CRUD operations for a table
 */
export function createCrud<
    T extends PgTable<TableConfig>,
    Insert = T['$inferInsert'],
    Select = T['$inferSelect'],
>(table: T, options: CrudOptions = {}) {
    const { filterColumn, hasUpdatedAt = true } = options
    const columns = getTableColumns(table)

    return {
        /**
         * Get all records, optionally filtered and paginated
         */
        async getAll(
            filterValue?: string,
            pagination?: PaginationOptions,
        ): Promise<Select[] | PaginatedResult<Select>> {
            // If no pagination options, return simple array (backward compatible)
            if (
                !pagination ||
                (!pagination.limit && !pagination.includeTotalCount)
            ) {
                if (filterValue && filterColumn) {
                    const column = columns[filterColumn as keyof typeof columns]
                    if (!column) {
                        throw new Error(
                            `Filter column '${filterColumn}' not found in table`,
                        )
                    }
                    const results = await db
                        .select()
                        // biome-ignore lint/suspicious/noExplicitAny: Drizzle generic table type requires assertion
                        .from(table as any)
                        .where(eq(column, filterValue))
                    return results as Select[]
                }
                // biome-ignore lint/suspicious/noExplicitAny: Drizzle generic table type requires assertion
                const results = await db.select().from(table as any)
                return results as Select[]
            }

            // Paginated query
            const { limit, offset = 0, includeTotalCount } = pagination

            // Get total count if requested (separate query)
            let totalCount: number | undefined
            if (includeTotalCount) {
                if (filterValue && filterColumn) {
                    const column = columns[filterColumn as keyof typeof columns]
                    if (!column) {
                        throw new Error(
                            `Filter column '${filterColumn}' not found in table`,
                        )
                    }
                    const countResult = await db
                        .select({ count: sql<number>`count(*)` })
                        // biome-ignore lint/suspicious/noExplicitAny: Drizzle generic table type requires assertion
                        .from(table as any)
                        .where(eq(column, filterValue))
                    totalCount = countResult[0]
                        ? Number(countResult[0].count)
                        : 0
                } else {
                    const countResult = await db
                        .select({ count: sql<number>`count(*)` })
                        // biome-ignore lint/suspicious/noExplicitAny: Drizzle generic table type requires assertion
                        .from(table as any)
                    totalCount = countResult[0]
                        ? Number(countResult[0].count)
                        : 0
                }
            }

            // Get paginated data
            let data: Select[]
            if (filterValue && filterColumn) {
                const column = columns[filterColumn as keyof typeof columns]
                if (!column) {
                    throw new Error(
                        `Filter column '${filterColumn}' not found in table`,
                    )
                }
                const query = db
                    .select()
                    // biome-ignore lint/suspicious/noExplicitAny: Drizzle generic table type requires assertion
                    .from(table as any)
                    .where(eq(column, filterValue))

                data = (await (limit
                    ? query.limit(limit).offset(offset)
                    : query)) as Select[]
            } else {
                // biome-ignore lint/suspicious/noExplicitAny: Drizzle generic table type requires assertion
                const query = db.select().from(table as any)
                data = (await (limit
                    ? query.limit(limit).offset(offset)
                    : query)) as Select[]
            }

            return {
                data,
                totalCount,
                limit,
                offset,
                hasMore:
                    totalCount !== undefined
                        ? offset + data.length < totalCount
                        : undefined,
            }
        },

        /**
         * Get a single record by ID
         */
        async getById(id: string): Promise<Select | undefined> {
            if (!columns.id) {
                throw new Error("Table does not have an 'id' column")
            }
            const results = await db
                .select()
                // biome-ignore lint/suspicious/noExplicitAny: Drizzle generic table type requires assertion
                .from(table as any)
                .where(eq(columns.id, id))
            return results[0] as Select | undefined
        },

        /**
         * Create a new record
         */
        async create(data: InsertInput<Insert>): Promise<Select> {
            const values = {
                ...data,
                id: data.id ?? generateId(),
                ...(hasUpdatedAt && { updatedAt: new Date().toISOString() }),
            } as Insert & { id: string; updatedAt?: string }

            const [created] = await db
                // biome-ignore lint/suspicious/noExplicitAny: Drizzle generic table type requires assertion
                .insert(table as any)
                .values(values)
                .returning()
            return created as Select
        },

        /**
         * Update a record by ID
         */
        async update(
            id: string,
            data: Partial<Insert>,
        ): Promise<Select | undefined> {
            if (!columns.id) {
                throw new Error("Table does not have an 'id' column")
            }
            const values: UpdateWithMeta<Partial<Insert>> = {
                ...data,
                ...(hasUpdatedAt && { updatedAt: new Date().toISOString() }),
            }

            const [updated] = await db
                // biome-ignore lint/suspicious/noExplicitAny: Drizzle generic table type requires assertion
                .update(table as any)
                .set(values)
                .where(eq(columns.id, id))
                .returning()
            return updated as Select | undefined
        },

        /**
         * Delete a record by ID
         */
        async delete(id: string): Promise<Select | undefined> {
            if (!columns.id) {
                throw new Error("Table does not have an 'id' column")
            }
            const [deleted] = await db
                // biome-ignore lint/suspicious/noExplicitAny: Drizzle generic table type requires assertion
                .delete(table as any)
                .where(eq(columns.id, id))
                .returning()
            return deleted as Select | undefined
        },
    }
}

/**
 * Type for CRUD operations
 */
export type CrudOperations<
    T extends PgTable<TableConfig>,
    Insert = T['$inferInsert'],
    Select = T['$inferSelect'],
> = {
    getAll: (
        filterValue?: string,
        pagination?: PaginationOptions,
    ) => Promise<Select[] | PaginatedResult<Select>>
    getById: (id: string) => Promise<Select | undefined>
    create: (data: Insert) => Promise<Select>
    update: (id: string, data: Partial<Insert>) => Promise<Select | undefined>
    delete: (id: string) => Promise<Select | undefined>
}

/**
 * Export pagination types for external use
 */
export type { PaginationOptions, PaginatedResult }
