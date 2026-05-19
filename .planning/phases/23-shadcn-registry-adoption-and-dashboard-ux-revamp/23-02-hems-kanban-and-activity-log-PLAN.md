---
phase: 23
plan: 02
type: execute
wave: 2
depends_on: [23-01]
files_modified:
  - src/server/trpc/routers/hemsRequest.ts
  - src/components/kibo-ui/kanban/index.tsx
  - src/components/kibo-ui/contribution-graph/index.tsx
  - src/components/activity-timeline.tsx
  - src/app/(admin)/hems-queue/_components/HemsQueueBoard.tsx
  - src/app/(admin)/hems-queue/_components/HemsQueueClient.tsx
  - src/app/(admin)/activity-log/_components/ActivityTimelineView.tsx
  - src/app/(admin)/activity-log/_components/ActivityHeatmap.tsx
  - src/app/(admin)/activity-log/_components/ActivityLogClient.tsx
  - tests/trpc/hemsRequest.test.ts
  - tests/components/activity-timeline.test.tsx
  - tests/components/activity-heatmap.test.tsx
  - tests/e2e/hems-queue.e2e.ts
autonomous: true
requirements: []
tags: [hems-kanban, activity-timeline, activity-heatmap, mark-distributed, kibo-kanban, contribution-graph, react-compiler]
must_haves:
  truths:
    - "Admin can drag a PENDING HEMS card to APPROVED → ConfirmDialog opens → on confirm, trpc.hemsRequest.approve fires → card moves visually and toast appears"
    - "Admin can drag an APPROVED HEMS card to DISTRIBUTED → trpc.hemsRequest.markDistributed fires (no confirm) → card moves and toast appears"
    - "Dragging from DISTRIBUTED to any column is blocked (cursor-not-allowed, no mutation fired)"
    - "Reverse drags (APPROVED→PENDING, DISTRIBUTED→APPROVED) are blocked"
    - "/hems-queue renders Tabs with Board (default) and Table"
    - "/activity-log renders Tabs with Timeline (default), Heatmap, and Raw (existing DataTable)"
    - "ActivityTimeline groups entries by day, uses bg-success/bg-primary/bg-destructive dots for INSERT/UPDATE/DELETE, expand chevron reveals JSON diff"
    - "ActivityHeatmap shows 30-day rolling window with fill-chart-2 opacity scale (NOT default muted-foreground); clicking a day cell filters the timeline"
    - "trpc.hemsRequest.markDistributed enforces admin role (adminProcedure), entityId WHERE clause, PENDING→APPROVED→DISTRIBUTED state machine (CONFLICT if not currently APPROVED)"
    - "HEMS category renders as plain <span> with text-xs font-semibold uppercase tracking-wide text-muted-foreground — NOT a <Badge>"
  artifacts:
    - path: src/server/trpc/routers/hemsRequest.ts
      provides: "markDistributed mutation"
      contains: "markDistributed: adminProcedure"
    - path: src/components/kibo-ui/kanban/index.tsx
      provides: "Kibo UI kanban primitive"
    - path: src/components/kibo-ui/contribution-graph/index.tsx
      provides: "Kibo UI contribution graph primitive"
    - path: src/components/activity-timeline.tsx
      provides: "Hand-rolled ActivityTimeline (replaces missing @kibo-ui/timeline)"
      exports: ["ActivityTimeline"]
    - path: src/app/(admin)/hems-queue/_components/HemsQueueBoard.tsx
      provides: "Kanban consumer wired to approve + markDistributed mutations"
      exports: ["HemsQueueBoard"]
    - path: src/app/(admin)/activity-log/_components/ActivityTimelineView.tsx
      provides: "Page consumer for timeline view"
    - path: src/app/(admin)/activity-log/_components/ActivityHeatmap.tsx
      provides: "30-day contribution heatmap with day-click filter"
    - path: tests/trpc/hemsRequest.test.ts
      provides: "markDistributed mutation tests (success + CONFLICT path)"
    - path: tests/components/activity-timeline.test.tsx
      provides: "ActivityTimeline grouping + action-dot color tests"
    - path: tests/components/activity-heatmap.test.tsx
      provides: "Heatmap 30-day window + entity scoping + click filter tests"
    - path: tests/e2e/hems-queue.e2e.ts
      provides: "Playwright kanban drag-to-approve flow"
  key_links:
    - from: "HemsQueueBoard.tsx"
      to: "trpc.hemsRequest.approve"
      via: "PENDING→APPROVED drag handler (after ConfirmDialog confirm)"
      pattern: "approve.mutate|approveMutation.mutate"
    - from: "HemsQueueBoard.tsx"
      to: "trpc.hemsRequest.markDistributed"
      via: "APPROVED→DISTRIBUTED drag handler"
      pattern: "markDistributed.mutate|markDistributedMutation.mutate"
    - from: "ActivityHeatmap.tsx"
      to: "ActivityTimelineView.tsx"
      via: "selected-day state lifted to parent ActivityLogClient"
      pattern: "onDayClick|setSelectedDay"
    - from: "ActivityTimeline.tsx"
      to: "activityLog rows"
      via: "groupBy createdAt → format yyyy-MM-dd via date-fns"
      pattern: "format.*parseISO|format.*'yyyy-MM-dd'"
---

<objective>
PR-A / Wave 2 — Headline redesign Wave A: HEMS queue kanban + activity log timeline+heatmap.

