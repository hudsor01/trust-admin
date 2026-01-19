# Phase 38: cacheLife Profiles for Data Fetching - Research

**Researched:** 2026-01-18 (Updated with comprehensive approach analysis)
**Domain:** Next.js 16 caching with "use cache" directive and cacheLife profiles
**Confidence:** HIGH

<research_summary>
## Summary

Researched Next.js 16 cacheLife profiles and caching architecture for the trust-admin application. After comprehensive analysis of official documentation, three viable approaches were identified.

**Key finding:** `"use cache"` is **STABLE in Next.js 16** (renamed from `experimental.dynamicIO` to `cacheComponents`). This is the recommended approach over `unstable_cache`.

**Three viable approaches for trust-admin:**

| Approach | Best For | Complexity | Performance |
|----------|----------|------------|-------------|
| **A: Server-side `"use cache"` layer** | Heavy read queries, SSR pages | Medium | Best for initial load |
| **B: tRPC + TanStack Query tuning** | Interactive pages, mutations | Low | Best for SPA feel |
| **C: Hybrid (Recommended)** | Mix of both patterns | Medium | Optimal balance |

**Recommended: Option C (Hybrid)**
- Keep tRPC for mutations and interactive data (already works well)
- Add `"use cache"` for expensive server-side aggregations (dashboard stats)
- Tune TanStack Query `staleTime` for better client-side caching
- This approach minimizes changes while gaining significant performance benefits

**Financial application tiers:**
- **Tier 1 (seconds):** Balances, liabilities - fresh is critical
- **Tier 2 (minutes):** HEMS requests, distributions - recent matters
- **Tier 3 (hours):** Beneficiaries, trustees - rarely changes
- **Tier 4 (days):** Entity config - essentially static

</research_summary>

<approach_comparison>
## Detailed Approach Comparison

### Approach A: Server-Side `"use cache"` Layer

**How it works:**
Create a `src/data/cached-queries.ts` with cached functions that wrap Drizzle queries. tRPC routers call these cached functions.

```typescript
// src/data/cached-queries.ts
import { cacheLife } from 'next/cache'

export async function getCachedBeneficiaries(entityId?: number) {
  'use cache'
  cacheLife('hours')
  return db.query.beneficiary.findMany({...})
}

// src/server/trpc/routers/beneficiary.ts
export const beneficiaryRouter = createTRPCRouter({
  list: protectedProcedure.query(async () => {
    return getCachedBeneficiaries()  // Use cached version
  }),
})
```

**Pros:**
- Server-side caching reduces database load
- Automatic cache key generation by Next.js compiler
- Built-in revalidation with cacheLife profiles
- Zero client-side bundle size impact

**Cons:**
- Adds a new layer between tRPC and database
- tRPC's TanStack Query still runs client-side (double caching)
- Requires careful coordination for cache invalidation (Phase 39)
- More files to maintain

**Best for:** Heavy aggregation queries, SSR-optimized pages, reducing database costs

---

### Approach B: tRPC + TanStack Query Tuning

**How it works:**
Configure TanStack Query's `staleTime` and `gcTime` at the query client level or per-query. No server-side cache layer needed.

```typescript
// src/lib/trpc-provider.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,  // 5 minutes
      gcTime: 1000 * 60 * 30,    // 30 minutes
    },
  },
})

// Per-query tuning in components
const { data } = trpc.beneficiary.list.useQuery(undefined, {
  staleTime: 1000 * 60 * 15,  // 15 minutes for reference data
})
```

**Pros:**
- Minimal code changes (just configuration)
- Works with existing tRPC architecture
- Client-side caching provides instant UI
- TanStack Query handles refetch triggers automatically

**Cons:**
- Every user fetches from database on first visit
- No shared cache across users/requests
- Server still processes every initial request
- Doesn't reduce database load

**Best for:** Interactive SPAs, real-time data, when server load isn't a concern

---

### Approach C: Hybrid (Recommended)

**How it works:**
Use `"use cache"` selectively for expensive aggregations and static reference data. Keep tRPC + TanStack Query for interactive/mutation-heavy data.

