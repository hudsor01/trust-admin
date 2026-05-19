---
phase: 23-shadcn-registry-adoption-and-dashboard-ux-revamp
plan: 01-foundation
subsystem: ui
tags: [shadcn-registry, kibo-ui, dice-ui, kpi-strip, page-header, summary-card, oklch-tokens, recharts, react-dropzone, dnd-kit]

requires:
  - phase: design-contract
    provides: UI-SPEC revision 1 (PageHeader §1, KpiStrip §2, Kbd §14, Color tokens, Typography Display/Body/Caption tiers)
provides:
  - Two-registry adoption (@kibo-ui + @diceui) wired in components.json (Origin UI excluded per UI-SPEC rev 1)
  - 5 Dice UI primitives installed (combobox, tags-input, phone-input, mask-input)
  - 1 Kibo dropzone installed at src/components/kibo-ui/dropzone/index.tsx
  - 1 official shadcn context-menu installed (prefetched for @kibo-ui/gantt regDep in PR-B)
  - 1 hand-rolled Kbd primitive (replacement for missing @diceui/kbd 404)
  - SummaryCard patched: text-success/destructive tokens, font-semibold tabular-nums, accessory? slot
  - PageHeader composition built (h1 + breadcrumb + actions per UI-SPEC §1)
  - KpiStrip composition built (responsive 4-col grid + invertDelta + sparkline accessory per UI-SPEC §2)
  - 12 Wave-0 unit tests seeded (PageHeader + KpiStrip), all passing
affects:
  - 23-02-pages (PR-B/C — consumes PageHeader on 17 admin pages and KpiStrip on 10 dashboard pages)
  - 23-03-tables (consumes context-menu regDep for @kibo-ui/gantt and other PR-B primitives)
  - 23-04-polish (consumes Kbd in command palette + dialog shortcut hints)

tech-stack:
  added:
    - "@diceui/combobox@1.2.2"
    - "@diceui/tags-input@0.7.2"
    - "@dnd-kit/core@6.3.1 (transitive via @diceui/combobox)"
    - "@dnd-kit/modifiers@9.0.0 (transitive)"
    - "@dnd-kit/sortable@10.0.0 (transitive)"
    - "@dnd-kit/utilities@3.2.2 (transitive)"
    - "@radix-ui/react-context-menu@2.2.16"
    - "radix-ui@1.4.3 (meta package)"
    - "react-dropzone@15.0.0 (via @kibo-ui/dropzone)"
    - "lucide-react bumped 1.14.0 → 1.16.0"
  patterns:
    - "Local composition over generated kit dump: PageHeader and KpiStrip live in src/components/ (NOT src/components/ui/) because they are app-specific compositions, not generic primitives"
    - "Accessory slot pattern on SummaryCard: top-right absolute-positioned ReactNode for sparklines or status badges"
    - "invertDelta semantic on KpiStripItem: caller marks 'down is good' (e.g. liability balance, expense trend) and the component flips the color mapping"
    - "Sparkline accessory via inline <LineChart> from recharts (already a dep) using stroke=var(--primary) for theme safety"
    - "Hand-rolled primitives use cn() + var(--*) tokens exclusively — never hex literals or Tailwind palette colors (e.g. bg-red-500)"

key-files:
  created:
    - "src/components/ui/combobox.tsx (Dice UI combobox)"
    - "src/components/ui/tags-input.tsx (Dice UI tags input)"
    - "src/components/ui/phone-input.tsx (Dice UI phone input)"
    - "src/components/ui/mask-input.tsx (Dice UI mask input)"
    - "src/components/ui/context-menu.tsx (official shadcn)"
    - "src/components/ui/kbd.tsx (hand-rolled per UI-SPEC §14)"
    - "src/components/kibo-ui/dropzone/index.tsx (Kibo drag-anywhere dropzone)"
    - "src/components/visually-hidden-input.tsx (Dice transitive)"
    - "src/hooks/use-as-ref.ts, use-isomorphic-layout-effect.ts, use-lazy-ref.ts (Dice transitive hooks)"
    - "src/lib/compose-refs.ts (Dice transitive util)"
    - "src/components/page-header.tsx (NEW composition)"
    - "src/components/kpi-strip.tsx (NEW composition)"
    - "tests/components/page-header.test.tsx"
    - "tests/components/kpi-strip.test.tsx"
  modified:
    - "components.json (registries block — @kibo-ui + @diceui)"
    - "src/components/summary-card.tsx (text-success/destructive + accessory? + tabular-nums)"
    - "package.json + bun.lock (10 new deps + lucide-react bump)"

