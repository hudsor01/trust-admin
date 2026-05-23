# Milestones

## v5.0 Firearms Tracking & Beneficiary UX Refinement (Shipped: 2026-05-22)

**Phases completed:** 6 phases, 7 plans, 17 v1 requirements

**Key accomplishments:**

- New `firearm` Drizzle table (8th asset class) with all regulatory fields — serial number, NFA classification, FFL/ATF Form 5 transfer status, condition grade, acquisition cost — plus RLS isolation, `document.firearmId` + `valuation.firearmId` FKs with updated single-owner CHECK constraints, and migration 0014 applied to live DB + test branch.
- Complete `firearmRouter` tRPC (6 procedures: list, byId, create, update, delete, setNfaTransferStatus) with serial-number CONFLICT predicate, NFA-class guard, and adminProcedure gating; integration tests for every success criterion.
- Dedicated `/firearms` admin page: 3-step `FirearmDialog` wizard with NFA-conditional fields, DataTable (9 visible + 21 hidden columns) with location excluded from CSV, NFA row-detail panel, and `NfaStatusDialog` as the CQS-style single path to mutate `nfaTransferStatus`.
- Firearm values surfaced through `asset.listAll` + `dashboard.summary` aggregators — dashboard "Total Assets" KPI + allocation pie chart now include firearms; firearms appear in the `/assets` unified view with deep-link to `/firearms`.
- Assets sidebar group alphabetized to 7 items [Accounts, Artwork, Firearms, Insurance, Personal Property, Properties, Vehicles] with hover-prefetch wired for the new Firearms slot via `utils.firearm.list.prefetch` + `utils.entity.list.prefetch`.
- Beneficiaries page pruned from 9 sections to 5 (PageHeader → KPI strip → ShareDonuts → Table → dialogs); avatar-stack card, "Display Order" drag-reorder section, and withdrawal-milestone Gantt chart removed; `beneficiary.reorder` adminProcedure and its test deleted.
- KpiStrip skeleton + loaded grid class now derive from `data.length` (eliminates the first-render layout jump when a strip exceeds 4 tiles); new 5th KPI "Lifetime distributions" added to /beneficiaries between "Total share %" and "Distributions YTD".
- Sentry DEP0205 deprecation suppressed via `NODE_OPTIONS='--disable-warning=DEP0205'` on `dev`/`build`/`build:analyze`/`start` scripts — removable once `@sentry/node-core` ships the `module.registerHooks()` migration.
- `next-env.d.ts` regenerated for Next.js 16 dev types path (`.next/types/` → `.next/dev/types/`) to eliminate spurious working-tree dirty-state on fresh clones.

See [`milestones/v5.0-ROADMAP.md`](milestones/v5.0-ROADMAP.md) for full phase details and [`milestones/v5.0-REQUIREMENTS.md`](milestones/v5.0-REQUIREMENTS.md) for the requirements register.

---

## v4.0 Production Hardening & Completeness (Shipped: 2026-05-21)

**Phases completed:** 13 phases, 32 plans, 71 tasks

**Key accomplishments:**

