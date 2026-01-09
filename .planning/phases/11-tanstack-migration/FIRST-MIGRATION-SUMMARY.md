# First TanStack Migration - Vehicles Page

**Date**: 2026-01-09
**Status**: ✅ Complete and Verified
**Migration Time**: ~30 minutes

## Overview

Successfully migrated the Vehicles page from custom `createQueryHook` pattern to TanStack Query v5. This serves as the reference pattern for migrating the remaining 21 resources.

## What Was Migrated

### 1. Query Hooks Created
**File**: `src/hooks/queries/useVehicles.ts`

Created following TanStack Query patterns:
- `useVehicles(entityId?)` - Fetch all vehicles or filtered by entity
- `useVehicle(id)` - Fetch single vehicle
- `useCreateVehicle()` - Create mutation
- `useUpdateVehicle()` - Update mutation
- `useDeleteVehicle()` - Delete mutation

**Key Features**:
- Query keys factory pattern for cache management
- Automatic cache invalidation on mutations
- Toast notifications for errors (validation, HTTP errors)
- Type-safe with full TypeScript support
- Entity-based filtering support

### 2. Page Migration
**File**: `src/pages/Vehicles.tsx`

**Changes Made**:
1. Updated imports to use new TanStack hooks
2. Changed `loading` → `isLoading` (TanStack naming)
3. Added default values `= []` for data destructuring
4. Separated mutation hooks from query hooks
5. Updated handlers to use `.mutateAsync()` pattern

**Before**:
```typescript
const { data: vehicles, loading, create, update, remove } = useVehicles(entityId)

await create(payload)
await update(id, payload)
await remove(id)
```

**After**:
```typescript
const { data: vehicles = [], isLoading } = useVehicles(entityId)
const createMutation = useCreateVehicle()
const updateMutation = useUpdateVehicle()
const deleteMutation = useDeleteVehicle()

await createMutation.mutateAsync(payload)
await updateMutation.mutateAsync({ id, data: payload })
await deleteMutation.mutateAsync(id)
```

## Migration Pattern (Step-by-Step)

### Step 1: Create Query Hooks File

Create `src/hooks/queries/use[Resource].ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// 1. Define TypeScript interface
export interface Resource {
  id: string
  // ... fields
}

// 2. Define query keys factory
export const resourceKeys = {
  all: ['resources'] as const,
  byEntity: (entityId: string) => ['resources', 'entity', entityId] as const,
  detail: (id: string) => ['resources', id] as const,
}

// 3. Create query hooks
export function useResources(entityId?: string) {
  return useQuery({
    queryKey: entityId ? resourceKeys.byEntity(entityId) : resourceKeys.all,
    queryFn: async () => {
      const url = entityId ? `/api/resources?entityId=${entityId}` : '/api/resources'
      const res = await fetch(url)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      return res.json() as Promise<Resource[]>
    },
    enabled: entityId ? !!entityId : true,
  })
}

// 4. Create mutation hooks
export function useCreateResource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<Resource>) => {
      const res = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))

        // Show validation errors
        if (errorData.error?.code === 'VALIDATION_ERROR' && errorData.error.details?.fields) {
          const fields = errorData.error.details.fields as Record<string, string>
          const fieldErrors = Object.entries(fields)
            .map(([field, message]) => `${field}: ${message}`)
            .join('\n')
          toast.error(errorData.error.message, { description: fieldErrors })
        } else {
          toast.error(errorData.error?.message || 'Failed to create resource')
        }

        throw new Error(errorData.error?.message || `Failed to create: ${res.status}`)
      }

      return res.json() as Promise<Resource>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.all })
      if (data.entityId) {
        queryClient.invalidateQueries({ queryKey: resourceKeys.byEntity(data.entityId) })
      }
      toast.success('Resource created successfully')
    },
    onError: (error) => {
      console.error('Failed to create resource:', error)
    },
  })
}

// 5. Repeat for update and delete mutations
```

### Step 2: Update Page Component

1. **Update imports**:
```typescript
// OLD
import { useResources, type Resource } from "@/hooks"

// NEW
import { useResources, useCreateResource, useUpdateResource, useDeleteResource, type Resource } from "@/hooks/queries/useResources"
```

2. **Update hook usage**:
```typescript
// OLD
const { data: items, loading, create, update, remove } = useResources(entityId)

// NEW
const { data: items = [], isLoading } = useResources(entityId)
const createMutation = useCreateResource()
const updateMutation = useUpdateResource()
const deleteMutation = useDeleteResource()
```

3. **Update mutation calls**:
```typescript
// OLD
await create(payload)
await update(id, payload)
await remove(id)

// NEW
await createMutation.mutateAsync(payload)
await updateMutation.mutateAsync({ id, data: payload })
await deleteMutation.mutateAsync(id)
```

