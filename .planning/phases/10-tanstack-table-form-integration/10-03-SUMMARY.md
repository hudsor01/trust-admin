---
phase: 10-tanstack-table-form-integration
plan: 03
subsystem: ui
tags: [tanstack-form, zod, validation, migration, page-refactor]
status: PARTIAL

# Dependency graph
requires:
  - phase: 10-tanstack-table-form-integration
    plan: 02
    provides: TanStack Form wrapper library, @tanstack/zod-form-adapter
provides:
  - useResourceForm hook migrated to TanStack Form
  - Pattern established for form migrations
affects: [all-pages-using-forms]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useResourceForm: useForm hook with zodValidator + optional schema"
    - "Form reset pattern: formInstance.reset() on close/add"
    - "Form edit pattern: setFieldValue for each field on handleEdit"
    - "Form submission: formInstance.handleSubmit() validates then calls onSubmit"

key-files:
  modified:
    - src/hooks/use-resource-form.ts (migrated to TanStack Form)

key-decisions:
  - "Maintain backward compatibility: Keep existing interface (isOpen, form, setForm, handleEdit, etc.)"
  - "Add formInstance to return value for TanStack Form Field components"
  - "Use Object.entries to update form fields in handleEdit (simple pattern for now)"
  - "Preserve form/setForm for pages not yet migrated to formInstance"

issues-created:
  - "Contacts and Vehicles pages require full refactor to useResourceForm + TanStack Form (not just validation addition)"
  - "Plan 10-03 scope underestimated - expected simple validation addition, discovered full page migrations needed"

# Metrics
duration: PARTIAL (stopped at 1/4 tasks)
completed: 2026-01-09
---

# Phase 10 Plan 03: Form Migration Batch 1 - PARTIAL Summary

**Migrate Contacts and Vehicles pages to TanStack Form with Zod validation**

## Status: PARTIAL COMPLETION

Only 1 of 4 tasks completed. Discovered scope larger than expected.

## Performance

- **Duration:** 10 min (partial)
- **Started:** 2026-01-09T15:35:00Z
- **Stopped:** 2026-01-09T15:45:00Z (context constraints)
- **Tasks completed:** 1/4
- **Files modified:** 1 (use-resource-form.ts)

## Accomplishments

- ✅ **Task 1**: Migrated useResourceForm hook to TanStack Form
- ⏳ **Task 2**: Contacts page migration (NOT COMPLETED - requires full refactor)
- ⏹️ **Task 3**: Vehicles page migration (NOT STARTED)
- ⏹️ **Task 4**: Testing (NOT STARTED)

## Task Commits

1. **Task 1: Update useResourceForm to TanStack Form** - `0e1d1e3` (feat)

## Implementation Details

### useResourceForm Migration

Successfully migrated the core hook to use TanStack Form while maintaining backward compatibility:

**Added features**:
- TanStack Form instance using useForm hook
- zodValidator integration
- Optional Zod schema for validation (onBlur strategy)
- formInstance exposed in return value for Field components

**Maintained interface**:
- isOpen, open, close, form, setForm (existing state management)
- handleEdit, handleAdd, handleSave (existing handlers)
- isSubmitting (existing loading state)
- isEditing flag (existing editing detection)

**Implementation pattern**:
```typescript
export interface UseResourceFormOptions<T> {
  initialData: T
  onSubmit: (data: T) => Promise<void>
  schema?: ZodSchema<T> // NEW: Optional Zod schema
}

export interface UseResourceFormReturn<T> {
  // ... existing properties
  formInstance: ReturnType<typeof useForm<T>> // NEW: TanStack Form instance
}

export function useResourceForm<T>({
  initialData,
  onSubmit,
  schema, // NEW
}: UseResourceFormOptions<T>): UseResourceFormReturn<T> {
  // Existing state
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<T | null>(null)
  const [form, setForm] = useState<T>(initialData)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // NEW: TanStack Form instance
  const formInstance = useForm<T>({
    defaultValues: initialData,
    validatorAdapter: zodValidator(),
    validators: schema ? { onBlur: schema } : undefined,
    onSubmit: async ({ value }) => {
      setIsSubmitting(true)
      try {
        await onSubmit(value)
        close()
      } catch (error) {
        throw error
      } finally {
        setIsSubmitting(false)
      }
    },
  })

  const handleEdit = (item: T) => {
    setEditing(item)
    setForm(item)
    // NEW: Update formInstance fields
    Object.entries(item as any).forEach(([key, value]) => {
      formInstance.setFieldValue(key, value)
    })
    setIsOpen(true)
  }

  const handleSave = async () => {
    // NEW: Trigger form validation + submission
    formInstance.handleSubmit()
  }

  // ... rest of implementation
}
```

