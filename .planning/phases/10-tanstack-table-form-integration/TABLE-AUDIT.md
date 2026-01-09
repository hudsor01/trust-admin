# Table Implementation Audit

**Date**: 2026-01-09
**Purpose**: Audit all 16 admin pages for table patterns and migration complexity

## Summary

- **DataTable pages**: 4 (Accounting, Accounts, Liabilities, Properties)
- **Manual Table pages**: 12 (ActivityLog, Beneficiaries, Bequests, Contacts, Dashboard, Distributions, DistributionWizard, HemsQueue, Settings, Trustees, Vehicles)
- **No tables**: AdminLogin (login page)

## Detailed Audit

| Page | Table Count | Uses DataTable | Features | Complexity | Migration Notes |
|------|-------------|----------------|----------|------------|-----------------|
| **Accounting.tsx** | 0 (DataTable) | ✅ | Pagination, inline edit, entity filter, 6 columns | Simple | Already uses DataTable - migrate internally |
| **Accounts.tsx** | 0 (DataTable) | ✅ | Inline edit, entity filter, 5 columns | Simple | Already uses DataTable - migrate internally |
| **Liabilities.tsx** | 0 (DataTable) | ✅ | Inline edit, entity filter, dual tables (liabilities + payments), 6 columns | Medium | Already uses DataTable - migrate internally |
| **Properties.tsx** | 0 (DataTable) | ✅ | Inline edit, entity filter, dual tables (homestead + rentals), 7 columns | Medium | Already uses DataTable - migrate internally |
| **ActivityLog.tsx** | 15 | ❌ | Read-only, chronological, 4 columns (timestamp, user, action, details) | Simple | Single table, no editing - straightforward migration |
| **Beneficiaries.tsx** | 34 | ❌ | Row actions (edit/delete), 8 columns, badges (share %, status) | Medium | High table count, multiple sections |
| **Bequests.tsx** | 28 | ❌ | Row actions, 6 columns, status badges, value display | Medium | Multiple tables, filtering |
| **Contacts.tsx** | 19 | ❌ | Row actions, 5 columns, role badges, entity association | Medium | Contact management, straightforward |
| **Dashboard.tsx** | 15 | ❌ | Multiple summary tables (entities, recent activity, metrics), read-only | Complex | Dashboard layout, multiple small tables |
| **Distributions.tsx** | 49 | ❌ | Complex filtering, 8 columns, status workflow, amount formatting | Complex | Highest table count, workflow-heavy |
| **DistributionWizard.tsx** | 11 | ❌ | Multi-step wizard, summary tables, calculation displays | Complex | Wizard context, needs careful handling |
| **HemsQueue.tsx** | 17 | ❌ | Workflow queue, status badges, 7 columns, approve/deny actions | Medium | Workflow management, status tracking |
| **Settings.tsx** | 34 | ❌ | Multiple settings tables (fees, documents, config), mixed edit/read-only | Complex | Multiple distinct tables per section |
| **Trustees.tsx** | 46 | ❌ | Succession management, 6 columns, status tracking, dates | Complex | High table count, succession logic |
| **Vehicles.tsx** | 21 | ❌ | Row actions, 5 columns, simple CRUD | Simple | Vehicle list, straightforward |

## Feature Analysis

### Common Features Across Pages

**Row Actions** (11 pages):
- Edit/Delete buttons in last column
- Inline handlers or dialog triggers
- Pattern: `onEdit={(item) => handleEdit(item)}`, `onDelete={(item) => handleDelete(item)}`

**Entity Filtering** (4 DataTable pages):
- Entity selector at top
- Filters data by selected entity
- Pattern: `useEffect(() => setCurrentPage(1), [selectedEntity])`

**Status Badges** (6 pages):
- Badge components for status display
- Color coding (green=active, yellow=pending, red=denied)
- Pattern: `<Badge variant={getVariant(status)}>{status}</Badge>`

**Inline Editing** (4 DataTable pages only):
- EditableCell components (removed/not found in audit)
- Current DataTable handles via column configuration
- Pattern: Update handlers passed to DataTable

**Pagination** (1 page):
- Only Accounting.tsx post-Phase 9
- Pattern: `useTrustAccountingPaginated(entityId, { page, pageSize })`

