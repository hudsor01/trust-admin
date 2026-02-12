/**
 * Production Database Guard
 *
 * Import this module at the top of any test file that writes to the database.
 * It detects when DATABASE_URL points to a production pooler endpoint and
 * exports a flag so test files can skip DB tests accordingly.
 *
 * Usage:
 *   import { isProductionDb } from '../helpers/db-guard'
 *
 *   describe.skipIf(isProductionDb)('My DB tests', () => { ... })
 */
const dbUrl = process.env.DATABASE_URL ?? ''
export const isProductionDb =
    dbUrl.includes('-pooler.') &&
    !dbUrl.includes('/br-') &&
    !process.env.ALLOW_PRODUCTION_DB_TESTS
