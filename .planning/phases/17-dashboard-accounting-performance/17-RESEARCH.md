# Phase 17: Dashboard & Accounting Performance - Research

**Researched:** 2026-03-09
**Domain:** SQL aggregation, server-side pagination, tRPC prefetching, React memoization
**Confidence:** HIGH

## Summary

This phase addresses five requirements that collectively eliminate performance bottlenecks and dead code in the dashboard, accounting, and portal pages. The core issues are well-defined and localized: the dashboard fetches every accounting entry row to sum them client-side (PERF-01), the accounting page downloads all ~500 rows for client-side pagination (PERF-02), the portal forces a client-side session-then-fetch waterfall (PERF-04), and DashboardClient has redundant queries and unused computed values (CLEAN-05, CLEAN-10).

All five changes operate within the existing stack (Drizzle ORM, tRPC v11, @tanstack/react-query v5, Next.js 16 App Router). No new libraries are needed. The architecture patterns are already partially in place -- the accounting page already has a `totals` procedure using `SQL SUM` and a `listPaginated` procedure, and the dashboard server component already uses `HydrationBoundary`. The work is primarily connecting existing server-side patterns to replace client-side computation.

**Primary recommendation:** Move computation to SQL (aggregation queries), move fetching to the server (prefetch with HydrationBoundary), and clean up the client components that currently do both.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PERF-01 | Dashboard summary uses SQL SUM aggregation instead of fetching unbounded accounting entries | New `dashboard.summaryTotals` procedure with SQL SUM/COUNT; remove `accountingEntries` from dashboard.summary response |
| PERF-02 | Accounting page uses server-side paginated query (listPaginated) instead of 500-row client-side filtering | Switch AccountingClient from `trustAccounting.list` to `trustAccounting.listPaginated` with server-side offset/limit; add entryType filter param |
| PERF-04 | Portal page eliminates client-side session waterfall -- server-prefetched beneficiary.me with HydrationBoundary | Convert portal/page.tsx to Server Component with createTRPCHelpers prefetch; move UI to PortalClient client component |
| CLEAN-05 | Delete unused hooks (use-entity-filter.ts) and unused computed values (_total* in DashboardClient) | Delete `src/hooks/use-entity-filter.ts`; remove `_totalBankAccounts`, `_totalInvestments`, `_totalRealEstate`, `_totalVehicles` from destructured return |
| CLEAN-10 | Memoize DashboardClient filter calls; remove redundant entity.byId and beneficiary.byId fetches | Replace `trpc.entity.byId.useQuery(entityId)` with data from prefetched `entity.list`; wrap filter callbacks in useMemo; remove any redundant beneficiary.byId calls |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Drizzle ORM | 0.45.1 | SQL query builder for aggregations and pagination | Already used for all DB access; `sum()`, `count()`, `sql` template available |
| @trpc/server | 11.10.0 | API layer for new/modified procedures | Existing router pattern; adminProcedure/beneficiaryProcedure |
| @tanstack/react-query | 5.90.21 | Server prefetch via createServerSideHelpers + HydrationBoundary | Already used on dashboard and accounting pages |
| @trpc/react-query | 11.10.0 | Client-side hooks + server-side helpers | createTRPCHelpers pattern already established |
| Next.js | 16.1.6 | App Router Server Components for prefetching | Server Component pattern already used in dashboard/page.tsx |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/react-table | 8.21.3 | DataTable with client-side pagination | Already used in AccountingTable; server pagination changes the data source, not the table |
| drizzle-orm `sql` | 0.45.1 | Raw SQL fragments for COALESCE/SUM | Used in existing `totals` procedure as reference |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Drizzle `sum()`/`count()` | Raw SQL via `getSql()` | Drizzle is cleaner, type-safe; raw SQL only for complex CTEs |
| @tanstack/react-table server pagination | Custom pagination component | DataTable already handles pagination UI; just change data source |

## Architecture Patterns

### Current Architecture (Problems)