**Sorting** (4 DataTable pages):
- Client-side sorting via DataTable
- Pattern: Sort state in column configuration

### Migration Complexity Factors

**Simple Pages (3)**:
- ActivityLog, Contacts, Vehicles
- Single table, straightforward CRUD
- Row actions only
- ~5-6 columns
- Estimated effort: 1-2 hours each

**Medium Pages (5)**:
- Beneficiaries, Bequests, HemsQueue, Liabilities, Properties
- Multiple tables OR workflow logic
- Status badges, filtering
- ~6-8 columns
- Estimated effort: 2-3 hours each

**Complex Pages (4)**:
- Dashboard, Distributions, DistributionWizard, Settings, Trustees
- Multiple distinct tables per page
- Workflow-heavy OR wizard context OR high table counts (40+)
- Complex filtering and status management
- Estimated effort: 3-4 hours each

## Migration Batches

### Batch 1: Simple Tables (Plan 10-03)
**Pages**: Contacts, Vehicles, ActivityLog
**Rationale**: Single straightforward tables, minimal features
**Total effort**: ~4-5 hours

### Batch 2: Medium Tables (Plan 10-04)
**Pages**: Beneficiaries, Bequests, HemsQueue
**Rationale**: Multiple tables or workflow logic, moderate complexity
**Total effort**: ~7-9 hours

### Batch 3: Complex Tables (Plan 10-05)
**Pages**: Dashboard, Distributions, DistributionWizard, Settings, Trustees
**Rationale**: High table counts, workflow-heavy, or wizard context
**Total effort**: ~12-15 hours

### DataTable Internal Migration (Plan 10-02)
**Component**: `src/components/data-table.tsx`
**Pages affected**: Accounting, Accounts, Liabilities, Properties
**Rationale**: Migrate DataTable to use TanStack Table internally first, then existing pages automatically benefit
**Effort**: ~4-5 hours

## Key Patterns to Preserve

### 1. Column Configuration Pattern
Current DataTable uses:
```typescript
const columns = [
  { key: 'name', header: 'Name', render: (item) => item.name },
  { key: 'amount', header: 'Amount', render: (item) => formatCurrency(item.amount) },
]
```

TanStack Table equivalent:
```typescript
const columns: ColumnDef<T>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => formatCurrency(row.original.amount),
  },
]
```

### 2. Row Actions Pattern
Current:
```typescript
<DataTable
  data={items}
  columns={columns}
  onEdit={(item) => handleEdit(item)}
  onDelete={(item) => handleDelete(item)}
/>
```

TanStack Table:
```typescript
const columns: ColumnDef<T>[] = [
  // ... other columns
  {
    id: 'actions',
    cell: ({ row, table }) => (
      <div>
        <Button onClick={() => table.options.meta?.onEdit(row.original)}>Edit</Button>
        <Button onClick={() => table.options.meta?.onDelete(row.original)}>Delete</Button>
      </div>
    ),
  },
]

const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
  meta: {
    onEdit: handleEdit,
    onDelete: handleDelete,
  }
})
```

### 3. Badge Pattern
Current:
```typescript
render: (item) => <Badge variant={getVariant(item.status)}>{item.status}</Badge>
```

TanStack Table:
```typescript
{
  accessorKey: 'status',
  header: 'Status',
  cell: ({ row }) => <Badge variant={getVariant(row.original.status)}>{row.original.status}</Badge>
}
```

## Risks and Mitigation

### Risk: Breaking inline editing
**Mitigation**: Test DataTable migration thoroughly on 4 pages before proceeding to manual pages

### Risk: Complex pages take longer than estimated
**Mitigation**: Batch structure allows pausing after each batch if needed

### Risk: Losing existing styling
**Mitigation**: TanStack Table wrapper maintains shadcn/ui Table components, preserving Tailwind styling

### Risk: Feature parity issues
**Mitigation**: Document all current features per page, verify each in migration

## Next Steps

1. Complete Form audit (Task 4)
2. Create migration strategy document (Task 5)
3. Execute Plan 10-02: Migrate DataTable component internally
4. Execute Plans 10-03 to 10-05: Migrate manual table pages in batches