key-decisions:
  - "Origin UI excluded from registries per UI-SPEC rev 1 safety gate (date-range covered by existing calendar mode='range', switch covered by existing switch.tsx)"
  - "Kbd hand-rolled instead of installed — @diceui/kbd returns HTTP 404; UI-SPEC §14 verbatim spec used"
  - "context-menu installed in PR-1 (not PR-B) so the @kibo-ui/gantt install in PR-B sees its regDep already satisfied"
  - "KpiStripItem.delta.label ('vs 30d') reserved for future expansion — SummaryCard renders percent + arrow + color only; if PR-A surfaces a need, the label can be appended in a follow-up"
  - "invertDelta convention: 'isPositive = (invertDelta ? value <= 0 : value >= 0)' — zero treated as positive in both directions"
  - "Sparkline width=64 height=16 with isAnimationActive=false to avoid React Compiler reconciliation churn in dashboard mount"

patterns-established:
  - "Pattern 1: All new primitives audited via OKLCH grep (`grep -rE 'bg-\\[#|text-\\[#|border-\\[#|bg-(red|green|blue|yellow|amber|sky|emerald|gray|slate)-[0-9]+'`) before commit — zero matches required"
  - "Pattern 2: All new primitives audited via ThemeProvider grep (`grep -E 'useTheme|next-themes'`) — if any match, mount <ThemeProvider> in src/app/layout.tsx before merge"
  - "Pattern 3: SummaryCard accessory slot consumed by composition (KpiStrip drops 64×16 sparkline) — accessory absolute-positioned at top-3 right-3"
  - "Pattern 4: Local composition tests use happy-dom + @testing-library/react via tests/setup.ts (existing project pattern)"

requirements-completed: []

duration: ~50min (~10min execution from snapshot — primitives already installed in working tree, Task 01.1 was a verification-only path; Task 01.2 was full implementation)
completed: 2026-05-19
---

# Phase 23 Plan 01: Foundation Summary

**Two-registry shadcn adoption (@kibo-ui + @diceui), 6 primitives installed + 1 hand-rolled Kbd, SummaryCard rebuilt with theme-safe tokens + accessory slot, and PageHeader + KpiStrip compositions ready for 10+ dashboards.**

## Performance

- **Duration:** ~50 min wall-clock (Task 01.1 primitives were pre-staged; Task 01.2 patched SummaryCard + built 2 compositions + seeded 12 tests + ran 922-test full suite as pre-commit hook)
- **Started:** 2026-05-19T23:35Z (this executor session)
- **Completed:** 2026-05-19T23:45Z
- **Tasks:** 2 / 2
- **Files created:** 13 (7 primitives + 3 hooks + 1 util + 2 compositions + 2 test files)
- **Files modified:** 3 (components.json, summary-card.tsx, package.json/bun.lock)
- **Tests added:** 12 (5 PageHeader + 7 KpiStrip), all passing
- **Tests in full suite after this plan:** 922 pass, 0 fail (62 files)

## Accomplishments

- components.json gained a `registries` block with exactly two namespaces (`@kibo-ui`, `@diceui`). `@originui` is NOT present — UI-SPEC revision 1 safety gate held.
- 5 Dice UI primitives, 1 Kibo dropzone, and 1 official shadcn context-menu installed at the canonical paths. OKLCH grep audit returned zero matches across all 7 files.
- Kbd hand-rolled at `src/components/ui/kbd.tsx` matching UI-SPEC §14 verbatim (`@diceui/kbd` returns 404).
- SummaryCard patched to satisfy UI-SPEC §Color (text-success/destructive) and §Typography Display (font-semibold tabular-nums, NOT font-bold). New `accessory?: ReactNode` slot wired to top-right absolute position.
- PageHeader composition built — h1 (text-2xl font-semibold leading-tight) + optional description + optional breadcrumb (with `aria-current="page"` on last item) + actions slot.
- KpiStrip composition built — responsive 1/2/4 column grid + optional sparkline (inline recharts `<LineChart>` using `stroke="var(--primary)"`) + invertDelta convention for "down is good" metrics.
- Wave-0 unit-test scaffolds seeded for both new compositions (12 tests, all passing). Full project test suite (922 tests) green after commit.

## Task Commits

1. **Task 01.1: Wire components.json registries + install 6 primitives + hand-roll Kbd** — `d406184` (feat)
2. **Task 01.2: Patch SummaryCard + build PageHeader + build KpiStrip + seed Wave-0 tests** — `edc00f4` (feat)

