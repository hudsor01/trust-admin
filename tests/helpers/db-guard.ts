/** Detects production DATABASE_URL; use `describe.skipIf(isProductionDb)` to skip DB-write tests. */
const dbUrl = process.env.DATABASE_URL ?? ''
export const isProductionDb =
    dbUrl.includes('-pooler.') &&
    !dbUrl.includes('/br-') &&
    !process.env.ALLOW_PRODUCTION_DB_TESTS
