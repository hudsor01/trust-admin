# Roadmap: Trust Admin

## Overview

Trust administration application for managing the Hudson Living Trust. Systematically building out features for estate settlement and ongoing trust administration.

## Milestones

- ✅ **v1.0 Neon Platform Integration** — Phases 1-6 (shipped 2026-01-23)
- ✅ **v2.0 Public Inventory Form** — Phases 7-8 (shipped 2026-01-22)
- ✅ **v3.0 Email/Password Auth Migration** — Phases 9-14 (shipped 2026-02-22)
- ✅ **v4.0 Production Hardening & Completeness** — Phases 15-27 (shipped 2026-05-21)
- 🚧 **v5.0 Firearms Tracking & Beneficiary UX Refinement** — Phases 28-33 (in progress)

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

### v5.0 Firearms Tracking & Beneficiary UX Refinement

- [x] **Phase 28: firearm-schema-and-migration** - Add `firearm` table, 5 enums, RLS policies, and document/valuation FK extensions to Postgres (completed 2026-05-21)
- [x] **Phase 29: firearm-trpc-router** - Implement `firearmRouter` with list/byId/create/update/delete (all adminProcedure, entityId-gated) (completed 2026-05-21)
- [ ] **Phase 30: firearms-admin-page** - Dedicated `/firearms` admin page with DataTable, KPI strip, create/edit form, and NFA-conditional fields
- [ ] **Phase 31: asset-aggregator-integration** - Wire `firearm` into `asset.ts:listAll` and `dashboard.ts:summary` so totals and allocation charts include firearms
- [ ] **Phase 32: sidebar-nav-alphabetization** - Reorder Assets sub-nav to alphabetical and add Firearms link
- [ ] **Phase 33: beneficiary-ux-cleanup** - Remove avatar-stack card, Display Order section, and withdrawal-milestone gantt from Beneficiaries page

## Phase Details

### Phase 28: firearm-schema-and-migration
**Goal**: The `firearm` table exists in Postgres with all regulatory fields, RLS isolation, and FK hooks for document and valuation attachment.
**Depends on**: Phase 27 (shipped)
**Requirements**: FIRE-01, FIRE-02, FIRE-03, FIRE-04, FIRE-05, FIRE-08, FIRE-09
**Success Criteria** (what must be TRUE):
  1. `db:deploy` applies the migration without error; `\d firearm` shows all columns including `serialNumber`, `nfaClass`, `nfaTransferStatus`, `condition`, and `acquisitionCost`
  2. A unique-index violation is raised when inserting two firearm rows with the same `serialNumber` for the same entity
  3. `document` and `valuation` tables accept a `firearmId` FK and their single-owner CHECK constraints still pass (inserting a document with two non-null asset FKs is rejected)
  4. `db/validation.ts` exports `insertFirearmSchema` / `updateFirearmSchema` with correct types; `bun run typecheck` passes with 0 errors
  5. The `nfaTransferStatus` enum has exactly the values `NOT_FILED`, `FILED`, `APPROVED`; the generic `transferStatus` enum is unchanged
**Plans**: 2 plans
- [x] 28-01-PLAN.md — Schema, relations, and Zod validation: 5 firearm enums, the `firearm` pgTable with RLS, `document`/`valuation` `firearmId` FK columns + updated CHECK constraints, and `insert/select/updateFirearmSchema` + unit test
- [x] 28-02-PLAN.md — Migration: generate + [BLOCKING] hand-audit `0014_*.sql`, apply via `db:deploy` with DB introspection verification, and the idempotent test-branch sync script

### Phase 29: firearm-trpc-router
**Goal**: A complete tRPC router for firearms is registered and typechecks cleanly, ready for UI consumption.
**Depends on**: Phase 28
**Requirements**: (none — dependency phase enabling Phase 30)
**Success Criteria** (what must be TRUE):
  1. `trpc.firearm.list.useQuery({ entityId })` returns an array of firearm rows scoped to the entity
  2. `trpc.firearm.create.useMutation()` rejects a duplicate serial number with `TRPCError({ code: 'CONFLICT' })`
  3. `trpc.firearm.byId` throws `NOT_FOUND` when the requested id does not belong to the specified entity
  4. All five procedures (`list`, `byId`, `create`, `update`, `delete`) require `adminProcedure` — a beneficiary JWT cannot invoke them
  5. `bun run typecheck` passes with 0 errors after router registration in `router.ts`