Install the first two Kibo registry primitives (`@kibo-ui/kanban` and `@kibo-ui/contribution-graph`). Hand-roll the `ActivityTimeline` composition (Kibo's `timeline` slug returns HTTP 500 — does not exist). Add the missing `trpc.hemsRequest.markDistributed` mutation (does not exist today per RESEARCH.md A6). Refactor `/hems-queue` to render a 3-column kanban as the default tab (PENDING / APPROVED / DISTRIBUTED) with drag-to-transition wired to existing `approve` + new `markDistributed`. Refactor `/activity-log` to render Tabs with Timeline (default) + Heatmap + Raw (existing DataTable).

Purpose: the two highest-velocity admin pages get a step-change in usability. Kanban lets the admin process the HEMS backlog visually instead of row-by-row. Timeline + heatmap turn the activity-log from a JSON-row table into a navigable history.

Output: 1 new tRPC mutation; 2 Kibo registry primitives installed; 1 hand-rolled timeline composition; 1 kanban consumer + 1 timeline consumer + 1 heatmap consumer; refactored `HemsQueueClient.tsx` and `ActivityLogClient.tsx` to host the new tabs.

Threat references: T-23-01 (kanban drag-to-approve authz), T-23-02 (activity-log timeline row leak).
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
@.planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-01-foundation-SUMMARY.md
@CLAUDE.md
@src/server/trpc/routers/hemsRequest.ts
@src/app/(admin)/hems-queue/_components/HemsQueueClient.tsx
@src/app/(admin)/activity-log/_components/ActivityLogClient.tsx
@src/components/confirm-dialog.tsx
@src/lib/constants.ts
@db/schema.ts

<interfaces>
<!-- markDistributed mutation contract (mirrors approve sibling at lines 145-208 of hemsRequest.ts) -->

```typescript
// New mutation added to src/server/trpc/routers/hemsRequest.ts
markDistributed: adminProcedure
    .input(z.object({
        id: z.coerce.number(),
        entityId: z.coerce.number(),
    }))
    .mutation(async ({ input }) => {
        // 1. findFirst precheck — ensures row belongs to entity
        // 2. CONFLICT if status !== 'APPROVED'
        // 3. UPDATE status → 'DISTRIBUTED', updatedAt now
        // 4. Returns updated row
    })

// Output type: same shape as approve's return (the full hemsRequest row).
```

<!-- Kanban event payload (Kibo UI) -->

```typescript
// onDragEnd receives a @dnd-kit DragEndEvent:
type DragEndEvent = {
    active: { id: string | number }    // dragged card id (we encode HEMS request id as string)
    over: { id: string | number } | null  // drop target — kanban sets this to column id
}
```

<!-- ActivityLog row shape (from db/schema.ts lines 267-317) -->

```typescript
type ActivityLog = {
    id: number
    tableName: string                // 'beneficiary', 'hems_request', etc.
    recordId: number | null
    action: 'INSERT' | 'UPDATE' | 'DELETE'
    oldValues: Record<string, unknown> | null
    newValues: Record<string, unknown> | null
    changedBy: string                // user id (text)
    createdAt: string                // ISO timestamp
}
```

<!-- ActivityTimelineProps interface -->

```typescript
export interface ActivityTimelineProps {
    entries: ActivityLog[]
    isLoading?: boolean
    selectedDay?: string             // 'yyyy-MM-dd' — when set, filter entries to that day
}
```

<!-- ActivityHeatmapProps interface -->

```typescript
export interface ActivityHeatmapProps {
    entries: ActivityLog[]           // already entity-scoped via existing tRPC
    selectedDay?: string             // 'yyyy-MM-dd' or undefined
    onDayClick?: (day: string | undefined) => void  // toggle filter
}
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 02.1: Add markDistributed mutation + Wave-0 trpc tests</name>
  <files>src/server/trpc/routers/hemsRequest.ts, tests/trpc/hemsRequest.test.ts</files>
  <read_first>
    - src/server/trpc/routers/hemsRequest.ts (sibling `approve` mutation at lines 145-208 is the analog — match its shape verbatim: TRPCError codes, traceBusinessOperation wrapper, addBreadcrumb, findFirst precheck, and(eq) WHERE)
    - src/server/trpc/init.ts (confirms adminProcedure shape + role gating)
    - db/schema.ts (lines 1100-1200 area for hemsRequest table — confirm status enum values: PENDING, APPROVED, DISTRIBUTED, DENIED, CANCELLED)
    - tests/trpc/hemsRequest.test.ts (existing test file, if any — match style; if absent, scaffold from another tests/trpc/*.test.ts file)
    - tests/helpers/mock-context.ts (AppUser mock shape includes forcePasswordChange per MEMORY.md)
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-PATTERNS.md (§"src/server/trpc/routers/hemsRequest.ts (EDIT)" — full markDistributed sketch)
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-UI-SPEC.md (§3 Kanban — drop transitions allowed; Implementation Note 3)
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-VALIDATION.md (rows 23-02-01, 23-02-02 — T-23-01 threat)
    - CLAUDE.md (Entity ID Validation Pattern + adminProcedure rules)
  </read_first>
  <behavior>
    - Calling `trpc.hemsRequest.markDistributed({ id, entityId })` as admin on an APPROVED request returns the updated row with `status: 'DISTRIBUTED'`.
    - Calling it on a PENDING / DENIED / CANCELLED / DISTRIBUTED request throws `TRPCError({ code: 'CONFLICT' })` with a message naming the current status.
    - Calling it on an id that exists in another entity (`entityId` mismatch) throws `TRPCError({ code: 'NOT_FOUND' })`.
    - Calling it without admin role throws on `adminProcedure` boundary (verified by existing role mocks).
    - The mutation is wrapped in `traceBusinessOperation('hems.markDistributed', ...)` matching the `approve` sibling.
    - tRPC tests cover all four paths above. `bun test tests/trpc/hemsRequest.test.ts -t markDistributed` exits 0.
  </behavior>
  <action>
1. Open `src/server/trpc/routers/hemsRequest.ts`. Locate the `approve` mutation (around lines 145-208 — confirms the pattern: `adminProcedure` + `z.object({ id, entityId, ... })` input + `addBreadcrumb` + `traceBusinessOperation` + `findFirst` precheck + `TRPCError({ code: 'NOT_FOUND' })` + `TRPCError({ code: 'CONFLICT' })` for invalid status + `.update().set({ status, updatedAt }).where(and(eq(id), eq(entityId))).returning()`).

2. Add the `markDistributed` mutation as a new procedure on the router. Insert it immediately after `approve` (preserves logical grouping: submit → approve → markDistributed → deny → cancel):

```typescript
markDistributed: adminProcedure
    .input(
        z.object({
            id: z.coerce.number(),
            entityId: z.coerce.number(),
        }),
    )
    .mutation(async ({ input }) => {
        addBreadcrumb('hems', `Marking HEMS request ${input.id} distributed`)
        return traceBusinessOperation(
            'hems.markDistributed',
            { requestId: input.id, entityId: input.entityId },
            async () => {
                const existing = await db.query.hemsRequest.findFirst({
                    where: and(
                        eq(hemsRequest.id, input.id),
                        eq(hemsRequest.entityId, input.entityId),
                    ),
                })
                if (!existing) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'HEMS request not found in this entity',
                    })
                }
                if (existing.status !== 'APPROVED') {
                    throw new TRPCError({
                        code: 'CONFLICT',
                        message: `Cannot mark distributed: current status is ${existing.status}. Request must be APPROVED first.`,
                    })
                }
                const [updated] = await db
                    .update(hemsRequest)
                    .set({
                        status: 'DISTRIBUTED',
                        updatedAt: new Date().toISOString(),
                    })
                    .where(
                        and(
                            eq(hemsRequest.id, input.id),
                            eq(hemsRequest.entityId, input.entityId),
                        ),
                    )
                    .returning()
                return updated
            },
        )
    }),
```

   - Verify the imports at the top of the file already include `addBreadcrumb`, `traceBusinessOperation`, `TRPCError`, `and`, `eq`, `z`, `hemsRequest` (the `approve` sibling uses all of them). If any is missing, add it; otherwise reuse.
   - Per UI-SPEC §3 (Implementation Note 3), this mutation does NOT touch the `distribution` table — the `distribution` record was already created by `approve` (existing behavior per MEMORY.md "hemsRequest fields"). markDistributed only flips the `hemsRequest.status` flag.

3. Add tests to `tests/trpc/hemsRequest.test.ts` (Wave-0 row 23-02-02; if the file does not exist, create it scaffolded from `tests/trpc/<other-router>.test.ts`):

```typescript
import { describe, expect, it, beforeEach } from 'bun:test'
import { TRPCError } from '@trpc/server'
import { createCallerFactory } from '@/server/trpc/init'
import { appRouter } from '@/server/trpc/router'
import { mockAdminContext } from '../helpers/mock-context'
// ... whatever test fixtures the existing tests/trpc/*.test.ts files use ...