## Discovered Issues

### Scope Underestimation

**Discovery**: Contacts and Vehicles pages don't use useResourceForm - they have manual Dialog + useState implementations.

**Impact**:
- Expected: Add validation to existing useResourceForm usage
- Actual: Full page refactor needed (manual state → useResourceForm + TanStack Form)
- Effort: 2-3 hours per page vs 30-60 min expected

**Root cause**: Plan 10-03 was created based on incorrect assumption that pages already used useResourceForm.

**Affected pages**:
- Contacts.tsx: 450+ lines, manual Dialog with formData state
- Vehicles.tsx: 700+ lines, manual Dialog with formData state

### Recommended Next Steps

**Option A**: Complete Plan 10-03 with correct scope
- Refactor Contacts page to use useResourceForm + TanStack Form Fields
- Refactor Vehicles page to use useResourceForm + TanStack Form Fields
- Estimated effort: 4-6 hours total

**Option B**: Split Plan 10-03 into smaller plans
- 10-03a: Contacts page refactor (2-3 hours)
- 10-03b: Vehicles page refactor (2-3 hours)
- Benefit: Smaller commits, easier to review

**Option C**: Defer page migrations to Phase 11
- Keep useResourceForm migration (already done)
- Move page refactors to comprehensive migration phase
- Benefit: Don't block Phase 10 progress

## Technical Debt

**Temporary dual-state issue**:
- useResourceForm now has BOTH form/setForm (useState) AND formInstance (TanStack Form)
- This is intentional for backward compatibility during migration
- Once all pages migrated, can remove form/setForm and use only formInstance

**Future cleanup**:
```typescript
// After all pages migrated, simplify to:
export interface UseResourceFormReturn<T> {
  isOpen: boolean
  open: () => void
  close: () => void
  isEditing: boolean
  handleEdit: (item: T) => void
  handleAdd: () => void
  handleSave: () => Promise<void>
  isSubmitting: boolean
  formInstance: ReturnType<typeof useForm<T>> // Only this, no form/setForm
}
```

## Deviations from Plan

**Major deviation**: Stopped after Task 1 due to scope discovery.

**Rationale**:
- useResourceForm migration completed successfully
- Page migrations require significantly more effort than planned
- Need user input on continuation strategy (Options A/B/C above)
- Better to stop and re-plan than continue with incorrect assumptions

## Phase 10 Progress

**Completed**:
- Plan 10-01: Research and Strategy (7 min)
- Plan 10-02: TanStack Table Core Wrapper (15 min)
- Plan 10-03: Form Migration Batch 1 (10 min, PARTIAL)

**Total time**: 32 min
**Plans remaining**: 5/8 (assuming 10-03 continues)

## Next Steps

**Immediate**:
1. Decide on continuation strategy (Options A/B/C)
2. Update plan if needed (split into smaller plans)
3. Continue with form migrations

**After Plan 10-03 complete**:
- Plan 10-04: Table Migration Batch 2
- Plan 10-05: Table Migration Batch 3
- Plan 10-06: TanStack Form Core Setup (may be redundant now)
- Plan 10-07: Form Migration Batch 2
- Plan 10-08: Form Migration Batch 3

---
*Phase: 10-tanstack-table-form-integration*
*Status: In Progress (2/8 plans complete, 1 partial)*
*Completed: 2026-01-09*