```
Dashboard:
  Server: prefetch dashboard.summary (11 parallel queries, ALL rows)
  Client: receives ALL accountingEntries → sumStrings() in useMemo
  Client: separate entity.byId query (redundant with entity.list prefetch)
  Client: computes _totalBankAccounts etc. (never read)

Accounting:
  Server: prefetch trustAccounting.list (500 rows)
  Client: receives 500 rows → client-side filter/pagination via DataTable

Portal:
  Client: useSession() → waits → then beneficiary.me.useQuery()
  (Two sequential round trips: session then data)
```

### Target Architecture (Solutions)

```
Dashboard:
  Server: prefetch dashboard.summary (assets/beneficiaries/tasks only, NO accounting rows)
  Server: prefetch dashboard.summaryTotals (SQL SUM → 4 numbers)
  Client: receives pre-computed totals, no sumStrings() needed
  Client: entity from entity.list cache (no separate byId call)

Accounting:
  Server: prefetch trustAccounting.listPaginated (page 1, 50 rows)
  Server: prefetch trustAccounting.totals (existing, unchanged)
  Client: pagination controls trigger new listPaginated queries with offset/limit
  Client: entryType filter applied server-side

Portal:
  Server: createTRPCHelpers → prefetch beneficiary.me
  Server: session checked in Server Component (no client waterfall)
  Client: PortalClient receives hydrated data, renders immediately
```

### Pattern 1: SQL SUM Aggregation for Dashboard Totals
**What:** Replace client-side `sumStrings(accountingEntries.filter(...).map(e => e.amount))` with SQL `SUM(amount) WHERE entryType = ...`
**When to use:** Whenever summary totals are needed without individual row data
**Example:**
```typescript
// Source: Existing pattern in trustAccountingRouter.totals (trustAccounting.ts:152-170)
const rows = await db
    .select({
        entryType: trustAccounting.entryType,
        total: sql<string>`COALESCE(${sum(trustAccounting.amount)}, '0')`,
        count: count(),
    })
    .from(trustAccounting)
    .where(eq(trustAccounting.entityId, entityId))
    .groupBy(trustAccounting.entryType)
```

### Pattern 2: Server-Side Pagination with Total Count
**What:** Return page of data + total count in single response
**When to use:** Tables with potentially hundreds of rows
**Example:**
```typescript
// Source: Existing pattern in trustAccountingRouter.listPaginated (trustAccounting.ts:36-62)
const [data, countResult] = await Promise.all([
    db.select().from(trustAccounting)
        .where(whereClause)
        .orderBy(desc(trustAccounting.accountingDate))
        .limit(input.limit ?? 50)
        .offset(input.offset ?? 0),
    db.select({ totalCount: count() }).from(trustAccounting)
        .where(whereClause),
])
return { data, totalCount: countResult[0]?.totalCount ?? 0 }
```

### Pattern 3: Server Prefetch with HydrationBoundary
**What:** Fetch data in Server Component, hydrate into React Query cache
**When to use:** Any page that currently fetches data client-side after mount
**Example:**
```typescript
// Source: Existing pattern in dashboard/page.tsx
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createTRPCHelpers } from '@/lib/trpc-server'

export default async function Page() {
    const helpers = await createTRPCHelpers()
    await helpers.beneficiary.me.prefetch()
    return (
        <HydrationBoundary state={dehydrate(helpers.queryClient)}>
            <ClientComponent />
        </HydrationBoundary>
    )
}
```

### Pattern 4: Entity Data from Prefetched List Cache
**What:** Use `trpc.entity.list.useQuery()` and index into result instead of separate `entity.byId` call
**When to use:** When entity list is already prefetched (dashboard page.tsx already does this)
**Example:**
```typescript
// Instead of:
const { data: entity } = trpc.entity.byId.useQuery(entityId)  // extra round trip

// Use:
const { data: entities } = trpc.entity.list.useQuery()
const entity = entities?.[0] ?? null  // entityId=1 is always first (ordered by asc(id))
```