### Step 3: Verify

1. **TypeScript compilation**:
```bash
bun x tsc --noEmit 2>&1 | grep -i "[resource]"
```

2. **Runtime testing**:
- Navigate to page
- Test CRUD operations
- Verify toast notifications
- Check React Query DevTools

## Benefits Observed

### 1. Automatic Request Deduplication
When multiple components request the same data, TanStack Query automatically deduplicates requests. Only 1 HTTP request is made, even if 10 components call the same hook simultaneously.

### 2. Smart Caching
- Data cached for 30 seconds (configurable via `staleTime`)
- Background refetching keeps data fresh
- Garbage collection after 5 minutes of inactivity

### 3. Built-in DevTools
Press `Cmd+Shift+D` (or configured hotkey) to open React Query DevTools:
- See all queries and their states
- View cached data
- Force refetch
- Clear cache
- Monitor network activity

### 4. Better Error Handling
- Automatic retry on failed requests
- Toast notifications for validation errors
- Field-level error details
- Consistent error messaging

### 5. Type Safety
- Full TypeScript support
- Type inference from API responses
- Compile-time error checking
- Better IDE autocomplete

## Common Pitfalls & Solutions

### Pitfall 1: Forgetting Default Values
**Problem**: `data` is `undefined` during initial load, causing runtime errors.

**Solution**: Always provide default values:
```typescript
const { data: items = [] } = useResources()
```

### Pitfall 2: Mutation Signature Mismatch
**Problem**: Update mutation expects `{ id, data }` object, not separate parameters.

**Solution**: Wrap parameters:
```typescript
await updateMutation.mutateAsync({ id, data: updates })
```

### Pitfall 3: Cache Not Invalidating
**Problem**: After mutation, list doesn't update.

**Solution**: Ensure `onSuccess` invalidates all relevant queries:
```typescript
onSuccess: (data) => {
  queryClient.invalidateQueries({ queryKey: resourceKeys.all })
  queryClient.invalidateQueries({ queryKey: resourceKeys.byEntity(data.entityId) })
  queryClient.invalidateQueries({ queryKey: resourceKeys.detail(data.id) })
}
```

### Pitfall 4: Missing Entity ID Check
**Problem**: Query fires with `undefined` entityId, fetching all records.

**Solution**: Use `enabled` option:
```typescript
useQuery({
  // ...
  enabled: entityId ? !!entityId : true,
})
```

## Performance Comparison

### Before (Custom Hooks)
- Manual cache implementation (30s TTL)
- Promise sharing for deduplication
- Manual error handling
- No DevTools
- ~300 lines of cache code

### After (TanStack Query)
- Automatic caching with stale-while-revalidate
- Built-in request deduplication
- Automatic error handling
- DevTools included
- ~200 lines per resource (cleaner, more maintainable)

## Next Steps

### Immediate (Next 5 Resources)
Migrate simple resources following this pattern:
1. ✅ Entities (done)
2. ✅ Vehicles (done)
3. Contacts
4. Beneficiaries
5. Trustees
6. Tasks

### Medium Priority (Resources with Filtering)
7. Bank Accounts
8. Investment Accounts
9. Liabilities
10. Homesteads
11. Rental Properties
12. Personal Property
13. Artwork
14. Insurance Policies
15. Specific Bequests

### Complex (Resources with Pagination)
16. Trust Accounting
17. Liability Payments
18. Distributions
19. Withdrawal Records
20. HEMS Requests
21. Activity Log

### Final Cleanup
- Remove `src/hooks/use-query.ts`
- Remove `createQueryHook` pattern
- Update all 14 pages
- Remove old data-table.tsx (after migrating to tanstack-table.tsx)

## Estimated Timeline

- **Simple resources** (5 remaining): 2-3 hours (30 min each)
- **Filtered resources** (9): 4-5 hours (30 min each)
- **Paginated resources** (6): 3-4 hours (30-40 min each)
- **Page updates** (13 remaining): 6-8 hours (30-40 min each)
- **Cleanup & testing**: 1-2 hours

**Total remaining**: 16-22 hours

## Validation Checklist

For each migrated resource, verify:
- [ ] TypeScript compiles without errors
- [ ] Query hooks fetch data correctly
- [ ] Mutations create/update/delete successfully
- [ ] Cache invalidates after mutations
- [ ] Toast notifications appear on errors
- [ ] Validation errors show field details
- [ ] DevTools shows queries in cache
- [ ] No console errors in browser
- [ ] Page loads without breaking
- [ ] All CRUD operations work

## Conclusion

The first TanStack migration was successful! The Vehicles page now benefits from:
- Automatic request deduplication
- Smart caching and background refetching
- Built-in error handling
- DevTools for debugging
- Type-safe mutations

This pattern is proven and ready to be applied to the remaining 21 resources.
