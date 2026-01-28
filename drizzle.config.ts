import { defineConfig } from 'drizzle-kit'

// Prefer direct connection for migrations (bypasses PgBouncer pooling)
// Pooled connections don't support prepared statements used by migrations
const databaseUrl = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL
if (!databaseUrl) {
    throw new Error(
        'DATABASE_URL or DATABASE_URL_DIRECT environment variable is required for Drizzle Kit',
    )
}

// Clean up URL and ensure proper SSL mode to avoid pg driver warnings
let cleanDatabaseUrl = databaseUrl.replace(/\?schema=\w+$/, '')
const url = new URL(cleanDatabaseUrl)
url.searchParams.set('sslmode', 'verify-full')
cleanDatabaseUrl = url.toString()

export default defineConfig({
    dialect: 'postgresql',
    schema: './db/schema.ts',
    out: './drizzle',
    dbCredentials: {
        url: cleanDatabaseUrl,
    },
    verbose: true,
    strict: true,
    // Enable RLS role management for Neon
    entities: {
        roles: {
            provider: 'neon',
        },
    },
})
