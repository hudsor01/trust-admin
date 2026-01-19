# TanStack Table & Form Migration Strategy

**Date**: 2026-01-09
**Objective**: Complete TanStack ecosystem adoption (Query → Table → Form)
**Scope**: 16 pages with tables, 11 pages with forms

## Executive Summary

**Current State**:
- ✅ TanStack Query v5 - Integrated in Phase 8
- ❌ Manual shadcn/ui Table - 12 pages use manual implementation
- ❌ DataTable component - 4 pages use wrapper without TanStack Table
- ❌ Manual form state - 7 pages use useState for forms
- ❌ useResourceForm hook - 4 pages use custom hook without TanStack Form

**Target State**:
- ✅ TanStack Query v5 - Data fetching (complete)
- ✅ TanStack Table v8 - All 16 pages use TanStack Table
- ✅ TanStack Form - All 11 form pages use TanStack Form + Zod

**Total Effort**: 53-72 hours across 8 plans

---

## Part 1: TanStack Table Migration Strategy

### High-Level Approach

**Progressive Enhancement Pattern**:
1. Create TanStack Table wrapper that maintains shadcn/ui styling
2. Migrate DataTable component internally (4 pages benefit automatically)
3. Migrate manual table pages in 3 batches (simple → complex)
4. Preserve all existing features (sorting, filtering, inline editing, pagination)
5. Maintain backward compatibility during migration

### Step-by-Step Migration Process

#### Step 1: Install Dependencies (Plan 10-02, Task 1)
```bash
npm i @tanstack/react-table
```

#### Step 2: Create TanStackTable Wrapper (Plan 10-02, Task 2)
**File**: `src/components/tanstack-table.tsx`

**Purpose**: Headless TanStack Table logic + shadcn/ui Table styling

```typescript
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender, ColumnDef } from '@tanstack/react-table'

interface TanStackTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
}

export function TanStackTable<T>({ data, columns, onEdit, onDelete }: TanStackTableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    meta: { onEdit, onDelete }
  })

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map(headerGroup => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map(header => (
              <TableHead key={header.id}>
                {flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map(row => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map(cell => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

#### Step 3: Migrate DataTable Internally (Plan 10-02, Task 3)
**File**: `src/components/data-table.tsx`

**Changes**:
- Replace manual Table implementation with TanStackTable
- Convert column configuration from `{ key, header, render }` to ColumnDef
- Maintain existing props API for backward compatibility
- Test with 4 existing pages (Accounting, Accounts, Liabilities, Properties)

**Before**:
```typescript
const columns = [
  { key: 'name', header: 'Name', render: (item) => item.name },
]
```

**After**:
```typescript
const columns: ColumnDef<T>[] = [
  { accessorKey: 'name', header: 'Name' },
]
```

#### Step 4: Migrate Manual Table Pages (Plans 10-03 to 10-05)

**Process per page**:
1. Read existing table implementation
2. Identify all features (row actions, badges, formatting, etc.)
3. Create ColumnDef array with TanStack Table column structure
4. Replace manual `<Table>` JSX with `<TanStackTable>` component
5. Pass `onEdit` and `onDelete` via meta prop
6. Verify all features work
7. Commit changes

**Column Definition Pattern**:
```typescript
// Standard column
{
  accessorKey: 'name',
  header: 'Name',
}

// Custom cell renderer
{
  accessorKey: 'amount',
  header: 'Amount',
  cell: ({ row }) => formatCurrency(row.original.amount)
}

// Badge column
{
  accessorKey: 'status',
  header: 'Status',
  cell: ({ row }) => <Badge variant={getVariant(row.original.status)}>{row.original.status}</Badge>
}

