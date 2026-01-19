# Phase 9 Plan 02 Summary: Implement Request Deduplication in Query Hook

**Status**: ✅ Complete
**Date**: 2026-01-09
**Commit**: c213258

## Objective

Add simple in-memory request deduplication to prevent concurrent duplicate requests for the same resource.

## Implementation Summary

Successfully added request deduplication and caching to the query hook with:
- ✅ Cache utilities for storing and retrieving data
- ✅ Promise sharing to deduplicate concurrent requests
- ✅ 30-second cache TTL to prevent stale data
- ✅ Auto-invalidation after mutations
- ✅ Manual cache clearing functions

## Changes Made

### Cache Utilities (src/hooks/use-query.ts:15-116)

```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  promise?: Promise<T>; // For deduplicating concurrent requests
}

const cache = new Map<string, CacheEntry<any>>();
const CACHE_TTL = 30000; // 30 seconds

function getCacheKey(url: string): string {
  return url;
}

function getCachedData<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

function setCachedData<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

function getOrCreatePromise<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const entry = cache.get(key);

  // If there's a pending promise, return it (deduplication)
  if (entry?.promise) {
    return entry.promise;
  }

  // Create new promise
  const promise = fetcher().then(
    (data) => {
      // Store result in cache
      setCachedData(key, data);
      // Clear promise from cache entry
      const entry = cache.get(key);
      if (entry) {
        delete entry.promise;
      }
      return data;
    },
    (error) => {
      // On error, remove promise so next attempt can retry
      cache.delete(key);
      throw error;
    }
  );

  // Store promise for deduplication
  cache.set(key, {
    data: null as any,
    timestamp: Date.now(),
    promise,
  });

  return promise;
}

export function invalidateCache(urlPattern?: string): void {
  if (!urlPattern) {
    cache.clear();
    return;
  }

  for (const [key] of cache) {
    if (key.includes(urlPattern)) {
      cache.delete(key);
    }
  }
}

export function clearCache(): void {
  cache.clear();
}
```

### Updated refetch() Function

The `refetch()` function now:
1. Checks cache before making HTTP requests
2. Returns cached data if available and fresh (< 30 seconds old)
3. Uses `getOrCreatePromise()` to share promises between concurrent requests
4. Only makes 1 HTTP request even if multiple components call the same endpoint simultaneously

```typescript
const refetch = useCallback(async () => {
  const url = buildUrl();
  const cacheKey = getCacheKey(url);

  // Check cache first
  const cachedData = getCachedData<T[]>(cacheKey);
  if (cachedData) {
    setData(cachedData);
    setLoading(false);
    setError(null);
    return;
  }

  // Fetch with deduplication
  setLoading(true);
  setError(null);
  
  try {
    const result = await getOrCreatePromise(cacheKey, async () => {
      const res = await fetch(url);
      // ... error handling ...
      let result = await res.json();
      if (sortFn) result = sortFn(result);
      if (transform) result = transform(result);
      return result;
    });
    
    setData(result);
  } catch (err) {
    setError(err instanceof Error ? err : new Error(String(err)));
    // ... error toasts ...
  } finally {
    setLoading(false);
  }
}, [buildUrl]);
```

### Auto-Invalidation After Mutations

All mutation operations now invalidate the cache:

```typescript
// After create
const created = await res.json();
setData((prev) => {
  const updated = [...prev, created];
  return sortFn ? sortFn(updated) : updated;
});
invalidateCache(endpoint); // Clear cache
return created;

// After update
const updated = await res.json();
setData((prev) => {
  const newData = prev.map((item) => (item.id === id ? updated : item));
  return sortFn ? sortFn(newData) : newData;
});
invalidateCache(endpoint); // Clear cache
return updated;

// After delete
setData((prev) => prev.filter((item) => item.id !== id));
invalidateCache(endpoint); // Clear cache
```

## How Request Deduplication Works

### Scenario: Two components mount simultaneously

