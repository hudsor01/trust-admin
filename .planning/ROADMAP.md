# Roadmap: Trust Admin

## Overview

Trust administration application for managing the Hudson Living Trust. Systematically building out features for estate settlement and ongoing trust administration.

## Milestones

- ✅ **v1.0 Neon Platform Integration** - Phases 1-6 (shipped 2026-01-23)
- ✅ **v2.0 Public Inventory Form** - Phases 7-8 (shipped 2026-01-22)
- ✅ **v3.0 Email/Password Auth Migration** - Phases 9-14 (shipped 2026-02-22)
- 🚧 **v4.0 Production Hardening & Completeness** - Phases 15-27 (in progress; phases 24-27 close v4.0 audit gaps)

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

### v4.0 Production Hardening & Completeness

- [x] **Phase 15: auth-session-security** - Harden auth cookie, admin email validation, session revocation, input validation (completed 2026-03-09)
- [x] **Phase 16: api-infrastructure-security** - Audit log RLS, inventory upload migration, proxy fix, timing-safe access codes (completed 2026-03-09)
- [x] **Phase 17: dashboard-accounting-performance** - SQL aggregation, server-side pagination, portal prefetch, dashboard cleanup (completed 2026-03-09)
- [x] **Phase 18: data-integrity-correctness** - Auto-classification enforcement, payment math, empty update rejection, API migration (completed 2026-03-09)
- [x] **Phase 19: missing-asset-uis** - Admin pages for artwork, personal property, insurance; dashboard totals fix (completed 2026-03-09)
- [x] **Phase 20: beneficiary-distribution-features** - Portal HEMS history, beneficiary tax fields, distribution compliance, HEMS cancel (completed 2026-03-10)
- [x] **Phase 21: admin-feature-completeness** - Accounting reconciliation, contact professional fields, trustee editing (completed 2026-03-11)
- [x] **Phase 22: code-quality-cleanup** - Dead code removal, entityId pattern, type guards, structured logging, dialog refactor (completed 2026-03-11)

## Phase Details

### Phase 15: auth-session-security
**Goal**: Auth flows fail-safe on misconfiguration and revoke compromised sessions after password changes
**Depends on**: Nothing (highest-risk security fixes, first phase)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-05, SEC-06
**Success Criteria** (what must be TRUE):
  1. App refuses to start if NEON_AUTH_COOKIE_SECRET is missing from environment
  2. ADMIN_EMAIL is sourced from validated env module everywhere -- empty string cannot grant admin access
  3. After a password reset (both API route and admin-initiated), all prior sessions for that user are invalidated
  4. Reset-password route rejects malformed tokens and passwords exceeding 128 characters
  5. /api/e2e/setup requires a pre-shared secret header and does not return internal IDs or credentials
**Plans**: 2 plans

Plans:
- [ ] 15-01-PLAN.md -- Env validation hardening, ADMIN_EMAIL centralization, reset-password input validation, session revocation
- [ ] 15-02-PLAN.md -- E2E setup route secret header and response stripping

### Phase 16: api-infrastructure-security
**Goal**: API endpoints enforce proper authentication, audit log is tamper-proof, and inventory uploads persist correctly on Vercel
**Depends on**: Phase 15
**Requirements**: SEC-04, SEC-07, SEC-08, SEC-09
**Success Criteria** (what must be TRUE):
  1. activity_log rows cannot be updated or deleted by any user; INSERT is restricted to the authenticated user's own userId
  2. Inventory photo uploads use UploadThing and persist across deployments (no filesystem writes)
  3. /api/inventory routes require authentication (removed from proxy publicPaths) and base64 payloads are capped at 10MB
  4. INVENTORY_ACCESS_CODE comparison uses constant-time equality and locks out after repeated failures
**Plans**: 2 plans

Plans:
- [ ] 16-01-PLAN.md -- Immutable activity_log RLS, proxy publicPaths hardening, base64 size cap
- [ ] 16-02-PLAN.md -- Timing-safe access code comparison with lockout, UploadThing upload migration

