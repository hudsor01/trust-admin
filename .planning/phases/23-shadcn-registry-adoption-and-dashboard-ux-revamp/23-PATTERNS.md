# Phase 23: Shadcn registry adoption and dashboard UX revamp — Pattern Map

**Mapped:** 2026-05-19
**Files analyzed:** 38 new / 8 modified
**Analogs found:** 32 / 46 (the remaining 14 are pure CLI registry installs with no in-repo analog — listed in §No Analog Found)

---

## File Classification

### NEW — Local compositions

| New file | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `src/components/page-header.tsx` | composition | request-response (props only) | `src/app/(admin)/accounting/_components/AccountingHeader.tsx` | exact (role-only) |
| `src/components/kpi-strip.tsx` | composition | request-response | `src/components/summary-card-grid.tsx` + `src/components/summary-card.tsx` | exact |
| `src/components/activity-timeline.tsx` | composition (hand-rolled) | request-response | `src/app/(admin)/activity-log/_components/ActivityLogClient.tsx` | partial — same data shape, different visual |
| `src/components/preference-row.tsx` | composition | request-response | `src/app/(admin)/settings/_components/SettingsClient.tsx` `<PersonRow>` (lines 50-104) | partial |

### NEW — Primitives (hand-rolled / hand-adapted)

| New file | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `src/components/ui/kbd.tsx` | registry primitive (hand-rolled) | n/a (stateless) | `src/components/ui/badge.tsx` (small wrapped element pattern) | role-match |
| `src/components/ui/data-table-bulk-actions.tsx` | data-table sub-primitive | event-driven (selection state) | `src/components/ui/data-table-view-options.tsx` | exact |
| `src/components/ui/data-table-export.tsx` | data-table sub-primitive | transform (CSV) | `src/components/ui/data-table-view-options.tsx` + `src/utils/formatters.ts` | role-match |

### NEW — Registry installs (Kibo UI, `src/components/kibo-ui/<slug>/index.tsx`)

| New file | Role | Data Flow | Analog | Notes |
|----------|------|-----------|--------|-------|
| `src/components/kibo-ui/kanban/index.tsx` | registry primitive | event-driven (DnD) | — (no in-repo analog) | CLI install, no source we author |
| `src/components/kibo-ui/gantt/index.tsx` | registry primitive | request-response | — | CLI install |
| `src/components/kibo-ui/contribution-graph/index.tsx` | registry primitive | request-response | — | CLI install |
| `src/components/kibo-ui/avatar-stack/index.tsx` | registry primitive | request-response | `src/components/ui/avatar.tsx` (downstream wrapper only) | CLI install |
| `src/components/kibo-ui/dropzone/index.tsx` | registry primitive | file-I/O | `src/lib/uploadthing-server.ts` (downstream wiring only) | CLI install |

### NEW — Registry installs (Dice UI, `src/components/ui/<slug>.tsx`)

| New file | Role | Data Flow | Analog | Notes |
|----------|------|-----------|--------|-------|
| `src/components/ui/combobox.tsx` | registry primitive | request-response | `src/components/ui/select.tsx` (downstream consumer pattern only) | CLI install |
| `src/components/ui/tags-input.tsx` | registry primitive | request-response | — | CLI install |
| `src/components/ui/phone-input.tsx` | registry primitive | request-response | `src/components/ui/input.tsx` | CLI install |
| `src/components/ui/mask-input.tsx` | registry primitive | request-response | `src/components/ui/input.tsx` | CLI install |
| `src/components/ui/sortable.tsx` | registry primitive | event-driven (DnD) | — | CLI install |
| `src/components/ui/stepper.tsx` | registry primitive | request-response | — | CLI install |
| `src/components/ui/context-menu.tsx` | shadcn-official (gantt dep) | event-driven | `src/components/ui/dropdown-menu.tsx` | CLI install |

### NEW — Page consumers

| New file | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `src/app/(admin)/hems-queue/_components/HemsQueueBoard.tsx` | page consumer | event-driven (DnD → mutation) | `src/app/(admin)/hems-queue/_components/HemsQueueClient.tsx` (same dir, same router) | exact |
| `src/app/(admin)/activity-log/_components/ActivityTimelineView.tsx` | page consumer | request-response | `src/app/(admin)/activity-log/_components/ActivityLogClient.tsx` | exact |
| `src/app/(admin)/activity-log/_components/ActivityHeatmap.tsx` | page consumer | request-response | `src/app/(admin)/activity-log/_components/ActivityLogClient.tsx` (filter state) | role-match |
| `src/app/(admin)/liabilities/_components/LiabilityGantt.tsx` | page consumer | request-response | `src/app/(admin)/liabilities/_components/LiabilitiesClient.tsx` (entity-gating query) | exact |
| `src/app/(admin)/liabilities/_components/LiabilityKpiStrip.tsx` | page consumer | request-response | `src/app/(admin)/liabilities/_components/LiabilitySummaryCards.tsx` | exact |
| `src/app/(admin)/liabilities/_components/DebtToEquityDonut.tsx` | page consumer (chart) | request-response | `src/components/charts/asset-allocation-chart.tsx` | exact |
| `src/app/(admin)/beneficiaries/_components/BeneficiaryShareDonuts.tsx` | page consumer (chart) | request-response | `src/components/charts/asset-allocation-chart.tsx` | exact |
| `src/app/(admin)/beneficiaries/_components/WithdrawalMilestoneGantt.tsx` | page consumer | request-response | `src/app/(admin)/liabilities/_components/LiabilityGantt.tsx` (sibling) | role-match |
| `src/app/(admin)/beneficiaries/_components/BeneficiaryAvatarStack.tsx` | page consumer | request-response | — (new primitive) | role-match |
| `src/app/(admin)/trustees/_components/TrusteeSortableList.tsx` | page consumer | event-driven (DnD → mutation) | `src/server/trpc/routers/trustee.ts` (mutation contract) | role-match |
| `src/app/(admin)/beneficiaries/_components/BeneficiarySortableList.tsx` | page consumer | event-driven | `src/app/(admin)/beneficiaries/_components/BeneficiariesClient.tsx` | role-match |

