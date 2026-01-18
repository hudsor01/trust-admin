# Phase 38 Plan 01: cacheLife Profiles Configuration Summary

**Tuned TanStack Query defaults for financial application; documented cacheLife profiles for future server-side caching adoption.**

## Accomplishments

- Tuned TanStack Query `staleTime` from 5s to 30s, balancing financial freshness with reduced refetches
- Added `gcTime` of 10 minutes to keep cached data longer for navigation performance
- Documented cacheLife profiles (financial, reference, config tiers) for future server-side caching

## Files Created/Modified

- `next.config.ts` - Added documentation for cacheLife profiles (cacheComponents NOT enabled)
- `src/lib/trpc-provider.tsx` - Tuned staleTime (30s) + gcTime (10min)

## Decisions Made

**Deviation from original plan:** `cacheComponents: true` was NOT enabled.

During Task 3 verification, enabling `cacheComponents: true` caused build failures:
```
Route "/accounting": Uncached data was accessed outside of <Suspense>
```

Next.js 16's `cacheComponents` feature enforces stricter pre-rendering rules that conflict with client-side tRPC/TanStack Query data fetching. Fixing this would require either:
1. Adding `export const dynamic = 'force-dynamic'` to all 15+ pages, or
2. Wrapping all data-fetching components in Suspense boundaries

Per deviation rules (Rule 4 - Architectural), this was out of scope. The resolution:
- Reverted `cacheComponents: true`
- Added documentation explaining why it's not enabled
- Preserved cacheLife profile specifications as comments for future reference
- Kept TanStack Query tuning as the primary caching improvement

**Rationale:** The current tRPC architecture benefits more from TanStack Query's client-side caching than server-side "use cache" directives. The tuned defaults (30s staleTime, 10min gcTime) provide meaningful performance improvements without architectural changes.

## Issues Encountered

Build failure when `cacheComponents: true` was enabled - resolved by reverting and documenting for future use.

## Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| 1 | `7136640` | chore | Document cacheLife profiles for future server-side caching |
| 2 | `fa6aecf` | perf | Tune TanStack Query defaults for financial application |

## Next Step

Phase complete. Ready for Phase 39 (cacheTag invalidation) when server-side caching is adopted.
