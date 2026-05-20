---
phase: 23
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components.json
  - src/components/summary-card.tsx
  - src/components/page-header.tsx
  - src/components/kpi-strip.tsx
  - src/components/ui/kbd.tsx
  - src/components/ui/combobox.tsx
  - src/components/ui/tags-input.tsx
  - src/components/ui/phone-input.tsx
  - src/components/ui/mask-input.tsx
  - src/components/ui/context-menu.tsx
  - src/components/kibo-ui/dropzone/index.tsx
  - tests/components/page-header.test.tsx
  - tests/components/kpi-strip.test.tsx
autonomous: true
requirements: []
tags: [shadcn-registry, kpi-strip, page-header, ui-foundation, registries-block, theme-tokens]
must_haves:
  truths:
    - "components.json contains a registries block with @kibo-ui and @diceui (NOT @originui)"
    - "All Phase-1 primitive files (combobox, tags-input, phone-input, mask-input, dropzone, context-menu) exist and contain zero hex literals or Tailwind palette literals (bg-red-500 etc.)"
    - "src/components/ui/kbd.tsx exists as a hand-rolled component using only var(--*) tokens"
    - "src/components/summary-card.tsx renders deltas in text-success / text-destructive (no text-green-600 / text-red-600)"
    - "src/components/summary-card.tsx exports an `accessory?: ReactNode` prop that renders top-right of the card"
    - "src/components/page-header.tsx renders title (h1, text-2xl font-semibold leading-tight), optional description, optional breadcrumb, actions slot"
    - "src/components/kpi-strip.tsx accepts data: KpiStripItem[] and renders 1/2/4 column responsive grid with sparkline accessory"
    - "bun run build succeeds with no [Compiler bailout] entries for any of the new files"
    - "ANALYZE=true bun run build produces a baseline bundle report and the gzipped delta is recorded in the PR body (target < +50 KB for PR-1)"
  artifacts:
    - path: components.json
      provides: "Registry namespace wiring for @kibo-ui and @diceui"
      contains: "\"@kibo-ui\": \"https://www.kibo-ui.com/r/{name}.json\""
    - path: src/components/summary-card.tsx
      provides: "KPI tile primitive with theme-safe delta colors + accessory slot"
      exports: ["SummaryCard", "SummaryCardProps"]
    - path: src/components/page-header.tsx
      provides: "Unified page header composition"
      exports: ["PageHeader", "PageHeaderProps"]
    - path: src/components/kpi-strip.tsx
      provides: "KPI strip composition"
      exports: ["KpiStrip", "KpiStripItem", "KpiStripProps"]
    - path: src/components/ui/kbd.tsx
      provides: "Hand-rolled keyboard-shortcut primitive (replacement for missing @diceui/kbd)"
      exports: ["Kbd"]
    - path: src/components/ui/combobox.tsx
      provides: "Dice UI combobox (multi-select)"
    - path: src/components/ui/tags-input.tsx
      provides: "Dice UI tags input"
    - path: src/components/ui/phone-input.tsx
      provides: "Dice UI phone input (mask only)"
    - path: src/components/ui/mask-input.tsx
      provides: "Dice UI mask input (currency, etc.)"
    - path: src/components/ui/context-menu.tsx
      provides: "shadcn-official context menu (gantt registry dep, prefetched in foundation)"
    - path: src/components/kibo-ui/dropzone/index.tsx
      provides: "Kibo UI drag-anywhere dropzone (pairs with UploadThing)"
    - path: tests/components/page-header.test.tsx
      provides: "Wave-0 unit tests for PageHeader slots"
    - path: tests/components/kpi-strip.test.tsx
      provides: "Wave-0 unit tests for KpiStrip render + delta formatting"
  key_links:
    - from: "src/components/kpi-strip.tsx"
      to: "src/components/summary-card.tsx"
      via: "SummaryCard import + accessory prop"
      pattern: "from '@/components/summary-card'"
    - from: "src/components/kpi-strip.tsx"
      to: "recharts"
      via: "inline <LineChart> sparkline accessory"
      pattern: "from 'recharts'"
    - from: "components.json"
      to: "shadcn CLI"
      via: "registries block resolves @kibo-ui/<slug> and @diceui/<slug>"
      pattern: "\"registries\":"
---

<objective>
PR-1 / Wave 1 — Registry foundation + KPI compositions.

