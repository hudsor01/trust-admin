---
phase: 27-datatable-rollout-theme-token-and-doc-accuracy
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/globals.css
  - src/app/(admin)/dashboard/_components/DashboardAlerts.tsx
  - src/app/(admin)/hems/_components/HistoryTable.tsx
autonomous: true
requirements: []

must_haves:
  truths:
    - "globals.css defines a dedicated --milestone OKLCH token (a purple/violet hue) and a paired --milestone-foreground, in both the light :root block and the .dark block"
    - "The --milestone / --milestone-foreground tokens are exposed as Tailwind utilities via --color-* entries in the @theme inline block"
    - "The dashboard 'upcoming milestones' alert (DashboardAlerts.tsx) renders with milestone-token classes instead of accent"
    - "The withdrawal badge in hems/HistoryTable.tsx renders with milestone-token classes instead of accent"
  artifacts:
    - path: "src/app/globals.css"
      provides: "--milestone + --milestone-foreground custom properties (light + dark) and their @theme --color-* exposure"
      contains: "--milestone"
    - path: "src/app/(admin)/dashboard/_components/DashboardAlerts.tsx"
      provides: "Upcoming-milestones Alert repointed to the milestone token"
    - path: "src/app/(admin)/hems/_components/HistoryTable.tsx"
      provides: "Withdrawal Badge repointed to the milestone token"
  key_links:
    - from: "src/app/globals.css @theme inline block"
      to: "Tailwind utility classes bg-milestone / text-milestone-foreground / border-milestone"
      via: "--color-milestone / --color-milestone-foreground mapping"
      pattern: "--color-milestone"
    - from: "DashboardAlerts.tsx upcoming-milestones Alert"
      to: "--milestone token"
      via: "border-milestone bg-milestone / text-milestone-foreground classes"
      pattern: "milestone"
    - from: "HistoryTable.tsx withdrawal Badge"
      to: "--milestone token"
      via: "bg-milestone text-milestone-foreground classes"
      pattern: "milestone"
---

<objective>
Give the purple/violet "milestone" informational color a dedicated semantic
token instead of borrowing the neutral `accent` token.

Phase 23's OKLCH color migration had no dedicated milestone hue, so it mapped
two violet-intent UI elements onto `accent` (a near-grey neutral): the
dashboard "upcoming withdrawal milestones" alert and the withdrawal-type badge
in the HEMS distributions history table. The v4.0 audit flagged this for design
review. This plan adds a proper `--milestone` OKLCH token (purple/violet),
exposes it as a Tailwind utility the same way `--warning`/`--success` are
exposed, and repoints the two consumers.

Purpose: Restore the intended visual semantics — milestone alerts should read
as a distinct violet, not as a grey neutral that visually disappears.
Output: `--milestone` + `--milestone-foreground` tokens; two repointed consumers.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md

<interfaces>
<!-- Exact existing token declarations the executor must mirror. -->

From src/app/globals.css — light-mode :root semantic tokens (lines 58-64):
```css
  /* Success - from Radix Green palette (OKLCH) */
  --success: oklch(62% 0.17 155);
  --success-foreground: oklch(100% 0 0);

  /* Warning - from Radix Amber palette (OKLCH) */
  --warning: oklch(84% 0.16 85);
  --warning-foreground: oklch(21.5% 0.02 265);
```

From src/app/globals.css — .dark block semantic tokens (lines 117-123):
```css
  /* Success - darker mode (OKLCH) */
  --success: oklch(68% 0.16 155);
  --success-foreground: oklch(18% 0.04 155);

  /* Warning - darker mode (OKLCH) */
  --warning: oklch(86% 0.15 85);
  --warning-foreground: oklch(20% 0.06 85);
```

From src/app/globals.css — @theme inline exposure (lines 160-163):
```css
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
```

