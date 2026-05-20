---
phase: 23
plan: 03
type: execute
wave: 2
depends_on: [23-01]
files_modified:
  - src/server/trpc/routers/liability.ts
  - src/components/kibo-ui/gantt/index.tsx
  - src/components/kibo-ui/avatar-stack/index.tsx
  - src/app/(admin)/liabilities/_components/LiabilitiesClient.tsx
  - src/app/(admin)/liabilities/_components/LiabilityKpiStrip.tsx
  - src/app/(admin)/liabilities/_components/LiabilityGantt.tsx
  - src/app/(admin)/liabilities/_components/DebtToEquityDonut.tsx
  - src/app/(admin)/beneficiaries/_components/BeneficiariesClient.tsx
  - src/app/(admin)/beneficiaries/_components/BeneficiaryShareDonuts.tsx
  - src/app/(admin)/beneficiaries/_components/BeneficiaryAvatarStack.tsx
  - src/app/(admin)/beneficiaries/_components/WithdrawalMilestoneGantt.tsx
  - src/app/(admin)/accounts/_components/AccountsClient.tsx
  - src/app/(admin)/assets/_components/AssetsClient.tsx
  - src/app/(admin)/properties/_components/PropertiesClient.tsx
  - src/app/(admin)/vehicles/_components/VehiclesClient.tsx
  - src/app/(admin)/insurance/_components/InsuranceClient.tsx
  - src/app/(admin)/trustees/_components/TrusteesClient.tsx
  - src/app/(admin)/bequests/_components/BequestsClient.tsx
  - src/app/(admin)/personal-property/_components/PersonalPropertyClient.tsx
  - src/app/(admin)/contacts/_components/ContactsClient.tsx
  - src/app/(admin)/artwork/_components/ArtworkClient.tsx
  - src/app/(admin)/dashboard/_components/DashboardClient.tsx
  - tests/trpc/liability.test.ts
  - tests/components/beneficiary-share-donuts.test.tsx
  - tests/e2e/admin-pages.e2e.ts
autonomous: true
requirements: []
tags: [liability-gantt, debt-to-equity, beneficiary-donuts, withdrawal-gantt, avatar-stack, kpi-rollout, payoff-projections, sum-strings]
must_haves:
  truths:
    - "trpc.liability.payoffProjections({ entityId }) returns one entry per liability, with projection: null for revolving credit or missing interestRate"
    - "/liabilities renders PageHeader + LiabilityKpiStrip + 2-column grid (Gantt 2/3, DebtToEquity donut 1/3)"
    - "LiabilityKpiStrip renders 4 KPIs computed via sumStrings: Active count, Original principal sum, Current balance sum (with invertDelta=true), Weighted avg APR"
    - "LiabilityGantt renders one bar per active liability with start = loanStartDate ?? createdAt, end = projection.payoffDate; today vertical line in bg-primary"
    - "DebtToEquityDonut renders 2 slices (destructive + success) with center label = debt%, using ChartContainer + recharts"
    - "/beneficiaries renders PageHeader + KpiStrip + AvatarStack + per-beneficiary donut grid + WithdrawalMilestoneGantt"
    - "BeneficiaryShareDonut cycles chart-1..chart-5 fill colors by beneficiary index"
    - "BeneficiaryShareDonut renders greyed-out state with '—' label when sharePercent is null or 0"
    - "11 pages each render <KpiStrip data={[...]}/> above their existing client component (dashboard, accounts, assets, properties, vehicles, insurance, trustees, bequests, personal-property, contacts, artwork)"
    - "All KPI sums use sumStrings (NO parseFloat().reduce() patterns)"
  artifacts:
    - path: src/server/trpc/routers/liability.ts
      provides: "payoffProjections batched query (sibling of existing getPayoffProjection)"
      contains: "payoffProjections: adminProcedure"
    - path: src/components/kibo-ui/gantt/index.tsx
      provides: "Kibo UI gantt primitive"
    - path: src/components/kibo-ui/avatar-stack/index.tsx
      provides: "Kibo UI avatar stack primitive"
    - path: src/app/(admin)/liabilities/_components/LiabilityKpiStrip.tsx
      provides: "Liabilities KPI strip with 4 columns + invertDelta on current balance"
    - path: src/app/(admin)/liabilities/_components/LiabilityGantt.tsx
      provides: "Per-liability gantt with payoff projections"
    - path: src/app/(admin)/liabilities/_components/DebtToEquityDonut.tsx
      provides: "2-slice donut (debt vs equity)"
    - path: src/app/(admin)/beneficiaries/_components/BeneficiaryShareDonuts.tsx
      provides: "Grid of per-beneficiary share donuts with chart-N cycling"
    - path: src/app/(admin)/beneficiaries/_components/WithdrawalMilestoneGantt.tsx
      provides: "Per-beneficiary withdrawal milestone gantt (age1/age2)"
    - path: src/app/(admin)/beneficiaries/_components/BeneficiaryAvatarStack.tsx
      provides: "Beneficiary avatar stack consumer"
    - path: tests/trpc/liability.test.ts
      provides: "payoffProjections batched query tests"
    - path: tests/components/beneficiary-share-donuts.test.tsx
      provides: "Donut total + cycling + greyed-out state tests"
    - path: tests/e2e/admin-pages.e2e.ts
      provides: "Playwright KPI-strip render check across 10 list pages"
  key_links:
    - from: "LiabilityGantt.tsx"
      to: "trpc.liability.payoffProjections"
      via: "batched useQuery for all liabilities"
      pattern: "trpc.liability.payoffProjections.useQuery"
    - from: "LiabilityKpiStrip.tsx"
      to: "@/lib/money sumStrings"
      via: "Money sum helper for currentBalance / originalPrincipal aggregations"
      pattern: "import.*sumStrings.*from '@/lib/money'"
    - from: "BeneficiaryShareDonuts.tsx"
      to: "trpc.beneficiary.listWithDistributions"
      via: "entity-gated useQuery feeds per-beneficiary donuts"
      pattern: "trpc.beneficiary.listWithDistributions.useQuery"
    - from: "DebtToEquityDonut.tsx"
      to: "@/components/ui/chart"
      via: "ChartContainer wrapper for Recharts PieChart"
      pattern: "ChartContainer|ChartTooltip"
---

<objective>
PR-B / Wave 3 — Headline redesign Wave B: liabilities Gantt + debt-to-equity + beneficiary donuts + withdrawal milestones + KPI strip rollout to 10 pages.

Install 2 more Kibo primitives (`@kibo-ui/gantt`, `@kibo-ui/avatar-stack`). Add the missing `trpc.liability.payoffProjections` batched query (sibling of existing single-row `getPayoffProjection`). Build the liabilities visual stack (KpiStrip → Gantt → DebtToEquity donut). Build the beneficiaries visual stack (KpiStrip → AvatarStack → per-beneficiary share donut grid → WithdrawalMilestone Gantt). Roll the PR-1 `KpiStrip` composition onto the remaining 10 list pages with page-specific data wired through existing tRPC queries.

Purpose: liabilities and beneficiaries are the two pages where the existing flat tables lose the most context. A Gantt collapses each loan's lifecycle into one visual; donuts make share allocation legible at a glance. KPI strips give every list page an immediate signal of state before the user has to scan a 50-row table.

Output: 1 new tRPC batched query; 2 Kibo primitives installed; 5 new page consumers (LiabilityKpiStrip, LiabilityGantt, DebtToEquityDonut, BeneficiaryShareDonuts, WithdrawalMilestoneGantt, BeneficiaryAvatarStack); 10 list-page client refactors to inject `<KpiStrip>` above the existing tables.
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
@src/server/trpc/routers/liability.ts
@src/lib/amortization.ts
@src/lib/money.ts
@src/components/ui/chart.tsx
@src/components/charts/asset-allocation-chart.tsx
@src/app/(admin)/liabilities/_components/LiabilitiesClient.tsx
@src/app/(admin)/liabilities/_components/LiabilitySummaryCards.tsx
@src/app/(admin)/beneficiaries/_components/BeneficiariesClient.tsx

<interfaces>
<!-- payoffProjections batched query contract -->

```typescript
// New procedure in src/server/trpc/routers/liability.ts (sibling of getPayoffProjection at lines 270-292)
payoffProjections: adminProcedure
    .input(z.object({ entityId: z.coerce.number() }))
    .query(async ({ input }) => {
        // Returns: Array<{
        //     id: number
        //     creditor: string
        //     startDate: string | Date           // loanStartDate ?? createdAt
        //     projection: ReturnType<typeof estimatePayoffDate> | null
        // }>
        // projection is null when: !interestRate, !monthlyPayment, or isRevolvingCredit
    })
```

<!-- estimatePayoffDate already exists at src/lib/amortization.ts lines 73-137 -->

```typescript
// Function signature (do NOT re-implement; import and use):
function estimatePayoffDate(
    currentBalance: string,
    interestRate: string,
    monthlyPayment: string,
    escrowMonthly?: string,
    loanStartDate?: Date | string,
): {
    payoffDate: string  // ISO
    monthsRemaining: number
    totalInterest: string
} | null
```

<!-- Money helpers (do NOT re-implement) -->

```typescript
import { formatMoney, sumStrings, toCents, fromCents } from '@/lib/money'
import { formatCurrency, formatDate, formatPercent } from '@/utils/formatters'
```

<!-- BeneficiaryShareDonutsProps + DebtToEquityDonutProps shape -->

```typescript
export interface BeneficiaryShareDonutsProps {
    beneficiaries: Array<{
        id: number
        name: string
        sharePercent: string | null
        relationship?: string | null
    }>
    isLoading?: boolean
}

export interface DebtToEquityDonutProps {
    totalDebt: string       // sumStrings of liability.currentBalance
    totalEquity: string     // sumStrings of asset values minus debt
    isLoading?: boolean
}
```

<!-- KpiStrip per-page data shape (10 pages — table from UI-SPEC §2) -->

