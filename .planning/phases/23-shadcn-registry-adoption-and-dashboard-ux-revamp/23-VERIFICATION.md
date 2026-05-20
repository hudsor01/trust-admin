---
phase: 23-shadcn-registry-adoption-and-dashboard-ux-revamp
verified: 2026-05-19T00:00:00Z
status: passed
score: 40/40 must-haves verified (1 fixed post-verification, 1 accepted via override)
overrides_applied: 1
overrides:
  - must_have: "/accounts page is first consumer of getRowDetail — shows linked liabilities for the expanded account row"
    reason: "Schema has no FK from liability to bankAccount/investmentAccount — liability links only to homestead/rentalProperty/vehicle (confirmed in CLAUDE.md Data Model). The getRowDetail capability IS delivered and /accounts IS the first consumer with fully-functional row expansion; the expanded region shows account detail (routing number, DOD date, notes) as the appropriate substitute content. 'Linked liabilities' content is not implementable without a new schema FK, which is out of scope for a UX-revamp phase."
    accepted_by: "rhudson42"
    accepted_at: "2026-05-19T00:00:00Z"
resolved:
  - truth: "DashboardClient asset-allocation chart uses OKLCH theme tokens (locked 'no color literals' phase constraint)"
    resolution: "Fixed in commit f193679 — replaced the 6 hsl() literals with var(--chart-1)..var(--chart-5), cycling at the 6th slice, matching the donut pattern already used in BeneficiaryShareDonuts and DebtToEquityDonut. grep confirms zero hsl()/hex/Tailwind-palette literals remain in DashboardClient.tsx; typecheck + lint clean, full 995-test suite green."
deferred:
  - truth: "Asset-creation 3-step wizard (@diceui/stepper, useResourceForm extension)"
    addressed_in: "Plan 23-05 (intentionally deferred)"
    evidence: "UI-SPEC Implementation Note 13 / plan 23-05 status: deferred, autonomous: false — explicitly out of scope for this phase integration verification"
---

# Phase 23: Shadcn Registry Adoption and Dashboard UX Revamp — Verification Report

**Phase Goal:** Adopt the @kibo-ui + @diceui shadcn registries to extend the 39-primitive shadcn/ui foundation; refactor admin dashboard UX page-by-page using KPI strips, kanban (HEMS), timeline+heatmap (activity-log), gantt (liabilities + beneficiaries), donut charts, DataTable bulk actions + CSV export, settings card groupings, and sortable trustee+beneficiary lists.
**Verified:** 2026-05-19
**Status:** passed (1 truth fixed post-verification, 1 accepted via override)
**Re-verification:** No — initial verification; the OKLCH gap was fixed inline before phase completion

## Goal Achievement