- Required cookie secret with min-length validation, centralized ADMIN_EMAIL imports, Zod-validated reset-password input, and session revocation on all password-change flows
- Pre-shared secret header guard on /api/e2e/setup with response ID stripping and sanitized errors
- Immutable activity_log via RLS (SELECT + INSERT with changedBy enforcement), proxy route hardening, and 10MB base64 size cap on inventory analyze
- Timing-safe access code comparison with IP lockout, and UploadThing-based upload replacing broken filesystem writes
- SQL SUM aggregation for dashboard totals, bounded accounting queries, and dead code cleanup
- Accounting page switched from 500-row client-side pagination to 50-row server-side paginated queries with entryType filtering and aggregated tab badge counts
- Portal page converted to Server Component with HydrationBoundary prefetch -- eliminates session-then-fetch waterfall for beneficiary data loading
- Fixed nullish handling in liability payment splits (principalPortion="0.00" no longer triggers auto-calculation) and converted beneficiary share redistribution to single bulk UPDATE
- Removed listProvisionedUsers, unified user listing to adminProcedure listAllUsers with parallel DB queries
- Non-empty validation on all 26 update schemas via Zod .refine() plus password reset token dedup with email index
- Three tRPC routers for artwork/personal-property/insurance, shared form defaults and type casts, sidebar navigation, and complete artwork CRUD page at /artwork
- Personal property admin page with full CRUD, 6-category select, inline editing for category/location/DOD value/status/transfer
- Insurance policy CRUD page with coverage/premium/frequency fields, plus dashboard totals extended to all 7 asset types
- HEMS request history card with status badges, category labels, and cancel-with-confirmation for PENDING requests in beneficiary portal
- Admin HEMS cancel from queue, beneficiary taxId editing with masked display, per-beneficiary withdrawal ages, and distribution tax compliance toggles
- Accounting reconciliation toggles with Switch/date display, contact licenseNo/barNo conditional fields, and trustee co-trustee/contact dropdown editing
- Removed ~110 dead exports from db/queries.ts, deleted unused date-utils.ts/date-fns, consolidated TxSql type into single shared export
- Replaced hardcoded entityId=1 with tRPC entity cache in all 17 admin client components; structured logger in auth routes; generic 500 in analyze route
- Runtime-validating type guards via validateEnum<T> pattern, BeneficiaryDialog encapsulated from 15 props down to 5
- Two-registry shadcn adoption (@kibo-ui + @diceui), 6 primitives installed + 1 hand-rolled Kbd, SummaryCard rebuilt with theme-safe tokens + accessory slot, and PageHeader + KpiStrip compositions ready for 10+ dashboards.
- Three-column drag-to-transition HEMS kanban (Pending / Approved / Distributed) wired to a new markDistributed mutation + an activity-log Timeline (day-grouped, action-colored dots, JSON-diff expand) + 30-day chart-2 opacity heatmap with day-click filter that auto-jumps back to the timeline.
- Wave 2 PR-B / Wave 3 PR-3: payoffProjections batched query, Kibo gantt + avatar-stack primitives, 6 new page consumers (LiabilityKpiStrip + LiabilityGantt + DebtToEquityDonut + BeneficiaryShareDonuts + BeneficiaryAvatarStack + WithdrawalMilestoneGantt), and KpiStrip + PageHeader rolled onto 11 admin pages per UI-SPEC §2 revision 1.
- 1. [Rule 3 - Blocking] Test branch missing the sortIndex column
- PR-E.
- Persisted reorder is now honored by every list query (INT-G2), the /accounts 30d-activity sparkline runs on a real entity-scoped activity_log series via the new dashboard.activityCounts tRPC query, and @next/bundle-analyzer is wired so build:analyze emits measurable bundle reports.
- Added four KPI-enabling columns (specific_bequest.estimatedValue, personal_property.insured, liability.bankAccountId + investmentAccountId) in one Drizzle migration (0013), applied to the live DB and the test branch, with FK relations and validation wired.
- Wired the three KPI-enabling columns from plan 26-01 through the routers, forms, and KPI strips — adding cross-entity FK validation on the liability router, real `estimatedValue` / `insured` KPI math on /bequests and /artwork, and genuine linked-liabilities row-detail on /accounts.
- Surfaced the real `transferStatus` field through the `asset.listAll` aggregator envelope and recomputed the /assets "Transfer-status progress" KPI from it, replacing the `status === 'ACTIVE'` approximation.
- A reusable `selectColumn()` checkbox-column factory unblocks the bulk-action rollout, the CSV exporter now drops the UI-only select column, and two v4.0-audit doc-drift gaps (SEC-08 / stale 23-VERIFICATION follow-ups) are closed.
- Dedicated `--milestone` OKLCH violet token (hue 295, light + dark) replacing two UI elements' borrowed `accent` neutral — restores the intended violet semantics for the dashboard upcoming-milestones alert and the HEMS withdrawal badge.
- CSV export now lands on all five asset-domain admin tables and row-selection bulk delete lands on Vehicles, Properties, Personal Property, and Insurance — each bulk delete runs a sequential entityId-scoped loop gated by ConfirmDialog and reports partial failure with a user-visible toast.
- CSV export now lands on every remaining admin DataTable — Liabilities, Accounting, the HEMS-queue table tab, HEMS recent distributions, the all-distributions history, both withdrawal tables, and Users — and row-selection bulk delete lands on the two financial list tables (Liabilities, Accounting) with a sequential entityId-scoped loop gated by ConfirmDialog and a user-visible partial-failure toast. This completes the phase-23 DataTable-enhancement rollout across all admin tables.

---