### NEW — Settings sub-components (`src/app/(admin)/settings/_components/`)

| New file | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `SettingsTrustInfoCard.tsx` | page consumer (card group) | CRUD | `SettingsClient.tsx` existing inline blocks | exact |
| `SettingsNotificationsCard.tsx` | page consumer (card group) | CRUD | `SettingsClient.tsx` | exact |
| `SettingsRolesAccessCard.tsx` | page consumer (card group) | CRUD | `SettingsClient.tsx` | exact |
| `SettingsInventoryAccessCard.tsx` | page consumer (card group) | CRUD | `SettingsClient.tsx` | exact |

### EDITED — Existing files

| Existing file | Edit Scope | Analog Pattern |
|---------------|-----------|----------------|
| `src/components/summary-card.tsx` | add `accessory?: ReactNode` prop; swap `text-green-600`/`text-red-600` → `text-success`/`text-destructive` | self (extension) |
| `src/components/ui/data-table.tsx` | add `getRowDetail?: (row) => ReactNode`, `bulkActions?: BulkAction[]`, `exportable?: boolean` props | self (extension) |
| `src/server/trpc/routers/hemsRequest.ts` | add `markDistributed` mutation | sibling `approve` mutation (lines 145-208) |
| `src/server/trpc/routers/liability.ts` | add `payoffProjections` query | sibling `getPayoffProjection` (lines 270-292) |
| `src/server/trpc/routers/trustee.ts` | add `reorder` mutation | self (existing CRUD shape, lines 9-80) |
| `src/server/trpc/routers/beneficiary.ts` | add `reorder` mutation | trustee.ts pattern |
| `components.json` | add `registries` block | RESEARCH.md §"Pattern 1" |
| `drizzle/0012_add_sort_index.sql` (NEW) | new migration | `drizzle/0009_create_valuation_correction.sql` |

### EDITED — KPI strip rollout (10 pages)

`/accounts`, `/assets`, `/properties`, `/vehicles`, `/insurance`, `/trustees`, `/bequests`, `/personal-property`, `/contacts`, `/artwork`, `/dashboard`, `/hems-queue` — replace ad-hoc `SummaryCard` blocks with `<KpiStrip data={[…]} />`. **Analog for the per-page wiring:** `src/app/(admin)/liabilities/_components/LiabilitySummaryCards.tsx` — shows the columnar SummaryCard layout that KpiStrip will replace.

---

## Pattern Assignments

### `src/components/page-header.tsx` (NEW composition)

**Analog:** `src/app/(admin)/accounting/_components/AccountingHeader.tsx`

**Closest current shape** (`AccountingHeader.tsx` lines 17-46):
```tsx
return (
    <div className="flex items-center justify-between">
        <div>
            <h2 className="text-2xl font-semibold tracking-tight text-balance">
                Trust Accounting
            </h2>
            <p className="text-sm text-muted-foreground">
                Texas Property Code § 113.152 compliant accounting
            </p>
        </div>
        <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onGenerateReport} …>…</Button>
            <Button onClick={onAddEntry}>…</Button>
        </div>
    </div>
)
```

**Apply to new file:**
- Promote `<h2>` to `<h1>` (UI-SPEC §1 — one PageHeader per page).
- Replace the `flex items-center justify-between` outer with `<header className="flex flex-col gap-2 pb-6 border-b border-border">` (UI-SPEC §1 layout).
- Match heading className verbatim from analog: `text-2xl font-semibold tracking-tight` (paired with UI-SPEC §Typography "Display" tier — 24px / 600 / `leading-tight`).
- Replace inline action `<div>` with `actions?: ReactNode` slot.
- Add optional `breadcrumb` row above title — use the existing `src/components/ui/breadcrumb.tsx` primitives (`Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbPage`) with `<ChevronRight className="h-3 w-3" />` separator (already imported in that file, line 2).

**17 callers exist today** (every admin client component listed in the grep): each `<h2 className="text-2xl font-semibold tracking-tight ...">` block becomes `<PageHeader title=… description=… actions=… />`.

---

### `src/components/kpi-strip.tsx` (NEW composition)

**Analog:** `src/components/summary-card-grid.tsx` (grid wrapper) + `src/components/summary-card.tsx` (tile).

**Grid pattern** (`summary-card-grid.tsx` lines 21-25 — copy responsive class shape verbatim):
```tsx
return (
    <div className={`grid gap-6 grid-cols-1 md:grid-cols-2 ${lgColClass}`}>
        {children}
    </div>
)
```
> Adjust to UI-SPEC §2 (KpiStrip): `grid-cols-1`, `md:grid-cols-2`, `lg:grid-cols-4`, `gap-4` (not `gap-6` — the strip is denser than the grid).

