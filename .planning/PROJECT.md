# Project: Trust Admin

## What This Is

A trust administration application for managing the **Hudson Living Trust**, a Texas Irrevocable Trust. The grantor (Richard Hudson) died 2024-12-28, making this an **estate settlement** followed by **ongoing trust administration**.

**Two user types:**
- **Admin (Trustee):** Manages all trust assets, liabilities, accounting, and distributions
- **Beneficiary:** Views their share, submits HEMS requests through a portal

## Core Value

Secure, auditable trust administration with role-based access control and Texas Property Code compliance.

## Tech Stack

- **Runtime:** Bun
- **Framework:** Next.js 16 (App Router)
- **API:** tRPC v11
- **Database:** PostgreSQL (Neon serverless)
- **ORM:** Drizzle ORM
- **Auth:** Neon Auth (managed Better Auth)
- **Deployment:** Vercel

## Current State

- 24 tRPC routers for all resources
- Admin auth + beneficiary portal (magic link)
- Payment recording with auto-accounting
- HEMS workflow (request → approve → distribute)
- RLS policies with JWT session initialization
- Activity log audit trail

## Neon Features Currently Using

- Neon Auth with native `session.user.role`
- RLS via `initJwtSession()` for `auth.user_id()`
- Drizzle with `entities.roles.provider: 'neon'`

## Neon Features NOT Using (Opportunity)

- Serverless driver (`@neondatabase/serverless`)
- Connection pooling (PgBouncer)
- Preview branching (Vercel integration)
- pg_cron scheduled jobs
- Time travel queries
- Optimized autoscaling