```typescript
// Server-side cached (expensive aggregations)
// src/data/cached-queries.ts
export async function getCachedDashboardStats(entityId: number) {
  'use cache'
  cacheLife('minutes')
  // Expensive aggregation cached server-side
  const [assets, liabilities, income] = await Promise.all([
    sumAssets(entityId),
    sumLiabilities(entityId),
    sumIncome(entityId),
  ])
  return { assets, liabilities, income }
}

// Client-side tuned (interactive data)
// src/lib/trpc-provider.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,  // 30 seconds default
    },
  },
})

// Reference data with longer staleTime
const { data: beneficiaries } = trpc.beneficiary.list.useQuery(undefined, {
  staleTime: 1000 * 60 * 10,  // 10 minutes - rarely changes
})
```

**Pros:**
- Best of both worlds
- Expensive queries cached server-side (reduces DB load)
- Interactive data stays in TanStack Query (instant mutations)
- Minimal architecture changes
- Easy to add more cached queries incrementally

**Cons:**
- Two caching layers to understand
- Need to decide which queries go where

**Best for:** Trust-admin's mix of dashboard views and interactive forms

</approach_comparison>

<recommended_implementation>
## Recommended Implementation for Trust-Admin

Based on the codebase analysis (tRPC + TanStack Query, dashboard with aggregations, interactive forms):

### Phase 38 Scope (Minimal, High-Impact)

**1. Enable Cache Components**
```typescript
// next.config.ts
const nextConfig: NextConfig = {
  cacheComponents: true,
  cacheLife: {
    // Custom profiles
    financial: { stale: 30, revalidate: 60, expire: 300 },
    reference: { stale: 300, revalidate: 600, expire: 3600 },
    config: { stale: 600, revalidate: 3600, expire: 86400 },
  },
}
```

**2. Tune TanStack Query Defaults**
```typescript
// src/lib/trpc-provider.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,       // 30 seconds default
      gcTime: 1000 * 60 * 10,     // 10 minutes
      refetchOnWindowFocus: false, // Reduce refetches
    },
  },
})
```

**3. Add Query-Specific staleTime (Optional)**
```typescript
// In components, override for specific data types
const { data: entity } = trpc.entity.list.useQuery(undefined, {
  staleTime: 1000 * 60 * 60,  // 1 hour - entity config rarely changes
})

const { data: liabilities } = trpc.liability.list.useQuery(undefined, {
  staleTime: 1000 * 30,  // 30 seconds - balance data needs freshness
})
```

**4. (Optional) Add Server-Side Cache for Dashboard**
If dashboard performance is critical:
```typescript
// src/data/cached-queries.ts
export async function getCachedDashboardAggregations(entityId: number) {
  'use cache'
  cacheLife('financial')
  // Heavy aggregation logic
}
```

### What NOT to Do

- ❌ Don't wrap ALL tRPC queries in `"use cache"` - overkill
- ❌ Don't cache user-specific auth data
- ❌ Don't cache pending HEMS requests (need real-time review)
- ❌ Don't forget Phase 39 will add invalidation

</recommended_implementation>

<standard_stack>
## Standard Stack

### Already Available (No Installation Needed)
| Feature | Source | Purpose | Status |
|---------|--------|---------|--------|
| `"use cache"` directive | Next.js 16 | Mark functions as cacheable | ✅ **STABLE** |
| `cacheLife()` | `next/cache` | Set cache duration profiles | ✅ Built-in |
| `cacheTag()` | `next/cache` | Tag for selective invalidation | ✅ Built-in (Phase 39) |
| TanStack Query | tRPC v11 | Client-side caching | ✅ In use |

### Configuration Required
`next.config.ts` needs `cacheComponents: true`:

```typescript
const nextConfig: NextConfig = {
  cacheComponents: true,  // Enables "use cache" directive (STABLE in Next.js 16)
  cacheLife: {
    // Custom profiles for trust administration
    financial: {
      stale: 30,        // 30 seconds
      revalidate: 60,   // 1 minute
      expire: 300,      // 5 minutes
    },
    reference: {
      stale: 300,       // 5 minutes
      revalidate: 600,  // 10 minutes
      expire: 3600,     // 1 hour
    },
    config: {
      stale: 600,       // 10 minutes
      revalidate: 3600, // 1 hour
      expire: 86400,    // 1 day
    },
  },
}
```