### Phase 17: dashboard-accounting-performance
**Goal**: Dashboard and accounting pages load efficiently regardless of data volume; portal eliminates client-side session waterfall
**Depends on**: Phase 15
**Requirements**: PERF-01, PERF-02, PERF-04, CLEAN-05, CLEAN-10
**Success Criteria** (what must be TRUE):
  1. Dashboard summary totals are computed via SQL SUM aggregation -- no unbounded row fetches to the browser
  2. Accounting page uses server-side paginated query with filtering -- client no longer downloads 500 rows
  3. Portal beneficiary data is server-prefetched with HydrationBoundary -- no client-side session-then-fetch waterfall
  4. DashboardClient filter calls are memoized; redundant entity.byId and beneficiary.byId fetches are removed
  5. Unused computed totals (_totalBankAccounts etc.) are deleted from DashboardClient
**Plans**: 3 plans

Plans:
- [ ] 17-01-PLAN.md -- Dashboard SQL aggregation, entity.list cache, dead code cleanup
- [ ] 17-02-PLAN.md -- Accounting server-side pagination with entryType filtering
- [ ] 17-03-PLAN.md -- Portal server-prefetch with HydrationBoundary

### Phase 18: data-integrity-correctness
**Goal**: Financial calculations are correct, data mutations are validated, and deprecated APIs are fully retired
**Depends on**: Phase 15
**Requirements**: CORR-01, CORR-02, CORR-03, CORR-04, CORR-05, PERF-03, PERF-05
**Success Criteria** (what must be TRUE):
  1. All accounting entries (including manual admin entries) go through createEntry which auto-classifies isPrincipal per Texas Property Code -- raw create endpoint is removed
  2. recordLiabilityPayment correctly handles "0.00" principal portions and null values without treating them as falsy
  3. Update mutations reject empty payloads (no fields set) with a validation error instead of executing a no-op UPDATE
  4. listProvisionedUsers is fully removed; all user listing flows use listAllUsers exclusively
  5. password_reset_token table has an email index, limits one unexpired token per email, and cleans up expired tokens on insert
  6. recalculateBeneficiaryShares uses a single bulk UPDATE instead of N sequential statements
  7. listAllUsers fetches profiles and beneficiaries in parallel via Promise.all
**Plans**: 3 plans

Plans:
- [ ] 18-01-PLAN.md -- Financial calculation fixes: nullish handling, bulk UPDATE, accounting entry centralization
- [ ] 18-02-PLAN.md -- Deprecated API migration: remove listProvisionedUsers, parallelize listAllUsers
- [ ] 18-03-PLAN.md -- Validation hardening: non-empty update schemas, password reset token lifecycle

### Phase 19: missing-asset-uis
**Goal**: Admin can manage all asset types through dedicated pages; dashboard reflects complete estate value
**Depends on**: Phase 17 (dashboard totals depend on dashboard performance work)
**Requirements**: FEAT-01, FEAT-02, FEAT-03, FEAT-04
**Success Criteria** (what must be TRUE):
  1. Admin can browse, create, edit, and delete artwork assets from a dedicated /artwork page
  2. Admin can browse, create, edit, and delete personal property assets from a dedicated /personal-property page
  3. Admin can browse, create, edit, and delete insurance policies from a dedicated /insurance page
  4. Dashboard total assets sum includes artwork, personal property, and insurance policy values
**Plans**: 3 plans

Plans:
- [ ] 19-01-PLAN.md -- Shared infrastructure (routers, form defaults, type casts, sidebar) + artwork page
- [ ] 19-02-PLAN.md -- Personal property page with category enum support
- [ ] 19-03-PLAN.md -- Insurance page (no dodValue/transferStatus) + dashboard totals fix

### Phase 20: beneficiary-distribution-features
**Goal**: Beneficiaries can track their HEMS requests; admin has full tax compliance and cancellation controls on distributions
**Depends on**: Phase 18 (depends on corrected accounting/distribution logic)
**Requirements**: FEAT-05, FEAT-06, FEAT-07, FEAT-08
**Success Criteria** (what must be TRUE):
  1. Beneficiary portal displays HEMS request history with current status for each request
  2. Admin can edit beneficiary tax fields (taxId) and per-beneficiary withdrawal ages/percentages
  3. Admin can mark distributions as tax-reported and toggle 1099-issued status
  4. HEMS requests can be cancelled by admin (any status) or beneficiary (while PENDING)
**Plans**: 2 plans

Plans:
- [ ] 20-01-PLAN.md -- Portal HEMS history card with status badges, beneficiary cancel server action
- [ ] 20-02-PLAN.md -- Admin beneficiary tax fields, distribution tax toggles, HEMS cancel procedure