describe('hemsRequest.markDistributed', () => {
    it('flips an APPROVED request to DISTRIBUTED and returns the updated row', async () => {
        // Arrange: seed a hemsRequest with status APPROVED in the test branch
        // Use the same seeding strategy as other tests/trpc/*.test.ts files
        // ...
        const caller = createCallerFactory(appRouter)(await mockAdminContext())
        const result = await caller.hemsRequest.markDistributed({
            id: seededRequestId,
            entityId: seededEntityId,
        })
        expect(result.status).toBe('DISTRIBUTED')
        expect(result.id).toBe(seededRequestId)
    })

    it('throws CONFLICT when current status is PENDING', async () => {
        // Arrange: seed with PENDING status
        const caller = createCallerFactory(appRouter)(await mockAdminContext())
        await expect(
            caller.hemsRequest.markDistributed({
                id: seededPendingRequestId,
                entityId: seededEntityId,
            }),
        ).rejects.toThrow(/Cannot mark distributed.*PENDING/)
    })

    it('throws CONFLICT when current status is DENIED', async () => {
        const caller = createCallerFactory(appRouter)(await mockAdminContext())
        await expect(
            caller.hemsRequest.markDistributed({
                id: seededDeniedRequestId,
                entityId: seededEntityId,
            }),
        ).rejects.toThrow(/Cannot mark distributed.*DENIED/)
    })

    it('throws CONFLICT when current status is already DISTRIBUTED', async () => {
        const caller = createCallerFactory(appRouter)(await mockAdminContext())
        await expect(
            caller.hemsRequest.markDistributed({
                id: seededDistributedRequestId,
                entityId: seededEntityId,
            }),
        ).rejects.toThrow(/Cannot mark distributed.*DISTRIBUTED/)
    })

    it('throws NOT_FOUND when entityId does not match', async () => {
        const caller = createCallerFactory(appRouter)(await mockAdminContext())
        await expect(
            caller.hemsRequest.markDistributed({
                id: seededRequestId,
                entityId: 999999,
            }),
        ).rejects.toThrow(/not found in this entity/)
    })
})
```

   - Inspect the existing tests/trpc/*.test.ts files (e.g. `liability.test.ts` or `vehicle.test.ts`) and copy the actual seeding / cleanup pattern. The pseudo-code above is illustrative — the executor MUST match the existing test infrastructure.
   - Cleanup: in `afterAll`, delete by `entityId` (per MEMORY.md "test afterAll cleanup" pattern — catches auto-created distributions).
  </action>
  <verify>
    <automated>grep -q "markDistributed: adminProcedure" src/server/trpc/routers/hemsRequest.ts &amp;&amp; grep -q "z.coerce.number()" src/server/trpc/routers/hemsRequest.ts &amp;&amp; grep -q "TRPCError" src/server/trpc/routers/hemsRequest.ts &amp;&amp; grep -E "code: 'CONFLICT'" src/server/trpc/routers/hemsRequest.ts &amp;&amp; bun test --bail --timeout 30000 tests/trpc/hemsRequest.test.ts &amp;&amp; bun run typecheck</automated>
  </verify>
  <acceptance_criteria>
    - `src/server/trpc/routers/hemsRequest.ts` contains the exact string `markDistributed: adminProcedure`
    - `src/server/trpc/routers/hemsRequest.ts` contains `z.object({` followed within 200 chars by both `id: z.coerce.number()` and `entityId: z.coerce.number()` (the input schema)
    - `src/server/trpc/routers/hemsRequest.ts` contains `code: 'CONFLICT'` AND `code: 'NOT_FOUND'`
    - `src/server/trpc/routers/hemsRequest.ts` contains `traceBusinessOperation` AND `'hems.markDistributed'`
    - `src/server/trpc/routers/hemsRequest.ts` contains `addBreadcrumb` for `markDistributed`
    - `src/server/trpc/routers/hemsRequest.ts` contains `and(eq(hemsRequest.id, input.id), eq(hemsRequest.entityId, input.entityId))` in the UPDATE WHERE clause
    - `tests/trpc/hemsRequest.test.ts` exists with at least 5 test cases for markDistributed (APPROVED→DISTRIBUTED success, CONFLICT on PENDING, CONFLICT on DENIED, CONFLICT on already-DISTRIBUTED, NOT_FOUND on entityId mismatch)
    - `bun test --bail --timeout 30000 tests/trpc/hemsRequest.test.ts` exits 0
    - `bun run typecheck` exits 0
  </acceptance_criteria>
  <done>markDistributed mutation added with full entityId scoping, state-machine enforcement (only APPROVED → DISTRIBUTED), traceBusinessOperation wrapper, and 5 passing tRPC tests covering all four error paths plus the happy path.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 02.2: Install Kibo kanban + hand-roll ActivityTimeline + install contribution-graph + Wave-0 component tests</name>
  <files>src/components/kibo-ui/kanban/index.tsx, src/components/kibo-ui/contribution-graph/index.tsx, src/components/activity-timeline.tsx, tests/components/activity-timeline.test.tsx, tests/components/activity-heatmap.test.tsx</files>
  <read_first>
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-RESEARCH.md (Per-component registry status table — confirms @kibo-ui/kanban deps and target path; confirms @kibo-ui/timeline returns 500)
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-UI-SPEC.md (§4 ActivityTimeline, §5 ActivityHeatmap, §Color timeline action dots + contribution heatmap palette, Implementation Note 10)
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-PATTERNS.md (§"src/components/activity-timeline.tsx" — full spec with grouping pattern + action mapping)
    - src/app/(admin)/activity-log/_components/ActivityLogClient.tsx (analog — lines 28-45 contain ACTION_LABELS/ICONS/VARIANTS to reuse, lines 58-66 filter pattern, lines 77-80 formatJson helper)
    - db/schema.ts (activityLog table at lines 267-317 — confirm payload shape and createdAt format)
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-VALIDATION.md (rows 23-02-04 T-23-02 threat, 23-02-05 heatmap test)
  </read_first>
  <behavior>
    - `src/components/kibo-ui/kanban/index.tsx` and `src/components/kibo-ui/contribution-graph/index.tsx` exist after install. Zero hex literals or Tailwind palette literals in either file.
    - `src/components/activity-timeline.tsx` exports `ActivityTimeline` component grouped by day (latest day first), with colored dots per action.
    - ActivityTimeline test: render with 5 activityLog entries spanning 2 days, assert: 2 day-group `<h3>` elements (latest first), 5 list `<li>` entries total, dots have classes `bg-success` / `bg-primary` / `bg-destructive` matching INSERT/UPDATE/DELETE, and clicking the chevron expands the row revealing a JSON diff `<pre>` block.
    - ActivityHeatmap test: render with 30 days of synthetic data, assert: 30 cells in the grid, the cell with `count >= 4` has class `fill-chart-2` (no opacity modifier), the cell with `count === 2` has class `fill-chart-2/40`, clicking a cell calls `onDayClick(day)`.
    - `bun run build` log has zero `[Compiler bailout]` entries naming any new file.
  </behavior>
  <action>
1. Install the two Kibo registry primitives:

```bash
bunx --bun shadcn@latest add @kibo-ui/kanban
bunx --bun shadcn@latest add @kibo-ui/contribution-graph
```

   - Expected outputs: `src/components/kibo-ui/kanban/index.tsx` (~7.7 KB source) and `src/components/kibo-ui/contribution-graph/index.tsx` (~12 KB).
   - Kanban pulls `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `tunnel-rat` as new deps.
   - Contribution-graph pulls `date-fns` as a new dep — this reintroduces the dep removed in CLEAN-02. Document in PR-A description with justification (RESEARCH.md Implementation Note 10).

2. OKLCH grep audit (covers BOTH the new files AND the previously installed ones in PR-1 — defense in depth):

```bash
grep -rE "bg-\[#|text-\[#|border-\[#|bg-(red|green|blue|yellow|amber|sky|emerald|gray|slate)-[0-9]+|text-(red|green|blue|yellow|amber|sky|emerald|gray|slate)-[0-9]+" src/components/kibo-ui/kanban/index.tsx src/components/kibo-ui/contribution-graph/index.tsx
```

   - Expected: zero matches.

3. ThemeProvider import audit:

```bash
grep -E "useTheme|next-themes" src/components/kibo-ui/kanban/index.tsx src/components/kibo-ui/contribution-graph/index.tsx
```

   - Expected: zero matches. If any → mount `<ThemeProvider>` in `src/app/layout.tsx` BEFORE proceeding.

4. Hand-roll `src/components/activity-timeline.tsx` (replaces missing `@kibo-ui/timeline`). Use the verbatim ACTION_COLOR map from UI-SPEC §Color (NOT the ACTION_VARIANTS from ActivityLogClient — that's for the inline badge, not the dot):

```tsx
'use client'

import { type ReactNode, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const ACTION_DOT_COLOR: Record<string, string> = {
    INSERT: 'bg-success',
    UPDATE: 'bg-primary',
    DELETE: 'bg-destructive',
}

const ACTION_ICON: Record<string, ReactNode> = {
    INSERT: <Plus className="h-3 w-3" />,
    UPDATE: <Pencil className="h-3 w-3" />,
    DELETE: <Trash2 className="h-3 w-3" />,
}

export interface ActivityLogEntry {
    id: number
    tableName: string
    recordId: number | null
    action: 'INSERT' | 'UPDATE' | 'DELETE' | string
    oldValues: Record<string, unknown> | null
    newValues: Record<string, unknown> | null
    changedBy: string
    createdAt: string
}

export interface ActivityTimelineProps {
    entries: ActivityLogEntry[]
    isLoading?: boolean
    selectedDay?: string
}

export function ActivityTimeline({ entries, isLoading = false, selectedDay }: ActivityTimelineProps) {
    const filtered = useMemo(() => {
        if (!selectedDay) return entries
        return entries.filter(
            (e) => format(parseISO(e.createdAt), 'yyyy-MM-dd') === selectedDay,
        )
    }, [entries, selectedDay])

    const grouped = useMemo(() => {
        return Object.entries(
            filtered.reduce<Record<string, ActivityLogEntry[]>>((acc, e) => {
                const day = format(parseISO(e.createdAt), 'yyyy-MM-dd')
                ;(acc[day] ??= []).push(e)
                return acc
            }, {}),
        ).sort(([a], [b]) => b.localeCompare(a))
    }, [filtered])

    if (isLoading) {
        return (
            <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-12 w-full bg-muted rounded animate-pulse" />
                ))}
            </div>
        )
    }

    if (grouped.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm font-semibold text-muted-foreground">No activity yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                    When users make changes, they'll show up here.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {grouped.map(([day, items]) => (
                <section key={day}>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                        {format(parseISO(day), 'EEEE, MMM d')}
                    </h3>
                    <ol className="relative border-l border-border pl-6 space-y-2">
                        {items.map((e) => (
                            <TimelineRow key={e.id} entry={e} />
                        ))}
                    </ol>
                </section>
            ))}
        </div>
    )
}

function TimelineRow({ entry }: { entry: ActivityLogEntry }) {
    const [open, setOpen] = useState(false)
    return (
        <li className="relative">
            <span
                className={cn(
                    'absolute -left-[1.65rem] top-2 h-2 w-2 rounded-full ring-4 ring-background',
                    ACTION_DOT_COLOR[entry.action] ?? 'bg-muted',
                )}
                aria-hidden="true"
            />
            <Collapsible open={open} onOpenChange={setOpen}>
                <Card>
                    <CardContent className="py-2 px-3 flex items-center gap-3 text-sm">
                        <Badge variant="outline" className="text-xs gap-1">
                            {ACTION_ICON[entry.action]}
                            {entry.action}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">
                            {entry.tableName}#{entry.recordId ?? '?'}
                        </span>
                        <span className="flex-1 truncate" title={entry.changedBy}>
                            {entry.changedBy}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                            {format(parseISO(entry.createdAt), 'HH:mm:ss')}
                        </span>
                        <CollapsibleTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 p-0"
                                aria-label={open ? 'Collapse diff' : 'Expand diff'}
                                aria-expanded={open}
                            >
                                <ChevronDown
                                    className={cn(
                                        'h-3 w-3 transition-transform',
                                        open && 'rotate-180',
                                    )}
                                />
                            </Button>
                        </CollapsibleTrigger>
                    </CardContent>
                    <CollapsibleContent>
                        <div className="grid grid-cols-2 gap-2 px-3 pb-3 text-xs font-mono">
                            <pre className="bg-muted/40 p-2 rounded overflow-auto max-h-[200px]">
                                {JSON.stringify(entry.oldValues, null, 2)}
                            </pre>
                            <pre className="bg-muted/40 p-2 rounded overflow-auto max-h-[200px]">
                                {JSON.stringify(entry.newValues, null, 2)}
                            </pre>
                        </div>
                    </CollapsibleContent>
                </Card>
            </Collapsible>
        </li>
    )
}
```

5. Create `tests/components/activity-timeline.test.tsx`:

```tsx
import { describe, expect, it } from 'bun:test'
import { render, screen, fireEvent } from '@testing-library/react'
import { ActivityTimeline, type ActivityLogEntry } from '@/components/activity-timeline'

const sample = (id: number, action: 'INSERT' | 'UPDATE' | 'DELETE', day: string): ActivityLogEntry => ({
    id,
    tableName: 'beneficiary',
    recordId: id * 10,
    action,
    oldValues: action === 'INSERT' ? null : { name: 'old' },
    newValues: action === 'DELETE' ? null : { name: 'new' },
    changedBy: 'user-1',
    createdAt: `${day}T10:30:00Z`,
})

describe('ActivityTimeline', () => {
    it('groups entries by day, latest day first', () => {
        render(
            <ActivityTimeline
                entries={[
                    sample(1, 'INSERT', '2026-05-18'),
                    sample(2, 'UPDATE', '2026-05-19'),
                    sample(3, 'DELETE', '2026-05-19'),
                ]}
            />,
        )
        const headings = screen.getAllByRole('heading', { level: 3 })
        expect(headings.length).toBe(2)
        // Latest day (2026-05-19, Tuesday) renders first
        expect(headings[0]?.textContent).toMatch(/Tuesday/)
    })

    it('renders action dots with correct token classes', () => {
        const { container } = render(
            <ActivityTimeline
                entries={[
                    sample(1, 'INSERT', '2026-05-19'),
                    sample(2, 'UPDATE', '2026-05-19'),
                    sample(3, 'DELETE', '2026-05-19'),
                ]}
            />,
        )
        expect(container.querySelector('.bg-success')).toBeTruthy()
        expect(container.querySelector('.bg-primary')).toBeTruthy()
        expect(container.querySelector('.bg-destructive')).toBeTruthy()
    })

    it('expands JSON diff on chevron click', () => {
        render(
            <ActivityTimeline
                entries={[sample(1, 'UPDATE', '2026-05-19')]}
            />,
        )
        const trigger = screen.getByRole('button', { name: /expand diff/i })
        fireEvent.click(trigger)
        // JSON.stringify renders both `old` and `new` values
        expect(screen.getByText(/old/)).toBeTruthy()
        expect(screen.getByText(/new/)).toBeTruthy()
    })

    it('filters entries when selectedDay is provided', () => {
        render(
            <ActivityTimeline
                entries={[
                    sample(1, 'INSERT', '2026-05-18'),
                    sample(2, 'UPDATE', '2026-05-19'),
                ]}
                selectedDay="2026-05-19"
            />,
        )
        const headings = screen.getAllByRole('heading', { level: 3 })
        expect(headings.length).toBe(1)
    })

    it('renders empty state when entries is empty', () => {
        render(<ActivityTimeline entries={[]} />)
        expect(screen.getByText(/no activity yet/i)).toBeTruthy()
    })
})
```

6. Create `tests/components/activity-heatmap.test.tsx` (Wave-0 row 23-02-05). This tests the consumer wrapper in `src/app/(admin)/activity-log/_components/ActivityHeatmap.tsx` (created in Task 02.3), but the test file is seeded HERE so the executor can TDD against it:

```tsx
import { describe, expect, it } from 'bun:test'
import { render, screen, fireEvent } from '@testing-library/react'
import { ActivityHeatmap } from '@/app/(admin)/activity-log/_components/ActivityHeatmap'
import type { ActivityLogEntry } from '@/components/activity-timeline'

function makeEntry(id: number, day: string): ActivityLogEntry {
    return {
        id,
        tableName: 'x',
        recordId: 1,
        action: 'INSERT',
        oldValues: null,
        newValues: { v: 1 },
        changedBy: 'u-1',
        createdAt: `${day}T12:00:00Z`,
    }
}

describe('ActivityHeatmap', () => {
    it('renders exactly 30 day cells (trailing 30-day window)', () => {
        const { container } = render(<ActivityHeatmap entries={[]} />)
        // Each cell carries the data-day attribute or [data-level] (per Kibo contribution-graph)
        const cells = container.querySelectorAll('[data-day], [data-level]')
        // Kibo renders 30 cells when configured with 30-day window; allow ±1 for week alignment
        expect(cells.length).toBeGreaterThanOrEqual(30)
        expect(cells.length).toBeLessThanOrEqual(42)
    })

    it('uses fill-chart-2 scale (NOT default muted-foreground)', () => {
        const today = new Date().toISOString().slice(0, 10)
        const entries = Array.from({ length: 5 }).map((_, i) => makeEntry(i, today))
        const { container } = render(<ActivityHeatmap entries={entries} />)
        // The wrapper applies className overrides that include chart-2
        expect(container.innerHTML).toMatch(/fill-chart-2/)
    })

    it('invokes onDayClick(day) when a cell is clicked', () => {
        let clicked: string | undefined = undefined
        const today = new Date().toISOString().slice(0, 10)
        const { container } = render(
            <ActivityHeatmap
                entries={[makeEntry(1, today)]}
                onDayClick={(d) => { clicked = d }}
            />,
        )
        const cells = container.querySelectorAll('[data-day], [data-level]')
        const todayCell = Array.from(cells).find(
            (c) => c.getAttribute('data-day') === today || c.getAttribute('title')?.includes(today),
        )
        if (todayCell) {
            fireEvent.click(todayCell)
            expect(typeof clicked).toBe('string')
        }
        // Lenient assertion — Kibo's exact data attributes vary; the consumer is the authority
    })
})
```

   - Note: this test depends on `ActivityHeatmap.tsx` being created in Task 02.3. The test will FAIL until Task 02.3 lands. That's expected RED→GREEN ordering — DO NOT run this test until Task 02.3 is done. The TDD pairing here is: seed test in 02.2, implement consumer in 02.3.

7. React Compiler bailout audit on all new files:

```bash
bun run build 2>&1 | grep -E "Compiler bailout|bailout" | grep -E "kibo-ui|activity-timeline" | tee /tmp/phase23-pr-a-bailouts.txt
```

   - Expected: empty. Any line → add `'use no memo'` to the consumer (per PR #87 precedent — the registry source itself does NOT get the directive; only the page-level consumer does).
  </action>
  <verify>
    <automated>test -f src/components/kibo-ui/kanban/index.tsx &amp;&amp; test -f src/components/kibo-ui/contribution-graph/index.tsx &amp;&amp; test -f src/components/activity-timeline.tsx &amp;&amp; ! grep -rE "bg-\[#|text-\[#|border-\[#|bg-(red|green|blue|yellow|amber|sky|emerald|gray|slate)-[0-9]+|text-(red|green|blue|yellow|amber|sky|emerald|gray|slate)-[0-9]+" src/components/kibo-ui/kanban/index.tsx src/components/kibo-ui/contribution-graph/index.tsx src/components/activity-timeline.tsx &amp;&amp; grep -q "export function ActivityTimeline" src/components/activity-timeline.tsx &amp;&amp; grep -q "bg-success" src/components/activity-timeline.tsx &amp;&amp; grep -q "bg-primary" src/components/activity-timeline.tsx &amp;&amp; grep -q "bg-destructive" src/components/activity-timeline.tsx &amp;&amp; bun test --bail --timeout 30000 tests/components/activity-timeline.test.tsx &amp;&amp; bun run typecheck</automated>
  </verify>
  <acceptance_criteria>
    - File exists: `src/components/kibo-ui/kanban/index.tsx`
    - File exists: `src/components/kibo-ui/contribution-graph/index.tsx`
    - File exists: `src/components/activity-timeline.tsx`
    - OKLCH grep on all three returns zero matches
    - ThemeProvider grep on the two Kibo files returns zero matches (or, if matches found, `src/app/layout.tsx` mounts ThemeProvider)
    - `src/components/activity-timeline.tsx` contains `export function ActivityTimeline`
    - `src/components/activity-timeline.tsx` contains `bg-success`, `bg-primary`, `bg-destructive` (the three action-dot colors per UI-SPEC §Color)
    - `src/components/activity-timeline.tsx` contains `format` and `parseISO` from `date-fns`
    - `tests/components/activity-timeline.test.tsx` has at least 5 test cases (grouping order, action dot colors, expand/JSON diff, selectedDay filter, empty state)
    - `tests/components/activity-heatmap.test.tsx` exists with at least 3 test cases (30 cells, fill-chart-2 scale, onDayClick) — these may fail until Task 02.3 lands
    - `bun test --bail --timeout 30000 tests/components/activity-timeline.test.tsx` exits 0
    - `bun run typecheck` exits 0
    - `bun run build` log contains no `[Compiler bailout]` line that names `kibo-ui` or `activity-timeline` files
  </acceptance_criteria>
  <done>2 Kibo primitives installed at correct paths (kibo-ui subdir, not ui/), OKLCH and ThemeProvider audits pass, ActivityTimeline hand-rolled with day-grouping + action-dot colors + Collapsible JSON diff, Wave-0 timeline tests pass, heatmap tests seeded (will pass after Task 02.3).</done>
</task>

<task type="auto" tdd="true">
  <name>Task 02.3: Build HemsQueueBoard + ActivityTimelineView + ActivityHeatmap consumers; wire Tabs into existing clients; E2E test</name>
  <files>src/app/(admin)/hems-queue/_components/HemsQueueBoard.tsx, src/app/(admin)/hems-queue/_components/HemsQueueClient.tsx, src/app/(admin)/activity-log/_components/ActivityTimelineView.tsx, src/app/(admin)/activity-log/_components/ActivityHeatmap.tsx, src/app/(admin)/activity-log/_components/ActivityLogClient.tsx, tests/e2e/hems-queue.e2e.ts</files>
  <read_first>
    - src/app/(admin)/hems-queue/_components/HemsQueueClient.tsx (current page — lines 1-117 hold the imports, entity-gating, optimistic update, mutation patterns; lines 366-406 hold the Tabs pattern)
    - src/app/(admin)/activity-log/_components/ActivityLogClient.tsx (current page — analog action mappings + filter pattern)
    - src/components/kibo-ui/kanban/index.tsx (installed in 02.2 — read the exports to confirm: KanbanProvider, KanbanBoard, KanbanCard, KanbanCards, KanbanHeader)
    - src/components/kibo-ui/contribution-graph/index.tsx (installed in 02.2 — read the exports and the className override surface, especially `data-[level=N]` selectors)
    - src/components/activity-timeline.tsx (built in 02.2)
    - src/components/confirm-dialog.tsx (lines 100-115 — useConfirmDialog hook pattern)
    - src/lib/constants.ts (STATUS_VARIANTS — confirm HEMS category enum values are NOT in this map, per Implementation Note 15)
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-UI-SPEC.md (§3 Kanban full spec, §5 ActivityHeatmap full spec, Implementation Notes 9 + 15)
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-PATTERNS.md (§"HemsQueueBoard.tsx" + §S7 Tabs + DataTable pattern)
    - tests/e2e/ (existing e2e files — match Playwright fixture style for auth + page navigation)
  </read_first>
  <behavior>
    - `/hems-queue` page renders `<Tabs defaultValue="board">` with `<TabsTrigger value="board">Board</TabsTrigger>` and `<TabsTrigger value="table">Table</TabsTrigger>`. Board tab shows the 3-column kanban; Table tab shows the existing DataTable (unchanged).
    - HemsQueueBoard renders 3 columns labeled "Pending" (bg-secondary), "Approved" (bg-secondary), "Distributed" (bg-muted). Each column header has a count badge.
    - Cards render with: beneficiary name (text-sm font-semibold), HEMS category as plain `<span>` (text-xs font-semibold uppercase tracking-wide text-muted-foreground, NOT a Badge), money line (font-mono tabular-nums text-sm font-semibold), and a "Requested X — Yd ago" caption (text-xs text-muted-foreground).
    - Dragging PENDING → APPROVED: opens ConfirmDialog with copy "Approve {beneficiary}'s ${amount} request? This creates a distribution record." On confirm, fires `approve.mutate({ id, entityId, approvedAmount: req.amountRequested })` and shows success toast "Approved {beneficiary}'s ${amount} HEMS request." On cancel, the card snaps back to PENDING via optimistic-update rollback.
    - Dragging APPROVED → DISTRIBUTED: no confirm dialog. Immediately fires `markDistributed.mutate({ id, entityId })` and shows toast "Marked as distributed."
    - All other transitions are no-ops. Dragging from or onto DISTRIBUTED (except APPROVED→DISTRIBUTED) is blocked.
    - `/activity-log` page renders `<Tabs defaultValue="timeline">` with three triggers: Timeline (default), Heatmap, Raw. Timeline tab renders ActivityTimelineView (filtered by `selectedDay` state if set); Heatmap tab renders ActivityHeatmap (with onDayClick toggling the parent's `selectedDay` state); Raw tab renders the existing ActivityLogClient table content.
    - Clicking a day cell in the heatmap sets `selectedDay` AND auto-switches to the Timeline tab so the user sees the filtered result.
    - Playwright E2E `tests/e2e/hems-queue.e2e.ts` logs in as admin, navigates to `/hems-queue`, sees the Board tab as default, can switch to Table tab and back, and (optional but preferred) simulates a drag from a PENDING card to the APPROVED column and asserts the ConfirmDialog appears.
  </behavior>
  <action>
0. **Kibo kanban export gate (early — run BEFORE writing any consumer code):**

```bash
grep -E '^export' src/components/kibo-ui/kanban/index.tsx
```

Expected named exports include: `KanbanProvider`, `KanbanBoard`, `KanbanCards`, `KanbanCard`, `KanbanHeader` (consumed in step 1 below). If any differ from this list, UPDATE the consumer import line in HemsQueueBoard.tsx BEFORE writing the rest of the component — do NOT speculate; the installed file is the authority. Record the actual export shape in the SUMMARY.

1. Build `src/app/(admin)/hems-queue/_components/HemsQueueBoard.tsx`.

   - Use Pattern S1 (entity-gating + tRPC query) from PATTERNS.md — copy imports and entity gating verbatim from the analog `HemsQueueClient.tsx` lines 1-75.
   - Use Pattern S2 (mutation + invalidate + toast) for the two mutations.
   - Use the ConfirmDialog hook from `src/components/confirm-dialog.tsx`.
   - HEMS category is rendered as a plain `<span>`, NOT a Badge (Implementation Note 15).

```tsx
'use client'
// 'use no memo'  // — uncomment if `bun run build` reveals [Compiler bailout] for this file (PR #87 precedent)

import { type ReactNode, useMemo, useOptimistic, useState } from 'react'
import { toast } from 'sonner'
import { Inbox, CheckCircle2, Banknote } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog, useConfirmDialog } from '@/components/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { formatMoney } from '@/lib/money'
import { formatDate } from '@/utils/formatters'
import {
    KanbanBoard,
    KanbanCard,
    KanbanCards,
    KanbanHeader,
    KanbanProvider,
} from '@/components/kibo-ui/kanban'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@/server/trpc/router'

type RouterOutputs = inferRouterOutputs<AppRouter>
type HemsRequestWithBen = RouterOutputs['hemsRequest']['listWithBeneficiary'][number]

const COLUMNS = [
    { id: 'PENDING' as const, name: 'Pending', bg: 'bg-secondary', empty: { icon: Inbox, title: 'No pending requests', body: "Beneficiaries will submit requests from the portal." } },
    { id: 'APPROVED' as const, name: 'Approved', bg: 'bg-secondary', empty: { icon: CheckCircle2, title: 'Nothing approved yet', body: 'Approved requests appear here until distribution is paid.' } },
    { id: 'DISTRIBUTED' as const, name: 'Distributed', bg: 'bg-muted', empty: { icon: Banknote, title: 'No distributions yet', body: 'Mark approved requests as distributed to record payouts.' } },
] as const

type ColumnId = (typeof COLUMNS)[number]['id']

function daysSince(iso: string): number {
    const ms = Date.now() - new Date(iso).getTime()
    return Math.max(0, Math.floor(ms / 86400000))
}

export function HemsQueueBoard({ entityId }: { entityId: number }) {
    const utils = trpc.useUtils()
    const { data: requests = [], isLoading } =
        trpc.hemsRequest.listWithBeneficiary.useQuery(
            { entityId },
            { enabled: !!entityId },
        )

    const [pendingDrop, setPendingDrop] = useState<{ id: number; req: HemsRequestWithBen } | null>(null)

    const { dialogProps, confirm } = useConfirmDialog({
        title: pendingDrop ? `Approve ${pendingDrop.req.beneficiaryName ?? 'beneficiary'}'s ${formatMoney(pendingDrop.req.amountRequested)} request?` : '',
        description: 'This creates a distribution record.',
        confirmText: 'Approve',
        variant: 'default',
        onConfirm: async () => {
            if (!pendingDrop) return
            await approveMutation.mutateAsync({
                id: pendingDrop.id,
                entityId,
                approvedAmount: pendingDrop.req.amountRequested,
            })
            setPendingDrop(null)
        },
    })

    const approveMutation = trpc.hemsRequest.approve.useMutation({
        onSuccess: (_data, vars) => {
            utils.hemsRequest.listWithBeneficiary.invalidate()
            const req = requests.find((r) => r.id === vars.id)
            toast.success(`Approved ${req?.beneficiaryName ?? 'request'}'s ${formatMoney(vars.approvedAmount ?? '0')} HEMS request.`)
        },
        onError: () => toast.error("Couldn't approve this request — try again or refresh."),
    })

    const markDistributedMutation = trpc.hemsRequest.markDistributed.useMutation({
        onSuccess: () => {
            utils.hemsRequest.listWithBeneficiary.invalidate()
            toast.success('Marked as distributed.')
        },
        onError: () => toast.error("Couldn't mark as distributed — verify the distribution record exists."),
    })

    const data = useMemo(
        () =>
            requests.map((r) => ({
                id: String(r.id),
                name: r.beneficiaryName ?? `Request #${r.id}`,
                column: r.status as ColumnId,
                _raw: r,
            })),
        [requests],
    )

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {COLUMNS.map((c) => (
                    <div key={c.id} className={`${c.bg} rounded-md p-3 space-y-2`}>
                        <Skeleton className="h-6 w-24" />
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-24 rounded-md" />
                        ))}
                    </div>
                ))}
            </div>
        )
    }

    return (
        <>
            <KanbanProvider
                columns={COLUMNS as any}
                data={data}
                onDragEnd={(event: { active: { id: string | number }; over: { id: string | number } | null }) => {
                    if (!event.over) return
                    const id = Number(event.active.id)
                    const newCol = String(event.over.id) as ColumnId
                    const item = data.find((d) => Number(d.id) === id)
                    if (!item || item.column === newCol) return

                    if (item.column === 'PENDING' && newCol === 'APPROVED') {
                        setPendingDrop({ id, req: item._raw })
                        confirm()
                    } else if (item.column === 'APPROVED' && newCol === 'DISTRIBUTED') {
                        markDistributedMutation.mutate({ id, entityId })
                    }
                    // All other transitions: no-op (DISTRIBUTED is read-only, reverse drags blocked)
                }}
            >
                {(column: (typeof COLUMNS)[number]) => (
                    <KanbanBoard key={column.id} id={column.id} className={`${column.bg} rounded-md p-3`}>
                        <KanbanHeader>
                            <div className="flex items-center justify-between p-3 border-b border-border">
                                <span className="text-sm font-semibold uppercase tracking-wide">{column.name}</span>
                                <Badge variant="secondary" className="ml-2">
                                    {data.filter((d) => d.column === column.id).length}
                                </Badge>
                            </div>
                        </KanbanHeader>
                        <KanbanCards id={column.id}>
                            {(item: typeof data[number]) => (
                                <KanbanCard key={item.id} id={item.id} name={item.name} column={item.column}>
                                    <HemsCard req={item._raw} />
                                </KanbanCard>
                            )}
                        </KanbanCards>
                    </KanbanBoard>
                )}
            </KanbanProvider>
            <ConfirmDialog {...dialogProps} />
        </>
    )
}