### Built-in Profiles (Next.js 16)
| Profile | Stale | Revalidate | Expire | Use Case |
|---------|-------|------------|--------|----------|
| `seconds` | 30s | 1s | 1min | Real-time data, balances |
| `minutes` | 5min | 1min | 1hr | Lists, reference data |
| `hours` | 5min | 1hr | 1day | Stable data, settings |
| `days` | 5min | 1day | 1week | Very stable data |
| `weeks` | 5min | 1week | 30days | Archival data |
| `max` | 5min | 30days | never | Static reference data |
| `default` | 5min | 15min | never | General purpose |

</standard_stack>

<tanstack_query_tuning>
## TanStack Query Tuning Guide

### Key Configuration Options

| Option | Default | Recommended | Purpose |
|--------|---------|-------------|---------|
| `staleTime` | 0 | 30s-5min | How long data is "fresh" |
| `gcTime` | 5min | 10-30min | How long to keep unused cache |
| `refetchOnWindowFocus` | true | false | Reduce refetches |
| `refetchOnMount` | true | true | Keep for fresh data on navigate |
| `refetchOnReconnect` | true | true | Keep for reliability |

### Per-Data-Type Configuration

```typescript
// src/hooks/use-query-config.ts
export const queryConfigs = {
  // Financial data - short stale time
  financial: {
    staleTime: 1000 * 30,     // 30 seconds
    gcTime: 1000 * 60 * 5,    // 5 minutes
  },
  // Reference data - longer stale time
  reference: {
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30,    // 30 minutes
  },
  // Configuration - very long stale time
  config: {
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
  },
}

// Usage in components
const { data } = trpc.beneficiary.list.useQuery(undefined, queryConfigs.reference)
```

### SSR Prefetching (Optional Enhancement)

For pages that need instant data on first load:

```typescript
// src/app/(admin)/dashboard/page.tsx
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query'

export default async function DashboardPage() {
  const queryClient = getQueryClient()

  // Prefetch on server
  await queryClient.prefetchQuery(
    trpc.entity.list.queryOptions()
  )

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardContent />
    </HydrationBoundary>
  )
}
```

**Note:** tRPC v11's new TanStack React Query integration (Feb 2025) provides better support for this pattern.

</tanstack_query_tuning>

<architecture_patterns>
## Architecture Patterns

### Pattern 1: Cache Components for Aggregations

**What:** Use `"use cache"` for expensive dashboard statistics
**When to use:** Heavy queries that aggregate multiple tables

```typescript
// src/data/cached-queries.ts
import { cacheLife, cacheTag } from 'next/cache'

export async function getCachedDashboardStats(entityId: number) {
  'use cache'
  cacheLife('financial')
  cacheTag(`dashboard-${entityId}`)  // For Phase 39 invalidation

  const [
    totalAssets,
    totalLiabilities,
    monthlyIncome,
    monthlyExpenses,
  ] = await Promise.all([
    db.select({ sum: sql`SUM(current_balance)` }).from(bankAccount).where(eq(bankAccount.entityId, entityId)),
    db.select({ sum: sql`SUM(current_balance)` }).from(liability).where(eq(liability.entityId, entityId)),
    // ... more aggregations
  ])

  return { totalAssets, totalLiabilities, monthlyIncome, monthlyExpenses }
}
```

### Pattern 2: TanStack Query with Custom Hooks

**What:** Create hooks that apply appropriate staleTime per data type
**When to use:** Keep existing tRPC patterns with better caching

```typescript
// src/hooks/use-cached-queries.ts
import { trpc } from '@/lib/trpc'

// Reference data hook with longer cache
export function useBeneficiaries() {
  return trpc.beneficiary.list.useQuery(undefined, {
    staleTime: 1000 * 60 * 10,  // 10 minutes
    gcTime: 1000 * 60 * 30,
  })
}

// Financial data hook with short cache
export function useLiabilities() {
  return trpc.liability.list.useQuery(undefined, {
    staleTime: 1000 * 30,  // 30 seconds
    gcTime: 1000 * 60 * 5,
  })
}

// Config data hook with very long cache
export function useEntity() {
  return trpc.entity.list.useQuery(undefined, {
    staleTime: 1000 * 60 * 60,  // 1 hour
    gcTime: 1000 * 60 * 60 * 2,
  })
}
```