### Anti-Patterns to Avoid
- **Fetching all rows for client-side aggregation:** The dashboard currently fetches every `trustAccounting` row just to sum amounts. This scales linearly with data volume and transfers unbounded payloads.
- **Sequential client-side fetches:** The portal waits for session, then fetches beneficiary data. Server Components can do both in parallel.
- **Prefetching data you already have:** `entity.list` is prefetched but DashboardClient still calls `entity.byId` separately for the same data.
- **Computing values that are never consumed:** `_totalBankAccounts`, `_totalInvestments`, `_totalRealEstate`, `_totalVehicles` are computed but never passed to any child component (prefixed with `_` to suppress unused variable warnings -- a smell).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accounting totals | Client-side sumStrings over all rows | SQL `SUM()` + `GROUP BY` | DB handles arbitrary row counts; no transfer cost |
| Pagination | Client downloads everything, slices in JS | SQL `LIMIT/OFFSET` with `COUNT(*)` | Already have `listPaginated` procedure |
| Server data hydration | Custom prop drilling from Server to Client | `createTRPCHelpers` + `HydrationBoundary` | Established pattern in project, handles cache key alignment |
| Tab-based filtering | Download all rows, filter in useMemo | Server-side `WHERE entryType = ?` filter | Reduces both query cost and transfer size |

**Key insight:** The project already has the server-side infrastructure for all of these (existing `totals` procedure, existing `listPaginated` procedure, existing `createTRPCHelpers` utility). The work is wiring the client components to use them instead of the naive approaches.

## Common Pitfalls

### Pitfall 1: Query Key Mismatch Between Server and Client
**What goes wrong:** Server prefetches `listPaginated({ entityId: 1, limit: 50, offset: 0 })` but client calls `listPaginated({ entityId: 1 })` (different defaults) -- cache miss, re-fetches on client.
**Why it happens:** tRPC query keys include the full input object. Mismatched defaults mean different cache keys.
**How to avoid:** Ensure client-side default params exactly match what the server prefetches. Extract shared defaults to a constant.
**Warning signs:** Network tab shows duplicate requests on page load despite HydrationBoundary.

### Pitfall 2: AccountingTable Still Expects Full Dataset for Tab Counts
**What goes wrong:** The tab badges show `entries.length`, `incomeEntries.length`, `expenseEntries.length`. With server pagination, `entries` is only one page.
**Why it happens:** UI assumes all data is available for counting.
**How to avoid:** Use the `totals` query (already exists and returns counts by entryType) or return counts from `listPaginated`. Tab badges should show total counts, not page counts.
**Warning signs:** Tab badges show "50" instead of "347" after switching to pagination.

### Pitfall 3: Portal prefetch fails silently for unauthenticated users
**What goes wrong:** `createTRPCHelpers` creates context from headers. If session is invalid, `beneficiary.me` prefetch throws. Unhandled error = 500 page.
**Why it happens:** Server Component prefetch runs before any auth redirect.
**How to avoid:** Check session in the Server Component first (like portal/layout.tsx does). Only prefetch if authenticated. The layout already handles auth redirect.
**Warning signs:** 500 errors on portal page for logged-out users.

### Pitfall 4: Breaking the AccountingSummary Tab in Dashboard
**What goes wrong:** The dashboard's "Accounting" tab (AccountingSummary component) renders individual entries with descriptions and dates. Removing `accountingEntries` from the summary response breaks this.
**Why it happens:** Dashboard AccountingSummary iterates over all accounting entries to show a transaction list.
**How to avoid:** Keep a limited number of recent entries in the dashboard summary (e.g., last 10) for the AccountingSummary tab, or change it to show only totals. The totals query provides summary numbers; recent entries need a separate small fetch.
**Warning signs:** Empty "Accounting" tab in the dashboard after removing accountingEntries.

### Pitfall 5: Pagination State Reset on Tab Change
**What goes wrong:** User is on page 3 of "All" tab, switches to "Income" tab -- pagination offset should reset to 0.
**Why it happens:** entryType filter changes but offset state doesn't reset.
**How to avoid:** Reset offset to 0 whenever the entryType filter changes.
**Warning signs:** Empty page shown when switching tabs if the filtered result has fewer pages.

## Code Examples