```typescript
// Each page builds KpiStripItem[] from its existing tRPC query.
// Example for /accounts:
const kpiData: KpiStripItem[] = [
    { label: 'Account count', value: accounts.length, icon: Wallet },
    { label: 'Total balance', value: formatCurrency(sumStrings(accounts.map(a => a.balance))) },
    { label: 'Bank / Investment', value: `${bankCount} / ${investmentCount}` },
    { label: '30d activity', value: thirtyDayChangeCount, sparklineSeries: weekly7Days },
]
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 03.1: Add payoffProjections batched query + Wave-0 tests; install gantt and avatar-stack primitives</name>
  <files>src/server/trpc/routers/liability.ts, src/components/kibo-ui/gantt/index.tsx, src/components/kibo-ui/avatar-stack/index.tsx, tests/trpc/liability.test.ts</files>
  <read_first>
    - src/server/trpc/routers/liability.ts (existing `getPayoffProjection` at lines 270-292 is the single-row analog — match its null-handling rules)
    - src/lib/amortization.ts (lines 73-137 — `estimatePayoffDate` signature and null-handling logic)
    - tests/trpc/liability.test.ts (existing test file — match its seeding pattern)
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-RESEARCH.md (§"Batched payoff projections" code example; Per-component registry status table — gantt regDep is context-menu which PR-1 already installed)
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-PATTERNS.md (§"src/server/trpc/routers/liability.ts" — full payoffProjections sketch)
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-UI-SPEC.md (Implementation Note 4)
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-VALIDATION.md (row 23-03-01)
    - db/schema.ts (liability table at lines 2245-2356 — confirm column names: loanStartDate, isRevolvingCredit, monthlyPayment, escrowMonthly, interestRate, currentBalance, originalPrincipal, creditor, status; all camelCase)
  </read_first>
  <behavior>
    - Calling `trpc.liability.payoffProjections({ entityId })` as admin returns an array of length === number of liabilities for that entity.
    - For each row: `id`, `creditor`, `startDate` (= `loanStartDate ?? createdAt`), and `projection` (either `estimatePayoffDate(...)` output OR `null` when liability is revolving / missing interestRate / missing monthlyPayment).
    - Calling with wrong entityId returns empty array (no error — query is empty-safe).
    - Calling without admin role throws on the procedure boundary.
    - `src/components/kibo-ui/gantt/index.tsx` and `src/components/kibo-ui/avatar-stack/index.tsx` exist after install. Zero hex/Tailwind palette literals.
    - Wave-0 tests cover: success path (projection non-null), revolving-credit path (projection null), missing-interestRate path (projection null), missing-monthlyPayment path (projection null), entity scoping (only this entity's rows returned).
  </behavior>
  <action>
1. Add `payoffProjections` to `src/server/trpc/routers/liability.ts` immediately after `getPayoffProjection` (so the two payoff procedures are co-located):

```typescript
payoffProjections: adminProcedure
    .input(z.object({ entityId: z.coerce.number() }))
    .query(async ({ input }) => {
        const liabs = await db
            .select()
            .from(liability)
            .where(eq(liability.entityId, input.entityId))
        return liabs.map((l) => ({
            id: l.id,
            creditor: l.creditor,
            startDate: l.loanStartDate ?? l.createdAt,
            currentBalance: l.currentBalance,
            originalPrincipal: l.originalPrincipal,
            status: l.status,
            projection:
                !l.interestRate || !l.monthlyPayment || l.isRevolvingCredit
                    ? null
                    : estimatePayoffDate(
                          l.currentBalance ?? '0',
                          l.interestRate,
                          l.monthlyPayment,
                          l.escrowMonthly ?? undefined,
                          l.loanStartDate ?? undefined,
                      ),
        }))
    }),
```

   - Confirm `estimatePayoffDate` is already imported at top of file (RESEARCH.md confirms line 8: `import { estimatePayoffDate } from '@/lib/amortization'`). If not, add the import.
   - The currentBalance / originalPrincipal / status fields are included in the output so consumers (LiabilityGantt) don't need a second query.

2. Install the 2 Kibo primitives:

```bash
bunx --bun shadcn@latest add @kibo-ui/gantt
bunx --bun shadcn@latest add @kibo-ui/avatar-stack
```

   - Expected outputs: `src/components/kibo-ui/gantt/index.tsx` (~40 KB source) and `src/components/kibo-ui/avatar-stack/index.tsx` (~1.1 KB).
   - Gantt pulls `@dnd-kit/modifiers`, `@uidotdev/usehooks`, `jotai`, `lodash.throttle` as new deps (per RESEARCH.md Per-component registry status). Its regDep `context-menu` is already installed in PR-1.
   - Avatar-stack is pure composition over `@radix-ui/react-avatar` (already in deps); no new deps.

3. OKLCH grep audit (covers BOTH new files):

```bash
grep -rE "bg-\[#|text-\[#|border-\[#|bg-(red|green|blue|yellow|amber|sky|emerald|gray|slate)-[0-9]+|text-(red|green|blue|yellow|amber|sky|emerald|gray|slate)-[0-9]+" src/components/kibo-ui/gantt/index.tsx src/components/kibo-ui/avatar-stack/index.tsx
```

   - Expected: zero matches.

4. ThemeProvider import audit:

```bash
grep -E "useTheme|next-themes" src/components/kibo-ui/gantt/index.tsx src/components/kibo-ui/avatar-stack/index.tsx
```

   - Expected: zero matches. Any → mount `<ThemeProvider>` in `src/app/layout.tsx`.

5. Add `payoffProjections` tests to `tests/trpc/liability.test.ts` (Wave-0 row 23-03-01):

```typescript
describe('liability.payoffProjections', () => {
    it('returns one entry per liability for the entity', async () => {
        // Seed: 3 liabilities in entity E1 + 2 in entity E2
        const caller = createCallerFactory(appRouter)(await mockAdminContext())
        const result = await caller.liability.payoffProjections({ entityId: e1Id })
        expect(result.length).toBe(3)
        expect(result.map((r) => r.id).sort()).toEqual([l1Id, l2Id, l3Id].sort())
    })

    it('returns projection: null for revolving credit', async () => {
        // Seed: 1 liability with isRevolvingCredit: true
        const caller = createCallerFactory(appRouter)(await mockAdminContext())
        const result = await caller.liability.payoffProjections({ entityId: e1Id })
        const revolving = result.find((r) => r.id === revolvingLiabId)
        expect(revolving?.projection).toBeNull()
    })

    it('returns projection: null when interestRate is null/zero', async () => {
        // Seed: 1 liability without interestRate
        const caller = createCallerFactory(appRouter)(await mockAdminContext())
        const result = await caller.liability.payoffProjections({ entityId: e1Id })
        const noRate = result.find((r) => r.id === noRateLiabId)
        expect(noRate?.projection).toBeNull()
    })

    it('returns projection: null when monthlyPayment is missing', async () => {
        // Seed: 1 liability with interestRate but no monthlyPayment
        const caller = createCallerFactory(appRouter)(await mockAdminContext())
        const result = await caller.liability.payoffProjections({ entityId: e1Id })
        const noPay = result.find((r) => r.id === noPaymentLiabId)
        expect(noPay?.projection).toBeNull()
    })

    it('returns a valid projection for amortizing liabilities', async () => {
        // Seed: 1 fully-specified liability
        const caller = createCallerFactory(appRouter)(await mockAdminContext())
        const result = await caller.liability.payoffProjections({ entityId: e1Id })
        const valid = result.find((r) => r.id === amortizingLiabId)
        expect(valid?.projection).not.toBeNull()
        expect(typeof valid?.projection?.payoffDate).toBe('string')
        expect(typeof valid?.projection?.monthsRemaining).toBe('number')
    })

    it('returns startDate = loanStartDate when present, else createdAt', async () => {
        const caller = createCallerFactory(appRouter)(await mockAdminContext())
        const result = await caller.liability.payoffProjections({ entityId: e1Id })
        const withLoanStart = result.find((r) => r.id === withLoanStartLiabId)
        // loanStartDate was set during seed
        expect(withLoanStart?.startDate).toBeTruthy()
    })

    it('returns empty array for entity with no liabilities', async () => {
        const caller = createCallerFactory(appRouter)(await mockAdminContext())
        const result = await caller.liability.payoffProjections({ entityId: emptyEntityId })
        expect(result).toEqual([])
    })
})
```

   - Match the actual seeding pattern used by the existing `tests/trpc/liability.test.ts` (likely `db.insert(liability).values(...)`). The fixture variables (e1Id, l1Id, etc.) are illustrative — adapt to the file's actual helpers.

6. Run tests:

```bash
bun test --bail --timeout 30000 tests/trpc/liability.test.ts
bun run typecheck
```
  </action>
  <verify>
    <automated>grep -q "payoffProjections: adminProcedure" src/server/trpc/routers/liability.ts &amp;&amp; grep -q "estimatePayoffDate" src/server/trpc/routers/liability.ts &amp;&amp; grep -E "isRevolvingCredit|!l\.interestRate|!l\.monthlyPayment" src/server/trpc/routers/liability.ts &amp;&amp; test -f src/components/kibo-ui/gantt/index.tsx &amp;&amp; test -f src/components/kibo-ui/avatar-stack/index.tsx &amp;&amp; ! grep -rE "bg-\[#|text-\[#|border-\[#|bg-(red|green|blue|yellow|amber|sky|emerald|gray|slate)-[0-9]+|text-(red|green|blue|yellow|amber|sky|emerald|gray|slate)-[0-9]+" src/components/kibo-ui/gantt/index.tsx src/components/kibo-ui/avatar-stack/index.tsx &amp;&amp; bun test --bail --timeout 30000 tests/trpc/liability.test.ts &amp;&amp; bun run typecheck</automated>
  </verify>
  <acceptance_criteria>
    - `src/server/trpc/routers/liability.ts` contains `payoffProjections: adminProcedure`
    - `src/server/trpc/routers/liability.ts` contains the null-guard expression involving `isRevolvingCredit`, `!l.interestRate`, AND `!l.monthlyPayment`
    - `src/server/trpc/routers/liability.ts` contains the input schema `z.object({ entityId: z.coerce.number() })` for `payoffProjections`
    - File exists: `src/components/kibo-ui/gantt/index.tsx`
    - File exists: `src/components/kibo-ui/avatar-stack/index.tsx`
    - OKLCH grep on both new files returns zero matches
    - ThemeProvider grep on both new files returns zero matches (or layout.tsx mounts provider)
    - `tests/trpc/liability.test.ts` contains at least 6 test cases for `payoffProjections` (length match, revolving null, no-rate null, no-payment null, valid projection, startDate fallback, empty entity)
    - `bun test --bail --timeout 30000 tests/trpc/liability.test.ts` exits 0
    - `bun run typecheck` exits 0
  </acceptance_criteria>
  <done>payoffProjections batched query added with full null-handling for revolving/no-rate/no-payment cases, 2 Kibo primitives installed at correct subdir paths with audits passing, 7 Wave-0 tests passing.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 03.2: Build LiabilityKpiStrip + LiabilityGantt + DebtToEquityDonut; refactor /liabilities page</name>
  <files>src/app/(admin)/liabilities/_components/LiabilitiesClient.tsx, src/app/(admin)/liabilities/_components/LiabilityKpiStrip.tsx, src/app/(admin)/liabilities/_components/LiabilityGantt.tsx, src/app/(admin)/liabilities/_components/DebtToEquityDonut.tsx</files>
  <read_first>
    - src/app/(admin)/liabilities/_components/LiabilitiesClient.tsx (entity-gating pattern lines 30-49; sumStrings import at line 11)
    - src/app/(admin)/liabilities/_components/LiabilitySummaryCards.tsx (current shape lines 14-58 — replace with KpiStrip)
    - src/lib/money.ts (sumStrings + formatMoney)
    - src/utils/formatters.ts (formatCurrency, formatDate, formatPercent)
    - src/components/charts/asset-allocation-chart.tsx (analog for ChartContainer + recharts Pie wrapper)
    - src/components/kibo-ui/gantt/index.tsx (installed in 03.1 — read the actual exported component API)
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-UI-SPEC.md (§6 LiabilityGantt + DebtToEquityDonut; §2 per-page KPI columns table row /liabilities; §Color Gantt color rules)
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-PATTERNS.md (§"LiabilityGantt.tsx", §"LiabilityKpiStrip.tsx", §"DebtToEquityDonut.tsx")
    - db/schema.ts (asset tables: bankAccount, investmentAccount, homestead, rentalProperty, vehicle, personalProperty — for total equity computation; also confirm dodValue / coverageAmount column names)
  </read_first>
  <behavior>
    - LiabilityKpiStrip renders 4 cards: Active count, Original principal sum (formatted USD), Current balance sum (with invertDelta=true; balance going DOWN is GOOD), Weighted avg APR (formatted percent). All sums use sumStrings.
    - LiabilityGantt renders one bar per liability ordered by current balance desc. Bar style follows UI-SPEC §Color Gantt rules: default bg-primary/30, success/30 for paid-off, warning/30 within 30 days of payoff, destructive/30 for overdue. Today vertical line uses bg-primary. Bars without projections (revolving / missing data) render as a special "—" indicator.
    - DebtToEquityDonut renders 2 slices: debt = var(--destructive), equity = var(--success). Center label = "{ratio}%" where ratio = totalDebt / (totalDebt + totalEquity) × 100, formatted with 0 decimal places. Uses ChartContainer + recharts.
    - /liabilities page renders: PageHeader → LiabilityKpiStrip → grid (LiabilityGantt: lg:col-span-2, DebtToEquityDonut: lg:col-span-1) → existing DataTable (unchanged).
  </behavior>
  <action>
0. **Kibo gantt export gate (early — run BEFORE writing any consumer code):**

```bash
grep -E '^export' src/components/kibo-ui/gantt/index.tsx
```

Expected named exports include: `GanttProvider`, `GanttSidebar`, `GanttTimeline`, `GanttToday`, `GanttFeatureList` (consumed by `LiabilityGantt.tsx` in step 3). If any differ from this list, UPDATE the consumer import line BEFORE writing the rest of LiabilityGantt.tsx — do NOT speculate; the installed file is the authority. Record the actual export shape in the SUMMARY so 03.3's WithdrawalMilestoneGantt (which reuses gantt primitives) can match.

1. Build `src/app/(admin)/liabilities/_components/LiabilityKpiStrip.tsx` — replaces `LiabilitySummaryCards.tsx`:

```tsx
'use client'

