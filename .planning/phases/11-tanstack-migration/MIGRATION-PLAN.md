# TanStack Migration Plan

**Status**: Planning
**Scope**: Migrate from custom hooks/components to TanStack Query, Form, and Table
**Goal**: Adopt industry-standard data fetching, form management, and table components

## Overview

Replace custom implementations with TanStack ecosystem:
- **TanStack Query** → Replace `src/hooks/use-query.ts` and custom data fetching
- **TanStack Form** → Replace `src/lib/form-factory.ts` and `useResourceForm` pattern
- **TanStack Table** → Replace `src/components/data-table.tsx`

## Benefits

### TanStack Query
- Automatic request deduplication (better than our promise sharing)
- Smart caching with stale-while-revalidate
- Background refetching to keep data fresh
- DevTools for debugging
- Automatic retries with exponential backoff
- Optimistic updates
- Request cancellation
- Dependent queries
- Polling/intervals

### TanStack Form
- Type-safe form validation
- Field-level validation
- Async validation
- Array fields with dynamic add/remove
- Form state management
- Integration with Zod schemas

### TanStack Table
- Sorting, filtering, pagination built-in
- Column resizing and reordering
- Row selection
- Virtual scrolling for large datasets
- Server-side operations support
- TypeScript-first design

## Migration Strategy

### Phase 1: Install Dependencies

```bash
bun add @tanstack/react-query @tanstack/react-form @tanstack/react-table
bun add @tanstack/react-query-devtools -d
```

### Phase 2: Set Up Query Client

**File**: `src/main.tsx`

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds (matches our current cache TTL)
      refetchOnWindowFocus: false, // Don't refetch on window focus (local dev)
      retry: 1, // Retry failed requests once
    },
  },
})

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
)
```

### Phase 3: Create Query Hooks

Replace `createQueryHook` with TanStack Query patterns.

**Before** (`src/hooks/use-query.ts`):
```typescript
export const useEntities = createQueryHook<Entity>('/api/entities')
```

**After** (`src/hooks/useEntities.ts`):
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useEntities() {
  return useQuery({
    queryKey: ['entities'],
    queryFn: async () => {
      const res = await fetch('/api/entities')
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`)
      return res.json() as Promise<Entity[]>
    },
  })
}

export function useCreateEntity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (entity: Partial<Entity>) => {
      const res = await fetch('/api/entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entity),
      })
      if (!res.ok) throw new Error(`Failed to create: ${res.status}`)
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] })
    },
  })
}

export function useUpdateEntity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Entity> }) => {
      const res = await fetch(`/api/entities/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error(`Failed to update: ${res.status}`)
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] })
    },
  })
}

export function useDeleteEntity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/entities/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Failed to delete: ${res.status}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] })
    },
  })
}
```

**With Pagination**:
```typescript
export function useTrustAccounting(entityId: string, pagination: { pageIndex: number; pageSize: number }) {
  return useQuery({
    queryKey: ['trust-accounting', entityId, pagination],
    queryFn: async () => {
      const res = await fetch(
        `/api/trust-accounting?entityId=${entityId}&limit=${pagination.pageSize}&offset=${pagination.pageIndex * pagination.pageSize}&includeTotalCount=true`
      )
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`)
      return res.json() as Promise<PaginatedResult<TrustAccountingEntry>>
    },
    enabled: !!entityId, // Only fetch when entityId is provided
    placeholderData: keepPreviousData, // Keep previous data while fetching new page
  })
}
```

### Phase 4: Create Table Component

Replace `DataTable` with TanStack Table.

**File**: `src/components/tanstack-table.tsx`

```typescript
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[]
  data: TData[]
  pageCount?: number
  pagination?: PaginationState
  onPaginationChange?: (pagination: PaginationState) => void
  manualPagination?: boolean
}

