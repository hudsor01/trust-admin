# Component Patterns

Extracted reusable components to eliminate duplication and standardize patterns across the Trust Admin application.

## Overview

This guide documents three component patterns extracted from repetitive code found across 13 resource pages:

- **ResourceDialog** - Generic form dialogs for create/edit workflows (eliminates 76 Dialog instances)
- **SummaryCard** - Metric display cards for dashboard-style summaries
- **DataTable** - Data tables with sorting, actions, and inline editing support

These components provide:
- **Type safety** through TypeScript generics
- **Consistent behavior** across all pages
- **Reduced duplication** (1000+ lines of repetitive code eliminated)
- **Better maintainability** for future development

## Component Catalog

### ResourceDialog

Generic dialog wrapper for resource create/edit forms.

```typescript
interface ResourceDialogProps<T> {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: React.ReactNode
  onSubmit: () => void | Promise<void>
  submitLabel?: string  // default: "Save"
  isLoading?: boolean    // default: false
}
```

**Source:** [`src/components/resource-dialog.tsx`](../src/components/resource-dialog.tsx)

**Key features:**
- Scroll handling for large forms (`max-h-[90vh] overflow-y-auto`)
- Loading state with spinner on submit button
- Cancel and Submit buttons in DialogFooter
- Integrates with `useResourceForm` hook

### SummaryCard

Metric display card with optional icon, trend indicator, and loading states.

```typescript
interface SummaryCardProps {
  title: string
  value: string | number
  icon?: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  isLoading?: boolean
  formatter?: (value: number) => string
}
```

**Source:** [`src/components/summary-card.tsx`](../src/components/summary-card.tsx)

**Key features:**
- Optional icon display (lucide-react)
- Trend indicators with up/down arrows and color coding
- Value formatting via optional formatter function
- Skeleton loading states

### SummaryCardGrid

Responsive grid layout wrapper for SummaryCard components.

```typescript
interface SummaryCardGridProps {
  children: React.ReactNode
  columns?: number  // default: 3
}
```

**Source:** [`src/components/summary-card-grid.tsx`](../src/components/summary-card-grid.tsx)

**Responsive behavior:**
- Mobile: 1 column
- Tablet: 2 columns
- Desktop: N columns (configurable 1-4)

### DataTable

Generic data table with sorting, actions, and column configuration.

```typescript
interface ColumnDef<T> {
  key: string
  header: string
  render?: (item: T) => React.ReactNode
  sortable?: boolean
}

interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
  emptyMessage?: string  // default: "No data available"
  isLoading?: boolean
}
```

**Source:** [`src/components/data-table.tsx`](../src/components/data-table.tsx)

**Key features:**
- Column sorting (clickable headers with visual indicators)
- Type-aware sorting (numbers vs strings)
- Optional Edit/Delete action buttons
- Custom render functions per column
- Skeleton loading states
- Empty state handling

## Usage Patterns

### When to Use ResourceDialog

Use ResourceDialog when:
- Creating or editing a resource (entity, liability, beneficiary, etc.)
- Form has multiple fields that need validation
- Need consistent behavior across create/edit modes

**Common combinations:**
- ResourceDialog + useResourceForm hook
- ResourceDialog + shadcn/ui form components (Input, Select, Textarea)

### When to Use SummaryCard

Use SummaryCard when:
- Displaying key metrics or statistics
- Creating dashboard-style overviews
- Showing aggregated data (totals, counts, averages)

**Common combinations:**
- SummaryCardGrid wrapper for multiple cards
- formatCurrency or formatPercentage for value display
- Lucide icons for visual context

### When to Use DataTable

Use DataTable when:
- Displaying lists of resources
- Need sorting functionality
- Using inline editing (EditableCell components)
- Have Edit/Delete actions per row

**Common combinations:**
- DataTable + EditableCell components (EditableCurrencyCell, EditableTextCell, etc.)
- DataTable + Badge components for status displays
- DataTable + useResourceForm for edit dialogs

## Migration Examples

### Before: Manual Dialog

