# Phase 43: Table Consolidation - Research

**Researched:** 2026-01-18
**Domain:** Internal codebase audit
**Confidence:** HIGH (direct code inspection)

<research_summary>
## Summary

Investigated the codebase to understand the current table implementations. Found that the roadmap description ("migrate to TanStack Table") is misleading — **the primary table component already uses TanStack Table**.

There are 4 table files, but only 2 are actually used:
- `data-table.tsx` - Used by 9 pages, already uses `@tanstack/react-table`
- `virtualized-table.tsx` - Used by activity-log, extends data-table.tsx

The other 2 are dead code:
- `tanstack-table.tsx` - 255 lines, never imported anywhere
- `ui/data-table.tsx` - 331 lines, never imported anywhere

**Primary recommendation:** Delete the 2 unused files. No migration needed — the existing data-table.tsx is already the correct implementation.
</research_summary>

<current_state>
## Current State Analysis

### File Inventory

| File | Lines | TanStack? | Import Count | Used By |
|------|-------|-----------|--------------|---------|
| `src/components/data-table.tsx` | 354 | YES | 10 | hems, liabilities, accounts, hems-queue, dashboard, properties, beneficiaries, accounting, virtualized-table |
| `src/components/virtualized-table.tsx` | ~100 | YES (extends above) | 1 | activity-log |
| `src/components/tanstack-table.tsx` | 255 | YES | 0 | **DEAD CODE** |
| `src/components/ui/data-table.tsx` | 331 | YES | 0 | **DEAD CODE** |

### Import Analysis

**data-table.tsx imports (10 files):**
```
src/app/(admin)/hems/page.tsx
src/app/(admin)/liabilities/page.tsx
src/app/(admin)/accounts/page.tsx
src/app/(admin)/hems-queue/page.tsx
src/app/(admin)/dashboard/page.tsx
src/app/(admin)/properties/page.tsx
src/app/(admin)/beneficiaries/page.tsx
src/app/(admin)/accounting/page.tsx
src/app/(admin)/activity-log/page.tsx (type import only)
src/components/virtualized-table.tsx (extends DataTableProps)
```

**tanstack-table.tsx imports:** NONE
**ui/data-table.tsx imports:** NONE

### API Comparison

**data-table.tsx (in use):**
```typescript
interface DataTableProps<T> {
    data: T[]
    columns: ColumnDef<T>[]  // Custom simplified ColumnDef
    onEdit?: (item: T) => void
    onDelete?: (item: T) => void
    emptyMessage?: string
    isLoading?: boolean
    pagination?: { currentPage, pageSize, totalCount, onPageChange }
}
```
- Custom `ColumnDef` type with `key`, `header`, `render`, `sortable`, `align`
- Built-in edit/delete action buttons
- Built-in loading skeleton
- External pagination support

**tanstack-table.tsx (dead):**
```typescript
interface DataTableProps<TData> {
    columns: ColumnDef<TData>[]  // Raw TanStack ColumnDef
    data: TData[]
    isLoading?: boolean
    emptyMessage?: string
    pageCount?: number
    pagination?: PaginationState
    onPaginationChange?: OnChangeFn<PaginationState>
    manualPagination?: boolean
    enablePagination?: boolean
    pageSize?: number
}
```
- Uses raw TanStack `ColumnDef` (no simplification)
- No action buttons
- Both server-side and client-side pagination

**ui/data-table.tsx (dead):**
```typescript
interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    searchKey?: string
    showColumnToggle?: boolean
    showPagination?: boolean
    pageSize?: number
    stickyHeader?: boolean
    emptyMessage?: string
}
```
- Raw TanStack `ColumnDef`
- Column filtering
- Column visibility toggle
- Sticky header support
- Page size selector
</current_state>

<recommendation>
## Recommendation

### Delete Dead Code Only

The phase goal was "single source of truth" — this is achieved by **deleting the unused files**, not migrating anything.

**Files to delete:**
1. `src/components/tanstack-table.tsx` (255 lines)
2. `src/components/ui/data-table.tsx` (331 lines)

**Files to keep:**
1. `src/components/data-table.tsx` - The primary table (already TanStack-based)
2. `src/components/virtualized-table.tsx` - Extension for large lists

**Total lines removed:** ~586 lines of dead code

### Why This Is the Right Approach

1. **data-table.tsx is already TanStack** — It imports `@tanstack/react-table` and uses `useReactTable`, `getCoreRowModel`, `getSortedRowModel`. No migration needed.

2. **The custom ColumnDef is a feature, not a bug** — It simplifies column definitions for the common case while still using TanStack under the hood.

3. **Action buttons are useful** — The built-in `onEdit`/`onDelete` pattern is used across 9 pages. Migrating to raw TanStack would require adding these to every page.

4. **virtualized-table extends correctly** — It extends `DataTableProps` from data-table.tsx and adds virtualization. This is the right architecture.

### Alternative Considered: Full TanStack Migration

Could migrate all 9 pages to use raw `@tanstack/react-table` ColumnDef:

**Pros:**
- Full TanStack API access
- No custom wrapper to maintain

**Cons:**
- 9 pages would need column definition rewrites
- Would lose built-in action buttons (need to add to each page)
- Higher risk of regression
- More work for no user-visible benefit

**Verdict:** Not recommended. The current wrapper adds value.
</recommendation>

<action_plan>
## Action Plan

1. **Delete tanstack-table.tsx**
   - Verify no imports exist (confirmed: 0)
   - Delete file

2. **Delete ui/data-table.tsx**
   - Verify no imports exist (confirmed: 0)
   - Delete file

3. **Verify build**
   - `bun run typecheck`
   - `bun run build`

4. **Verify functionality**
   - Tables still render on all 9 pages
   - Sorting works
   - Pagination works
   - Actions (edit/delete) work

**Estimated impact:**
- Lines removed: ~586
- Pages affected: 0 (no changes to working code)
- Risk: Very low (deleting unused code)
</action_plan>

<sources>
## Sources

### Primary (HIGH confidence)
- Direct code inspection of all 4 table files
- Grep search for import statements across codebase
- Read of component interfaces and implementations

### Verification
- [x] All table files read and analyzed
- [x] Import counts verified with grep
- [x] TanStack Table usage confirmed in data-table.tsx
- [x] No imports found for dead files
</sources>

<metadata>
## Metadata

**Research scope:**
- Codebase: All table component files
- Analysis: Import graph, API surface, feature comparison

**Confidence breakdown:**
- File inventory: HIGH - direct code inspection
- Import analysis: HIGH - grep verification
- Recommendation: HIGH - clear evidence

**Research date:** 2026-01-18
**Valid until:** Indefinite (internal codebase state)
</metadata>

---

*Phase: 43-table-consolidation*
*Research completed: 2026-01-18*
*Ready for planning: yes*
