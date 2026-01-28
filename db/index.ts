/**
 * Database Connection - Neon Serverless Driver
 *
 * Uses @neondatabase/serverless for optimized HTTP queries through Drizzle ORM.
 * Uses postgres.js for raw SQL queries with template string support (tests, migrations).
 *
 * Architecture:
 * - Production queries: Drizzle + neon() HTTP driver (fast, stateless)
 * - Raw SQL/Tests: postgres.js (template strings, transactions)
 *
 * @see https://neon.com/docs/serverless/serverless-driver
 */
import { neon } from '@neondatabase/serverless'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http'
import postgres from 'postgres'
import * as relations from './relations'
import * as schema from './schema'

// Note: neonConfig.fetchConnectionCache is now always true by default

// Schema type combining tables and relations
type Schema = typeof schema & typeof relations

// Lazy initialization
let _sql: ReturnType<typeof neon> | null = null
let _db: NeonHttpDatabase<Schema> | null = null
let _pgClient: ReturnType<typeof postgres> | null = null

function getDatabaseUrl(): string {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
        throw new Error(
            'DATABASE_URL environment variable is not set. Please set it in your .env file or environment.',
        )
    }
    // Strip ?schema=public suffix if present
    return databaseUrl.replace(/\?schema=\w+$/, '')
}

/**
 * Initialize HTTP-based database connection for Drizzle ORM
 * Lower latency, better for serverless cold starts
 */
function initializeHttpDatabase(): {
    db: NeonHttpDatabase<Schema>
    sql: ReturnType<typeof neon>
} {
    if (_db && _sql) return { db: _db, sql: _sql }

    const cleanDatabaseUrl = getDatabaseUrl()

    // Create neon SQL function for HTTP queries
    _sql = neon(cleanDatabaseUrl)

    // Create Drizzle instance with schema
    _db = drizzleHttp(_sql, { schema: { ...schema, ...relations } })

    return { db: _db, sql: _sql }
}

/**
 * Initialize postgres.js client for raw SQL queries
 * Supports template strings and proper transaction handling
 */
function initializePostgresClient(): ReturnType<typeof postgres> {
    if (_pgClient) return _pgClient

    const cleanDatabaseUrl = getDatabaseUrl()

    // postgres.js with serverless-optimized settings
    _pgClient = postgres(cleanDatabaseUrl, {
        max: 10, // Conservative for serverless
        idle_timeout: 10,
        connect_timeout: 5,
        max_lifetime: 60 * 15, // 15min
        prepare: true,
        fetch_types: false,
        connection: {
            application_name: 'trust-admin',
        },
    })

    return _pgClient
}

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * Get HTTP-based Drizzle instance (default, recommended)
 * Use for most queries - lower latency in serverless
 */
export function getDb(): NeonHttpDatabase<Schema> {
    return initializeHttpDatabase().db
}

/**
 * Get raw neon SQL function for direct HTTP queries
 * Note: Stateless - use getClient() for transactions
 */
export function getSql(): ReturnType<typeof neon> {
    return initializeHttpDatabase().sql
}

/**
 * Get postgres.js client for raw SQL with template strings
 * Supports transactions via client.begin() and client.unsafe()
 * Use for tests, migrations, and complex raw SQL
 */
export function getClient(): ReturnType<typeof postgres> {
    return initializePostgresClient()
}

/**
 * Default database instance - lazily initialized HTTP db via Drizzle
 * Use via `import { db } from '@/db'`
 */
export const db = new Proxy({} as NeonHttpDatabase<Schema>, {
    get(_target, prop) {
        const instance = getDb()
        const value = instance[prop as keyof NeonHttpDatabase<Schema>]
        if (typeof value === 'function') {
            return value.bind(instance)
        }
        return value
    },
})

// Re-export schema and relations
export * from './relations'
export * from './schema'

/**
 * Initialize JWT session for RLS
 * Call this with the JWT token to set auth.user_id() for RLS policies
 *
 * Uses postgres.js client for proper session state handling
 */
export async function initJwtSession(token: string): Promise<void> {
    const client = getClient()
    await client`SELECT auth.jwt_session_init(${token})`
}
