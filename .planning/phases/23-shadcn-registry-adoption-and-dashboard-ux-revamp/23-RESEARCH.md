# Phase 23: Shadcn registry adoption and dashboard UX revamp — Research

**Researched:** 2026-05-19
**Domain:** shadcn registry tooling · dashboard UX composition · React Compiler runtime
**Confidence:** HIGH for slug verification + dependency cost; MEDIUM for theme-conflict scope; HIGH for codebase contract surface

## Summary

The plan is mostly sound but **two slugs in the locked scope do not exist** and need substitution before Phase 1 install: `@kibo-ui/timeline` (HTTP 500 from the registry endpoint) and `@diceui/kbd` (HTTP 404). The other 11 primitives all return valid JSON registry items today.

Three smaller-but-load-bearing course corrections are required:

1. **Kibo UI components land at `src/components/kibo-ui/<name>/index.tsx`, not `src/components/ui/`.** The registry items have `target: "components/kibo-ui/kanban/index.tsx"` hardcoded; CLI override is possible but the documented Kibo pattern is its own subdir.
2. **Origin UI's public registry endpoint returns HTML to curl/WebFetch but JSON to the shadcn CLI** (content-negotiated). Direct URL install (`bunx shadcn@latest add https://originui.com/r/legacy/comp-NN.json`) is the canonical path; namespace install via `registries` block in `components.json` works for the CLI but is unverifiable from this session. Pin slugs by browsing the Origin UI site in a browser at install time, then paste exact URLs into the install command. **Origin UI was acquired by Cal.com and rebranded — most active development is now on `coss.com/ui`; the `originui.com` site is a "legacy snapshot" per its own README.** The Phase 1 install path is supported but no new components will land there.
3. **`getPayoffProjection` already exists** per-liability in `liabilityRouter`. Phase 2.3's Gantt does NOT need a new tRPC procedure — it needs a batched variant. Add `liability.payoffProjections({entityId})` that maps `estimatePayoffDate()` from `src/lib/amortization.ts` over the entity's liabilities (skipping revolving credit and ones missing interestRate / monthlyPayment).

**Primary recommendation:** Proceed with Phase 1 after replacing `@kibo-ui/timeline` with a hand-rolled `ActivityTimeline.tsx` (date-fns groupBy + shadcn `Card`s) and replacing `@diceui/kbd` with a hand-rolled `<Kbd>` (existing in many shadcn snippets; ~20 lines around `<kbd>`). The substitutions remove a registry dependency and shrink bundle.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Registry wiring (`components.json`) | Build config | — | Single source of truth for the shadcn CLI; no runtime impact |
| Kanban DnD state (HEMS queue) | Client | API (status mutation) | DnD purely client; transition fires `trpc.hemsRequest.approve` server-side |
| Activity timeline grouping | Client | — | All `activityLog.list` data is already prefetched server-side via `HydrationBoundary` |
| Contribution heatmap | Client | API (existing list) | Aggregation in the browser; <100 rows |
| Gantt amortization | Client (rendering) | API (computation) | `payoffProjections` runs on server (`@/lib/amortization`); client renders only |
| Donut charts | Client | — | Already-fetched data summed in the browser via `sumStrings` |
| Sortable persistence | Client (drag UX) | API (`reorder` mutation) | New tRPC mutation for trustee + beneficiary order writes |
| KPI sparkline series | API (aggregate) | Client (chart) | New `dashboard.activityCounts({tableName, days:30})` to feed sparklines |
| CSV export | Client | — | Reads TanStack Table state in-memory |
| Stepper wizard | Client | API (existing creates) | Multi-step UI is pure client; submit hits existing `*.create` |

## Standard Stack

### Registry tooling (current versions, verified 2026-05-19)

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| `shadcn` (CLI) | 3.x (latest) | `bunx shadcn@latest add @ns/slug` | Only tool that understands the `registries` block in `components.json` `[VERIFIED: ui.shadcn.com/docs/registry/namespace]` |
| Kibo UI | n/a (registry-only) | data-display primitives | Author Hayden Bleasel; uses shadcn CSS vars; verified clean via direct JSON inspection `[VERIFIED: kibo-ui.com/r/*.json HTTP 200 for 8 of 9 plan slugs]` |
| Origin UI | n/a (legacy snapshot) | Tailwind v4 form variants | Acquired by Cal.com → coss.com/ui; legacy components still installable via `https://originui.com/r/legacy/{slug}.json` `[CITED: github.com/origin-space/originui README + shadcntemplates.com discussion]` |
| Dice UI | n/a (registry-only) | accessible form primitives | Maintained by sadmann7 (same author as `tablecn`); direct registry verified `[VERIFIED: diceui.com/r/*.json HTTP 200 for 7 of 8 plan slugs]` |

### Per-component registry status (verified by HTTP probe + JSON inspection 2026-05-19)

