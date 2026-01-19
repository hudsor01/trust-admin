# Phase 10: TanStack Table & Form Integration - Overview

**Status**: Planning
**Objective**: Complete the TanStack ecosystem adoption by integrating TanStack Table and TanStack Form alongside the already-integrated TanStack Query (Phase 8).

## Current State Analysis

### Pages Inventory (16 admin pages)

**Pages using DataTable component (4):**
- ✅ Accounting.tsx - Uses DataTable + ResourceDialog
- ✅ Accounts.tsx - Uses DataTable + ResourceDialog
- ✅ Liabilities.tsx - Uses DataTable + ResourceDialog
- ✅ Properties.tsx - Uses DataTable + ResourceDialog

**Pages using manual Table implementation (12):**
- ActivityLog.tsx - 15 Table instances
- Beneficiaries.tsx - 34 Table instances + 15 Dialog instances
- Bequests.tsx - 28 Table instances + 15 Dialog instances
- Contacts.tsx - 19 Table instances + 21 Dialog instances
- Dashboard.tsx - 15 Table instances
- Distributions.tsx - 49 Table instances
- DistributionWizard.tsx - 11 Table instances
- HemsQueue.tsx - 17 Table instances + 19 Dialog instances
- Settings.tsx - 34 Table instances + 14 Dialog instances
- Trustees.tsx - 46 Table instances + 13 Dialog instances
- Vehicles.tsx - 21 Table instances + 13 Dialog instances

### Form Patterns

**ResourceDialog pattern (4 pages):**
- Uses `useResourceForm` hook
- Manual state management with useState
- Manual validation
- Already extracted in Phase 4

**Manual Dialog forms (8+ pages):**
- Beneficiaries, Contacts, Trustees, Vehicles, Bequests, HemsQueue, Settings
- Each has custom Dialog implementation
- useState for form state
- Manual validation logic

## TanStack Ecosystem

### Already Integrated ✅
- **TanStack Query v5** (Phase 8) - Data fetching, caching, mutations

### To Integrate ⏳
- **TanStack Table v8** - Table UI with sorting, filtering, pagination, column resizing
- **TanStack Form** - Type-safe form state management with validation

## Benefits

### TanStack Table
- **Built-in features**: Sorting, filtering, pagination, column resizing, virtual scrolling
- **Type safety**: Full TypeScript support for columns and data
- **Performance**: Virtual scrolling for large datasets
- **Flexibility**: Headless UI - we control the rendering
- **Consistency**: Unified table behavior across all pages

### TanStack Form
- **Type-safe forms**: Field-level TypeScript inference
- **Zod integration**: Use existing Drizzle Zod schemas for validation
- **Automatic validation**: Field-level and form-level validation
- **Error handling**: Built-in error state management
- **Field arrays**: Better support for dynamic forms
- **Async validation**: Server-side validation support

## Migration Strategy

### Phase 1: TanStack Table (Plans 10-01 to 10-05)

**Approach**: Progressive enhancement
1. Install @tanstack/react-table
2. Create TanStackTable wrapper component (keeps shadcn/ui styling)
3. Migrate DataTable internally to TanStack Table (backward compatible)
4. Migrate manual table pages in batches (simple → complex)

**Batches**:
- Batch 1 (Simple): Contacts, Vehicles, Beneficiaries, Trustees
- Batch 2 (Complex): Dashboard, Bequests, Settings, HemsQueue
- Batch 3 (Workflow): ActivityLog, Distributions, DistributionWizard

### Phase 2: TanStack Form (Plans 10-06 to 10-08)

**Approach**: Integrate with existing patterns
1. Install @tanstack/react-form
2. Create FormField wrapper components for shadcn/ui components
3. Update ResourceDialog to use TanStack Form
4. Migrate pages in batches

**Batches**:
- Batch 1: ResourceDialog pages (Accounting, Accounts, Liabilities, Properties)
- Batch 2: Manual Dialog pages (Contacts, Beneficiaries, Trustees, Vehicles, etc.)

## Detailed Plans

### Plan 10-01: Research and Strategy ✅
- Audit current table and form implementations
- Research TanStack Table v8 patterns and best practices
- Research TanStack Form patterns with Zod integration
- Create detailed migration strategy
- Document component patterns to follow

### Plan 10-02: TanStack Table Core Wrapper
- Install @tanstack/react-table
- Create `<TanStackTable>` wrapper component
- Maintain shadcn/ui Table styling
- Support column definitions with type safety
- Migrate DataTable component to use TanStack Table internally
- Test backward compatibility with existing 4 pages

### Plan 10-03: TanStack Table Migration - Batch 1 (Simple Pages)
- **Contacts.tsx** - Simple contact list table
- **Vehicles.tsx** - Simple vehicle list table
- **Beneficiaries.tsx** - Beneficiary table with inline edits
- **Trustees.tsx** - Trustee succession table

**Pattern**: Simple CRUD tables with edit/delete actions

