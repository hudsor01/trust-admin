# Phase 08-02: TanStack Query Migration - Summary

## Status: In Progress

**Created**: 2026-01-09
**Last Updated**: 2026-01-09

## Objective

Migrate from custom query hook factory (`src/hooks/use-query.ts`) to industry-standard TanStack Query v5, following TkDodo's recommended colocated pattern for better maintainability and type safety.

## Completed Work

### ✅ Created 21 Resource Query Files

All resources now have dedicated query files following the pattern: `src/hooks/{resource}/queries.ts`

#### Simple Resources (4)
- ✅ `contacts/queries.ts` - No entity filter, sorted by name
- ✅ `beneficiaries/queries.ts` - Entity filter, with `byEntity` query key
- ✅ `trustees/queries.ts` - Entity filter, sorted by order
- ✅ `tasks/queries.ts` - No filter, sorted by sortOrder

#### Asset Resources (10)
- ✅ `entities/queries.ts` - No filter, custom sort (DOD entities first)
- ✅ `vehicles/queries.ts` - Entity filter
- ✅ `homesteads/queries.ts` - Entity filter
- ✅ `rental-properties/queries.ts` - Entity filter
- ✅ `bank-accounts/queries.ts` - Entity filter
- ✅ `investment-accounts/queries.ts` - Entity filter
- ✅ `personal-property/queries.ts` - Entity filter
- ✅ `artwork/queries.ts` - Entity filter
- ✅ `liabilities/queries.ts` - Entity filter
- ✅ `liability-payments/queries.ts` - Liability filter, sorted by date desc

#### Complex/Workflow Resources (7)
- ✅ `specific-bequests/queries.ts` - Entity filter
- ✅ `trust-accounting/queries.ts` - Entity filter, sorted by accounting date desc
- ✅ `withdrawal-records/queries.ts` - Beneficiary filter, sorted by eligible date
- ✅ `hems-requests/queries.ts` - Beneficiary filter, sorted by created desc
- ✅ `trustee-fee-schedules/queries.ts` - Entity filter, **immutable** (no updates)
- ✅ `trustee-fee-entries/queries.ts` - Entity filter, sorted by period end desc
- ✅ `activity-logs/queries.ts` - No filter, **immutable** (no updates/deletes)

### Pattern Established

Each `queries.ts` file follows this structure:

```typescript
/**
 * TanStack Query hooks for {Resource} resource
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// TypeScript interface
export interface Resource {
  id: string
  // ... all fields
}

// Query Keys Factory
export const resourceKeys = {
  all: ['resources'] as const,
  byEntity: (entityId: string) => ['resources', 'entity', entityId] as const,
  detail: (id: string) => ['resources', id] as const,
}

// Query Hooks
export function useResources(entityId?: string) { ... }
export function useResource(id: string) { ... }

// Mutation Hooks
export function useCreateResource() { ... }
export function useUpdateResource() { ... }
export function useDeleteResource() { ... }
```

### Key Features Implemented

1. **Query Keys Factory** - Consistent cache key pattern for all resources
2. **Optional Filtering** - Resources support entity/beneficiary/liability filtering
3. **Error Handling** - Toast notifications for validation errors and failures
4. **Success Notifications** - Toast success messages after mutations
5. **Validation Error Details** - Field-level error messages displayed in toast
6. **Cache Invalidation** - Automatic invalidation of related queries after mutations
7. **TypeScript Types** - All interfaces exported for type safety
8. **Immutability Support** - Special handling for audit logs and immutable resources

## Remaining Work

### 🔲 Page Migration

Need to update all pages to use new TanStack Query hooks:

1. **Simple Pages**
   - `src/pages/Contacts.tsx`
   - `src/pages/Beneficiaries.tsx`
   - `src/pages/Trustees.tsx`
   - `src/pages/Tasks.tsx`

2. **Asset Management Pages**
   - ✅ `src/pages/Vehicles.tsx` (already updated)
   - `src/pages/Accounts.tsx` (bank + investment accounts)
   - `src/pages/Properties.tsx` (homesteads + rental properties)
   - `src/pages/Liabilities.tsx`

3. **Complex Workflow Pages**
   - `src/pages/Accounting.tsx` (trust accounting entries)
   - `src/pages/Distributions.tsx`
   - `src/pages/HemsQueue.tsx` (HEMS requests)
   - `src/pages/Bequests.tsx` (specific bequests)
   - `src/pages/Dashboard.tsx`

### 🔲 Cleanup

1. Delete `src/hooks/use-query.ts` (old custom hook factory)
2. Delete `src/hooks/index.ts` (if exists)
3. Remove any remaining references to old hooks

### 🔲 Testing

1. Manual testing of all pages
2. Verify all CRUD operations work correctly
3. Verify filtering works for entity-based resources
4. Verify toast notifications appear on errors and success
5. Verify validation errors show field-level details

## Technical Decisions

### Why TanStack Query?

- **Industry Standard**: Most popular React data fetching library
- **Better Caching**: Intelligent cache management with stale-while-revalidate
- **DevTools**: Built-in React Query DevTools for debugging
- **Type Safety**: Better TypeScript support than custom solution
- **Maintenance**: Actively maintained with 40K+ GitHub stars

### Why Colocated Pattern?

Following TkDodo's (TanStack Query maintainer) recommended architecture:

- **Vertical Slicing**: Group by feature/domain rather than technical type
- **Better Organization**: All queries and mutations for a resource in one file
- **Easier Navigation**: Developers find everything related to a resource in one place
- **Reduced Coupling**: Each resource is self-contained

Rejected alternatives:
- ❌ Separate `queries/` and `mutations/` folders (horizontal slicing)
- ❌ Keeping queries in `use-query.ts` factory (custom solution, less maintainable)
- ❌ Feature folders in `features/{resource}/` (overkill for this project size)

### Import Pattern

Old (broken):
```typescript
import { useEntities, useVehicles } from "@/hooks"
```

New (working):
```typescript
import { useEntities, useCreateEntity, useUpdateEntity, useDeleteEntity } from "@/hooks/entities/queries"
import { useVehicles, useCreateVehicle, type Vehicle } from "@/hooks/vehicles/queries"
```

## Commits

1. `3df039b` - feat(08-02): create TanStack Query hooks for remaining resources
2. `1894f90` - feat(08-02): create TanStack Query hooks for complex resources

## Next Steps

1. Start page migration with simplest pages (Contacts, Tasks)
2. Move to filtered pages (Vehicles already done, do Accounts next)
3. Tackle complex pages (Accounting, Distributions)
4. Delete old use-query.ts
5. Test all functionality
6. Mark phase 08-02 as complete

## Notes

- All 21 API routes now have corresponding TanStack Query hooks
- Pattern is consistent and easy to extend for new resources
- Type safety improved with explicit interfaces
- Error handling is more user-friendly with toast notifications
- Cache management is automatic via TanStack Query
