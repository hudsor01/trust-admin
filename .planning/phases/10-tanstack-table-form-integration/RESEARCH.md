# TanStack Table & Form Research

**Date**: 2026-01-09
**Purpose**: Research TanStack Table v8 and TanStack Form patterns for Phase 10 migration

## TanStack Table v8 Research

### Installation

```bash
npm i @tanstack/react-table
```

**Package**: `@tanstack/react-table`
**Compatibility**: React 16.8+, React 17, React 18, React 19

**Important Note**: While the adapter works with React 19, it may not work with the new React Compiler coming with React 19. This may be fixed in future TanStack Table updates.

### Core Concepts

**1. Headless UI Architecture**
- TanStack Table provides logic, NOT UI components
- You control all rendering and styling
- Tree-shakable - import only what you need

**2. Hook-Based API**
```typescript
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table'

const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
})
```

**3. Column Definitions**
```typescript
const columns = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: info => info.getValue(),
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => <button>Edit</button>,
  }
]
```

**4. Modern Rendering Pattern**
- Use `flexRender()` instead of old `cell.render()` approach
- Supports type-safe rendering
- Better TypeScript inference

### Integration with shadcn/ui

**Key Pattern**: TanStack Table for logic + shadcn/ui Table for styling

```typescript
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table'

function DataTable({ data, columns }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
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

**Benefits**:
- Maintains shadcn/ui Tailwind styling
- Full TypeScript type safety
- Flexible column definitions
- Custom cell renderers

### Built-in Features

**Row Models** (tree-shakable imports):
- `getCoreRowModel()` - Base functionality
- `getPaginationRowModel()` - Pagination support
- `getSortedRowModel()` - Sorting support
- `getFilteredRowModel()` - Filtering support
- `getGroupedRowModel()` - Grouping support
- `getExpandedRowModel()` - Row expansion

**Advanced Features**:
- Column resizing
- Column reordering
- Row selection
- Row reordering
- Virtual scrolling
- Global and column filtering
- Multi-column sorting
- Grouping and aggregation

### Inline Editing Support

**Pattern**: Custom cell renderers with state
```typescript
{
  id: 'amount',
  header: 'Amount',
  cell: ({ row, table }) => {
    const [editing, setEditing] = useState(false)
    const [value, setValue] = useState(row.original.amount)

    if (editing) {
      return (
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            table.options.meta?.updateData(row.index, 'amount', value)
            setEditing(false)
          }}
        />
      )
    }

    return <div onClick={() => setEditing(true)}>{value}</div>
  }
}
```

**Table Meta Pattern**:
```typescript
const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
  meta: {
    updateData: (rowIndex, columnId, value) => {
      // Update logic here
    }
  }
})
```

### Example Wrapper Component Structure

```typescript
// src/components/tanstack-table.tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useReactTable, getCoreRowModel, getSortedRowModel, getPaginationRowModel, flexRender, ColumnDef } from '@tanstack/react-table'

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
    getPaginationRowModel: getPaginationRowModel(),
    meta: {
      onEdit,
      onDelete,
    }
  })

  return (
    <div>
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
    </div>
  )
}
```

---

## TanStack Form Research

### Installation

```bash
npm i @tanstack/react-form @tanstack/zod-form-adapter zod
```

**Packages**:
- `@tanstack/react-form` - Core form library (~20kb gzipped)
- `@tanstack/zod-form-adapter` - Zod integration adapter
- `zod` - Schema validation (~12kb gzipped)

**Bundle Size**: ~32kb total (vs Formik + Yup ~45kb)

### Core Concepts

**1. Hook-Based Form Management**
```typescript
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'

const form = useForm({
  defaultValues: { name: '', email: '' },
  validatorAdapter: zodValidator(),
  onSubmit: async ({ value }) => {
    // Handle submission
  }
})
```

**2. Field-Level Component**
```typescript
<form.Field
  name="email"
  validators={{
    onChange: z.string().email('Invalid email'),
  }}
>
  {(field) => (
    <div>
      <Input
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
      />
      {field.state.meta.errors && (
        <span>{field.state.meta.errors[0]}</span>
      )}
    </div>
  )}
</form.Field>
```

### Zod Schema Integration

**Form-Level Validation**:
```typescript
const formSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  email: z.string().email('Invalid email format'),
})

const form = useForm({
  defaultValues: {
    title: '',
    description: '',
    email: '',
  },
  validatorAdapter: zodValidator(),
  validators: {
    onSubmit: formSchema,  // Validate on submit
    onChange: formSchema,  // Validate on change
    onBlur: formSchema,    // Validate on blur
  },
  onSubmit: async ({ value }) => {
    console.log(value) // Fully typed!
  }
})
```

**Field-Level Validation**:
```typescript
<form.Field
  name="email"
  validators={{
    onChange: z.string().email(),
    onBlur: z.string().min(1, 'Required'),
  }}
>
  {(field) => (
    <Input
      value={field.state.value}
      onChange={(e) => field.handleChange(e.target.value)}
      onBlur={field.handleBlur}
    />
  )}
</form.Field>
```

### Integration with shadcn/ui

**Pattern**: TanStack Form field wrapper for shadcn/ui components

```typescript
// FormField wrapper for shadcn/ui Input
function FormField({ form, name, label, validators }) {
  return (
    <form.Field name={name} validators={validators}>
      {(field) => (
        <div className="space-y-2">
          <label htmlFor={field.name}>{label}</label>
          <Input
            id={field.name}
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
          />
          {field.state.meta.errors && (
            <p className="text-sm text-red-500">{field.state.meta.errors[0]}</p>
          )}
        </div>
      )}
    </form.Field>
  )
}
```

**Usage**:
```typescript
<FormField
  form={form}
  name="email"
  label="Email"
  validators={{
    onChange: z.string().email('Invalid email'),
  }}