### Observable Truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1 | components.json has registries block with @kibo-ui + @diceui, NOT @originui | ✓ VERIFIED | components.json lines 13-16: `"@kibo-ui": "https://www.kibo-ui.com/r/{name}.json"`, `"@diceui": ...`; no `@originui` substring |
| 2 | All Phase-1 Dice primitives exist, zero color literals | ✓ VERIFIED | combobox/tags-input/phone-input/mask-input/context-menu all exist at src/components/ui/; build clean |
| 3 | src/components/ui/kbd.tsx hand-rolled, token-only | ✓ VERIFIED | 26 lines, uses bg-muted/text-muted-foreground/border-border, no literals |
| 4 | summary-card uses text-success/text-destructive (no green/red-600, no font-bold) | ✓ VERIFIED | Lines 59-60 use text-success/text-destructive; no banned tokens; exports `accessory?: ReactNode` (line 16) |
| 5 | page-header.tsx renders h1 text-2xl font-semibold leading-tight + breadcrumb + actions | ✓ VERIFIED | 83 lines, exports PageHeader; matches UI-SPEC §1 |
| 6 | kpi-strip.tsx accepts KpiStripItem[], 1/2/4-col grid + sparkline accessory + invertDelta | ✓ VERIFIED | 88 lines; imports SummaryCard + recharts Line/LineChart; invertDelta inversion logic present |
| 7 | Kibo kanban, contribution-graph, gantt, avatar-stack primitives exist | ✓ VERIFIED | All at src/components/kibo-ui/<slug>/index.tsx (358/531/1522/51 lines) |
| 8 | Hand-rolled activity-timeline.tsx exists (Kibo timeline 500) | ✓ VERIFIED | 179 lines; INSERT→bg-success, UPDATE→bg-primary, DELETE→bg-destructive dots; expand chevron |
| 9 | hemsRequest.markDistributed: adminProcedure, entityId WHERE, APPROVED→DISTRIBUTED state machine | ✓ VERIFIED | hemsRequest.ts:211 adminProcedure; entityId in findFirst + UPDATE WHERE; CONFLICT if status !== APPROVED |
| 10 | trustee.reorder: adminProcedure, entityId-scoped, writes trustee.order | ✓ VERIFIED | trustee.ts:90 adminProcedure; `eq(trustee.entityId, input.entityId)` in WHERE; sets `order: idx` |
| 11 | beneficiary.reorder: adminProcedure, entityId-scoped, writes beneficiary.sortIndex | ✓ VERIFIED | beneficiary.ts:118 adminProcedure; entityId-scoped WHERE; sets `sortIndex: idx` |
| 12 | liability.payoffProjections query returns projection: null for revolving/missing rate | ✓ VERIFIED | liability.ts:302 adminProcedure; `!interestRate \|\| !monthlyPayment \|\| isRevolvingCredit ? null` |
| 13 | Migration 0012 adds beneficiary.sortIndex (NOT NULL DEFAULT 0), ROW_NUMBER backfill, composite indexes, camelCase | ✓ VERIFIED | 0012_add_sort_index.sql: camelCase quoted identifiers, ROW_NUMBER backfill, idx_beneficiary_entity_sort + idx_trustee_entity_order |
| 14 | db/schema.ts contains beneficiary.sortIndex | ✓ VERIFIED | schema.ts:942 `sortIndex: t.integer('sortIndex').notNull().default(0)`; index at :989 |
| 15 | HEMS kanban: drag PENDING→APPROVED fires ConfirmDialog→approve; APPROVED→DISTRIBUTED fires markDistributed | ✓ VERIFIED | HemsQueueBoard.tsx:92 approveMutation, :107 markDistributedMutation, :128 approve mutateAsync, :209 markDistributed.mutate |
| 16 | HEMS category renders as plain span (text-xs font-semibold uppercase tracking-wide text-muted-foreground), NOT Badge | ✓ VERIFIED | HemsQueueBoard.tsx:274 plain `<span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{req.category}</span>` |
| 17 | /hems-queue renders Tabs with Board (default) + Table | ✓ VERIFIED | HemsQueueClient.tsx:355-375 TabsTrigger board/table, HemsQueueBoard mounted in board tab |
| 18 | /activity-log renders Tabs Timeline (default) + Heatmap + Raw | ✓ VERIFIED | ActivityLogClient.tsx:210-233 three TabsTriggers; ActivityTimelineView + ActivityHeatmap mounted |
| 19 | ActivityHeatmap: 30-day window, fill-chart-2 opacity scale, day-click filters timeline | ✓ VERIFIED | ActivityHeatmap.tsx:46 `for i<30`; fill-chart-2/20..fill-chart-2 levels; onDayClick lifts selected day to ActivityLogClient |
| 20 | LiabilityGantt: one bar per active liability, today vertical line bg-primary | ✓ VERIFIED | LiabilityGantt.tsx:92 payoffProjections.useQuery; `<GanttToday />` at :193; bar className bg-primary/30 |
| 21 | DebtToEquityDonut: 2 slices via ChartContainer + recharts | ✓ VERIFIED | DebtToEquityDonut.tsx exists (100 lines), uses chart wrapper |
| 22 | BeneficiaryShareDonuts: cycles chart-1..chart-5 by index | ✓ VERIFIED | BeneficiaryShareDonuts.tsx:67 `var(--chart-${(index % 5) + 1})` |
| 23 | BeneficiaryShareDonut greyed-out '—' when sharePercent null/0 | ✓ VERIFIED | BeneficiaryShareDonuts.tsx:110 `hasShare ? ... : '—'`; :116 `fill-muted-foreground` |
| 24 | LiabilityKpiStrip: 4 KPIs via sumStrings, invertDelta on current balance | ✓ VERIFIED | LiabilityKpiStrip.tsx:5 imports sumStrings/toCents; :31-32 sumStrings; :63 `invertDelta: true` |
| 25 | KpiStrip rolled onto 11 admin pages (10 list + dashboard) | ✓ VERIFIED | grep found KpiStrip in all 11 _components/ dirs; artwork via PersonalPropertyClient(mode=artwork) |
| 26 | All KPI sums use sumStrings (no parseFloat().reduce()) | ✓ VERIFIED | LiabilityKpiStrip uses sumStrings; consumers route money through sumStrings/toCents (parseFloat only for non-money APR — WR-01/WR-02 advisory) |
| 27 | DataTable accepts bulkActions, exportable, exportResource, getRowDetail props | ✓ VERIFIED | data-table.tsx:73-81 all four props typed; consumed at :98-102, :359/371/394/507 |
| 28 | Bulk-action toolbar visible iff rows selected; sticky top-0 z-10 bg-primary/5 | ✓ VERIFIED | data-table-bulk-actions.tsx:33 `if (count === 0) return null`; :41 `sticky top-0 z-10 ... bg-primary/5` |
| 29 | Bulk destructive actions wrapped in ConfirmDialog (no window.confirm) | ✓ VERIFIED | data-table-bulk-actions.tsx:5 imports ConfirmDialog/useConfirmDialog; :82-83 requiresConfirm defaults true for destructive; no window.confirm |
| 30 | CSV export respects columnFilters + sorting + visible columns; filename {resource}-{date}.csv | ✓ VERIFIED | csv-export.ts:45 getVisibleLeafColumns, :46 getFilteredRowModel; :98 `${resource}-${iso}.csv` |
| 31 | Row expansion adds chevron column + expanded td colSpan with bg-muted/30 | ✓ VERIFIED | data-table.tsx:526-528 ChevronRight button, :562-566 colSpan + `bg-muted/30 p-4` |
| 32 | /accounts is first consumer of getRowDetail | ✓ VERIFIED (override) | getRowDetail wired (AccountsClient.tsx:325), row expansion fully functional; expanded region shows account detail instead of linked liabilities — schema has no liability→bankAccount FK. Accepted via override. |
| 33 | /settings renders 4 Card groups containing PreferenceRows | ✓ VERIFIED | SettingsClient.tsx:251-260 mounts SettingsTrustInfoCard/Notifications/RolesAccess/InventoryAccess; all 4 files exist |
| 34 | PreferenceRow: title text-xl font-semibold + description + control in 2-col grid | ✓ VERIFIED | preference-row.tsx:22 `grid-cols-1 md:grid-cols-[1fr_auto]`; :24 `text-xl font-semibold` |
| 35 | TrusteeSortableList wired to trpc.trustee.reorder | ✓ VERIFIED | TrusteeSortableList.tsx:49 `trpc.trustee.reorder.useMutation` |
| 36 | BeneficiarySortableList wired to trpc.beneficiary.reorder | ✓ VERIFIED | BeneficiarySortableList.tsx:48 `trpc.beneficiary.reorder.useMutation` |
| 37 | DashboardClient asset-allocation uses OKLCH tokens (locked constraint) | ✓ VERIFIED (fixed) | Fixed in commit f193679 — 6 hsl() literals replaced with var(--chart-1)..var(--chart-5); grep confirms zero color literals remain |
| 38 | bun run typecheck passes | ✓ VERIFIED | Exit code 0 |
| 39 | bun run lint passes | ✓ VERIFIED | Exit code 0 |
| 40 | bun test passes; bun run build clean with no compiler bailouts | ✓ VERIFIED | 995 pass / 0 fail (72 files); build "✓ Compiled successfully in 6.2s", zero `[Compiler bailout]` lines |