### 1. Dashboard Summary Totals Procedure (New)
```typescript
// Source: Based on existing trustAccountingRouter.totals pattern
summaryTotals: adminProcedure
    .input(z.object({ entityId: z.coerce.number() }))
    .query(async ({ input: { entityId } }) => {
        const rows = await db
            .select({
                entryType: trustAccounting.entryType,
                total: sql<string>`COALESCE(${sum(trustAccounting.amount)}, '0')`,
                entryCount: count(),
            })
            .from(trustAccounting)
            .where(eq(trustAccounting.entityId, entityId))
            .groupBy(trustAccounting.entryType)

        const income = rows.find(r => r.entryType === 'INCOME')
        const expense = rows.find(r => r.entryType === 'EXPENSE')
        return {
            incomeTotal: income?.total ?? '0.00',
            expenseTotal: expense?.total ?? '0.00',
            incomeCount: income?.entryCount ?? 0,
            expenseCount: expense?.entryCount ?? 0,
        }
    }),
```

### 2. Enhanced listPaginated with entryType Filter
```typescript
// Source: Extended from existing listPaginated (trustAccounting.ts:36-62)
listPaginated: adminProcedure
    .input(z.object({
        entityId: z.coerce.number(),
        limit: z.number().min(1).max(100).optional(),
        offset: z.number().min(0).optional(),
        entryType: z.enum(['INCOME', 'EXPENSE']).optional(),
    }))
    .query(async ({ input }) => {
        const conditions = [eq(trustAccounting.entityId, input.entityId)]
        if (input.entryType) {
            conditions.push(eq(trustAccounting.entryType, input.entryType))
        }
        const whereClause = and(...conditions)

        const [data, countResult] = await Promise.all([
            db.select().from(trustAccounting)
                .where(whereClause)
                .orderBy(desc(trustAccounting.accountingDate))
                .limit(input.limit ?? 50)
                .offset(input.offset ?? 0),
            db.select({ totalCount: count() }).from(trustAccounting)
                .where(whereClause),
        ])
        return { data, totalCount: countResult[0]?.totalCount ?? 0 }
    }),
```

### 3. Portal Server Component with Prefetch
```typescript
// Source: Based on existing dashboard/page.tsx pattern + portal/layout.tsx auth check
import { redirect } from 'next/navigation'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { authServer } from '@/lib/auth'
import { createTRPCHelpers } from '@/lib/trpc-server'
import { PortalClient } from './_components/PortalClient'

export default async function PortalPage() {
    const { data: session } = await authServer.getSession()
    if (!session?.user) redirect('/auth/sign-in')

    const helpers = await createTRPCHelpers()
    await helpers.beneficiary.me.prefetch()
    return (
        <HydrationBoundary state={dehydrate(helpers.queryClient)}>
            <PortalClient />
        </HydrationBoundary>
    )
}
```

### 4. DashboardClient Entity from List Cache
```typescript
// Replace:
const { data: entity = null } = trpc.entity.byId.useQuery(entityId)

// With:
const { data: entities } = trpc.entity.list.useQuery()
const entity = entities?.[0] ?? null
```

