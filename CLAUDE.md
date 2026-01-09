# Trust Admin - Project Context
Trust administration application for managing the **Hudson Living Trust**, a Texas Irrevocable Trust. Built for estate settlement and ongoing trust administration with Texas Property Code compliance.
## Tech Stack
| Layer | Technology | Version |
|-|||
| Runtime | **Bun** | latest |
| Frontend | **React** | 19.2.3 |
| Build | **Vite** | 7.3.0 |
| Styling | **TailwindCSS** | 4.1.18 |
| UI Components | **Radix UI** + **shadcn/ui** | various |
| Database | **PostgreSQL** | 15+ |
| ORM | **Drizzle ORM** | 0.45.1 |
| Auth | **Better Auth** (Magic Link) | 1.4.10 |
| Email | **Resend** | 6.6.0 |
| Testing | **Bun Test** | built-in |
## Commands
```bash
# Development (launches both API and UI)
bun run dev              # API on :5050, UI on :5173
bun run dev:api          # API only (port 5050)
bun run dev:ui           # Vite dev server (port 5173)
bun run db:push          # Sync schema (DEVELOPMENT)
bun run db:studio        # Drizzle Studio GUI
bun run db:seed          # Seed Hudson Trust data
bun test                 # Run all tests
bun test --watch         # Watch mode
```
**Important**: Use `bun run db:push` for development, NOT `db:migrate`. Push compares schema and syncs; migrate replays SQL files.
## Project Structure
```
trust-admin/
├── index.ts                 # Bun.serve() API server
├── db/
│   ├── schema.ts
│   ├── queries.ts
│   ├── crud-factory.ts
│   └── helpers.ts
├── src/
│   ├── pages/
│   ├── components/
│   │   ├── ui/             # shadcn/ui components
│   │   └── editable-cells.tsx
│   ├── hooks/
│   ├── lib/
│   │   ├── auth.ts         # Better Auth + Resend config
│   │   ├── auth-client.ts  # React auth hooks
│   │   ├── form-factory.ts # Form utilities
│   │   └── constants.ts    # Status enums, options
│   └── utils/formatters.ts # Currency, date formatters
├── tests/                  # Bun test files
└── drizzle/               # Generated migrations (prod only)
```
## Database Schema (31 Tables)
### Core Entities
- `entity` - Trust/estate container
- `contact` - Professional contacts (attorneys, accountants)
- `contactAssociation` - Links contacts to entities
- `activityLog` - Audit trail
### Assets
- `homestead` - Primary residence (Texas homestead exemption fields)
- `rentalProperty` - Income-producing properties
- `vehicle` - Vehicle assets
- `bankAccount` - Checking, savings, CDs
- `investmentAccount` - Brokerage, IRA, 401k
- `insurancePolicy` - All insurance types
- `personalProperty` - Jewelry, collectibles
- `artwork` - Art with provenance tracking
### Liabilities (Texas 113.152(5))
- `liability` - Mortgages, loans, credit cards, taxes
- `liabilityPayment` - Payment tracking with P&I breakdown
### Trust Accounting
- `trustAccounting` - Income/expense entries (isPrincipal flag)
- `transaction` - Asset transactions (allocationClass: PRINCIPAL/INCOME)
- `valuation` - Asset valuation history
### Beneficiaries & Distributions
- `beneficiary` - HEMS distribution standards
- `distribution` - Actual distributions with 1099 tracking
- `specificBequest` - Specific bequests
- `withdrawalRecord` - Age-based withdrawal tracking
- `hemsRequest` - HEMS request workflow
### Administration
- `trustee` - Trustee info with succession
- `trusteeFeeSchedule` - Fee rate structure
- `trusteeFeeEntry` - Accrued/paid fees
- `document` - All trust documents
- `task` - Administrative tasks
### Authentication (Better Auth)
- `user` - Users with role (admin/beneficiary) and beneficiaryId
- `session` - User sessions
- `account` - OAuth accounts
- `verification` - Email verification tokens
## Texas Property Code Compliance
### Principal vs Income (Texas 116.152)
Fields track allocation for Form 1041 and unitrust accounting:
- `trustAccounting.isPrincipal` - Boolean flag
- `transaction.allocationClass` - ENUM(PRINCIPAL, INCOME)
- `liability.allocationClass` - ENUM(PRINCIPAL, INCOME)
### Homestead Exemption Fields
- `homestead.dodAffidavitFiled` - Affidavit status
- `homestead.dodAffidavitDate` - Filing date
- `homestead.clerkFileNo` - County clerk file number
### Date of Death (DOD) Valuation
All asset tables include:
- `dodValue` - Value at date of death
- `dodValueDate` - Valuation date
- `dodValueType` - APPRAISAL, STATEMENT, MARKET_ESTIMATE, TAX_ASSESSED
## API Patterns
### Route Factory (index.ts)
Generic CRUD handler eliminates duplication for 22 resource types:
```typescript
const resources = {
  "entities": { crud: entityCrud, name: "Entity", customGetById: getEntityById },
  "liabilities": { crud: liabilityCrud, name: "Liability", filterParam: "entityId" },
  // ... 20 more resources
}
```
**Generates endpoints:**
- `GET /api/{resource}` - List all (with optional filter)
- `POST /api/{resource}` - Create
- `GET /api/{resource}/{id}` - Get by ID
- `PUT /api/{resource}/{id}` - Update
- `DELETE /api/{resource}/{id}` - Delete
### Special Endpoints
- `POST /api/liabilities/{id}/record-payment` - Records payment + updates balance + creates expense
- `GET /api/liabilities/{id}/payments` - Payment history
- `POST /api/hems-requests/{id}/approve` - Approve HEMS request
- `POST /api/hems-requests/{id}/deny` - Deny HEMS request
- `GET /api/portal/me` - Authenticated beneficiary data