NOTE on high-contrast: the `@media (prefers-contrast: more)` block
(globals.css ~line 259) only overrides `--border` and `--muted-foreground`.
`--warning`/`--success` are NOT redefined there — semantic color tokens inherit
their base values in high-contrast mode. Therefore `--milestone` likewise needs
NO high-contrast override; matching the existing semantic-token pattern means
defining it only in `:root` and `.dark`.

From src/app/(admin)/dashboard/_components/DashboardAlerts.tsx (lines 75-83) — current accent usage:
```tsx
{upcomingMilestones.length > 0 && (
    <Alert className="border-accent bg-accent">
        <Circle className="h-4 w-4 text-accent-foreground" />
        <AlertDescription className="text-accent-foreground font-medium">
```

From src/app/(admin)/hems/_components/HistoryTable.tsx (lines 56-72) — current accent usage:
```tsx
<Badge
    variant={row.original.isWithdrawal ? 'default' : 'secondary'}
    className={cn(
        row.original.isWithdrawal &&
            'bg-accent text-accent-foreground',
    )}
>
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add the --milestone OKLCH token to globals.css</name>
  <files>src/app/globals.css</files>
  <read_first>
    - src/app/globals.css (lines 26-82 — the `:root` light-mode block; lines 84-134 — the `.dark` block; lines 143-183 — the `@theme inline` block; lines 257-270 — the `prefers-contrast: more` block, to confirm semantic tokens are NOT redefined there)
  </read_first>
  <action>
    Add a dedicated milestone semantic token in three places, mirroring exactly
    how `--warning` and `--success` are declared.

    1. In the `:root` block, immediately AFTER the `--warning` /
       `--warning-foreground` pair (after line 64), add:
       ```css

         /* Milestone - purple/violet, informational (OKLCH) */
         --milestone: oklch(58% 0.17 295);
         --milestone-foreground: oklch(100% 0 0);
       ```

    2. In the `.dark` block, immediately AFTER the dark `--warning` /
       `--warning-foreground` pair (after line 123), add:
       ```css

         /* Milestone - darker mode (OKLCH) */
         --milestone: oklch(70% 0.15 295);
         --milestone-foreground: oklch(18% 0.05 295);
       ```

    3. In the `@theme inline` block, immediately AFTER the
       `--color-warning-foreground` line (after line 163), add:
       ```css
         --color-milestone: var(--milestone);
         --color-milestone-foreground: var(--milestone-foreground);
       ```

    Hue rationale: 295 is a violet hue in OKLCH (purple/violet was the original
    intent of the borrowed `accent`). Light mode uses an L of 58% with a
    white foreground — strong enough to read as a filled violet panel. Dark mode
    raises L to 70% with a dark-violet foreground, matching the L-shift pattern
    `--warning`/`--success` use between modes.

    Do NOT add a `prefers-contrast: more` override — `--warning`/`--success`
    have none, so `--milestone` follows the same convention.
  </action>
  <verify>
    <automated>test "$(grep -c -- '--milestone' src/app/globals.css)" = "6" && grep -q -- '--color-milestone: var(--milestone)' src/app/globals.css</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c -- "--milestone" src/app/globals.css` returns `6` (2 declarations in `:root`, 2 in `.dark`, 2 in `@theme`).
    - The `:root` block contains `--milestone: oklch(58% 0.17 295)` and `--milestone-foreground: oklch(100% 0 0)`.
    - The `.dark` block contains `--milestone: oklch(70% 0.15 295)` and `--milestone-foreground: oklch(18% 0.05 295)`.
    - The `@theme inline` block contains `--color-milestone: var(--milestone)` and `--color-milestone-foreground: var(--milestone-foreground)`.
    - No `--milestone` entry appears inside the `@media (prefers-contrast: more)` block.
    - `bun run build` completes without CSS errors.
  </acceptance_criteria>
  <done>globals.css defines --milestone / --milestone-foreground for light + dark and exposes them as Tailwind --color-* utilities, mirroring --warning/--success.</done>
</task>

