# Form Implementation Audit

**Date**: 2026-01-09
**Purpose**: Audit all pages with forms for TanStack Form migration complexity

## Summary

- **ResourceDialog pages**: 4 (Accounting, Accounts, Liabilities, Properties)
- **Manual Dialog pages**: 7 (Beneficiaries, Bequests, Contacts, HemsQueue, Settings, Trustees, Vehicles)
- **Total forms**: 11 pages

## Detailed Audit

| Page | Dialog Count | Pattern | Field Count | Field Types | Complexity | Migration Notes |
|------|--------------|---------|-------------|-------------|------------|-----------------|
| **Accounting.tsx** | - | ResourceDialog | 8 | Input, Select, Textarea | Simple | Already uses ResourceDialog + useResourceForm |
| **Accounts.tsx** | - | ResourceDialog | 5 | Input, Select | Simple | Already uses ResourceDialog + useResourceForm |
| **Liabilities.tsx** | - | ResourceDialog (dual) | 6 + 4 | Input, Select | Medium | Two forms: liability + payment dialog |
| **Properties.tsx** | - | ResourceDialog (dual) | 7 + 5 | Input, Select | Medium | Two forms: homestead + rental property |
| **Beneficiaries.tsx** | 4 | Manual Dialog | ~25 | Input (3), Select (22) | Medium | Heavy Select usage, share calculations |
| **Bequests.tsx** | 5 | Manual Dialog | ~20 | Input (2), Select (16), Textarea (2) | Medium | Bequest type selection, description fields |
| **Contacts.tsx** | 8 | Manual Dialog | ~16 | Input (10), Select (5), Textarea (1) | Simple | Standard contact form |
| **HemsQueue.tsx** | 6 | Manual Dialog | ~8 | Input (1), Select (6), Textarea (1) | Simple | HEMS request form, approval workflow |
| **Settings.tsx** | 5 | Manual Dialog | ~14 | Input (4), Select (10) | Medium | Multiple settings forms per section |
| **Trustees.tsx** | 4 | Manual Dialog | ~19 | Input (4), Select (15) | Medium | Trustee succession, date fields |
| **Vehicles.tsx** | 4 | Manual Dialog | ~38 | Input (12), Select (25), Textarea (1) | Complex | Heavy form, vehicle details |

## Form Pattern Analysis

### ResourceDialog Pages (4)

**Current Pattern**:
```typescript
const form = useResourceForm({
  create: createResource,
  update: updateResource,
  defaultValues: { /* defaults */ },
  mode: 'create'
})

<ResourceDialog
  open={showDialog}
  onOpenChange={setShowDialog}
  title={editing ? 'Edit' : 'Create'}
  onSubmit={form.handleSubmit}
  isLoading={form.isLoading}
>
  <Input value={form.values.name} onChange={e => form.setFieldValue('name', e.target.value)} />
  {/* more fields */}
</ResourceDialog>
```

**Characteristics**:
- Uses `useResourceForm` hook for state management
- ResourceDialog provides dialog shell
- Manual field state with `form.values` and `form.setFieldValue`
- Manual validation (minimal or none)
- Error handling via toast (from Phase 3)

### Manual Dialog Pages (7)

