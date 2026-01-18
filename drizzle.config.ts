import { defineConfig } from 'drizzle-kit'

// Strip ?schema=public suffix if present in DATABASE_URL
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
    throw new Error(
        'DATABASE_URL environment variable is required for Drizzle Kit',
    )
}
const cleanDatabaseUrl = databaseUrl.replace(/\?schema=\w+$/, '')

export default defineConfig({
    dialect: 'postgresql',
    schema: './db/schema.ts',
    out: './drizzle',
    dbCredentials: {
        url: cleanDatabaseUrl,
    },
    verbose: true,
    strict: true,
})