## UI Patterns
### Inline Editable Cells
Primary pattern for data tables - click to edit directly:
```typescript
<EditableCurrencyCell
  value={liability.currentBalance}
  onSave={(val) => updateLiability(id, { currentBalance: val })}
/>
```
**Available cell types:**
- `EditableTextCell` - Text input
- `EditableCurrencyCell` - Currency formatting
- `EditableSelectCell` - Dropdown with badges
- `EditableDateCell` - Date picker
- `EditableNumberCell` - Numeric input
- `EditablePercentCell` - Percentage input

### Dialog Forms
Complex forms use Radix Dialog with:
- `max-h-[90vh] overflow-y-auto` for scrollable content
- Grid layouts (2-3 columns) for related fields
- Cancel/Save buttons at bottom
### Page Structure
Standard pattern:
1. Header with title and entity selector
2. Summary cards (3-4 metric cards)
3. Action buttons (Add, Export)
4. Data table with inline editing
5. Form dialogs for create/edit

## Authentication (Better Auth + Magic Link)
### Configuration
- **Method**: Magic link (email-based, no passwords)
- **Email Service**: Resend (optional - server runs without it)
- **Session**: 7-day expiration, 24-hour refresh
### Portal Access
- `/portal/login` - Magic link login
- `/portal/dashboard` - Beneficiary view
- `GET /api/portal/me` - Authenticated beneficiary data
### Environment Variables
```bash
DATABASE_URL=postgres://...
BETTER_AUTH_SECRET=<random-string>
RESEND_API_KEY=<optional>
EMAIL_FROM=Trust Admin <admin@domain.com>
```

## Issues Faced & Solutions
### 1. Google Rate Limiting for Email
**Problem**: Gmail/nodemailer hit rate limits quickly during development.
**Solution**: Switched to Resend. Made API key optional so server runs without email in dev.
### 2. TypeScript Enum Casting
**Problem**: `paymentMethod` type 'string | null' not assignable to enum.
**Solution**: Cast explicitly:
```typescript
paymentMethod: (data.paymentMethod as "CHECK" | "ACH" | "WIRE" | "CASH" | "OTHER") || null
```