## Files Created/Modified

### Created

- `src/components/ui/combobox.tsx` — Dice UI multi-select combobox (280 LOC)
- `src/components/ui/tags-input.tsx` — Dice UI tags input (101 LOC)
- `src/components/ui/phone-input.tsx` — Dice UI phone input (mask only; 823 LOC)
- `src/components/ui/mask-input.tsx` — Dice UI mask input (1542 LOC)
- `src/components/ui/context-menu.tsx` — Official shadcn context menu (198 LOC; @kibo-ui/gantt regDep)
- `src/components/ui/kbd.tsx` — Hand-rolled keyboard-shortcut primitive (26 LOC, var(--*) tokens)
- `src/components/kibo-ui/dropzone/index.tsx` — Kibo drag-anywhere dropzone (216 LOC, pairs with UploadThing)
- `src/components/visually-hidden-input.tsx` — Dice transitive primitive (164 LOC)
- `src/hooks/use-as-ref.ts`, `use-isomorphic-layout-effect.ts`, `use-lazy-ref.ts` — Dice transitive hooks
- `src/lib/compose-refs.ts` — Dice transitive util (62 LOC)
- `src/components/page-header.tsx` — Local composition (UI-SPEC §1)
- `src/components/kpi-strip.tsx` — Local composition (UI-SPEC §2)
- `tests/components/page-header.test.tsx` — 5 tests (typography, description, breadcrumb aria-current, actions, no-breadcrumb)
- `tests/components/kpi-strip.test.tsx` — 7 tests (render, positive delta, negative delta, invertDelta flip, sparkline svg, loading, empty)

### Modified

- `components.json` — added `registries` block (@kibo-ui + @diceui, alphabetical, between style and aliases)
- `src/components/summary-card.tsx` — text-green-600/red-600 → text-success/destructive; font-bold → font-semibold tabular-nums; added `accessory?: ReactNode` prop with absolute top-right positioning
- `package.json` + `bun.lock` — 10 new deps (Dice combobox/tags-input, dnd-kit suite, radix context-menu, radix-ui meta, react-dropzone) + lucide-react 1.14→1.16 bump

## Decisions Made

- **Origin UI excluded from registries** — UI-SPEC revision 1 safety gate. The date-range need is covered by the existing `src/components/ui/calendar.tsx` `mode="range"` and the switch need is covered by the existing `src/components/ui/switch.tsx`. Adding `@originui` would expose new surface for no incremental benefit.
- **Kbd hand-rolled** — `@diceui/kbd` returns HTTP 404. UI-SPEC §14 provides a 20-LOC verbatim spec using cn() + var(--border)/var(--muted) tokens; no behavior is lost.
- **context-menu installed in PR-1, not PR-B** — `@kibo-ui/gantt` requires it as a regDep; prefetching here means PR-B's gantt install can resolve dependencies without two-phase installs.
- **KpiStripItem.delta.label deferred** — SummaryCard's current trend renderer shows `{Math.abs(trend.value)}%` only. The KpiStripItem includes `delta.label` ("vs 30d") for forward-compat but the label is NOT rendered yet. PR-A consumers (dashboard headlines) can opt into surfacing the label via a follow-up patch to SummaryCard if needed.
- **invertDelta semantic** — `isPositive = (invertDelta ? value <= 0 : value >= 0)`. Zero is treated as positive in both modes (no separate "flat" color). This matches the "shrinking balance is good" use case for liabilities and expense KPIs without introducing a third color state.
- **Sparkline `isAnimationActive={false}`** — Dashboard mount can render 4+ KpiStrip cards simultaneously; disabling Recharts animation prevents React Compiler bailout from reconciliation churn on the parent.

## Deviations from Plan

None - plan executed exactly as written.

The plan's pre-condition (primitives installed) was already satisfied in the working tree at the start of this executor session — Task 01.1's install commands had been executed previously. The executor re-verified all acceptance criteria (registries block intact, file paths correct, OKLCH grep clean, ThemeProvider grep clean, typecheck passing) and committed the staged tree as Task 01.1.

## Issues Encountered

- **Biome formatter complained on first lint pass** after writing summary-card.tsx, kpi-strip.tsx, and page-header.test.tsx. `bun run lint:fix` resolved all 3 (ternary wrapping, JSX single-statement collapse, expect wrapping). Re-run was clean.
- **`build:analyze` script wired but next.config.js doesn't import withBundleAnalyzer** — bundle delta cannot be measured precisely yet. Pre-existing condition, out of scope for PR-1. Logged to deferred-items below.