```typescript
// Before - Repetitive dialog structure in every page
const [showForm, setShowForm] = useState(false)
const [editing, setEditing] = useState<Liability | null>(null)
const [form, setForm] = useState(defaultForm())

<Dialog open={showForm} onOpenChange={setShowForm}>
  <DialogContent className="max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>{editing ? "Edit" : "Add"} Liability</DialogTitle>
    </DialogHeader>
    {/* Form fields */}
    <div className="flex justify-end gap-3 pt-4">
      <Button variant="outline" onClick={() => setShowForm(false)}>
        Cancel
      </Button>
      <Button onClick={handleSave}>Save</Button>
    </div>
  </DialogContent>
</Dialog>
```

### After: ResourceDialog + useResourceForm

```typescript
// After - Clean, reusable pattern
import { ResourceDialog } from "@/components/resource-dialog"
import { useResourceForm } from "@/hooks"

const { isOpen, close, form, setForm, handleEdit, handleAdd, handleSave, isSubmitting } =
  useResourceForm<Liability>({
    initialData: { creditor: "", amount: "0" },
    onSubmit: async (data) => {
      if (isEditing) {
        await updateLiability(editingId, data)
      } else {
        await createLiability(data)
      }
    },
  })

<ResourceDialog
  open={isOpen}
  onOpenChange={close}
  title={isEditing ? "Edit Liability" : "Add Liability"}
  onSubmit={handleSave}
  isLoading={isSubmitting}
>
  {/* Form fields - just the content */}
</ResourceDialog>
```

### Before: Manual Summary Cards

```typescript
// Before - Repetitive Card structures
<div className="grid grid-cols-3 gap-4">
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <DollarSign className="h-4 w-4" />
        Total Liabilities
      </div>
      <div className="text-2xl font-bold">
        {formatCurrency(totalLiabilities.toString())}
      </div>
    </CardContent>
  </Card>
  {/* More cards... */}
</div>
```

### After: SummaryCard + SummaryCardGrid

```typescript
// After - Concise, reusable cards
import { SummaryCard, SummaryCardGrid } from "@/components/summary-card"
import { DollarSign } from "lucide-react"
import { formatCurrency } from "@/utils/formatters"

<SummaryCardGrid columns={3}>
  <SummaryCard
    title="Total Liabilities"
    value={totalLiabilities}
    icon={DollarSign}
    formatter={formatCurrency}
  />
  {/* More cards... */}
</SummaryCardGrid>
```

### Before: Manual Table

```typescript
// Before - Repetitive table structure
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Creditor</TableHead>
      <TableHead>Balance</TableHead>
      <TableHead>Status</TableHead>
      <TableHead className="w-[100px]">Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {liabilities.map((l) => (
      <TableRow key={l.id}>
        <TableCell>{l.creditor}</TableCell>
        <TableCell>
          <EditableCurrencyCell
            value={l.currentBalance}
            onSave={async (val) => await updateLiability(l.id, { currentBalance: val })}
          />
        </TableCell>
        <TableCell><Badge>{l.status}</Badge></TableCell>
        <TableCell>
          <Button onClick={() => handleEdit(l)}>Edit</Button>
          <Button onClick={() => handleDelete(l.id)}>Delete</Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### After: DataTable with Column Configuration

```typescript
// After - Declarative column configuration
import { DataTable, type ColumnDef } from "@/components/data-table"
import { EditableCurrencyCell } from "@/components/editable-cells"

