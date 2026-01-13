import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as relations from "./relations"
import * as schema from "./schema"

// Lazy initialization - connection only created when first accessed
let _client: ReturnType<typeof postgres> | null = null
let _db: PostgresJsDatabase<typeof schema & typeof relations> | null = null

function initializeDatabase() {
  if (_db) return { db: _db, client: _client! }

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL environment variable is not set. Please set it in your .env file or environment.",
    )
  }

  // Strip ?schema=public suffix if present
  const cleanDatabaseUrl = databaseUrl.replace(/\?schema=\w+$/, "")

  // postgres-js optimized for Neon serverless PostgreSQL
  _client = postgres(cleanDatabaseUrl, {
    max: 50, // Neon supports 10K via pooler - increased from 10
    idle_timeout: 10, // Faster cleanup for serverless (was 20)
    connect_timeout: 5, // Faster failover (was 10)
    max_lifetime: 60 * 15, // 15min for serverless best practice (was 30min)
    prepare: true, // Enable prepared statements (auto-caching)
    fetch_types: false, // Skip type fetching (we use Drizzle schema)
    connection: {
      application_name: "trust-admin", // Better monitoring in Neon dashboard
    },
  })

  // Drizzle instance with schema and relations for relational queries
  _db = drizzle(_client, { schema: { ...schema, ...relations } })

  return { db: _db, client: _client }
}

// Getter functions for lazy initialization
export function getDb() {
  return initializeDatabase().db
}

export function getClient() {
  return initializeDatabase().client
}

// Backwards compatibility - but now lazily initialized
export const db = new Proxy({} as PostgresJsDatabase<typeof schema & typeof relations>, {
  get(_target, prop) {
    return getDb()[prop as keyof typeof _target]
  },
})

export const client = new Proxy({} as ReturnType<typeof postgres>, {
  get(_target, prop) {
    return getClient()[prop as keyof typeof _target]
  },
})

export * from "./relations"
// Re-export schema and relations for convenience
export * from "./schema"
