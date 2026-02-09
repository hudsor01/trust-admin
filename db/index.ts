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
 * RLS Enforcement:
 * - tRPC context calls setRequestAuthToken(jwt) per request via AsyncLocalStorage
 * - The `db` proxy routes to an auth-enabled Drizzle instance when a token exists
 * - Neon Authorize validates the JWT and runs queries as `authenticated` role
 * - RLS policies on `authenticated` role filter rows via app.is_admin() / app.get_user_beneficiary_id()
 * - Without token (public procedures, tests), queries run as neondb_owner (BYPASSRLS)
 *
 * @see https://neon.com/docs/serverless/serverless-driver
 * @see https://neon.com/docs/guides/neon-authorize
 */
import { AsyncLocalStorage } from 'node:async_hooks'
import { neon } from '@neondatabase/serverless'
import * as Sentry from '@sentry/nextjs'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http'
import postgres from 'postgres'
import * as relations from './relations'
import * as schema from './schema'

// Note: neonConfig.fetchConnectionCache is now always true by default

// =============================================================================
// PER-REQUEST AUTH TOKEN (AsyncLocalStorage)
// =============================================================================

/**
 * Stores the JWT auth token and cached Drizzle instance for the current request.
 * Each incoming request gets its own async context via Node.js AsyncLocalStorage.
 */
type AuthStore = {
    token: string
    db?: NeonHttpDatabase<Schema>
}

const authTokenStore = new AsyncLocalStorage<AuthStore>()

/**
 * Set the JWT auth token for the current request context.
 * Call this in tRPC createContext() after obtaining the session token.
 *
 * Uses enterWith() to bind the token to the current async execution context.
 * All subsequent `db` queries in this request will use the auth-enabled Drizzle
 * instance, causing Neon to run them as the `authenticated` role.
 */
export function setRequestAuthToken(token: string): void {
    authTokenStore.enterWith({ token })
}

// Schema type combining tables and relations
type Schema = typeof schema & typeof relations

const drizzleSchema = { ...schema, ...relations }

// =============================================================================
// DATABASE INSTANCES
// =============================================================================

// Public db (no authToken) - for tests, public procedures, unauthenticated queries
let _sqlPublic: ReturnType<typeof neon> | null = null
let _dbPublic: NeonHttpDatabase<Schema> | null = null

// postgres.js client for raw SQL
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
 * Get the public (unauthenticated) Drizzle instance.
 * No authToken — runs as neondb_owner with BYPASSRLS.
 * Used for tests, public procedures, and setup queries.
 */
export function getPublicDb(): NeonHttpDatabase<Schema> {
    if (_dbPublic) return _dbPublic
    _sqlPublic = neon(getDatabaseUrl())
    _dbPublic = drizzleHttp(_sqlPublic, { schema: drizzleSchema })
    return _dbPublic
}

/**
 * Get an auth-enabled Drizzle instance for the current request.
 * Caches the instance in the AsyncLocalStorage store so it's reused within the request.
 *
 * The authToken causes Neon Authorize to:
 * 1. Validate the JWT against the configured JWKS endpoint
 * 2. Run the query as the `authenticated` role (no BYPASSRLS)
 * 3. Set auth.user_id() from the JWT's sub claim
 * 4. RLS policies filter rows accordingly
 */
function getAuthDb(store: AuthStore): NeonHttpDatabase<Schema> {
    if (store.db) return store.db
    const sql = neon(getDatabaseUrl(), { authToken: store.token })
    store.db = drizzleHttp(sql, { schema: drizzleSchema })
    return store.db
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
 * Get HTTP-based Drizzle instance.
 * Returns auth-enabled instance if a request token is set, otherwise public instance.
 */
export function getDb(): NeonHttpDatabase<Schema> {
    const store = authTokenStore.getStore()
    if (store?.token) {
        return getAuthDb(store)
    }
    Sentry.addBreadcrumb({
        category: 'db',
        message: 'Using public DB connection (no auth token in store)',
        level: 'info',
    })
    return getPublicDb()
}

/**
 * Get raw neon SQL function for direct HTTP queries (public, no auth).
 * Note: Stateless - use getClient() for transactions
 */
export function getSql(): ReturnType<typeof neon> {
    if (!_sqlPublic) {
        _sqlPublic = neon(getDatabaseUrl())
    }
    return _sqlPublic
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
 * Default database instance - routes to auth or public db based on request context.
 *
 * When setRequestAuthToken() has been called (tRPC authenticated requests):
 *   → Uses auth-enabled Drizzle instance → queries run as `authenticated` role → RLS enforced
 *
 * When no token is set (tests, public procedures):
 *   → Uses public Drizzle instance → queries run as neondb_owner → BYPASSRLS
 *
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
 * Initialize JWT session for RLS on postgres.js client.
 * Call this with the JWT token to set auth.user_id() for RLS policies.
 *
 * Note: This only affects the postgres.js connection (used by tests and raw SQL).
 * For production Drizzle queries, use setRequestAuthToken() instead.
 */
export async function initJwtSession(token: string): Promise<void> {
    const client = getClient()
    await client`SELECT auth.jwt_session_init(${token})`
}
