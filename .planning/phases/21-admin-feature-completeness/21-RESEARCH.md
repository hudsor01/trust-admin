# Phase 21: admin-feature-completeness - Research

**Researched:** 2026-03-10
**Domain:** Trust admin feature completion (accounting reconciliation, contact professional fields, trustee editing)
**Confidence:** HIGH

## Summary

Phase 21 addresses three independent feature gaps -- FEAT-09 (accounting reconciliation), FEAT-10 (contact professional fields), and FEAT-11 (trustee editing). All three are additive UI/API work on existing, well-established patterns. No schema migration is needed -- the DB columns (`reconciled`, `reconciledDate`, `licenseNo`, `barNo`, `coTrusteeId`, `contactId`) already exist in the schema.

The critical finding is that all three features follow the exact same pattern: the backend schema and tRPC routers already support the fields, but the frontend forms/tables do not expose them. FEAT-09 (reconciliation) requires the most work because it needs a new tRPC procedure (bulk reconcile) and visual distinction in the table. FEAT-10 and FEAT-11 are purely additive UI work on existing dialogs.

**Primary recommendation:** Implement all three features as straightforward UI additions on top of existing tRPC update mutations. No schema changes, no new tables, no new routers needed.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FEAT-09 | Trust accounting entries support reconciliation workflow (reconciled flag + date) | DB columns exist (`reconciled` boolean, `reconciledDate` timestamp). tRPC `update` mutation already handles partial updates. Need: new `reconcile` procedure for bulk marking, visual row styling, and reconciliation controls in table. |
| FEAT-10 | Contact fields include licenseNo and barNo for attorneys/CPAs | DB columns exist (`licenseNo` text, `barNo` text). tRPC `update`/`create` already pass through all fields. Need: add fields to ContactDialog (conditional on role), show in ContactDetail and ContactTable. |
| FEAT-11 | Trustee records support coTrusteeId and contactId editing | DB columns exist with FKs (`coTrusteeId` self-ref, `contactId` -> contact). tRPC `update` accepts partial. Form defaults already include `coTrusteeId`. Need: add Select dropdowns to TrusteeDialog, populate from trustee.list and contact.list queries. |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tRPC v11 | 11.x | API layer | Existing project API pattern |
| Drizzle ORM | latest | DB queries | Existing ORM, schema already defines all needed columns |
| React 19 | 19.x | UI framework | Existing project framework |
| shadcn/ui | latest | UI components | Switch, Select, Badge, Table all already imported |
| @tanstack/react-table | latest | Data tables | AccountingTable already uses ColumnDef |
| TanStack Form | latest | Form state | useResourceForm hook wraps it |

### No Additional Dependencies
All three features are implementable with existing project dependencies. No new packages needed.

## Architecture Patterns

### Existing Project Structure (follow exactly)
```
src/app/(admin)/
  accounting/_components/     # AccountingClient, AccountingTable, AccountingDialog
  contacts/_components/       # ContactsClient, ContactTable, ContactDialog, ContactDetail
  trustees/_components/       # TrusteesClient, TrusteeTable, TrusteeDialog
src/server/trpc/routers/
  trustAccounting.ts          # trustAccountingRouter
  contact.ts                  # contactRouter
  trustee.ts                  # trusteeRouter
src/lib/
  form-factory.ts             # trusteeFormDefaults, contactFormDefaults
db/
  schema.ts                   # All columns already exist
  validation.ts               # updateTrustAccountingSchema, updateContactSchema, updateTrusteeSchema
```

### Pattern 1: Inline Editable Table Cells
**What:** Table cells that switch to edit mode on click, save via tRPC mutation
**When to use:** For quick field edits without opening a dialog (reconciliation toggle)
**Example:** (from existing TrusteeTable.tsx)
```typescript
<EditableSelectCell
    value={t.status ?? ''}
    options={STATUS_OPTIONS}
    onSave={async (val) => {
        await onUpdateField(t.id, { status: asTrusteeStatus(val as string) })
    }}
/>
```

### Pattern 2: Switch Toggle for Boolean Fields
**What:** shadcn Switch component bound to tRPC mutation for boolean toggles
**When to use:** For reconciled flag, similar to how distribution tax toggles work (Phase 20)
**Example:** (from Phase 20 distribution tax toggles)
```typescript
<Switch
    checked={entry.reconciled ?? false}
    onCheckedChange={async (checked) => {
        await onUpdateEntry(entry.id, {
            reconciled: checked,
            reconciledDate: checked ? new Date().toISOString() : null,
        })
    }}
/>
```