**Tile pattern** (`summary-card.tsx` lines 39-63):
```tsx
return (
    <Card>
        <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                {Icon && <Icon className="h-4 w-4" />}
                {title}
            </div>
            <div className="text-2xl font-bold">{formattedValue}</div>
            {trend && (
                <div className={`flex items-center gap-1 text-xs mt-2 ${
                    trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                    {trend.isPositive ? <TrendingUp /> : <TrendingDown />}
                    <span>{Math.abs(trend.value)}%</span>
                </div>
            )}
        </CardContent>
    </Card>
)
```

**Edits required to analog before KpiStrip consumes it** (UI-SPEC Implementation Note 2):
1. `text-2xl font-bold` → `text-2xl font-semibold tabular-nums` (UI-SPEC §Typography ban on `font-bold`).
2. `text-green-600 / text-red-600` → `text-success / text-destructive` (UI-SPEC §Color — no hex/Tailwind palette literals).
3. Add `accessory?: ReactNode` slot rendered top-right of card (for the 64×16 sparkline).

**Loading skeleton pattern** (`summary-card.tsx` lines 28-37):
```tsx
if (isLoading) {
    return (
        <Card>
            <CardContent className="pt-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
            </CardContent>
        </Card>
    )
}
```
KpiStrip reuses this by passing `isLoading` through to each child SummaryCard.

**Sparkline pattern** (RESEARCH.md §"KpiStrip composition", sketch lines):
```tsx
<LineChart width={64} height={16}
    data={item.sparklineSeries.map((v, i) => ({ i, v }))}>
    <Line type="monotone" dataKey="v" stroke="var(--primary)"
        dot={false} strokeWidth={1.5} />
</LineChart>
```
Use direct `recharts` imports (the chart.tsx wrapper is overkill for a 64×16 sparkline with no axes/tooltip).

---

### `src/components/activity-timeline.tsx` (NEW hand-rolled)

**Analog:** `src/app/(admin)/activity-log/_components/ActivityLogClient.tsx` (same data, different visual).

**Activity action mapping** (`ActivityLogClient.tsx` lines 28-45) — copy this map directly:
```tsx
const ACTION_LABELS: Record<string, string> = {
    INSERT: 'Created',
    UPDATE: 'Updated',
    DELETE: 'Deleted',
}
const ACTION_ICONS: Record<string, React.ReactNode> = {
    INSERT: <Plus className="h-3 w-3" />,
    UPDATE: <Pencil className="h-3 w-3" />,
    DELETE: <Trash2 className="h-3 w-3" />,
}
const ACTION_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive'> = {
    INSERT: 'default',
    UPDATE: 'secondary',
    DELETE: 'destructive',
}
```
> Override `ACTION_VARIANTS` in the timeline component — UI-SPEC §Color: INSERT=`bg-success`, UPDATE=`bg-primary`, DELETE=`bg-destructive` (these are dot colors, not badge variants — keep `Badge variant="outline"` for the inline action label per UI-SPEC §4).

**Filter pattern** (`ActivityLogClient.tsx` lines 58-66) — re-use for heatmap day-click filter:
```tsx
const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
        const matchesAction = actionFilter === 'all' || log.action === actionFilter
        const matchesTable = tableFilter === 'all' || log.tableName === tableFilter
        return matchesAction && matchesTable
    })
}, [logs, actionFilter, tableFilter])
```

**JSON diff pattern** (`ActivityLogClient.tsx` lines 77-80) — re-use inside the expand `<Collapsible>`:
```tsx
const formatJson = (data: Record<string, unknown> | null) => {
    if (!data) return 'null'
    return JSON.stringify(data, null, 2)
}
```

**Grouping pattern** (from RESEARCH.md §"Activity timeline" sketch, validated against `activityLog` schema lines 267-317):
```tsx
const grouped = Object.entries(
    entries.reduce<Record<string, ActivityLog[]>>((acc, e) => {
        const day = format(parseISO(e.createdAt), 'yyyy-MM-dd')
        ;(acc[day] ??= []).push(e)
        return acc
    }, {}),
).sort(([a], [b]) => b.localeCompare(a))
```

---

### `src/components/preference-row.tsx` (NEW composition)

**Analog:** `src/app/(admin)/settings/_components/SettingsClient.tsx` `<PersonRow>` (lines 50-104) — currently inlines title/description/control in a `<TableRow>`. PreferenceRow generalizes this away from `<table>`.

**Settings card grouping pattern** to keep (already in `SettingsClient.tsx`, imports lines 10-16):
```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
```
Each card group:
```tsx
<Card>
    <CardHeader>
        <CardTitle className="text-xl font-semibold">Trust Info</CardTitle>
    </CardHeader>
    <CardContent className="p-0">
        <PreferenceRow title=… description=… ><Switch/></PreferenceRow>
        <PreferenceRow title=… description=… ><Input/></PreferenceRow>
    </CardContent>
</Card>
```
> `text-xl font-semibold` per UI-SPEC §Typography (CardTitle override; the existing `CardTitle` default may not be 20px/600 — verify and add className).

---

### `src/components/ui/kbd.tsx` (NEW hand-rolled, 20 LOC)

**Analog:** `src/components/ui/badge.tsx` — same small-stateless-element shape (forwarded `<element>` + `cn(className)` + tokens-only styling).

Spec verbatim from UI-SPEC §14 — already concrete, no analog refinement needed:
```tsx
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

---

### `src/components/ui/data-table-bulk-actions.tsx` (NEW)