### 3. API Tests Failing Without Server
**Problem**: Integration tests failed when server wasn't running.
**Solution**: Added `serverAvailable` flag with health check in `beforeAll`:
```typescript
beforeAll(async () => {
  try {
    const response = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(2000) });
    serverAvailable = response.ok;
  } catch { serverAvailable = false; }
});
```

### 4. Date Input Handling
**Problem**: `split()[0]` on undefined date caused errors.
**Solution**: Use nullish coalescing: `today ?? ""`

## Accomplishments
1. **Route Factory Pattern** - Single code path handles 22 CRUD resources
2. **CRUD Factory (db/crud-factory.ts)** - Generic Drizzle operations with filtering
3. **Inline Editable Cells** - Direct table editing without dialogs
4. **Magic Link Auth** - Passwordless beneficiary portal access
5. **Liability Payment Recording** - Auto-creates Trust Accounting expense entries
6. **HEMS Workflow** - Complete request → approval → distribution flow
7. **Texas Property Code Compliance** - Principal/income tracking, homestead fields
8. **DOD Valuation Tracking** - Estate tax basis step-up support

## Pages
### Admin Pages (14)
| Page | Purpose |
|||
| Dashboard | Trust overview, tasks, accounting summary |
| Accounts | Bank and investment accounts |
| Properties | Homestead and rental properties |
| Liabilities | Debts with payment recording |
| Beneficiaries | Beneficiary profiles, withdrawals |
| Distributions | Distribution and withdrawal tracking |
| Accounting | Trust accounting entries |
| Trustees | Trustee management |
| Vehicles | Vehicle assets |
| Bequests | Specific bequests |
| Contacts | Professional contacts |
| Settings | Application settings |
| HemsQueue | HEMS request queue |
| DistributionWizard | Multi-step distribution creation |

### Portal Pages (4)
| Page | Purpose |
|||
| Login | Magic link authentication |
| Dashboard | Beneficiary view |
| HemsRequestForm | Submit HEMS requests |
| Layout | Portal navigation |

## Bun-Specific Guidelines
**DO use:**
- `bun <file>` instead of `node <file>`
- `bun test` instead of jest/vitest
- `bun install` instead of npm/yarn
- `bunx <package>` instead of npx
- `Bun.serve()` for API server
- `Bun.file()` over node:fs

**DON'T use:**
- express (use Bun.serve())
- dotenv (Bun auto-loads .env)
- pg/postgres.js for this project (using Drizzle with postgres adapter)

**Development:**
- Access UI at `http://localhost:5173` (Vite with HMR)
- API runs at `http://localhost:5050`
- Don't use :5050 for frontend - it serves unstyled HTML

## Current State
The application is functional with:
- Complete CRUD for all 22 resource types
- Working beneficiary portal with magic link auth
- Liability payment recording with accounting integration
- HEMS request workflow
- Texas Property Code compliance fields

**Known limitations:**
- Admin dashboard has no auth (intentional during development)
- Email delivery requires Resend API key
- No file upload for documents yet

## Code Conventions
### Naming
| Type | Convention | Example |
||||
| Files | `kebab-case.tsx` | `editable-cells.tsx` |
| Components | `PascalCase` | `EditableCurrencyCell` |
| Functions | `camelCase` | `handleSave`, `formatCurrency` |
| Hooks | `use` prefix | `useLiabilities`, `useEntities` |
| DB Tables | `camelCase` | `bankAccount`, `trustAccounting` |
| API Routes | `kebab-case` | `/api/bank-accounts`, `/api/trust-accounting` |

### Imports Order
```typescript
// 1. React
import { useState, useEffect } from "react"
// 2. External libraries
import { eq } from "drizzle-orm"
// 3. Internal components
import { Button } from "@/components/ui/button"
// 4. Hooks
import { useEntities } from "@/hooks/useEntities"
// 5. Utils/types
import { formatCurrency } from "@/utils/formatters"
```