**Score:** 40/40 truths verified (1 fixed post-verification in commit f193679, 1 accepted via override — see frontmatter)

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Asset-creation 3-step wizard (@diceui/stepper) | Plan 23-05 (deferred) | UI-SPEC Implementation Note 13; plan 23-05 status: deferred, autonomous: false — out of scope per task instruction |

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| components.json | Registry wiring | ✓ VERIFIED | @kibo-ui + @diceui present, @originui absent |
| src/components/{summary-card,page-header,kpi-strip}.tsx | Foundation compositions | ✓ VERIFIED | All present, substantive, wired into consumers |
| src/components/ui/{kbd,combobox,tags-input,phone-input,mask-input,context-menu,sortable}.tsx | Dice + hand-rolled primitives | ✓ VERIFIED | All present |
| src/components/kibo-ui/{dropzone,kanban,contribution-graph,gantt,avatar-stack}/index.tsx | Kibo primitives | ✓ VERIFIED | All at correct nested path |
| src/components/activity-timeline.tsx | Hand-rolled timeline | ✓ VERIFIED | 179 lines, action-color dots |
| src/components/preference-row.tsx | Settings preference row | ✓ VERIFIED | 36 lines, 2-col grid |
| src/server/trpc/routers/{hemsRequest,trustee,beneficiary,liability}.ts | 3 mutations + 1 query | ✓ VERIFIED | All adminProcedure-gated, entityId-scoped |
| drizzle/0012_add_sort_index.sql | sortIndex migration | ✓ VERIFIED | camelCase, composite indexes, ROW_NUMBER backfill |
| db/schema.ts | beneficiary.sortIndex | ✓ VERIFIED | Line 942 + composite index |
| HEMS/activity/liability/beneficiary consumers | Page redesign consumers | ✓ VERIFIED | All 11 consumer files exist + wired |
| src/components/ui/data-table*.tsx + src/lib/csv-export.ts | DataTable enhancements | ✓ VERIFIED | bulkActions, export, getRowDetail all present |
| 4 Settings cards | Settings card groups | ✓ VERIFIED | All 4 files exist + mounted |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| kpi-strip.tsx | summary-card.tsx | SummaryCard import + accessory | ✓ WIRED | kpi-strip.tsx:3 |
| kpi-strip.tsx | recharts | inline LineChart sparkline | ✓ WIRED | kpi-strip.tsx:2 |
| HemsQueueBoard.tsx | hemsRequest.approve | PENDING→APPROVED drag (post-confirm) | ✓ WIRED | :92, :128 mutateAsync |
| HemsQueueBoard.tsx | hemsRequest.markDistributed | APPROVED→DISTRIBUTED drag | ✓ WIRED | :107, :209 mutate |
| ActivityHeatmap.tsx | ActivityTimelineView (via ActivityLogClient) | selected-day state lift | ✓ WIRED | onDayClick prop → parent state |
| LiabilityGantt.tsx | liability.payoffProjections | batched useQuery | ✓ WIRED | :92 |
| LiabilityKpiStrip.tsx | @/lib/money sumStrings | money aggregation | ✓ WIRED | :5 |
| DebtToEquityDonut.tsx | @/components/ui/chart | ChartContainer wrapper | ✓ WIRED | uses chart wrapper |
| DataTable.tsx | DataTableBulkActions + DataTableExport | conditional render | ✓ WIRED | :359, :371 |
| TrusteeSortableList.tsx | trpc.trustee.reorder | onDragEnd → orderedIds[] | ✓ WIRED | :49 |
| BeneficiarySortableList.tsx | trpc.beneficiary.reorder | onDragEnd → orderedIds[] | ✓ WIRED | :48 |
| 0012 migration | beneficiary.sortIndex column | ALTER + UPDATE + CREATE INDEX | ✓ WIRED | ADD COLUMN sortIndex present |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| HemsQueueBoard | HEMS request rows | trpc.hemsRequest.listWithBeneficiary | DB query (real) | ✓ FLOWING |
| LiabilityGantt | payoff projections | trpc.liability.payoffProjections (estimatePayoffDate over DB rows) | DB query + amortization calc | ✓ FLOWING |
| BeneficiaryShareDonuts | sharePercent | trpc.beneficiary.listWithDistributions | DB query (real) | ✓ FLOWING |
| ActivityHeatmap / Timeline | activityLog rows | activityLog tRPC query | DB query (real) | ✓ FLOWING |
| LiabilityKpiStrip | liability sums | sumStrings over liability list query | DB query (real) | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Integration branch typechecks | bun run typecheck | exit 0 | ✓ PASS |
| Integration branch lints | bun run lint | exit 0 | ✓ PASS |
| Test suite green | bun test | 995 pass / 0 fail across 72 files | ✓ PASS |
| Production build compiles | bun run build | ✓ Compiled successfully in 6.2s | ✓ PASS |
| No React Compiler bailouts | grep build log for bailout | 0 lines | ✓ PASS |

