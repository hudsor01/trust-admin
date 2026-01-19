# Phase 32: recharts Dashboard Charts - Research

**Researched:** 2026-01-16
**Domain:** React charting with recharts + Next.js App Router
**Confidence:** HIGH

<research_summary>
## Summary

Researched recharts integration patterns for Next.js 15+ App Router dashboards. The key finding is that **shadcn/ui already provides a chart component** that wraps recharts with consistent styling and configuration patterns.

The standard approach:
1. Install recharts + shadcn chart component
2. Use `'use client'` directive (recharts needs browser APIs)
3. Wrap charts in `ChartContainer` with min-height set
4. Configure colors via `ChartConfig` object
5. Keep charts in dedicated client components, data fetching in server components

**Primary recommendation:** Use `bunx shadcn@latest add chart` to get the pre-built ChartContainer/ChartConfig system, then create 2-3 focused chart components for net worth, asset allocation, and liability progress.

</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | 2.15.x | SVG charting | Most popular React charting library, shadcn uses it |
| @/components/ui/chart | (shadcn) | Chart wrapper | Handles responsive sizing, color config, tooltips |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ChartContainer | shadcn | Responsive wrapper | Always - wraps ResponsiveContainer with config |
| ChartConfig | shadcn | Color/label config | Define data series colors and labels |
| ChartTooltip | shadcn | Hover tooltips | When you need consistent tooltip styling |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| recharts | Chart.js | Chart.js smaller but recharts has better React integration |
| recharts | Victory | Victory more customizable but recharts simpler for common charts |
| shadcn chart | raw recharts | shadcn provides consistent styling and handles SSR issues |

**Installation:**
```bash
bunx shadcn@latest add chart
# This installs recharts automatically as a dependency
```

</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── ui/
│   │   └── chart.tsx        # shadcn chart (auto-generated)
│   └── charts/
│       ├── net-worth-chart.tsx       # Assets vs Liabilities
│       ├── asset-allocation-chart.tsx # Pie/donut by asset type
│       └── liability-progress-chart.tsx # Paid vs remaining
```

### Pattern 1: Client Component with Server Data
**What:** Fetch data in server component or via tRPC, render chart in client component
**When to use:** Always - recharts needs browser APIs
**Example:**
```tsx
// dashboard/page.tsx (already 'use client')
const { data: bankAccounts } = trpc.bankAccount.list.useQuery()
const { data: liabilities } = trpc.liability.list.useQuery()

// Calculate totals for chart
const assetData = [
  { name: 'Bank Accounts', value: sumAssets(bankAccounts), fill: 'var(--chart-1)' },
  { name: 'Investment', value: sumAssets(investments), fill: 'var(--chart-2)' },
  // ...
]

