# Trust Admin

## What This Is

A trust administration application for managing the **Hudson Living Trust** (Texas Irrevocable Trust). Full-stack monolith with Next.js 16 App Router, tRPC v11 for type-safe APIs, and PostgreSQL via Drizzle ORM. Supports admin (trustee) and beneficiary portal workflows.

## Core Value

**Reliable trust administration** — Type-safe APIs, clear error handling, database-level constraints, and maintainable code for ongoing development.

## Current State (v6.0 shipped)

**Stack:** Next.js 16.1 + tRPC v11 + React 19.2 + Drizzle ORM + Better Auth + Neon PostgreSQL

**React 19.2 features (v6.0):**
- `useOptimistic` for instant UI feedback (payments, HEMS, tasks)
- `after()` for non-blocking audit logging
- `useActionState` + Server Actions for progressive enhancement
- TanStack Query tuning (30s staleTime, 10min gcTime)

**Database improvements (v3.0):**
- 116 timestamp columns using TIMESTAMPTZ
- 5 pgEnums for type-safe columns
- CHECK constraints on 3 polymorphic tables
- 3 composite indexes for query performance
- BIGINT IDENTITY primary keys (27 tables)
- snake_case table naming convention

**Features working:**
- 24 tRPC routers for all resources
- Admin auth + beneficiary portal (magic link)
- Payment recording with auto-accounting + optimistic UI
- HEMS workflow (request → approve → distribute) + progressive enhancement
- Year-end income-to-principal conversion
- Beneficiary death handling with share redistribution
- Activity log audit trail (non-blocking)
- Command palette (⌘K)
- Dashboard charts (recharts)
- Virtualized tables for large datasets
- URL-based entity filtering (nuqs)

## Requirements

### Validated

- ✓ Trust entity management (31 tables) — v1.0
- ✓ Type-safe APIs via tRPC — v2.0
- ✓ Proper timezone handling (TIMESTAMPTZ) — v3.0
- ✓ Database-level type validation (pgEnums) — v3.0
- ✓ Polymorphic constraint enforcement (CHECK) — v3.0
- ✓ BIGINT IDENTITY primary keys — v3.0
- ✓ PostgreSQL naming conventions (snake_case) — v3.0
- ✓ Loan amortization calculations — v4.0
- ✓ Bulk entry for liabilities — v4.0
- ✓ Dashboard charts — v5.0
- ✓ Error monitoring (@sentry/nextjs) — v5.0
- ✓ Optimistic UI updates (useOptimistic) — v6.0
- ✓ Non-blocking audit logging (after()) — v6.0
- ✓ Progressive enhancement (useActionState) — v6.0

### Active

- [ ] v7.0: Codebase consolidation

### Out of Scope

- File upload/document storage
- Email notifications in production
- Multi-entity support (currently single trust)
- Mobile app

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| BIGINT IDENTITY PKs over TEXT | Performance, storage, PostgreSQL best practice | ✓ Good |
| snake_case tables | PostgreSQL conventions, avoids quoting issues | ✓ Good |
| Better Auth tables keep TEXT IDs | Compatibility with auth library | ✓ Good |
| recordId stays text | Polymorphic across Better Auth and app tables | ✓ Good |
| z.coerce.number() for ID validation | Handles URL string→number conversion | ✓ Good |
| useOptimistic for mutations | Instant UI feedback before server responds | ✓ Good |
| after() for audit logging | Fire-and-forget, non-blocking | ✓ Good |
| Hidden inputs for Radix Select | Sync UI component with native form | ✓ Good |
| TanStack Query over server cache | tRPC apps benefit from client-side caching | ✓ Good |

## Constraints

- **Tech Stack**: Bun runtime, Next.js 16, PostgreSQL, Drizzle ORM
- **Database**: Neon serverless PostgreSQL
- **Auth**: Better Auth with magic link (no passwords)
- **No Breaking Changes**: Preserve existing API contracts

---
*Last updated: 2026-01-18 after v6.0 milestone*
