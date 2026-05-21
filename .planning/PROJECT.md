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

## Current Milestone: v5.0 Firearms Tracking & Beneficiary UX Refinement

**Goal:** Add firearms as a first-class trust asset class and streamline the Beneficiaries view by removing redundant UI.

**Target features:**
- Beneficiaries view — remove the avatar-stack card and the entire Display Order + withdrawal-milestone gantt section; rely on the table's existing column-click sorting
- Firearms asset page — new dedicated `firearm` table (serial #, make/model, caliber, NFA class, FFL/ATF transfer status) with router + admin page, integrated into dashboard asset totals
- Assets nav — alphabetize the dropdown sub-items and insert Firearms: Accounts, Artwork, Firearms, Insurance, Personal Property, Properties, Vehicles

**Notes:**
- v5.0 is open-ended — these features start the milestone; more phases are added as work surfaces them
- Firearms stored as a dedicated table (not a `personalProperty` category) — firearms carry regulatory fields (serial #, NFA classification, FFL/ATF Form 5 transfers) the Artwork pattern can't hold
- Display Order removal keeps the beneficiary `sortIndex` column — only the drag-reorder UI is removed
- Carry-over (advisory): Nyquist validation coverage is `partial`/`missing` across v4.0 phases — backfill with `/gsd-validate-phase {N}` independent of milestone boundaries

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
*Last updated: 2026-05-21 after v5.0 milestone start*