return <AssetAllocationChart data={assetData} />
```

### Pattern 2: ChartConfig for Consistent Colors
**What:** Define colors and labels in a config object
**When to use:** All charts - provides consistent theming
**Example:**
```tsx
const chartConfig = {
  assets: {
    label: "Assets",
    color: "hsl(var(--chart-1))",
  },
  liabilities: {
    label: "Liabilities",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig
```

### Pattern 3: Donut Chart with Center Label
**What:** PieChart with innerRadius to create donut, Label component for center text
**When to use:** Net worth display - show total in center
**Example:**
```tsx
<PieChart>
  <Pie
    data={data}
    dataKey="value"
    innerRadius={60}
    outerRadius={80}
  >
    <Label
      content={({ viewBox }) => (
        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
          <tspan className="text-2xl font-bold">{formatCurrency(total)}</tspan>
          <tspan x={viewBox.cx} y={viewBox.cy + 20} className="text-muted-foreground">
            Net Worth
          </tspan>
        </text>
      )}
    />
  </Pie>
</PieChart>
```

### Anti-Patterns to Avoid
- **No min-height on ChartContainer:** Charts won't render or will collapse
- **Server-side rendering recharts:** Must use 'use client' directive
- **Creating meshes in render:** Calculate chart data outside JSX, memoize if expensive

</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Responsive sizing | Manual resize listeners | ChartContainer | Handles all edge cases, SSR |
| Donut/pie charts | Canvas/SVG from scratch | recharts PieChart | Animation, tooltips, accessibility |
| Color theming | Hardcoded colors | ChartConfig + CSS vars | Theme-aware, dark mode support |
| Tooltips | Custom hover handlers | ChartTooltip | Consistent styling, positioning |
| Bar/progress charts | CSS widths | recharts BarChart | Animation, responsive, accessible |

**Key insight:** recharts solves the hard problems (SVG rendering, animation, accessibility, responsiveness). shadcn wraps it with consistent styling. Don't fight the abstraction.

</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: SSR Errors
**What goes wrong:** "TypeError: Super expression must either be null or a function"
**Why it happens:** recharts uses browser-only APIs, tries to render on server
**How to avoid:** Add `'use client'` directive to component file
**Warning signs:** Build errors mentioning "null or function", hydration mismatches

### Pitfall 2: Chart Not Rendering (Zero Height)
**What goes wrong:** ChartContainer renders but chart is invisible
**Why it happens:** ResponsiveContainer needs explicit height or min-height
**How to avoid:** Always set `min-h-[200px]` or similar on ChartContainer
**Warning signs:** Empty space where chart should be, height: 0 in inspector

### Pitfall 3: Pie Chart Colors Not Showing
**What goes wrong:** All slices same color or no fill
**Why it happens:** Not using Cell component or fill prop correctly
**How to avoid:** Use `fill` prop on data items or map with Cell components
**Warning signs:** Monochrome pie chart

### Pitfall 4: Tooltip Shows Wrong Data
**What goes wrong:** Hover shows undefined or wrong values
**Why it happens:** dataKey doesn't match data object keys
**How to avoid:** Ensure `dataKey="value"` matches `{ name: 'X', value: 100 }`
**Warning signs:** "undefined" in tooltips

</common_pitfalls>

<code_examples>
## Code Examples

Verified patterns from official sources:

### Net Worth Donut Chart (Assets vs Liabilities)
```tsx
// Source: recharts docs + shadcn chart patterns
'use client'

import { PieChart, Pie, Cell, Label } from 'recharts'
import { ChartContainer, ChartConfig } from '@/components/ui/chart'
import { formatCurrency } from '@/utils/formatters'

const chartConfig = {
  assets: { label: 'Assets', color: 'hsl(142, 76%, 36%)' },      // green
  liabilities: { label: 'Liabilities', color: 'hsl(0, 84%, 60%)' }, // red
} satisfies ChartConfig

interface NetWorthChartProps {
  totalAssets: string
  totalLiabilities: string
}

export function NetWorthChart({ totalAssets, totalLiabilities }: NetWorthChartProps) {
  const assets = parseFloat(totalAssets)
  const liabilities = parseFloat(totalLiabilities)
  const netWorth = assets - liabilities

  const data = [
    { name: 'Assets', value: assets, fill: chartConfig.assets.color },
    { name: 'Liabilities', value: liabilities, fill: chartConfig.liabilities.color },
  ]

  return (
    <ChartContainer config={chartConfig} className="min-h-[250px]">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={70}
          outerRadius={100}
          strokeWidth={2}
        >
          <Label
            content={({ viewBox }) => {
              if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                return (
                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                    <tspan
                      x={viewBox.cx}
                      y={viewBox.cy}
                      className="fill-foreground text-2xl font-bold"
                    >
                      {formatCurrency(netWorth.toString())}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) + 24}
                      className="fill-muted-foreground text-sm"
                    >
                      Net Worth
                    </tspan>
                  </text>
                )
              }
            }}
          />
        </Pie>
      </PieChart>
    </ChartContainer>
  )
}
```

### Asset Allocation Pie Chart
```tsx
// Source: recharts PieChart docs
'use client'

import { PieChart, Pie, Cell, Legend, Tooltip } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
]

interface AssetData {
  name: string
  value: number
}

