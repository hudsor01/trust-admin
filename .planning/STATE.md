---
gsd_state_version: 1.0
milestone: v4.0
milestone_name: Production Hardening & Completeness
status: executing
stopped_at: Completed 27-04-financial-and-distribution-table-rollout-PLAN.md
last_updated: "2026-05-21T04:07:49.720Z"
last_activity: 2026-05-20
progress:
  total_phases: 13
  completed_phases: 12
  total_plans: 32
  completed_plans: 32
  percent: 100
---

# State: Trust Admin

## Current Position

Milestone: v4.0 Production Hardening & Completeness
Phase: 27
Plan: 27-04 complete (4/4) — phase 27 complete
Status: Phase complete
Last activity: 2026-05-20

Progress: [██████████] 100%

## Accumulated Context

### Key Decisions

- **userProfile.role is source of truth for tRPC authorization** (not Neon Auth native role)
- **ADMIN_EMAIL env var overrides role** -- owner email always gets admin regardless of DB state
- Neon Auth native role ("admin"/"user") used only by layout guards for routing
- RLS via `initJwtSession()` already implemented
- **Hybrid driver approach:** neon() HTTP for Drizzle, postgres.js for raw SQL
- **Two-step provisioning:** authServer.admin.createUser() -> set emailVerified=true via raw SQL -> upsert userProfile
- **emailVerified MUST be set to true** for admin-created users or sign-in returns 403
- **Neon Auth updateUser() returns 400** -- use raw SQL against neon_auth."user" instead
- **neon_auth."user" uses camelCase columns** ("emailVerified", "updatedAt", "createdAt")
- **Single login page** at /auth/sign-in with AuthView redirectTo="/"
- **Neon Auth cookie** is `__Secure-neon-auth.session_token`
- **proxy.ts at src/proxy.ts** -- Next.js 16 proxy convention
- **forcePasswordChange flag** in user_profile -- set to true when admin creates beneficiary account
- **Forgot password** uses custom flow (n8n webhook) -- Neon Auth email not used
- [v4.0] Phase structure derived from 45-finding critical review; security-first ordering
- [v4.0] Phases 16/17/18 can run in parallel after Phase 15 (no cross-dependencies)
- [v4.0] E2E setup route gated with x-e2e-secret header check against E2E_SETUP_SECRET env var (fail-closed)
- [v4.0] E2E setup response stripped to email-only -- no userId or beneficiaryId leaked
- [v4.0] Cookie secret uses z.string().trim().min(32) -- app refuses to start without valid secret
- [v4.0] ADMIN_EMAIL centralized via validated env module -- no process.env.ADMIN_EMAIL in src/server/
- [v4.0] Session revocation after password changes is best-effort (Sentry on failure, no user-facing error)
- [v4.0] Reset-password API returns generic 'Invalid input' on validation failure (no schema detail leaks)
- [v4.0] In-memory Map for IP lockout -- sufficient for single Vercel instance; no Redis needed at current scale
- [v4.0] Upload route response key changed from 'paths' to 'urls' for UploadThing migration
- [v4.0] activity_log immutable: no UPDATE/DELETE RLS, INSERT enforces changedBy = own user ID
- [v4.0] No FORCE ROW LEVEL SECURITY on activity_log -- neondb_owner must bypass for system audit
- [v4.0] RLS migration SQL applied manually (not db:push) due to Drizzle bugs with RLS policies
- [v4.0] /api/inventory removed from proxy publicPaths -- defense-in-depth with route-level auth
- [v4.0] 10MB base64 limit per image on analyze route (~7.5MB raw after base64 decoding)
- [v4.0] Portal prefetch: useSession() kept for display name only, beneficiary.me.useQuery() unconditional (layout validates auth)
- [v4.0] Portal page.tsx no dynamic export needed -- parent layout already has force-dynamic
- [v4.0] Accounting listPaginated uses entryType filter + offset/limit (page size 50, limit 1-100)
- [v4.0] Tab badge counts from totals query entryCount, not array lengths -- accurate across all pages
- [v4.0] DataTable client-side pagination disabled for accounting; custom Previous/Next controls used
- [v4.0] Dashboard totals via SQL SUM (summaryTotals procedure) -- not client-side sumStrings over all rows
- [v4.0] Dashboard accounting entries bounded to 10 per type (recentAccountingEntries) -- no unbounded fetches
- [v4.0] listAllUsers changed from ownerProcedure to adminProcedure -- read-only data safe for all admins; non-owner admins see same data without mutation controls
- [v4.0] Nullish coalescing (??) for money string fallbacks -- principalPortion="0.00" is a valid value, not falsy
- [v4.0] Bulk UPDATE with CASE/WHEN via tx.unsafe() for beneficiary share redistribution -- safe because values are DB integers and computed decimals
- [v4.0] requireAtLeastOneField() Zod .refine() on all 26 update schemas -- prevents silent no-op UPDATEs from empty payloads
- [v4.0] Password reset token dedup: invalidate existing (set usedAt) before insert, cleanup expired > 24h
- [v4.0] Asset router pattern: replicate vehicle.ts exactly (adminProcedure, entityId filter, updatedAt on write, NOT_FOUND on missing)
- [v4.0] Sidebar asset links ordered: Properties, Accounts, Vehicles, Artwork, Personal Property, Insurance, Inventory Queue
- [v4.0] Insurance policies use coverageAmount (not dodValue) as primary value metric in dashboard totals
- [v4.0] Insurance table uses ACTIVE/EXPIRED/CANCELLED status subset (not SOLD/TRANSFERRED/DISPOSED)
- [v4.0] Beneficiary cancel uses direct async function (not useActionState) -- button click not form submit
- [v4.0] HEMS status badge mapping defined locally in HemsHistoryCard -- global STATUS_VARIANTS lacks HEMS statuses
- [v4.0] Tax ID masking via helper text below field -- EditableTextCell has no displayValue prop; full value visible only in admin edit mode
- [v4.0] HEMS cancel button on all non-CANCELLED statuses with contextual warning for processed (APPROVED/DISTRIBUTED) requests
- [v4.0] Distribution tax toggles use Switch component with inline tRPC mutation to distribution.update
- [v4.0] Accounting reconciliation uses opacity-60 on description/category/flags cells (DataTable lacks rowClassName)
- [v4.0] Conditional form fields via formInstance.Subscribe selector pattern for role-dependent professional fields
- [v4.0] Nullable FK Select dropdowns use "none" sentinel value mapped to null in onValueChange
- [v4.0] Trustee edit reuses create dialog via shared editingId state pattern
- [v4.0] validateEnum<T> generic for runtime enum validation -- throws descriptive Error on invalid input
- [v4.0] Dialog components own internal form state (distribution, deceased) -- parent passes minimal props
- [v4.0] Entity cache pattern: trpc.entity.list.useQuery() + entities?.[0]?.id replaces hardcoded entityId=1 in all 17 admin clients
- [v4.0] Query guard { enabled: !!entityId } on all entity-dependent queries; entityId! non-null assertion for mutation payloads
- [v4.0] Structured logging (logger.auth/logger.api) replaces console.error in API routes; generic 500 errors prevent message leaks
- [v4.0] TxSql type defined once in db/index.ts -- imported by db/queries.ts and contact.ts (no duplicate definitions)
- [v4.0] Internal CRUD helpers in db/queries.ts made private -- only exported via CRUD object aggregations
- [v4.0] date-fns removed (unused) -- date-utils.ts had zero imports across codebase
- [Phase 23] components.json registries block uses @kibo-ui + @diceui only -- Origin UI excluded per UI-SPEC rev 1 safety gate (date-range covered by calendar mode='range', switch already present)
- [Phase 23] Kbd hand-rolled at src/components/ui/kbd.tsx (UI-SPEC §14 verbatim) -- @diceui/kbd returns HTTP 404
- [Phase 23] shadcn-official context-menu installed in PR-1 (not PR-B) -- prefetched as @kibo-ui/gantt regDep for PR-C
- [Phase 23] SummaryCard delta colors use text-success / text-destructive tokens (NOT text-green-600 / text-red-600) per UI-SPEC §Color
- [Phase 23] SummaryCard value uses font-semibold tabular-nums (NOT font-bold) per UI-SPEC §Typography Display
- [Phase 23] SummaryCard exports accessory?: ReactNode prop -- top-3 right-3 absolute slot for sparklines / status badges
- [Phase 23] KpiStripItem.invertDelta convention: caller marks 'down is good' (liabilities, expenses); zero treated as positive in both modes
- [Phase 23] KpiStrip sparkline uses inline recharts <LineChart> stroke=var(--primary) with isAnimationActive=false to avoid React Compiler bailout from reconciliation churn
- [Phase 23] PageHeader composition (h1 + breadcrumb + actions) lives in src/components/ (NOT src/components/ui/) -- app-specific composition vs generic primitive
- [Phase 23] DataTable bulkActions/exportable/getRowDetail are all additive optional props -- 17 existing callers unchanged; only /accounts opts into getRowDetail + exportable in PR-C
- [Phase 23] CSV export uses getFilteredRowModel + getVisibleLeafColumns -- hidden columns excluded (T-23-04); buildCsvBody split as a pure fn for testability
- [Phase 23] DataTableBulkActions defaults requiresConfirm=true for variant:destructive, routes through useConfirmDialog -- no window.confirm (T-23-03)
- [Phase 23] reorder mutations entityId-scoped via and(eq(id),eq(entityId)) -- cross-entity id throws NOT_FOUND (T-23-05); RLS app.is_admin() is defense-in-depth
- [Phase 23] beneficiary.sortIndex is new (INTEGER NOT NULL DEFAULT 0, ROW_NUMBER backfill); trustee reuses existing order column -- only composite indexes added for trustee
- [Phase 23] Test branch DB synced manually after db:deploy -- migration DDL applied to .env.test.local branch via postgres.js tx so tRPC reorder tests pass
- [Phase 25] trustee.list / beneficiary.list / getBeneficiariesWithDistributions apply ORDER BY -- migration-0012 composite indexes now back a real query plan; client-side .sort() removed (server order is single source of truth)
- [Phase 25] dashboard.activityCounts scopes the global activity_log audit table (no entityId column) by mapping the allowlisted tableName to its entity-owning source table and filtering recordId IN (that entity's row ids)
- [Phase 25] activityCounts tableName is a z.enum allowlist of 8 snake_case names mapped to Drizzle tables via a static lookup -- never interpolated into raw SQL (T-25-02)
- [Phase 25] @next/bundle-analyzer is a no-op under Turbopack -- build:analyze runs `next build --webpack` to emit .next/analyze/*.html
- [Phase 26] Migration 0013 adds 4 KPI columns -- specific_bequest.estimatedValue numeric(14,2), personal_property.insured boolean default false, liability.bankAccountId + investmentAccountId nullable FKs; applied to live DB + test branch, verified via information_schema.columns runtime check
- [Phase 26] New liability FK columns mirror the existing rentalPropertyId/homesteadId/vehicleId pattern verbatim (nullable bigint, onUpdate cascade / onDelete set null) + dedicated idx_liability_<col> btree index (Postgres does not auto-index FK columns)
- [Phase 26] drizzle-kit emitted migration 0013 column identifiers as camelCase directly (no snake_case hand-edit needed) because the new columns are declared with camelCase names in db/schema.ts, not via t.numeric('snake_name') override
- [Phase 26] Test-branch DB synced via committed idempotent postgres.js transaction script (scripts/apply-0013-testbranch.ts) -- FK ADD CONSTRAINT wrapped in DO $$ existence guards
- [Phase 26] AssetRow.transferStatus typed string | null -- null for insurancePolicy (no transferStatus column per CLAUDE.md), TransferStatus enum value for the six transferable kinds; the aggregator surfaces the absence as an explicit null literal with a doc comment rather than omitting the field
- [Phase 26] /assets Transfer-status progress KPI excludes null-transferStatus rows (insurance policies) from the denominator -- progress = COMPLETE transfers / transferable assets, replacing the status === 'ACTIVE' approximation (no schema change; transferStatus already existed on the six transferable asset tables)
- [Phase 26] liability router gains a cross-entity FK guard (assertLinkedAccountsInEntity) -- verifies each non-null bankAccountId/investmentAccountId belongs to the request's entity, throws BAD_REQUEST otherwise; mirrors the recordPayment guard (T-26-01 mitigation), runs before insert/update
- [Phase 26] liability.getLinked is a tested forward API NOT consumed by phase-26 UI -- /accounts row-detail filters trpc.liability.list client-side to avoid an N+1 query per expanded row; getLinked reserved for a future single-account view (not dead code)
- [Phase 26] /bequests Total value KPI sums estimatedValue via sumStrings; /artwork Insured count KPI counts the real insured boolean -- both phase-23 placeholder KPIs (em-dash, hardcoded 0) replaced with real data; liability create/edit form links to bank/investment accounts via nullable-FK Selects
- [Phase 27] --milestone OKLCH semantic token added (violet hue 295): light :root L 58% (white fg), .dark L 70% (dark-violet fg) -- mirrors the L-shift pattern of --warning/--success; exposed as Tailwind utilities via --color-milestone in @theme inline
- [Phase 27] --milestone gets NO prefers-contrast: more override -- the high-contrast media block only redefines --border/--muted-foreground, so semantic color tokens (warning/success/milestone) inherit base values; new semantic tokens follow the :root + .dark + @theme convention only

### Auth API Patterns That Work

```typescript
// Create user
const { user: newUser } = await authServer.admin.createUser({ email, name, password, role: 'user' })

// Set emailVerified (must do for admin-created users)
await getSql().query(`UPDATE neon_auth."user" SET "emailVerified" = true WHERE id = $1`, [userId])

// Upsert user_profile
await db.insert(userProfile).values({...}).onConflictDoUpdate({
    target: userProfile.userId,
    set: { role, beneficiaryId, forcePasswordChange, updatedAt: new Date() }
})

// Update user record
await getSql().query(`UPDATE neon_auth."user" SET "updatedAt" = $1 WHERE id = $2`, [new Date(), userId])

// List users
const { users } = await authServer.admin.listUsers({ query: { limit: 100, offset: 0 } })

// Forgot password -- direct SQL lookup (NOT listUsers)
const rows = await sql`SELECT id, name, email FROM neon_auth."user" WHERE lower(email) = lower(${email}) LIMIT 1`
```

### Blockers/Concerns

- ~~SEC-07 (UploadThing migration) requires verifying UploadThing config is still active and token valid~~ DONE in 16-02
- ~~CORR-04 (deprecated API migration) may affect Users page behavior for non-owner admins~~ DONE in 18-02

## Roadmap Evolution

- 2026-01-23: v1.0 shipped -- Neon Platform Integration (phases 1-6)
- 2026-01-22: v2.0 shipped -- Public Inventory Form (phases 7-8)
- 2026-02-22: v3.0 shipped -- Email/Password Auth Migration (phases 9-14)
- 2026-02-24: Forgot-password flow built outside GSD (unplanned)
- 2026-03-08: v4.0 roadmap created -- Production Hardening & Completeness (phases 15-22)
- 2026-05-19: Phase 23 added -- Shadcn registry adoption and dashboard UX revamp (full revamp per approved plan at ~/.claude/plans/yes-i-would-live-bright-pumpkin.md; 5 sub-PRs covering registry foundation, headline page redesigns, and DataTable/settings polish)

## Session Continuity

Last session: 2026-05-21T04:07:49.715Z
Stopped at: Completed 27-04-financial-and-distribution-table-rollout-PLAN.md
Resume file: None

**Phase 27 progress:** COMPLETE (4/4)

- [x] 27-01-datatable-foundation-and-docs (Wave 1) — Built selectColumn<TData>() (src/components/ui/data-table-select-column.tsx): the missing selection-UI primitive for the phase-23 bulkActions toolbar — a ColumnDef (id 'select', size 40, no sorting/hiding/resizing) with a header "select all" Checkbox + per-row Checkbox bound to TanStack rowSelection; the cell stops click propagation so a select click never fires onRowClick. Fixed csv-export.ts buildCsvBody to filter c.id !== 'select' (enableHiding:false only hides from the visibility menu — getVisibleLeafColumns still returns the column), so no exported CSV gains a spurious select column (T-27-04). Corrected REQUIREMENTS.md SEC-08 — INT-G1 closed (proxy publicPaths removal was deliberately reverted in 0a62754; route-level auth carries the requirement). Refreshed stale 23-VERIFICATION.md frontmatter (review_followups block, 5 WR Anti-Patterns rows marked resolved). 1016 unit tests passing (pre-commit hook, 0 fail) — 2026-05-20 (commits 9df8c94, 4b16c88, 767dc04 on feat/27-datatable-rollout)
- [x] 27-02-milestone-theme-token (Wave 1) — Added a dedicated --milestone / --milestone-foreground OKLCH semantic token (violet hue 295) to globals.css :root (light, L 58% / white fg) + .dark (L 70% / dark-violet fg), exposed as Tailwind utilities via --color-milestone in @theme inline — mirrors the --warning/--success declaration pattern, no prefers-contrast override (consistent with existing semantic color tokens). Repointed the two phase-23 elements that borrowed the neutral accent token: the dashboard upcoming-milestones Alert (DashboardAlerts.tsx — border/bg/icon/description) and the HEMS withdrawal Badge (hems/HistoryTable.tsx — distributionType column className) now render with bg-milestone / text-milestone-foreground / border-milestone, restoring the intended violet semantics. typecheck 0, lint 0 findings, build green, full unit suite green (pre-commit hook) — 2026-05-20 (commits 3823cac, 1242b76 on feat/27-datatable-rollout)
- [x] 27-03-asset-table-rollout (Wave 2) — Rolled the phase-23 DataTable enhancements onto the five asset-domain admin tables. CSV export (exportable + exportResource) added to Vehicles, Properties, Personal Property, Insurance, and Beneficiaries. Row-selection bulk delete (selectColumn() prepended as columns[0] + enableRowSelection + a single { variant: 'destructive' } bulkActions entry) added to Vehicles, Properties, Personal Property, and Insurance — NOT Beneficiaries (deletion there is a deliberate single-record action) and no getRowDetail anywhere. Each parent client (VehiclesClient/PropertiesClient/PersonalPropertyClient/InsuranceClient) gained an onBulkDelete handler: a sequential for...of await loop (NOT Promise.all) over the existing entityId-scoped delete mutation with { id, entityId } per row, tracking a failed counter and surfacing toast.error("Failed to delete N of M …") on partial failure / toast.success otherwise; the destructive bulkActions entry routes through ConfirmDialog automatically (requiresConfirm defaults true for variant:destructive). Rule-1 auto-fix: VehicleTable.test.tsx onEdit test re-targeted to the Actions cell (td:last-child) since selectColumn shifted the first column to a checkbox; both VehicleTable + RentalPropertyTable tests gained the new required onBulkDelete prop. typecheck 0, lint 0 findings, tests/trpc 166/166 in isolation (3 EntityId-Validation full-run timeouts are the known Neon test-branch infra flake — out of scope) — 2026-05-20 (commits 316e4c2, d49fe10, 76b8481 on feat/27-datatable-rollout)
- [x] 27-04-financial-and-distribution-table-rollout (Wave 2) — Completed the phase-23 DataTable-enhancement rollout across all remaining admin tables. CSV export (exportable + exportResource) added to Liabilities, Accounting, the HEMS-queue table tab, HemsTable (recent HEMS distributions), HistoryTable (all distributions), WithdrawalsTable + WithdrawalsPanel (grandchild withdrawal schedules), and Users. Row-selection bulk delete (selectColumn() prepended as columns[0] + enableRowSelection + a single { variant: 'destructive' } bulkActions entry) added to Liabilities and Accounting only — the two financial flat-list tables with a genuine delete mutation; LiabilitiesClient/AccountingClient each gained an onBulkDelete sequential for...of await loop over the existing entityId-scoped delete mutation with { id, entityId } per row, tracking a failed counter and surfacing toast.error("Failed to delete N of M …") on partial failure / toast.success otherwise (destructive bulkActions → ConfirmDialog automatic). The HEMS-queue table tab, HEMS/distribution/withdrawal tables, and Users got exportable only — bulk delete is not meaningful on kanban-driven, computed read-only, or Neon-Auth-managed surfaces; no getRowDetail anywhere. HistoryTable's bg-milestone Badge className (27-02's milestone-token work) left untouched; HemsQueueBoard kanban untouched. Rule-1 auto-fixes: LiabilityTable/AccountingTable tests gained the new required onBulkDelete prop; AccountingClient toast.error collapsed to one line for biome. typecheck 0, lint 0 findings, full unit suite 1016 pass / 0 fail (the lone error: ECONNREFUSED is the known Neon test-branch infra flake) — 2026-05-20 (commits da230a6, 300b701, f954396 on feat/27-datatable-rollout)

**Phase 26 progress:** COMPLETE (3/3)

- [x] 26-01-schema-and-migration (Wave 1) — Added 4 KPI columns in migration 0013: specific_bequest.estimatedValue numeric(14,2), personal_property.insured boolean default false, liability.bankAccountId + investmentAccountId nullable FKs (onDelete set null) + 2 indexes; liabilityRelations bankAccount/investmentAccount one-relations; insertSpecificBequestSchema null-safe estimatedValue validator; migration applied to live DB + test branch ([BLOCKING] db:deploy verified via information_schema.columns runtime check — all 4 columns present); 1003 unit tests passing — 2026-05-20 (commits f9dee94, 311a06c, 9c5e532 on feat/26-schema-completeness)
- [x] 26-03-transfer-status-through-asset-aggregator (Wave 2) — AssetRow gains a transferStatus field (string | null); all 7 per-kind mappers in routers/asset.ts set it (6 pass the source column through, insurancePolicy sets null — no transferStatus column); asset.test.ts asserts transferStatus on returned rows (PENDING for the 6 transferable kinds, null for insurance); /assets "Transfer-status progress" KPI recomputed from the real field (COMPLETE / transferable, insurance excluded from the denominator) — replaces the status === 'ACTIVE' approximation; no schema change; 1005 unit tests passing — 2026-05-20 (commits d662317, 1d94826 on feat/26-schema-completeness)
- [x] 26-02-router-form-and-kpi-wiring (Wave 2) — liability router gains assertLinkedAccountsInEntity (cross-entity FK guard on create/update — T-26-01) + getLinked query (tested forward API, not consumed by phase-26 UI); /bequests Total value KPI sums real estimatedValue via sumStrings (em-dash placeholder gone); /artwork Insured count KPI counts the real insured boolean (hardcoded 0 gone); liability create/edit form links to bank/investment accounts via nullable-FK Selects; /accounts row-detail lists genuinely linked liabilities on both account types (client-side filter over trpc.liability.list, no N+1); 5 TDD linkage tests; 1010 unit tests passing — 2026-05-20 (commits 11a8099, 14c81a1, e888b9d, 975dfc0, aa13532 on feat/26-schema-completeness)

**Phase 25 progress:**

- [x] 25-01-reorder-ordering-and-dashboard-wiring (Wave 1) — INT-G2 closed: ORDER BY added to trustee.list / beneficiary.list / getBeneficiariesWithDistributions backed by migration-0012 composite indexes, redundant client .sort() removed; dashboard.activityCounts adminProcedure (entity-scoped, tableName z.enum allowlist, dense per-day series) with 4 TDD tests; /accounts 30d-activity sparkline wired; @next/bundle-analyzer wired into next.config.ts (build:analyze → next build --webpack emits .next/analyze/*.html) — 2026-05-20 (commits 3fdedae, 0cc6838, 73c2878 on feat/25-reorder-and-dashboard-wiring)

**Phase 23 progress:**

- [x] 23-01-foundation (Wave 1 / PR-1) — registries wired, 6 primitives + Kbd installed, SummaryCard patched, PageHeader + KpiStrip built, 12 Wave-0 tests passing — 2026-05-19
- [ ] 23-02-hems-kanban-and-activity-log (Wave 2 / PR-2)
- [x] 23-03-liabilities-beneficiaries-kpi-rollout (Wave 2 / PR-B) — payoffProjections batched query, Kibo gantt + avatar-stack installed, LiabilityKpiStrip/Gantt/DebtToEquityDonut, BeneficiaryShareDonuts/AvatarStack/WithdrawalMilestoneGantt, KpiStrip + PageHeader on 11 admin pages, 16 Wave-0 tests, 938 unit tests passing — 2026-05-20 (commits 396e5e3, 5b4a6fa, 53e9cc4, 4226daf on feat/23-03-liabilities-beneficiaries-kpi-rollout)
- [x] 23-04-datatable-and-settings-polish (Wave 3 / PR-C+D) — DataTable bulkActions/exportable/getRowDetail props, csv-export lib, PreferenceRow + 4-card settings refresh, Dice sortable installed, migration 0012 (beneficiary.sortIndex + 2 composite indexes) applied, trustee/beneficiary reorder mutations, sortable consumers, 40 plan tests + 965 unit tests passing — 2026-05-20 (commits 81009c8, aadb02e, 5894e57 on feat/23-04-datatable-and-settings-polish)
- [ ] 23-05-asset-wizard (DEFERRED)

**Planned Phase:** 27 (DataTable rollout, theme token, and doc accuracy) — 4 plans — 2026-05-21T02:37:03.384Z
