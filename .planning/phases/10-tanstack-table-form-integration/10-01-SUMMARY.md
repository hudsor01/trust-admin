---
phase: 10-tanstack-table-form-integration
plan: 01
subsystem: ui
tags: [tanstack-table, tanstack-form, zod, research, migration-planning]

# Dependency graph
requires:
  - phase: 09-performance-optimization
    provides: Pagination infrastructure, TanStack Query hooks
  - phase: 08-type-safety-improvements
    provides: Typed resource config, Drizzle Zod schemas
  - phase: 04-component-extraction-patterns
    provides: DataTable, ResourceDialog components
provides:
  - Research documentation for TanStack Table v8 and Form
  - Complete table implementation audit (16 pages)
  - Complete form implementation audit (11 pages)
  - Comprehensive migration strategy document
  - Code patterns and examples for both libraries
affects: [10-02-tanstack-table-core, 10-03-table-batch-1, 10-04-table-batch-2, 10-05-table-batch-3, 10-06-form-setup, 10-07-form-batch-1, 10-08-form-batch-2]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TanStack Table v8 headless UI pattern with shadcn/ui styling"
    - "TanStack Form field-level validation with Zod"
    - "Column definition pattern: ColumnDef with accessorKey/cell"
    - "Form field pattern: form.Field with validators and error display"

key-files:
  created:
    - .planning/phases/10-tanstack-table-form-integration/RESEARCH.md
    - .planning/phases/10-tanstack-table-form-integration/TABLE-AUDIT.md
    - .planning/phases/10-tanstack-table-form-integration/FORM-AUDIT.md
    - .planning/phases/10-tanstack-table-form-integration/MIGRATION-STRATEGY.md
  modified: []

key-decisions:
  - "Use onBlur validation strategy (balanced between onChange and onSubmit)"
  - "Reuse existing Drizzle Zod schemas for form validation"
  - "Progressive enhancement: DataTable internal migration before manual pages"
  - "Batch migration: Simple → Medium → Complex for both tables and forms"

patterns-established:
  - "TanStack Table: flexRender() for type-safe cell rendering"
  - "TanStack Table: meta prop for passing onEdit/onDelete handlers"
  - "TanStack Form: form.Field render prop pattern for field components"
  - "TanStack Form: validatorAdapter with zodValidator() for Zod integration"

issues-created: []

# Metrics
duration: 7min
completed: 2026-01-09
---

# Phase 10 Plan 01: Research and Strategy Summary

**Complete research and planning foundation for TanStack Table v8 and Form migration across 16 table pages and 11 form pages**

## Performance

- **Duration:** 7 min
- **Started:** 2026-01-09T14:30:25Z
- **Completed:** 2026-01-09T14:37:49Z
- **Tasks:** 5
- **Files created:** 4 research/audit/strategy documents

## Accomplishments

- Researched TanStack Table v8 patterns: installation, core concepts, shadcn/ui integration, inline editing, built-in features
- Researched TanStack Form patterns: Zod integration, validation strategies, field-level vs form-level validation
- Audited all 16 admin pages for table implementations: 4 DataTable, 12 manual Table (complexity classification)
- Audited all 11 form pages: 4 ResourceDialog, 7 manual Dialog (field count analysis)
- Created comprehensive migration strategy: 55-70 hours across 8 plans, batched approach, code patterns, risk mitigation

## Task Commits

Each task was committed atomically:

1. **Task 1: Research TanStack Table v8 and Form patterns** - `3e3435b` (docs)
2. **Task 3: Audit table implementations** - `31bb5d5` (docs)
3. **Task 4: Audit form implementations** - `a4fc894` (docs)
4. **Task 5: Document migration strategy** - `0f20543` (docs)

**Plan metadata:** (this commit) (docs: complete plan)

_Note: Tasks 1 and 2 were combined (both research in same document)_

## Files Created/Modified

### Created
- `.planning/phases/10-tanstack-table-form-integration/RESEARCH.md` - TanStack Table v8 and Form patterns (571 lines)
- `.planning/phases/10-tanstack-table-form-integration/TABLE-AUDIT.md` - 16 page table audit (207 lines)
- `.planning/phases/10-tanstack-table-form-integration/FORM-AUDIT.md` - 11 page form audit (319 lines)
- `.planning/phases/10-tanstack-table-form-integration/MIGRATION-STRATEGY.md` - Comprehensive strategy (753 lines)

### Total Documentation
- **1,850 lines** of research, audit, and strategy documentation
- **4 deliverable files** as specified in plan

## Key Findings

### TanStack Table v8
- **Headless UI**: Logic separated from styling - we control all rendering with shadcn/ui components
- **Tree-shakable**: Import only needed features (getCoreRowModel, getSortedRowModel, etc.)
- **TypeScript-first**: Excellent type inference with ColumnDef
- **React 19 compatible**: Works with React 19, React Compiler support TBD
- **Bundle size**: ~20kb for core functionality
- **flexRender pattern**: Modern rendering approach replacing old cell.render()

### TanStack Form
- **Lightweight**: ~32kb total (vs Formik + Yup ~45kb)
- **Zod integration**: Via @tanstack/zod-form-adapter
- **Field-level validation**: Real-time feedback with onBlur/onChange/onSubmit strategies
- **Type inference**: Full TypeScript types from Zod schemas
- **Async validation**: Built-in support for server-side checks
- **Field arrays**: Dynamic form support for repeating fields

### Current Implementation Audit

