# Production Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Clean up the Trust Admin codebase for production readiness: config fixes, security headers, structured logging, page component extraction, per-route error boundaries, and component tests.

**Architecture:** Work through four phases in order — config/quality → security → page splitting → tests. Each phase is independently committable. Page splitting follows a strict colocated `_components/` pattern: `page.tsx` becomes a thin orchestrator, all UI logic moves to named components.

**Tech Stack:** Next.js 16 (App Router), React 19, tRPC v11, Drizzle ORM, Bun test runner, @testing-library/react, Happy DOM, Biome linter, Sentry

---

## Key Conventions

### Logger usage
```typescript
// At top of each file that needs logging:
import { logger } from '@/lib/logger'
const log = logger.create('PageName')  // e.g. 'Vehicles', 'Liabilities'

// Replace console.error('Failed to delete:', err) with:
log.error('Failed to delete vehicle', { error: err })

// Replace console.warn('...', data) with:
log.warn('Description of warning', { data })
```

### Component extraction pattern
Each large page gets a `_components/` folder colocated with `page.tsx`:
```
src/app/(admin)/vehicles/
├── page.tsx              # thin: entity state, query hooks, passes props down
├── error.tsx             # per-route error boundary (copied from group-level)
└── _components/
    ├── VehicleTable.tsx  # table + column defs
    └── VehicleDialog.tsx # create/edit form dialog
```

`page.tsx` keeps:
- `trpc.entity.list.useQuery()` + `selectedEntity` state
- Top-level resource query
- Page-level layout (`<div>` wrappers, headings, empty state)
- Imports of sub-components

Everything else (column defs, dialogs, form fields, sections) moves to `_components/`.

### Component test pattern
```typescript
// tests/components/vehicles/VehicleTable.test.tsx
import '../../setup'
import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('ComponentName', () => {
    afterEach(() => cleanup())

    test('renders expected content', () => {
        render(<ComponentName {...props} />)
        expect(screen.getByText('Expected text')).toBeTruthy()
    })
})
```

Run tests: `bun test tests/components/`
Expected: all pass, no failures

### Error boundary (per-route)
Copy the group-level `src/app/(admin)/error.tsx` into each route directory unchanged. No modification needed — the component is already generic.

---

## Phase 1: Config & Quality

### Task 1: Fix dev script and re-enable React Strict Mode

**Files:**
- Modify: `package.json`
- Modify: `next.config.ts`

**Step 1: Remove `--webpack` flag from dev script**

In `package.json`, change:
```json
"dev": "next dev --webpack",
```
to:
```json
"dev": "next dev",
```

**Step 2: Re-enable React Strict Mode**

In `next.config.ts`, change:
```typescript
reactStrictMode: false,
```
to:
```typescript
reactStrictMode: true,
```
Remove the comment above it about the Radix UI issue (it has been resolved in current versions).

**Step 3: Verify dev server starts**

```bash
bun run typecheck
```
Expected: no errors

**Step 4: Commit**

```bash
git add package.json next.config.ts
git commit -m "chore: remove --webpack flag, re-enable React Strict Mode"
```

---

### Task 2: Replace console.error/warn with logger in non-page files