### Component Structure
```typescript
export function PageName() {
  // 1. Hooks (useEntities, useState, etc.)
  // 2. Derived state (useMemo, filtered lists)
  // 3. Handlers (handleSave, handleDelete)
  // 4. Effects (useEffect)
  // 5. Early returns (loading, no data)
  // 6. JSX return
}
```

## Extracted Component Patterns

Three reusable patterns extracted to eliminate duplication across 13 pages:

- **ResourceDialog** - Generic form dialogs for create/edit workflows (eliminates 76 Dialog instances)
- **SummaryCard** - Metric display cards for dashboard summaries
- **DataTable** - Data tables with sorting, actions, and inline editing

**See full documentation:** [docs/component-patterns.md](docs/component-patterns.md)

Use these components when:
- Creating/editing resources → ResourceDialog + useResourceForm hook
- Displaying metrics → SummaryCard + SummaryCardGrid
- Showing data lists → DataTable + column configuration

## How-To Recipes
### Add a New Database Table
**Step 1: Schema** (`db/schema.ts`)
```typescript
export const newResource = pgTable("new_resource", {
  id: text("id").primaryKey(),
  entityId: text("entity_id").notNull().references(() => entity.id),
  name: text("name").notNull(),
  // ... other fields
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})
```

**Step 2: Relations** (same file, in relations section)
```typescript
export const newResourceRelations = relations(newResource, ({ one }) => ({
  entity: one(entity, { fields: [newResource.entityId], references: [entity.id] }),
}))
```

**Step 3: Push to DB**
```bash
bun run db:push
```

### Add a New CRUD Resource
**Step 1: CRUD Factory** (`db/queries.ts`)
```typescript
export const newResourceCrud = createCrud(newResource, { filterColumn: "entityId" })

// Export individual functions
export const getNewResources = newResourceCrud.getAll
export const createNewResource = newResourceCrud.create
export const updateNewResource = newResourceCrud.update
export const deleteNewResource = newResourceCrud.delete
```

**Step 2: API Routes** (`index.ts`)
```typescript
// Add to resources object
"new-resources": {
  crud: newResourceCrud as any,
  name: "New Resource",
  filterParam: "entityId",
},
```

Now you have: `GET/POST /api/new-resources`, `GET/PUT/DELETE /api/new-resources/:id`

**Step 2: Create Page** (`src/pages/NewResources.tsx`)
```typescript
import { useState } from "react"
import { useEntities } from "@/hooks/useEntities"
import { useNewResources } from "@/hooks/useNewResources"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
// ... other imports

export function NewResourcesPage() {
  const { entities } = useEntities()
  const [selectedEntity, setSelectedEntity] = useState<string>("")
  const { items, loading, create, update, remove } = useNewResources(selectedEntity)

  // Set first entity on load
  useEffect(() => {
    if (entities.length && !selectedEntity) {
      setSelectedEntity(entities[0].id)
    }
  }, [entities])

  if (!selectedEntity) return <div>Select an entity</div>
  if (loading) return <div>Loading...</div>

  return (
    <div className="p-6 space-y-6">
      {/* Header with entity selector */}
      {/* Summary cards */}
      {/* Data table with inline editing */}
      {/* Form dialog */}
    </div>
  )
}
```

**Step 3: Add Route** (`src/App.tsx`)
```typescript
import { NewResourcesPage } from "./pages/NewResources"

// In routes:
{ path: "/new-resources", element: <NewResourcesPage /> }
```

**Step 4: Add Sidebar Link** (`src/components/Sidebar.tsx`)

## Entity Filtering Pattern
Most resources belong to an entity (trust/estate). The pattern:

**Backend**: CRUD factory accepts `filterColumn`:
```typescript
export const liabilityCrud = createCrud(liability, { filterColumn: "entityId" })
```