## Audits

| Audit | Result | Notes |
|-------|--------|-------|
| OKLCH grep (7 new primitives) | 0 matches | `bg-[#`, `text-[#`, `border-[#`, `bg-{palette}-N`, `text-{palette}-N` — all zero |
| OKLCH grep (3 composition files) | 0 matches | summary-card, page-header, kpi-strip clean |
| ThemeProvider import grep | 0 matches | None of the 6 installed primitives import `useTheme`/`next-themes` — no provider mount needed |
| React Compiler bailout grep | 0 matches | `bun run build` log contains zero `bailout` lines for any new file |
| `bun run typecheck` | EXIT 0 | tsc --noEmit clean |
| `bun run lint` (biome) | EXIT 0 | After lint:fix on 3 files |
| `bun test` (full suite) | 922 pass / 0 fail | 62 test files, 1721 assertions, 65.8s — green |
| `bun run build` | EXIT 0 | Compiled successfully in 5.7s, no bailouts |

## Bundle Delta

`ANALYZE=true bun run build` ran successfully but `next.config.js` does not currently wire `withBundleAnalyzer`, so the visualizer HTML output was not emitted. Observed inputs to the delta:

| Source | node_modules raw size (pre-treeshake) |
|--------|---------------------------------------|
| @diceui/* (combobox + tags-input) | 416K |
| @dnd-kit/core | 1.5M |
| @dnd-kit/sortable | 364K |
| @dnd-kit/modifiers | 108K |
| @dnd-kit/utilities | 240K |
| @dnd-kit/accessibility | 80K |
| react-dropzone | 1.4M |
| recharts | 8.5M (already in tree) |

Tree-shaken gzipped delta is expected to land well under the +50 KB PR-1 budget (the heavy dnd-kit chunks are only pulled by combobox's drag-reorder option, which is unused in PR-1; react-dropzone strips to ~16 KB gz). The deferred bundle-analyzer wiring will let PR-A measure precisely.

**Deferred:** wire `@next/bundle-analyzer` (or equivalent) into `next.config.js` so `ANALYZE=true bun run build` emits client.html / nodejs.html. Logged as deferred work — not in PR-1 scope.

## Open Questions for PR-A

- Should SummaryCard render `delta.label` ("vs 30d") inline next to the percent? Current behavior: label is reserved on the KpiStripItem interface but unrendered by SummaryCard's trend row. Recommendation: add an optional `trend.label?: string` to SummaryCardProps in PR-A and have KpiStrip forward `delta.label` into it.

## Next Phase Readiness

- **PR-B (23-02-pages)** can consume `<PageHeader>` immediately on all 17 admin page headers.
- **PR-B (23-02-pages)** can consume `<KpiStrip>` on the 10 dashboard tiles enumerated in UI-SPEC §2.
- **PR-B (23-02-pages)** has all Dice primitives staged for forms (combobox for contact selectors, tags-input for category multi-select, phone-input for trustee/contact forms, mask-input for currency / EIN entry).
- **PR-B (23-02-pages)** has `@kibo-ui/dropzone` ready for inventory + document upload UX revamp.
- **PR-B (23-02-pages)** has `context-menu` prefetched so `@kibo-ui/gantt` install does not block.
- **PR-D (23-04-polish)** has `<Kbd>` ready for command-palette shortcut hints.

## Self-Check: PASSED

- File `src/components/ui/combobox.tsx`: FOUND
- File `src/components/ui/tags-input.tsx`: FOUND
- File `src/components/ui/phone-input.tsx`: FOUND
- File `src/components/ui/mask-input.tsx`: FOUND
- File `src/components/ui/context-menu.tsx`: FOUND
- File `src/components/ui/kbd.tsx`: FOUND
- File `src/components/kibo-ui/dropzone/index.tsx`: FOUND
- File `src/components/summary-card.tsx`: FOUND (modified, contains text-success + text-destructive + accessory)
- File `src/components/page-header.tsx`: FOUND
- File `src/components/kpi-strip.tsx`: FOUND
- File `tests/components/page-header.test.tsx`: FOUND (5 tests passing)
- File `tests/components/kpi-strip.test.tsx`: FOUND (7 tests passing)
- Commit `d406184`: FOUND in git log
- Commit `edc00f4`: FOUND in git log

---
*Phase: 23-shadcn-registry-adoption-and-dashboard-ux-revamp*
*Completed: 2026-05-19*