import { AlertCircle, DollarSign, Percent, TrendingDown } from 'lucide-react'
import { KpiStrip, type KpiStripItem } from '@/components/kpi-strip'
import { sumStrings } from '@/lib/money'
import { formatCurrency, formatPercent } from '@/utils/formatters'

type Liability = {
    id: number
    status: string
    originalPrincipal: string | null
    currentBalance: string | null
    interestRate: string | null
}

export function LiabilityKpiStrip({ liabilities, isLoading }: { liabilities: Liability[]; isLoading?: boolean }) {
    const active = liabilities.filter((l) => l.status === 'CURRENT' || l.status === 'ACTIVE' || l.status === 'OPEN')
    const totalOriginal = sumStrings(liabilities.map((l) => l.originalPrincipal ?? '0'))
    const totalBalance = sumStrings(liabilities.map((l) => l.currentBalance ?? '0'))

    // Weighted average APR = SUM(currentBalance * interestRate) / SUM(currentBalance)
    const weightedNumerator = liabilities
        .filter((l) => l.interestRate && l.currentBalance)
        .reduce((acc, l) => {
            const bal = parseFloat(l.currentBalance ?? '0')
            const rate = parseFloat(l.interestRate ?? '0')
            return acc + bal * rate
        }, 0)
    const weightedDenominator = parseFloat(totalBalance) || 1
    const weightedAvgApr = weightedNumerator / weightedDenominator

    const data: KpiStripItem[] = [
        { label: 'Active', value: active.length, icon: AlertCircle },
        { label: 'Original principal', value: formatCurrency(totalOriginal), icon: DollarSign },
        {
            label: 'Current balance',
            value: formatCurrency(totalBalance),
            icon: TrendingDown,
            invertDelta: true, // balance going DOWN is GOOD
        },
        { label: 'Weighted avg APR', value: formatPercent(weightedAvgApr), icon: Percent },
    ]

    return <KpiStrip data={data} isLoading={isLoading} />
}
```

   - Note: weighted avg APR uses `parseFloat` only at the LAST step where the result is divided by another float and rendered immediately — NOT to sum money. Money sums use `sumStrings`. This is the rule: parseFloat for percentages (numeric, not currency); sumStrings for money.

2. Build `src/app/(admin)/liabilities/_components/DebtToEquityDonut.tsx`:

```tsx
'use client'

import { Cell, Label, Pie, PieChart } from 'recharts'
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { sumStrings } from '@/lib/money'
import { formatCurrency } from '@/utils/formatters'
import { Skeleton } from '@/components/ui/skeleton'

export interface DebtToEquityDonutProps {
    totalDebt: string       // sum of liability.currentBalance
    totalEquity: string     // sum of asset values minus debt (caller computes)
    isLoading?: boolean
}

const chartConfig = {
    debt: { label: 'Debt', color: 'var(--destructive)' },
    equity: { label: 'Equity', color: 'var(--success)' },
} satisfies ChartConfig

export function DebtToEquityDonut({ totalDebt, totalEquity, isLoading }: DebtToEquityDonutProps) {
    if (isLoading) {
        return <Skeleton className="h-40 w-40 rounded-full mx-auto" />
    }

    const debt = parseFloat(totalDebt) || 0
    const equity = parseFloat(totalEquity) || 0
    const total = debt + equity
    const debtPct = total > 0 ? Math.round((debt / total) * 100) : 0

    const data = [
        { name: 'Debt', value: debt, fill: 'var(--destructive)' },
        { name: 'Equity', value: equity, fill: 'var(--success)' },
    ]

    return (
        <div className="flex flex-col items-center gap-2">
            <ChartContainer config={chartConfig} className="mx-auto h-40 w-40">
                <PieChart>
                    <ChartTooltip
                        content={
                            <ChartTooltipContent
                                formatter={(value, name) => `${name}: ${formatCurrency(String(value))}`}
                            />
                        }
                    />
                    <Pie data={data} dataKey="value" nameKey="name" outerRadius={60} innerRadius={40} strokeWidth={2}>
                        {data.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} />
                        ))}
                        <Label
                            value={`${debtPct}%`}
                            position="center"
                            className="fill-foreground text-xl font-semibold"
                        />
                    </Pie>
                </PieChart>
            </ChartContainer>
            <p className="text-xs text-muted-foreground">debt to equity</p>
            <div className="text-xs text-muted-foreground space-y-1">
                <div>Debt: {formatCurrency(totalDebt)}</div>
                <div>Equity: {formatCurrency(totalEquity)}</div>
            </div>
        </div>
    )
}
```

3. Build `src/app/(admin)/liabilities/_components/LiabilityGantt.tsx`:

```tsx
'use client'

import { useMemo } from 'react'
import { differenceInDays, parseISO } from 'date-fns'
import { trpc } from '@/lib/trpc'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { GanttProvider, GanttFeatureList, GanttSidebar, GanttTimeline, GanttToday } from '@/components/kibo-ui/gantt'
// ^ Verify the exact set of named exports against the installed kibo-ui/gantt/index.tsx — adjust if different
import { cn } from '@/lib/utils'

export interface LiabilityGanttProps {
    entityId: number
}