| Slug | Status | Deps (npm) | Lands at | Notes |
|------|--------|-----------|----------|-------|
| `@kibo-ui/kanban` | ✅ 200 | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `tunnel-rat` | `components/kibo-ui/kanban/index.tsx` | regDeps: `card`, `scroll-area` (already installed). 7.7 KB source. Uses `bg-secondary`, `ring-primary` — clean against our OKLCH tokens. `[VERIFIED]` |
| `@kibo-ui/gantt` | ✅ 200 | `@dnd-kit/core`, `@dnd-kit/modifiers`, `@uidotdev/usehooks`, `date-fns`, `jotai`, `lodash.throttle`, `lucide-react` | `components/kibo-ui/gantt/index.tsx` | 40 KB source. Uses `bg-secondary`, `bg-card`, `bg-muted`, `bg-background`. **No framer-motion**. regDeps: `card`, `context-menu` (context-menu NOT yet installed; needs to be added). `[VERIFIED]` |
| `@kibo-ui/contribution-graph` | ✅ 200 | `date-fns` | `components/kibo-ui/contribution-graph/index.tsx` | 12 KB. Uses `data-[level=N]:fill-muted-foreground/N0` — themed via our existing CSS vars. Default palette is muted grey; for an activity heatmap you'll likely override with `--chart-2` (green from globals.css) via custom className. No registry deps. `[VERIFIED]` |
| `@kibo-ui/avatar-stack` | ✅ 200 | none | `components/kibo-ui/avatar-stack/index.tsx` | 1.1 KB. Pure composition over `@radix-ui/react-avatar` (already in deps). `[VERIFIED]` |
| `@kibo-ui/dropzone` | ✅ 200 | `lucide-react`, `react-dropzone` | `components/kibo-ui/dropzone/index.tsx` | 5 KB. regDeps: `button`. Uses `bg-muted`. `react-dropzone` is ~16 KB gz — new dep. `[VERIFIED]` |
| `@kibo-ui/timeline` | ❌ **500 — DOES NOT EXIST** | — | — | **Blocker for plan §2.2.** No alt slug found (probed `timeline-vertical`, `event-timeline`, `horizontal-timeline`, `pipeline`, `activity` — all 500). Substitute with hand-rolled `ActivityTimeline.tsx` (date-fns `groupBy` + map → `Card`/`Badge`). `[VERIFIED]` |
| `@originui/calendar-30` to `calendar-35` | ✅ 200 (HTML to browser; JSON to CLI) | — | `src/components/ui/calendar-N.tsx` | Origin UI's Tailwind v4 calendar variants. `calendar-30`–`35` are the date-range variants (preview pickers); pick at install time. Confirmed via search hit `originui.com/r/legacy/comp-01.json` pattern. `[CITED: shadcn.io directory + originui repo README]` |
| `@diceui/combobox` | ✅ 200 | `@diceui/combobox` (npm), `@dnd-kit/{core,modifiers,sortable,utilities}`, `radix-ui` | `src/components/ui/combobox.tsx` | Pulls FULL @dnd-kit suite (combobox supports reorderable selected items). `[VERIFIED]` |
| `@diceui/tags-input` | ✅ 200 | `@diceui/tags-input` (npm) | `src/components/ui/tags-input.tsx` | Lightweight. `[VERIFIED]` |
| `@diceui/phone-input` | ✅ 200 | `radix-ui` | `src/components/ui/phone-input.tsx` | NO libphonenumber dep — input mask only, no E.164 validation. If E.164 is needed, add `libphonenumber-js` (~75 KB gz) separately or accept input-mask-only. `[VERIFIED]` |
| `@diceui/mask-input` | ✅ 200 | `radix-ui` | `src/components/ui/mask-input.tsx` | Configurable per-field. For USD cents, pair with `formatMoney` from `src/lib/money.ts`. `[VERIFIED]` |
| `@diceui/sortable` | ✅ 200 | `@dnd-kit/{core,modifiers,sortable,utilities}`, `radix-ui` | `src/components/ui/sortable.tsx` | Same dnd-kit suite as kanban; no incremental cost if kanban is also installed. `[VERIFIED]` |
| `@diceui/stepper` | ✅ 200 | `radix-ui` | `src/components/ui/stepper.tsx` | Lightweight. `[VERIFIED]` |
| `@diceui/kbd` | ❌ **404 — DOES NOT EXIST** | — | — | **Blocker for plan §1.2.** Substitute with hand-rolled `<Kbd>` (~20 LOC: a `<kbd>` element with `font-mono text-xs border rounded-md bg-muted px-1.5 py-0.5`). `[VERIFIED]` |
| `@originui/switch-XX` | ✅ 200 (probed `switch-01`–`13`) | — | `src/components/ui/switch-NN.tsx` | Origin UI's labelled-switch variants. Pick at install. `[VERIFIED]` |

### Bundle cost projection (gzipped, verified via bundlephobia)

| Dep | gz | Phase | Notes |
|-----|-----|------|------|
| `@dnd-kit/core` | 13.9 KB | 2.1 (kanban) | Shared across kanban + sortable + gantt + combobox |
| `@dnd-kit/sortable` | 3.6 KB | 2.1, 3.3 | Shared kanban + sortable |
| `@dnd-kit/modifiers` | 0.9 KB | 2.3 (gantt) | Also pulled by combobox + sortable |
| `@dnd-kit/utilities` | 1.5 KB | shared | Tiny |
| `tunnel-rat` | 1.1 KB | 2.1 (kanban) | Single-component dep |
| `date-fns` | 17.1 KB | 2.2, 2.3, 2.4 | Tree-shakeable — actual delta likely 5–8 KB if only `differenceInDays`, `eachDayOfInterval`, `formatISO`, `parseISO`, `subWeeks` are used by contribution-graph. **Reintroduces `date-fns`** which was removed in CLEAN-02; consumer should re-justify in PR description. |
| `jotai` | 3.8 KB | 2.3 (gantt only) | Bundled in gantt's own scope; doesn't leak to other components |
| `lodash.throttle` | <1 KB | 2.3 (gantt only) | Could be replaced post-install with an inline 8-line throttle; document as deferred polish |
| `react-dropzone` | 15.9 KB | 1.2 (dropzone) | New dep; biggest single-component cost |
| `@uidotdev/usehooks` | ~5 KB est | 2.3 (gantt) | Hook library; rarely tree-shaken cleanly |
| `@diceui/combobox` | ~6 KB est | 1.2 | Bundled with @dnd-kit suite — only the combobox-specific code is incremental |
| `@diceui/tags-input` | ~3 KB est | 1.2 | Small |

**Worst-case Phase 1+2+3 total: ~70–95 KB gzipped** if every plan-listed registry component lands. Well under the **+120 KB budget**. Largest single contributor is the `@dnd-kit` suite (~20 KB combined), shared by 4 features, so even adopting all of them only pays for it once.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@kibo-ui/timeline` (doesn't exist) | Hand-roll `ActivityTimeline.tsx` | Saves a registry dep; the markup is `<ol>` + `<Card>` + colored `<Badge>` per item, ~80 LOC |
| `@diceui/kbd` (doesn't exist) | Hand-roll `<Kbd>` | Native `<kbd>` element + Tailwind class is 1 file, ~20 LOC |
| `@kibo-ui/gantt` | Recharts `<BarChart layout="vertical">` with date-range bars | Avoids `jotai`+`lodash.throttle`+`usehooks`; gantt visual is harder to replicate. Recommend installing kibo gantt as planned. |
| `react-dropzone` (via `@kibo-ui/dropzone`) | UploadThing's built-in dropzone | UploadThing's button-style upload is already wired in `src/lib/uploadthing-server.ts`; a true drop-anywhere zone is what kibo provides. Plan choice stands. |
| `@diceui/phone-input` | `react-phone-number-input` + custom Tailwind styling | Dice's input is mask-only; no validation. For E.164 enforcement, libphonenumber-js is needed regardless. Plan can ship Dice's mask first and defer E.164 validation. |

## Architecture Patterns

### System data flow (Phase 23 deltas overlaid on existing arch)

```
                       Browser
                          │
                          │ User drags HEMS card
                          ▼
   ┌──────────────────────────────────────────────┐
   │  src/app/(admin)/hems-queue/_components/     │
   │    HemsQueueClient.tsx                       │
   │     ├── <Tabs> Board (default) | Table       │
   │     │   └─ <KanbanBoard>  (NEW)              │
   │     │       └─ onDragEnd → mutate            │
   │     └── existing DataTable behind "Table"    │
   └──────────────────────────────────────────────┘
                          │
                          │ tRPC client over fetch
                          ▼
   ┌──────────────────────────────────────────────┐
   │  src/server/trpc/routers/hemsRequest.ts      │
   │    .approve()                                │
   │    .markDistributed()  (NEW — does not exist)│
   │    .deny() .cancel()                         │
   └──────────────────────────────────────────────┘
                          │ Drizzle with JWT bound
                          ▼
   ┌──────────────────────────────────────────────┐
   │  hems_request (RLS via app.is_admin())       │
   │  distribution (auto-created on approve)      │
   └──────────────────────────────────────────────┘
