# Phase 23: Shadcn registry adoption and dashboard UX revamp — Context

**Gathered:** 2026-05-19
**Status:** Ready for planning
**Source:** PRD Express Path (`~/.claude/plans/yes-i-would-live-bright-pumpkin.md`)

<domain>
## Phase Boundary

Adopt three shadcn-style component registries (Kibo UI, Origin UI, Dice UI) to extend the existing 39-primitive shadcn/ui foundation, then refactor the admin dashboard UX page-by-page using primitives from those registries plus two new local compositions. Goal: easier to navigate, easier to look at, easier to use.

The phase delivers in 5 PRs (foundation → headline redesigns wave A → headline redesigns wave B → DataTable + settings polish → asset wizard). Every PR follows the established review workflow (self-review round 1, canonical reviewer-agent round, regular merge commit, monitor CI to green).

</domain>

<decisions>
## Implementation Decisions

### Registry adoption (locked)

- **Adopt** `@kibo-ui` (URL pattern `https://www.kibo-ui.com/r/{name}.json`) — for kanban, gantt, contribution graph, avatar stack, dropzone primitives. Uses shadcn CSS variables. **Landing destination is `src/components/kibo-ui/<slug>/index.tsx`**, not `src/components/ui/` (per RESEARCH.md finding — CLI obeys `target` field).
- **Adopt** `@diceui` (URL pattern `https://www.diceui.com/r/{name}.json`) — for combobox (multi-select), tags input, phone input (mask only), currency mask input, stepper, sortable. **Landing destination is `src/components/ui/`**.
- **DEFER** `@originui` — removed from this phase per UI-SPEC revision 1. Origin UI's registry endpoint serves an HTML SPA shell to non-CLI clients; we could not vet a specific slug from this session. Date-range need is covered by the existing `src/components/ui/calendar.tsx` with `mode="range"` (verified to support this via DayPicker prop pass-through + range_start/middle/end className handling). Switch variant need is covered by the existing `src/components/ui/switch.tsx`. May revisit Origin UI in a follow-up phase once a stable pinned slug is verified.
- **Hand-roll** the Timeline and Kbd components — `@kibo-ui/timeline` returns HTTP 500, `@diceui/kbd` returns HTTP 404 (verified 2026-05-19). UI-SPEC §§ Timeline / Kbd specify the hand-rolled designs using existing primitives (Card + Badge + Separator for Timeline; small mono-font badge with `--muted` background for Kbd).
- **Reject** Aceternity UI, Magic UI, React Bits, Tremor, shadcn-admin (Vite), shadcnblocks/Bundui/Shadcn UI Kit paid tiers, tweakcn presets. Reasons enumerated in plan §F (theme conflict, motion-heavy, paywalled, or duplicate of Recharts).
- **All registry components are CLI-installable** via `bunx shadcn@latest add @<ns>/<slug>`.

### Primitives to install in Phase 1 (locked)

- `@diceui/combobox`
- `@diceui/tags-input`
- `@diceui/phone-input` (mask only — no E.164 validation per RESEARCH.md; add `libphonenumber-js` separately if validation needed)
- `@diceui/mask-input` (configure for USD cent precision; pairs with existing `formatMoney`/`sumStrings`)
- `@kibo-ui/dropzone` (pairs with existing UploadThing client)
- **Date range picker:** existing `src/components/ui/calendar.tsx` with `mode="range"` — no install needed (Origin UI removed).
- **Kbd primitive:** hand-rolled — no install needed (Dice UI kbd slug 404).

### Local compositions to build in Phase 1 (locked)

- `src/components/page-header.tsx` — title + breadcrumb + actions slot. Replaces ad-hoc page headers.
- `src/components/kpi-strip.tsx` — composes existing `SummaryCard` from `src/components/summary-card.tsx` + inline sparkline via existing `chart.tsx` Recharts wrapper. Props: array of `{label, value, delta, sparklineSeries}`.

### Phase 2 redesigns (locked)

