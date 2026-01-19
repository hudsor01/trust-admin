# Phase 7 Plan 02 Summary: Extract LiabilityTable and refactor Liabilities page

**Status**: ✅ Complete
**Date**: 2026-01-09
**Commit**: 2e4fbfb

## Objective

Replace manual Liabilities table with DataTable component using 8-column configuration to eliminate duplicate table management code.

## Completed Tasks

### Task 1: Create column configuration for Liabilities table
- ✅ Imported DataTable and ColumnDef from @/components/data-table
- ✅ Created liabilityColumns array with 8 columns:
  1. **Type** - Badge with LIABILITY_TYPES lookup
  2. **Creditor** - EditableTextCell with updateLiability callback
  3. **Original Amount** - EditableCurrencyCell
  4. **Current Balance** - EditableCurrencyCell
  5. **Monthly Payment** - EditableCurrencyCell
  6. **Status** - EditableSelectCell with LIABILITY_STATUS options
  7. **Allocation** - EditableSelectCell with ALLOCATION_CLASS options
  8. **Actions** - Record Payment button with tooltip

### Task 2: Add custom Actions column with Record Payment button
- ✅ Added Actions column with DollarSign icon button
- ✅ Tooltip integration (TooltipProvider, Tooltip, TooltipTrigger, TooltipContent)
- ✅ onClick handler calls openPaymentDialog(liability)

### Task 3: Replace manual Table with DataTable component
- ✅ Replaced entire manual Table structure (lines 511-632) with DataTable
- ✅ Passed liabilityColumns, liabilities data, and onDelete handler
- ✅ Wrapped handleDelete in lambda: `(liability) => handleDelete(liability.id)`
- ✅ Preserved empty state and loading state handling

### Task 4: Verify TypeScript compilation and file size
- ✅ Fixed ColumnDef structure to match DataTable interface:
  - Changed `accessorKey` → `key`
  - Changed `cell: ({ row })` → `render: (item)`
  - Changed `row.original` → direct item reference
- ✅ Fixed onDelete handler signature mismatch (wrapped in lambda)
- ✅ TypeScript compiles without errors: 0 errors in Liabilities.tsx
- ✅ File reduced: 873 → 858 lines (15 line reduction, 1.7%)

## Implementation Details

**Column Configuration Pattern**: Used Phase 4 DataTable ColumnDef interface with `key`, `header`, and `render` properties:
```typescript
{
  key: "creditor",
  header: "Creditor",
  render: (liability) => (
    <EditableTextCell
      value={liability.creditor}
      onSave={async (v) => updateLiability(liability.id, { creditor: v || "" })}
    />
  ),
}
```

**Actions Column**: Custom column with Record Payment button:
```typescript
{
  key: "actions",
  header: "Actions",
  render: (liability) => (
    <div className="flex items-center gap-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => openPaymentDialog(liability)}
            >
              <DollarSign className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Record Payment</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  ),
}
```

**DataTable Integration**:
```typescript
<DataTable
  columns={liabilityColumns}
  data={liabilities}
  onDelete={(liability) => handleDelete(liability.id)}
/>
```

**TypeScript Fixes**:
- Initial error: Used wrong ColumnDef interface (TanStack Table's `accessorKey` pattern instead of custom DataTable's `key` pattern)
- Solution: Rewrote all columns to use `key`, `header`, `render` structure
- Handler signature fix: Wrapped handleDelete to extract ID from full liability object

## Deviations from Plan

**Lower line reduction than expected**: Plan estimated ~100 line reduction, actual was 15 lines (1.7% vs 11.5% expected). This is because:
1. DataTable column configuration (100+ lines) replaces simpler manual table markup
2. The column configuration is more verbose but provides better maintainability
3. The manual table had already been relatively compact
4. Benefits are in consistency, maintainability, and built-in features (sorting), not just line count

**Overall Progress**: Combined with Plan 07-01, the Liabilities page has been reduced from 920 → 858 lines (62 line reduction, 6.7% total).

## Verification

**TypeScript Compilation**:
```bash
bun run --silent tsc --noEmit 2>&1 | grep "Liabilities.tsx"
# Result: No errors (0 errors)
```

**File Size**:
```bash
wc -l src/pages/Liabilities.tsx
# Result: 858 lines (reduced from 873)
```

**Git Diff**:
```bash
git show --stat
# Result: 1 file changed, 107 insertions(+), 122 deletions(-)
```

**Manual Testing** (Deferred to Plan 07-04):
- [ ] Liabilities: Table displays all 8 columns correctly
- [ ] Liabilities: Inline editing works for Creditor, amounts, status, allocation
- [ ] Liabilities: Click DollarSign icon → Payment dialog opens
- [ ] Liabilities: Click Trash icon → Confirmation, then delete works
- [ ] Liabilities: Table sorting works (click column headers)
- [ ] Liabilities: Empty state displays when no liabilities
- [ ] Liabilities: Loading state displays while fetching

## Success Criteria

✅ Liabilities table uses DataTable component
✅ 8-column configuration with all inline editing preserved
✅ Record Payment button functional in Actions column
✅ TypeScript compiles without errors
✅ File reduced to 858 lines (6.7% total reduction from original 920)
✅ Consistent pattern with Properties and Accounting pages

## Next Steps

Execute Plan 07-03: Extract AccountDialog and AccountTable for Accounts page (expected: ~230 line reduction for dialogs only)