Adopt the `@kibo-ui` and `@diceui` shadcn registries in `components.json` (per UI-SPEC revision 1, Origin UI is REMOVED — do not add `@originui`). Install the Phase-1 Dice UI primitives (combobox, tags-input, phone-input, mask-input) plus the Kibo dropzone and the shadcn-official `context-menu` (which the Kibo gantt in PR-B will require). Hand-roll the missing `<Kbd>` primitive (Dice UI's `@diceui/kbd` slug returns 404). Patch `SummaryCard` so KpiStrip can render compliant deltas, then build the two local compositions (`PageHeader`, `KpiStrip`) that the rest of the phase consumes.

Purpose: every later PR in this phase depends on this foundation. KpiStrip rolls onto 10 pages in PR-B. PageHeader replaces 17 ad-hoc page headers. The patched SummaryCard is the rendering target for every KPI tile across the phase.

Output: components.json wired for two registries; 6 registry primitives installed (5 Dice + 1 Kibo); 1 hand-rolled Kbd; 2 local compositions; 1 patched primitive; 2 Wave-0 unit-test files seeded with passing scaffolds.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-CONTEXT.md
@.planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-RESEARCH.md
@.planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-PATTERNS.md
@.planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-UI-SPEC.md
@.planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-VALIDATION.md
@CLAUDE.md
@components.json
@src/components/summary-card.tsx
@src/components/summary-card-grid.tsx

<interfaces>
<!-- Key types and contracts the executor needs to write against. -->

From src/components/summary-card.tsx (current, BEFORE patch):
```typescript
export interface SummaryCardProps {
    title: string
    value: string | number
    icon?: LucideIcon
    trend?: { value: number; isPositive: boolean }
    isLoading?: boolean
    formatter?: (value: number) => string
}
// Current bug: line 49-50 hardcodes `text-green-600` / `text-red-600` (must become text-success / text-destructive)
// Current gap: no accessory slot (KpiStrip needs to drop a 64×16 sparkline top-right)
```

Target SummaryCardProps shape AFTER patch (Implementation Note 2):
```typescript
export interface SummaryCardProps {
    title: string
    value: string | number
    icon?: LucideIcon
    trend?: { value: number; isPositive: boolean }
    isLoading?: boolean
    formatter?: (value: number) => string
    accessory?: ReactNode        // NEW — rendered top-right of CardContent
}
```

Target KpiStripItem + KpiStripProps interfaces (UI-SPEC §2):
```typescript
export interface KpiStripItem {
    label: string
    value: string | number             // caller pre-formats via formatMoney / formatPercent
    delta?: { value: number; label: string }
    invertDelta?: boolean              // flip color when "down is good" (e.g. currentBalance shrinking)
    sparklineSeries?: number[]         // 7–30 data points
    icon?: LucideIcon
}

export interface KpiStripProps {
    data: KpiStripItem[]
    isLoading?: boolean
}
```

Target PageHeaderProps interface (UI-SPEC §1):
```typescript
export interface PageHeaderProps {
    title: string
    description?: string
    breadcrumb?: Array<{ label: string; href?: string }>
    actions?: ReactNode
}
```

Target Kbd component (UI-SPEC §14, verbatim — do not deviate):
```typescript
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <kbd className={cn(
            "inline-flex items-center justify-center",
            "min-w-[1.5rem] h-5 px-1.5",
            "font-mono text-xs font-semibold",
            "bg-muted text-muted-foreground",
            "border border-border rounded",
            "shadow-[0_1px_0_0_var(--border)]",
            className,
        )}>{children}</kbd>
    )
}
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 01.1: Wire components.json registries + install 6 primitives + hand-roll Kbd</name>
  <files>components.json, src/components/ui/combobox.tsx, src/components/ui/tags-input.tsx, src/components/ui/phone-input.tsx, src/components/ui/mask-input.tsx, src/components/ui/context-menu.tsx, src/components/ui/kbd.tsx, src/components/kibo-ui/dropzone/index.tsx</files>
  <read_first>
    - components.json (the file you are editing — current state has NO registries block)
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-CONTEXT.md (Decisions section — registry adoption locks)
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-RESEARCH.md (Pattern 1: Registry install per primitive; Per-component registry status table)
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-UI-SPEC.md (Design System block, §14 Kbd, Implementation Notes 1, 7, 8, 11, 17)
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-PATTERNS.md (§"src/components/ui/kbd.tsx (NEW hand-rolled, 20 LOC)")
    - CLAUDE.md (Commands section — bun-only, NOT npm/npx/pnpm)
    - src/components/ui/badge.tsx (analog for small stateless tokenized primitive — shape match for Kbd)
  </read_first>
  <behavior>
    - components.json gains a `"registries"` block alongside `"aliases"` containing exactly two namespaces: `@kibo-ui` and `@diceui`. `@originui` is NOT added (UI-SPEC revision 1 safety gate — Origin UI removed).
    - Running `bunx --bun shadcn@latest add @diceui/combobox` produces `src/components/ui/combobox.tsx`.
    - Running `bunx --bun shadcn@latest add @kibo-ui/dropzone` produces `src/components/kibo-ui/dropzone/index.tsx` (NOT `src/components/ui/dropzone.tsx` — Kibo registry hardcodes `target: "components/kibo-ui/<slug>/index.tsx"`).
    - Running `bunx --bun shadcn@latest add context-menu` (official shadcn registry, not namespaced) produces `src/components/ui/context-menu.tsx` — this is prefetched in PR-1 so that PR-B's `@kibo-ui/gantt` install has its regDep already satisfied.
    - `src/components/ui/kbd.tsx` is hand-rolled (not installed) because `@diceui/kbd` returns HTTP 404.
    - Every newly created file is searched for hex literals (`bg-[#...]`, `text-[#...]`) and Tailwind palette literals (`bg-red-500`, `text-blue-600`, etc.). Zero matches expected — if any match, patch to the corresponding `var(--*)` token before proceeding.
    - `bun run build` completes successfully with no `[Compiler bailout]` lines mentioning any new file. Any bailout is documented in the PR body; the consumer is opted out with `'use no memo'` per PR #87 precedent.
  </behavior>
  <action>
1. Open `components.json` and add the following `registries` block as a top-level key (alphabetically ordered, sits between `style` and `aliases`):

```jsonc
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
    "@kibo-ui": "https://www.kibo-ui.com/r/{name}.json",
    "@diceui":  "https://www.diceui.com/r/{name}.json"
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
```

   - Do NOT add `@originui` — UI-SPEC revision 1 removed Origin UI from this phase. Per Implementation Note 1, the date-range need is covered by the existing `src/components/ui/calendar.tsx` `mode="range"` and the switch need is covered by the existing `src/components/ui/switch.tsx`.

2. Install the 5 Dice UI primitives (one command, parallel install — order does not matter; the shadcn CLI handles dependency resolution):

```bash
bunx --bun shadcn@latest add @diceui/combobox @diceui/tags-input @diceui/phone-input @diceui/mask-input
```

   - Each command prompts for overwrite confirmation — accept defaults (none of these files exist yet).
   - Expected outputs: `src/components/ui/{combobox,tags-input,phone-input,mask-input}.tsx`.
   - If the CLI complains about the `--bun` flag, drop it and re-run with bare `bunx shadcn@latest add ...`.

3. Install the official shadcn `context-menu` (NOT namespaced — this is from the base shadcn registry; the Kibo gantt in PR-B requires it as a regDep):

```bash
bunx --bun shadcn@latest add context-menu
```

   - Expected output: `src/components/ui/context-menu.tsx`.

4. Install the Kibo dropzone:

```bash
bunx --bun shadcn@latest add @kibo-ui/dropzone
```

   - Expected output: `src/components/kibo-ui/dropzone/index.tsx` (NOT `src/components/ui/dropzone.tsx` — Implementation Note 7: Kibo lands under `src/components/kibo-ui/<slug>/index.tsx`).
   - This pulls in `react-dropzone` (~16 KB gz) and `lucide-react` (already installed).

5. Hand-roll `src/components/ui/kbd.tsx` (Dice UI's `@diceui/kbd` returns 404 — UI-SPEC §14, verbatim):

```tsx
import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <kbd
            className={cn(
                'inline-flex items-center justify-center',
                'min-w-[1.5rem] h-5 px-1.5',
                'font-mono text-xs font-semibold',
                'bg-muted text-muted-foreground',
                'border border-border rounded',
                'shadow-[0_1px_0_0_var(--border)]',
                className,
            )}
        >
            {children}
        </kbd>
    )
}
```

6. OKLCH grep audit (Implementation Note 8 — run AFTER all installs, cover both `ui` and `kibo-ui` paths):

```bash
grep -rE "bg-\[#|text-\[#|border-\[#|bg-(red|green|blue|yellow|amber|sky|emerald|gray|slate)-[0-9]+|text-(red|green|blue|yellow|amber|sky|emerald|gray|slate)-[0-9]+" src/components/ui/combobox.tsx src/components/ui/tags-input.tsx src/components/ui/phone-input.tsx src/components/ui/mask-input.tsx src/components/ui/context-menu.tsx src/components/ui/kbd.tsx src/components/kibo-ui/dropzone/index.tsx
```

   - Expected: zero matches.
   - Any match → open the file and replace the literal with the corresponding token (`bg-red-500` → `bg-destructive`, `text-blue-600` → `text-primary`, `bg-green-50` → `bg-success/10`, etc.). Pattern: see UI-SPEC §Color reserved-accent list.

7. ThemeProvider import audit (Implementation Note 11 — verify none of the newly installed Dice primitives import `useTheme()` or `next-themes`; the 5 Kibo slugs were already verified clean by RESEARCH.md):

```bash
grep -E "useTheme|next-themes" src/components/ui/combobox.tsx src/components/ui/tags-input.tsx src/components/ui/phone-input.tsx src/components/ui/mask-input.tsx src/components/ui/context-menu.tsx src/components/kibo-ui/dropzone/index.tsx
```

   - Expected: zero matches.
   - Any match → mount `<ThemeProvider>` in `src/app/layout.tsx` BEFORE merging this PR (per RESEARCH.md Pitfall 4). The existing `src/components/theme-provider.tsx` is orphaned today.

8. React Compiler bailout audit (Implementation Note 9):

```bash
bun run build 2>&1 | grep -E "Compiler bailout|bailout" | tee /tmp/phase23-pr1-bailouts.txt
```

   - Expected: zero lines mentioning any new file.
   - Any bailout in a new file → add `'use no memo'` as the first line of that file (after `'use client'` if present), per PR #87 precedent (`src/app/(admin)/assets/_components/ExportAssetsButton.tsx`).
  </action>
  <verify>
    <automated>node -e "const c = JSON.parse(require('fs').readFileSync('components.json')); if (!c.registries || !c.registries['@kibo-ui'] || !c.registries['@diceui']) { process.exit(1) } if (c.registries['@originui']) { console.error('@originui must not be in registries — UI-SPEC revision 1 removed it'); process.exit(1) }" &amp;&amp; test -f src/components/ui/combobox.tsx &amp;&amp; test -f src/components/ui/tags-input.tsx &amp;&amp; test -f src/components/ui/phone-input.tsx &amp;&amp; test -f src/components/ui/mask-input.tsx &amp;&amp; test -f src/components/ui/context-menu.tsx &amp;&amp; test -f src/components/ui/kbd.tsx &amp;&amp; test -f src/components/kibo-ui/dropzone/index.tsx &amp;&amp; ! grep -rE "bg-\[#|text-\[#|border-\[#|bg-(red|green|blue|yellow|amber|sky|emerald|gray|slate)-[0-9]+|text-(red|green|blue|yellow|amber|sky|emerald|gray|slate)-[0-9]+" src/components/ui/combobox.tsx src/components/ui/tags-input.tsx src/components/ui/phone-input.tsx src/components/ui/mask-input.tsx src/components/ui/context-menu.tsx src/components/ui/kbd.tsx src/components/kibo-ui/dropzone/index.tsx &amp;&amp; bun run typecheck</automated>
  </verify>
  <acceptance_criteria>
    - `components.json` contains `"@kibo-ui": "https://www.kibo-ui.com/r/{name}.json"` (exact string match)
    - `components.json` contains `"@diceui": "https://www.diceui.com/r/{name}.json"` (exact string match)
    - `components.json` does NOT contain the substring `@originui` (UI-SPEC revision 1)
    - File exists: `src/components/ui/combobox.tsx`
    - File exists: `src/components/ui/tags-input.tsx`
    - File exists: `src/components/ui/phone-input.tsx`
    - File exists: `src/components/ui/mask-input.tsx`
    - File exists: `src/components/ui/context-menu.tsx`
    - File exists: `src/components/ui/kbd.tsx`
    - File exists: `src/components/kibo-ui/dropzone/index.tsx` (NOT `src/components/ui/dropzone.tsx`)
    - `grep -E "bg-\[#|text-\[#|border-\[#|bg-(red|green|blue|yellow|amber|sky|emerald|gray|slate)-[0-9]+|text-(red|green|blue|yellow|amber|sky|emerald|gray|slate)-[0-9]+" src/components/ui/combobox.tsx src/components/ui/tags-input.tsx src/components/ui/phone-input.tsx src/components/ui/mask-input.tsx src/components/ui/context-menu.tsx src/components/ui/kbd.tsx src/components/kibo-ui/dropzone/index.tsx` exits with code 1 (zero matches)
    - `src/components/ui/kbd.tsx` contains `export function Kbd` and the className strings `font-mono text-xs font-semibold` and `bg-muted text-muted-foreground` and `border border-border rounded`
    - `bun run typecheck` exits 0
    - `bun run build` log contains no `[Compiler bailout]` line that names any file under `src/components/ui/` or `src/components/kibo-ui/`
  </acceptance_criteria>
  <done>components.json has registries wired (Kibo + Dice only, no Origin), 5 Dice primitives + 1 Kibo dropzone + 1 official context-menu installed at the correct paths, Kbd hand-rolled per UI-SPEC §14, OKLCH grep returns zero matches across all new files, ThemeProvider import grep returns zero matches, no Compiler bailouts on new files.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 01.2: Patch SummaryCard + build PageHeader + build KpiStrip + seed Wave-0 tests</name>
  <files>src/components/summary-card.tsx, src/components/page-header.tsx, src/components/kpi-strip.tsx, tests/components/page-header.test.tsx, tests/components/kpi-strip.test.tsx</files>
  <read_first>
    - src/components/summary-card.tsx (the file you are patching — current state at lines 49-50 hardcodes text-green-600/text-red-600)
    - src/components/summary-card-grid.tsx (analog grid wrapper — copy responsive class shape)
    - src/app/(admin)/accounting/_components/AccountingHeader.tsx (analog for PageHeader — see PATTERNS.md §"src/components/page-header.tsx")
    - src/components/ui/breadcrumb.tsx (existing breadcrumb primitives PageHeader composes over)
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-UI-SPEC.md (§1 PageHeader, §2 KpiStrip, §Color KPI delta rule, §Typography Display/Body/Caption tiers, Implementation Note 2)
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-PATTERNS.md (§"src/components/kpi-strip.tsx (NEW composition)", §"src/components/page-header.tsx (NEW composition)")
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-VALIDATION.md (Wave 0 requirements rows 23-01-03 and 23-01-04)
    - tests/components/ (existing test scaffolds — match style)
  </read_first>
  <behavior>
    - SummaryCard delta colors come from `text-success` / `text-destructive` tokens. `bun run lint` and `bun run typecheck` both pass.
    - Test: render `<SummaryCard title="X" value="$1" trend={{value: 5, isPositive: true}} />` and assert the delta row has class `text-success` (NOT `text-green-600`).
    - Test: render `<SummaryCard title="X" value="$1" trend={{value: -3, isPositive: false}} />` and assert the delta row has class `text-destructive` (NOT `text-red-600`).
    - Test: render `<SummaryCard title="X" value="$1" accessory={<span data-testid="acc">A</span>} />` and assert the accessory renders inside the card.
    - PageHeader test: render `<PageHeader title="Hello" description="World" breadcrumb={[{label:"Home",href:"/"},{label:"Page"}]} actions={<button>Save</button>} />` and assert: an `<h1>` with text "Hello"; a description with text "World"; a `<nav aria-label="Breadcrumb">`; the last breadcrumb item has `aria-current="page"` and is NOT a link; the actions button is present.
    - KpiStrip test: render with 4 items, each having label/value/delta/sparklineSeries, and assert: 4 `<Card>` elements; the value cells contain the formatted strings; positive delta items have `text-success` class; negative delta items have `text-destructive` class; items with `invertDelta: true` flip the color mapping; sparklineSeries items contain an `<svg>` (Recharts emits SVG).
  </behavior>
  <action>
1. Patch `src/components/summary-card.tsx` (Implementation Note 2):

   - Line 46: change `<div className="text-2xl font-bold">{formattedValue}</div>` → `<div className="text-2xl font-semibold tabular-nums">{formattedValue}</div>` (UI-SPEC §Typography Display tier; `font-bold` is banned this phase).
   - Lines 49-50: change `trend.isPositive ? 'text-green-600' : 'text-red-600'` → `trend.isPositive ? 'text-success' : 'text-destructive'` (UI-SPEC §Color KPI delta rule).
   - Extend `SummaryCardProps` interface (line 5) to add `accessory?: ReactNode` after `formatter`. Add `import { type ReactNode } from 'react'` to the import list (line 1 area).
   - Inside the rendered `<CardContent className="pt-6">`, wrap existing content in a relative container so the accessory can be absolute-positioned top-right. Replace the CardContent body shape with:

```tsx
<CardContent className="pt-6 relative">
    {accessory && (
        <div className="absolute top-3 right-3">{accessory}</div>
    )}
    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        {Icon && <Icon className="h-4 w-4" />}
        {title}
    </div>
    <div className="text-2xl font-semibold tabular-nums">{formattedValue}</div>
    {trend && (
        <div
            className={`flex items-center gap-1 text-xs mt-2 ${
                trend.isPositive ? 'text-success' : 'text-destructive'
            }`}
        >
            {trend.isPositive ? (
                <TrendingUp className="h-3 w-3" />
            ) : (
                <TrendingDown className="h-3 w-3" />
            )}
            <span>{Math.abs(trend.value)}%</span>
        </div>
    )}
</CardContent>
```

2. Create `src/components/page-header.tsx` (UI-SPEC §1, PATTERNS.md §page-header analog):

```tsx
import { type ReactNode } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export interface PageHeaderProps {
    title: string
    description?: string
    breadcrumb?: Array<{ label: string; href?: string }>
    actions?: ReactNode
}

export function PageHeader({ title, description, breadcrumb, actions }: PageHeaderProps) {
    return (
        <header className="flex flex-col gap-2 pb-6 border-b border-border">
            {breadcrumb && breadcrumb.length > 0 && (
                <Breadcrumb>
                    <BreadcrumbList className="text-xs text-muted-foreground">
                        {breadcrumb.map((item, idx) => {
                            const isLast = idx === breadcrumb.length - 1
                            return (
                                <span key={`${item.label}-${idx}`} className="inline-flex items-center gap-1.5">
                                    <BreadcrumbItem>
                                        {isLast ? (
                                            <BreadcrumbPage aria-current="page">{item.label}</BreadcrumbPage>
                                        ) : item.href ? (
                                            <BreadcrumbLink asChild>
                                                <Link href={item.href}>{item.label}</Link>
                                            </BreadcrumbLink>
                                        ) : (
                                            <span>{item.label}</span>
                                        )}
                                    </BreadcrumbItem>
                                    {!isLast && (
                                        <BreadcrumbSeparator>
                                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                        </BreadcrumbSeparator>
                                    )}
                                </span>
                            )
                        })}
                    </BreadcrumbList>
                </Breadcrumb>
            )}
            <div className="flex items-start justify-between gap-4 flex-wrap md:flex-nowrap">
                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-semibold leading-tight">{title}</h1>
                    {description && (
                        <p className="text-sm text-muted-foreground mt-1">{description}</p>
                    )}
                </div>
                {actions && (
                    <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
                )}
            </div>
        </header>
    )
}
```

   - Verify the exact set of exports from `src/components/ui/breadcrumb.tsx` (BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, Breadcrumb). If any name differs, adjust imports; otherwise the file structure matches shadcn defaults.

3. Create `src/components/kpi-strip.tsx` (UI-SPEC §2, PATTERNS.md §kpi-strip analog):

```tsx
import { type LucideIcon, TrendingDown, TrendingUp } from 'lucide-react'
import { Line, LineChart } from 'recharts'
import { SummaryCard } from '@/components/summary-card'

export interface KpiStripItem {
    label: string
    value: string | number
    delta?: { value: number; label: string }
    invertDelta?: boolean
    sparklineSeries?: number[]
    icon?: LucideIcon
}

export interface KpiStripProps {
    data: KpiStripItem[]
    isLoading?: boolean
}

export function KpiStrip({ data, isLoading = false }: KpiStripProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <SummaryCard key={i} title="" value="" isLoading />
                ))}
            </div>
        )
    }

    if (data.length === 0) {
        return <p className="text-sm text-muted-foreground">No data yet.</p>
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.map((item) => {
                // Color inversion rule (UI-SPEC §Color): when invertDelta is true, flip isPositive.
                const positive = item.delta
                    ? item.invertDelta
                        ? item.delta.value <= 0
                        : item.delta.value >= 0
                    : false
                const trend = item.delta
                    ? { value: item.delta.value, isPositive: positive }
                    : undefined

                const sparkline = item.sparklineSeries && item.sparklineSeries.length > 0 ? (
                    <LineChart
                        width={64}
                        height={16}
                        data={item.sparklineSeries.map((v, i) => ({ i, v }))}
                    >
                        <Line
                            type="monotone"
                            dataKey="v"
                            stroke="var(--primary)"
                            dot={false}
                            strokeWidth={1.5}
                            isAnimationActive={false}
                        />
                    </LineChart>
                ) : undefined

                return (
                    <SummaryCard
                        key={item.label}
                        title={item.label}
                        value={item.value}
                        icon={item.icon}
                        trend={trend}
                        accessory={sparkline}
                    />
                )
            })}
        </div>
    )
}
```

   - Note: the delta-row text under SummaryCard renders `{Math.abs(trend.value)}%`. KpiStrip's `delta.label` (e.g. "vs last 30d") is NOT rendered yet by SummaryCard. UI-SPEC §2 calls for the label to appear inline. Decision: render the label by appending it to the value via a small post-process in SummaryCard later if PR-A surfaces a need; for PR-1 the spec's primary signal (percent + arrow + color) is preserved, and `delta.label` is reserved for future expansion. Document this in the SUMMARY.

4. Create `tests/components/page-header.test.tsx` (Wave-0 row 23-01-03):

```tsx
import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { PageHeader } from '@/components/page-header'

describe('PageHeader', () => {
    it('renders title as an h1 with display typography', () => {
        render(<PageHeader title="Liabilities" />)
        const h1 = screen.getByRole('heading', { level: 1 })
        expect(h1.textContent).toBe('Liabilities')
        expect(h1.className).toContain('text-2xl')
        expect(h1.className).toContain('font-semibold')
        expect(h1.className).toContain('leading-tight')
    })

    it('renders description when provided', () => {
        render(<PageHeader title="X" description="A summary line" />)
        expect(screen.getByText('A summary line')).toBeTruthy()
    })

    it('renders breadcrumb with current-page marker on last item', () => {
        render(
            <PageHeader
                title="Beneficiary"
                breadcrumb={[
                    { label: 'Admin', href: '/' },
                    { label: 'Beneficiaries', href: '/beneficiaries' },
                    { label: 'Detail' },
                ]}
            />,
        )
        const nav = screen.getByRole('navigation', { name: /breadcrumb/i })
        expect(nav).toBeTruthy()
        const current = screen.getByText('Detail')
        expect(current.getAttribute('aria-current')).toBe('page')
    })

    it('renders actions slot', () => {
        render(<PageHeader title="X" actions={<button>Save</button>} />)
        expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy()
    })
})
```

5. Create `tests/components/kpi-strip.test.tsx` (Wave-0 row 23-01-04):

```tsx
import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { KpiStrip } from '@/components/kpi-strip'

describe('KpiStrip', () => {
    it('renders one card per item', () => {
        render(
            <KpiStrip
                data={[
                    { label: 'Active', value: 4 },
                    { label: 'Total', value: '$120,000' },
                    { label: 'APR', value: '4.5%' },
                    { label: 'Trend', value: 12 },
                ]}
            />,
        )
        expect(screen.getByText('Active')).toBeTruthy()
        expect(screen.getByText('Total')).toBeTruthy()
        expect(screen.getByText('APR')).toBeTruthy()
        expect(screen.getByText('Trend')).toBeTruthy()
    })

    it('renders positive delta in text-success', () => {
        const { container } = render(
            <KpiStrip data={[{ label: 'X', value: '$1', delta: { value: 12, label: 'vs 30d' } }]} />,
        )
        const successEl = container.querySelector('.text-success')
        expect(successEl).toBeTruthy()
    })

    it('renders negative delta in text-destructive', () => {
        const { container } = render(
            <KpiStrip data={[{ label: 'X', value: '$1', delta: { value: -3, label: 'vs 30d' } }]} />,
        )
        const destructiveEl = container.querySelector('.text-destructive')
        expect(destructiveEl).toBeTruthy()
    })

    it('inverts delta color when invertDelta is true', () => {
        // Balance going down is good — invertDelta=true flips negative→success.
        const { container } = render(
            <KpiStrip
                data={[
                    {
                        label: 'Balance',
                        value: '$1',
                        delta: { value: -10, label: 'vs 30d' },
                        invertDelta: true,
                    },
                ]}
            />,
        )
        expect(container.querySelector('.text-success')).toBeTruthy()
        expect(container.querySelector('.text-destructive')).toBeFalsy()
    })

    it('renders a sparkline svg when sparklineSeries is provided', () => {
        const { container } = render(
            <KpiStrip data={[{ label: 'X', value: '$1', sparklineSeries: [1, 2, 3, 4, 5] }]} />,
        )
        expect(container.querySelector('svg')).toBeTruthy()
    })

    it('renders loading skeletons when isLoading is true', () => {
        const { container } = render(<KpiStrip data={[]} isLoading />)
        const skeletons = container.querySelectorAll('[data-slot="skeleton"], .animate-pulse')
        expect(skeletons.length).toBeGreaterThan(0)
    })

    it('renders empty state when data is empty and not loading', () => {
        render(<KpiStrip data={[]} />)
        expect(screen.getByText(/no data yet/i)).toBeTruthy()
    })
})
```

   - If `@testing-library/react` is not yet a dev dep, check `tests/components/*.test.tsx` for the established render utility. Match its import style. If existing tests use a different render helper, adopt that style.

6. Run the new tests and the full typecheck:

```bash
bun test --bail --timeout 30000 tests/components/page-header.test.tsx tests/components/kpi-strip.test.tsx
bun run typecheck
bun run lint
```

7. Bundle analyze baseline (Implementation Note 12):

```bash
ANALYZE=true bun run build 2>&1 | tee /tmp/phase23-pr1-bundle.log
```

   - Record gzipped delta vs. the pre-PR baseline in the PR description (target < +50 KB for PR-1; full-phase budget +120 KB).
   - If the delta exceeds +50 KB, audit for `date-fns/locale/*` chunks (per RESEARCH.md Pitfall 5) — none should appear yet (date-fns only re-enters in PR-A via contribution-graph/gantt).
  </action>
  <verify>
    <automated>bun test --bail --timeout 30000 tests/components/page-header.test.tsx tests/components/kpi-strip.test.tsx &amp;&amp; bun run typecheck &amp;&amp; bun run lint &amp;&amp; grep -q "text-success" src/components/summary-card.tsx &amp;&amp; grep -q "text-destructive" src/components/summary-card.tsx &amp;&amp; ! grep -E "text-green-600|text-red-600|font-bold" src/components/summary-card.tsx &amp;&amp; grep -q "accessory" src/components/summary-card.tsx &amp;&amp; grep -q "export function PageHeader" src/components/page-header.tsx &amp;&amp; grep -q "export function KpiStrip" src/components/kpi-strip.tsx &amp;&amp; grep -q "var(--primary)" src/components/kpi-strip.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `src/components/summary-card.tsx` contains the string `text-success` AND `text-destructive`
    - `src/components/summary-card.tsx` does NOT contain `text-green-600` or `text-red-600` or `font-bold`
    - `src/components/summary-card.tsx` contains `accessory` in the props interface
    - `src/components/page-header.tsx` contains `export function PageHeader`
    - `src/components/page-header.tsx` contains the className string `text-2xl font-semibold leading-tight`
    - `src/components/page-header.tsx` contains `aria-current="page"` (set on last breadcrumb)
    - `src/components/kpi-strip.tsx` contains `export function KpiStrip` AND `export interface KpiStripItem`
    - `src/components/kpi-strip.tsx` contains the string `invertDelta` (UI-SPEC §Color inversion rule)
    - `src/components/kpi-strip.tsx` contains the string `var(--primary)` (sparkline stroke)
    - `src/components/kpi-strip.tsx` contains the className string `grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4`
    - `tests/components/page-header.test.tsx` exists with at least 4 test cases (title h1, description, breadcrumb aria-current, actions slot)
    - `tests/components/kpi-strip.test.tsx` exists with at least 6 test cases (render, positive delta, negative delta, invertDelta flip, sparkline svg, loading, empty)
    - `bun test --bail --timeout 30000 tests/components/page-header.test.tsx tests/components/kpi-strip.test.tsx` exits 0
    - `bun run typecheck` exits 0
    - `bun run lint` exits 0
  </acceptance_criteria>
  <done>SummaryCard patched (text-success/destructive + accessory prop + text-2xl font-semibold tabular-nums), PageHeader composition built (h1 + breadcrumb + actions), KpiStrip composition built (responsive grid + invertDelta + sparkline accessory), Wave-0 unit tests for both new compositions pass.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

PR-1 is foundation only — no new tRPC procedures, no new mutations, no new data surfaces. The only network surface touched is the shadcn CLI's HTTPS fetch of registry JSON at install time.

| Boundary | Description |
|----------|-------------|
| shadcn CLI ↔ registry servers | At install time, the CLI fetches `https://www.kibo-ui.com/r/<slug>.json` and `https://www.diceui.com/r/<slug>.json`. Inputs are trusted (developer-initiated commands); outputs (source code) MUST be inspected per UI-SPEC §Registry Safety. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-23-FND-01 | Tampering | New primitives from external registries | mitigate | OKLCH grep audit (Task 01.1 step 6) + RESEARCH.md §Registry Safety direct-JSON-inspection verification (already passed 2026-05-19). Block on any hex literal or unexpected import. |
| T-23-FND-02 | Information Disclosure | ThemeProvider not mounted; component crashes leak stack traces | mitigate | Task 01.1 step 7 grep audit for `useTheme`/`next-themes` imports across newly installed files; mount provider before merge if any match. |
| T-23-FND-03 | Denial of Service | Bundle bloat from `react-dropzone` + `@dnd-kit` transitively bringing in `date-fns` locales | mitigate | Task 01.2 step 7 ANALYZE=true build records gzipped delta in PR description; budget < +50 KB for PR-1 alone. |

Phase-wide threats T-23-01..T-23-05 are addressed in plans 02–04 (the surfaces those threats touch — kanban approval, activity-log timeline, DataTable bulk ops, CSV export, reorder mutations — do not exist in PR-1's scope).
</threat_model>

<verification>
After both tasks complete:
1. `bun run typecheck` exits 0
2. `bun run lint` exits 0
3. `bun test --bail --timeout 30000 tests/components/page-header.test.tsx tests/components/kpi-strip.test.tsx` exits 0
4. `bun run build` succeeds with no `[Compiler bailout]` lines mentioning files under `src/components/ui/` or `src/components/kibo-ui/` or `src/components/{page-header,kpi-strip,summary-card}.tsx`
5. OKLCH grep returns zero matches across all new files
6. PR body records bundle delta from ANALYZE=true build (target < +50 KB, hard cap +120 KB cumulative across phase)
</verification>

<success_criteria>
- `components.json` has a `registries` block with exactly two namespaces (`@kibo-ui`, `@diceui`); `@originui` is not present
- 6 registry files exist at the correct paths (`src/components/ui/{combobox,tags-input,phone-input,mask-input,context-menu}.tsx`, `src/components/kibo-ui/dropzone/index.tsx`)
- 1 hand-rolled primitive exists (`src/components/ui/kbd.tsx`) matching UI-SPEC §14 verbatim
- `src/components/summary-card.tsx` uses `text-success` / `text-destructive` and exports an `accessory?: ReactNode` prop
- `src/components/page-header.tsx` and `src/components/kpi-strip.tsx` exist and satisfy UI-SPEC §1 and §2 props contracts
- 2 Wave-0 test files exist and pass (`page-header.test.tsx`, `kpi-strip.test.tsx`)
- Full test suite (`bun test`) passes
- No regression: `bun run build` succeeds; bundle delta recorded
- PR body documents: (a) registries added, (b) primitives installed, (c) Kbd hand-rolled with reason, (d) SummaryCard patch with cross-ref to Implementation Note 2, (e) bundle delta from analyze, (f) OKLCH grep result (zero matches), (g) Compiler bailout grep result (zero hits on new files)
</success_criteria>

<output>
After completion, create `.planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-01-foundation-SUMMARY.md` recording: tasks completed, files created/modified, bundle delta, OKLCH audit result, Compiler bailout audit result, gotchas encountered, and a note on whether `delta.label` ("vs 30d") needs to be surfaced in SummaryCard for PR-A consumers.
</output>