// Actions column
{
  id: 'actions',
  header: 'Actions',
  cell: ({ row, table }) => (
    <div className="flex gap-2">
      <Button size="sm" onClick={() => table.options.meta?.onEdit(row.original)}>Edit</Button>
      <Button size="sm" variant="destructive" onClick={() => table.options.meta?.onDelete(row.original)}>Delete</Button>
    </div>
  )
}
```

### Inline Editing Strategy

**Current Pattern** (Phase 4 DataTable):
- DataTable accepts `onEdit` and `onDelete` handlers
- Clicking row/cell triggers handler
- Opens dialog with form

**TanStack Table Pattern**:
- Same onEdit/onDelete handlers passed via `meta` prop
- Custom cell renderers can access via `table.options.meta`
- Maintains existing dialog-based editing workflow

**No change needed**: Inline editing via dialogs stays the same, just access pattern changes.

### Styling Preservation Approach

**Key Principle**: TanStack Table is headless - we control all styling

**Implementation**:
- Use shadcn/ui `<Table>`, `<TableHead>`, `<TableCell>` components
- Preserve all Tailwind classes
- Maintain border-collapse, spacing, hover states
- No visual changes - users won't notice difference

### Testing Approach Per Page

**Manual Testing Checklist**:
1. Table renders with all columns
2. Data displays correctly
3. Sorting works (if implemented)
4. Row actions (edit/delete) work
5. Badges/formatting render correctly
6. No console errors
7. No TypeScript errors
8. Visual appearance unchanged

### Migration Batches

#### Batch 1: Simple Tables (Plan 10-03)
**Pages**: Contacts, Vehicles, ActivityLog
**Effort**: ~4-5 hours
**Characteristics**: Single table, 5-6 columns, row actions only

#### Batch 2: Medium Tables (Plan 10-04)
**Pages**: Beneficiaries, Bequests, HemsQueue
**Effort**: ~7-9 hours
**Characteristics**: Multiple tables or workflow logic, 6-8 columns

#### Batch 3: Complex Tables (Plan 10-05)
**Pages**: Dashboard, Distributions, DistributionWizard, Settings, Trustees
**Effort**: ~12-15 hours
**Characteristics**: High table counts (40+), workflow-heavy, or wizard context

---

## Part 2: TanStack Form Migration Strategy

### High-Level Approach

**Integration with Existing Patterns**:
1. Install TanStack Form + Zod adapter
2. Create FormField wrapper components for shadcn/ui
3. Update ResourceDialog to use TanStack Form internally
4. Migrate ResourceDialog pages (4 pages benefit automatically)
5. Migrate manual Dialog pages in 2 batches

### Step-by-Step Migration Process

#### Step 1: Install Dependencies (Plan 10-06, Task 1)
```bash
npm i @tanstack/react-form @tanstack/zod-form-adapter
```

**Note**: `zod` already installed

#### Step 2: Create FormField Wrappers (Plan 10-06, Task 2)

**File**: `src/components/tanstack-form-field.tsx`

```typescript
import { FormApi, FieldApi } from '@tanstack/react-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface FormFieldProps<T> {
  form: FormApi<T>
  name: keyof T & string
  label: string
  type?: 'text' | 'number' | 'date'
  validators?: any
}

export function TanStackFormField<T>({ form, name, label, type = 'text', validators }: FormFieldProps<T>) {
  return (
    <form.Field name={name} validators={validators}>
      {(field: FieldApi<T, any>) => (
        <div className="space-y-2">
          <Label htmlFor={field.name}>{label}</Label>
          <Input
            id={field.name}
            type={type}
            value={field.state.value || ''}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
          />
          {field.state.meta.errors && field.state.meta.errors.length > 0 && (
            <p className="text-sm text-red-500">{field.state.meta.errors[0]}</p>
          )}
        </div>
      )}
    </form.Field>
  )
}
```

**Similar wrappers for**:
- `TanStackSelectField` - Select dropdowns
- `TanStackTextareaField` - Textarea fields
- `TanStackDateField` - Date inputs

#### Step 3: Integrate Zod Schemas (Plan 10-06, Task 3)

**Reuse existing Drizzle Zod schemas** from `db/validation.ts`:

```typescript
import { insertAccountSchema } from '@/db/validation'

const form = useForm({
  defaultValues: {
    name: '',
    accountType: 'CHECKING',
    // ... other fields
  },
  validatorAdapter: zodValidator(),
  validators: {
    onBlur: insertAccountSchema,  // Validate on blur (balanced)
  },
  onSubmit: async ({ value }) => {
    await createAccount(value)
  }
})
```

#### Step 4: Update ResourceDialog (Plan 10-06, Task 4)

**File**: `src/components/resource-dialog.tsx`

**Changes**:
- Accept `form` prop (TanStack Form instance)
- Remove internal state management
- Use `form.handleSubmit()` for submission
- Show loading state from `form.state.isSubmitting`

**Updated API**:
```typescript
<ResourceDialog
  open={showDialog}
  onOpenChange={setShowDialog}
  title="Create Account"
  onSubmit={() => form.handleSubmit()}
  isLoading={form.state.isSubmitting}