### Pattern 3: Conditional Form Fields Based on Role/Type
**What:** Fields that appear/disappear based on another field's value
**When to use:** licenseNo/barNo shown only for ATTORNEY/ACCOUNTANT contact types
**Example:** (from AccountingDialog.tsx -- conditional category selection)
```typescript
<formInstance.Subscribe<string>
    selector={(state) => state.values.role}
>
    {(role) =>
        (role === 'ATTORNEY' || role === 'ACCOUNTANT') && (
            <div className="space-y-4">
                {/* licenseNo field */}
                {/* barNo field (ATTORNEY only) */}
            </div>
        )
    }
</formInstance.Subscribe>
```

### Pattern 4: FK Dropdown Populated from Related Query
**What:** Select dropdown populated by another tRPC query (e.g., contact list for trustee.contactId)
**When to use:** For coTrusteeId and contactId dropdowns in TrusteeDialog
**Example:** (from AccountingDialog.tsx -- bankAccountId select)
```typescript
<Select value={field.state.value} onValueChange={(val) => field.handleChange(val)}>
    <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
    <SelectContent>
        {contacts.map((c) => (
            <SelectItem key={c.id} value={c.id.toString()}>
                {c.name} - {ROLE_LABELS[c.role]}
            </SelectItem>
        ))}
    </SelectContent>
</Select>
```

### Anti-Patterns to Avoid
- **Don't create new tRPC routers** -- all three features add to existing routers
- **Don't add schema columns** -- all columns already exist in db/schema.ts
- **Don't run db:push** -- no schema changes means no migration needed
- **Don't add entityId to contact operations** -- contacts are shared across entities (no entityId filter)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Boolean toggle in table | Custom checkbox logic | shadcn Switch with inline tRPC mutation | Matches Phase 20 distribution tax toggle pattern |
| Conditional form fields | Manual show/hide state | formInstance.Subscribe with selector | Already used in AccountingDialog for entryType-conditional fields |
| FK dropdown population | Custom fetch+state | Additional useQuery in parent, pass data as prop | Already used for bankAccounts in AccountingDialog |
| Visual row distinction | Custom CSS classes | cn() with conditional className on TableRow | Standard pattern in project (see amount coloring) |

**Key insight:** Every UI pattern needed in this phase already exists elsewhere in the codebase. The implementation is about replicating proven patterns, not inventing new ones.

## Common Pitfalls

### Pitfall 1: Reconciliation Date Timezone Handling
**What goes wrong:** Setting reconciledDate from client timezone creates inconsistent dates
**Why it happens:** `new Date().toISOString()` uses UTC; form date inputs return local dates
**How to avoid:** Set `reconciledDate` server-side in the tRPC mutation when `reconciled` is toggled to `true`, not on the client. Clear it (set to `null`) when toggled back to `false`.
**Warning signs:** Reconciled dates showing as "wrong day" depending on timezone

### Pitfall 2: Missing licenseNo/barNo in Contact Form Defaults
**What goes wrong:** Editing an existing ATTORNEY contact loses licenseNo/barNo data
**Why it happens:** contactFormDefaults() in form-factory.ts does NOT include `licenseNo` or `barNo` fields
**How to avoid:** Add `licenseNo: ''` and `barNo: ''` to contactFormDefaults(). Also ensure handleEdit() in ContactsClient maps these fields from the Contact record.
**Warning signs:** Fields blank when editing existing contacts that have data

### Pitfall 3: coTrusteeId Circular Reference
**What goes wrong:** Trustee A sets coTrusteeId to Trustee B, then B sets coTrusteeId to A
**Why it happens:** No validation preventing circular co-trustee references
**How to avoid:** Filter the co-trustee dropdown to exclude the current trustee's own ID. The DB FK is a self-reference (`trustee_co_trustee_id_fkey`), which does not prevent cycles.
**Warning signs:** UI showing the same trustee as their own co-trustee option

