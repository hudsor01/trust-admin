import { defineConfig } from "drizzle-kit"

// Strip ?schema=public suffix if present in DATABASE_URL
const databaseUrl = process.env.DATABASE_URL!.replace(/\?schema=\w+$/, "")

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
})
