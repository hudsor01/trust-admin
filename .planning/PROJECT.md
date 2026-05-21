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

**Shipped through v4.0 (2026-05-21).** Production-hardened and feature-complete for estate settlement + ongoing administration.

- 24+ tRPC routers for all resources; admin auth + beneficiary portal (email/password)
- Payment recording with auto-accounting; HEMS workflow (request → approve → distribute)
- RLS policies with JWT session initialization; immutable activity-log audit trail
- Custom forgot/reset password flow via n8n webhook; admin user provisioning with forced password change
- Hardened security posture: validated env, timing-safe access codes, session revocation, base64 caps
- Dashboard performance: SQL-aggregated totals, server-side pagination, portal prefetch
- Full asset coverage: dedicated admin pages for artwork, personal property, insurance
- Dashboard UX (Kibo/Dice shadcn registries): KPI strips on 11 pages, HEMS kanban, activity timeline+heatmap, liability/beneficiary gantt + donut charts, DataTable bulk-actions/CSV/row-expansion across 14 admin tables, sortable trustee/beneficiary lists, 3-step asset-creation wizard
- Schema completeness: real KPI data columns, liability-to-account FKs (migrations 0012-0013)

## Shipped Milestones

- **v1.0 Neon Platform Integration** (2026-01-23) — serverless driver, preview branching, pooling, autoscaling
- **v2.0 Public Inventory Form** (2026-01-22) — public submission form + admin review queue
- **v3.0 Email/Password Auth Migration** (2026-02-22) — email/password auth, user provisioning, beneficiary RLS isolation
- **v4.0 Production Hardening & Completeness** (2026-05-21) — 13 phases: security/perf/correctness hardening, feature completeness, code-quality cleanup, dashboard UX revamp, gap-closure. Audit `passed`, 40/40 requirements. See `milestones/v4.0-ROADMAP.md`.

## Next Milestone

TBD — run `/gsd-new-milestone` to define v5.0 (theme, requirements, roadmap).

Known carry-over (advisory, not blocking): Nyquist validation coverage is `partial`/`missing` across v4.0 phases — optionally backfill with `/gsd-validate-phase {N}` independent of milestone boundaries.

---
*Last updated: 2026-05-21 after v4.0 milestone*