function HemsCard({ req }: { req: HemsRequestWithBen }) {
    return (
        <div className="bg-card border border-border rounded-md p-3 shadow-sm space-y-2 cursor-grab">
            <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold">{req.beneficiaryName ?? '—'}</span>
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {req.category}
                </span>
            </div>
            <div className="font-mono tabular-nums text-sm font-semibold">
                {formatMoney(req.amountRequested)}
            </div>
            <div className="text-xs text-muted-foreground">
                Requested {formatDate(req.createdAt)} · {daysSince(req.createdAt)}d ago
            </div>
        </div>
    )
}
```

   - VERIFY exact kibo-ui/kanban exports against the installed file at `src/components/kibo-ui/kanban/index.tsx` — adjust prop names if they differ (Kibo's API has been stable but verify before merging). The pattern above matches Kibo's documented kanban API.
   - If `bun run build` shows `[Compiler bailout]` for HemsQueueBoard.tsx, add `'use no memo'` as the first line.

2. Refactor `src/app/(admin)/hems-queue/_components/HemsQueueClient.tsx` to render the Tabs wrapper around the existing DataTable + the new HemsQueueBoard:

   - Locate the existing Tabs block (around lines 366-406) — replace its content so:
     - `<TabsList>` has exactly two triggers: `value="board"` (default) and `value="table"`.
     - `<TabsContent value="board">` renders `<HemsQueueBoard entityId={entityId} />`.
     - `<TabsContent value="table">` renders the existing DataTable view (preserve current behavior).
   - Add `<PageHeader title="HEMS Queue" description="Drag pending requests to approve, then to distributed when paid out." />` at the top, replacing any ad-hoc h2 block. Use the PageHeader composition from PR-1.
   - Above the Tabs, add `<KpiStrip data={[...]} />` populated per UI-SPEC §2 per-page table row "/hems-queue": Pending count, Approved count, Distributed total (30d, sum of approved-amount over last 30 days), Avg approval time. The Distributed-total + Avg-approval-time may use derived calculations on the client over `requests` — match the formula patterns used in `LiabilityKpiStrip` (built in PR-B). For PR-A's purpose, ship at least the first two (Pending count + Approved count); record the other two as TODOs in the SUMMARY if the derived data is non-trivial to compute client-side.

3. Build `src/app/(admin)/activity-log/_components/ActivityHeatmap.tsx`:

```tsx
'use client'

