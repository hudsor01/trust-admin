/**
 * Neon database connections.
 *
 * Two drivers: neon() HTTP for Drizzle ORM queries, postgres.js for raw SQL/transactions.
 * RLS via AsyncLocalStorage: tRPC context → setRequestAuthToken(jwt) → auth-enabled Drizzle →
 * Neon Authorize validates JWT → queries run as `authenticated` role with RLS policies.
 * Without token → neondb_owner (BYPASSRLS).
 */
import { AsyncLocalStorage } from 'node:async_hooks'
import { neon } from '@neondatabase/serverless'
import * as Sentry from '@sentry/nextjs'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http'
import type {
    ParameterOrFragment,
    PendingQuery,
    Row,
    TransactionSql,
} from 'postgres'
import postgres from 'postgres'
import { env } from '../src/lib/env'
import * as relations from './relations'
import * as schema from './schema'

/** postgres.js TransactionSql strips the call signature via Omit -- re-add it for tagged template usage. */
export type TxSql = TransactionSql &
    (<T extends readonly (object | undefined)[] = Row[]>(
        template: TemplateStringsArray,
        ...parameters: readonly ParameterOrFragment<never>[]
    ) => PendingQuery<T>)

// =============================================================================
// PER-REQUEST AUTH TOKEN (AsyncLocalStorage)
// =============================================================================
type AuthStore = {
    token: string
    db?: NeonHttpDatabase<Schema>
}

const authTokenStore = new AsyncLocalStorage<AuthStore>()

/** Bind JWT to current async context — all subsequent `db` queries use RLS-enabled Drizzle. */
export function setRequestAuthToken(token: string): void {
    authTokenStore.enterWith({ token })
}

type Schema = typeof schema & typeof relations

const drizzleSchema = { ...schema, ...relations }

// =============================================================================
// DATABASE INSTANCES
// =============================================================================

let _sqlPublic: ReturnType<typeof neon> | null = null
let _dbPublic: NeonHttpDatabase<Schema> | null = null
let _pgClient: ReturnType<typeof postgres> | null = null

function getDatabaseUrl(): string {
    return env.DATABASE_URL.replace(/\?schema=\w+$/, '') // strip legacy Prisma suffix
}

/** Unauthenticated Drizzle — runs as neondb_owner (BYPASSRLS). */
export function getPublicDb(): NeonHttpDatabase<Schema> {
    if (_dbPublic) return _dbPublic
    _sqlPublic = neon(getDatabaseUrl())
    _dbPublic = drizzleHttp(_sqlPublic, { schema: drizzleSchema })
    return _dbPublic
}

/** Auth-enabled Drizzle — JWT validated by Neon Authorize, queries run as `authenticated` role. */
function getAuthDb(store: AuthStore): NeonHttpDatabase<Schema> {
    if (store.db) return store.db
    const sql = neon(getDatabaseUrl(), { authToken: store.token })
    store.db = drizzleHttp(sql, { schema: drizzleSchema })
    return store.db
}

/** Lazy-init postgres.js client for raw SQL and transactions. */
function initializePostgresClient(): ReturnType<typeof postgres> {
    if (_pgClient) return _pgClient

    const cleanDatabaseUrl = getDatabaseUrl()

    _pgClient = postgres(cleanDatabaseUrl, {
        max: 10,
        idle_timeout: 10,
        connect_timeout: 30,
        max_lifetime: 60 * 15,
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

/** Routes to auth-enabled or public Drizzle based on whether a JWT is in the async context. */
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

/** Raw neon() SQL function (stateless, no auth) — use getClient() for transactions. */
export function getSql(): ReturnType<typeof neon> {
    if (!_sqlPublic) {
        _sqlPublic = neon(getDatabaseUrl())
    }
    return _sqlPublic
}

/** postgres.js client — supports transactions via client.begin() and template-string SQL. */
export function getClient(): ReturnType<typeof postgres> {
    return initializePostgresClient()
}

/**
 * Proxy that dispatches to auth-enabled or public Drizzle per-request.
 * Auth path: RLS enforced via Neon Authorize. No-auth path: neondb_owner (BYPASSRLS).
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

export * from './relations'
export * from './schema'

/** Init RLS on postgres.js client — only for tests/raw SQL. Production uses setRequestAuthToken(). */
export async function initJwtSession(token: string): Promise<void> {
    const client = getClient()
    await client`SELECT auth.jwt_session_init(${token})`
}