const columns: ColumnDef<Liability>[] = [
  { key: "creditor", header: "Creditor", sortable: true },
  {
    key: "currentBalance",
    header: "Balance",
    sortable: true,
    render: (item) => (
      <EditableCurrencyCell
        value={item.currentBalance}
        onSave={async (val) => await updateLiability(item.id, { currentBalance: val })}
      />
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (item) => <Badge>{item.status}</Badge>,
  },
]

<DataTable
  data={liabilities}
  columns={columns}
  onEdit={handleEdit}
  onDelete={handleDelete}
/>
```

## Best Practices

### TypeScript Usage

**Always use generics for type safety:**

```typescript
// ✅ Good - Type-safe
const columns: ColumnDef<Liability>[] = [...]
const { form, setForm } = useResourceForm<Liability>({ ... })

// ❌ Bad - No type safety
const columns = [...]
const { form, setForm } = useResourceForm({ ... })
```

### Error Handling

**Delegate error handling to onSubmit callback:**

```typescript
const { handleSave } = useResourceForm<Liability>({
  initialData: defaultForm(),
  onSubmit: async (data) => {
    try {
      await createLiability(data)
      // Success toast handled by query hook
    } catch (error) {
      // Error toast handled by query hook
      throw error  // Re-throw to keep isSubmitting state accurate
    }
  },
})
```

### Loading States

**Always provide loading states for better UX:**

```typescript
// Summary cards
<SummaryCard title="Total" value={total} isLoading={loading} />

// Data tables
<DataTable data={items} columns={columns} isLoading={loading} />

// Dialogs
<ResourceDialog ... isLoading={isSubmitting} />
```

### Custom Render Functions

**Use render functions for complex cell content:**

```typescript
const columns: ColumnDef<Liability>[] = [
  // Simple - no render function needed
  { key: "creditor", header: "Creditor" },

  // Complex - use render function
  {
    key: "status",
    header: "Status",
    render: (item) => (
      <Badge variant={STATUS_VARIANTS[item.status]}>
        {item.status}
      </Badge>
    ),
  },
]
```

## Integration Example

Complete page refactor showing all three components together:

```typescript
import { useState, useEffect } from "react"
import { Plus, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ResourceDialog } from "@/components/resource-dialog"
import { SummaryCard, SummaryCardGrid } from "@/components/summary-card"
import { DataTable, type ColumnDef } from "@/components/data-table"
import { EditableCurrencyCell } from "@/components/editable-cells"
import { useEntities, useLiabilities, useResourceForm } from "@/hooks"
import { formatCurrency } from "@/utils/formatters"

export function LiabilitiesPage() {
  const { entities } = useEntities()
  const [selectedEntity, setSelectedEntity] = useState("")
  const { items: liabilities, loading, update, create, remove } = useLiabilities(selectedEntity)

  // Set first entity on load
  useEffect(() => {
    if (entities.length && !selectedEntity) {
      setSelectedEntity(entities[0].id)
    }
  }, [entities])

  // Form state management
  const { isOpen, close, form, setForm, handleEdit, handleAdd, handleSave, isSubmitting } =
    useResourceForm<LiabilityForm>({
      initialData: { creditor: "", currentBalance: "0" },
      onSubmit: async (data) => {
        const payload = { ...data, entityId: selectedEntity }
        if (isEditing) {
          await update(editingId, payload)
        } else {
          await create(payload)
        }
      },
    })

  // Calculate metrics
  const totalLiabilities = liabilities.reduce((sum, l) => sum + parseFloat(l.currentBalance || "0"), 0)
  const activeLiabilities = liabilities.filter((l) => l.status === "ACTIVE")

  // Table configuration
  const columns: ColumnDef<Liability>[] = [
    { key: "creditor", header: "Creditor", sortable: true },
    {
      key: "currentBalance",
      header: "Balance",
      sortable: true,
      render: (item) => (
        <EditableCurrencyCell
          value={item.currentBalance}
          onSave={async (val) => await update(item.id, { currentBalance: val })}
        />
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => <Badge>{item.status}</Badge>,
    },
  ]

  if (!selectedEntity) return <div>Select an entity</div>

  return (
    <div className="p-6 space-y-6">
      {/* Header with entity selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Liabilities</h2>
        {/* Entity selector... */}
      </div>

      {/* Summary cards */}
      <SummaryCardGrid columns={3}>
        <SummaryCard
          title="Total Liabilities"
          value={totalLiabilities}
          icon={DollarSign}
          formatter={formatCurrency}
          isLoading={loading}
        />
        <SummaryCard
          title="Active Debts"
          value={activeLiabilities.length}
          isLoading={loading}
        />
      </SummaryCardGrid>

      {/* Actions */}
      <div className="flex justify-end">
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Liability
        </Button>
      </div>

      {/* Data table */}
      <DataTable
        data={liabilities}
        columns={columns}
        onEdit={handleEdit}
        onDelete={(item) => remove(item.id)}
        isLoading={loading}
      />

      {/* Form dialog */}
      <ResourceDialog
        open={isOpen}
        onOpenChange={close}
        title={isEditing ? "Edit Liability" : "Add Liability"}
        onSubmit={handleSave}
        isLoading={isSubmitting}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="creditor">Creditor</Label>
            <Input
              id="creditor"
              value={form.creditor}
              onChange={(e) => setForm({ ...form, creditor: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="balance">Current Balance</Label>
            <Input
              id="balance"
              type="number"
              value={form.currentBalance}
              onChange={(e) => setForm({ ...form, currentBalance: e.target.value })}
            />
          </div>
        </div>
      </ResourceDialog>
    </div>
  )
}
```

## Migration Checklist

Use this checklist when refactoring pages to adopt new component patterns:

### Pre-Migration

- [ ] Read this documentation and understand component APIs
- [ ] Identify which patterns are used on the target page
- [ ] Review existing functionality that must be preserved

### Step 1: Replace Form Dialogs

- [ ] Identify all Dialog instances used for create/edit forms
- [ ] Import ResourceDialog and useResourceForm hook
- [ ] Replace dialog state management with useResourceForm
- [ ] Move form fields into ResourceDialog children
- [ ] Remove manual button handlers (Cancel/Save) - ResourceDialog provides these
- [ ] Test form submission works for both create and edit modes

### Step 2: Replace Summary Cards

- [ ] Identify Card components displaying metrics or statistics
- [ ] Import SummaryCard and SummaryCardGrid
- [ ] Extract metric calculations into useMemo or derived state
- [ ] Replace Card/CardContent structures with SummaryCard
- [ ] Wrap multiple cards in SummaryCardGrid
- [ ] Add formatters (formatCurrency, formatPercentage) where appropriate
- [ ] Test cards display correctly with real data

### Step 3: Replace Data Tables

- [ ] Identify Table components displaying resource lists
- [ ] Import DataTable and ColumnDef type
- [ ] Define column configuration array with key, header, render, sortable
- [ ] Replace Table/TableHeader/TableBody/TableRow/TableCell with DataTable
- [ ] Move inline editing (EditableCell) into render functions
- [ ] Move Edit/Delete buttons to onEdit/onDelete props
- [ ] Test sorting works for sortable columns
- [ ] Test inline editing still works with EditableCell components

### Step 4: Verify Functionality

- [ ] All forms submit successfully (create and edit)
- [ ] All tables sort correctly when clicking headers
- [ ] All summary cards display correct values
- [ ] Loading states show when fetching data
- [ ] Error states display toast notifications
- [ ] Empty states show appropriate messages

### Step 5: Verify TypeScript

- [ ] No `as any` casts introduced
- [ ] All components have proper generic types
- [ ] Column definitions properly typed with ColumnDef<T>
- [ ] Form data properly typed with useResourceForm<T>
- [ ] Run `bun run tsc --noEmit` to verify compilation

### Step 6: Verify Visual Consistency

- [ ] Page layout matches original design
- [ ] Spacing and padding preserved
- [ ] Colors and typography consistent
- [ ] Responsive behavior maintained
- [ ] No visual regressions

### Post-Migration

- [ ] Delete old, unused code
- [ ] Update any related tests
- [ ] Verify page still works in production build
- [ ] Document any deviations from standard patterns

---

**Need help?** Refer to component source files for implementation details and JSDoc examples:
- [`src/components/resource-dialog.tsx`](../src/components/resource-dialog.tsx)
- [`src/components/summary-card.tsx`](../src/components/summary-card.tsx)
- [`src/components/data-table.tsx`](../src/components/data-table.tsx)
- [`src/hooks/use-resource-form.ts`](../src/hooks/use-resource-form.ts)