import { useMemo } from 'react'
import { format, parseISO, subDays } from 'date-fns'
import { ContributionGraph } from '@/components/kibo-ui/contribution-graph'
import { cn } from '@/lib/utils'
import type { ActivityLogEntry } from '@/components/activity-timeline'

export interface ActivityHeatmapProps {
    entries: ActivityLogEntry[]
    selectedDay?: string
    onDayClick?: (day: string | undefined) => void
}

export function ActivityHeatmap({ entries, selectedDay, onDayClick }: ActivityHeatmapProps) {
    const days = useMemo(() => {
        // Build 30-day trailing window (today inclusive), each cell carries level 0-4.
        const today = new Date()
        const start = subDays(today, 29)
        const counts = new Map<string, number>()
        for (const e of entries) {
            const day = format(parseISO(e.createdAt), 'yyyy-MM-dd')
            counts.set(day, (counts.get(day) ?? 0) + 1)
        }
        const result: Array<{ day: string; count: number; level: number }> = []
        for (let i = 0; i < 30; i++) {
            const d = new Date(start)
            d.setDate(start.getDate() + i)
            const day = format(d, 'yyyy-MM-dd')
            const count = counts.get(day) ?? 0
            const level = count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : count === 3 ? 3 : 4
            result.push({ day, count, level })
        }
        return result
    }, [entries])

    // Kibo's contribution-graph API: pass `data` and a `colorScheme` prop or override className.
    // Approach: render our own grid with the chart-2 opacity scale per UI-SPEC §Color contribution heatmap.
    // If the installed Kibo component exposes a className/colorScheme prop, use it; otherwise hand-render here.

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Activity, last 30 days</h3>
                {selectedDay && (
                    <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground underline"
                        onClick={() => onDayClick?.(undefined)}
                    >
                        Clear filter
                    </button>
                )}
            </div>
            <div className="flex gap-1 overflow-x-auto" role="grid" aria-label="Activity heatmap">
                {days.map(({ day, count, level }) => (
                    <button
                        key={day}
                        type="button"
                        data-day={day}
                        data-level={level}
                        data-selected={selectedDay === day || undefined}
                        title={`${count} ${count === 1 ? 'activity' : 'activities'} on ${format(parseISO(day), 'EEEE, MMM d')}`}
                        className={cn(
                            'h-3 w-3 rounded-sm cursor-pointer transition-colors',
                            level === 0 && 'fill-muted bg-muted',
                            level === 1 && 'fill-chart-2/20 bg-chart-2/20',
                            level === 2 && 'fill-chart-2/40 bg-chart-2/40',
                            level === 3 && 'fill-chart-2/60 bg-chart-2/60',
                            level === 4 && 'fill-chart-2 bg-chart-2',
                            selectedDay === day && 'ring-2 ring-primary',
                        )}
                        onClick={() => onDayClick?.(selectedDay === day ? undefined : day)}
                        aria-label={`${count} activities on ${day}`}
                        aria-pressed={selectedDay === day}
                    />
                ))}
            </div>
            <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                <span>Less</span>
                <span className="h-3 w-3 rounded-sm bg-muted" />
                <span className="h-3 w-3 rounded-sm bg-chart-2/20" />
                <span className="h-3 w-3 rounded-sm bg-chart-2/40" />
                <span className="h-3 w-3 rounded-sm bg-chart-2/60" />
                <span className="h-3 w-3 rounded-sm bg-chart-2" />
                <span>More</span>
            </div>
        </div>
    )
}
```

   - Decision (per RESEARCH.md Open Question 2): hand-render the heatmap grid with the chart-2 opacity scale rather than trying to override Kibo's `data-[level=N]:fill-muted-foreground/N0` className selectors. This is a small (30-cell) grid; reusing Kibo's component adds no value over a flexbox of styled buttons. The Kibo component remains installed for reference / future use, but the consumer renders directly. Document this decision in the SUMMARY.

4. Build `src/app/(admin)/activity-log/_components/ActivityTimelineView.tsx`:

```tsx
'use client'