### Phase 21: admin-feature-completeness
**Goal**: Remaining admin feature stubs are functional -- accounting reconciliation, professional contact fields, and trustee editing
**Depends on**: Phase 18 (accounting correctness must be in place before reconciliation)
**Requirements**: FEAT-09, FEAT-10, FEAT-11
**Success Criteria** (what must be TRUE):
  1. Admin can mark accounting entries as reconciled with a date; reconciled entries are visually distinct
  2. Contact forms expose licenseNo and barNo fields for attorney and CPA contact types
  3. Admin can edit trustee records including coTrusteeId and contactId fields
**Plans**: 1 plan

Plans:
- [ ] 21-01-PLAN.md -- Accounting reconciliation toggle, contact professional fields, trustee co-trustee/contact editing

### Phase 22: code-quality-cleanup
**Goal**: Dead code is removed, patterns are consistent, and error handling follows structured conventions
**Depends on**: Phase 18 (entityId pattern fix and deprecated API removal must land first)
**Requirements**: CLEAN-01, CLEAN-02, CLEAN-03, CLEAN-04, CLEAN-06, CLEAN-07, CLEAN-08, CLEAN-09
**Success Criteria** (what must be TRUE):
  1. db/queries.ts contains no unused CRUD function exports (approximately 50 functions removed)
  2. src/lib/date-utils.ts is deleted and date-fns is removed from dependencies (if unused elsewhere)
  3. All admin client components use entity from query cache instead of hardcoded entityId=1
  4. type-utils.ts identity cast functions are replaced with runtime-validating type guards that throw on invalid input
  5. TxSql type has a single shared definition exported from db/index.ts (duplicate in contact.ts removed)
  6. Auth route error handling uses structured logger instead of console.error; inventory analyze route returns generic 500 without leaking exception details
  7. BeneficiariesClient dialog state is encapsulated inside BeneficiaryDialog component
**Plans**: 3 plans

Plans:
- [ ] 22-01-PLAN.md -- Dead code removal from db/queries.ts, date-utils.ts deletion, TxSql consolidation
- [ ] 22-02-PLAN.md -- entityId cache pattern in admin client components, structured logging in auth routes, analyze route error fix
- [ ] 22-03-PLAN.md -- Runtime-validating type guards, BeneficiaryDialog state encapsulation

## Progress

**Execution Order:**
Phases execute in numeric order: 15 -> 16 -> 17 -> 18 -> 19 -> 20 -> 21 -> 22
(Phases 16, 17, 18 can execute in parallel after Phase 15.)

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1. serverless-driver | v1.0 | 1/1 | Complete | 2026-01-23 |
| 2. vercel-preview-branching | v1.0 | 1/1 | Complete (manual) | 2026-01-23 |
| 3. connection-pooling | v1.0 | 1/1 | Complete | 2026-01-23 |
| 4. pg-cron-jobs | v1.0 | 1/1 | Complete (skipped) | 2026-01-23 |
| 5. time-travel-queries | v1.0 | 1/1 | Complete | 2026-01-23 |
| 6. autoscaling-optimization | v1.0 | 1/1 | Complete (manual) | 2026-01-23 |
| 7. public-inventory-form | v2.0 | 1/1 | Complete | 2026-01-22 |
| 8. admin-inventory-queue | v2.0 | 1/1 | Complete | 2026-01-22 |
| 9. fix-role-mismatch | v3.0 | 1/1 | Complete | 2026-01-30 |
| 10. enable-email-password | v3.0 | 1/1 | Complete | 2026-01-31 |
| 11. admin-user-provisioning | v3.0 | 2/2 | Complete | 2026-02-11 |
| 12. forced-password-change | v3.0 | 1/1 | Complete | 2026-02-22 |
| 13. beneficiary-data-isolation | v3.0 | 1/1 | Complete | 2026-02-22 |
| 14. codebase-cleanup | v3.0 | 1/1 | Complete | 2026-02-22 |
| 15. auth-session-security | v4.0 | 2/2 | Complete | 2026-03-09 |
| 16. api-infrastructure-security | v4.0 | 2/2 | Complete | 2026-03-09 |
| 17. dashboard-accounting-performance | v4.0 | 3/3 | Complete | 2026-03-09 |
| 18. data-integrity-correctness | v4.0 | 3/3 | Complete | 2026-03-09 |
| 19. missing-asset-uis | v4.0 | 3/3 | Complete | 2026-03-09 |
| 20. beneficiary-distribution-features | v4.0 | 2/2 | Complete | 2026-03-10 |
| 21. admin-feature-completeness | v4.0 | 1/1 | Complete | 2026-03-11 |
| 22. code-quality-cleanup | v4.0 | 3/3 | Complete | 2026-03-11 |
| 23. shadcn-registry-adoption-and-dashboard-ux-revamp | v4.0 | 5/5 | Complete | 2026-05-20 |
| 24. test-suite-and-lint-hygiene | v4.0 | 0/0 | Complete (verified pre-resolved) | 2026-05-20 |
| 25. reorder-ordering-and-dashboard-data-wiring | v4.0 | TBD | Planned | - |
| 26. schema-completeness-for-kpi-data | v4.0 | TBD | Planned | - |
| 27. datatable-rollout-theme-token-and-doc-accuracy | v4.0 | TBD | Planned | - |