### Pattern 3: Server Component Data Loading

**What:** Load data in Server Components, pass to Client Components
**When to use:** Pages that need instant data without loading states

```typescript
// src/app/(admin)/beneficiaries/page.tsx
import { getCachedBeneficiaries } from '@/data/cached-queries'

export default async function BeneficiariesPage() {
  // Server-side cached fetch
  const beneficiaries = await getCachedBeneficiaries()

  // Pass to client component for interactivity
  return <BeneficiariesTable initialData={beneficiaries} />
}

// src/components/beneficiaries-table.tsx
'use client'

export function BeneficiariesTable({ initialData }) {
  // Client-side query with initial data
  const { data } = trpc.beneficiary.list.useQuery(undefined, {
    initialData,
    staleTime: 1000 * 60 * 10,
  })

  // ... render table with mutations
}
```

### Anti-Patterns to Avoid

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| Caching mutations | `"use cache"` is read-only | Keep mutations in tRPC |
| Long staleTime on balances | Users see stale financial data | Use short staleTime (30s) |
| Caching auth/session data | Security risk | Never cache user-specific auth |
| Double-caching everything | Complexity, debugging pain | Choose ONE layer per query |
| Forgetting invalidation | Stale data persists | Plan Phase 39, use short expire |

</architecture_patterns>

<trust_admin_data_classification>
## Trust Administration Data Classification

Based on codebase analysis and financial application best practices:

### Tier 1: Financial (Fresh Critical) - `staleTime: 30s`
Data where freshness directly impacts user decisions:
- **Bank accounts** (`currentBalance`) - Balance must be accurate
- **Liability** (`currentBalance`) - Payment tracking depends on this
- **Trust accounting** (recent entries) - Income/expense totals
- **Dashboard aggregations** - Financial overview

**Cache profile:** `seconds` or custom `financial`
**TanStack staleTime:** 30 seconds

### Tier 2: Transactional (Recent Matters) - `staleTime: 2-5 min`
Data that changes with user actions but doesn't need instant freshness:
- **Liability payments** - Payment history
- **HEMS requests** (non-pending) - Historical records
- **Distributions** - Payout history
- **Activity log** - Audit trail

**Cache profile:** `minutes` or custom `transactions`
**TanStack staleTime:** 2-5 minutes

### Tier 3: Reference (Changes Infrequently) - `staleTime: 10-30 min`
Data that changes rarely, safe to show slightly stale:
- **Beneficiaries** - List rarely changes (unless death/birth)
- **Trustees** - Succession changes are rare
- **Contacts** - Professional contacts stable
- **Withdrawal records** - Milestone tracking

**Cache profile:** `hours` or custom `reference`
**TanStack staleTime:** 10-30 minutes

### Tier 4: Configuration (Essentially Static) - `staleTime: 1+ hour`
Data that almost never changes:
- **Entity** - Trust configuration
- **Trustee fee schedules** - Fee structure
- **Specific bequests** - Trust terms

**Cache profile:** `days` or custom `config`
**TanStack staleTime:** 1 hour+

### Not Cached (Always Fresh)
- **Tasks** - Interactive, user-driven updates
- **Pending HEMS requests** - Need real-time review
- **Session/auth data** - Security critical

</trust_admin_data_classification>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Missing cacheComponents Config
**What goes wrong:** `"use cache"` directive silently does nothing
**Why it happens:** Feature flag not enabled in next.config.ts
**How to avoid:** Add `cacheComponents: true` to nextConfig
**Warning signs:** No caching observed, queries always hit database

### Pitfall 2: staleTime: 0 Default Causes Double-Fetch
**What goes wrong:** Data fetches on server, then immediately refetches on client
**Why it happens:** TanStack Query default staleTime is 0
**How to avoid:** Set default staleTime > 0 in QueryClient config
**Warning signs:** Network tab shows duplicate requests on page load

