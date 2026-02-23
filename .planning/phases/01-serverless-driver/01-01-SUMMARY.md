# Summary 01-01: Switch to Neon Serverless Driver

## Completed: 2026-01-23

## What Was Done

1. **Installed @neondatabase/serverless** - Added neon serverless driver package
2. **Updated db/index.ts** - Hybrid architecture:
   - Drizzle ORM uses `neon()` HTTP driver for production queries (fast, stateless)
   - `getClient()` uses postgres.js for raw SQL (template strings, transactions)
3. **Maintained full test compatibility** - All 380 tests pass
4. **Build verified** - Production build successful

## Architecture

```
Production Queries (Drizzle)     Raw SQL/Tests (postgres.js)
         │                               │
         ▼                               ▼
   neon() HTTP driver            postgres.js client
         │                               │
         └───────────┬───────────────────┘
                     │
                     ▼
              Neon PostgreSQL
```

## Key Decisions

- **Hybrid approach**: Use neon() for Drizzle (HTTP, fast), postgres.js for raw SQL (transactions)
- **Rationale**: Tests require template string syntax + transaction support that HTTP driver lacks
- **No breaking changes**: Existing code using `db` and `getClient()` works unchanged

## Files Changed

- `db/index.ts` - Rewrote to use hybrid architecture
- `package.json` - Added `@neondatabase/serverless`

## Benefits Achieved

- Lower latency for Drizzle queries in serverless
- Better cold start times
- Connection caching via `neonConfig.fetchConnectionCache`
- Full test compatibility maintained
