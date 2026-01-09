import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import * as relations from "./relations";

// Strip ?schema=public suffix if present in DATABASE_URL
const databaseUrl = process.env.DATABASE_URL!.replace(/\?schema=\w+$/, "");

// postgres-js with connection pool and auto-reconnect
const client = postgres(databaseUrl, {
  max: 10,                    // Maximum pool size
  idle_timeout: 20,           // Close idle connections after 20s
  connect_timeout: 10,        // Connection timeout
  max_lifetime: 60 * 30,      // Max connection lifetime 30 min
});

// Drizzle instance with schema and relations for relational queries
export const db = drizzle(client, { schema: { ...schema, ...relations } });

// Export for direct SQL if needed
export { client };

// Re-export schema and relations for convenience
export * from "./schema";
export * from "./relations";