### Pitfall 3: Too Long Cache on Financial Data
**What goes wrong:** Admin sees stale balance after payment
**Why it happens:** Using `hours` profile or long staleTime for balance data
**How to avoid:** Use `seconds` profile / 30s staleTime for financial data
**Warning signs:** Users report "balance didn't update"

### Pitfall 4: Caching Inside Client Components
**What goes wrong:** TypeError or silent failure
**Why it happens:** `"use cache"` only works in Server Components/Actions
**How to avoid:** Create server-side data layer, use TanStack Query for client
**Warning signs:** Build errors or runtime exceptions

### Pitfall 5: Not Planning for Invalidation
**What goes wrong:** Stale data persists until expire time
**Why it happens:** Phase 38 sets profiles, Phase 39 adds invalidation
**How to avoid:** Use shorter profiles for frequently mutated data
**Warning signs:** After mutation, old data shows until cache expires

</common_pitfalls>

<implementation_order>
## Implementation Order

### Phase 38 Minimal Scope (Recommended)

**Step 1: Enable cacheComponents** (5 min)
- Add `cacheComponents: true` to next.config.ts
- Define custom cache profiles

**Step 2: Tune TanStack Query Defaults** (10 min)
- Set sensible staleTime default (30s)
- Disable refetchOnWindowFocus
- Configure gcTime (10 min)

**Step 3: Add Query-Specific staleTime** (Optional, 15 min)
- Create query config hooks for data tiers
- Apply to key queries in dashboard, lists

**Step 4: (Optional) Add Server-Side Cache** (30 min)
- Only if dashboard performance is critical
- Create cached aggregation functions
- Update dashboard to use cached data

### Phase 39 Will Add
- `cacheTag()` calls in cached functions
- `revalidateTag()` calls in mutations
- `updateTag()` for immediate invalidation

</implementation_order>

<sources>
## Sources

### Primary (HIGH confidence)
- [Next.js Cache Components Guide](https://nextjs.org/docs/app/getting-started/cache-components) - Official stable documentation
- [Next.js "use cache" Directive](https://nextjs.org/docs/app/api-reference/directives/use-cache) - Technical reference
- [Next.js 16 Release Blog](https://nextjs.org/blog/next-16) - Confirms Cache Components is STABLE
- [Next.js Caching and Revalidating](https://nextjs.org/docs/app/getting-started/caching-and-revalidating) - Best practices

### Secondary (MEDIUM confidence)
- [tRPC Server Components Setup](https://trpc.io/docs/client/tanstack-react-query/server-components) - Official tRPC + RSC docs
- [TanStack Query SSR Guide](https://tanstack.com/query/latest/docs/framework/react/guides/ssr) - Prefetching patterns
- [tRPC TanStack React Query Blog](https://trpc.io/blog/introducing-tanstack-react-query-client) - New integration (Feb 2025)

### Tertiary (Community/Discussion)
- [Next.js Discord: Caching Database Queries](https://nextjs-forum.com/post/1386221067323969596) - Community patterns
- [GitHub Discussion: updateTag vs revalidateTag](https://github.com/vercel/next.js/discussions/84805) - Invalidation strategies

</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: Next.js 16 cacheLife (STABLE), TanStack Query
- Ecosystem: tRPC v11, Drizzle ORM
- Patterns: Server-side caching, client-side staleTime, hybrid approach
- Domain: Financial application caching best practices
- Pitfalls: Double-fetching, stale financial data, cache invalidation

**Confidence breakdown:**
- `"use cache"` stability: HIGH - Confirmed in Next.js 16 release blog
- cacheLife profiles: HIGH - Official documentation
- TanStack Query tuning: HIGH - Official docs + community patterns
- Hybrid approach: MEDIUM-HIGH - Recommended based on analysis
- Financial data classification: HIGH - Domain expertise applied

**Research date:** 2026-01-18
**Valid until:** 2026-02-18 (30 days - APIs stable)

</metadata>

---

*Phase: 38-cacheLife-profiles*
*Research completed: 2026-01-18*
*Ready for planning: yes*