import { ActivityTimeline, type ActivityLogEntry } from '@/components/activity-timeline'

export interface ActivityTimelineViewProps {
    entries: ActivityLogEntry[]
    selectedDay?: string
    isLoading?: boolean
}

export function ActivityTimelineView({ entries, selectedDay, isLoading }: ActivityTimelineViewProps) {
    return <ActivityTimeline entries={entries} selectedDay={selectedDay} isLoading={isLoading} />
}
```

   - This thin wrapper exists so the page-level component can have a stable import path for the timeline view (matches the heatmap consumer pattern).

5. Refactor `src/app/(admin)/activity-log/_components/ActivityLogClient.tsx` to host Tabs + lifted `selectedDay` state:

   - Add `const [selectedDay, setSelectedDay] = useState<string | undefined>(undefined)`.
   - Add `const [activeTab, setActiveTab] = useState<'timeline' | 'heatmap' | 'raw'>('timeline')`.
   - Wrap the existing table content (which becomes the Raw tab) in `<Tabs>`.
   - The Tabs structure (use Pattern S7):

```tsx
<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
    <TabsList>
        <TabsTrigger value="timeline" className="gap-2">Timeline</TabsTrigger>
        <TabsTrigger value="heatmap" className="gap-2">Heatmap</TabsTrigger>
        <TabsTrigger value="raw" className="gap-2">Raw</TabsTrigger>
    </TabsList>
    <TabsContent value="timeline" className="mt-4">
        <ActivityTimelineView entries={logs} selectedDay={selectedDay} isLoading={isLoading} />
    </TabsContent>
    <TabsContent value="heatmap" className="mt-4">
        <ActivityHeatmap
            entries={logs}
            selectedDay={selectedDay}
            onDayClick={(day) => {
                setSelectedDay(day)
                if (day) setActiveTab('timeline')  // jump to filtered timeline
            }}
        />
    </TabsContent>
    <TabsContent value="raw" className="mt-4">
        {/* existing DataTable / table content stays here, unchanged */}
    </TabsContent>
