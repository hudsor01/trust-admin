import { defineConfig } from 'drizzle-kit'

// Direct connection preferred — PgBouncer rejects prepared statements used by migrations
const databaseUrl = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL
if (!databaseUrl) {
    throw new Error(
        'DATABASE_URL or DATABASE_URL_DIRECT environment variable is required for Drizzle Kit',
    )
}

// Strip trailing ?schema= and force sslmode=verify-full to silence pg driver warnings
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
    // Neon RLS role management
    entities: {
        roles: {
            provider: 'neon',
        },
    },
})
