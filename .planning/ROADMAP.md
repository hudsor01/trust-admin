# Roadmap: Trust Admin

## Overview

Trust administration application for managing the Hudson Living Trust. Systematically building out features for estate settlement and ongoing trust administration.

## Milestones

- ✅ **v1.0 Neon Platform Integration** — Phases 1-6 (shipped 2026-01-23)
- ✅ **v2.0 Public Inventory Form** — Phases 7-8 (shipped 2026-01-22)
- ✅ **v3.0 Email/Password Auth Migration** — Phases 9-14 (shipped 2026-02-22)
- ✅ **v4.0 Production Hardening & Completeness** — Phases 15-27 (shipped 2026-05-21)
- ✅ **v5.0 Firearms Tracking & Beneficiary UX Refinement** — Phases 28-33 (shipped 2026-05-22)
- ✅ **v5.0.1 Post-v5.0 Closeout & Cleanup** — 9 PRs (#127–#135), patch milestone (shipped 2026-05-23)

## Phases

<details>
<summary>✅ v1.0 Neon Platform Integration (Phases 1-6) - SHIPPED 2026-01-23</summary>

- [x] **Phase 1: serverless-driver** - Switch from postgres.js to @neondatabase/serverless for HTTP queries
- [x] **Phase 2: vercel-preview-branching** - Enable automatic database branches for Vercel preview deployments
- [x] **Phase 3: connection-pooling** - Configure PgBouncer pooling for 10K concurrent connections
- [x] **Phase 4: pg-cron-jobs** - Add scheduled database maintenance jobs (skipped)
- [x] **Phase 5: time-travel-queries** - Enable historical data queries for audit compliance
- [x] **Phase 6: autoscaling-optimization** - Tune compute scaling for workload patterns

</details>

<details>
<summary>✅ v2.0 Public Inventory Form (Phases 7-8) - SHIPPED 2026-01-22</summary>

- [x] **Phase 7: public-inventory-form** - Public-facing form for submitting inventory items
- [x] **Phase 8: admin-inventory-queue** - Admin queue for reviewing and processing submitted inventory items

</details>

<details>
<summary>✅ v3.0 Email/Password Auth Migration (Phases 9-14) - SHIPPED 2026-02-22</summary>

- [x] **Phase 9: fix-role-mismatch** - Fix tRPC beneficiaryProcedure role check
- [x] **Phase 10: enable-email-password** - Enable email/password auth alongside magic link
- [x] **Phase 11: admin-user-provisioning** - Admin interface for creating beneficiary accounts
- [x] **Phase 12: forced-password-change** - First-login password change requirement
- [x] **Phase 13: beneficiary-data-isolation** - RLS policies for beneficiary record isolation
- [x] **Phase 14: codebase-cleanup** - Production hardening, structured logging, component tests

</details>

<details>
<summary>✅ v4.0 Production Hardening & Completeness (Phases 15-27) - SHIPPED 2026-05-21</summary>

Full phase detail archived in [`milestones/v4.0-ROADMAP.md`](milestones/v4.0-ROADMAP.md).
Audit: [`milestones/v4.0-MILESTONE-AUDIT.md`](milestones/v4.0-MILESTONE-AUDIT.md) — `passed` (13 phases, 40/40 requirements).

- [x] **Phase 15: auth-session-security** - Harden auth cookie, admin email validation, session revocation, input validation
- [x] **Phase 16: api-infrastructure-security** - Audit log RLS, inventory upload migration, proxy fix, timing-safe access codes
- [x] **Phase 17: dashboard-accounting-performance** - SQL aggregation, server-side pagination, portal prefetch
- [x] **Phase 18: data-integrity-correctness** - Auto-classification enforcement, payment math, empty-update rejection, deprecated API removal
- [x] **Phase 19: missing-asset-uis** - Admin pages for artwork, personal property, insurance; dashboard totals fix
- [x] **Phase 20: beneficiary-distribution-features** - Portal HEMS history, beneficiary tax fields, distribution compliance, HEMS cancel
- [x] **Phase 21: admin-feature-completeness** - Accounting reconciliation, contact professional fields, trustee editing
- [x] **Phase 22: code-quality-cleanup** - Dead code removal, entityId pattern, type guards, structured logging
- [x] **Phase 23: shadcn-registry-adoption-and-dashboard-ux-revamp** - Kibo/Dice registries, HEMS kanban, activity timeline+heatmap, gantt + donuts, KPI strips, DataTable enhancements, settings refresh, sortable lists, asset wizard
- [x] **Phase 24: test-suite-and-lint-hygiene** - Closed verified pre-resolved (scope already resolved by phases 17-23)
- [x] **Phase 25: reorder-ordering-and-dashboard-data-wiring** - Reorder ORDER BY (INT-G2), dashboard.activityCounts query, bundle analyzer
- [x] **Phase 26: schema-completeness-for-kpi-data** - Migration 0013 (real KPI data columns + liability-to-account FKs)
- [x] **Phase 27: datatable-rollout-theme-token-and-doc-accuracy** - DataTable rollout to 14 admin tables, --milestone token, SEC-08 doc fix (INT-G1)

</details>

<details>
<summary>✅ v5.0 Firearms Tracking & Beneficiary UX Refinement (Phases 28-33) - SHIPPED 2026-05-22</summary>

Full phase detail archived in [`milestones/v5.0-ROADMAP.md`](milestones/v5.0-ROADMAP.md).
Requirements register archived in [`milestones/v5.0-REQUIREMENTS.md`](milestones/v5.0-REQUIREMENTS.md).

- [x] **Phase 28: firearm-schema-and-migration** - `firearm` table + 5 enums + RLS + document/valuation FK extensions + migration 0014
- [x] **Phase 29: firearm-trpc-router** - `firearmRouter` (6 procedures incl. `setNfaTransferStatus` CQS mutation)
- [x] **Phase 30: firearms-admin-page** - `/firearms` page with 3-step wizard + DataTable + NFA row-detail + `NfaStatusDialog`
- [x] **Phase 31: asset-aggregator-integration** - firearm wired into `asset.listAll` + `dashboard.summary` + `/assets` view
- [x] **Phase 32: sidebar-nav-alphabetization** - alphabetized Assets sub-nav + Firearms entry with hover-prefetch
- [x] **Phase 33: beneficiary-ux-cleanup** - removed avatar-stack + Display Order + Gantt; added 5th KPI; deleted `beneficiary.reorder` mutation; KpiStrip skeleton fix

</details>