### Phase 23: Shadcn registry adoption and dashboard UX revamp

**Goal:** Adopt the @kibo-ui + @diceui shadcn registries to extend the 39-primitive shadcn/ui foundation; refactor admin dashboard UX page-by-page using KPI strips, kanban (HEMS), timeline+heatmap (activity-log), gantt (liabilities + beneficiaries), donut charts, DataTable bulk actions + CSV export, settings card groupings, and sortable trustee+beneficiary lists. Outcome: easier to navigate, easier to look at, easier to use.
**Requirements**: TBD (no explicit requirement IDs; coverage tracked via plan must_haves + UI-SPEC §Component Specifications)
**Depends on:** Phase 22
**Plans:** 5/5 plans complete

Plans:
- [x] 23-01-foundation-PLAN.md — components.json registries wiring (Kibo + Dice; Origin UI deferred per UI-SPEC rev 1); install 5 Dice primitives + Kibo dropzone + shadcn-official context-menu; hand-roll Kbd; patch SummaryCard (text-success/destructive + accessory prop + tabular-nums); build PageHeader + KpiStrip compositions ✅ 2026-05-19
- [x] 23-02-hems-kanban-and-activity-log-PLAN.md — add trpc.hemsRequest.markDistributed; install @kibo-ui/kanban + @kibo-ui/contribution-graph; hand-roll ActivityTimeline; build HemsQueueBoard (drag PENDING→APPROVED with ConfirmDialog, APPROVED→DISTRIBUTED without); build ActivityHeatmap (chart-2 opacity scale, day-click→timeline filter); wire Tabs into /hems-queue and /activity-log ✅ 2026-05-20
- [x] 23-03-liabilities-beneficiaries-kpi-rollout-PLAN.md — add trpc.liability.payoffProjections batched query; install @kibo-ui/gantt + @kibo-ui/avatar-stack; build LiabilityKpiStrip (sumStrings + invertDelta) + LiabilityGantt + DebtToEquityDonut; build BeneficiaryShareDonuts (chart-1..5 cycling + greyed-out empty state) + BeneficiaryAvatarStack + WithdrawalMilestoneGantt; roll KpiStrip onto 11 admin pages (10 list + /dashboard) per UI-SPEC §2 per-page columns table ✅ 2026-05-20
- [x] 23-04-datatable-and-settings-polish-PLAN.md — extend DataTable with bulkActions/exportable/getRowDetail props (ConfirmDialog for destructive, getFilteredRowModel+getVisibleLeafColumns for CSV, /accounts as first row-expansion consumer); install Dice sortable; build PreferenceRow; refactor /settings into 4 Card groups (Trust info/Notifications/Roles&access/Inventory access); [BLOCKING] Drizzle migration 0012 (beneficiary.sortIndex + composite indexes, camelCase columns, bun run db:deploy); add trpc.trustee.reorder + trpc.beneficiary.reorder mutations; build TrusteeSortableList + BeneficiarySortableList consumers ✅ 2026-05-20
- [x] 23-05-asset-wizard-PLAN.md — install @diceui/stepper, extend useResourceForm with backwards-compatible wizard state, apply 3-step wizard (Type+Name / Valuation / Ownership) to 7 asset-creation dialogs; payload-shape parity preserved (no tRPC contract change). Was deferred per UI-SPEC Note 13; activated 2026-05-20 after user reasserted. ✅ 2026-05-20

### Phase 24: Test suite and lint hygiene — COMPLETE (verified pre-resolved 2026-05-20)