### Plan 10-04: TanStack Table Migration - Batch 2 (Complex Pages)
- **Dashboard.tsx** - Multiple summary tables
- **Bequests.tsx** - Specific bequest tracking
- **Settings.tsx** - Multiple settings tables (fees, documents)
- **HemsQueue.tsx** - Workflow queue with status badges

**Pattern**: Complex tables with filtering, badges, multiple columns

### Plan 10-05: TanStack Table Migration - Batch 3 (Workflow Pages)
- **ActivityLog.tsx** - Audit log (read-only, chronological)
- **Distributions.tsx** - Distribution history with filtering
- **DistributionWizard.tsx** - Multi-step wizard with summary tables

**Pattern**: Workflow-specific tables with custom requirements

### Plan 10-06: TanStack Form Core Setup
- Install @tanstack/react-form
- Create FormField wrapper components
- Integrate Zod validation with TanStack Form
- Create TanStackResourceDialog wrapper
- Test with one page (Contacts or Vehicles)

### Plan 10-07: TanStack Form Migration - Batch 1 (ResourceDialog)
- **Accounting.tsx** - Trust accounting entries form
- **Accounts.tsx** - Bank and investment account forms
- **Liabilities.tsx** - Liability and payment forms
- **Properties.tsx** - Homestead and rental property forms

**Pattern**: Already use ResourceDialog - update to TanStack Form

### Plan 10-08: TanStack Form Migration - Batch 2 (Manual Dialogs)
- **Contacts.tsx** - Contact form
- **Beneficiaries.tsx** - Beneficiary form
- **Trustees.tsx** - Trustee form
- **Vehicles.tsx** - Vehicle form
- **Bequests.tsx** - Bequest form
- **HemsQueue.tsx** - HEMS request form
- **Settings.tsx** - Multiple forms (trustee fees, documents)

**Pattern**: Convert manual Dialog + useState to TanStack Form

## Success Criteria

### TanStack Table Integration
- [ ] All 16 pages use TanStack Table
- [ ] Consistent column definition pattern across pages
- [ ] Sorting works on all tables
- [ ] Pagination works where implemented
- [ ] Inline editing still works (EditableCells)
- [ ] Performance improved for large datasets
- [ ] TypeScript errors eliminated for table operations

### TanStack Form Integration
- [ ] All form dialogs use TanStack Form
- [ ] Zod schemas integrated for validation
- [ ] Field-level validation working
- [ ] Error messages display correctly
- [ ] Form submission works with mutations
- [ ] Type safety improved for form data
- [ ] Reduced useState boilerplate

### Overall
- [ ] All pages tested manually
- [ ] No regressions in functionality
- [ ] TypeScript compiles without errors
- [ ] Code is more maintainable
- [ ] Consistent patterns across codebase

## Risks & Mitigations

### Risk: Breaking existing functionality
**Mitigation**: Migrate incrementally, test each page after migration, keep backward compatibility where possible

### Risk: TanStack Table learning curve
**Mitigation**: Start with simple pages, create reusable wrapper component, document patterns

### Risk: Form migration complexity
**Mitigation**: Start with ResourceDialog (already abstracted), create clear patterns, migrate in batches

### Risk: Time investment
**Mitigation**: Each plan is independent and deliverable, can pause after any plan if needed

## Dependencies

- **Phase 8 Complete**: TanStack Query already integrated (✅)
- **Phase 4 Complete**: Component patterns extracted (ResourceDialog, DataTable) (✅)
- **Phase 9 Complete**: Pagination infrastructure ready (✅)

## Estimated Effort

- **Research & Strategy** (Plan 10-01): 2-3 hours
- **TanStack Table Core** (Plan 10-02): 4-5 hours
- **Table Migration Batch 1** (Plan 10-03): 6-8 hours (4 pages)
- **Table Migration Batch 2** (Plan 10-04): 6-8 hours (4 pages)
- **Table Migration Batch 3** (Plan 10-05): 4-5 hours (3 pages)
- **TanStack Form Setup** (Plan 10-06): 4-5 hours
- **Form Migration Batch 1** (Plan 10-07): 5-6 hours (4 pages)
- **Form Migration Batch 2** (Plan 10-08): 8-10 hours (7 pages)

**Total**: 39-50 hours (distributed across 8 plans)

## Next Steps

1. Execute Plan 10-01 (Research and Strategy)
2. Create detailed plan files for each sub-plan (10-02 through 10-08)
3. Execute plans sequentially
4. After each plan: commit, test, document
5. After Phase 10 complete: Move to Phase 11 (Quality Verification)

## Note

This phase completes the TanStack ecosystem adoption:
- ✅ **TanStack Query** (Phase 8) - Data fetching
- ⏳ **TanStack Table** (Phase 10) - Table UI
- ⏳ **TanStack Form** (Phase 10) - Form management

After this phase, the application will have a modern, type-safe, and maintainable frontend architecture following industry best practices.