**API**: Query param filters results:
```
GET /api/liabilities?entityId=abc123
```

**Frontend**: Hook accepts entityId:
```typescript
const { items } = useLiabilities(selectedEntityId)
```

**Page**: Entity selector at top:
```typescript
const [selectedEntity, setSelectedEntity] = useState("")
// Set first entity on load via useEffect
```

## Form State Pattern
Pages with create/edit dialogs use this pattern:

```typescript
// Separate state for form data vs which item is being edited
const [showForm, setShowForm] = useState(false)
const [editing, setEditing] = useState<Resource | null>(null)
const [form, setForm] = useState(defaultForm())

// Edit handler - populate form from existing item
const handleEdit = (item: Resource) => {
  setEditing(item)
  setForm({
    ...item,
    // Convert dates for input fields
    dateField: toDateInput(item.dateField),
  })
  setShowForm(true)
}

// Add handler - reset to defaults
const handleAdd = () => {
  setEditing(null)
  setForm(defaultForm())
  setShowForm(true)
}

// Save handler - create or update based on editing state
const handleSave = async () => {
  const payload = { ...form, entityId: selectedEntity }
  if (editing) {
    await update(editing.id, payload)
  } else {
    await create(payload)
  }
  setShowForm(false)
}
```

**Date conversion** (`src/lib/form-factory.ts`):
```typescript
// ISO string → input value
export const toDateInput = (iso?: string | null) =>
  iso ? iso.split("T")[0] : ""
```

## ID Generation
**Always use `generateId()`** from `db/helpers.ts` - never raw UUIDs:

```typescript
import { generateId } from "./helpers"
// In queries.ts or anywhere creating records
const id = generateId() // Returns nanoid-style ID
```

The CRUD factory handles this automatically for `create()`, but manual inserts need it.

## Required Fields by Resource Type
### All Resources
- `id` - Use `generateId()`
- `createdAt` - Auto-set by defaultNow()
- `updatedAt` - Auto-set, update on changes
### Assets (vehicles, properties, accounts, etc.)
- `entityId` - Required FK to entity
- `name` or identifying field
### Liabilities
- `entityId` - Required
- `creditor` - Who is owed
- `liabilityType` - MORTGAGE, LOAN, CREDIT_CARD, TAX_OWED, etc.
- `originalAmount` - Starting balance
- `currentBalance` - Current balance
### Trust Accounting
- `entityId` - Required
- `accountingDate` - When it occurred
- `entryType` - "INCOME" or "EXPENSE"
- `amount` - Decimal value
- `isPrincipal` - Principal vs income classification
### Beneficiaries
- `entityId` - Required
- `name` - Full name
- `relationship` - To grantor
- `sharePercentage` - Decimal (0.25 = 25%)

## Common Gotchas
### 1. Entity ID Required
Most create operations need `entityId`. The form should include:
```typescript
const payload = { ...form, entityId: selectedEntity }
```

### 2. Date Input Conversion
HTML date inputs return `YYYY-MM-DD`. Store as ISO:
```typescript
// Form → API: Already correct format
// API → Form: Use toDateInput() to strip time
```

### 3. Enum Type Casting
Drizzle enums need explicit casting from form strings:
```typescript
paymentMethod: (form.paymentMethod as "CHECK" | "ACH" | "WIRE") || null
```

### 4. Numeric Fields
Form inputs are strings. Convert for API:
```typescript
amount: parseFloat(form.amount) || 0
```

### 5. Optimistic Updates
Inline cells update local state immediately, then persist:
```typescript
onSave={async (val) => {
  await update(id, { field: val }) // This updates local state via hook
}}
```

### 6. Loading States
Always check loading before rendering data:
```typescript
if (loading) return <LoadingSpinner />
if (!items.length) return <EmptyState />
```

### 7. Dialog Scroll
Large forms need scroll handling:
```typescript
<DialogContent className="max-h-[90vh] overflow-y-auto">
```