Note: the first `bun run build` invocation failed with `ENOTEMPTY: directory not empty, rmdir '.next/server'` — a stale build-artifact filesystem error, not a code defect. Re-ran after `rm -rf .next` → clean success.

### Requirements Coverage

No explicit requirement IDs in ROADMAP for this phase; all plans declare `requirements: []`. Coverage tracked via each plan's `must_haves` block (40 truths verified above) and UI-SPEC §Component Specifications. No REQUIREMENTS.md traceability rows expected for Phase 23 (per task instruction).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| src/app/(admin)/dashboard/_components/DashboardClient.tsx | 235-260 | 6× `hsl(...)` color literals | ✅ Resolved | Fixed in commit f193679 — replaced with var(--chart-1)..var(--chart-5) |
| src/app/(admin)/dashboard/_components/DashboardClient.tsx | 234-298 | `parseFloat().reduce()` money math | ⚠️ Warning | WR-01 — float drift on liabilityPayoffPercent; advisory quality issue |
| src/app/(admin)/liabilities/_components/LiabilitiesClient.tsx | 188-194 | raw parseFloat optimistic balance | ⚠️ Warning | WR-02 — brief 1-cent UI disagreement before refetch; advisory |
| src/app/(admin)/hems-queue/_components/HemsQueueBoard.tsx | 119-136 | stale-closure confirm pattern | ⚠️ Warning | WR-03 — latent desync on rapid double-drag; guarded today, advisory |
| src/app/(admin)/hems-queue/_components/HemsQueueClient.tsx | 83-103 | dead useOptimistic | ⚠️ Warning | WR-04 — unused machinery; advisory |
| src/server/trpc/routers/{trustee,beneficiary}.ts | reorder | non-transactional Promise.all batch | ⚠️ Warning | WR-06 — partial-failure split order; advisory but worth a follow-up |
| src/app/(admin)/artwork/_components/ArtworkClient.tsx | 15-23 | re-export to satisfy verifier grep | ℹ️ Info | IN-05 — code shaped for harness; KpiStrip rollout itself is real (via PersonalPropertyClient) |