**Goal:** Restore genuinely-green quality gates so no commit needs a hook bypass — fix the inventory-analysis test failures, biome formatting issues, `useExhaustiveDependencies` warnings, Kibo gantt suppressions, and the phase-16 `verifyAccess.ts` build blocker.
**Requirements:** Gap closure (no new REQ-IDs)
**Depends on:** Phase 23
**Gap Closure:** v4.0-MILESTONE-AUDIT tech_debt for phases 16, 17, 18, 22, 23 (test/lint/build hygiene)

**Status:** Closed without a plan — when phase planning began (2026-05-20) the entire scope was verified already-resolved against the live codebase on `main`. The audit aggregated these items from phase 17/22 SUMMARYs (March 2026); they were all fixed over the course of phases 17-23. Verification at planning time:
- Full unit suite: **999 pass / 0 fail** across 72 files — the inventory-analysis tests pass (`inventory-analysis.test.ts` 15/15).
- `bun run lint` (biome): clean, 0 findings — the test-file formatting issues and the 6 `useExhaustiveDependencies` warnings were resolved during phase 23's code-review pass.
- No `biome-ignore` suppressions in `src/components/kibo-ui/`.
- `verifyAccess.ts` build blocker resolved — its only export is `export async function verifyAccessCode` (no non-async exports from a `'use server'` file).

No plan or execution was needed. Numbering preserved (phases 25-27 unchanged).

Plans:
- [x] None — scope verified already-resolved by phases 17-23 ✅ 2026-05-20

### Phase 25: Reorder ordering and dashboard data wiring

**Goal:** Make persisted sort order authoritative app-wide and finish the dashboard data wiring. Add `ORDER BY` to `beneficiary.list`, `getBeneficiariesWithDistributions`, and `trustee.list` so the migration-0012 composite indexes are used and reorder is honored beyond the SortableList cards (INT-G2); build `trpc.dashboard.activityCounts` and light up the suppressed `/accounts` 30-day sparkline; wire `@next/bundle-analyzer` into `next.config.js` so cumulative bundle delta is measurable.
**Requirements:** Gap closure (INT-G2)
**Depends on:** Phase 23
**Gap Closure:** Closes v4.0-MILESTONE-AUDIT INT-G2 + phase-23 tech_debt (activityCounts query, bundle analyzer)
**Plans:** TBD (run /gsd-plan-phase 25 to break down)

Plans:
- [ ] TBD (run /gsd-plan-phase 25 to break down)

### Phase 26: Schema completeness for KPI data

**Goal:** Replace every placeholder KPI column with real data and enable account-to-liability linkage. Drizzle migrations to add a `specific_bequest` value column (bequest "Total value" KPI), a personal-property `insured` field (artwork "Insured count" KPI), surface `transferStatus` through `asset.listAll` (assets "Transfer-status progress" KPI), and add `liability.bankAccountId` / `liability.investmentAccountId` FKs so the `/accounts` row-detail shows genuinely linked liabilities instead of account metadata.
**Requirements:** Gap closure (no new REQ-IDs)
**Depends on:** Phase 23
**Gap Closure:** Closes v4.0-MILESTONE-AUDIT phase-23 tech_debt (placeholder KPI columns, /accounts getRowDetail override)
**Plans:** TBD (run /gsd-plan-phase 26 to break down)

Plans:
- [ ] TBD (run /gsd-plan-phase 26 to break down)

### Phase 27: DataTable rollout, theme token, and doc accuracy

**Goal:** Finish the phase-23 UX rollout and correct documentation drift. Extend the DataTable `bulkActions` / `exportable` / `getRowDetail` enhancements to the remaining 16 admin DataTables; add a dedicated `--milestone` OKLCH token to `globals.css` and repoint the milestone/withdrawal alerts off the borrowed `accent` token; amend REQUIREMENTS.md SEC-08 to record that `/api/inventory` was intentionally restored to proxy publicPaths (route-level auth carries the requirement — INT-G1); refresh the stale 23-VERIFICATION.md frontmatter that still lists resolved code-review warnings as open.
**Requirements:** Gap closure (INT-G1)
**Depends on:** Phase 23
**Gap Closure:** Closes v4.0-MILESTONE-AUDIT INT-G1 + phase-23 tech_debt (DataTable rollout, milestone token, doc hygiene)
**Plans:** TBD (run /gsd-plan-phase 27 to break down)

Plans:
- [ ] TBD (run /gsd-plan-phase 27 to break down)