```

### Project structure deltas (additions only)

```
src/
├── components/
│   ├── kibo-ui/              # NEW — Kibo CLI's default target
│   │   ├── kanban/index.tsx
│   │   ├── gantt/index.tsx
│   │   ├── contribution-graph/index.tsx
│   │   ├── avatar-stack/index.tsx
│   │   └── dropzone/index.tsx
│   ├── ui/                   # existing — Dice + Origin land here
│   │   ├── combobox.tsx          (NEW)
│   │   ├── tags-input.tsx        (NEW)
│   │   ├── phone-input.tsx       (NEW)
│   │   ├── mask-input.tsx        (NEW)
│   │   ├── sortable.tsx          (NEW)
│   │   ├── stepper.tsx           (NEW)
│   │   ├── kbd.tsx               (NEW — hand-rolled, replaces @diceui/kbd)
│   │   ├── calendar-NN.tsx       (NEW — Origin variant)
│   │   ├── switch-NN.tsx         (NEW — Origin variant)
│   │   ├── context-menu.tsx      (NEW — required by kibo gantt)
│   │   ├── data-table.tsx        (EDIT — Phase 3.1 bulk-action toolbar)
│   │   ├── data-table-bulk-actions.tsx  (NEW)
│   │   └── data-table-export.tsx        (NEW)
│   ├── page-header.tsx       (NEW — local composition)
│   ├── kpi-strip.tsx         (NEW — local composition)
│   ├── preference-row.tsx    (NEW — Phase 3.2)
│   └── activity-timeline.tsx (NEW — hand-rolled, replaces @kibo-ui/timeline)
```

### Pattern 1: Registry install per primitive

**What:** Add `registries` block to `components.json`, then `bunx shadcn@latest add @ns/slug`.

**When to use:** Every external primitive in Phase 1.2, 2.1, 2.3, 2.4, 3.2, 3.3, 3.4.

**Example:**
```jsonc
// components.json — full updated file
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "registries": {
    "@kibo-ui":  "https://www.kibo-ui.com/r/{name}.json",
    "@originui": "https://originui.com/r/legacy/{name}.json",
    "@diceui":   "https://www.diceui.com/r/{name}.json"
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
// Source: ui.shadcn.com/docs/registry/namespace
// Note: @originui URL uses /r/legacy/ — confirmed in shadcntemplates discussion of post-acquisition site
```

```bash
# install command — Bun, NOT pnpm
bunx --bun shadcn@latest add @kibo-ui/kanban
bunx --bun shadcn@latest add @diceui/combobox @diceui/tags-input @diceui/mask-input
# Note: omit `--bun` if shadcn CLI complains; the docs use bare `bunx shadcn@latest`
```

### Pattern 2: Kanban + tRPC mutation wiring

**What:** Kibo kanban exposes `onDragEnd: (event: DragEndEvent) => void`. The handler computes new column from `event.over.id` and fires the corresponding mutation.

**When to use:** Phase 2.1 (`/hems-queue`).

**Example:**
```tsx
// src/app/(admin)/hems-queue/_components/HemsQueueBoard.tsx (sketch)
'use client'
// 'use no memo'  // — only if React Compiler bails out; verify via build log

import {
    KanbanBoard, KanbanCard, KanbanCards, KanbanHeader, KanbanProvider,
} from '@/components/kibo-ui/kanban'  // <-- subdir, not src/components/ui

const COLUMNS = [
  { id: 'PENDING',     name: 'Pending' },
  { id: 'APPROVED',    name: 'Approved' },
  { id: 'DISTRIBUTED', name: 'Distributed' },
] as const

function HemsQueueBoard({ requests, entityId }: Props) {
  const utils = trpc.useUtils()
  const approve = trpc.hemsRequest.approve.useMutation({
    onSuccess: () => utils.hemsRequest.listWithBeneficiary.invalidate(),
  })
  // NOTE: trpc.hemsRequest.markDistributed DOES NOT EXIST. Either:
  //   (a) add a new mutation in routers/hemsRequest.ts that flips status
  //       APPROVED → DISTRIBUTED, OR
  //   (b) use trpc.distribution.update with tax fields when the linked
  //       distribution is marked paid (then mirror DISTRIBUTED back).
  // Recommended: (a) — single status owner, plan §2.1 explicitly references it.

  return (
    <KanbanProvider
      columns={COLUMNS}
      data={requests.map(r => ({ id: String(r.id), column: r.status, ...r }))}
      onDragEnd={(event) => {
        const id = Number(event.active.id)
        const newCol = event.over?.id as 'PENDING' | 'APPROVED' | 'DISTRIBUTED'
        const req = requests.find(r => r.id === id)
        if (!req || newCol === req.status) return
        if (req.status === 'PENDING' && newCol === 'APPROVED') {
          approve.mutate({ id, entityId, approvedAmount: req.amountRequested })
        } else if (req.status === 'APPROVED' && newCol === 'DISTRIBUTED') {
          markDistributed.mutate({ id, entityId })
        }
        // All other transitions are no-ops in this design.
      }}
    >
      {/* … */}
    </KanbanProvider>
  )
}
// Source: kibo-ui.com/r/kanban.json (component shape)
//         src/server/trpc/routers/hemsRequest.ts (mutations available)
```

### Pattern 3: Migration for `sortIndex` columns

**What:** Add an integer `sortIndex` column to `beneficiary` (trustee already has `order` integer NOT NULL — see schema line 1925), backfill in id-order, add composite index.

**When to use:** Phase 3.3.

**Example:**
```sql
-- drizzle/0012_add_sort_index.sql
-- Pattern mirrors drizzle/0009_create_valuation_correction.sql:
-- camelCase column names, IF NOT EXISTS guards, statement-breakpoint separators.

ALTER TABLE "beneficiary"
    ADD COLUMN IF NOT EXISTS "sortIndex" integer NOT NULL DEFAULT 0;
--> statement-breakpoint

-- Backfill: order existing rows by id within each entity so the initial
-- list-order is preserved.
UPDATE "beneficiary" b
   SET "sortIndex" = sub.rn - 1
  FROM (
    SELECT "id", ROW_NUMBER() OVER (PARTITION BY "entityId" ORDER BY "id") AS rn
      FROM "beneficiary"
  ) sub
 WHERE b."id" = sub."id";
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_beneficiary_entity_sort"
    ON "beneficiary" USING btree ("entityId", "sortIndex");
--> statement-breakpoint

-- trustee already has 'order' integer NOT NULL. Decision:
--   (a) reuse 'order' and add ONLY the composite index — recommended,
--       no schema churn; OR
--   (b) add sortIndex parallel to 'order' for naming consistency.
-- Recommended: (a). Add this line if not already present in 0006:
CREATE INDEX IF NOT EXISTS "idx_trustee_entity_order"
    ON "trustee" USING btree ("entityId", "order");
```

**RLS impact:** None. `sortIndex` is a non-sensitive ordering hint; the existing 4-policy admin-only shape on both tables covers it. No new policies needed.

**Generation pattern:** Use `bun run db:deploy` (NEVER `db:push` — drizzle-kit push corrupts RLS policies per CLAUDE.md). Hand-edit any snake_case column references in the generated SQL to camelCase (see CLAUDE.md "Postgres Column Naming Convention" gotcha) before running.

### Anti-Patterns to Avoid

- **Installing into `src/components/ui/` for Kibo primitives.** Kibo's registry targets `components/kibo-ui/<name>/index.tsx`. Don't try to flatten — that's where shadcn's CLI will land them and the file's internal imports assume that path.
- **Reading `hemsRequest.status` directly in a memoized child of `HemsQueueClient`.** Per PR #87, a child that reads internal-state off a stable prop will be skipped by React Compiler. The board component must either receive the request array directly (not a stable ref) or include `'use no memo'`. Verify via `bun run build` log scan for `[Compiler bailout]`.
- **Importing `framer-motion` or `motion`.** None of the installed registry components pull it in. If a future Kibo update introduces motion, opt the consumer out with `'use no memo'` per PR #87 precedent (`src/app/(admin)/assets/_components/ExportAssetsButton.tsx`).
- **Hand-rolling money math in KPI strips.** All sums use `sumStrings` from `src/lib/money.ts`; all percentages use `formatPercent`; all dates use `formatDate`. Period.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop reorder | DIY HTML5 DnD | `@diceui/sortable` (or kibo kanban) | Keyboard accessibility + screen-reader announcements are 200+ LOC of subtle work; `@dnd-kit` ships both |
| CSV escape rules | Hand-roll quote/escape | Hand-roll IS justified here | The plan calls for a small in-house exporter; reuse `formatCurrency`/`formatDate` so UI and CSV stay consistent. NO library needed — TanStack rows + `<formatters>` is 30 LOC |
| Amortization payoff | Recalculate per row | Reuse `estimatePayoffDate` from `src/lib/amortization.ts` | Already battle-tested; just need a batched tRPC wrapper |
| Money parsing in KPI strips | `parseFloat` | `toCents`/`fromCents`/`sumStrings` | Already in `src/lib/money.ts`; floating-point errors guaranteed without |
| Date grouping for timeline | `Date.toISOString().slice(0,10)` | `format(date, 'yyyy-MM-dd')` via `date-fns` | date-fns is already coming back via contribution-graph; reuse |
| Phone E.164 validation | Regex | `libphonenumber-js` (NOT included in `@diceui/phone-input`) | Only adopt if E.164 is a requirement; otherwise Dice's mask is sufficient |
| Heatmap cell intensity | Color array | `data-[level=N]:fill-...` Tailwind utilities | Kibo contribution-graph already uses this pattern; just override `--chart-2` or pass `colorScheme` if available |

**Key insight:** This phase's value is mostly in *consuming* already-curated registry components. The traps are (a) trusting plan slugs without verifying registry endpoints respond, and (b) re-implementing helpers that already exist in `src/lib/money.ts`, `src/lib/amortization.ts`, `src/utils/formatters.ts`.

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None affected — Phase 23 is UX + components; no schema rename, no key change | None |
| Live service config | None (no env-var change, no Vercel project-config change) | None |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts | `next/.next/` cache must be cleared after registry installs that change `components.json` (the components-aliases lookup is build-time). `node_modules/.cache/` cleared as well. | `rm -rf .next` after Phase 1 install only — Vercel preview deploys do this automatically |

Phase 23 is the rare phase where this audit is mostly N/A — but the Drizzle migration in Phase 3.3 (`0012_add_sort_index.sql`) requires `bun run db:deploy` and a manual verification (per CLAUDE.md gotcha: drizzle-kit's emitted SQL uses snake_case column references that must be hand-edited to camelCase).

## Common Pitfalls

### Pitfall 1: Plan slug doesn't exist
**What goes wrong:** `bunx shadcn@latest add @kibo-ui/timeline` fails with a 500 from the registry; CLI surfaces a confusing error.
**Why it happens:** Kibo dropped the timeline component (or never shipped it under that slug).
**How to avoid:** Pre-flight every slug with a `curl -sLI https://<registry>/r/<slug>.json | head -1` HTTP probe before committing the install to the PR. The slugs blocked TODAY are `@kibo-ui/timeline` (500) and `@diceui/kbd` (404).
**Warning signs:** Plan says "install" but no visible source in the search; CLI hangs or errors with HTML in the response body.

### Pitfall 2: React Compiler memoizes the kanban board out of existence
**What goes wrong:** Kanban renders once, drags work in the DOM but `onDragEnd` never fires the mutation; HEMS card visually returns to its column. No console error.
**Why it happens:** PR #87's exact bug — a child reading mutable state off a stable prop (`requests` array from `useQuery` is stable across React Query refetches because it's a referentially-equal cached value when nothing changed).
**How to avoid:** Add `'use no memo'` at the top of `HemsQueueBoard.tsx` if `bun run build` log shows `[Compiler bailout]` for the file, OR pass mutation handlers (not the parent's state) directly into props so the Compiler can't prove stability.
**Warning signs:** Local `bun test` passes (test runner doesn't run the Compiler), Vercel preview drag is silent, no DOM error.

### Pitfall 3: Origin UI components arrive with hard-coded colors
**What goes wrong:** Calendar variant ships with `bg-blue-500` instead of `bg-primary`; light-mode looks fine, dark mode looks broken.
**Why it happens:** Origin UI's legacy snapshot dates from before Tailwind v4; some variants may not be theme-aware.
**How to avoid:** After every install, grep the new file for `bg-\[#`, `text-\[#`, and `bg-(red|green|blue|yellow|amber|sky|emerald|gray|slate)-\d+`. Any match → patch to the corresponding `var(--*)` before committing. (Already required by plan §"Constraints (locked)".)
**Warning signs:** Light/dark/high-contrast toggle reveals broken color contrast on the new component but not elsewhere.

### Pitfall 4: `ThemeProvider` import without mount
**What goes wrong:** A registry component imports `useTheme()` from `next-themes` or our local provider; runtime throws "useTheme must be used within a ThemeProvider".
**Why it happens:** `src/components/theme-provider.tsx` exists but is NOT mounted in `src/app/layout.tsx` (verified). It's an orphan today.
**How to avoid:** Grep every installed file for `useTheme` and `next-themes`. If any hits, mount `<ThemeProvider>` in `src/app/layout.tsx` before merging. (Confirmed clean for all 8 Kibo slugs verified by direct JSON inspection; verify Dice + Origin variants at install time.)
**Warning signs:** Console: `Error: useTheme must be used within a ThemeProvider`.

### Pitfall 5: Bundle budget creep from `date-fns`
**What goes wrong:** `date-fns` was removed in CLEAN-02 and now returns via 3 components (contribution-graph, gantt, calendar). Bundle delta exceeds 30 KB if the tree-shake doesn't work.
**Why it happens:** Some date-fns helpers (e.g., the locale system) prevent shaking.
**How to avoid:** Run `bun run build:analyze` after Phase 1 install and compare gzipped delta. If `date-fns` shows >10 KB, audit imports — the registry components are documented to use the modular subset.
**Warning signs:** Bundle analyzer shows `node_modules/date-fns/locale/*` chunks.

### Pitfall 6: Drizzle migration applies snake_case columns
**What goes wrong:** `drizzle-kit generate` emits `ADD COLUMN "sort_index"` but the schema persists as `"sortIndex"` (camelCase). Migration partially applies, leaves DB in a broken state.
**Why it happens:** Documented codebase gotcha in CLAUDE.md.
**How to avoid:** Hand-edit the generated `drizzle/0012_*.sql` to camelCase BEFORE running `db:migrate`. Verify with `cat` against the schema definition.
**Warning signs:** `drizzle-kit migrate` exits with code 1 and no message (per `MEMORY.md`, use `getClient()` + raw SQL via postgres.js to surface the real error).

## Code Examples

### KpiStrip composition (Phase 1.3, locked)

```tsx
// src/components/kpi-strip.tsx (sketch)
import { LineChart, Line } from 'recharts'  // already a dep (recharts 3.8.1)
import { SummaryCard } from '@/components/summary-card'

export interface KpiStripItem {
  label: string
  value: string | number
  delta?: { value: number; label: string }
  sparklineSeries?: number[]
}

export function KpiStrip({ data }: { data: KpiStripItem[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {data.map((item) => (
        <SummaryCard
          key={item.label}
          title={item.label}
          value={item.value}
          trend={item.delta ? {
            value: item.delta.value,
            isPositive: item.delta.value >= 0,
          } : undefined}
        >
          {item.sparklineSeries && (
            <LineChart
              width={64} height={16}
              data={item.sparklineSeries.map((v, i) => ({ i, v }))}
            >
              <Line
                type="monotone" dataKey="v" stroke="var(--primary)"
                dot={false} strokeWidth={1.5}
              />
            </LineChart>
          )}
        </SummaryCard>
      ))}
    </div>
  )
}
// Note: SummaryCard does NOT currently accept children. Either:
//   (a) extend SummaryCard with an optional `accessory?: ReactNode` slot, OR
//   (b) compose KpiStrip out of <Card>/<CardContent> directly (don't reuse SummaryCard).
// Recommended: (a) — keeps SummaryCard as the canonical KPI tile.
// Source: src/components/summary-card.tsx (lines 1-64) shows current shape.
```

### Activity timeline (replacement for missing @kibo-ui/timeline)

```tsx
// src/components/activity-timeline.tsx (sketch — Phase 2.2)
'use client'
import { format, parseISO } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const ACTION_COLOR = {
  INSERT: 'bg-success',
  UPDATE: 'bg-primary',
  DELETE: 'bg-destructive',
} as const

export function ActivityTimeline({ entries }: { entries: ActivityLog[] }) {
  const grouped = Object.entries(
    entries.reduce<Record<string, ActivityLog[]>>((acc, e) => {
      const day = format(parseISO(e.createdAt), 'yyyy-MM-dd')
      ;(acc[day] ??= []).push(e)
      return acc
    }, {}),
  ).sort(([a], [b]) => b.localeCompare(a))

  return (
    <div className="space-y-6">
      {grouped.map(([day, items]) => (
        <section key={day}>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            {format(parseISO(day), 'EEEE, MMM d')}
          </h3>
          <ol className="relative border-l border-border pl-4 space-y-2">
            {items.map((e) => (
              <li key={e.id} className="relative">
                <span className={`absolute -left-[1.4rem] top-1.5 h-2 w-2 rounded-full ${ACTION_COLOR[e.action]}`} />
                <Card>
                  <CardContent className="py-2 px-3 flex items-center gap-3 text-sm">
                    <Badge variant="outline">{e.action}</Badge>
                    <span className="font-mono text-xs text-muted-foreground">
                      {e.tableName}#{e.recordId}
                    </span>
                    <span className="text-muted-foreground">{e.changedBy}</span>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}
// activityLog payload shape — verified against db/schema.ts lines 267-317:
//   id, tableName, recordId, action ('INSERT'|'UPDATE'|'DELETE'),
//   oldValues (jsonb), newValues (jsonb), changedBy, createdAt
// For diff display: render JSON.stringify(oldValues) vs newValues in an
// expanded <Collapsible> per row.
```

### Batched payoff projections (Phase 2.3 — new tRPC procedure)

```typescript
// src/server/trpc/routers/liability.ts (addition — Phase 2.3)
payoffProjections: adminProcedure
  .input(z.object({ entityId: z.coerce.number() }))
  .query(async ({ input }) => {
    const liabs = await db.select().from(liability)
      .where(eq(liability.entityId, input.entityId))
    return liabs.map((l) => ({
      id: l.id,
      creditor: l.creditor,
      startDate: l.loanStartDate ?? l.createdAt,
      projection:
        !l.interestRate || l.isRevolvingCredit ? null :
        estimatePayoffDate(
          l.currentBalance ?? '0',
          l.interestRate,
          l.monthlyPayment ?? '0',
          l.escrowMonthly ?? undefined,
          l.loanStartDate ?? undefined,
        ),
    }))
  }),
// Source: estimatePayoffDate exists in src/lib/amortization.ts lines 73-137.
//         Existing getPayoffProjection (line 270) does the same for ONE
//         liability; this is the batched variant for the Gantt's per-row bars.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `npx shadcn-ui@latest add` | `bunx shadcn@latest add` (no `-ui`) | shadcn 2.0 (2024) | All install commands; we're already on the new form |
| Single `style: "default"` registry | Namespaced `registries` block with `{name}` placeholder | shadcn 3.0 (2024) | Our `components.json` doesn't have the block yet; this phase adds it |
| Origin UI as standalone project | Origin UI is "legacy snapshot" under Cal.com's `coss.com/ui` | 2025/2026 acquisition | Active work moves to coss/ui particles; legacy snapshot still installable |
| Tremor for KPI components | Recharts wrapped in `chart.tsx` | Trust-admin pre-decision | Plan §"Anti-recommendations" — do NOT install Tremor |
| Hand-rolled drag with HTML5 DnD | `@dnd-kit` ecosystem | dnd-kit replaced react-dnd ~2022 | Kanban + sortable + gantt all on dnd-kit |
| `motion` (former framer-motion) | Optional; some Kibo components use it | Late 2024 rebrand | None of Phase 23's selected components import it — verified |
| `next-themes` for theme detection | App-local `ThemeProvider` in `src/components/theme-provider.tsx` (unmounted) | PR #90 hardened but did not wire up | If any installed component imports `next-themes`, mount the local provider |

**Deprecated/outdated:**
- `npx shadcn-ui` — use `bunx shadcn@latest` (no `-ui` suffix).
- `pnpm dlx shadcn` — works, but project standard is `bun` per CLAUDE.md.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Origin UI's `https://originui.com/r/legacy/{name}.json` is the registry path the shadcn CLI uses (the URL returns HTML to browser/curl but JSON to the CLI via content negotiation) | Standard Stack | Install fails; fallback is `bunx shadcn@latest add <full-URL>` from each component's page on originui.com |
| A2 | `bunx shadcn@latest add @kibo-ui/<slug>` honors the `target` field in the registry JSON, so files land at `src/components/kibo-ui/<slug>/index.tsx`. The plan says "all registry components land in `src/components/ui/`" — this is FALSE for Kibo | Per-component registry table; Anti-patterns | Plan's grep audit ("OKLCH preservation") looks in wrong dir; misses Kibo files |
| A3 | `bun run build` will surface React Compiler bailouts in the build log (as in PR #87) | Pitfall 2 | If silent, switch to `next build --debug` or check Vercel preview |
| A4 | The `+120 KB gzipped` budget is whole-app, not per-route | Bundle cost projection | If per-route, kanban + gantt together can saturate it; route-split via dynamic import |
| A5 | Schema's `trustee.order` (NOT NULL integer, line 1925) is the canonical sort column; Phase 3.3 should reuse it rather than add parallel `sortIndex` | Pattern 3: Migration | If parallel `sortIndex` is required for naming consistency with `beneficiary`, double-column reads in the router |
| A6 | The plan's intent for HEMS APPROVED→DISTRIBUTED is a new `trpc.hemsRequest.markDistributed` mutation; there is no such mutation today and no `markDistributed` references in the codebase | Pattern 2; Common Pitfalls | If the user meant "auto-distribute on `distribution.update`", the kanban handler needs to call a different endpoint |
| A7 | Reintroducing `date-fns` (removed in CLEAN-02) is acceptable since 3 registry components require it | Bundle cost projection | If `date-fns` is forbidden, hand-roll the few helpers OR pick alternative libs (`dayjs` ~2 KB) |

## Open Questions

1. **Does the shadcn CLI correctly content-negotiate JSON from `originui.com/r/legacy/{name}.json`?**
   - What we know: the URL returns HTML to curl/browser; the shadcn directory page lists Origin UI as installable; recent posts use this exact URL form.
   - What's unclear: whether bun's `bunx shadcn@latest add @originui/<slug>` works as cleanly as `bunx shadcn@latest add https://originui.com/r/legacy/<slug>.json`.
   - Recommendation: **prefer direct-URL install for the 1–2 Origin UI variants we pick**. Skip the `@originui` namespace entry in `components.json` if it causes confusion; direct URL is supported by every shadcn CLI version.

2. **What's the activity heatmap palette?**
   - What we know: kibo contribution-graph uses `data-[level=N]:fill-muted-foreground/X0` by default → renders as 5 shades of grey.
   - What's unclear: plan §2.2 specifies "color stops via OKLCH variables" but doesn't say *which* — green (success) is the GitHub idiom but our `--chart-2` (green) is reserved for charts.
   - Recommendation: override via className: `data-[level=1]:fill-chart-2/20 data-[level=2]:fill-chart-2/40 …` so it tracks the green chart token in both modes.

3. **`@diceui/combobox` pulls the FULL @dnd-kit suite (for reorderable selected chips). Is that feature used?**
   - What we know: Phase 1.2 calls for combobox as "multi-select / search-as-you-type" — reorderable chips is a bonus, not a requirement.
   - What's unclear: whether the plan accepts the +20 KB cost just for the multi-select.
   - Recommendation: install kibo kanban first (which also pulls dnd-kit). Then combobox is "free" — its dnd-kit deps are already paid for.

4. **Should Phase 3.4's stepper wizard run as PR-E even if PR-D ships the rest of polish?**
   - What we know: plan marks PR-E as "optional".
   - What's unclear: whether "asset creation single-page form" is genuinely worse than a wizard, given the existing `useResourceForm` is well-tuned.
   - Recommendation: **defer PR-E** unless the user reasserts. The remaining 4 PRs (1, A, B, C, D) cover the headline wins; a wizard adds form-state complexity for marginal UX gain.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `bunx` (shadcn CLI runner) | All Phase 23 installs | ✓ | bun runtime, current | — |
| `shadcn` package (registry CLI) | All installs | n/a (fetched per-invocation) | latest | — |
| `bun run db:deploy` (drizzle-kit migrate) | Phase 3.3 | ✓ | drizzle-kit 0.31.10 | — |
| `recharts` | Sparklines, donuts | ✓ | 3.8.1 | — |
| `@radix-ui/react-avatar` | `@kibo-ui/avatar-stack` | ✓ | 1.1.11 | — |
| `lucide-react` | Most registry components | ✓ | 1.14.0 | — |
| Internet at install time | All registry fetches | ✓ | — | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies introduced by Phase 23 installs (transitively):**
- `@dnd-kit/core` 6.3.1 — 13.9 KB gz — kanban, sortable, gantt, combobox
- `@dnd-kit/sortable` 10.0.0 — 3.6 KB gz — kanban, sortable
- `@dnd-kit/modifiers` 9.0.0 — 0.9 KB gz — gantt, sortable
- `@dnd-kit/utilities` 3.2.2 — 1.5 KB gz — shared
- `date-fns` 4.2.1 — 17 KB gz un-shaken — gantt, contribution-graph, calendar variants (re-introduces CLEAN-02 removal)
- `jotai` 2.20.0 — 3.8 KB gz — kibo gantt only
- `react-dropzone` 15.0.0 — 15.9 KB gz — kibo dropzone
- `tunnel-rat` 0.1.2 — 1.1 KB gz — kibo kanban
- `@uidotdev/usehooks` 2.4.1 — ~5 KB gz est — kibo gantt
- `lodash.throttle` 4.1.1 — <1 KB gz — kibo gantt
- `@diceui/combobox` 1.2.2, `@diceui/tags-input` 0.7.2 — own npm packages

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `bun test` (unit/component/api/trpc) + `@playwright/test` 1.59.1 (E2E) |
| Config file | `package.json` test scripts (no separate jest.config) + `playwright.config.ts` (assumed; standard project structure) |
| Quick run command | `bun test --bail --timeout 30000 tests/components/<file>.test.tsx` |
| Full suite command | `bun test --timeout 30000 tests/api tests/components tests/lib tests/trpc tests/*.test.ts` |

### Phase Requirements → Test Map

| Req | Behavior | Test Type | Automated Command | File Exists? |
|-----|----------|-----------|-------------------|--------------|
| Plan §1.1 | `components.json` has 3 registries block | smoke | `node -e "console.log(JSON.parse(require('fs').readFileSync('components.json')).registries)"` | ❌ Wave 0 |
| Plan §1.3 | `KpiStrip` renders array of items with correct labels | unit | `bun test tests/components/kpi-strip.test.tsx` | ❌ Wave 0 |
| Plan §1.3 | `PageHeader` renders title + breadcrumb + actions | unit | `bun test tests/components/page-header.test.tsx` | ❌ Wave 0 |
| Plan §2.1 | Kanban drag PENDING→APPROVED fires `approve` mutation | integration | `bun test tests/trpc/hemsRequest.test.ts` (extend) + Playwright `tests/e2e/hems-queue.kanban.e2e.ts` | partial — `hems-queue` E2E may not exist |
| Plan §2.2 | Activity timeline groups by day | unit | `bun test tests/components/activity-timeline.test.tsx` | ❌ Wave 0 |
| Plan §2.2 | Contribution heatmap renders 30-day grid | unit | same file | ❌ Wave 0 |
| Plan §2.3 | `liability.payoffProjections` returns one entry per liability | trpc | `bun test tests/trpc/liability.test.ts` (extend) | partial |
| Plan §2.3 | Debt-to-equity donut sums correctly via `sumStrings` | unit | `bun test tests/components/debt-to-equity-donut.test.tsx` | ❌ Wave 0 |
| Plan §2.5 | KPI strip appears above each of 10 list pages | E2E | `bun test:e2e tests/e2e/kpi-strips.e2e.ts` | ❌ Wave 0 |
| Plan §3.1 | Bulk-action toolbar visible iff selection > 0 | unit | `bun test tests/components/data-table-bulk-actions.test.tsx` | ❌ Wave 0 |
| Plan §3.1 | CSV export respects current filters | unit | `bun test tests/components/data-table-export.test.tsx` | ❌ Wave 0 |
| Plan §3.2 | `/settings` Card groups render correctly | E2E | `tests/e2e/admin-misc.e2e.ts` (extend) | ✓ |
| Plan §3.3 | `sortIndex` migration applies cleanly to test branch | manual | `DATABASE_URL=<test-branch> bun run db:deploy` | n/a — runtime only |
| Plan §3.3 | Sortable order persists across page reload | E2E | `bun test:e2e tests/e2e/trustees-sortable.e2e.ts` | ❌ Wave 0 |
| Plan §3.4 | Stepper wizard collects same payload as single-page form | integration | `bun test tests/trpc/asset-wizard.test.ts` | ❌ Wave 0 (only if PR-E ships) |

### Sampling Rate

- **Per task commit:** `bun test --bail tests/components/<changed-file>.test.tsx` (under 5 sec)
- **Per wave merge:** Full unit suite (`bun test`) — baseline 910 tests, expected to grow to ~960
- **Phase gate:** Full unit suite + Playwright E2E green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/components/kpi-strip.test.tsx` — covers KpiStrip rendering + delta formatting
- [ ] `tests/components/page-header.test.tsx` — covers PageHeader slots
- [ ] `tests/components/activity-timeline.test.tsx` — covers timeline grouping logic
- [ ] `tests/components/data-table-bulk-actions.test.tsx` — covers bulk-action visibility
- [ ] `tests/components/data-table-export.test.tsx` — covers CSV escape/format
- [ ] `tests/e2e/hems-queue.kanban.e2e.ts` — covers kanban drag-to-approve (plan §2.6 calls this out explicitly)
- [ ] `tests/e2e/trustees-sortable.e2e.ts` — covers Phase 3.3 reorder persistence

## Project Constraints (from CLAUDE.md)

The planner MUST verify each PR's diff against these directives:

| Directive | Where it applies |
|-----------|------------------|
| **Bun, not npm/node/npx.** Use `bunx shadcn@latest add ...`, `bun run db:deploy`, `bun test`, `bun run build`. | Every install command, every test run |
| **`db:push` is forbidden** — uses `drizzle-kit push` which corrupts RLS. Use `db:deploy` for Phase 3.3 migration. | Phase 3.3 |
| **Money fields are strings.** Use `formatMoney`/`sumStrings`/`toCents`/`fromCents` from `src/lib/money.ts`. | All KPI strips, donuts, gantt amounts |
| **Postgres columns are camelCase.** Hand-edit drizzle-kit's generated SQL to convert any snake_case column references. | Phase 3.3 migration |
| **Every tRPC `list`/`byId`/`update`/`delete` requires `entityId`** in input + WHERE clause. | New `payoffProjections`, `markDistributed`, `trustee.reorder`, `beneficiary.reorder` |
| **Never work directly on `main`.** Every PR on a feature branch via the standard review workflow (self-review → reviewer agent → merge commit). | All 5 PRs in Phase 23 |
| **No `confirm()` — use `ConfirmDialog`.** | Bulk-delete in DataTable bulk-action toolbar |
| **`selectedEntity` gating.** All queries use `{ enabled: !!selectedEntity }`. | All new client queries |
| **OKLCH theme tokens must not regress.** Grep new files for `bg-\[#`, `text-\[#`, `bg-(red|green|...)-\d+` after every install. | Every Phase 1.2 + Phase 2 install |
| **React Compiler is on (`reactCompiler: true`).** Watch for bailouts; opt out with `'use no memo'` per PR #87. | Kanban, sortable, gantt, any component reading mutable state off stable props |
| **`ThemeProvider` is unmounted today.** If any installed component imports `useTheme()`/`next-themes`, mount it in `src/app/layout.tsx` first. | After every Phase 1.2 install — grep new file |
| **CSS column convention is camelCase via `t.text()` etc.** Reuse, don't rename. | Phase 3.3 schema change |
| **Bundle budget: < +120 KB gz total.** Verify via `bun run build:analyze`. | Phase 1 + 2 + 3 cumulative |

## Sources

### Primary (HIGH confidence)
- `https://www.kibo-ui.com/r/kanban.json` — direct JSON inspection (HTTP 200, dependencies array, file targets verified)
- `https://www.kibo-ui.com/r/gantt.json` — same (no framer-motion, no hard-coded colors)
- `https://www.kibo-ui.com/r/contribution-graph.json` — same (uses `data-[level=N]:fill-muted-foreground/N0`)
- `https://www.kibo-ui.com/r/avatar-stack.json` — same (1.1 KB, no deps)
- `https://www.kibo-ui.com/r/dropzone.json` — same (react-dropzone dep)
- `https://www.kibo-ui.com/r/timeline.json` — HTTP 500 confirmed timeline DOES NOT EXIST
- `https://www.diceui.com/r/{combobox,sortable,tags-input,phone-input,mask-input,stepper,listbox}.json` — HTTP 200 + JSON dependencies inspected
- `https://www.diceui.com/r/kbd.json` — HTTP 404 confirmed kbd DOES NOT EXIST
- `https://github.com/sadmann7/diceui/blob/main/docs/content/docs/components/radix/sortable.mdx` — install command snippet: `npx shadcn@latest add @diceui/sortable`
- `https://ui.shadcn.com/docs/registry/namespace` — namespaces / `registries` block / `{name}` placeholder spec
- `/Users/richard/Developer/trust-admin/db/schema.ts` lines 267-317 (activityLog), 921-1010 (beneficiary), 1915-1977 (trustee — has `order` integer NOT NULL), 2245-2356 (liability)
- `/Users/richard/Developer/trust-admin/src/lib/amortization.ts` lines 73-137 (`estimatePayoffDate`)
- `/Users/richard/Developer/trust-admin/src/server/trpc/routers/{hemsRequest.ts,liability.ts,trustee.ts,activityLog.ts}` — full router shapes
- `/Users/richard/Developer/trust-admin/next.config.ts` line 58 (`reactCompiler: true`)
- `/Users/richard/Developer/trust-admin/package.json` — verified all peer-dep versions in place

### Secondary (MEDIUM confidence)
- `https://www.shadcn.io/awesome/item/kibo-ui` — confirms registries syntax `{ "@kibo-ui": "https://www.kibo-ui.com/r/{name}.json" }`
- `https://github.com/origin-space/originui` (README) — confirms Cal.com acquisition / legacy snapshot status
- WebSearch result citing `pnpm dlx shadcn@latest add https://originui.com/r/legacy/comp-01.json` — confirms legacy URL prefix
- PR #87 (`gh pr view 87`) — confirms React Compiler bailout pattern + `'use no memo'` escape hatch
- bundlephobia.com sizes for individual deps (verified 2026-05-19)

### Tertiary (LOW confidence)
- Origin UI URL pattern in `components.json` `registries` block — server returns HTML to curl; works for shadcn CLI per docs/search results but not verified end-to-end in this session. **Mitigation: install via direct URL form instead of namespace if the CLI errors.**

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — every Kibo + Dice slug verified by direct registry JSON inspection
- Architecture: **HIGH** — schema, routers, and amortization helpers read directly from source
- Pitfalls: **HIGH** — pitfalls 1–3 derived from this-session probes; pitfall 4 (ThemeProvider) verified by grep; pitfall 5–6 from CLAUDE.md + MEMORY.md
- Origin UI install path: **MEDIUM** — namespace URL pattern documented but not verified end-to-end against the live registry from this session
- Bundle delta: **MEDIUM** — bundlephobia gives min+gz for most deps; `@diceui/*`, `@uidotdev/usehooks`, `tunnel-rat`, `lodash.throttle` were missing from bundlephobia, estimated

**Research date:** 2026-05-19
**Valid until:** 2026-06-20 (30 days — Kibo/Dice/Origin registries are stable; only risk is component additions/removals)

---

## RESEARCH COMPLETE — Key Findings

1. **Two locked slugs do not exist** in their registries today: `@kibo-ui/timeline` (HTTP 500) and `@diceui/kbd` (HTTP 404). Phase 1.2 and §2.2 plan items must substitute with hand-rolled components.
2. **Kibo UI lands at `src/components/kibo-ui/<slug>/index.tsx`, NOT `src/components/ui/`.** The plan's "all components land in src/components/ui/" assumption is wrong for the Kibo namespace. CLI obeys the `target` field in each registry JSON.
3. **`getPayoffProjection` already exists per-liability** in `liabilityRouter`. Phase 2.3's Gantt needs only a batched variant (`payoffProjections({entityId})`), not a new amortization helper. `src/lib/amortization.ts` already covers the math.
4. **`trustee.order` integer column already exists** (NOT NULL); plan §3.3 should reuse it rather than add `sortIndex` to the trustee table. Beneficiary genuinely needs a new column. Recommended hybrid: reuse `trustee.order`, add `beneficiary.sortIndex`.
5. **No registry component imports `framer-motion`, `motion`, or `next-themes`** — verified by direct source inspection of all 5 Kibo JSON payloads. `'use no memo'` may still be needed for the kanban consumer per PR #87's pattern, but not for the registry components themselves.
6. **Bundle delta is comfortably within the +120 KB budget** — worst-case projection ~70–95 KB gz with all primitives installed; `@dnd-kit` (~20 KB combined) is shared across 4 features.
7. **`@diceui/phone-input` has NO libphonenumber dep** — it's an input mask only. If E.164 validation is required, add `libphonenumber-js` separately (~75 KB gz).
8. **Origin UI is a legacy snapshot** (Cal.com acquired the project; active work is on `coss.com/ui` particles). Legacy components still installable via `https://originui.com/r/legacy/{name}.json`. Plan's URL pattern may need `/r/legacy/{name}.json` not `/r/{name}.json`.

**Ready for Planning.**