- `/hems-queue` → install `@kibo-ui/kanban`; three columns PENDING/APPROVED/DISTRIBUTED; drag-to-transition wired to existing `trpc.hemsRequest.approve` and `.markDistributed`. Tabs: "Board" (default) + "Table" (current).
- `/activity-log` → install `@kibo-ui/contribution-graph` + hand-roll the Timeline component (UI-SPEC § Timeline) using existing Card/Badge/Separator primitives. Tabs: "Timeline" (default, grouped by day, color-coded dots for INSERT/UPDATE/DELETE), "Heatmap" (30-day, keyed by `action_user_id`), "Raw" (existing table).
- `/liabilities` → install `@kibo-ui/gantt`. Adds KPI strip + Gantt timeline + debt-to-equity donut (recharts).
- `/beneficiaries` → install `@kibo-ui/avatar-stack` + reuse `@kibo-ui/gantt`. Per-beneficiary share donuts (recharts) + milestone Gantt.
- KPI strip rolled onto `/dashboard`, `/accounts`, `/assets`, `/properties`, `/vehicles`, `/insurance`, `/trustees`, `/bequests`, `/personal-property`, `/contacts`, `/artwork`.

### Phase 3 polish (locked)

- `DataTable` enhancements: bulk-action toolbar (pattern adapted by hand from `sadmann7/tablecn` — not CLI-installable), CSV export (respects current filters + sorting; reuses `formatCurrency`/`formatDate`), opt-in `getRowDetail` row expansion (first consumer `/accounts`).
- `/settings` refresh: reuse existing `src/components/ui/switch.tsx` (Origin UI removed per revision 1); group settings into Card blocks ("Trust info", "Notifications", "Roles & access", "Inventory access"); introduce `PreferenceRow` composition (title + description + control in 2-column grid).
- `@diceui/sortable` applied to trustees (precedence order) and beneficiaries (withdrawal priority). Persist via new `sortIndex` column (Drizzle migration `drizzle/0012_*.sql`).
- `@diceui/stepper` 3-step wizard for asset creation (type+name → valuation → ownership). Extends `useResourceForm` hook.

### Constraints (locked)