**Plans**: 1 plan
- [x] 29-01-PLAN.md — Firearm tRPC router: export `insertFirearmSchemaBase`, create `firearmRouter` (6 procedures + serial-conflict predicate + NFA guard), register in appRouter, and add integration tests for SC-1..SC-4 + setNfaTransferStatus + D-03 regression

### Phase 30: firearms-admin-page
**Goal**: Admin can fully manage firearm records — create, view, edit, delete, sort, filter, and export — from a dedicated `/firearms` page.
**Depends on**: Phase 29
**Requirements**: FIRE-06, FIRE-07
**Success Criteria** (what must be TRUE):
  1. Admin navigates to `/firearms` and sees a DataTable listing all firearm records for the selected entity
  2. Admin can create a new firearm record using the create form; the row appears in the table on success
  3. Admin can edit any field of an existing firearm record; the table row updates on save
  4. Admin can delete a firearm record; the row is removed and a success toast is shown
  5. Admin can sort the table by any column, filter rows by text, and download a CSV of the current view
**Plans**: TBD
**UI hint**: yes

### Phase 31: asset-aggregator-integration
**Goal**: Firearm values appear in the dashboard KPIs and the `/assets` unified view alongside the other 7 asset types.
**Depends on**: Phase 29
**Requirements**: ASSET-01, ASSET-02
**Success Criteria** (what must be TRUE):
  1. After adding a firearm record with a non-zero `dodValue`, the dashboard "Total Assets" KPI increases by that amount
  2. The dashboard allocation pie chart includes a "Firearms" slice when at least one firearm record exists
  3. Firearm rows appear in the `/assets` unified view with an `href` linking to `/firearms`
  4. Removing all firearm records causes the Firearms slice to disappear from the pie chart and the "Total Assets" KPI to decrease accordingly
**Plans**: TBD
**UI hint**: yes

### Phase 32: sidebar-nav-alphabetization
**Goal**: The Assets navigation group lists all 7 (now 8) asset types in alphabetical order, and Firearms is reachable from the sidebar.
**Depends on**: Phase 30
**Requirements**: ASSET-03, ASSET-04
**Success Criteria** (what must be TRUE):
  1. The Assets dropdown sub-items appear in the order: Accounts, Artwork, Firearms, Insurance, Personal Property, Properties, Vehicles
  2. Clicking "Firearms" in the sidebar navigates to `/firearms`
  3. The `/firearms` link is prefetched alongside the other asset links in the sidebar
**Plans**: TBD
**UI hint**: yes

### Phase 33: beneficiary-ux-cleanup
**Goal**: The Beneficiaries page shows only the table and share-donut charts; redundant avatar, display-order, and gantt sections are gone without affecting sort order.
**Depends on**: Phase 27 (shipped) — fully independent of firearms phases
**Requirements**: BENE-01, BENE-02, BENE-03, BENE-04
**Success Criteria** (what must be TRUE):
  1. The Beneficiaries page renders without an avatar-stack card
  2. The Beneficiaries page renders without a "Display Order" drag-to-reorder section
  3. The Beneficiaries page renders without a withdrawal-milestone gantt chart
  4. The beneficiary list in the table and in all other app views (portal, HEMS queue, distributions) is ordered by `sortIndex` — identical to the order before this phase
**Plans**: TBD
**UI hint**: yes

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 28. firearm-schema-and-migration | 2/2 | Complete    | 2026-05-21 |
| 29. firearm-trpc-router | 1/1 | Complete    | 2026-05-21 |
| 30. firearms-admin-page | 0/? | Not started | - |
| 31. asset-aggregator-integration | 0/? | Not started | - |
| 32. sidebar-nav-alphabetization | 0/? | Not started | - |
| 33. beneficiary-ux-cleanup | 0/? | Not started | - |