**Current Pattern**:
```typescript
const [showDialog, setShowDialog] = useState(false)
const [editing, setEditing] = useState<Resource | null>(null)
const [form, setForm] = useState(defaultForm())

const handleSave = async () => {
  if (editing) {
    await update(editing.id, form)
  } else {
    await create(form)
  }
  setShowDialog(false)
}

<Dialog open={showDialog} onOpenChange={setShowDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>{editing ? 'Edit' : 'Create'}</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
      {/* more fields */}
    </div>
    <DialogFooter>
      <Button onClick={() => setShowDialog(false)}>Cancel</Button>
      <Button onClick={handleSave}>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Characteristics**:
- Manual state management with `useState`
- Manual Dialog construction with shadcn/ui components
- Manual field updates with spread operator
- No validation (or minimal manual checks)
- Custom save handlers

## Field Type Breakdown

### Input Fields
- Text inputs (names, IDs, amounts)
- Date inputs (dates, timestamps)
- Number inputs (amounts, percentages, counts)
- Pattern: `<Input type="text|number|date" value={} onChange={} />`

### Select Fields
- Enum selects (status, type, category)
- Relation selects (entity, beneficiary, trustee)
- Dynamic options based on context
- Pattern: `<Select value={} onValueChange={}><SelectItem value={}>...</SelectItem></Select>`

### Textarea Fields
- Notes, descriptions, comments
- Multi-line text
- Pattern: `<Textarea value={} onChange={} />`

## Validation Patterns

### Current State
- **No formal validation** - Most forms have minimal or no validation
- **Manual checks** - Some forms check required fields manually before submit
- **Server-side errors** - API returns error, shown via toast (Phase 3)
- **No field-level feedback** - Errors shown after submit, not during input

### Opportunity with TanStack Form + Zod
- **Field-level validation** - Real-time feedback as user types
- **Form-level validation** - Comprehensive validation before submit
- **Reuse Drizzle schemas** - Already have Zod schemas from db/validation.ts
- **Type safety** - Full TypeScript inference from Zod schemas

## Migration Complexity Factors

### Simple Forms (3)
- **Pages**: Contacts, HemsQueue, Accounts (ResourceDialog already)
- **Characteristics**: 5-16 fields, straightforward data entry
- **Estimated effort**: 1-2 hours each

### Medium Forms (6)
- **Pages**: Accounting, Liabilities, Properties, Beneficiaries, Bequests, Settings, Trustees
- **Characteristics**: 14-25 fields, some complex logic (dual forms, calculations)
- **Estimated effort**: 2-3 hours each

### Complex Forms (1)
- **Pages**: Vehicles
- **Characteristics**: 38 fields, heavy Select usage
- **Estimated effort**: 3-4 hours

## Migration Batches

### Batch 1: ResourceDialog Forms (Plan 10-07)
**Pages**: Accounting, Accounts, Liabilities, Properties
**Rationale**: Already abstracted with ResourceDialog, update to TanStack Form internally
**Approach**: Migrate useResourceForm hook to use TanStack Form, ResourceDialog stays same
**Total effort**: ~8-10 hours

### Batch 2: Manual Dialog Forms (Plan 10-08)
**Pages**: Contacts, Beneficiaries, Trustees, Vehicles, Bequests, HemsQueue, Settings
**Rationale**: Convert manual Dialog + useState to TanStack Form pattern
**Approach**: Create TanStack Form instance, replace useState with form.Field components
**Total effort**: ~14-18 hours

## Zod Schema Availability

### Existing Drizzle Zod Schemas (db/validation.ts)
All resources have insert schemas:
- `insertAccountSchema` - Bank/investment accounts
- `insertLiabilitySchema` - Liabilities
- `insertLiabilityPaymentSchema` - Payments
- `insertBeneficiarySchema` - Beneficiaries
- `insertContactSchema` - Contacts
- `insertTrusteeSchema` - Trustees
- `insertVehicleSchema` - Vehicles
- `insertBequestSchema` - Bequests
- `insertHemsRequestSchema` - HEMS requests
- `insertTrustAccountingSchema` - Trust accounting
- `insertPropertySchema` - Properties

**Migration benefit**: Can reuse existing Zod schemas with TanStack Form without writing new validation rules!

## Key Patterns to Preserve

### 1. Dialog Opening Pattern
Current:
```typescript
const handleEdit = (item: Resource) => {
  setEditing(item)
  setForm(itemToForm(item))  // Transform entity → form data
  setShowDialog(true)
}

const handleAdd = () => {
  setEditing(null)
  setForm(defaultForm())
  setShowDialog(true)
}
```

TanStack Form:
```typescript
const form = useForm({
  defaultValues: defaultForm(),
  validatorAdapter: zodValidator(),
  validators: {
    onSubmit: insertSchema,
  },
  onSubmit: async ({ value }) => {
    if (editing) {
      await update(editing.id, value)
    } else {
      await create(value)
    }
    setShowDialog(false)
  }
})

const handleEdit = (item: Resource) => {
  setEditing(item)
  form.setValues(itemToForm(item))  // Transform entity → form data
  setShowDialog(true)
}

const handleAdd = () => {
  setEditing(null)
  form.reset()  // Reset to defaults
  setShowDialog(true)
}
```

### 2. Field Rendering Pattern
Current:
```typescript
<div className="space-y-2">
  <Label htmlFor="name">Name</Label>
  <Input
    id="name"
    value={form.name}
    onChange={e => setForm({...form, name: e.target.value})}
  />
</div>
```

TanStack Form:
```typescript
<form.Field
  name="name"
  validators={{
    onBlur: z.string().min(1, 'Name required'),
  }}
>
  {(field) => (
    <div className="space-y-2">
      <Label htmlFor={field.name}>Name</Label>
      <Input
        id={field.name}
        value={field.state.value}
        onChange={e => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
      />
      {field.state.meta.errors && (
        <p className="text-sm text-red-500">{field.state.meta.errors[0]}</p>
      )}
    </div>
  )}
</form.Field>
```

### 3. Select Field Pattern
Current:
```typescript
<Select value={form.type} onValueChange={val => setForm({...form, type: val})}>
  <SelectTrigger><SelectValue /></SelectTrigger>
  <SelectContent>
    <SelectItem value="CHECKING">Checking</SelectItem>
    <SelectItem value="SAVINGS">Savings</SelectItem>
  </SelectContent>
</Select>
```

TanStack Form:
```typescript
<form.Field name="type">
  {(field) => (
    <Select
      value={field.state.value}
      onValueChange={field.handleChange}
    >
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="CHECKING">Checking</SelectItem>
        <SelectItem value="SAVINGS">Savings</SelectItem>
      </SelectContent>
    </Select>
  )}
</form.Field>
```

## Risks and Mitigation

### Risk: Breaking existing form behavior
**Mitigation**: Migrate ResourceDialog forms first (already abstracted), test thoroughly before manual forms

### Risk: Validation rules too strict
**Mitigation**: Use existing Drizzle Zod schemas (already used for API), add `onBlur` validation to avoid intrusive feedback

### Risk: Losing form state on errors
**Mitigation**: TanStack Form maintains state automatically, errors don't clear fields

### Risk: Complex forms (Vehicles) take longer
**Mitigation**: Vehicles goes in Batch 2 last, can adjust approach based on earlier migrations

## Next Steps

1. Create migration strategy document (Task 5)
2. Execute Plan 10-06: Create TanStack Form core setup
3. Execute Plan 10-07: Migrate ResourceDialog forms
4. Execute Plan 10-08: Migrate manual Dialog forms