export function DataTable<TData>({
  columns,
  data,
  pageCount,
  pagination,
  onPaginationChange,
  manualPagination = false,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    pageCount,
    state: {
      sorting,
      ...(pagination && { pagination }),
    },
    onSortingChange: setSorting,
    ...(onPaginationChange && { onPaginationChange }),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination,
  })

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3 text-left">
                    {header.isPlaceholder ? null : (
                      <div
                        className={
                          header.column.getCanSort()
                            ? 'cursor-pointer select-none'
                            : ''
                        }
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {{
                          asc: ' 🔼',
                          desc: ' 🔽',
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{' '}
          of {table.getFilteredRowModel().rows.length} results
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="flex items-center gap-1">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
```

### Phase 5: Create Form Components

Replace `useResourceForm` with TanStack Form.

**File**: `src/components/tanstack-form.tsx`

```typescript
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { z } from 'zod'

interface ResourceFormProps<T> {
  schema: z.ZodType<T>
  defaultValues: T
  onSubmit: (values: T) => Promise<void>
  children: (form: any) => React.ReactNode
}

export function ResourceForm<T>({
  schema,
  defaultValues,
  onSubmit,
  children,
}: ResourceFormProps<T>) {
  const form = useForm({
    defaultValues,
    validators: {
      onChange: schema,
    },
    onSubmit: async ({ value }) => {
      await onSubmit(value as T)
    },
  })

  return <form onSubmit={form.handleSubmit}>{children(form)}</form>
}
```

### Phase 6: Migration Order

Migrate resources in order of complexity:

1. **Simple resources** (no relations):
   - Entities
   - Contacts
   - Vehicles

2. **Resources with filtering**:
   - Bank Accounts (by entityId)
   - Liabilities (by entityId)
   - Tasks (by entityId)

3. **Complex resources** (with pagination):
   - Trust Accounting (by entityId + pagination)
   - Liability Payments (by liabilityId + pagination)

4. **Pages with forms**:
   - Properties page
   - Accounting page
   - Liabilities page

### Phase 7: Remove Old Code

After migration complete:
- Delete `src/hooks/use-query.ts`
- Delete `src/lib/form-factory.ts`
- Delete `src/components/data-table.tsx`
- Delete `src/components/pagination.tsx`
- Update all imports

## Testing Strategy

For each migrated resource:
1. Verify data fetches correctly
2. Test create/update/delete operations
3. Verify cache invalidation works
4. Test pagination (if applicable)
5. Check DevTools for query status

## Estimated Timeline

- Phase 1-2: Setup (30 minutes)
- Phase 3: Query hooks (4-6 hours for all 22 resources)
- Phase 4: Table component (2-3 hours)
- Phase 5: Form components (2-3 hours)
- Phase 6: Page migration (6-8 hours for 14 pages)
- Phase 7: Cleanup (1 hour)

**Total**: 15-20 hours

## Decision Point

**Option A**: Complete current Phase 9/10, then migrate (recommended)
- Finish pagination UI implementation
- Complete Phase 10 (Quality Verification)
- Start TanStack migration as Phase 11 or new Milestone 2

**Option B**: Start migration now
- Abandon current pagination implementation
- Start fresh with TanStack Query + Table
- Complete Phase 9/10 after migration

## Recommendation

**Complete Phases 9 & 10 first, then migrate.** Here's why:

1. **Current work is 80% done** - we have working pagination infrastructure
2. **Clean slate for migration** - easier to migrate stable, tested code
3. **Learn from current implementation** - understand what we need before switching
4. **Phased approach** - deliver value incrementally

After Phase 10 verification, create **Milestone 2: TanStack Ecosystem Migration** with:
- Phase 11: TanStack Query Migration
- Phase 12: TanStack Table Migration
- Phase 13: TanStack Form Migration
- Phase 14: DevTools Integration & Testing

## Next Steps

1. Finish Phase 9 Plan 03 (pagination UI) - 1-2 hours remaining
2. Complete Phase 10 (Quality Verification) - 3-4 hours
3. Create Milestone 2 roadmap with detailed TanStack migration plans
4. Begin migration with simple resources first

This approach ensures we:
- Don't lose current progress
- Have working baseline to compare against
- Can migrate incrementally with rollback options
- Deliver Phase 9/10 value before major refactor
