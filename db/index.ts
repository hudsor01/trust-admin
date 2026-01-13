import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as relations from "./relations"
import * as schema from "./schema"

// Strip ?schema=public suffix if present in DATABASE_URL
const databaseUrl = process.env.DATABASE_URL!.replace(/\?schema=\w+$/, "")

// postgres-js optimized for Neon serverless PostgreSQL
const client = postgres(databaseUrl, {
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
export const db = drizzle(client, { schema: { ...schema, ...relations } })

// Export for direct SQL if needed
export { client }

export * from "./relations"
// Re-export schema and relations for convenience
export * from "./schema"