### Pitfall 4: Trustee contactId Requires Contacts Query
**What goes wrong:** TrusteeDialog needs contact list data but TrusteesClient doesn't fetch it
**Why it happens:** Current TrusteesClient only queries trustee.list, not contact.list
**How to avoid:** Add `trpc.contact.list.useQuery()` to TrusteesClient and pass contacts as prop to TrusteeDialog.
**Warning signs:** Empty dropdown for "Linked Contact" field

### Pitfall 5: Contact Form Payload Missing New Fields
**What goes wrong:** Creating/updating contacts silently drops licenseNo and barNo
**Why it happens:** ContactsClient.onSubmit() explicitly builds a payload object and does not include licenseNo/barNo
**How to avoid:** Add `licenseNo: data.licenseNo || null` and `barNo: data.barNo || null` to the payload in ContactsClient's onSubmit handler.
**Warning signs:** Values saved in form but not persisted to DB

### Pitfall 6: Hardcoded entityId = 1 in TrusteesClient
**What goes wrong:** This is a known code smell (CLEAN-03 in Phase 22) but must not be changed in this phase
**Why it happens:** Single-trust app currently only has entity 1
**How to avoid:** Keep the hardcoded `entityId = 1` for now. Phase 22 addresses this pattern globally.
**Warning signs:** N/A -- functional for current single-entity use case

## Code Examples

### FEAT-09: Reconciliation Toggle in AccountingTable
```typescript
// Add to accountingColumns in AccountingTable.tsx, before the actions column:
{
    id: 'reconciled',
    header: 'Reconciled',
    cell: ({ row }) => (
        <div className="flex items-center gap-2">
            <Switch
                checked={row.original.reconciled ?? false}
                onCheckedChange={(checked) =>
                    onUpdateEntry(row.original.id, {
                        reconciled: checked,
                        reconciledDate: checked ? new Date().toISOString() : null,
                    })
                }
            />
            {row.original.reconciledDate && (
                <span className="text-xs text-muted-foreground">
                    {formatDate(row.original.reconciledDate)}
                </span>
            )}
        </div>
    ),
},
```

### FEAT-09: Visual Distinction for Reconciled Rows
```typescript
// In AccountingTable, add conditional row styling:
<TableRow className={cn(row.original.reconciled && 'bg-muted/50 opacity-75')}>
```
Note: AccountingTable uses DataTable (not manual TableRow), so the row styling needs to go through the DataTable's row className support or the ColumnDef cell wrappers.

### FEAT-10: Conditional Professional Fields in ContactDialog
```typescript
// After the Role field in ContactDialog, add:
<formInstance.Subscribe<string>
    selector={(state) => state.values.role}
>
    {(role) =>
        (role === 'ATTORNEY' || role === 'ACCOUNTANT') && (
            <>
                <formInstance.Field name="licenseNo">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor="licenseNo">
                                {role === 'ATTORNEY' ? 'Bar Number' : 'CPA License No.'}
                            </Label>
                            <Input
                                id="licenseNo"
                                placeholder={role === 'ATTORNEY' ? 'TX Bar #' : 'CPA License #'}
                                value={field.state.value || ''}
                                onChange={(e) => field.handleChange(e.target.value)}
                                onBlur={field.handleBlur}
                            />
                        </div>
                    )}
                </formInstance.Field>
                {role === 'ATTORNEY' && (
                    <formInstance.Field name="barNo">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor="barNo">State Bar Number</Label>
                                <Input
                                    id="barNo"
                                    placeholder="e.g., 24012345"
                                    value={field.state.value || ''}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    onBlur={field.handleBlur}
                                />
                            </div>
                        )}
                    </formInstance.Field>
                )}
            </>
        )
    }
</formInstance.Subscribe>
```

