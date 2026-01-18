/**
 * Drizzle ORM Schema Helpers
 *
 * Based on best practices from https://orm.drizzle.team/docs/column-types/pg
 */
import { sql } from 'drizzle-orm'
import { text, timestamp, uuid } from 'drizzle-orm/pg-core'

/**
 * Generate a UUID v4 using crypto.randomUUID()
 * Use with $defaultFn() for auto-generated IDs
 *
 * @example
 * id: text().primaryKey().$defaultFn(generateId)
 */
export const generateId = () => crypto.randomUUID()

/**
 * Standard ID column using text with UUID default
 * Compatible with existing schema using text IDs
 *
 * @example
 * const myTable = pgTable("MyTable", {
 *   id: textId(),
 *   // other columns...
 * });
 */
export const textId = () => text().primaryKey().$defaultFn(generateId)

/**
 * Native UUID column with auto-generated default
 * Use for new tables where native UUID type is preferred
 *
 * @example
 * const myTable = pgTable("MyTable", {
 *   id: uuidId(),
 *   // other columns...
 * });
 */
export const uuidId = () => uuid().primaryKey().defaultRandom()

/**
 * Standard timestamp columns for audit trails
 * Returns createdAt and updatedAt column definitions
 *
 * @example
 * const myTable = pgTable("MyTable", {
 *   id: textId(),
 *   name: text().notNull(),
 *   ...timestamps(),
 * });
 */
export const timestamps = () => ({
    createdAt: timestamp({ precision: 3, mode: 'string' as const })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp({ precision: 3, mode: 'string' as const })
        .notNull()
        .$onUpdateFn(() => new Date().toISOString()),
})

/**
 * Timestamp column with timezone support
 * Recommended for datetime fields where timezone matters
 *
 * @example
 * eventDate: timestampWithTz()
 */
export const timestampWithTz = () =>
    timestamp({ precision: 3, mode: 'string' as const, withTimezone: true })