>
  <TanStackFormField form={form} name="name" label="Account Name" />
  <TanStackSelectField form={form} name="accountType" label="Type" options={accountTypes} />
</ResourceDialog>
```

#### Step 5: Migrate ResourceDialog Pages (Plan 10-07)

**Pages**: Accounting, Accounts, Liabilities, Properties

**Process per page**:
1. Replace `useResourceForm` hook with `useForm` from TanStack Form
2. Add `validatorAdapter: zodValidator()`
3. Add `validators: { onBlur: insertSchema }` using Drizzle Zod schema
4. Replace manual Input fields with TanStackFormField wrappers
5. Update ResourceDialog props to use form instance
6. Remove manual validation logic (now handled by Zod)
7. Test form submission, validation, error display
8. Commit changes

**Before (useResourceForm)**:
```typescript
const form = useResourceForm({
  create: createAccount,
  update: updateAccount,
  defaultValues: { name: '', accountType: 'CHECKING' },
  mode: 'create'
})

<ResourceDialog onSubmit={form.handleSubmit}>
  <Input value={form.values.name} onChange={e => form.setFieldValue('name', e.target.value)} />
</ResourceDialog>
```

**After (TanStack Form)**:
```typescript
const form = useForm({
  defaultValues: { name: '', accountType: 'CHECKING' },
  validatorAdapter: zodValidator(),
  validators: { onBlur: insertAccountSchema },
  onSubmit: async ({ value }) => {
    if (editing) {
      await updateAccount(editing.id, value)
    } else {
      await createAccount(value)
    }
    setShowDialog(false)
  }
})

<ResourceDialog onSubmit={() => form.handleSubmit()}>
  <TanStackFormField form={form} name="name" label="Name" />
</ResourceDialog>
```

#### Step 6: Migrate Manual Dialog Pages (Plan 10-08)

**Pages**: Contacts, Beneficiaries, Trustees, Vehicles, Bequests, HemsQueue, Settings

**Process per page**:
1. Replace `useState` form state with `useForm` from TanStack Form
2. Add Zod schema validation
3. Replace manual `<Input>` with `<TanStackFormField>` wrappers
4. Replace manual `<Select>` with `<TanStackSelectField>` wrappers
5. Remove manual validation logic
6. Update dialog to use `form.handleSubmit()`
7. Test all form interactions
8. Commit changes

**Before (Manual Dialog)**:
```typescript
const [form, setForm] = useState({ name: '', email: '' })

<Dialog>
  <DialogContent>
    <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
    <Button onClick={handleSave}>Save</Button>
  </DialogContent>
</Dialog>
```

**After (TanStack Form)**:
```typescript
const form = useForm({
  defaultValues: { name: '', email: '' },
  validatorAdapter: zodValidator(),
  validators: { onBlur: insertContactSchema },
  onSubmit: async ({ value }) => {
    await createContact(value)
    setShowDialog(false)
  }
})

<Dialog>
  <DialogContent>
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
      <TanStackFormField form={form} name="name" label="Name" />
      <Button type="submit">Save</Button>
    </form>
  </DialogContent>
</Dialog>
```

### Zod Schema Integration

**Benefit**: Reuse existing Drizzle Zod schemas without writing new validation rules

**Available schemas** (from `db/validation.ts`):
- `insertAccountSchema`
- `insertLiabilitySchema`
- `insertBeneficiarySchema`
- `insertContactSchema`
- `insertTrusteeSchema`
- `insertVehicleSchema`
- `insertBequestSchema`
- `insertHemsRequestSchema`
- `insertTrustAccountingSchema`
- `insertPropertySchema`

**Usage pattern**:
```typescript
import { insertContactSchema } from '@/db/validation'

