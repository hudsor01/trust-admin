/**
 * PostgreSQL Extensions Configuration
 *
 * Extensions must be installed on the database server before use.
 * Run these SQL commands as a superuser to enable extensions:
 *
 * @see https://orm.drizzle.team/docs/extensions/pg
 */

/**
 * SQL to enable commonly used extensions.
 * Execute in your database migration or manually.
 */
export const EXTENSION_SQL = `
-- UUID generation (alternative to crypto.randomUUID)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Full-text search improvements
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Case-insensitive text type
CREATE EXTENSION IF NOT EXISTS "citext";
`

/**
 * Extension availability check queries
 */
export const CHECK_EXTENSIONS_SQL = `
SELECT extname, extversion
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'pg_trgm', 'citext')
ORDER BY extname;
`

/**
 * Example: Using uuid_generate_v4() from uuid-ossp extension
 *
 * In schema.ts:
 * ```typescript
 * import { sql } from "drizzle-orm";
 * import { uuid } from "drizzle-orm/pg-core";
 *
 * // Database-generated UUID (requires uuid-ossp extension)
 * id: uuid().primaryKey().default(sql`uuid_generate_v4()`)
 *
 * // Or use Drizzle's built-in defaultRandom (no extension needed)
 * id: uuid().primaryKey().defaultRandom()
 * ```
 */

/**
 * Example: Using pg_trgm for similarity search
 *
 * ```sql
 * -- Create trigram index for fast fuzzy search
 * CREATE INDEX idx_beneficiary_name_trgm
 * ON "Beneficiary" USING GIN ((first_name || ' ' || last_name) gin_trgm_ops);
 *
 * -- Query with similarity
 * SELECT * FROM "Beneficiary"
 * WHERE similarity(first_name || ' ' || last_name, 'John Doe') > 0.3
 * ORDER BY similarity(first_name || ' ' || last_name, 'John Doe') DESC;
 * ```
 */

/**
 * Example: Using citext for case-insensitive email
 *
 * In schema.ts:
 * ```typescript
 * import { customType } from "drizzle-orm/pg-core";
 *
 * const citext = customType<{ data: string }>({
 *   dataType() { return "citext"; }
 * });
 *
 * // Case-insensitive email column
 * email: citext().unique()
 * ```
 */

/**
 * Note: For vector similarity search (AI embeddings), install pg_vector:
 *
 * ```sql
 * CREATE EXTENSION IF NOT EXISTS vector;
 * ```
 *
 * Then in schema.ts:
 * ```typescript
 * import { vector } from "drizzle-orm/pg-core";
 *
 * embedding: vector({ dimensions: 1536 })
 * ```
 */
