# External Integrations

**Analysis Date:** 2026-01-08

## APIs & External Services

**Email/Communication:**
- Resend - Transactional email for magic link authentication
  - SDK/Client: `resend` npm package 6.6.0
  - Integration: `src/lib/auth.ts` (lines 12-21, 68-84)
  - Auth: API key in `RESEND_API_KEY` env var
  - Optional: Server runs without it (email disabled if not configured)
  - Sender: Configured via `EMAIL_FROM` env var (default: `Trust Admin <onboarding@resend.dev>`)

**Authentication:**
- Better Auth - Magic link passwordless authentication
  - SDK/Client: `better-auth` npm package 1.4.10
  - Implementation: `src/lib/auth.ts`, `src/lib/auth-client.ts`
  - Database adapter: Drizzle ORM with PostgreSQL
  - Session: 7-day expiration, 24-hour refresh window
  - Tables: `user`, `session`, `account`, `verification`

## Data Storage

**Databases:**
- PostgreSQL 18 - Primary data store
  - Connection: via `DATABASE_URL` env var
  - Client: Drizzle ORM 0.45.1 + postgres-js 3.4.8 adapter
  - Location: `db/index.ts` (connection pool configuration)
  - Migrations: Drizzle-Kit in `drizzle/` (production), `db:push` for development
  - Schema: `db/schema.ts` (31 tables, 40+ enums)
  - Container: Docker Compose (`docker-compose.yml`) with persistent volumes

**File Storage:**
- None currently - No cloud storage integration detected
- Documents referenced in `document` table but not uploaded to external service

**Caching:**
- None - All queries go directly to PostgreSQL
- No Redis, Memcached, or in-memory caching layer detected

## Authentication & Identity

**Auth Provider:**
- Better Auth with Magic Link plugin
  - Implementation: Drizzle database adapter
  - Token storage: httpOnly cookies (recommended practice)
  - Session management: JWT with auto-refresh
  - Client integration: `src/lib/auth-client.ts` (React hooks)

**OAuth Integrations:**
- None currently configured
- Better Auth supports OAuth plugins but not implemented

## Monitoring & Observability

**Error Tracking:**
- None - No Sentry, Rollbar, or error tracking service detected
  - Errors logged to console only: `src/hooks/use-query.ts` (line 78)

**Analytics:**
- None - No Mixpanel, Google Analytics, or analytics service detected

**Logs:**
- Console output only (stdout/stderr)
- No structured logging service integration

## CI/CD & Deployment

**Hosting:**
- Docker containers (self-hosted or cloud)
  - Deployment: `Dockerfile` with multi-stage build
  - Base image: `oven/bun:1`
  - Port: 5050 for API server

**CI Pipeline:**
- None detected - No GitHub Actions, CircleCI, or CI config found

**Container Orchestration:**
- Docker Compose for local development (`docker-compose.yml`)
  - Services: postgres (database), backup (automated pg_dump)
  - Volumes: Persistent data at `./data`, backups at `~/Desktop/trust-admin-backups`

## Environment Configuration

**Development:**
- Required env vars: `DATABASE_URL`, `RESEND_API_KEY` (optional), `EMAIL_FROM`, `BETTER_AUTH_SECRET`
- Secrets location: `.env` file (gitignored)
- PostgreSQL: Docker container on port 5432

**Staging:**
- Not detected - No staging-specific configuration found

**Production:**
- Secrets management: Environment variables (no cloud provider integration detected)
- Database: PostgreSQL with automated backups via `prodrigestivill/postgres-backup-local:18`
- Backup schedule: Configurable via `BACKUP_SCHEDULE` env var (cron format)

## Webhooks & Callbacks

**Incoming:**
- None - No webhook endpoints detected in API routes

**Outgoing:**
- None - No webhook dispatching to external services detected

## Backup & Recovery

**Automated Backups:**
- postgres-backup-local Docker container
  - Image: `prodrigestivill/postgres-backup-local:18`
  - Location: `~/Desktop/trust-admin-backups` (configurable)
  - Integration: `docker-compose.yml`
  - Schedule: Via `BACKUP_SCHEDULE` env var (default: `0 2 * * *` - 2 AM daily)
  - Retention: Configurable via `BACKUP_KEEP_*` env vars

---

*Integration audit: 2026-01-08*
*Update when adding/removing external services*
