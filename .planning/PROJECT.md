# Project: Trust Admin

## What This Is

A trust administration application for managing the **Hudson Living Trust**, a Texas Irrevocable Trust. The grantor (Richard Hudson) died 2025-12-28, making this an **estate settlement** followed by **ongoing trust administration**.

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

**Shipped through v5.0 (2026-05-22).** Production-hardened, feature-complete for estate settlement + ongoing administration, and now tracking firearms as a first-class trust asset class.

- 25+ tRPC routers for all resources (including `firearmRouter`); admin auth + beneficiary portal (email/password)
- Payment recording with auto-accounting; HEMS workflow (request → approve → distribute)
- RLS policies with JWT session initialization; immutable activity-log audit trail
- Custom forgot/reset password flow via n8n webhook; admin user provisioning with forced password change
- Hardened security posture: validated env, timing-safe access codes, session revocation, base64 caps
- Dashboard performance: SQL-aggregated totals, server-side pagination, portal prefetch
- Full asset coverage: dedicated admin pages for **8 asset classes** — bank accounts, investment accounts, vehicles, homestead/rental properties, personal property, artwork, insurance, and firearms (NFA-aware with `setNfaTransferStatus` CQS mutation)
- Dashboard UX (Kibo/Dice shadcn registries): KPI strips on 11+ pages (5-tile support for /beneficiaries), HEMS kanban, activity timeline+heatmap, liability gantt + share-allocation donut charts, DataTable bulk-actions/CSV/row-expansion across 15 admin tables, 3-step asset-creation wizard
- Beneficiaries page streamlined to 5 essential sections (PageHeader → KPI strip → ShareDonuts → Table → dialogs); display-order drag-reorder UI removed (sort persistence preserved via `beneficiary.sortIndex`)
- Schema completeness: real KPI data columns, liability-to-account FKs (migrations 0012-0014)

## Shipped Milestones

- **v1.0 Neon Platform Integration** (2026-01-23) — serverless driver, preview branching, pooling, autoscaling
- **v2.0 Public Inventory Form** (2026-01-22) — public submission form + admin review queue
- **v3.0 Email/Password Auth Migration** (2026-02-22) — email/password auth, user provisioning, beneficiary RLS isolation
- **v4.0 Production Hardening & Completeness** (2026-05-21) — 13 phases: security/perf/correctness hardening, feature completeness, code-quality cleanup, dashboard UX revamp, gap-closure. Audit `passed`, 40/40 requirements. See `milestones/v4.0-ROADMAP.md`.
- **v5.0 Firearms Tracking & Beneficiary UX Refinement** (2026-05-22) — 6 phases: firearm schema + tRPC router + admin page + aggregator integration + sidebar alphabetization + beneficiaries page prune. 17/17 requirements (FIRE-01..09, ASSET-01..04, BENE-01..04). See `milestones/v5.0-ROADMAP.md`.

## Next Milestone

No active milestone. v5.0 closeout completed the firearms work and the beneficiaries cleanup; the project is at a clean shipping point.

When the next milestone begins:
- Run `/gsd:new-milestone` to define scope, requirements, and roadmap
- Fresh `REQUIREMENTS.md` is created at that time
- Carry-over from v4.0: Nyquist validation coverage is `partial`/`missing` across v4.0 phases — backfill with `/gsd-validate-phase {N}` independent of milestone boundaries (still applies)

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-22 after v5.0 milestone complete*