### FEAT-11: Co-Trustee and Contact Dropdowns in TrusteeDialog
```typescript
// TrusteeDialog needs new props:
interface TrusteeDialogProps {
    // ...existing props...
    trustees: { id: number; name: string }[]  // For co-trustee dropdown
    contacts: { id: number; name: string; role: string }[]  // For linked contact
}

// Add after endDate field:
<formInstance.Field name="contactId">
    {(field) => (
        <div className="space-y-2">
            <Label htmlFor="contactId">Linked Contact</Label>
            <Select
                value={field.state.value?.toString() ?? ''}
                onValueChange={(v) => field.handleChange(v === '' ? null : v)}
            >
                <SelectTrigger id="contactId">
                    <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {contacts.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                            {c.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
                Link to a professional contact record
            </p>
        </div>
    )}
</formInstance.Field>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| N/A -- columns exist but unused | Exposing existing schema fields in UI | Phase 21 | Completes feature stubs |

**No deprecated or outdated patterns** -- this phase uses exactly the same UI/API patterns already established in prior phases.

## Open Questions

1. **Should reconciliation be per-entry or bulk?**
   - What we know: The success criteria says "Admin can mark accounting entries as reconciled with a date" -- singular suggests per-entry toggle.
   - Recommendation: Implement as per-entry Switch toggle in the table (simplest, matches Phase 20 distribution toggle pattern). Bulk reconciliation can be a future enhancement.

2. **Should licenseNo and barNo both show for ACCOUNTANT contacts?**
   - What we know: The DB has both fields. Success criteria says "licenseNo and barNo fields for attorney and CPA contact types."
   - Recommendation: Show `licenseNo` for both ATTORNEY and ACCOUNTANT. Show `barNo` for ATTORNEY only (CPAs don't have bar numbers). The `licenseNo` field label should adapt: "Bar Number" for attorneys, "CPA License No." for accountants.

3. **Should the co-trustee dropdown show ALL trustees or only those in the same entity?**
   - What we know: The FK `coTrusteeId` is a self-reference within the trustee table. TrusteesClient already filters by entityId.
   - Recommendation: Show only trustees from the same entity (which is what trustee.list already returns). Filter out the current trustee's own ID to prevent self-reference.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bun:test + @testing-library/react |
| Config file | bunfig.toml (for test setup) |
| Quick run command | `bun test` |
| Full suite command | `bun test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FEAT-09 | Reconciliation toggle renders and fires callback | unit (component) | `bun test tests/components/accounting/AccountingTable.test.tsx` | Exists -- needs new test cases |
| FEAT-09 | Reconciled rows are visually distinct | unit (component) | `bun test tests/components/accounting/AccountingTable.test.tsx` | Exists -- needs new test cases |
| FEAT-10 | licenseNo/barNo fields shown for ATTORNEY/ACCOUNTANT | unit (component) | `bun test tests/components/contacts/ContactDialog.test.tsx` | Does not exist -- Wave 0 |
| FEAT-11 | coTrusteeId and contactId dropdowns render | unit (component) | `bun test tests/components/trustees/TrusteeDialog.test.tsx` | Does not exist -- Wave 0 |

### Sampling Rate
- **Per task commit:** `bun test`
- **Per wave merge:** `bun test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/components/accounting/AccountingTable.test.tsx` -- add reconciliation toggle test cases (file exists, add to it)
- [ ] `tests/components/contacts/ContactDialog.test.tsx` -- covers FEAT-10 conditional field rendering
- [ ] `tests/components/trustees/TrusteeDialog.test.tsx` -- covers FEAT-11 dropdown rendering

## Sources

### Primary (HIGH confidence)
- **Project codebase** -- direct inspection of all relevant files:
  - `db/schema.ts` lines 2085-2180 (trustAccounting table with reconciled/reconciledDate columns)
  - `db/schema.ts` lines 1681-1732 (contact table with licenseNo/barNo columns)
  - `db/schema.ts` lines 1925-2000 (trustee table with coTrusteeId/contactId columns)
  - `db/validation.ts` (updateTrustAccountingSchema, updateContactSchema, updateTrusteeSchema)
  - `src/server/trpc/routers/trustAccounting.ts` (update mutation accepts partial)
  - `src/server/trpc/routers/contact.ts` (update mutation accepts partial)
  - `src/server/trpc/routers/trustee.ts` (update mutation accepts partial)
  - All frontend `_components/` files for accounting, contacts, trustees

### Secondary (MEDIUM confidence)
- **CLAUDE.md project instructions** -- verified architecture patterns, tRPC procedures, component patterns
- **STATE.md accumulated context** -- confirmed prior phase decisions for distribution tax toggles (Pattern reuse)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in use, no new dependencies
- Architecture: HIGH -- all patterns already implemented in other features, direct code inspection confirms
- Pitfalls: HIGH -- identified from direct code reading (missing form defaults, payload gaps, FK constraints)

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable -- no external dependencies, pure internal feature work)