/>
```

### Validation Strategies

**1. Submit-Only Validation** (least intrusive):
```typescript
validators: {
  onSubmit: formSchema,
}
```

**2. Change Validation** (real-time feedback):
```typescript
validators: {
  onChange: formSchema,
}
```

**3. Blur Validation** (balanced approach):
```typescript
validators: {
  onBlur: formSchema,
}
```

**4. Async Validation**:
```typescript
validators: {
  onChangeAsync: async (value) => {
    const available = await checkUsernameAvailable(value)
    return available ? undefined : 'Username taken'
  }
}
```

### Advanced Features

**1. Field Arrays** (dynamic forms):
```typescript
<form.Field name="tags" mode="array">
  {(field) => (
    <div>
      {field.state.value.map((_, i) => (
        <form.Field key={i} name={`tags[${i}]`}>
          {(subField) => (
            <Input
              value={subField.state.value}
              onChange={(e) => subField.handleChange(e.target.value)}
            />
          )}
        </form.Field>
      ))}
      <button onClick={() => field.pushValue('')}>Add Tag</button>
    </div>
  )}
</form.Field>
```

**2. Dependent Fields**:
```typescript
<form.Subscribe selector={(state) => state.values.country}>
  {(country) => (
    <form.Field name="state">
      {(field) => (
        <Select
          value={field.state.value}
          onChange={(value) => field.handleChange(value)}
        >
          {getStatesForCountry(country).map(state => (
            <option key={state} value={state}>{state}</option>
          ))}
        </Select>
      )}
    </form.Field>
  )}
</form.Subscribe>
```

**3. Error Handling**:
```typescript
// Field-level errors
field.state.meta.errors // Array of error messages

// Form-level errors
form.state.errors // All form errors

// Submission errors
onSubmit: async ({ value }) => {
  try {
    await api.submit(value)
  } catch (error) {
    throw new Error('Submission failed')
  }
}
```

### Example Wrapper Component

```typescript
// src/components/tanstack-form-field.tsx
import { FormApi, FieldApi } from '@tanstack/react-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface FormFieldProps<T> {
  form: FormApi<T>
  name: keyof T & string
  label: string
  validators?: any
}

export function TanStackFormField<T>({ form, name, label, validators }: FormFieldProps<T>) {
  return (
    <form.Field name={name} validators={validators}>
      {(field: FieldApi<T, any>) => (
        <div className="space-y-2">
          <Label htmlFor={field.name}>{label}</Label>
          <Input
            id={field.name}
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

### TypeScript Benefits

**Full Type Inference**:
```typescript
const formSchema = z.object({
  email: z.string().email(),
  age: z.number().min(18),
})

type FormValues = z.infer<typeof formSchema>
// { email: string; age: number }

const form = useForm<FormValues>({
  defaultValues: {
    email: '',
    age: 0,
  },
  onSubmit: async ({ value }) => {
    // value is fully typed as FormValues
    console.log(value.email) // ✓ string
    console.log(value.age)   // ✓ number
  }
})
```

---

## Key Takeaways

### TanStack Table v8
- ✅ Headless UI - full control over styling
- ✅ Tree-shakable - import only needed features
- ✅ TypeScript-first with excellent inference
- ✅ Works with shadcn/ui Table components
- ✅ Built-in sorting, filtering, pagination
- ✅ Inline editing via custom cell renderers
- ⚠️ React 19 Compiler compatibility TBD

### TanStack Form
- ✅ Lightweight (~32kb vs Formik ~45kb)
- ✅ Zod integration via adapter
- ✅ Field-level and form-level validation
- ✅ Multiple validation strategies (submit/change/blur)
- ✅ Full TypeScript type inference
- ✅ Field arrays for dynamic forms
- ✅ Async validation support
- ✅ Works with shadcn/ui Input/Select components

### Migration Strategy Implications
- Both libraries maintain shadcn/ui styling
- Both are TypeScript-first (matches our codebase)
- Both provide wrapper patterns that preserve existing UI
- TanStack Form can reuse existing Drizzle Zod schemas
- TanStack Table column definitions similar to our current DataTable

---

## Sources

### TanStack Table
- [Installation | TanStack Table Docs](https://tanstack.com/table/v8/docs/installation)
- [React Table | TanStack Table React Docs](https://tanstack.com/table/v8/docs/framework/react/react-table)
- [Data Table - shadcn/ui](https://ui.shadcn.com/docs/components/data-table)
- [A Developer's Guide to TanStack Table & ShadCN | Medium](https://medium.com/codetodeploy/a-developers-guide-to-tanstack-table-shadcn-ux-first-data-table-implementation-efea4d56d95b)

### TanStack Form
- [TanStack Form - shadcn/ui](https://ui.shadcn.com/docs/forms/tanstack-form)
- [React TanStack Form Zod Example | TanStack Form Docs](https://tanstack.com/form/latest/docs/framework/react/examples/zod)
- [Effortless Form Validation in React: TanStack, Zod, and shadcn Integration | Medium](https://medium.com/devxtalks/effortless-form-validation-in-react-tanstack-zod-and-shadcn-integration-159bcf4d7f46)
- [Form and Field Validation | TanStack Form React Docs](https://tanstack.com/form/latest/docs/framework/react/guides/validation)