const form = useForm({
  defaultValues: { /* ... */ },
  validatorAdapter: zodValidator(),
  validators: {
    onBlur: insertContactSchema,  // Validate fields on blur
  },
  onSubmit: async ({ value }) => { /* ... */ }
})
```

### Validation Strategy

**Recommendation**: Use `onBlur` validation (balanced approach)

**Options**:
1. **onSubmit**: Validate only when form submitted (least intrusive)
2. **onBlur**: Validate when field loses focus (balanced)
3. **onChange**: Validate on every keystroke (most intrusive)

**Rationale for onBlur**:
- Doesn't interrupt typing (better UX than onChange)
- Provides feedback before submission (better than onSubmit)
- Industry standard for web forms

### Error Display Pattern

**TanStack Form provides**:
- `field.state.meta.errors` - Array of error messages per field
- `form.state.errors` - All form errors

**Display pattern**:
```typescript
<form.Field name="email" validators={{ onBlur: z.string().email() }}>
  {(field) => (
    <div>
      <Input value={field.state.value} onChange={field.handleChange} onBlur={field.handleBlur} />
      {field.state.meta.errors && field.state.meta.errors.length > 0 && (
        <p className="text-sm text-red-500">{field.state.meta.errors[0]}</p>
      )}
    </div>
  )}
</form.Field>
```

### Testing Approach Per Form

**Manual Testing Checklist**:
1. Form opens with default values
2. Fields accept input correctly
3. Validation errors display on blur
4. Invalid form blocks submission
5. Valid form submits successfully
6. Success closes dialog
7. Error messages clear when fixed
8. TypeScript compiles without errors

### Migration Batches

#### Batch 1: ResourceDialog Forms (Plan 10-07)
**Pages**: Accounting, Accounts, Liabilities, Properties
**Effort**: ~8-10 hours
**Characteristics**: Already abstracted with ResourceDialog, internal migration

#### Batch 2: Manual Dialog Forms (Plan 10-08)
**Pages**: Contacts, Beneficiaries, Trustees, Vehicles, Bequests, HemsQueue, Settings
**Effort**: ~14-18 hours
**Characteristics**: Manual Dialog + useState conversion

---

## Risk Mitigation Strategies

### Risk 1: Breaking Existing Functionality
**Impact**: High
**Mitigation**:
- Migrate incrementally (one page at a time)
- Test thoroughly after each page
- Maintain backward compatibility in wrapper components
- Keep old implementations until new ones verified

### Risk 2: TanStack Table React 19 Compiler Issues
**Impact**: Medium
**Mitigation**:
- Monitor TanStack Table releases for React 19 Compiler support
- App works without compiler (React 19 itself is supported)
- Can upgrade TanStack Table when compiler support added

### Risk 3: Validation Too Strict/Intrusive
**Impact**: Medium
**Mitigation**:
- Use `onBlur` validation (not `onChange`)
- Review Drizzle Zod schemas for overly strict rules
- Adjust schemas if needed (already used for API validation)

### Risk 4: Time Overruns on Complex Pages
**Impact**: Low
**Mitigation**:
- Batch structure allows pausing after each batch
- Complex pages scheduled last (learn from simple pages first)
- Effort estimates include buffer time

### Risk 5: Losing Form State on Errors
**Impact**: Low
**Mitigation**:
- TanStack Form maintains state automatically
- Errors don't clear fields (unlike manual setState patterns)
- Better UX than current implementation

---

## Code Patterns Reference

### TanStack Table Column Definitions

#### Basic Column
```typescript
{ accessorKey: 'name', header: 'Name' }
```

#### Custom Cell
```typescript
{
  accessorKey: 'amount',
  header: 'Amount',
  cell: ({ row }) => formatCurrency(row.original.amount)
}
```

#### Badge Column
```typescript
{
  accessorKey: 'status',
  header: 'Status',
  cell: ({ row }) => <Badge variant={getVariant(row.original.status)}>{row.original.status}</Badge>
}
```

#### Actions Column
```typescript
{
  id: 'actions',
  header: 'Actions',
  cell: ({ row, table }) => (
    <div className="flex gap-2">
      <Button onClick={() => table.options.meta?.onEdit(row.original)}>Edit</Button>
      <Button onClick={() => table.options.meta?.onDelete(row.original)}>Delete</Button>
    </div>
  )
}
```

#### Sortable Column
```typescript
{
  accessorKey: 'date',
  header: 'Date',
  enableSorting: true,
  sortingFn: 'datetime',
}
```

### TanStack Form Field Patterns

#### Text Input Field
```typescript
<form.Field name="name" validators={{ onBlur: z.string().min(1) }}>
  {(field) => (
    <div className="space-y-2">
      <Label>{field.name}</Label>
      <Input value={field.state.value} onChange={field.handleChange} onBlur={field.handleBlur} />
      {field.state.meta.errors?.[0] && <p className="text-sm text-red-500">{field.state.meta.errors[0]}</p>}
    </div>
  )}