Replace console calls in shared components and hooks first (they're simpler):

**Files:**
- Modify: `src/components/editable-cells.tsx`
- Modify: `src/hooks/use-editable-cell.ts`
- Modify: `src/app/portal/_actions/submitHemsRequest.ts`
- Modify: `src/app/forms/_actions/submitInventoryItem.ts`
- Modify: `src/app/api/inventory/upload/route.ts`
- Modify: `src/lib/uploadthing-server.ts`

**Step 1: Add logger import and module logger to each file**

For each file, add at the top (after existing imports):
```typescript
import { logger } from '@/lib/logger'
const log = logger.create('ModuleName')
```

Use these module names:
- `editable-cells.tsx` → `'EditableCells'`
- `use-editable-cell.ts` → `'EditableCell'`
- `submitHemsRequest.ts` → `'HemsRequest'`
- `submitInventoryItem.ts` → `'Inventory'`
- `upload/route.ts` → `'Upload'`
- `uploadthing-server.ts` → `'UploadThing'`

**Step 2: Replace each console.error call**

Pattern: `console.error('msg', err)` → `log.error('msg', { error: err })`
Pattern: `console.warn('msg', data)` → `log.warn('msg', { data })`

**Step 3: Run lint to verify no issues**

```bash
bun run lint
```
Expected: `No fixes applied`

**Step 4: Run tests**

```bash
bun test tests/
```
Expected: 153 pass, 0 fail

**Step 5: Commit**

```bash
git add src/components/editable-cells.tsx src/hooks/use-editable-cell.ts \
  src/app/portal/_actions/submitHemsRequest.ts \
  src/app/forms/_actions/submitInventoryItem.ts \
  src/app/api/inventory/upload/route.ts \
  src/lib/uploadthing-server.ts
git commit -m "chore: replace console.error with structured logger in shared files"
```

---

### Task 3: Replace console.error with logger in admin page files

**Files (9 pages):**
- Modify: `src/app/(admin)/accounting/page.tsx`
- Modify: `src/app/(admin)/trustees/page.tsx`
- Modify: `src/app/(admin)/liabilities/page.tsx`
- Modify: `src/app/(admin)/beneficiaries/page.tsx`
- Modify: `src/app/(admin)/dashboard/page.tsx`
- Modify: `src/app/(admin)/properties/page.tsx`
- Modify: `src/app/(admin)/accounts/page.tsx`
- Modify: `src/app/(admin)/vehicles/page.tsx`
- Modify: `src/app/(admin)/bequests/page.tsx`

**Step 1: For each page file, add logger import and module-level logger**

```typescript
import { logger } from '@/lib/logger'
const log = logger.create('PageName')  // e.g. 'Accounting', 'Vehicles'
```

**Step 2: Replace each `console.error('Failed to ...', error)` with `log.error('Failed to ...', { error })`**

**Step 3: Run lint**

```bash
bun run lint
```
Expected: `No fixes applied`

**Step 4: Commit**

```bash
git add src/app/\(admin\)/
git commit -m "chore: replace console.error with structured logger in admin pages"
```

---

## Phase 2: Security

### Task 4: Add Content-Security-Policy header

**Files:**
- Modify: `next.config.ts`

**Step 1: Add CSP to the `securityHeaders` array**

Find the `securityHeaders` array in `next.config.ts`. Add this entry at the end of the array (before the closing `]`):

```typescript
{
    key: 'Content-Security-Policy',
    value: [
        "default-src 'self'",
        // Next.js requires unsafe-inline for styles and unsafe-eval for dev HMR
        // In production, unsafe-eval can be removed if not needed by any dependency
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        // UploadThing CDN domains
        "img-src 'self' data: blob: https://utfs.io https://*.ufs.sh",
        "font-src 'self'",
        // Sentry ingest + Neon Auth + self for tRPC
        "connect-src 'self' https://*.ingest.sentry.io https://*.neon.tech wss://*.neon.tech",
        "frame-ancestors 'none'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
    ].join('; '),
},
```

**Step 2: Remove the now-redundant `X-Frame-Options` header**

`frame-ancestors 'none'` in CSP supersedes `X-Frame-Options: DENY`. Find and remove the `X-Frame-Options` entry from `securityHeaders` to avoid duplication.

**Step 3: Run typecheck**

```bash
bun run typecheck
```
Expected: no errors

**Step 4: Commit**

```bash
git add next.config.ts
git commit -m "security: add Content-Security-Policy header, remove redundant X-Frame-Options"
```

---

## Phase 3: Page Splitting

For each of the 9 pages, follow these steps. Complete one page fully (including its error.tsx and tests) before moving to the next.

**General steps for each page:**
1. Read the full `page.tsx` to identify extractable sections
2. Create `_components/` directory
3. Extract each component into its own file
4. Slim down `page.tsx` to a thin orchestrator
5. Add `error.tsx`
6. Run typecheck to catch any import issues
7. Commit

---

### Task 5: Split `/vehicles` page (smallest — use as template)

**Files:**
- Modify: `src/app/(admin)/vehicles/page.tsx`
- Create: `src/app/(admin)/vehicles/_components/VehicleTable.tsx`
- Create: `src/app/(admin)/vehicles/_components/VehicleDialog.tsx`
- Create: `src/app/(admin)/vehicles/error.tsx`

**Step 1: Read the full vehicles page**

```bash
cat src/app/\(admin\)/vehicles/page.tsx
```

Identify these regions:
- Column definitions (`columnDefs` or `columns` array) → `VehicleTable.tsx`
- The `<ResourceDialog>` or form JSX for create/edit → `VehicleDialog.tsx`
- The DataTable rendering → `VehicleTable.tsx`

**Step 2: Create `VehicleTable.tsx`**

Move column definitions and the DataTable render into this component:
```typescript
'use client'

// imports from page.tsx that VehicleTable needs

interface VehicleTableProps {
    vehicles: Vehicle[]
    isLoading: boolean
    onEdit: (vehicle: Vehicle) => void
    onDelete: (id: number) => void
    onUpdate: (id: number, data: Partial<Vehicle>) => void
    selectedEntity: number
}

export function VehicleTable({ vehicles, isLoading, onEdit, onDelete, onUpdate, selectedEntity }: VehicleTableProps) {
    // column definitions
    // return <DataTable ... />
}
```

**Step 3: Create `VehicleDialog.tsx`**

Move the create/edit dialog JSX:
```typescript
'use client'

interface VehicleDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    form: ReturnType<typeof useResourceForm>  // adjust type to match
    onSubmit: () => void
    isSubmitting: boolean
    editingVehicle: Vehicle | null
    selectedEntity: number
}

export function VehicleDialog({ ... }: VehicleDialogProps) {
    // form fields JSX
}
```

**Step 4: Slim down `page.tsx`**

`page.tsx` should only contain:
- All hook calls (must stay at top level of the page component)
- `selectedEntity` setup
- The layout wrapper
- Imports of `VehicleTable` and `VehicleDialog`

**Step 5: Add `error.tsx`**

Copy the group-level error boundary:
```bash
cp src/app/\(admin\)/error.tsx src/app/\(admin\)/vehicles/error.tsx
```

**Step 6: Verify types**

```bash
bun run typecheck
```
Expected: no errors

**Step 7: Commit**

```bash
git add src/app/\(admin\)/vehicles/
git commit -m "refactor(vehicles): extract VehicleTable and VehicleDialog components"
```

---

### Task 6: Split `/bequests` page

**Files:**
- Modify: `src/app/(admin)/bequests/page.tsx`
- Create: `src/app/(admin)/bequests/_components/BequestTable.tsx`
- Create: `src/app/(admin)/bequests/_components/BequestDialog.tsx`
- Create: `src/app/(admin)/bequests/error.tsx`

Follow the same pattern as Task 5. Components to extract:
- `BequestTable` — column defs + DataTable for specific bequests
- `BequestDialog` — create/edit dialog with form fields

```bash
bun run typecheck && git add src/app/\(admin\)/bequests/ && git commit -m "refactor(bequests): extract BequestTable and BequestDialog components"
```

---

### Task 7: Split `/trustees` page

**Files:**
- Modify: `src/app/(admin)/trustees/page.tsx`
- Create: `src/app/(admin)/trustees/_components/TrusteeTable.tsx`
- Create: `src/app/(admin)/trustees/_components/TrusteeDialog.tsx`
- Create: `src/app/(admin)/trustees/_components/FeeScheduleSection.tsx`
- Create: `src/app/(admin)/trustees/error.tsx`

Components to extract:
- `TrusteeTable` — trustee list with column defs
- `TrusteeDialog` — create/edit form
- `FeeScheduleSection` — fee schedule card(s) if present

```bash
bun run typecheck && git add src/app/\(admin\)/trustees/ && git commit -m "refactor(trustees): extract Trustee components"
```

---

### Task 8: Split `/contacts` page

**Files:**
- Modify: `src/app/(admin)/contacts/page.tsx`
- Create: `src/app/(admin)/contacts/_components/ContactTable.tsx`
- Create: `src/app/(admin)/contacts/_components/ContactDialog.tsx`
- Create: `src/app/(admin)/contacts/_components/ContactDetail.tsx`
- Create: `src/app/(admin)/contacts/error.tsx`

Components to extract:
- `ContactTable` — searchable contact list
- `ContactDialog` — create/edit form
- `ContactDetail` — side panel / detail view if present

```bash
bun run typecheck && git add src/app/\(admin\)/contacts/ && git commit -m "refactor(contacts): extract Contact components"
```

---

### Task 9: Split `/hems` page

**Files:**
- Modify: `src/app/(admin)/hems/page.tsx`
- Create: `src/app/(admin)/hems/_components/HemsHistoryTable.tsx`
- Create: `src/app/(admin)/hems/_components/HemsDetailSheet.tsx`
- Create: `src/app/(admin)/hems/_components/ApprovalDialog.tsx`
- Create: `src/app/(admin)/hems/error.tsx`

Components to extract:
- `HemsHistoryTable` — distribution history table
- `HemsDetailSheet` — detail/side sheet for a selected request
- `ApprovalDialog` — approve/deny dialog

```bash
bun run typecheck && git add src/app/\(admin\)/hems/ && git commit -m "refactor(hems): extract HEMS history components"
```

---

### Task 10: Split `/users` page

**Files:**
- Modify: `src/app/(admin)/users/page.tsx`
- Create: `src/app/(admin)/users/_components/UserTable.tsx`
- Create: `src/app/(admin)/users/_components/UserProvisionDialog.tsx`
- Create: `src/app/(admin)/users/_components/UserDetailSheet.tsx`
- Create: `src/app/(admin)/users/error.tsx`

Components to extract:
- `UserTable` — user list with role badges
- `UserProvisionDialog` — create user with temp password form
- `UserDetailSheet` — detail panel for selected user

```bash
bun run typecheck && git add src/app/\(admin\)/users/ && git commit -m "refactor(users): extract User management components"
```

---

### Task 11: Split `/dashboard` page

**Files:**
- Modify: `src/app/(admin)/dashboard/page.tsx`
- Create: `src/app/(admin)/dashboard/_components/TaskList.tsx`
- Create: `src/app/(admin)/dashboard/_components/TaskDialog.tsx`
- Create: `src/app/(admin)/dashboard/_components/AccountingSummary.tsx`
- Create: `src/app/(admin)/dashboard/_components/NotesPanel.tsx`
- Create: `src/app/(admin)/dashboard/error.tsx`

Components to extract:
- `TaskList` — administrative task list with checkboxes
- `TaskDialog` — add/edit task dialog
- `AccountingSummary` — income/expense summary card
- `NotesPanel` — trustee notes section

```bash
bun run typecheck && git add src/app/\(admin\)/dashboard/ && git commit -m "refactor(dashboard): extract Dashboard components"
```

---

### Task 12: Split `/accounting` page

**Files:**
- Modify: `src/app/(admin)/accounting/page.tsx`
- Create: `src/app/(admin)/accounting/_components/AccountingLedger.tsx`
- Create: `src/app/(admin)/accounting/_components/EntryDialog.tsx`
- Create: `src/app/(admin)/accounting/_components/ConversionDialog.tsx`
- Create: `src/app/(admin)/accounting/_components/ReportPanel.tsx`
- Create: `src/app/(admin)/accounting/error.tsx`

Components to extract:
- `AccountingLedger` — the main income/expense table
- `EntryDialog` — add/edit accounting entry form
- `ConversionDialog` — income-to-principal conversion dialog
- `ReportPanel` — report generation section

```bash
bun run typecheck && git add src/app/\(admin\)/accounting/ && git commit -m "refactor(accounting): extract Accounting components"
```

---

### Task 13: Split `/beneficiaries` page

**Files:**
- Modify: `src/app/(admin)/beneficiaries/page.tsx`
- Create: `src/app/(admin)/beneficiaries/_components/BeneficiaryTable.tsx`
- Create: `src/app/(admin)/beneficiaries/_components/BeneficiaryDialog.tsx`
- Create: `src/app/(admin)/beneficiaries/_components/DistributionDialog.tsx`
- Create: `src/app/(admin)/beneficiaries/_components/DeathDialog.tsx`
- Create: `src/app/(admin)/beneficiaries/error.tsx`

Components to extract:
- `BeneficiaryTable` — beneficiary list with share %
- `BeneficiaryDialog` — create/edit beneficiary form
- `DistributionDialog` — record distribution dialog
- `DeathDialog` — mark beneficiary deceased dialog

```bash
bun run typecheck && git add src/app/\(admin\)/beneficiaries/ && git commit -m "refactor(beneficiaries): extract Beneficiary components"
```

---

### Task 14: Split `/accounts` page

**Files:**
- Modify: `src/app/(admin)/accounts/page.tsx`
- Create: `src/app/(admin)/accounts/_components/BankAccountTable.tsx`
- Create: `src/app/(admin)/accounts/_components/InvestmentAccountTable.tsx`
- Create: `src/app/(admin)/accounts/_components/AccountDialog.tsx`
- Create: `src/app/(admin)/accounts/error.tsx`

Components to extract:
- `BankAccountTable` — bank account list with inline editing
- `InvestmentAccountTable` — investment account list
- `AccountDialog` — shared create/edit dialog (or two separate ones if forms differ significantly)

```bash
bun run typecheck && git add src/app/\(admin\)/accounts/ && git commit -m "refactor(accounts): extract Account components"
```

---

### Task 15: Split `/properties` page

**Files:**
- Modify: `src/app/(admin)/properties/page.tsx`
- Create: `src/app/(admin)/properties/_components/HomesteadSection.tsx`
- Create: `src/app/(admin)/properties/_components/RentalSection.tsx`
- Create: `src/app/(admin)/properties/_components/PropertyDialog.tsx`
- Create: `src/app/(admin)/properties/_components/ValuationSection.tsx`
- Create: `src/app/(admin)/properties/error.tsx`

Components to extract:
- `HomesteadSection` — homestead card/table
- `RentalSection` — rental properties card/table
- `PropertyDialog` — create/edit dialog (or separate HomesteadDialog + RentalDialog if forms are very different)
- `ValuationSection` — valuation history if present

```bash
bun run typecheck && git add src/app/\(admin\)/properties/ && git commit -m "refactor(properties): extract Property components"
```

---

### Task 16: Split `/liabilities` page (largest)

**Files:**
- Modify: `src/app/(admin)/liabilities/page.tsx`
- Create: `src/app/(admin)/liabilities/_components/LiabilityTable.tsx`
- Create: `src/app/(admin)/liabilities/_components/LiabilityDialog.tsx`
- Create: `src/app/(admin)/liabilities/_components/PaymentDialog.tsx`
- Create: `src/app/(admin)/liabilities/_components/PaymentHistorySheet.tsx`
- Create: `src/app/(admin)/liabilities/error.tsx`

Components to extract:
- `LiabilityTable` — liability list with progress indicators
- `LiabilityDialog` — create/edit liability form
- `PaymentDialog` — record payment form (principal/interest/escrow split)
- `PaymentHistorySheet` — payment history side sheet

```bash
bun run typecheck && git add src/app/\(admin\)/liabilities/ && git commit -m "refactor(liabilities): extract Liability components"
```

---

## Phase 4: Component Tests

### Task 17: Write tests for vehicle components (template)

**Files:**
- Create: `tests/components/vehicles/VehicleTable.test.tsx`
- Create: `tests/components/vehicles/VehicleDialog.test.tsx`

**Step 1: Write VehicleTable tests**

```typescript
// tests/components/vehicles/VehicleTable.test.tsx
import '../../setup'
import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VehicleTable } from '../../../src/app/(admin)/vehicles/_components/VehicleTable'

const mockVehicles = [
    {
        id: 1,
        entityId: 1,
        year: 2020,
        make: 'Toyota',
        model: 'Camry',
        vin: 'ABC123',
        currentBalance: '25000.00',
        status: 'ACTIVE',
        // add other required fields
    },
]

describe('VehicleTable', () => {
    afterEach(() => cleanup())

    test('renders vehicle make and model', () => {
        render(
            <VehicleTable
                vehicles={mockVehicles}
                isLoading={false}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onUpdate={mock(async () => {})}
                selectedEntity={1}
            />
        )
        expect(screen.getByText('Toyota')).toBeTruthy()
        expect(screen.getByText('Camry')).toBeTruthy()
    })

    test('shows loading state', () => {
        render(
            <VehicleTable
                vehicles={[]}
                isLoading={true}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onUpdate={mock(async () => {})}
                selectedEntity={1}
            />
        )
        // adjust selector to match your loading indicator
        expect(screen.getByRole('status')).toBeTruthy()
    })

    test('calls onDelete when delete is triggered', async () => {
        const onDelete = mock(() => {})
        const user = userEvent.setup()
        render(
            <VehicleTable
                vehicles={mockVehicles}
                isLoading={false}
                onEdit={mock(() => {})}
                onDelete={onDelete}
                onUpdate={mock(async () => {})}
                selectedEntity={1}
            />
        )
        // Find and click delete button - adjust selector to match implementation
        const deleteBtn = screen.getByRole('button', { name: /delete/i })
        await user.click(deleteBtn)
        expect(onDelete).toHaveBeenCalledWith(1)
    })
})
```

**Step 2: Run tests**

```bash
bun test tests/components/vehicles/
```
Expected: all pass

**Step 3: Write VehicleDialog tests**

Focus on: renders with empty form, renders with existing vehicle data for edit mode, calls onSubmit with form values.

**Step 4: Run all tests**

```bash
bun test tests/
```
Expected: all existing + new tests pass

**Step 5: Commit**

```bash
git add tests/components/vehicles/
git commit -m "test(vehicles): add VehicleTable and VehicleDialog component tests"
```

---

### Tasks 18–25: Write tests for remaining extracted components

Repeat the Task 17 pattern for each of the 8 remaining pages. For each page, create a `tests/components/<page-name>/` directory with at minimum:
- A table component test (render check, empty state, interaction)
- A dialog component test (open/close, form validation behavior)

Pages in order:
- Task 18: `tests/components/bequests/`
- Task 19: `tests/components/trustees/`
- Task 20: `tests/components/contacts/`
- Task 21: `tests/components/hems/`
- Task 22: `tests/components/users/`
- Task 23: `tests/components/dashboard/`
- Task 24: `tests/components/accounting/`
- Task 25: `tests/components/beneficiaries/`
- Task 26: `tests/components/accounts/`
- Task 27: `tests/components/properties/`
- Task 28: `tests/components/liabilities/`

For each page, commit after tests pass:
```bash
bun test tests/
git add tests/components/<page-name>/
git commit -m "test(<page>): add component tests for extracted components"
```

---

## Final Verification

### Task 29: Full verification pass

**Step 1: Run linter**
```bash
bun run lint
```
Expected: `No fixes applied`

**Step 2: Run TypeScript**
```bash
bun run typecheck
```
Expected: no errors

**Step 3: Run all tests**
```bash
bun test tests/
```
Expected: all pass (significantly more than 153 after new component tests)

**Step 4: Verify git log is clean**
```bash
git log --oneline chore/codebase-cleanup ^main
```
Expected: a series of clean, focused commits

**Step 5: Final commit if any loose ends**
```bash
git add -A
git status  # verify nothing unexpected
```

---

## Summary of Changes

| Category | Files changed | Commits |
|----------|-------------|---------|
| Config & quality | package.json, next.config.ts, 14 source files | 3 |
| Security | next.config.ts | 1 |
| Page splitting (9 pages) | ~45 files created/modified | 12 |
| Error boundaries | 9 error.tsx files | included in page commits |
| Component tests | ~20+ test files | 11 |
| **Total** | **~80 files** | **~27 commits** |