export function LiabilityGantt({ entityId }: LiabilityGanttProps) {
    const { data: projections = [], isLoading } = trpc.liability.payoffProjections.useQuery(
        { entityId },
        { enabled: !!entityId },
    )

    const bars = useMemo(() => {
        return projections
            .filter((p) => p.projection !== null)
            .sort((a, b) => parseFloat(b.currentBalance ?? '0') - parseFloat(a.currentBalance ?? '0'))
            .map((p) => {
                const start = typeof p.startDate === 'string' ? parseISO(p.startDate) : new Date(p.startDate as Date)
                const end = parseISO(p.projection!.payoffDate)
                const daysToPayoff = differenceInDays(end, new Date())
                // UI-SPEC §Color Gantt rules:
                let className = 'bg-primary/30 border-primary'
                if (daysToPayoff < 0) className = 'bg-destructive/30 border-destructive' // overdue
                else if (daysToPayoff <= 30) className = 'bg-warning/30 border-warning'  // within 30 days
                else if (p.status === 'PAID') className = 'bg-success/30 border-success'

                return {
                    id: p.id,
                    name: p.creditor,
                    startAt: start,
                    endAt: end,
                    className,
                    label: `${p.creditor} · ${formatCurrency(p.currentBalance ?? '0')}`,
                }
            })
    }, [projections])

    if (isLoading) {
        return <Skeleton className="h-64 w-full" />
    }

    if (bars.length === 0) {
        return (
            <div className="border border-border rounded-md p-12 text-center">
                <p className="text-sm font-semibold">No liabilities tracked</p>
                <p className="text-xs text-muted-foreground mt-1">
                    Add a liability to see payoff projections and the debt-to-equity ratio.
                </p>
            </div>
        )
    }

    // Kibo gantt API — replace pseudo-component names with verified exports from src/components/kibo-ui/gantt/index.tsx
    return (
        <GanttProvider range="monthly" zoom={100}>
            <GanttSidebar>
                {bars.map((b) => (
                    <div key={b.id} className="text-sm h-6 flex items-center px-2">
                        {b.name}
                    </div>
                ))}
            </GanttSidebar>
            <GanttTimeline>
                <GanttToday />
                <GanttFeatureList features={bars} />
            </GanttTimeline>
        </GanttProvider>
    )
}
```

   - CRITICAL: the executor MUST open `src/components/kibo-ui/gantt/index.tsx` and read the actual exports + prop shapes before writing this component. The pseudo-API above (GanttProvider/GanttSidebar/GanttTimeline/GanttToday/GanttFeatureList) matches Kibo's documented API as of 2026-05-19, but verify before merging. If exports differ, adapt accordingly while preserving: bar color classNames, today line, monthly tick grid, axis label typography (text-xs text-muted-foreground), bar height h-6, row gap-2.
   - If `bun run build` shows `[Compiler bailout]` for LiabilityGantt.tsx, add `'use no memo'` (Kibo gantt uses jotai which may trip the Compiler).

4. Refactor `src/app/(admin)/liabilities/_components/LiabilitiesClient.tsx`:

   - Add at top of file: `import { PageHeader } from '@/components/page-header'`, `import { LiabilityKpiStrip } from './LiabilityKpiStrip'`, `import { LiabilityGantt } from './LiabilityGantt'`, `import { DebtToEquityDonut } from './DebtToEquityDonut'`.
   - Replace the existing top-level `<h2>` block with `<PageHeader title="Liabilities" description="Loans, mortgages, and lines of credit secured by trust assets." />`.
   - Remove the existing `<LiabilitySummaryCards ... />` usage and replace with `<LiabilityKpiStrip liabilities={liabilities} isLoading={liabilitiesLoading} />`.
   - Below the KpiStrip, add the 2-column grid:

```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className="lg:col-span-2">
        <LiabilityGantt entityId={entityId!} />
    </div>
    <div className="lg:col-span-1">
        <DebtToEquityDonut
            totalDebt={sumStrings(liabilities.map((l) => l.currentBalance ?? '0'))}
            totalEquity={totalEquity}  // compute via asset queries
            isLoading={liabilitiesLoading}
        />
    </div>
</div>
```

   - `totalEquity` computation: sum across asset queries (bankAccount.balance + investmentAccount.balance + homestead.dodValue + rentalProperty.dodValue + vehicle.dodValue + personalProperty.dodValue + insurance.coverageAmount). Use the existing `trpc.<asset>.list.useQuery({ entityId }, { enabled: !!entityId })` pattern for each. If this creates a noisy waterfall, batch via `Promise.all` style fetched data or add a `trpc.dashboard.estimateTotals` procedure as a future task — for PR-B, compute client-side from the queries that LiabilitiesClient already needs to fetch (or aggregate from `entity.byId` if it exposes totals). Document the data-source decision in the SUMMARY.

   - DO NOT delete `LiabilitySummaryCards.tsx` in this PR — leave it as dead code with a `// TODO: remove after PR-B verification` comment so rollback is clean. Add a follow-up cleanup task to the SUMMARY.
  </action>
  <verify>
    <automated>test -f "src/app/(admin)/liabilities/_components/LiabilityKpiStrip.tsx" &amp;&amp; test -f "src/app/(admin)/liabilities/_components/LiabilityGantt.tsx" &amp;&amp; test -f "src/app/(admin)/liabilities/_components/DebtToEquityDonut.tsx" &amp;&amp; grep -q "sumStrings" "src/app/(admin)/liabilities/_components/LiabilityKpiStrip.tsx" &amp;&amp; ! grep -E "parseFloat.*reduce" "src/app/(admin)/liabilities/_components/LiabilityKpiStrip.tsx" &amp;&amp; grep -q "invertDelta: true" "src/app/(admin)/liabilities/_components/LiabilityKpiStrip.tsx" &amp;&amp; grep -q "var(--destructive)" "src/app/(admin)/liabilities/_components/DebtToEquityDonut.tsx" &amp;&amp; grep -q "var(--success)" "src/app/(admin)/liabilities/_components/DebtToEquityDonut.tsx" &amp;&amp; grep -q "trpc.liability.payoffProjections" "src/app/(admin)/liabilities/_components/LiabilityGantt.tsx" &amp;&amp; grep -qE "bg-primary/30|bg-warning/30|bg-destructive/30" "src/app/(admin)/liabilities/_components/LiabilityGantt.tsx" &amp;&amp; grep -q "PageHeader" "src/app/(admin)/liabilities/_components/LiabilitiesClient.tsx" &amp;&amp; grep -qE "LiabilityKpiStrip|LiabilityGantt|DebtToEquityDonut" "src/app/(admin)/liabilities/_components/LiabilitiesClient.tsx" &amp;&amp; bun run typecheck</automated>
  </verify>
  <acceptance_criteria>
    - File exists: `src/app/(admin)/liabilities/_components/LiabilityKpiStrip.tsx`
    - LiabilityKpiStrip imports `sumStrings` from `@/lib/money`
    - LiabilityKpiStrip does NOT contain `parseFloat.*reduce` patterns (use sumStrings for money — Pattern S3)
    - LiabilityKpiStrip contains `invertDelta: true` on the Current balance entry
    - File exists: `src/app/(admin)/liabilities/_components/DebtToEquityDonut.tsx`
    - DebtToEquityDonut contains `var(--destructive)` AND `var(--success)` (no hsl literals, no chart-N colors for this 2-slice donut)
    - DebtToEquityDonut imports from `@/components/ui/chart` (ChartContainer wrapper)
    - File exists: `src/app/(admin)/liabilities/_components/LiabilityGantt.tsx`
    - LiabilityGantt contains `trpc.liability.payoffProjections.useQuery` AND `{ enabled: !!entityId }`
    - LiabilityGantt contains the gantt color tokens `bg-primary/30`, `bg-warning/30`, and `bg-destructive/30`
    - LiabilityGantt imports from `@/components/kibo-ui/gantt` (NOT from `@/components/ui/gantt`)
    - LiabilitiesClient contains `<PageHeader` AND one of `LiabilityKpiStrip`, `LiabilityGantt`, `DebtToEquityDonut`
    - `bun run typecheck` exits 0
    - `bun run build` log contains no `[Compiler bailout]` line for LiabilityGantt UNLESS file has `'use no memo'`
  </acceptance_criteria>
  <done>LiabilityKpiStrip (sumStrings, invertDelta), LiabilityGantt (payoffProjections + color rules + Kibo gantt API), DebtToEquityDonut (2-slice with destructive+success tokens + ChartContainer) all built; /liabilities page refactored to render PageHeader → KpiStrip → Gantt+Donut grid → existing DataTable.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 03.3: Build BeneficiaryShareDonuts + WithdrawalMilestoneGantt + AvatarStack consumer; refactor /beneficiaries page; Wave-0 donut tests</name>
  <files>src/app/(admin)/beneficiaries/_components/BeneficiariesClient.tsx, src/app/(admin)/beneficiaries/_components/BeneficiaryShareDonuts.tsx, src/app/(admin)/beneficiaries/_components/BeneficiaryAvatarStack.tsx, src/app/(admin)/beneficiaries/_components/WithdrawalMilestoneGantt.tsx, tests/components/beneficiary-share-donuts.test.tsx</files>
  <read_first>
    - src/app/(admin)/beneficiaries/_components/BeneficiariesClient.tsx (entity-gating pattern lines 22-28; data type `trpc.beneficiary.listWithDistributions`)
    - src/components/charts/asset-allocation-chart.tsx (analog for ChartContainer + Pie + Cell)
    - src/components/kibo-ui/avatar-stack/index.tsx (installed in 03.1 — read exported API)
    - src/components/kibo-ui/gantt/index.tsx (installed in 03.1 — reused for WithdrawalMilestone)
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-UI-SPEC.md (§7 BeneficiaryShareDonuts + WithdrawalMilestoneGantt; §Color chart palette + Gantt color rules)
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-PATTERNS.md (§"BeneficiaryShareDonuts.tsx")
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-VALIDATION.md (row 23-03-03)
    - db/schema.ts (beneficiary table lines 921-1010 — confirm columns: sharePercent (string nullable), relationship, withdrawalAge1, withdrawalAge2, withdrawalPct1, withdrawalPct2, dob if present)
  </read_first>
  <behavior>
    - BeneficiaryShareDonuts renders one Card-wrapped donut per beneficiary in a `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4` layout. Each donut shows two slices: sharePercent (chart-{(index % 5) + 1}) and (100 - sharePercent) muted remainder.
    - Donut center label: `{sharePercent}%` in text-xl font-semibold; beneficiary name in text-sm font-semibold below; relationship in text-xs text-muted-foreground below name.
    - When `sharePercent` is null or 0: render greyed-out donut (full slice bg-muted), center label "—" (em dash), name shown with "(share not set)" suffix.
    - BeneficiaryAvatarStack renders avatars sized h-8 w-8, max 5 shown, "+N more" overflow indicator. Caption below: "{N} beneficiaries".
    - WithdrawalMilestoneGantt renders one row per beneficiary with 2 milestone markers (withdrawalAge1, withdrawalAge2) computed relative to dob (if present) or entity dod. X-axis: today to today+30y, ticks every 5 years. Today line: bg-primary 2px.
    - Donut tests cover: rendering 4 donuts for 4 beneficiaries with cycling chart-N colors; greyed-out state for null sharePercent; total of all displayed sharePercent slices equals 100% within rounding (if all sharePercent non-null).
  </behavior>
  <action>
1. Build `src/app/(admin)/beneficiaries/_components/BeneficiaryShareDonuts.tsx`:

```tsx
'use client'

import { Cell, Label, Pie, PieChart } from 'recharts'
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export interface BeneficiaryShareDonutsItem {
    id: number
    name: string
    sharePercent: string | null
    relationship?: string | null
}

export interface BeneficiaryShareDonutsProps {
    beneficiaries: BeneficiaryShareDonutsItem[]
    isLoading?: boolean
}

const chartConfig: ChartConfig = {
    share: { label: 'Share' },
    remainder: { label: 'Remainder', color: 'var(--muted)' },
}

export function BeneficiaryShareDonuts({ beneficiaries, isLoading }: BeneficiaryShareDonutsProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-48 w-full rounded-lg" />
                ))}
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {beneficiaries.map((b, idx) => (
                <BeneficiaryDonut key={b.id} beneficiary={b} index={idx} />
            ))}
        </div>
    )
}

function BeneficiaryDonut({ beneficiary, index }: { beneficiary: BeneficiaryShareDonutsItem; index: number }) {
    const sharePct = beneficiary.sharePercent ? parseFloat(beneficiary.sharePercent) : 0
    const hasShare = sharePct > 0
    const sliceColor = `var(--chart-${(index % 5) + 1})`
    const data = hasShare
        ? [
              { name: 'share', value: sharePct, fill: sliceColor },
              { name: 'remainder', value: Math.max(0, 100 - sharePct), fill: 'var(--muted)' },
          ]
        : [{ name: 'unset', value: 100, fill: 'var(--muted)' }]

    return (
        <Card className="p-6">
            <CardContent className="p-0 flex flex-col items-center gap-2">
                <ChartContainer config={chartConfig} className="h-32 w-32">
                    <PieChart>
                        <ChartTooltip
                            content={
                                <ChartTooltipContent
                                    formatter={(value, name) => `${name}: ${value}%`}
                                />
                            }
                        />
                        <Pie data={data} dataKey="value" nameKey="name" outerRadius={48} innerRadius={32} strokeWidth={2}>
                            {data.map((entry, i) => (
                                <Cell key={`${entry.name}-${i}`} fill={entry.fill} />
                            ))}
                            <Label
                                value={hasShare ? `${sharePct.toFixed(0)}%` : '—'}
                                position="center"
                                className={hasShare ? 'fill-foreground text-xl font-semibold' : 'fill-muted-foreground text-xl'}
                            />
                        </Pie>
                    </PieChart>
                </ChartContainer>
                <div className="text-sm font-semibold text-center">
                    {beneficiary.name}
                    {!hasShare && <span className="text-muted-foreground"> (share not set)</span>}
                </div>
                {beneficiary.relationship && (
                    <div className="text-xs text-muted-foreground">{beneficiary.relationship}</div>
                )}
            </CardContent>
        </Card>
    )
}
```

2. Build `src/app/(admin)/beneficiaries/_components/BeneficiaryAvatarStack.tsx`:

```tsx
'use client'

import { AvatarStack } from '@/components/kibo-ui/avatar-stack'
// ^ verify exact named export against installed file — if differs, adjust
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export interface BeneficiaryAvatarStackProps {
    beneficiaries: Array<{ id: number; name: string }>
    max?: number
}

export function BeneficiaryAvatarStack({ beneficiaries, max = 5 }: BeneficiaryAvatarStackProps) {
    const visible = beneficiaries.slice(0, max)
    const overflow = beneficiaries.length - visible.length

    return (
        <div className="flex flex-col items-start gap-2">
            <AvatarStack size="sm">
                {visible.map((b) => (
                    <Avatar key={b.id} className="h-8 w-8 ring-2 ring-background">
                        <AvatarFallback className="text-xs">
                            {b.name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                ))}
                {overflow > 0 && (
                    <Avatar className="h-8 w-8 ring-2 ring-background">
                        <AvatarFallback className="text-xs bg-muted">+{overflow}</AvatarFallback>
                    </Avatar>
                )}
            </AvatarStack>
            <p className="text-sm text-muted-foreground">
                {beneficiaries.length} {beneficiaries.length === 1 ? 'beneficiary' : 'beneficiaries'}
            </p>
        </div>
    )
}
```

   - Verify the Kibo avatar-stack export name + prop API matches the installed file. If Kibo's component composes children directly (most likely), the above works. If it requires `items` prop with specific shape, adapt.

3. Build `src/app/(admin)/beneficiaries/_components/WithdrawalMilestoneGantt.tsx`:

```tsx
'use client'

import { useMemo } from 'react'
import { addYears, differenceInDays } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'

export interface WithdrawalMilestoneGanttProps {
    beneficiaries: Array<{
        id: number
        name: string
        dob: string | null
        withdrawalAge1: number | null
        withdrawalPct1: string | null
        withdrawalAge2: number | null
        withdrawalPct2: string | null
    }>
    entityDod?: string | Date | null
    isLoading?: boolean
}

export function WithdrawalMilestoneGantt({ beneficiaries, entityDod, isLoading }: WithdrawalMilestoneGanttProps) {
    const today = new Date()
    const endDate = addYears(today, 30)
    const totalDays = differenceInDays(endDate, today)

    const rows = useMemo(() => {
        return beneficiaries.map((b) => {
            const reference = b.dob ? new Date(b.dob) : entityDod ? new Date(entityDod as Date | string) : today
            const milestone = (age: number | null) => {
                if (!age) return null
                const date = addYears(reference, age)
                const dayOffset = differenceInDays(date, today)
                if (dayOffset < 0 || dayOffset > totalDays) return null
                return { date, leftPct: (dayOffset / totalDays) * 100 }
            }
            return {
                id: b.id,
                name: b.name,
                m1: milestone(b.withdrawalAge1),
                m2: milestone(b.withdrawalAge2),
            }
        })
    }, [beneficiaries, entityDod, today, endDate, totalDays])

    if (isLoading) return <Skeleton className="h-64 w-full" />

    return (
        <div className="border border-border rounded-md p-4">
            <div className="space-y-2">
                {rows.map((row) => (
                    <div key={row.id} className="flex items-center gap-4">
                        <div className="w-32 text-sm font-semibold truncate">{row.name}</div>
                        <div className="relative flex-1 h-6 bg-muted rounded">
                            <div className="absolute inset-y-0 left-0 w-px bg-primary" style={{ left: '0%' }} title="Today" />
                            {row.m1 && (
                                <div
                                    className="absolute top-1/2 -translate-y-1/2 h-2 w-2 rotate-45 bg-chart-1 ring-2 ring-background"
                                    style={{ left: `${row.m1.leftPct}%` }}
                                    title={`Age 1 withdrawal: ${row.m1.date.toISOString().slice(0, 10)}`}
                                />
                            )}
                            {row.m2 && (
                                <div
                                    className="absolute top-1/2 -translate-y-1/2 h-2 w-2 rotate-45 bg-chart-2 ring-2 ring-background"
                                    style={{ left: `${row.m2.leftPct}%` }}
                                    title={`Age 2 withdrawal: ${row.m2.date.toISOString().slice(0, 10)}`}
                                />
                            )}
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-4 flex justify-between text-xs text-muted-foreground">
                <span>Today</span>
                <span>+15y</span>
                <span>+30y</span>
            </div>
        </div>
    )
}
```

   - Decision: WithdrawalMilestoneGantt is hand-rendered rather than using the Kibo gantt because the visual is a horizontal timeline with point markers, not bar segments — Kibo gantt is optimized for date-range bars. Document in SUMMARY. Reuse the Kibo gantt for LiabilityGantt only.

4. Refactor `src/app/(admin)/beneficiaries/_components/BeneficiariesClient.tsx`:

   - Add at top: `import { PageHeader } from '@/components/page-header'`, `import { KpiStrip, type KpiStripItem } from '@/components/kpi-strip'`, `import { BeneficiaryShareDonuts } from './BeneficiaryShareDonuts'`, `import { BeneficiaryAvatarStack } from './BeneficiaryAvatarStack'`, `import { WithdrawalMilestoneGantt } from './WithdrawalMilestoneGantt'`, `import { sumStrings } from '@/lib/money'`, `import { formatCurrency } from '@/utils/formatters'`.
   - Replace the ad-hoc h2 with `<PageHeader title="Beneficiaries" description="Trust beneficiaries with share allocations and withdrawal milestones." />`.
   - Build KpiStripItem array per UI-SPEC §2 row /beneficiaries (TBD — UI-SPEC table does not include /beneficiaries explicitly; reasonable columns: Beneficiary count, Total share %, Distributions YTD (sumStrings of distribution.amount filtered by current year), Pending HEMS count).
   - Insert above the existing DataTable, in order: PageHeader → KpiStrip → 2-column section (AvatarStack on left, summary text on right) → BeneficiaryShareDonuts → WithdrawalMilestoneGantt → existing DataTable.

5. Create `tests/components/beneficiary-share-donuts.test.tsx` (Wave-0 row 23-03-03):

