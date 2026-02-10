/**
 * Production Database Guard
 *
 * Import this module at the top of any test file that writes to the database.
 * It throws immediately if DATABASE_URL points to the production pooler endpoint,
 * preventing test data from polluting production.
 *
 * Usage:
 *   import '../helpers/db-guard'  // must be first import
 */
const dbUrl = process.env.DATABASE_URL ?? ''
const isProductionDb = dbUrl.includes('-pooler.') && !dbUrl.includes('/br-')

if (isProductionDb && !process.env.ALLOW_PRODUCTION_DB_TESTS) {
    throw new Error(
        'DATABASE_URL points to a production pooler endpoint. ' +
            'Tests must use a Neon branch or non-pooler dev database. ' +
            'Set DATABASE_URL to a branch endpoint, or set ALLOW_PRODUCTION_DB_TESTS=true to override.',
    )
}
