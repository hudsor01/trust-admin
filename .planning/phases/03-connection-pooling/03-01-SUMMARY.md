# Summary 03-01: Implement Connection Pooling

## Completed: 2026-01-23

## What Was Done

1. **Updated .env.example** - Added documentation for pooler vs direct connections
2. **Updated drizzle.config.ts** - Prefers DATABASE_URL_DIRECT for migrations

## Configuration

### Production DATABASE_URL (pooled)
```
postgresql://user:pass@ep-xxx-xxx-pooler.region.aws.neon.tech/dbname
```
- Use `-pooler` suffix in hostname
- Supports 10,000 concurrent connections
- Pool mode: transaction (default)

### Migrations DATABASE_URL_DIRECT (direct)
```
postgresql://user:pass@ep-xxx-xxx.region.aws.neon.tech/dbname
```
- No `-pooler` suffix
- Required for migrations (prepared statements)
- Used automatically by drizzle.config.ts

## Limitations of Pooled Connections

When using `-pooler` endpoint, these features are unavailable:
- SET statements
- LISTEN/NOTIFY
- Cursors WITH HOLD
- Prepared statements via SQL PREPARE
- Session-level advisory locks

This is why migrations use direct connections.

## Files Changed

- `.env.example` - Added DATABASE_URL_DIRECT documentation
- `drizzle.config.ts` - Prefers DATABASE_URL_DIRECT for migrations

## To Enable

1. Update Vercel/production DATABASE_URL to use `-pooler` endpoint
2. Set DATABASE_URL_DIRECT in Vercel for migrations (or run locally)
