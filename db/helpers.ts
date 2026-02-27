/** Drizzle schema column helpers. */
import { sql } from 'drizzle-orm'
import { text, timestamp, uuid } from 'drizzle-orm/pg-core'

/** @deprecated Use `bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity()`. */
export const generateId = () => crypto.randomUUID()

/** @deprecated Use `bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity()`. */
export const textId = () => text().primaryKey().$defaultFn(generateId)

/** UUID primary key with random default. */
export const uuidId = () => uuid().primaryKey().defaultRandom()

/** Spread into pgTable for createdAt (DB default) + updatedAt (app-set on write). */
export const timestamps = () => ({
    createdAt: timestamp({ precision: 3, mode: 'string' as const })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp({ precision: 3, mode: 'string' as const })
        .notNull()
        .$onUpdateFn(() => new Date().toISOString()),
})

/** Timestamp with timezone — use for fields where timezone matters. */
export const timestampWithTz = () =>
    timestamp({ precision: 3, mode: 'string' as const, withTimezone: true })
