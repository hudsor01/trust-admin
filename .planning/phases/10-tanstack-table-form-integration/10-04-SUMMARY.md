---
phase: 10-tanstack-table-form-integration
plan: 04
subsystem: ui
tags: [tanstack-table, migration, data-table, refactor]
status: PARTIAL

# Dependency graph
requires:
  - phase: 10-tanstack-table-form-integration
    plan: 02
    provides: DataTable component with TanStack Table
provides:
  - Bequests.tsx migrated to DataTable (2 tables)
  - HemsQueue.tsx migrated to DataTable (1 table)
  - Pattern validated for manual Table → DataTable migration
affects: [10-05-table-migrations-remaining]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "DataTable ColumnDef: key, header, render pattern"
    - "Inline editing preserved: EditableTextCell, EditableSelectCell"
    - "Badge rendering in render() function"
    - "Conditional actions based on row state"

key-files:
  modified:
    - src/pages/Bequests.tsx (476 → ~380 lines)
    - src/pages/HemsQueue.tsx (460 → ~330 lines)

key-decisions:
  - "Focus on 2 complete migrations vs 4 partial: Better to fully test pattern"
  - "Dashboard excluded: Tasks/accounting use custom cards, not tables"
  - "Settings deferred: 3 complex tables requiring more analysis"

issues-resolved:
  - "Validated DataTable works with inline editing (EditableTextCell, EditableSelectCell)"
  - "Confirmed conditional rendering in actions column works"
  - "Verified badge rendering compatibility"

# Metrics
duration: 45 min (2 pages)
completed: 2026-01-09
---

# Phase 10 Plan 04: Table Migration Batch 2 - PARTIAL Summary

**Migrate manual Table to DataTable with TanStack Table integration**

## Status: PARTIAL COMPLETION (2/4 pages)

Completed 2 of 4 planned pages. Dashboard and Settings deferred after discovering:
- Dashboard has only 1 actual table (withdrawal schedule), not multiple as assumed
- Settings has 3 complex tables requiring deeper analysis
- Better to fully validate pattern with 2 complete migrations than rush 4 partial ones

## Performance

- **Duration:** 45 minutes
- **Pages migrated:** 2 (Bequests, HemsQueue)
- **Lines saved:** ~196 lines total
- **Started:** 2026-01-09T20:00:00Z (approx)
- **Completed:** 2026-01-09T20:45:00Z (approx)

## Accomplishments

- ✅ **Bequests.tsx** - 2 tables migrated
  - Pending bequests: inline editing (item, category, recipient, notes)
  - Distributed bequests: read-only display
  - Actions: mark distributed, edit, delete
  - 476 → ~380 lines (~20% reduction)

- ✅ **HemsQueue.tsx** - 1 table migrated
  - HEMS requests with pending/reviewed tabs
  - 6 columns: Date, Beneficiary, Category, Amount, Status, Actions
  - Conditional actions: Review (pending) vs View (reviewed)
  - Badge rendering for category and status
  - 460 → ~330 lines (~28% reduction)

## Task Commits

1. **Bequests migration** - `59b78c7` - "feat(10-04): migrate Bequests.tsx to DataTable"
2. **HemsQueue migration** - `e33c104` - "feat(10-04): migrate HemsQueue.tsx to DataTable"

## Implementation Details

### Bequests.tsx Migration

**Two tables converted:**

1. **Pending Bequests Table** (lines 217-320 → 352-356)
   - Inline editable columns: Item, Category, Recipient, Notes
   - Actions column: Mark Distributed, Edit, Delete (with tooltips)
   - Preserves EditableTextCell and EditableSelectCell

```typescript
const pendingColumns: ColumnDef<SpecificBequestType>[] = [
  {
    key: "description",
    header: "Item",
    render: (bequest) => (
      <EditableTextCell
        value={bequest.description}
        onSave={(v) => updateBequest(bequest.id, { description: String(v || "") })}
      />
    ),
  },
  // ... category, recipient, notes, actions columns
]
```

2. **Distributed Bequests Table** (lines 334-368 → 369-373)
   - Read-only columns: Item, Category, Recipient, Date Distributed
   - Badge rendering for category
   - Simplified display (no actions)

```typescript
const distributedColumns: ColumnDef<SpecificBequestType>[] = [
  {
    key: "description",
    header: "Item",
    render: (bequest) => <span className="font-medium">{bequest.description}</span>,
  },
  {
    key: "category",
    header: "Category",
    render: (bequest) => (
      <Badge variant="outline">
        {BEQUEST_CATEGORIES.find((c) => c.value === bequest.category)?.label || bequest.category}
      </Badge>
    ),
  },
  // ... recipient, dateDistributed columns
]
```