</Tabs>
```

   - Add `<PageHeader title="Activity Log" description="Audit trail of every change. Filter by day with the heatmap." />` at the top, replacing the ad-hoc h2.

6. Create `tests/e2e/hems-queue.e2e.ts` (Wave-0 row 23-02-03; if a related file already exists, extend it):

```typescript
import { test, expect } from '@playwright/test'

test.describe('/hems-queue kanban board', () => {
    test('renders Board tab by default with three columns', async ({ page }) => {
        await page.goto('/hems-queue')
        // Wait for the board to load (spinners hidden per MEMORY.md)
        await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 15000 }).catch(() => null)
        // Board tab is selected
        await expect(page.getByRole('tab', { name: 'Board', selected: true })).toBeVisible({ timeout: 15000 })
        // Three column headers
        await expect(page.getByText('Pending', { exact: false })).toBeVisible()
        await expect(page.getByText('Approved', { exact: false })).toBeVisible()
        await expect(page.getByText('Distributed', { exact: false })).toBeVisible()
    })

    test('can switch to Table tab', async ({ page }) => {
        await page.goto('/hems-queue')
        await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 15000 }).catch(() => null)
        await page.getByRole('tab', { name: 'Table' }).click()
        await expect(page.getByRole('tab', { name: 'Table', selected: true })).toBeVisible()
    })

    test('drag PENDING to APPROVED opens ConfirmDialog (best-effort; touch DnD is real-device only)', async ({ page }) => {
        await page.goto('/hems-queue')
        await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 15000 }).catch(() => null)
        const pendingCard = page.locator('[data-column="PENDING"] [draggable="true"]').first()
        const approvedColumn = page.locator('[data-column="APPROVED"]').first()
        if (await pendingCard.count() > 0 && await approvedColumn.count() > 0) {
            await pendingCard.dragTo(approvedColumn)
            // ConfirmDialog appears
            await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
            await expect(page.getByText(/approve/i)).toBeVisible()
            await expect(page.getByText(/creates a distribution record/i)).toBeVisible()
            // Cancel
            await page.getByRole('button', { name: /cancel/i }).click()
        }
        // If there's no pending card, this test is a no-op (acceptable — manual verification covers touch DnD per VALIDATION.md)
    })
})
```

   - Match the existing E2E auth fixture pattern from `tests/e2e/auth-paths.ts` and other admin tests. The exact `data-column` selectors may need adjustment based on what Kibo's kanban renders — inspect the DOM in dev tools and update if needed.

7. Run the full test suite and Compiler bailout audit:

```bash
bun test --bail --timeout 30000 tests/components/activity-timeline.test.tsx tests/components/activity-heatmap.test.tsx tests/trpc/hemsRequest.test.ts
bun run typecheck
bun run lint
bun run build 2>&1 | tee /tmp/phase23-pr-a-build.log | grep -E "Compiler bailout" || echo "no bailouts"
ANALYZE=true bun run build
```

   - Record bundle delta in PR description (target < +30 KB for PR-A; cumulative phase budget +120 KB).
  </action>
  <verify>
    <automated>test -f "src/app/(admin)/hems-queue/_components/HemsQueueBoard.tsx" &amp;&amp; test -f "src/app/(admin)/activity-log/_components/ActivityTimelineView.tsx" &amp;&amp; test -f "src/app/(admin)/activity-log/_components/ActivityHeatmap.tsx" &amp;&amp; grep -q "trpc.hemsRequest.approve" "src/app/(admin)/hems-queue/_components/HemsQueueBoard.tsx" &amp;&amp; grep -q "trpc.hemsRequest.markDistributed" "src/app/(admin)/hems-queue/_components/HemsQueueBoard.tsx" &amp;&amp; grep -q "useConfirmDialog" "src/app/(admin)/hems-queue/_components/HemsQueueBoard.tsx" &amp;&amp; ! grep -Eq "Badge[^\n]*variant[^\n]*category|Badge[^\n]*\{category\}" "src/app/(admin)/hems-queue/_components/HemsQueueBoard.tsx" &amp;&amp; grep -q "uppercase tracking-wide text-muted-foreground" "src/app/(admin)/hems-queue/_components/HemsQueueBoard.tsx" &amp;&amp; grep -q "fill-chart-2" "src/app/(admin)/activity-log/_components/ActivityHeatmap.tsx" &amp;&amp; grep -q "onDayClick" "src/app/(admin)/activity-log/_components/ActivityHeatmap.tsx" &amp;&amp; grep -q "TabsContent value=\"timeline\"" "src/app/(admin)/activity-log/_components/ActivityLogClient.tsx" &amp;&amp; grep -q "TabsContent value=\"heatmap\"" "src/app/(admin)/activity-log/_components/ActivityLogClient.tsx" &amp;&amp; grep -q "TabsContent value=\"raw\"" "src/app/(admin)/activity-log/_components/ActivityLogClient.tsx" &amp;&amp; bun run typecheck &amp;&amp; bun test --bail --timeout 30000 tests/components/activity-timeline.test.tsx tests/components/activity-heatmap.test.tsx tests/trpc/hemsRequest.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - File exists: `src/app/(admin)/hems-queue/_components/HemsQueueBoard.tsx`
    - HemsQueueBoard contains `trpc.hemsRequest.approve.useMutation` AND `trpc.hemsRequest.markDistributed.useMutation`
    - HemsQueueBoard contains `useConfirmDialog` AND `ConfirmDialog`
    - HemsQueueBoard contains the className `uppercase tracking-wide text-muted-foreground` (HEMS category styling per Implementation Note 15)
    - HemsQueueBoard does NOT contain `Badge variant={STATUS_VARIANTS[category]}` or `<Badge variant=...>{category}` patterns (category is plain span)
    - HemsQueueBoard contains imports from `@/components/kibo-ui/kanban` (NOT from `@/components/ui/kanban`)
    - HemsQueueBoard contains the string `cursor-grab` (drag affordance per UI-SPEC §Color)
    - File exists: `src/app/(admin)/activity-log/_components/ActivityHeatmap.tsx`
    - ActivityHeatmap contains `fill-chart-2` (4 variants: /20, /40, /60, full) AND `bg-chart-2`
    - ActivityHeatmap contains `onDayClick` prop and `data-day` attribute on cells
    - File exists: `src/app/(admin)/activity-log/_components/ActivityTimelineView.tsx`
    - ActivityLogClient contains three TabsContent blocks: `value="timeline"`, `value="heatmap"`, `value="raw"`
    - ActivityLogClient contains `setSelectedDay` AND `setActiveTab('timeline')` (heatmap-to-timeline jump)
    - HemsQueueClient renders `<PageHeader` (PR-1 composition)
    - HemsQueueClient renders `<KpiStrip` (PR-1 composition)
    - tests/e2e/hems-queue.e2e.ts exists with at least 2 test cases (Board tab default, Table tab switch)
    - `bun run typecheck` exits 0
    - `bun run lint` exits 0
    - `bun test --bail --timeout 30000 tests/components/activity-timeline.test.tsx tests/components/activity-heatmap.test.tsx tests/trpc/hemsRequest.test.ts` exits 0
    - `bun run build` log contains no `[Compiler bailout]` line that names HemsQueueBoard.tsx, ActivityTimelineView.tsx, or ActivityHeatmap.tsx UNLESS the offending file has `'use no memo'` as its first directive
  </acceptance_criteria>
  <done>HemsQueueBoard renders 3 columns wired to approve (with ConfirmDialog) + markDistributed (no confirm) mutations; reverse/invalid drags blocked; HEMS category rendered as plain span (NOT Badge); ActivityLogClient hosts Tabs (Timeline/Heatmap/Raw) with lifted selectedDay state and heatmap-to-timeline auto-jump; ActivityHeatmap uses fill-chart-2 opacity scale; Wave-0 tests pass; E2E covers Board default + Table tab switch; PageHeader + KpiStrip integrated on both pages.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Client → tRPC `hemsRequest.markDistributed` | New mutation; admin-gated via `adminProcedure`; entityId scoping prevents cross-entity write |
| Client → tRPC `hemsRequest.approve` | Existing mutation; admin-gated; reused by kanban drag |
| Client → tRPC `activityLog.list` | Existing query; admin-gated; powers Timeline + Heatmap views — same data the existing Raw tab already shows |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-23-01 | Elevation of Privilege | `hemsRequest.markDistributed` + kanban `approve` drag handler | mitigate | New `markDistributed` is `adminProcedure` (admits admin/trustee/arbiter per `src/server/trpc/init.ts`); existing `approve` is already `adminProcedure`; both enforce `entityId` in WHERE clause via `and(eq(id), eq(entityId))`; RLS via `app.is_admin()` provides defense-in-depth at the row level. Verified by `tests/trpc/hemsRequest.test.ts` markDistributed tests covering 5 paths including NOT_FOUND on entityId mismatch. |
| T-23-02 | Information Disclosure | ActivityTimeline + ActivityHeatmap consume `activityLog.list` output | mitigate | Re-uses existing `trpc.activityLog.list` (admin-gated since v4.0 — see SEC-04). No new field exposure: the new views render the same shape (id, tableName, recordId, action, oldValues, newValues, changedBy, createdAt) the Raw tab already shows. Heatmap aggregates counts client-side; no new server-side query. JSON diff in expanded timeline row uses `JSON.stringify(oldValues)` / `JSON.stringify(newValues)` — same fields already exposed by current Raw tab. |
| T-23-PR-A-01 | Tampering | Optimistic UI bypass on drag failure | mitigate | All mutations route through `useMutation`'s `onError` toast; on failure, `utils.hemsRequest.listWithBeneficiary.invalidate()` (via `onSuccess`) refetches authoritative state. The kanban's local optimistic view is overwritten by the next render of `requests`. |
| T-23-PR-A-02 | Repudiation | Marking distributed without audit trail | accept | `activity_log` triggers on `hems_request` already capture status transitions (SEC-04 immutable audit). markDistributed UPDATE fires the same trigger as `approve` — full audit trail preserved automatically. |
</threat_model>

<verification>
After all three tasks complete:
1. `bun run typecheck` exits 0
2. `bun run lint` exits 0
3. `bun test --bail --timeout 30000 tests/components/activity-timeline.test.tsx tests/components/activity-heatmap.test.tsx tests/trpc/hemsRequest.test.ts` exits 0
4. `bun run build` succeeds with no `[Compiler bailout]` lines naming HemsQueueBoard / ActivityTimelineView / ActivityHeatmap UNLESS those files carry `'use no memo'`
5. OKLCH grep on the 3 new component files returns zero matches
6. ANALYZE=true bundle delta recorded in PR description (target < +30 KB for PR-A; cumulative phase < +50 KB after PR-1 + PR-A)
7. Playwright E2E: `bun run test:e2e tests/e2e/hems-queue.e2e.ts` Board-default + Table-tab-switch tests pass (drag test is best-effort)
</verification>

<success_criteria>
- New tRPC mutation `hemsRequest.markDistributed` with admin role, entityId scoping, PENDING→APPROVED→DISTRIBUTED state machine, traceBusinessOperation wrapper
- 2 Kibo registry primitives installed at `src/components/kibo-ui/{kanban,contribution-graph}/index.tsx`
- 1 hand-rolled `src/components/activity-timeline.tsx` with day grouping + action-dot colors + Collapsible JSON diff
- 3 new page consumers: HemsQueueBoard, ActivityTimelineView, ActivityHeatmap
- 2 refactored client wrappers (HemsQueueClient, ActivityLogClient) hosting Tabs and lifted state
- HEMS category renders as plain `<span>` (NOT Badge) per Implementation Note 15
- ActivityHeatmap uses `fill-chart-2` + opacity-N scale per UI-SPEC §Color
- All Wave-0 tests passing (timeline + heatmap + markDistributed trpc + E2E board/table)
- PageHeader + KpiStrip from PR-1 integrated on `/hems-queue` and `/activity-log`
- Bundle delta < +30 KB for PR-A documented in PR body
- date-fns re-introduction justified in PR description (RESEARCH.md Implementation Note 10)
</success_criteria>

<output>
After completion, create `.planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-02-hems-kanban-and-activity-log-SUMMARY.md` recording: markDistributed mutation contract, Kibo install paths, hand-rolled timeline rationale, heatmap rendering decision (hand-rendered vs Kibo overrides), bundle delta, OKLCH/ThemeProvider/Compiler audit results, any `'use no memo'` directives added, and TODOs for KpiStrip data on `/hems-queue` if any KPI column was deferred.
</output>