**Analog:** `src/components/ui/data-table-view-options.tsx` — same shape (takes `table: Table<TData>`, renders a button + dropdown, lives in DataTable's toolbar slot).

**Toolbar component shape** (`data-table-view-options.tsx` lines 16-22):
```tsx
interface DataTableViewOptionsProps<TData> {
    table: Table<TData>
}
export function DataTableViewOptions<TData>({ table }: DataTableViewOptionsProps<TData>) {
    const hasResizedColumns =
        Object.keys(table.getState().columnSizing).length > 0
    return (
        <DropdownMenu>…</DropdownMenu>
    )
}
```

**Apply to bulk-actions:**
```tsx
interface DataTableBulkActionsProps<TData> {
    table: Table<TData>
    actions: BulkAction<TData>[]
}
export function DataTableBulkActions<TData>({ table, actions }: DataTableBulkActionsProps<TData>) {
    const selected = table.getSelectedRowModel().rows
    if (selected.length === 0) return null
    // sticky top-0 bg-primary/5 border-b border-primary/20 h-12 px-4 flex items-center justify-between
}
```

**ConfirmDialog wiring for destructive actions** — copy from `src/components/confirm-dialog.tsx` lines 100-115 (the `useConfirmDialog` hook):
```tsx
const { dialogProps, confirm } = useConfirmDialog({
    title: action.confirmTitle ?? `${action.label} ${selected.length} ${resource}?`,
    description: action.confirmDescription ?? `This cannot be undone.`,
    variant: 'destructive',
    onConfirm: () => action.onClick(selected.map(r => r.original)),
})
```

---

### `src/components/ui/data-table-export.tsx` (NEW)

**Analog:** `src/components/ui/data-table-view-options.tsx` (button shape) + `src/utils/formatters.ts` (formatters).

**Button shape** (`data-table-view-options.tsx` lines 27-35) — adapt this:
```tsx
<Button variant="outline" size="sm" className="ml-auto hidden h-8 lg:flex">
    <Columns3 className="mr-2 h-4 w-4" />
    Columns
</Button>
```
Apply to CSV button: same dimensions, swap `<Columns3>` for `<Download className="h-3 w-3" />`, label "Export CSV", and adjust to `className="gap-2"` per UI-SPEC §9.

**Iteration pattern** (from UI-SPEC §9):
- `table.getFilteredRowModel().rows` (NOT `getCoreRowModel`) — respects user filters
- `table.getVisibleLeafColumns()` — skip hidden columns
- Use `formatCurrency`, `formatDate`, `formatPercent` from `src/utils/formatters.ts` — already imported across the codebase (e.g. `LiabilitiesClient.tsx` line 14: `import { formatCurrency } from '@/utils/formatters'`).

---

### `src/app/(admin)/hems-queue/_components/HemsQueueBoard.tsx` (NEW consumer)

**Analog:** `src/app/(admin)/hems-queue/_components/HemsQueueClient.tsx` (same directory, same router, same data).

**Imports + data fetch pattern** (`HemsQueueClient.tsx` lines 1-75):
```tsx
'use client'
import type { inferRouterOutputs } from '@trpc/server'
import { useMemo, useOptimistic, useState } from 'react'
import { toast } from 'sonner'
import { trpc } from '@/lib/trpc'
import type { AppRouter } from '@/server/trpc/router'
// …
type RouterOutputs = inferRouterOutputs<AppRouter>
type HemsRequestWithBeneficiary =
    RouterOutputs['hemsRequest']['listWithBeneficiary'][number]

export function HemsQueueClient() {
    const utils = trpc.useUtils()
    const { data: entities } = trpc.entity.list.useQuery()
    const entityId = entities?.[0]?.id

    const { data: requests = [], isLoading: requestsLoading } =
        trpc.hemsRequest.listWithBeneficiary.useQuery(
            { entityId: entityId! },
            { enabled: !!entityId },
        )
```
> Copy verbatim into HemsQueueBoard. Same `selectedEntity` gating, same `entityId!` non-null assertion, same `enabled: !!entityId` guard.

**Optimistic update pattern** (`HemsQueueClient.tsx` lines 79-99):
```tsx
const [optimisticRequests] = useOptimistic(
    requestsWithBeneficiary,
    (current, update: {
        id: number
        status: HemsRequestWithBeneficiary['status']
        approvedAmount?: string
    }) =>
        current.map((r) =>
            r.id === update.id
                ? { ...r, status: update.status, approvedAmount: update.approvedAmount ?? r.amountRequested }
                : r,
        ),
)
```
> Use for the drag-end visual transition (apply optimistic status before mutation resolves).

**Mutation pattern** (`HemsQueueClient.tsx` lines 101-117):
```tsx
const approveRequestMutation = trpc.hemsRequest.approve.useMutation({
    onSuccess: () => utils.hemsRequest.listWithBeneficiary.invalidate(),
})
// + new (Implementation Note 3):
const markDistributedMutation = trpc.hemsRequest.markDistributed.useMutation({
    onSuccess: () => {
        utils.hemsRequest.listWithBeneficiary.invalidate()
        toast.success('Marked as distributed.')
    },
    onError: () => toast.error("Couldn't mark as distributed — verify the distribution record exists."),
})
```

**Tabs pattern** (`HemsQueueClient.tsx` lines 366-376) — reuse for Board/Table toggle:
```tsx
<Tabs value={activeTab} onValueChange={setActiveTab}>
    <TabsList>
        <TabsTrigger value="board" className="gap-2">Board</TabsTrigger>
        <TabsTrigger value="table" className="gap-2">Table</TabsTrigger>
    </TabsList>
</Tabs>
```

**STATUS_VARIANTS import** (line 39):
```tsx
import { STATUS_VARIANTS } from '@/lib/constants'
```
> Per UI-SPEC §3 Implementation Note 15: do NOT use STATUS_VARIANTS for HEMS category — only for status badges. Categories render as plain `<span>`.

**React Compiler safety** (UI-SPEC §3 + RESEARCH.md Pitfall 2): add `'use no memo'` at top of file if `bun run build` shows `[Compiler bailout]` for the kanban consumer. Precedent: PR #87.

---

### `src/app/(admin)/liabilities/_components/LiabilityGantt.tsx` (NEW consumer)

**Analog:** `src/app/(admin)/liabilities/_components/LiabilitiesClient.tsx` (sibling — same query, same data type).

**Pattern** (`LiabilitiesClient.tsx` lines 30-49):
```tsx
export function LiabilitiesClient() {
    const utils = trpc.useUtils()
    const { data: entities } = trpc.entity.list.useQuery()
    const entityId = entities?.[0]?.id

    const { data: liabilities = [], isLoading: liabilitiesLoading } =
        trpc.liability.list.useQuery(
            { entityId: entityId! },
            { enabled: !!entityId },
        )

    const [optimisticLiabilities, setOptimisticLiability] = useOptimistic(…)
```
> Copy this entity-gating + `useQuery` shape. Then add the new batched payoff query:
```tsx
const { data: projections = [] } = trpc.liability.payoffProjections.useQuery(
    { entityId: entityId! },
    { enabled: !!entityId },
)
```

---

### `src/app/(admin)/liabilities/_components/LiabilityKpiStrip.tsx` (NEW consumer)

**Analog:** `src/app/(admin)/liabilities/_components/LiabilitySummaryCards.tsx` — direct replacement.

**Current shape** (lines 14-58, see Color note):
```tsx
export function LiabilitySummaryCards({ totalLiabilities, totalActive, … }) {
    return (
        <div className="grid grid-cols-3 gap-4">
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        Total Liabilities
                    </div>
                    <div className="text-2xl font-bold text-destructive">
                        {formatCurrency(totalLiabilities)}
                    </div>
                </CardContent>
            </Card>
```
**Replacement:**
```tsx
<KpiStrip data={[
    { label: 'Active', value: activeLiabilitiesCount, icon: AlertCircle },
    { label: 'Original Principal', value: formatCurrency(totalOriginalPrincipal) },
    { label: 'Current Balance', value: formatCurrency(totalCurrentBalance), delta: { value: pctChange, label: 'vs last 30d' }, invertDelta: true },
    { label: 'Weighted Avg APR', value: formatPercent(weightedAvgApr) },
]} />
```
> Note: `text-2xl font-bold` in the current file must become `text-2xl font-semibold tabular-nums` via the SummaryCard patch (UI-SPEC Implementation Note 2). KpiStrip → SummaryCard inherits the fix automatically.

**Money math** (`LiabilitiesClient.tsx` line 11):
```tsx
import { sumStrings } from '@/lib/money'
```
> All KPI sums use `sumStrings` (CLAUDE.md money rule). Never `parseFloat().reduce()`.

---

### `src/app/(admin)/liabilities/_components/DebtToEquityDonut.tsx` (NEW chart)

**Analog:** `src/components/charts/asset-allocation-chart.tsx`.

**Recharts wrapper pattern** (`asset-allocation-chart.tsx` lines 48-101):
```tsx
import { Cell, Pie, PieChart } from 'recharts'
import {
    type ChartConfig,
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart'

return (
    <ChartContainer config={chartConfig} className="mx-auto h-[300px] w-full">
        <PieChart>
            <ChartTooltip content={<ChartTooltipContent formatter={(value, name) => …} />} />
            <Pie data={data} dataKey="value" nameKey="name" outerRadius={100} strokeWidth={2}
                label={({ value }) => `${(value / total * 100).toFixed(0)}%`}>
                {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="name" />} />
        </PieChart>
    </ChartContainer>
)
```
**Color edits required for DebtToEquity:**
- `fill` values must be `var(--destructive)` and `var(--success)` per UI-SPEC §Color (NOT the current `'hsl(0, 84%, 60%)'` etc. — see `net-worth-chart.tsx` lines 19-25 for the pattern to AVOID).
- `outerRadius={100}` → fits `h-40 w-40` (160×160) container per UI-SPEC §6.
- Center label: render via `<Label position="center">` (use Recharts' Label primitive — see `net-worth-chart.tsx` line 3 import).

---

### `src/app/(admin)/beneficiaries/_components/BeneficiaryShareDonuts.tsx` (NEW chart)

**Analog:** `src/components/charts/asset-allocation-chart.tsx` (same Recharts wrapper pattern as DebtToEquity) + `src/app/(admin)/beneficiaries/_components/BeneficiariesClient.tsx` (data fetch — `trpc.beneficiary.listWithDistributions`, line 25-28).

**Data fetch** (`BeneficiariesClient.tsx` lines 22-28):
```tsx
const { data: beneficiariesWithDist = [], isLoading } =
    trpc.beneficiary.listWithDistributions.useQuery(
        { entityId: entityId! },
        { enabled: !!entityId },
    )
```

**Chart palette** per UI-SPEC §Color: cycle `chart-1..chart-5` by index. Pass each donut a fill of `var(--chart-${(index % 5) + 1})`.

---

### `src/server/trpc/routers/hemsRequest.ts` (EDIT — add `markDistributed`)

**Analog (sibling in same file):** `approve` mutation, lines 145-208.

**Pattern to mirror:**
```tsx
markDistributed: adminProcedure
    .input(z.object({
        id: z.coerce.number(),
        entityId: z.coerce.number(),
    }))
    .mutation(async ({ input }) => {
        addBreadcrumb('hems', `Marking HEMS request ${input.id} distributed`)
        return traceBusinessOperation(
            'hems.markDistributed',
            { requestId: input.id },
            async () => {
                const existing = await db.query.hemsRequest.findFirst({
                    where: and(
                        eq(hemsRequest.id, input.id),
                        eq(hemsRequest.entityId, input.entityId),
                    ),
                })
                if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Request not found in this entity' })
                if (existing.status !== 'APPROVED') {
                    throw new TRPCError({
                        code: 'CONFLICT',
                        message: `Cannot mark distributed: current status is ${existing.status}`,
                    })
                }
                const [updated] = await db.update(hemsRequest)
                    .set({ status: 'DISTRIBUTED', updatedAt: new Date().toISOString() })
                    .where(and(eq(hemsRequest.id, input.id), eq(hemsRequest.entityId, input.entityId)))
                    .returning()
                return updated
            },
        )
    }),
```
**Match the exact:** `entityId` validation, `findFirst` precheck, `TRPCError` codes (NOT_FOUND + CONFLICT), `traceBusinessOperation` wrapper, `addBreadcrumb`, `.returning()`.

---

### `src/server/trpc/routers/liability.ts` (EDIT — add `payoffProjections`)

**Analog (sibling, same file):** `getPayoffProjection`, lines 270-292.

**Pattern to extend** (single-row → batched):
```tsx
payoffProjections: adminProcedure
    .input(z.object({ entityId: z.coerce.number() }))
    .query(async ({ input }) => {
        const liabs = await db.select().from(liability)
            .where(eq(liability.entityId, input.entityId))
        return liabs.map((l) => ({
            id: l.id,
            creditor: l.creditor,
            startDate: l.loanStartDate ?? l.createdAt,
            projection: !l.interestRate || l.isRevolvingCredit ? null :
                estimatePayoffDate(
                    l.currentBalance ?? '0',
                    l.interestRate,
                    l.monthlyPayment ?? '0',
                    l.escrowMonthly ?? undefined,
                ),
        }))
    }),
```
> `estimatePayoffDate` is already imported (line 8: `import { estimatePayoffDate } from '@/lib/amortization'`). Match the same null-handling rules as the single-row version (lines 279-284).

---

### `src/server/trpc/routers/trustee.ts` (EDIT — add `reorder`)

**Analog (self, same file):** existing `update` mutation, lines 34-59.

**Pattern to mirror** (entity-scoped batched update):
```tsx
reorder: adminProcedure
    .input(z.object({
        entityId: z.coerce.number(),
        orderedIds: z.array(z.coerce.number()),
    }))
    .mutation(async ({ input }) => {
        // sequential per-row UPDATE; trust-admin uses postgres.js for transactions per CLAUDE.md
        const updates = await Promise.all(
            input.orderedIds.map((id, idx) =>
                db.update(trustee)
                    .set({ order: idx, updatedAt: new Date().toISOString() })
                    .where(and(eq(trustee.id, id), eq(trustee.entityId, input.entityId)))
                    .returning()
            )
        )
        const flat = updates.flat()
        if (flat.length !== input.orderedIds.length) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'One or more trustees not found in this entity' })
        }
        return flat
    }),
```
> Per RESEARCH.md A5: reuse the existing `trustee.order` NOT NULL integer column (db/schema.ts line 1925). Do NOT add a new `sortIndex` column to `trustee`. Same `entityId` + `and(eq(id), eq(entityId))` pattern as `update`.

`beneficiary.reorder` follows the exact same shape but writes to a new `sortIndex` column (RESEARCH.md A5 — beneficiary table doesn't have `order` today).

---

### `drizzle/0012_add_sort_index.sql` (NEW migration)

**Analog:** `drizzle/0009_create_valuation_correction.sql`.

**Pattern to mirror** (`0009` lines 1-44):
- camelCase column identifiers (`"sortIndex"`, NOT `"sort_index"` — per CLAUDE.md "Postgres Column Naming Convention" gotcha and `0009` line 10 comment).
- `IF NOT EXISTS` guards on indexes.
- `--> statement-breakpoint` between every statement (drizzle-kit migrate splits on this token).
- Idempotent: backfill UPDATE with `WHERE … IS NULL` if needed, or run unconditionally on a freshly added column with `DEFAULT 0`.

**Full migration shape** (per RESEARCH.md Pattern 3, validated):
```sql
ALTER TABLE "beneficiary"
    ADD COLUMN IF NOT EXISTS "sortIndex" integer NOT NULL DEFAULT 0;
--> statement-breakpoint

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

CREATE INDEX IF NOT EXISTS "idx_trustee_entity_order"
    ON "trustee" USING btree ("entityId", "order");
```
**No RLS changes** (RESEARCH.md Pattern 3 — `sortIndex` is non-sensitive; admin-only 4-policy shape already covers it).

**Apply via** `bun run db:deploy` (NEVER `db:push` per CLAUDE.md). Hand-edit any snake_case column references in the drizzle-kit-emitted SQL to camelCase before running (CLAUDE.md gotcha verified by `0009`).

---

### `src/components/ui/data-table.tsx` (EDIT — add three new props)

**Analog:** self (extension). Props are additive — `toolbar?` and `onRowClick?` already exist (lines 60-64).

**Existing prop shape to extend** (lines 44-65):
```tsx
interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    searchKey?: string
    searchPlaceholder?: string
    isLoading?: boolean
    emptyMessage?: string
    enableRowSelection?: boolean
    enableColumnVisibility?: boolean
    enablePagination?: boolean
    initialColumnVisibility?: VisibilityState
    tableId?: string
    toolbar?: React.ReactNode | ((table: TanStackTable<TData>) => React.ReactNode)
    onRowClick?: (row: TData, ctx: Row<TData>) => void
}
```
**Add:**
```tsx
    /** When provided, each row renders an expand chevron and `getRowDetail(row)` below the row when expanded. */
    getRowDetail?: (row: TData) => React.ReactNode
    /** When provided, render a sticky bulk-action toolbar below the table header when selection is non-empty. */
    bulkActions?: BulkAction<TData>[]
    /** When true, render a CSV export button in the top-right toolbar slot. */
    exportable?: boolean
    /** Used by the CSV exporter for filename (e.g. "vehicles" → "vehicles-2026-05-19.csv"). */
    exportResource?: string
```

**Toolbar integration point** (lines 312-329):
```tsx
<div className="flex items-center py-4 gap-2">
    {searchKey && (<Input placeholder={…} … />)}
    {typeof toolbar === 'function' ? toolbar(table) : toolbar}
    {enableColumnVisibility && (<DataTableViewOptions table={table} />)}
</div>
```
> Add `{exportable && <DataTableExport table={table} resource={exportResource} />}` BEFORE `<DataTableViewOptions>` per UI-SPEC §9 placement rule. Sticky bulk-action toolbar renders separately, after this header bar but before the `<Table>` (UI-SPEC §8 — `position: sticky; top: 0`).

---

## Shared Patterns

### Pattern S1: Entity ID gating + tRPC query

**Source:** `src/app/(admin)/liabilities/_components/LiabilitiesClient.tsx` lines 30-49 (verbatim pattern across all 17 admin clients).

**Apply to:** every NEW page consumer (HemsQueueBoard, LiabilityGantt, LiabilityKpiStrip, DebtToEquityDonut, BeneficiaryShareDonuts, WithdrawalMilestoneGantt, all SettingsCard*, TrusteeSortableList, BeneficiarySortableList).

```tsx
const utils = trpc.useUtils()
const { data: entities } = trpc.entity.list.useQuery()
const entityId = entities?.[0]?.id

const { data: rows = [], isLoading } = trpc.<resource>.list.useQuery(
    { entityId: entityId! },
    { enabled: !!entityId },
)
```
**Non-negotiable:** the `{ enabled: !!entityId }` guard. The non-null `entityId!` is only safe inside the query call (memory note: "selectedEntity timing").

---

### Pattern S2: tRPC mutation + invalidate + toast

**Source:** `src/app/(admin)/liabilities/_components/LiabilitiesClient.tsx` lines 58-78.

**Apply to:** every NEW mutation caller (HemsQueueBoard drag handlers, SortableList drag-end, settings PreferenceRow controls).

```tsx
const updateMutation = trpc.<resource>.update.useMutation({
    onSuccess: () => {
        utils.<resource>.list.invalidate()
        toast.success('<Resource> updated')
    },
    onError: (error) => toast.error(error.message),
})
```
**Toast import** (line 4 in every analog): `import { toast } from 'sonner'`.

---

### Pattern S3: Money math via `sumStrings`

**Source:** `src/lib/money.ts` (re-exported helpers). Consumer example: `LiabilitiesClient.tsx` line 11, `HemsQueueClient.tsx` line 40 + line 332.

**Apply to:** every KPI sum, every donut total, every gantt bar value.

```tsx
import { sumStrings } from '@/lib/money'
import { formatCurrency } from '@/utils/formatters'

const total = sumStrings(items.map(i => i.amount))
// then render with: formatCurrency(total)
```
**Never** `items.reduce((a, b) => parseFloat(a) + parseFloat(b), 0)` — float drift on cent-precision rows.

---

### Pattern S4: ConfirmDialog for destructive actions

**Source:** `src/components/confirm-dialog.tsx` lines 100-115 (`useConfirmDialog` hook).

**Apply to:** every bulk delete (DataTable bulk-actions toolbar), every HEMS approve (kanban drop), every cancel (HemsQueueClient line 678 already).

```tsx
import { ConfirmDialog, useConfirmDialog } from '@/components/confirm-dialog'

const { dialogProps, confirm } = useConfirmDialog({
    title: 'Approve $1,200 HEMS request?',
    description: "This creates a distribution record.",
    confirmText: 'Approve',
    onConfirm: () => approveMutation.mutateAsync({ id, entityId }),
})

// in JSX:
<Button onClick={confirm}>Approve</Button>
<ConfirmDialog {...dialogProps} />
```
**Never** use `window.confirm()` (CLAUDE.md gotcha — already replaced across 8 admin pages per memory `72ba715`).

---

### Pattern S5: tRPC router shape

**Source:** `src/server/trpc/routers/trustee.ts` lines 9-80 (textbook small router).

**Apply to:** every NEW mutation / query in `hemsRequest.ts`, `liability.ts`, `trustee.ts`, `beneficiary.ts`.

```tsx
import { TRPCError } from '@trpc/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { adminProcedure, createTRPCRouter } from '../init'

list: adminProcedure
    .input(z.object({ entityId: z.coerce.number() }))
    .query(({ input }) =>
        db.select().from(<table>).where(eq(<table>.entityId, input.entityId)),
    ),

update: adminProcedure
    .input(z.object({ id: z.coerce.number(), entityId: z.coerce.number(), data: <schema> }))
    .mutation(async ({ input }) => {
        const [updated] = await db.update(<table>)
            .set({ ...input.data, updatedAt: new Date().toISOString() })
            .where(and(eq(<table>.id, input.id), eq(<table>.entityId, input.entityId)))
            .returning()
        if (!updated) throw new TRPCError({ code: 'NOT_FOUND', message: '<Resource> not found in this entity' })
        return updated
    }),
```
**Non-negotiable:** `entityId: z.coerce.number()` in every list/byId/update/delete input (memory: "Entity ID Validation Pattern"). `and(eq(id), eq(entityId))` in every WHERE clause. NOT_FOUND on no match.

---

### Pattern S6: ChartContainer + recharts

**Source:** `src/components/charts/asset-allocation-chart.tsx` lines 1-103.

**Apply to:** DebtToEquityDonut, BeneficiaryShareDonuts (full Recharts wrappers), and KpiStrip sparkline (raw `<LineChart>` — accessory does not need ChartContainer's tooltip/legend).

For full chart cards:
```tsx
import { Cell, Pie, PieChart } from 'recharts'
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

<ChartContainer config={chartConfig} className="mx-auto h-40 w-40">
    <PieChart>
        <ChartTooltip content={<ChartTooltipContent formatter={…} />} />
        <Pie data={data} dataKey="value" nameKey="name" outerRadius={60} innerRadius={40} strokeWidth={2}>
            {data.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
        </Pie>
    </PieChart>
</ChartContainer>
```

For inline sparklines (KpiStrip accessory):
```tsx
import { LineChart, Line } from 'recharts'
<LineChart width={64} height={16} data={…}>
    <Line type="monotone" dataKey="v" stroke="var(--primary)" dot={false} strokeWidth={1.5} />
</LineChart>
```

---

### Pattern S7: Tabs + DataTable for board/table dual view

**Source:** `src/app/(admin)/hems-queue/_components/HemsQueueClient.tsx` lines 366-406.

**Apply to:** HemsQueueBoard (Board + Table tabs), ActivityLog (Timeline + Heatmap + Raw tabs).

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

<Tabs value={activeTab} onValueChange={setActiveTab}>
    <TabsList>
        <TabsTrigger value="board" className="gap-2">Board</TabsTrigger>
        <TabsTrigger value="table" className="gap-2">Table</TabsTrigger>
    </TabsList>
    <TabsContent value="board" className="mt-4">
        <HemsQueueBoard … />
    </TabsContent>
    <TabsContent value="table" className="mt-4">
        <DataTable … />
    </TabsContent>
</Tabs>
```

---

## No Analog Found

Files with no in-repo predecessor (planner: rely on RESEARCH.md patterns + registry JSON output):

| File | Role | Reason |
|------|------|--------|
| `src/components/kibo-ui/kanban/index.tsx` | registry primitive | First Kibo install; CLI emits the file. We never author this. |
| `src/components/kibo-ui/gantt/index.tsx` | registry primitive | First gantt in repo. RESEARCH.md §"Per-component registry status" line 50 covers regDeps + landing path. |
| `src/components/kibo-ui/contribution-graph/index.tsx` | registry primitive | First heatmap in repo. RESEARCH.md line 51. |
| `src/components/kibo-ui/avatar-stack/index.tsx` | registry primitive | No avatar-stack pattern in repo; existing `src/components/ui/avatar.tsx` is a single-avatar primitive. |
| `src/components/kibo-ui/dropzone/index.tsx` | registry primitive | UploadThing's button-style upload exists but no drop-anywhere zone. |
| `src/components/ui/combobox.tsx` | registry primitive | Existing `select.tsx` is single-value; no multi-select / search-as-you-type combobox. |
| `src/components/ui/tags-input.tsx` | registry primitive | No tags-input pattern in repo. |
| `src/components/ui/phone-input.tsx` | registry primitive | No mask-input pattern in repo. |
| `src/components/ui/mask-input.tsx` | registry primitive | (same) |
| `src/components/ui/sortable.tsx` | registry primitive | First DnD primitive in repo (kanban will pull in @dnd-kit but lands at kibo-ui path). |
| `src/components/ui/stepper.tsx` | registry primitive | No multi-step form wizard in repo today; `useResourceForm` is single-page. |
| `src/components/ui/context-menu.tsx` | shadcn-official | Required by kibo gantt; first context-menu in repo. |
| `src/components/kibo-ui/dropzone` consumer | n/a | No existing drop-anywhere consumer to mirror. |

For these, the planner should reference:
- **RESEARCH.md §"Standard Stack" → "Per-component registry status"** for landing paths, regDeps, and bundle costs.
- **RESEARCH.md §"Code Examples"** for kanban + tRPC wiring (Pattern 2) and payoff projections (Pattern 4).
- **UI-SPEC §3–§13** for concrete UX prop shapes and color/typography rules per primitive.

---

## Key Patterns Identified

1. **All admin pages share a 6-element scaffold:** `'use client'` → `useUtils()` → `entity.list.useQuery()` → resource list query gated by `enabled: !!entityId` → mutations with `onSuccess: invalidate + toast` → JSX with `text-2xl font-semibold tracking-tight` header. Every NEW page consumer in Phase 23 plugs into this scaffold verbatim.

2. **tRPC mutations are tiny and uniform:** `adminProcedure` + `z.object({ entityId, … })` input + `findFirst` precheck + `and(eq(id), eq(entityId))` WHERE + `TRPCError({ code: 'NOT_FOUND' })` on miss + `traceBusinessOperation` wrapper for any business action (approve, deny, markDistributed).

3. **Charts route through `src/components/ui/chart.tsx` (Recharts wrapper).** New donuts MUST use `ChartContainer` + `ChartTooltipContent`. Sparklines may skip the wrapper because they don't have tooltips. The current `net-worth-chart.tsx` uses literal `'hsl(...)'` strings — this is the WRONG pattern; new charts use `var(--chart-N)` per UI-SPEC §Color.

4. **`drizzle/0009_create_valuation_correction.sql` is the canonical migration template** — camelCase column quoting, `IF NOT EXISTS`, `--> statement-breakpoint` separators, 4-policy admin-only RLS shape (when adding tables). For column additions only (sortIndex), skip the policy block.

5. **DataTable extensions are additive props.** Three new optional props (`getRowDetail`, `bulkActions`, `exportable`) follow the same shape as existing `toolbar?` and `onRowClick?` — no breaking changes, no opt-out for existing 17 callers.

---

## Metadata

**Analog search scope:** `src/components/`, `src/components/ui/`, `src/app/(admin)/*/_components/`, `src/server/trpc/routers/`, `drizzle/`, `db/schema.ts`, `src/lib/`, `src/utils/`
**Files scanned:** 47
**Pattern extraction date:** 2026-05-19

---

## PATTERN MAPPING COMPLETE