- **OKLCH theme tokens MUST be preserved.** After each install: grep for `bg-[#`, `text-[#`, or direct color literals in the new file; patch to CSS variables before merging.
- **Never work directly on main.** Every PR on a feature branch.
- **React Compiler bailouts must be tracked.** Check build log for `[Compiler bailout]` after each PR. New deps that bail out: opt the consumer out with `'use no memo'` (pattern from PR #87).
- **Bundle budget:** total Phase 1+2+3 delta < +120 KB gzipped. Track via `bun run build:analyze`.
- **Tailwind v4 `@theme` integration verified per registry on first install.**
- **`ThemeProvider` is currently unmounted** (PR #90 hardened but did not wire up). If we adopt theme-aware components needing `useTheme()`, mount it in `src/app/layout.tsx` first.

### Anti-decisions (locked)

- **Do NOT install** Aceternity UI (clashes with sober slate base; React Compiler history).
- **Do NOT install** Magic UI (landing-page-shaped; motion footprint).
- **Do NOT install** React Bits (animated text/backgrounds; no data components).
- **Do NOT install** Tremor (~150 KB gzipped; duplicates Recharts we already wrap).
- **Do NOT install** tweakcn preset themes (would overwrite hand-tuned OKLCH).
- **Do NOT replace Recharts.** Existing `chart.tsx` wrapper stays the canonical chart primitive.

### Claude's Discretion

- Specific column-set details for each KPI strip variant (count/sum/delta granularity per resource type).
- Implementation details for the bulk-action toolbar (since it's hand-adapted from `tablecn`, not CLI-installable).
- Sortable migration column schema (`sortIndex` integer, indexes, default ordering).
- Multi-step wizard navigation UX (linear vs free-jump between steps).

### Review workflow (locked, project-standard)

Every PR in this phase:
1. Cut feature branch off `main`.
2. Self-review round 1: catch findings, fix, commit `chore: review-round-1 polish for PR #N`.
3. Spawn canonical reviewer agent (`gsd-code-reviewer`) for an independent pass; act on actionable findings, defer refactor-scope findings explicitly.
4. Push, open PR, monitor CI (Quality Checks + Vercel).
5. Merge with `--merge` (merge commit, branch deleted).
6. After merge: optionally re-run browser-agent verification on production for visual confirmation.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Approved plan (source of truth)
- `/Users/richard/.claude/plans/yes-i-would-live-bright-pumpkin.md` — the full plan; this CONTEXT.md is a derived subset.

### shadcn / theme contracts
- `/Users/richard/Developer/trust-admin/components.json` — registry wiring goes here in Phase 1.1.
- `/Users/richard/Developer/trust-admin/src/app/globals.css` — OKLCH theme tokens; must not regress.

### Existing primitives to reuse (do NOT re-implement)
- `/Users/richard/Developer/trust-admin/src/components/ui/data-table.tsx` — TanStack Table with column resize + persistence; Phase 3.1 target.
- `/Users/richard/Developer/trust-admin/src/components/virtualized-table.tsx` — virtualized variant; mirrors data-table pattern.
- `/Users/richard/Developer/trust-admin/src/components/ui/chart.tsx` — Recharts wrapper; reuse for new donuts/sparklines.
- `/Users/richard/Developer/trust-admin/src/components/summary-card.tsx` — KpiStrip base.
- `/Users/richard/Developer/trust-admin/src/components/summary-card-grid.tsx` — layout wrapper.
- `/Users/richard/Developer/trust-admin/src/components/confirm-dialog.tsx` — destructive action dialogs.
- `/Users/richard/Developer/trust-admin/src/components/resource-dialog.tsx` — generic create/edit dialog.
- `/Users/richard/Developer/trust-admin/src/components/app-sidebar.tsx` — sidebar; no change planned.
- `/Users/richard/Developer/trust-admin/src/components/command-palette.tsx` — Cmd+K palette; no change planned.

### Money / date / status utilities (do NOT duplicate)
- `/Users/richard/Developer/trust-admin/src/lib/money.ts` — `formatMoney`, `sumStrings`, `toCents`, `fromCents`, etc.
- `/Users/richard/Developer/trust-admin/src/utils/formatters.ts` — `formatCurrency`, `formatDate`, `formatPercent`.
- `/Users/richard/Developer/trust-admin/src/lib/constants.ts` — `STATUS_VARIANTS` map (status enum → badge variant).
- `/Users/richard/Developer/trust-admin/src/lib/type-utils.ts` — enum helpers (`enumToOptions`, `asXxx` type guards).

### Form abstractions
- `/Users/richard/Developer/trust-admin/src/hooks/use-resource-form.ts` — dialog state + TanStack Form wrapper.
- `/Users/richard/Developer/trust-admin/src/hooks/use-editable-cell.ts` — inline cell editing.
- `/Users/richard/Developer/trust-admin/src/components/editable-cells.tsx` — `EditableTextCell`, `EditableCurrencyCell`, `EditableSelectCell`.

### Page targets (one per redesign)
- `/Users/richard/Developer/trust-admin/src/app/(admin)/hems-queue/page.tsx` + `_components/` — Phase 2.1 (Kanban).
- `/Users/richard/Developer/trust-admin/src/app/(admin)/activity-log/page.tsx` + `_components/` — Phase 2.2 (Timeline + Heatmap).
- `/Users/richard/Developer/trust-admin/src/app/(admin)/liabilities/page.tsx` + `_components/` — Phase 2.3 (Gantt + KPI).
- `/Users/richard/Developer/trust-admin/src/app/(admin)/beneficiaries/page.tsx` + `_components/` — Phase 2.4 (Donuts + Milestones).
- `/Users/richard/Developer/trust-admin/src/app/(admin)/settings/_components/` — Phase 3.2 refresh.
- `/Users/richard/Developer/trust-admin/src/app/(admin)/trustees/` + `/beneficiaries/` — Phase 3.3 sortable order.

### Project guidance
- `/Users/richard/Developer/trust-admin/CLAUDE.md` — project conventions; tRPC pattern, money fields are strings, `entityId` everywhere, never `db:push` for schema changes.
- `/Users/richard/Developer/trust-admin/.planning/PROJECT.md` — project background.
- `/Users/richard/Developer/trust-admin/.planning/STATE.md` — accumulated decisions and history.

### Registry documentation (external references — fetched at install time)
- `https://www.kibo-ui.com/docs` — Kibo UI namespace + component catalog.
- `https://originui.com` — Origin UI components.
- `https://www.diceui.com` — Dice UI components.
- `https://ui.shadcn.com/docs/registry/getting-started` — shadcn registry CLI patterns.

</canonical_refs>

<specifics>
## Specific Ideas

### Phase 1 (PR-1, single PR)
- Edit `components.json` to add the three-registry block (literal JSON in plan §1.1).
- Install primitives one at a time; after each install, grep the new file for color literals.
- `PageHeader` props: `title: string, description?: string, breadcrumb?: BreadcrumbItem[], actions?: ReactNode`.
- `KpiStrip` props: `data: Array<{label: string, value: string | number, delta?: { value: number, label: string }, sparklineSeries?: number[]}>`. Internal: maps each item to a `SummaryCard` + a 40×16 inline sparkline.

### Phase 2 wave A (PR-A: hems-queue + activity-log)
- HemsQueueBoard: maps `hemsRequest.status` → kanban columns; card payload = `{ beneficiaryName, amountRequested, category, ageOfRequest }`. `onDrop` mutation: `trpc.hemsRequest.approve` for PENDING→APPROVED; `trpc.hemsRequest.markDistributed` for APPROVED→DISTRIBUTED. Read-only DISTRIBUTED column.
- ActivityTimeline: groups `activityLog` entries by day; each row = colored dot + actor + verb + table.recordId; click row to expand → JSON diff of `oldValue` / `newValue`.
- ActivityHeatmap: 30-day rolling window, day cell intensity = activity count, color stops via OKLCH variables. Cell click filters timeline.

### Phase 2 wave B (PR-B: liabilities + beneficiaries + KPI strips)
- LiabilityKpiStrip: count of active, sum of originalPrincipal, sum of currentBalance (use `sumStrings`), weighted-avg APR.
- LiabilityGantt: one bar per liability, x-axis = months; bar start = `createdAt` or `acquisitionDate`; bar end = computed payoff month from amortization (new tRPC procedure `liability.amortizationProjection` if not present).
- DebtToEquityDonut: ratio (sum currentBalance) / (sum personalProperty.dodValue + accountBalance + investmentBalance + homesteadValue + rentalPropertyValue + vehicleValue).
- BeneficiaryShareDonuts: one donut per beneficiary, slice = `sharePercent`, center label = beneficiary name.
- WithdrawalMilestoneGantt: bars per beneficiary for `withdrawalAge1` and `withdrawalAge2` unlock events relative to today.
- KPI strips: one composition per page with page-specific data wired through existing tRPC queries.

### Phase 3 wave A (PR-C: DataTable enhancements)
- Bulk-action toolbar: visible when `table.getSelectedRowModel().rows.length > 0`; shows count + actions slot; sticky position.
- CSV export: `exportTableToCsv(table, { filename, formatters })`; uses `formatCurrency`/`formatDate` from `src/utils/formatters.ts` so output matches UI; respects current `columnFilters` + `sorting` state.
- Row expansion: new optional prop `getRowDetail?: (row: TData) => ReactNode`; when provided, render a chevron + expandable region per row.

### Phase 3 wave B (PR-D: /settings refresh + sortable lists)
- Setting cards: "Trust info", "Notifications", "Roles & access", "Inventory access" — each a `<Card>` containing a list of `PreferenceRow`.
- PreferenceRow: composes title + description + control (switch/select/input) in a 2-column grid.
- Drizzle migration `drizzle/0012_add_sort_index.sql`: add `sortIndex INTEGER NOT NULL DEFAULT 0` to `trustee` + `beneficiary`; backfill in order of `id`; add index `(entityId, sortIndex)`.
- Sortable wired to drag-end → tRPC `trustee.reorder({entityId, orderedIds: number[]})` and analog for `beneficiary`.

### Phase 3 wave C (PR-E: multi-step wizard, optional)
- Extends `useResourceForm` with `steps?: WizardStep[]` and adds `currentStep`/`goNext`/`goPrev` state.
- Resource-dialog renders the stepper above the form when `steps` present.
- Three steps per asset creation: (1) type + name, (2) DOD value + range, (3) ownership + linkage.

</specifics>

<deferred>
## Deferred Ideas

- **Extract shared `useColumnSizingPersistence` hook** from `data-table.tsx` + `virtualized-table.tsx` (flagged HIGH-01 in PR #90 review). The cross-reference comments work today but a future change would have to be applied in two places. Out of scope for Phase 23; track for a follow-up PR after Phase 23 lands.
- **Plate.js rich-text editor** — only adopt if a content-authoring need appears (e.g., trust-document drafting).
- **Theme presets / variants beyond light/dark/high-contrast** — out of scope.
- **Multi-currency support** — not in this phase. Cent-precision en-US USD only.
- **Server-side pagination** in `DataTable` — not in this phase; client-side is sufficient for the household-scale data volumes.
- **Drag-and-drop file uploads to multiple zones simultaneously** — Phase 1 dropzone is single-zone only.
- **Sortable beyond trustees/beneficiaries** (e.g., resource-table row order) — defer.

</deferred>

---

*Phase: 23-shadcn-registry-adoption-and-dashboard-ux-revamp*
*Context gathered: 2026-05-19 via PRD Express Path*
*Source PRD: ~/.claude/plans/yes-i-would-live-bright-pumpkin.md (full revamp scope, approved)*