**Tables**:
- 4 pages use DataTable component (Accounting, Accounts, Liabilities, Properties)
- 12 pages use manual Table implementation (varying complexity: 15-49 instances per page)
- Highest complexity: Distributions (49 instances), Trustees (46 instances)
- Common features: row actions, entity filtering, status badges, inline editing
- Complexity: Simple (3 pages), Medium (5 pages), Complex (4 pages)

**Forms**:
- 4 pages use ResourceDialog with useResourceForm hook
- 7 pages use manual Dialog with useState
- Field counts: 5-38 fields per form
- Most complex: Vehicles (38 fields)
- **No formal validation currently** - opportunity for improvement
- All resources have existing Drizzle Zod schemas (can reuse!)

## Decisions Made

### Validation Strategy
- **Decision**: Use `onBlur` validation for TanStack Form
- **Rationale**: Balanced approach - doesn't interrupt typing (better than onChange) but provides feedback before submission (better than onSubmit)
- **Industry standard**: Most web forms use blur validation

### Schema Reuse
- **Decision**: Reuse existing Drizzle Zod schemas from `db/validation.ts`
- **Rationale**: Already have insertSchema for all 11 resources, no need to duplicate validation rules
- **Benefit**: Consistency between API validation and form validation

### Migration Order
- **Decision**: Migrate DataTable internally first, then manual table pages in batches
- **Rationale**: 4 pages benefit immediately from DataTable migration; proves pattern before touching manual pages
- **Progressive enhancement**: Maintains backward compatibility during migration

### Batching Strategy
- **Decision**: Batch by complexity (Simple → Medium → Complex) for both tables and forms
- **Rationale**: Learn from simple pages first, apply lessons to complex pages; can pause after each batch
- **Risk mitigation**: Incremental approach reduces blast radius of issues

## Migration Strategy Summary

### Part 1: TanStack Table (Plans 10-02 to 10-05)
1. **Plan 10-02**: Create TanStackTable wrapper + migrate DataTable internally (~4-5h)
2. **Plan 10-03**: Batch 1 - Simple pages (Contacts, Vehicles, ActivityLog) (~4-5h)
3. **Plan 10-04**: Batch 2 - Medium pages (Beneficiaries, Bequests, HemsQueue) (~7-9h)
4. **Plan 10-05**: Batch 3 - Complex pages (Dashboard, Distributions, DistributionWizard, Settings, Trustees) (~12-15h)

**Total effort**: 27-34 hours

### Part 2: TanStack Form (Plans 10-06 to 10-08)
1. **Plan 10-06**: Install dependencies + create FormField wrappers + Zod integration (~4-5h)
2. **Plan 10-07**: Batch 1 - ResourceDialog pages (Accounting, Accounts, Liabilities, Properties) (~8-10h)
3. **Plan 10-08**: Batch 2 - Manual Dialog pages (7 pages) (~14-18h)

**Total effort**: 26-33 hours

### Overall Effort
- **Research & Strategy** (this plan): 7 min (planned 2-3h)
- **TanStack Table**: 27-34 hours
- **TanStack Form**: 26-33 hours
- **Total**: 53-67 hours across 8 plans

## Code Patterns Documented

### TanStack Table Column Definition
```typescript
const columns: ColumnDef<T>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => formatCurrency(row.original.amount) },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <Badge>{row.original.status}</Badge> },
  {
    id: 'actions',
    cell: ({ row, table }) => (
      <Button onClick={() => table.options.meta?.onEdit(row.original)}>Edit</Button>
    )
  }
]
```

### TanStack Form Field Pattern
```typescript
const form = useForm({
  defaultValues: { name: '', email: '' },
  validatorAdapter: zodValidator(),
  validators: { onBlur: insertSchema },
  onSubmit: async ({ value }) => { /* submit */ }
})

<form.Field name="email" validators={{ onBlur: z.string().email() }}>
  {(field) => (
    <div>
      <Input
        value={field.state.value}
        onChange={field.handleChange}
        onBlur={field.handleBlur}
      />
      {field.state.meta.errors?.[0] && <p className="text-red-500">{field.state.meta.errors[0]}</p>}
    </div>
  )}
</form.Field>
```

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Next Phase Readiness

**Ready for Plan 10-02**: TanStack Table Core Wrapper

**What's ready**:
- Complete understanding of TanStack Table v8 API and patterns
- Complete understanding of TanStack Form + Zod integration
- Full audit of current implementations (tables and forms)
- Comprehensive migration strategy with code examples
- Batching strategy validated against complexity analysis
- Risk mitigation strategies documented

**Next steps**:
1. Install @tanstack/react-table
2. Create TanStackTable wrapper component (maintains shadcn/ui styling)
3. Migrate DataTable component to use TanStack Table internally
4. Test with 4 existing pages (Accounting, Accounts, Liabilities, Properties)

**Blockers**: None

**Phase progress**: 1/8 plans complete for Phase 10

---

**Sources**:
- [TanStack Table Installation Docs](https://tanstack.com/table/v8/docs/installation)
- [TanStack Table React Docs](https://tanstack.com/table/v8/docs/framework/react/react-table)
- [shadcn/ui Data Table](https://ui.shadcn.com/docs/components/data-table)
- [TanStack Form shadcn/ui](https://ui.shadcn.com/docs/forms/tanstack-form)
- [TanStack Form Zod Example](https://tanstack.com/form/latest/docs/framework/react/examples/zod)
- [TanStack Form Validation Guide](https://tanstack.com/form/latest/docs/framework/react/guides/validation)

---
*Phase: 10-tanstack-table-form-integration*
*Completed: 2026-01-09*