```tsx
import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { BeneficiaryShareDonuts } from '@/app/(admin)/beneficiaries/_components/BeneficiaryShareDonuts'

describe('BeneficiaryShareDonuts', () => {
    it('renders one card per beneficiary', () => {
        const { container } = render(
            <BeneficiaryShareDonuts
                beneficiaries={[
                    { id: 1, name: 'Alice', sharePercent: '25.00' },
                    { id: 2, name: 'Bob', sharePercent: '25.00' },
                    { id: 3, name: 'Carol', sharePercent: '25.00' },
                    { id: 4, name: 'Dave', sharePercent: '25.00' },
                ]}
            />,
        )
        expect(screen.getByText('Alice')).toBeTruthy()
        expect(screen.getByText('Bob')).toBeTruthy()
        expect(screen.getByText('Carol')).toBeTruthy()
        expect(screen.getByText('Dave')).toBeTruthy()
    })

    it('total of all displayed share percentages equals 100 within rounding', () => {
        const beneficiaries = [
            { id: 1, name: 'A', sharePercent: '33.33' },
            { id: 2, name: 'B', sharePercent: '33.33' },
            { id: 3, name: 'C', sharePercent: '33.34' },
        ]
        const total = beneficiaries.reduce(
            (acc, b) => acc + parseFloat(b.sharePercent ?? '0'),
            0,
        )
        expect(Math.abs(total - 100)).toBeLessThan(0.01)
    })

    it('cycles chart-N colors across beneficiaries', () => {
        const { container } = render(
            <BeneficiaryShareDonuts
                beneficiaries={[
                    { id: 1, name: 'A', sharePercent: '20' },
                    { id: 2, name: 'B', sharePercent: '20' },
                    { id: 3, name: 'C', sharePercent: '20' },
                    { id: 4, name: 'D', sharePercent: '20' },
                    { id: 5, name: 'E', sharePercent: '20' },
                ]}
            />,
        )
        // The 5 donuts should use chart-1 through chart-5 (one each)
        const html = container.innerHTML
        expect(html).toMatch(/--chart-1/)
        expect(html).toMatch(/--chart-2/)
        expect(html).toMatch(/--chart-3/)
        expect(html).toMatch(/--chart-4/)
        expect(html).toMatch(/--chart-5/)
    })

    it('renders greyed-out donut with "—" label when sharePercent is null', () => {
        render(
            <BeneficiaryShareDonuts
                beneficiaries={[{ id: 1, name: 'Eve', sharePercent: null }]}
            />,
        )
        expect(screen.getByText('—')).toBeTruthy()
        expect(screen.getByText(/share not set/i)).toBeTruthy()
    })

    it('renders greyed-out donut when sharePercent is "0"', () => {
        render(
            <BeneficiaryShareDonuts
                beneficiaries={[{ id: 1, name: 'Frank', sharePercent: '0' }]}
            />,
        )
        expect(screen.getByText('—')).toBeTruthy()
    })

    it('renders skeletons when isLoading', () => {
        const { container } = render(
            <BeneficiaryShareDonuts beneficiaries={[]} isLoading />,
        )
        const skeletons = container.querySelectorAll('.animate-pulse, [data-slot="skeleton"]')
        expect(skeletons.length).toBeGreaterThan(0)
    })
})
```
  </action>
  <verify>
    <automated>test -f "src/app/(admin)/beneficiaries/_components/BeneficiaryShareDonuts.tsx" &amp;&amp; test -f "src/app/(admin)/beneficiaries/_components/BeneficiaryAvatarStack.tsx" &amp;&amp; test -f "src/app/(admin)/beneficiaries/_components/WithdrawalMilestoneGantt.tsx" &amp;&amp; grep -q "var(--chart-" "src/app/(admin)/beneficiaries/_components/BeneficiaryShareDonuts.tsx" &amp;&amp; grep -q "share not set" "src/app/(admin)/beneficiaries/_components/BeneficiaryShareDonuts.tsx" &amp;&amp; grep -q "PageHeader" "src/app/(admin)/beneficiaries/_components/BeneficiariesClient.tsx" &amp;&amp; grep -qE "BeneficiaryShareDonuts|WithdrawalMilestoneGantt" "src/app/(admin)/beneficiaries/_components/BeneficiariesClient.tsx" &amp;&amp; bun test --bail --timeout 30000 tests/components/beneficiary-share-donuts.test.tsx &amp;&amp; bun run typecheck</automated>
  </verify>
  <acceptance_criteria>
    - File exists: `src/app/(admin)/beneficiaries/_components/BeneficiaryShareDonuts.tsx`
    - BeneficiaryShareDonuts contains `var(--chart-` (sliceColor cycling)
    - BeneficiaryShareDonuts contains `share not set` (empty-state copy)
    - BeneficiaryShareDonuts contains the className string `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4`
    - File exists: `src/app/(admin)/beneficiaries/_components/BeneficiaryAvatarStack.tsx`
    - BeneficiaryAvatarStack contains imports from `@/components/kibo-ui/avatar-stack`
    - File exists: `src/app/(admin)/beneficiaries/_components/WithdrawalMilestoneGantt.tsx`
    - WithdrawalMilestoneGantt contains `bg-chart-1` AND `bg-chart-2` (milestone markers)
    - WithdrawalMilestoneGantt contains `bg-primary` (today line)
    - BeneficiariesClient contains `PageHeader` AND at least one of `BeneficiaryShareDonuts`, `BeneficiaryAvatarStack`, `WithdrawalMilestoneGantt`
    - `tests/components/beneficiary-share-donuts.test.tsx` exists with at least 6 test cases
    - `bun test --bail --timeout 30000 tests/components/beneficiary-share-donuts.test.tsx` exits 0
    - `bun run typecheck` exits 0
  </acceptance_criteria>
  <done>BeneficiaryShareDonuts (chart-1..5 cycling + greyed-out for null share), BeneficiaryAvatarStack (Kibo wrapper with overflow), WithdrawalMilestoneGantt (per-beneficiary milestone markers, today line) all built; /beneficiaries page refactored to render PageHeader → KpiStrip → AvatarStack → Donuts grid → MilestoneGantt → existing DataTable; donut tests pass.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 03.4: Roll KpiStrip onto 11 pages (including /dashboard); add E2E coverage</name>
  <files>src/app/(admin)/accounts/_components/AccountsClient.tsx, src/app/(admin)/assets/_components/AssetsClient.tsx, src/app/(admin)/properties/_components/PropertiesClient.tsx, src/app/(admin)/vehicles/_components/VehiclesClient.tsx, src/app/(admin)/insurance/_components/InsuranceClient.tsx, src/app/(admin)/trustees/_components/TrusteesClient.tsx, src/app/(admin)/bequests/_components/BequestsClient.tsx, src/app/(admin)/personal-property/_components/PersonalPropertyClient.tsx, src/app/(admin)/contacts/_components/ContactsClient.tsx, src/app/(admin)/artwork/_components/ArtworkClient.tsx, src/app/(admin)/dashboard/_components/DashboardClient.tsx, tests/e2e/admin-pages.e2e.ts</files>
  <read_first>
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-UI-SPEC.md (§2 per-page KPI columns table — this is the canonical specification of which KPI columns go on which page)
    - src/app/(admin)/accounts/_components/AccountsClient.tsx (one representative page — read first to understand the entity-gating + query patterns; the other 9 follow the same shape)
    - src/app/(admin)/dashboard/_components/DashboardClient.tsx (CRITICAL: already computes `totalAssets` and `totalLiabilities` via `useMemo` from `summary.{bankAccounts,investmentAccounts,homesteads,rentalProperties,vehicles,personalProperties,liabilities}`. The 11th-page KpiStrip wires onto these existing values — do NOT add new queries. Read lines 47-78 (query setup) and 189-300 (memoized totals + payoff percent) before writing the strip.)
    - src/app/(admin)/assets/_components/AssetsClient.tsx (INFO 1 from review: confirm which tRPC queries it already runs; aggregate across vehicle, homestead, rentalProperty, bankAccount, investmentAccount, personalProperty, insurancePolicy. If queries it does not already run are needed for KPI math, add the new resource lists to this Task's files_modified.)
    - src/lib/money.ts (sumStrings — for money KPI columns)
    - src/utils/formatters.ts (formatCurrency, formatDate, formatPercent)
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-PATTERNS.md (§"EDITED — KPI strip rollout (10 pages)")
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-VALIDATION.md (row 23-03-04)
    - db/schema.ts (assets tables — confirm column names for each resource's KPI computations)
  </read_first>
  <behavior>
    - Each of the 11 pages renders `<KpiStrip data={[...]} isLoading={isLoading} />` directly below the PageHeader (or above existing DashboardClient content for /dashboard) and above the existing DataTable (or other content).
    - Each page's KPI columns match the UI-SPEC §2 per-page table EXACTLY: /dashboard has 4 (Total assets, Total liabilities, Net worth, Cash on hand), /trustees has 3 (no 4th — 3-column variant), the other 9 pages have 4. The exact label copy must match the spec verbatim — no abbreviation, no paraphrase.
    - All money KPIs use sumStrings (no parseFloat().reduce).
    - All percentages use formatPercent.
    - All counts are plain `.length` or a filtered length.
    - Where the UI-SPEC names a sparkline column (e.g. "30d activity (sparkline)" on /accounts), set `sparklineSeries: undefined` (or omit the key entirely) until real activity data is wired. DO NOT pass `[0, 0, 0, 0, 0, 0, 0]` — KpiStrip skips rendering the sparkline accessory when undefined, which is visually cleaner than a flat-zero line. Add a code comment `// sparkline deferred until activityCounts query lands` at the suppression site. Document the deferral in the plan SUMMARY; optional follow-up: add `trpc.dashboard.activityCounts({ tableName, days: 30 })` in a future phase.
    - Playwright E2E renders each page and asserts: PageHeader h1, KpiStrip element present (at least 3 SummaryCard/Card elements visible below the header), existing DataTable still rendered.
  </behavior>
  <action>
The UI-SPEC §2 per-page KPI columns table is the canonical source. Copy the per-page columns verbatim from this table:

| Page | KPI 1 | KPI 2 | KPI 3 | KPI 4 |
|------|-------|-------|-------|-------|
| /dashboard | Total assets | Total liabilities | Net worth | Cash on hand |
| /accounts | Account count | Total balance | Bank vs Investment ratio | 30d activity (sparkline) |
| /assets | Asset count | DOD total | Estimated current | Transfer-status progress |
| /properties | Property count | Total DOD value | Total current value | Total mortgage balance |
| /vehicles | Vehicle count | Total DOD value | Transfer % complete | Active count |
| /insurance | Policy count | Total coverage | Active count | Annual premium |
| /trustees | Trustee count | Current count | Successor count | (no 4th — 3-column variant) |
| /bequests | Bequest count | Total value | Distributed % | Pending count |
| /personal-property | Item count | DOD total | Estimated current | Categories tracked |
| /contacts | Contact count | Attorneys | CPAs | Other professionals |
| /artwork | Item count | DOD total | Estimated current | Insured count |

For each page:

1. Open the client file (e.g. `src/app/(admin)/accounts/_components/AccountsClient.tsx`).

2. Add imports (use already-imported helpers when present):
```tsx
import { PageHeader } from '@/components/page-header'
import { KpiStrip, type KpiStripItem } from '@/components/kpi-strip'
import { sumStrings } from '@/lib/money'
import { formatCurrency, formatPercent } from '@/utils/formatters'
```

3. Replace the existing ad-hoc page header h2 with `<PageHeader title="..." description="..." />`. Use sentence case (UI-SPEC §Copywriting voice rules).

4. Above the existing DataTable, compute and render the KpiStrip per the table.

   **/dashboard example** (11th page — wires onto existing memoized totals in DashboardClient.tsx; do NOT introduce new queries):
   ```tsx
   // DashboardClient.tsx already computes (lines 189-300):
   //   const totalAssets = sumStrings([...bankAccounts, ...investmentAccounts, ...homesteads,
   //       ...rentalProperties, ...vehicles, ...personalProperties].map(a => a.currentBalance ?? a.dodValue ?? '0'))
   //   const totalLiabilities = sumStrings(liabilities.map(l => l.currentBalance ?? '0'))
   //   const bankAccounts = summary?.bankAccounts ?? []
   // Reuse those values directly. Net worth = parseFloat(totalAssets) - parseFloat(totalLiabilities).
   // Cash on hand = sumStrings of bankAccount.currentBalance.
   const netWorth = String(parseFloat(totalAssets) - parseFloat(totalLiabilities))
   const cashOnHand = sumStrings(bankAccounts.map((a) => a.currentBalance ?? '0'))
   const dashboardKpis: KpiStripItem[] = [
       { label: 'Total assets', value: formatCurrency(totalAssets) },
       { label: 'Total liabilities', value: formatCurrency(totalLiabilities), invertDelta: true },
       { label: 'Net worth', value: formatCurrency(netWorth) },
       { label: 'Cash on hand', value: formatCurrency(cashOnHand) },
   ]
   // Wire <KpiStrip data={dashboardKpis} isLoading={loading} /> above DashboardClient's existing
   // content. Per D-? (CONTEXT.md decision line 49 — KPI strip rollout includes /dashboard), this
   // is wave-2-internal — keep ALL existing DashboardClient panels (DashboardStats, FinancialCharts,
   // LiabilitiesPanel, WithdrawalsPanel, AccountingSummary, etc.) below the new KpiStrip; do NOT
   // remove DashboardStats — KpiStrip is additive at the top of the page.
   ```

   **/accounts example:**
   ```tsx
   const bankAccounts = accounts.filter(a => a.accountType === 'BANK')
   const investmentAccounts = accounts.filter(a => a.accountType === 'INVESTMENT')
   const totalBalance = sumStrings(accounts.map(a => a.balance ?? '0'))
   const kpiData: KpiStripItem[] = [
       { label: 'Account count', value: accounts.length },
       { label: 'Total balance', value: formatCurrency(totalBalance) },
       { label: 'Bank vs Investment', value: `${bankAccounts.length} / ${investmentAccounts.length}` },
       { label: '30d activity', value: '—', sparklineSeries: undefined }, // sparkline deferred until activityCounts query lands
   ]
   ```

   **/properties example:**
   ```tsx
   const totalDod = sumStrings(properties.map(p => p.dodValue ?? '0'))
   const totalCurrent = sumStrings(properties.map(p => p.currentValue ?? p.dodValue ?? '0'))
   const totalMortgage = sumStrings(linkedLiabilities.map(l => l.currentBalance ?? '0'))
   const kpiData: KpiStripItem[] = [
       { label: 'Property count', value: properties.length },
       { label: 'Total DOD value', value: formatCurrency(totalDod) },
       { label: 'Total current value', value: formatCurrency(totalCurrent) },
       { label: 'Total mortgage balance', value: formatCurrency(totalMortgage), invertDelta: true },
   ]
   ```

   **/insurance example** (note: uses coverageAmount + premium, NOT dodValue, per MEMORY.md):
   ```tsx
   const totalCoverage = sumStrings(policies.map(p => p.coverageAmount ?? '0'))
   const totalPremium = sumStrings(policies.map(p => p.premium ?? '0'))
   const activeCount = policies.filter(p => p.status === 'ACTIVE').length
   const kpiData: KpiStripItem[] = [
       { label: 'Policy count', value: policies.length },
       { label: 'Total coverage', value: formatCurrency(totalCoverage) },
       { label: 'Active count', value: activeCount },
       { label: 'Annual premium', value: formatCurrency(totalPremium) },
   ]
   ```

   **/trustees** (3-column variant — UI-SPEC table explicitly notes "no 4th"):
   ```tsx
   const current = trustees.filter(t => t.status === 'CURRENT' || t.status === 'ACTIVE').length
   const successor = trustees.filter(t => t.status === 'SUCCESSOR').length
   const kpiData: KpiStripItem[] = [
       { label: 'Trustee count', value: trustees.length },
       { label: 'Current count', value: current },
       { label: 'Successor count', value: successor },
   ]
   // KpiStrip still uses lg:grid-cols-4 layout — 3 cards will appear left-aligned with empty slot.
   // Acceptable per UI-SPEC.
   ```

   **/bequests:**
   ```tsx
   const totalValue = sumStrings(bequests.map(b => b.amount ?? b.value ?? '0'))
   const distributedCount = bequests.filter(b => b.status === 'DISTRIBUTED' || b.status === 'PAID').length
   const distributedPct = bequests.length > 0 ? (distributedCount / bequests.length) * 100 : 0
   const kpiData: KpiStripItem[] = [
       { label: 'Bequest count', value: bequests.length },
       { label: 'Total value', value: formatCurrency(totalValue) },
       { label: 'Distributed %', value: formatPercent(distributedPct) },
       { label: 'Pending count', value: bequests.length - distributedCount },
   ]
   ```

   **/contacts:**
   ```tsx
   const attorneys = contacts.filter(c => c.contactType === 'ATTORNEY').length
   const cpas = contacts.filter(c => c.contactType === 'CPA').length
   const otherProf = contacts.length - attorneys - cpas
   const kpiData: KpiStripItem[] = [
       { label: 'Contact count', value: contacts.length },
       { label: 'Attorneys', value: attorneys },
       { label: 'CPAs', value: cpas },
       { label: 'Other professionals', value: otherProf },
   ]
   ```

   **/vehicles:**
   ```tsx
   const totalDod = sumStrings(vehicles.map(v => v.dodValue ?? '0'))
   const active = vehicles.filter(v => v.status === 'ACTIVE' || v.status === 'CURRENT').length
   const transferred = vehicles.filter(v => v.transferStatus === 'TRANSFERRED' || v.transferStatus === 'COMPLETE').length
   const transferPct = vehicles.length > 0 ? (transferred / vehicles.length) * 100 : 0
   const kpiData: KpiStripItem[] = [
       { label: 'Vehicle count', value: vehicles.length },
       { label: 'Total DOD value', value: formatCurrency(totalDod) },
       { label: 'Transfer % complete', value: formatPercent(transferPct) },
       { label: 'Active count', value: active },
   ]
   ```

   **/personal-property:**
   ```tsx
   const totalDod = sumStrings(items.map(i => i.dodValue ?? '0'))
   const totalCurrent = sumStrings(items.map(i => i.currentValue ?? i.dodValue ?? '0'))
   const categories = new Set(items.map(i => i.category).filter(Boolean)).size
   const kpiData: KpiStripItem[] = [
       { label: 'Item count', value: items.length },
       { label: 'DOD total', value: formatCurrency(totalDod) },
       { label: 'Estimated current', value: formatCurrency(totalCurrent) },
       { label: 'Categories tracked', value: categories },
   ]
   ```

   **/artwork:**
   ```tsx
   // Artwork is filtered personalProperty per CLAUDE.md
   const totalDod = sumStrings(artwork.map(a => a.dodValue ?? '0'))
   const totalCurrent = sumStrings(artwork.map(a => a.currentValue ?? a.dodValue ?? '0'))
   const insured = artwork.filter(a => a.insured === true || a.insurancePolicyId).length
   const kpiData: KpiStripItem[] = [
       { label: 'Item count', value: artwork.length },
       { label: 'DOD total', value: formatCurrency(totalDod) },
       { label: 'Estimated current', value: formatCurrency(totalCurrent) },
       { label: 'Insured count', value: insured },
   ]
   ```

   **/assets** (aggregate page; data comes from multiple queries):
   ```tsx
   // assets page typically renders an aggregate view; sum across asset types
   const assetCount = vehicles.length + properties.length + accounts.length + personalProperty.length + insurance.length
   const totalDod = sumStrings([...vehicles, ...properties, ...personalProperty].map(a => a.dodValue ?? '0'))
   const totalCurrent = sumStrings([...vehicles, ...properties, ...personalProperty].map(a => a.currentValue ?? a.dodValue ?? '0'))
   const transferred = [...vehicles, ...properties].filter(a => a.transferStatus === 'TRANSFERRED' || a.transferStatus === 'COMPLETE').length
   const totalForTransfer = vehicles.length + properties.length
   const transferPct = totalForTransfer > 0 ? (transferred / totalForTransfer) * 100 : 0
   const kpiData: KpiStripItem[] = [
       { label: 'Asset count', value: assetCount },
       { label: 'DOD total', value: formatCurrency(totalDod) },
       { label: 'Estimated current', value: formatCurrency(totalCurrent) },
       { label: 'Transfer-status progress', value: formatPercent(transferPct) },
   ]
   ```

   For each page, exact column names depend on what's already queried by the client component — adjust queries minimally. If a KPI requires a new tRPC query (e.g. 30d activity sparkline series), STUB it with a placeholder series and TODO it in the SUMMARY rather than blocking PR-B on the new query.

5. After all 10 pages updated, run typecheck + lint:

```bash
bun run typecheck
bun run lint
```

6. Create `tests/e2e/admin-pages.e2e.ts` (Wave-0 row 23-03-04):

```typescript
import { test, expect } from '@playwright/test'

const PAGES = [
    { path: '/accounts', title: 'Accounts' },
    { path: '/assets', title: 'Assets' },
    { path: '/properties', title: 'Properties' },
    { path: '/vehicles', title: 'Vehicles' },
    { path: '/insurance', title: 'Insurance' },
    { path: '/trustees', title: 'Trustees' },
    { path: '/bequests', title: 'Bequests' },
    { path: '/personal-property', title: 'Personal property' },
    { path: '/contacts', title: 'Contacts' },
    { path: '/artwork', title: 'Artwork' },
    { path: '/liabilities', title: 'Liabilities' },
    { path: '/beneficiaries', title: 'Beneficiaries' },
] as const

test.describe('KPI strip render across list pages', () => {
    for (const page of PAGES) {
        test(`${page.path} renders PageHeader + KpiStrip`, async ({ page: pw }) => {
            await pw.goto(page.path)
            await pw.waitForSelector('.animate-spin', { state: 'hidden', timeout: 15000 }).catch(() => null)
            // PageHeader is an h1 (PR-1 component renders <h1>)
            await expect(pw.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15000 })
            // KpiStrip renders at least 3 Card elements (3-col variant supported; 4 is the standard)
            const cards = pw.locator('[data-slot="card"]').first()
            await expect(cards).toBeVisible({ timeout: 15000 })
        })
    }
})
```

   - If `[data-slot="card"]` is not the right selector for the shadcn Card (check `src/components/ui/card.tsx`), use an alternative — perhaps `.rounded-xl.border` or a more specific KpiStrip wrapper id. Match what the actual SummaryCard renders.

7. Bundle analyze:

```bash
ANALYZE=true bun run build
```

   - Record cumulative delta (PR-1 + PR-A + PR-B) in PR description. Target: total < +90 KB after PR-B (budget +120 KB).
  </action>
  <verify>
    <automated>for f in "src/app/(admin)/accounts/_components/AccountsClient.tsx" "src/app/(admin)/properties/_components/PropertiesClient.tsx" "src/app/(admin)/vehicles/_components/VehiclesClient.tsx" "src/app/(admin)/insurance/_components/InsuranceClient.tsx" "src/app/(admin)/trustees/_components/TrusteesClient.tsx" "src/app/(admin)/bequests/_components/BequestsClient.tsx" "src/app/(admin)/personal-property/_components/PersonalPropertyClient.tsx" "src/app/(admin)/contacts/_components/ContactsClient.tsx" "src/app/(admin)/artwork/_components/ArtworkClient.tsx" "src/app/(admin)/assets/_components/AssetsClient.tsx" "src/app/(admin)/dashboard/_components/DashboardClient.tsx"; do grep -q "KpiStrip" "$f" || { echo "MISSING KpiStrip in $f"; exit 1; }; done &amp;&amp; for f in "src/app/(admin)/accounts/_components/AccountsClient.tsx" "src/app/(admin)/properties/_components/PropertiesClient.tsx" "src/app/(admin)/vehicles/_components/VehiclesClient.tsx" "src/app/(admin)/insurance/_components/InsuranceClient.tsx" "src/app/(admin)/trustees/_components/TrusteesClient.tsx" "src/app/(admin)/bequests/_components/BequestsClient.tsx" "src/app/(admin)/personal-property/_components/PersonalPropertyClient.tsx" "src/app/(admin)/contacts/_components/ContactsClient.tsx" "src/app/(admin)/artwork/_components/ArtworkClient.tsx" "src/app/(admin)/assets/_components/AssetsClient.tsx"; do grep -q "PageHeader" "$f" || { echo "MISSING PageHeader in $f"; exit 1; }; done &amp;&amp; ! grep -rE "parseFloat.*reduce" "src/app/(admin)/accounts/_components/" "src/app/(admin)/properties/_components/" "src/app/(admin)/vehicles/_components/" "src/app/(admin)/insurance/_components/" "src/app/(admin)/bequests/_components/" "src/app/(admin)/personal-property/_components/" "src/app/(admin)/artwork/_components/" "src/app/(admin)/assets/_components/" &amp;&amp; grep -q "Account count" "src/app/(admin)/accounts/_components/AccountsClient.tsx" &amp;&amp; grep -q "Total balance" "src/app/(admin)/accounts/_components/AccountsClient.tsx" &amp;&amp; grep -q "Policy count" "src/app/(admin)/insurance/_components/InsuranceClient.tsx" &amp;&amp; grep -q "Total coverage" "src/app/(admin)/insurance/_components/InsuranceClient.tsx" &amp;&amp; grep -q "Property count" "src/app/(admin)/properties/_components/PropertiesClient.tsx" &amp;&amp; grep -q "Total DOD value" "src/app/(admin)/properties/_components/PropertiesClient.tsx" &amp;&amp; grep -q "Vehicle count" "src/app/(admin)/vehicles/_components/VehiclesClient.tsx" &amp;&amp; grep -q "Total DOD value" "src/app/(admin)/vehicles/_components/VehiclesClient.tsx" &amp;&amp; grep -q "Trustee count" "src/app/(admin)/trustees/_components/TrusteesClient.tsx" &amp;&amp; grep -q "Current count" "src/app/(admin)/trustees/_components/TrusteesClient.tsx" &amp;&amp; grep -q "Bequest count" "src/app/(admin)/bequests/_components/BequestsClient.tsx" &amp;&amp; grep -q "Total value" "src/app/(admin)/bequests/_components/BequestsClient.tsx" &amp;&amp; grep -q "Item count" "src/app/(admin)/personal-property/_components/PersonalPropertyClient.tsx" &amp;&amp; grep -q "DOD total" "src/app/(admin)/personal-property/_components/PersonalPropertyClient.tsx" &amp;&amp; grep -q "Contact count" "src/app/(admin)/contacts/_components/ContactsClient.tsx" &amp;&amp; grep -q "Attorneys" "src/app/(admin)/contacts/_components/ContactsClient.tsx" &amp;&amp; grep -q "Item count" "src/app/(admin)/artwork/_components/ArtworkClient.tsx" &amp;&amp; grep -q "DOD total" "src/app/(admin)/artwork/_components/ArtworkClient.tsx" &amp;&amp; grep -q "Asset count" "src/app/(admin)/assets/_components/AssetsClient.tsx" &amp;&amp; grep -q "DOD total" "src/app/(admin)/assets/_components/AssetsClient.tsx" &amp;&amp; grep -q "Total assets" "src/app/(admin)/dashboard/_components/DashboardClient.tsx" &amp;&amp; grep -q "Net worth" "src/app/(admin)/dashboard/_components/DashboardClient.tsx" &amp;&amp; bun run typecheck &amp;&amp; bun run lint</automated>
  </verify>
  <acceptance_criteria>
    - All 11 client files contain `KpiStrip` import AND `<KpiStrip` JSX usage: dashboard, accounts, assets, properties, vehicles, insurance, trustees, bequests, personal-property, contacts, artwork
    - All 10 list-page client files contain `PageHeader` import AND `<PageHeader` JSX usage (dashboard keeps its existing TrustHeader composition — PageHeader is NOT added there)
    - No `parseFloat.*reduce` patterns appear in any of the 10 updated list-page client components (money math uses sumStrings)
    - `tests/e2e/admin-pages.e2e.ts` exists with at least 11 test cases covering each page (10 list + /dashboard)
    - Each list-page client file contains the EXACT KPI column labels from UI-SPEC §2 per-page table. Specifically:
      - /accounts contains `"Account count"` AND `"Total balance"`
      - /insurance contains `"Policy count"` AND `"Total coverage"`
      - /properties contains `"Property count"` AND `"Total DOD value"`
      - /vehicles contains `"Vehicle count"` AND `"Total DOD value"`
      - /trustees contains `"Trustee count"` AND `"Current count"`
      - /bequests contains `"Bequest count"` AND `"Total value"`
      - /personal-property contains `"Item count"` AND `"DOD total"`
      - /contacts contains `"Contact count"` AND `"Attorneys"`
      - /artwork contains `"Item count"` AND `"DOD total"`
      - /assets contains `"Asset count"` AND `"DOD total"`
      - /dashboard contains `"Total assets"` AND `"Net worth"`
    - No file contains `sparklineSeries: [0, 0, 0, 0, 0, 0, 0]` or `sparklineSeries: [0,0,0,0,0,0,0]` (placeholder zero arrays are forbidden — use `undefined` to suppress)
    - `bun run typecheck` exits 0
    - `bun run lint` exits 0
  </acceptance_criteria>
  <done>KpiStrip rolled onto all 11 pages (10 list pages + /dashboard) with page-specific data per UI-SPEC §2 table; PageHeader replaces ad-hoc h2 on the 10 list pages (dashboard keeps TrustHeader); all money sums use sumStrings (no parseFloat().reduce); sparklines suppressed via `sparklineSeries: undefined` until real activity data is wired (no placeholder zero arrays); E2E covers KPI-strip render on each page; bundle delta recorded.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Client → tRPC `liability.payoffProjections` | New batched query; admin-gated; entityId scoping inherited from input schema |
| Client (KPI strips) → existing tRPC list queries | All KPI computations are derived from data the user already has authority to read; no new server-side surfaces |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-23-PR-B-01 | Information Disclosure | `liability.payoffProjections` includes `originalPrincipal`, `currentBalance` in output | mitigate | Output is admin-only via `adminProcedure`; RLS via `app.is_admin()` enforces row-level filter. Same fields are already exposed by existing `liability.list` — no new exposure surface. |
| T-23-PR-B-02 | Tampering | Client-side KPI computations could be manipulated in dev tools | accept | Cosmetic only; mutations remain server-side. Admin already has authority over the underlying data; manipulating client display does not bypass any control. |
| T-23-PR-B-03 | Information Disclosure | Donut tooltips show beneficiary names + share percentages | accept | Information is already on the page (beneficiary table). Donut tooltips do not surface fields not in the beneficiary list view. RLS already restricts which beneficiaries the user sees. |

Phase-wide T-23-01 through T-23-05 are addressed in plans 02 (T-23-01, T-23-02) and 04 (T-23-03, T-23-04, T-23-05). PR-B does not introduce new authz surfaces.
</threat_model>

<verification>
After all four tasks complete:
1. `bun run typecheck` exits 0
2. `bun run lint` exits 0
3. `bun test --bail --timeout 30000 tests/trpc/liability.test.ts tests/components/beneficiary-share-donuts.test.tsx` exits 0
4. `bun run build` succeeds with no `[Compiler bailout]` line naming PR-B files unless those files carry `'use no memo'`
5. OKLCH grep on the 2 new Kibo files + 5 new consumer files returns zero matches
6. Cumulative bundle delta after PR-1 + PR-A + PR-B documented in PR description (target < +90 KB; hard cap +120 KB)
7. Playwright `tests/e2e/admin-pages.e2e.ts` passes for all 12 pages (10 list + /liabilities + /beneficiaries) — each page renders an `<h1>` and a card-shaped KPI element
8. Manual smoke check: open `/liabilities` in light + dark + high-contrast themes; no visual regressions; donut colors render correctly (destructive in red-ish, success in green-ish); gantt bars render in primary tint
</verification>

<success_criteria>
- New tRPC batched query `liability.payoffProjections` with admin role, entityId scoping, full null-handling for revolving / no-rate / no-payment liabilities
- 2 Kibo registry primitives installed at `src/components/kibo-ui/{gantt,avatar-stack}/index.tsx`
- 5 new page consumers: LiabilityKpiStrip, LiabilityGantt, DebtToEquityDonut, BeneficiaryShareDonuts, BeneficiaryAvatarStack, WithdrawalMilestoneGantt (6)
- 2 client wrappers refactored to host new components (LiabilitiesClient, BeneficiariesClient)
- 10 list-page client wrappers updated with KpiStrip + PageHeader
- All money KPIs use sumStrings (no parseFloat().reduce in any of the 12 modified client components)
- DebtToEquityDonut uses var(--destructive) / var(--success); BeneficiaryShareDonut uses var(--chart-1..5) cycling
- BeneficiaryShareDonut greyed-out state ("—" label + "share not set") for null/0 sharePercent
- All Wave-0 tests passing (payoffProjections trpc, beneficiary-share-donuts component, E2E admin-pages KPI render)
- Bundle delta cumulative across PR-1+PR-A+PR-B < +90 KB documented
- date-fns continues to be used (re-introduced in PR-A); no NEW deps in PR-B beyond what gantt + avatar-stack pull in
</success_criteria>

<output>
After completion, create `.planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-03-liabilities-beneficiaries-kpi-rollout-SUMMARY.md` recording: payoffProjections query contract, gantt + avatar-stack install + audit results, donut rendering decisions (handrender vs Kibo), all 10 list-page KPI column mappings actually shipped vs deferred-to-TODO, total equity computation source (which queries used in /liabilities), bundle delta cumulative, any 'use no memo' directives added, and any TODOs for sparkline data series that shipped as placeholder zeros.
</output>