</form.Field>
```

#### Select Field
```typescript
<form.Field name="type">
  {(field) => (
    <div className="space-y-2">
      <Label>Type</Label>
      <Select value={field.state.value} onValueChange={field.handleChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="CHECKING">Checking</SelectItem>
          <SelectItem value="SAVINGS">Savings</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )}
</form.Field>
```

#### Number Input
```typescript
<form.Field name="amount" validators={{ onBlur: z.number().positive() }}>
  {(field) => (
    <Input
      type="number"
      value={field.state.value}
      onChange={(e) => field.handleChange(parseFloat(e.target.value))}
      onBlur={field.handleBlur}
    />
  )}
</form.Field>
```

#### Date Input
```typescript
<form.Field name="date">
  {(field) => (
    <Input
      type="date"
      value={field.state.value || ''}
      onChange={(e) => field.handleChange(e.target.value)}
      onBlur={field.handleBlur}
    />
  )}
</form.Field>
```

---

## Success Criteria

### TanStack Table Integration Complete When:
- [ ] All 16 pages use TanStack Table (0 manual Table implementations)
- [ ] All features preserved (sorting, filtering, pagination, inline editing)
- [ ] Visual appearance unchanged (shadcn/ui styling maintained)
- [ ] TypeScript compiles without errors
- [ ] All manual tests pass per page
- [ ] No console errors in browser
- [ ] DataTable component uses TanStack Table internally

### TanStack Form Integration Complete When:
- [ ] All 11 form pages use TanStack Form
- [ ] All forms use Zod validation (reusing Drizzle schemas)
- [ ] Field-level validation works (errors show on blur)
- [ ] Form submission works with mutations
- [ ] Error messages display correctly
- [ ] TypeScript compiles without errors
- [ ] All manual tests pass per form
- [ ] ResourceDialog updated to use TanStack Form

### Overall Success When:
- [ ] Complete TanStack ecosystem (Query + Table + Form)
- [ ] Consistent patterns across all pages
- [ ] Reduced useState boilerplate
- [ ] Improved type safety (full inference)
- [ ] Better UX (validation feedback, form state management)
- [ ] Code is more maintainable
- [ ] No regressions in functionality

---

## Rollback Plan

**If migration encounters critical issues**:

### Per-Page Rollback
- Each page committed separately
- Can revert individual page: `git revert <commit-hash>`
- Other pages unaffected

### Component Rollback
- If DataTable migration fails: revert DataTable component commit
- 4 pages revert to old DataTable automatically
- Manual table pages unaffected

### Full Rollback
- Nuclear option: `git revert <first-commit>..<last-commit>`
- Reverts entire phase
- Project returns to pre-Phase 10 state

**Likelihood**: Low (incremental migration reduces risk)

---

## Timeline Summary

| Plan | Description | Effort | Cumulative |
|------|-------------|--------|------------|
| 10-01 | Research and Strategy | 2-3h | 2-3h |
| 10-02 | TanStack Table Core Wrapper | 4-5h | 6-8h |
| 10-03 | Table Migration Batch 1 (Simple) | 4-5h | 10-13h |
| 10-04 | Table Migration Batch 2 (Medium) | 7-9h | 17-22h |
| 10-05 | Table Migration Batch 3 (Complex) | 12-15h | 29-37h |
| 10-06 | TanStack Form Core Setup | 4-5h | 33-42h |
| 10-07 | Form Migration Batch 1 (ResourceDialog) | 8-10h | 41-52h |
| 10-08 | Form Migration Batch 2 (Manual Dialogs) | 14-18h | 55-70h |

**Total**: 55-70 hours (distributed across 8 plans)

---

## Next Steps

1. ✅ Complete this plan (10-01: Research and Strategy)
2. Execute Plan 10-02: TanStack Table Core Wrapper
3. Execute Plans 10-03 to 10-05: Table migrations (batched)
4. Execute Plan 10-06: TanStack Form Core Setup
5. Execute Plans 10-07 to 10-08: Form migrations (batched)
6. Move to Phase 11: Quality Verification