The 6 warnings + 9 info findings from 23-REVIEW.md are advisory quality issues and do not by themselves constitute phase-goal gaps — EXCEPT IN-01 (DashboardClient hsl literals), which the review classified as info but which maps to a **locked** CONTEXT.md constraint and is therefore escalated to a blocker gap here.

### Human Verification Required

None. All truths are programmatically verifiable; build/test/typecheck/lint all confirmed green. Visual confirmation of the redesigned pages (kanban drag feel, gantt rendering, donut colors) is optional per the CONTEXT.md review workflow step 6 ("optionally re-run browser-agent verification on production") but is not a gate for phase completion.

### Gaps Summary — RESOLVED

The phase achieved its goal: all 40 must-haves are now verified. All four registries-and-redesign plans (23-01..23-04) delivered real, wired, data-flowing code — the dashboard UX revamp is genuine, not stubbed. The integration branch is green (typecheck 0, lint 0, 995/995 tests, clean build, zero compiler bailouts).

The two items that initially blocked a clean pass were both closed before phase completion:

1. **OKLCH constraint violation — FIXED.** `DashboardClient.tsx` hardcoded 6 `hsl()` color literals for the asset-allocation chart, violating the locked CONTEXT.md "OKLCH theme tokens MUST be preserved" constraint. Resolved in commit `f193679` — the 6 literals were replaced with `var(--chart-1)`..`var(--chart-5)`, cycling at the 6th slice, matching the donut pattern already used in BeneficiaryShareDonuts and DebtToEquityDonut. A post-fix grep confirms zero color literals remain; typecheck + lint + the full 995-test suite are green.

2. **getRowDetail content mismatch — ACCEPTED via override.** `/accounts` IS the first `getRowDetail` consumer and row expansion is fully functional — the expanded region renders account metadata (routing number, DOD date, notes) rather than "linked liabilities" as the must-have specified. The schema has no FK from `liability` to `bankAccount`/`investmentAccount` (liability links only to homestead/rentalProperty/vehicle, per CLAUDE.md Data Model). The row-detail *capability* requirement is fully met; the originally-specified "linked liabilities" content is not implementable without a new schema FK, which is out of scope for a UX-revamp phase. Accepted via override (see frontmatter).

The 6 advisory warnings from 23-REVIEW.md (non-transactional reorder mutations, `parseFloat` money math in 2 consumers, a stale-closure confirm pattern, dead `useOptimistic`, a double-cast) remain open as quality follow-ups — none are phase-goal gaps. Consider `/gsd-code-review-fix 23` to address them.

---

_Verified: 2026-05-19 · gaps resolved 2026-05-19_
_Verifier: Claude (gsd-verifier); gap resolution + override applied by orchestrator_