<task type="auto">
  <name>Task 2: Repoint the two milestone/withdrawal consumers off accent onto milestone</name>
  <files>src/app/(admin)/dashboard/_components/DashboardAlerts.tsx, src/app/(admin)/hems/_components/HistoryTable.tsx</files>
  <read_first>
    - src/app/(admin)/dashboard/_components/DashboardAlerts.tsx (full file — confirm the `upcomingMilestones` Alert is the only block using accent; the other Alert blocks must keep their own tokens)
    - src/app/(admin)/hems/_components/HistoryTable.tsx (lines 51-72 — the `distributionType` column's withdrawal Badge)
  </read_first>
  <action>
    In `DashboardAlerts.tsx`, the upcoming-milestones `<Alert>` block (lines 75-83):
    - Change `className="border-accent bg-accent"` to `className="border-milestone bg-milestone"`.
    - Change the `<Circle>` icon `className` from `text-accent-foreground` to `text-milestone-foreground`.
    - Change the `<AlertDescription>` `className` from `text-accent-foreground font-medium` to `text-milestone-foreground font-medium`.
    Touch nothing else in the file — any other Alert block keeps its existing tokens.

    In `HistoryTable.tsx`, the `distributionType` column's `<Badge>` (lines 56-72):
    - Change the conditional class string from `'bg-accent text-accent-foreground'`
      to `'bg-milestone text-milestone-foreground'` inside the `cn(...)` call.
    Leave the `variant` prop and the non-withdrawal branch unchanged.

    These are class-name swaps only — no logic, no new imports.
  </action>
  <verify>
    <automated>! grep -q "accent" "src/app/(admin)/dashboard/_components/DashboardAlerts.tsx" && grep -q "border-milestone bg-milestone" "src/app/(admin)/dashboard/_components/DashboardAlerts.tsx" && grep -q "bg-milestone text-milestone-foreground" "src/app/(admin)/hems/_components/HistoryTable.tsx" && ! grep -q "bg-accent" "src/app/(admin)/hems/_components/HistoryTable.tsx"</automated>
  </verify>
  <acceptance_criteria>
    - `DashboardAlerts.tsx` contains no `accent` substring; the upcoming-milestones Alert uses `border-milestone bg-milestone` and `text-milestone-foreground`.
    - `HistoryTable.tsx` contains `bg-milestone text-milestone-foreground` and no `bg-accent`.
    - No other Alert block in `DashboardAlerts.tsx` is changed (the milestone block was the only `accent` consumer).
    - `bun run typecheck` exits 0; `bun run lint` reports 0 findings.
  </acceptance_criteria>
  <done>Both milestone/withdrawal consumers render with the dedicated --milestone token; accent is no longer borrowed for milestone semantics.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

This plan modifies CSS custom properties and two `className` strings. No data
crosses any trust boundary; no input is processed.

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-27-TOKEN | N/A | globals.css token + 2 className swaps | N/A | No security surface — CSS theme token addition and class-name repointing only. No mutation, no input handling, no auth path touched. |
</threat_model>

<verification>
- `grep -c -- "--milestone" src/app/globals.css` returns 6.
- `DashboardAlerts.tsx` has no `accent` substring; `HistoryTable.tsx` has no `bg-accent`.
- `bun run build` completes (CSS compiles, `@theme` block valid).
- `bun run typecheck` exits 0; `bun run lint` reports 0 findings.
- `bun test` full suite still green.
</verification>

<success_criteria>
- A dedicated `--milestone` / `--milestone-foreground` OKLCH token exists for light + dark, exposed as Tailwind utilities, mirroring `--warning`/`--success`.
- The dashboard upcoming-milestones alert and the HEMS withdrawal badge render with the milestone token, no longer borrowing `accent`.
</success_criteria>

<output>
After completion, create `.planning/phases/27-datatable-rollout-theme-token-and-doc-accuracy/27-02-SUMMARY.md`
</output>