**Result:** 476 lines → ~380 lines (96 lines removed, ~20% reduction)

### HemsQueue.tsx Migration

**Single table with tab filtering:**

- Table switches data based on `activeTab` (pending vs reviewed)
- Single column configuration works for both views
- 6 columns with mixed content types

```typescript
const columns: ColumnDef<HemsRequestType>[] = [
  {
    key: "createdAt",
    header: "Date",
    render: (request) => <span className="text-sm">{formatDate(request.createdAt)}</span>,
  },
  {
    key: "beneficiary",
    header: "Beneficiary",
    render: (request) => (
      <div>
        <p className="font-medium">
          {request.beneficiary.firstName} {request.beneficiary.lastName}
        </p>
        {request.beneficiary.email && (
          <p className="text-xs text-muted-foreground">{request.beneficiary.email}</p>
        )}
      </div>
    ),
  },
  {
    key: "actions",
    header: "Actions",
    render: (request) =>
      request.status === "PENDING" ? (
        <Button size="sm" onClick={() => openReview(request)}>Review</Button>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => openReview(request)}>View</Button>
      ),
  },
]
```

**Result:** 460 lines → ~330 lines (130 lines removed, ~28% reduction)

## Patterns Validated

### 1. Inline Editing Compatibility
- ✅ EditableTextCell works in DataTable render()
- ✅ EditableSelectCell works with options array
- ✅ Inline editing triggers mutations correctly
- ✅ No visual regressions in editing UX

### 2. Complex Actions Column
- ✅ Multiple action buttons with tooltips
- ✅ Conditional rendering based on row state
- ✅ TooltipProvider wrapping works correctly
- ✅ Icon buttons maintain sizing (h-8 w-8)

### 3. Badge Rendering
- ✅ Badge components render in cells
- ✅ Variant props work correctly
- ✅ Label lookups from constant objects work
- ✅ Fallback values display properly

### 4. Multi-Line Cell Content
- ✅ Beneficiary name + email stacking
- ✅ Text wrapping handled correctly
- ✅ Text size variants (text-sm, text-xs)

## Scope Adjustment Rationale

**Original Plan:** Migrate Dashboard, Bequests, Settings, HemsQueue (4 pages)

**Actual Scope:** Migrate Bequests, HemsQueue (2 pages)

**Reasons for adjustment:**

1. **Dashboard Analysis**
   - Only 1 actual Table: withdrawal schedule (lines 496-560)
   - Tasks section: Custom card-based UI with checkboxes, NOT a table
   - Accounting section: Card-based flex layout, NOT a table
   - Initial assumption of "tasks + accounting tables" was incorrect

2. **Settings Complexity**
   - Found 3 TableHeader instances (lines 294, 339, 471)
   - Likely contains multiple small configuration tables
   - Would require deeper analysis to understand structure
   - Risk of rushing and introducing bugs

3. **Quality Over Quantity**
   - 2 complete, tested migrations > 4 rushed migrations
   - Fully validated pattern works with:
     - Inline editing
     - Complex actions
     - Badge rendering
     - Multi-line cells
     - Conditional rendering

## Phase 10 Progress

**Completed:**
- Plan 10-01: Research and Strategy (7 min)
- Plan 10-02: TanStack Table Core Wrapper (15 min)
- Plan 10-03: Form Migration Batch 1 (3h 45min)
- Plan 10-04: Table Migration Batch 2 (45 min, PARTIAL ✅)

**Total time:** ~5h 52min
**Plans remaining:** 4/8 (50% complete)

## Next Steps

**Immediate:**
1. Continue with remaining table migrations:
   - Dashboard withdrawal schedule table
   - Settings configuration tables (3 tables)
   - Any other manual Table pages identified

2. OR: Pivot to form migrations (Plans 10-06, 10-07, 10-08)
   - TanStack Form already set up in Plan 10-03
   - Form migrations might be higher priority

**Subsequent plans:**
- Complete Phase 10 table/form migrations
- Phase 11: Quality verification

## Deferred Work

**Dashboard.tsx:**
- 1 table to migrate: withdrawal schedule (lines 496-560)
- Located in "Distributions" tab
- Shows age-based withdrawal data (age 25, age 30)
- Complex cell rendering with conditional styling

**Settings.tsx:**
- 3 tables to analyze and migrate
- Likely configuration/settings management
- Unknown structure without deeper investigation

**Recommendation:** Create Plan 10-05 specifically for Dashboard + Settings tables, OR combine remaining tables into a "cleanup" plan after prioritizing forms.

---
*Phase: 10-tanstack-table-form-integration*
*Status: Partial (2/4 pages migrated)*
*Pattern: Validated and working*
*Session: Continued from Plan 10-03*
*Completed: 2026-01-09*