export function AssetAllocationChart({ data }: { data: AssetData[] }) {
  const chartConfig = data.reduce((acc, item, idx) => {
    acc[item.name] = { label: item.name, color: COLORS[idx % COLORS.length] }
    return acc
  }, {} as ChartConfig)

  return (
    <ChartContainer config={chartConfig} className="min-h-[300px]">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          outerRadius={100}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <ChartTooltip content={<ChartTooltipContent />} />
      </PieChart>
    </ChartContainer>
  )
}
```

### Liability Progress Bar Chart
```tsx
// Source: recharts BarChart docs
'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'

const chartConfig = {
  paid: { label: 'Paid', color: 'hsl(142, 76%, 36%)' },
  remaining: { label: 'Remaining', color: 'hsl(var(--muted))' },
} satisfies ChartConfig

interface LiabilityData {
  name: string
  paid: number
  remaining: number
}

export function LiabilityProgressChart({ data }: { data: LiabilityData[] }) {
  return (
    <ChartContainer config={chartConfig} className="min-h-[200px]">
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
        <YAxis type="category" dataKey="name" width={100} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="paid" stackId="a" fill={chartConfig.paid.color} radius={[0, 0, 0, 0]} />
        <Bar dataKey="remaining" stackId="a" fill={chartConfig.remaining.color} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
```

</code_examples>

<sota_updates>
## State of the Art (2025-2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual ResponsiveContainer | shadcn ChartContainer | 2024 | Handles SSR, theming, responsive automatically |
| Hardcoded colors | CSS variables via ChartConfig | 2024 | Dark mode support, consistent theming |
| recharts v2 warnings | recharts v2.15+ / v3 | 2025 | Fixed SSR warnings, better React 19 support |

**New tools/patterns to consider:**
- **shadcn chart component:** Wraps recharts with consistent styling, handles SSR issues
- **ChartConfig satisfies pattern:** Type-safe color and label configuration

**Deprecated/outdated:**
- **Raw ResponsiveContainer without wrapper:** Use ChartContainer instead
- **Inline color strings:** Use CSS variables for theme support

</sota_updates>

<open_questions>
## Open Questions

1. **recharts v3 compatibility**
   - What we know: shadcn recently added recharts v3 support (PR #8486)
   - What's unclear: Whether to use v2 or v3 for this project
   - Recommendation: Use whatever version `bunx shadcn@latest add chart` installs (likely v2.15.x, stable)

2. **Data aggregation location**
   - What we know: Dashboard is already client-side, data fetched via tRPC
   - What's unclear: Whether to create new tRPC procedures for chart data or calculate client-side
   - Recommendation: Calculate client-side from existing data (simpler, data already available)

</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- [shadcn/ui Chart Component](https://ui.shadcn.com/docs/components/chart) - ChartContainer, ChartConfig patterns
- [recharts official docs](https://recharts.org) - PieChart, BarChart, Label patterns

### Secondary (MEDIUM confidence)
- [Next.js Charts with Recharts Guide](https://app-generator.dev/docs/technologies/nextjs/integrate-recharts.html) - 'use client' patterns verified
- [recharts GitHub Issue #531](https://github.com/recharts/recharts/issues/531) - SSR limitations confirmed
- [shadcn/ui recharts v3 PR](https://github.com/shadcn-ui/ui/pull/8486) - v3 compatibility status

### Tertiary (LOW confidence - needs validation)
- None - all key patterns verified with official sources

</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: recharts 2.15.x with shadcn/ui wrapper
- Ecosystem: ChartContainer, ChartConfig, ChartTooltip
- Patterns: Donut with center label, stacked bar, pie with legend
- Pitfalls: SSR errors, min-height, color configuration

**Confidence breakdown:**
- Standard stack: HIGH - shadcn is de facto standard for this codebase
- Architecture: HIGH - follows existing patterns (client components, tRPC data)
- Pitfalls: HIGH - documented in official issues and guides
- Code examples: HIGH - from official recharts docs + shadcn patterns

**Research date:** 2026-01-16
**Valid until:** 2026-02-16 (30 days - recharts ecosystem stable)

</metadata>

---

*Phase: 32-recharts-dashboard-charts*
*Research completed: 2026-01-16*
*Ready for planning: yes*