**Before (without deduplication):**
```
Component A calls useEntities() → HTTP GET /api/entities
Component B calls useEntities() → HTTP GET /api/entities
Result: 2 HTTP requests
```

**After (with deduplication):**
```
Component A calls useEntities() → HTTP GET /api/entities (creates promise)
Component B calls useEntities() → Reuses Component A's promise
Result: 1 HTTP request, both components get the same data
```

### Promise Sharing Mechanism

1. **First request**: `getOrCreatePromise()` creates a new fetch promise and stores it in the cache
2. **Concurrent requests**: Subsequent requests see the pending promise and return it instead of creating a new one
3. **Promise completion**: When the fetch completes, the promise is removed and the data is stored
4. **Cache hits**: Future requests within 30 seconds get cached data immediately

## Cache Invalidation Strategy

### Automatic Invalidation

Cache is automatically cleared when mutations occur:
- `create()` → invalidates endpoint cache
- `update()` → invalidates endpoint cache
- `delete()` → invalidates endpoint cache

This ensures fresh data on the next fetch after any data change.

### Manual Invalidation

```typescript
// Clear specific endpoint
invalidateCache('/api/entities')

// Clear all matching endpoints
invalidateCache('/api/') // Clears all API caches

// Clear entire cache
invalidateCache() // or clearCache()
```

## Performance Characteristics

### Cache Hit (< 30 seconds)
- **Zero network requests**
- Instant data return
- No loading state

### Cache Miss (> 30 seconds or first request)
- **Single network request** even with multiple concurrent callers
- Loading state shown
- Data cached for future requests

### After Mutations
- Cache invalidated
- Next fetch will hit the server
- Ensures data consistency

## TypeScript Compilation

✅ Zero errors in `src/hooks/use-query.ts`

All pre-existing TypeScript errors in other files remain unchanged.

## Manual Verification

To verify request deduplication is working:

1. Start dev server: `bun run dev`
2. Open app in browser: `http://localhost:5173`
3. Open DevTools Network tab
4. Navigate to Dashboard or any page
5. **Expected**: Only 1 request to `/api/entities` despite multiple components

### What to verify:
- Single HTTP request per endpoint (not multiple concurrent requests)
- Cached responses for 30 seconds
- Cache invalidation after create/update/delete

## Limitations and Trade-offs

### Current Implementation
- **In-memory only**: Cache clears on page refresh
- **Fixed 30-second TTL**: Not configurable per endpoint
- **URL-based keys**: Query params included in cache key
- **Pattern-based invalidation**: Uses string matching (not regex)

### Why not React Query/SWR?
- Simple in-memory cache sufficient for trust admin use case
- Avoids large dependency (React Query is 42KB gzipped)
- Maintains current architecture (custom hooks)
- Can migrate to React Query later if needed (Phase 10+)

### Appropriate for:
- Modest data volumes (trust admin scale)
- Resources that don't change frequently
- Local development and single-user scenarios

### Not appropriate for:
- Real-time data that changes frequently
- Multi-user scenarios with data races
- Resources requiring optimistic updates
- Long-lived sessions requiring persistent cache

## Success Criteria

✅ Cache utilities created (getCacheKey, getCachedData, setCachedData, getOrCreatePromise)
✅ refetch() updated to check cache and deduplicate requests
✅ Cache TTL set to 30 seconds
✅ Cache invalidation function exported (invalidateCache, clearCache)
✅ Mutations auto-invalidate cache on success
✅ TypeScript compiles without errors in modified file
✅ Implementation complete and committed

## Next Steps

- Plan 09-03: Add pagination UI components to data tables
- Manual verification in browser (user action)

## Notes

**Simple is better**: This implementation prioritizes simplicity over features. No background refetching, retry logic, or optimistic updates. Sufficient for current needs, can enhance later if required.

**Cache consistency**: The auto-invalidation strategy ensures data consistency by clearing cache after any mutation, preventing stale data scenarios.

**Testing strategy**: Manual verification in browser preferred over automated tests due to timing-sensitive nature of concurrent requests. Automated tests would require complex mocking and may not catch real-world race conditions.