### 5. Removing Unused _total* Variables
```typescript
// Before (DashboardClient.tsx line 243-246):
return {
    _totalBankAccounts: bankTotal,   // never consumed by children
    _totalInvestments: investTotal,  // never consumed by children
    _totalRealEstate: realEstateTotal, // never consumed by children
    _totalVehicles: vehicleTotal,    // never consumed by children
    totalLiabilities: liabilityTotal,  // used by LiabilitiesPanel
    totalAssets: assetTotal,           // used by FinancialCharts
    assetAllocationData: allocationData, // used by FinancialCharts
}

// After:
return {
    totalLiabilities: liabilityTotal,
    totalAssets: assetTotal,
    assetAllocationData: allocationData,
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side aggregation | SQL aggregation | Always been better; project has `totals` since v3 | Constant-time totals regardless of row count |
| Client-side pagination (download all) | Server-side LIMIT/OFFSET | `listPaginated` exists since v3 | ~10x less data transferred for large tables |
| Client-side session waterfall | Server Component prefetch | Next.js 13+ App Router / tRPC v11 helpers | Eliminates visible loading spinners |

**Deprecated/outdated:**
- `trustAccounting.list` with 500-row limit: Should be replaced by `listPaginated` for the accounting page. Keep `list` available for other use cases (report generation) but accounting page should not use it.

## Open Questions

1. **Dashboard AccountingSummary tab: show recent entries or just totals?**
   - What we know: Currently renders all entries individually. Removing `accountingEntries` from summary breaks this.
   - What's unclear: Whether the admin wants to see individual entries on the dashboard or just summary numbers.
   - Recommendation: Keep a small set (last 10 entries) in the dashboard summary for the AccountingSummary tab, fetched alongside other summary data. This is a UI decision the planner should make.

2. **Accounting page: keep client-side filter tabs or move entirely to server?**
   - What we know: Currently three tabs (All/Income/Expense) with client-side filtering. Server-side entryType filter would reduce payload.
   - What's unclear: Whether switching tabs should re-fetch from server (slower UX) or if pre-fetching all three filter views is better.
   - Recommendation: Server-side filter with the `entryType` parameter. Tab changes trigger a new query with offset=0. React Query caches previous tab results so switching back is instant.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Bun test + @testing-library/react |
| Config file | package.json `test` script |
| Quick run command | `bun test tests/components/dashboard tests/components/accounting` |
| Full suite command | `bun test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PERF-01 | Dashboard totals come from SQL SUM, not client-side sum | unit (tRPC router) | `bun test tests/trpc/dashboard-totals.test.ts -x` | No -- Wave 0 |
| PERF-02 | Accounting uses server-side pagination with entryType filter | unit (tRPC router) | `bun test tests/trpc/accounting-pagination.test.ts -x` | No -- Wave 0 |
| PERF-04 | Portal beneficiary.me is server-prefetched | manual (verify no waterfall in Network tab) | N/A | manual-only |
| CLEAN-05 | use-entity-filter.ts deleted; _total* vars removed | unit (build check) | `bun run typecheck` | Existing |
| CLEAN-10 | entity.byId replaced with entity.list; filters memoized | unit (component) | `bun test tests/components/dashboard -x` | Existing (partial) |

### Sampling Rate
- **Per task commit:** `bun run typecheck && bun test tests/components/dashboard tests/components/accounting`
- **Per wave merge:** `bun test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/trpc/dashboard-totals.test.ts` -- covers PERF-01 (SQL aggregation returns correct totals)
- [ ] `tests/trpc/accounting-pagination.test.ts` -- covers PERF-02 (pagination + entryType filter)
- [ ] Framework install: none needed -- Bun test and @testing-library/react already configured

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/server/trpc/routers/dashboard.ts` -- current dashboard.summary fetches all accounting rows (line 42-47)
- Codebase analysis: `src/server/trpc/routers/trustAccounting.ts` -- existing `totals` (line 152-170) and `listPaginated` (line 36-62) procedures
- Codebase analysis: `src/app/(admin)/dashboard/_components/DashboardClient.tsx` -- client-side sumStrings on line 176-192, unused _total vars on line 243-246, redundant entity.byId on line 83
- Codebase analysis: `src/app/portal/page.tsx` -- session waterfall: useSession() → then beneficiary.me.useQuery (line 50-81)
- Codebase analysis: `src/hooks/use-entity-filter.ts` -- 6-line unused hook (CLEAN-05)
- Codebase analysis: `src/app/(admin)/dashboard/page.tsx` -- existing HydrationBoundary + prefetch pattern (reference for portal fix)
- Codebase analysis: `src/lib/trpc-server.ts` -- createTRPCHelpers factory (line 24-31)

### Secondary (MEDIUM confidence)
- Drizzle ORM `sum()` and `count()` already imported and used in trustAccounting.ts -- verified working pattern
- @tanstack/react-query `dehydrate` + `HydrationBoundary` -- working in dashboard/page.tsx and accounting/page.tsx

### Tertiary (LOW confidence)
- None -- all findings verified against codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in use, no new dependencies
- Architecture: HIGH -- patterns already proven in adjacent pages (dashboard prefetch, accounting totals)
- Pitfalls: HIGH -- identified from actual code analysis of current behavior
- Code examples: HIGH -- based on or adapted from existing working code in the project

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable -- internal refactoring, no external dependency changes)
