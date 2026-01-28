# Trust Admin

## What This Is

A trust administration application for managing the **Hudson Living Trust**, a Texas Irrevocable Trust. The grantor (Richard Hudson) died 2025-12-28, making this an **estate settlement** followed by **ongoing trust administration**.

**Two user types:**
- **Admin (Trustee):** Manages all trust assets, liabilities, accounting, and distributions
- **Beneficiary:** Views their share, submits HEMS requests through a portal

**Key domain concepts:**
- **HEMS:** Health, Education, Maintenance, Support - the legal standard for discretionary distributions
- **Principal vs Income:** Texas Property Code requires tracking which money comes from trust principal vs income generated
- **DOD Value:** Date-of-death valuation for estate tax basis step-up

---

## Mental Model

```
                           ┌─────────────────────────────────────────────┐
                           │                  ENTITY                      │
                           │         (The Hudson Living Trust)            │
                           └─────────────────────────────────────────────┘
                                              │
              ┌───────────────────────────────┼───────────────────────────────┐
              │                               │                               │
              ▼                               ▼                               ▼
       ┌─────────────┐               ┌───────────────┐               ┌───────────────┐
       │   ASSETS    │               │  LIABILITIES  │               │ BENEFICIARIES │
       │ homestead   │               │  liability    │               │  beneficiary  │
       │ bankAccount │               │    │          │               │      │        │
       │ vehicle     │               │    ▼          │               │      ▼        │
       │ ...         │               │ liabilityPay- │               │ distribution  │
       └─────────────┘               │    ment       │               │ hemsRequest   │
              │                      └───────────────┘               └───────────────┘
              │                               │                               │
              └───────────────────────────────┼───────────────────────────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │ TRUST ACCOUNTING│
                                    │ (income/expense │
                                    │  ledger)        │
                                    └─────────────────┘
```

**Everything belongs to an Entity.** When querying resources, filter by `entityId`.

**Money flows:**
1. Assets generate income → trustAccounting (INCOME entries)
2. Liabilities require payments → trustAccounting (EXPENSE entries)
3. Beneficiaries receive distributions → distribution records

---

## Data Model

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `entity` | Trust container | `entityType`, `trustType`, `dod`, `governingLaw` |
| `beneficiary` | Trust beneficiaries | `sharePercent`, `distributionStandard`, `withdrawalAge1/2` |
| `trustAccounting` | Income/expense ledger | `entryType` (INCOME/EXPENSE), `isPrincipal`, `amount` |

### Assets (8 tables)

All have: `entityId`, `dodValue`, `dodValueDate`, `status`, `transferStatus`

| Table | Extra Fields |
|-------|-------------|
| `homestead` | `streetAddress`, `dodAffidavitFiled`, `clerkFileNo` |
| `rentalProperty` | `monthlyRent`, `rentalStatus`, `propertyManager` |
| `bankAccount` | `institution`, `accountType`, `currentBalance` |
| `investmentAccount` | `institution`, `accountType`, `costBasis` |
| `vehicle` | `year`, `make`, `model`, `vin` |
| `insurancePolicy` | `policyType`, `carrier`, `coverageAmount` |
| `personalProperty` | `category`, `location` |
| `artwork` | `artist`, `medium`, `dimensions` |

### Liabilities

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `liability` | Debts owed | `creditor`, `originalAmount`, `currentBalance`, `allocationClass` |
| `liabilityPayment` | Payment history | `principalPortion`, `interestPortion`, `escrowPortion` |

**Secured debt links:** `liability.homesteadId`, `liability.rentalPropertyId`, `liability.vehicleId`

### Distributions

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `hemsRequest` | Beneficiary requests | `category` (HEALTH/EDUCATION/MAINTENANCE/SUPPORT), `status`, `approvedAmount` |
| `distribution` | Actual payouts | `distributionType`, `tax1099Issued`, `beneficiaryId` |
| `withdrawalRecord` | Age-based withdrawals | `withdrawalType`, `eligibleAmount`, `withdrawnAmount` |

### Administration

| Table | Purpose |
|-------|---------|
| `trustee` | Trustee info with succession order |
| `trusteeFeeSchedule` | Fee rates (asset %, income %, hourly) |
| `trusteeFeeEntry` | Actual fee accruals/payments |
| `task` | Administrative tasks |
| `contact` | Attorneys, accountants, advisors |
| `document` | File references (upload not yet implemented) |
| `activityLog` | Immutable audit trail |

### Auth (Better Auth)

`user` (role: admin/beneficiary, links to `beneficiaryId`), `session`, `account`, `verification`

---

## Neon Auth (Next.js App Router)

Neon Auth is a managed Better Auth service. User data lives in `neon_auth.user` table.

### Native Roles

Roles are stored natively on `session.user.role`:
- `"admin"` - Trust administrator
- `"user"` (default) - Beneficiary

**To promote a user to admin:** Use Neon Console or `authClient.admin.setRole()`

### Server-Side Session

Use `authServer.getSession()` in Server Components:

```tsx
// src/app/page.tsx or any Server Component
import { authServer } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function ProtectedPage() {
  const { data: session } = await authServer.getSession()

  if (!session?.user) {
    redirect("/auth/sign-in")
  }

  // Native role from Neon Auth
  if (session.user.role === "admin") {
    redirect("/dashboard")
  }
  redirect("/portal")
}
```

### Auth File Locations

```
src/lib/
├── auth.ts           # Re-exports from auth/client and auth/server
├── auth/
│   ├── client.ts     # createAuthClient() for client components
│   └── server.ts     # createAuthServer() for server components
```

### RLS Integration

JWT session initialization for Row-Level Security:

```typescript
import { initJwtSession } from '@/db'

// In tRPC context creation
await initJwtSession(session.session.token)
// Now auth.user_id() works in RLS policies
```

### Optional: Proxy for Optimistic Redirects (UX only)

```ts
// src/proxy.ts (Next.js 16 - replaces deprecated middleware.ts)
import { NextRequest, NextResponse } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

export async function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request, {
    cookiePrefix: "trust-admin"  // must match auth.ts config
  })

  // Fast check - prevents flash of protected content
  // ⚠️ NOT SECURE - anyone can create a fake cookie
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/portal/:path*"],
}
```

**Warning from docs:** "The `getSessionCookie` function only checks for the existence of a session cookie; it does **not** validate it. Relying solely on this check for security is dangerous."

### Client-Side Session (React Components)

For client components that need session state:

```tsx
"use client"
import { useSession } from "@/lib/auth-client"

export function UserMenu() {
  const { data: session, isPending } = useSession()

  if (isPending) return <Spinner />
  if (!session) return <LoginButton />

  return <div>{session.user.name}</div>
}
```

**Performance note from docs:** "For performance reasons, do not use this hook on your `layout.tsx` file. We recommend using RSC and use your server auth instance to get the session data via `auth.api.getSession`."

### Auth File Locations

```
src/
├── lib/
│   ├── auth.ts          # Server: Better Auth instance + config
│   └── auth-client.ts   # Client: createAuthClient + useSession
├── app/
│   ├── api/auth/[...all]/route.ts  # Auth API routes
│   ├── page.tsx         # Root: auth gateway (redirects by role)
│   ├── login/page.tsx   # Admin login (magic link)
│   └── portal/
│       └── login/page.tsx  # Beneficiary login
```

### Cookie Configuration

From `src/lib/auth.ts`:

```ts
advanced: {
  cookiePrefix: "trust-admin",  // Used in getSessionCookie()
  useSecureCookies: process.env.NODE_ENV === "production",
  defaultCookieAttributes: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  },
},
```

### DO NOT Use (Deprecated)

```ts
// ❌ WRONG - doesn't work in Server Components
import { authClient } from "@/lib/auth-client"
const session = await authClient.getSession()  // Can't access cookies!

// ✅ CORRECT - use server-side auth
import { auth } from "@/lib/auth"
const session = await auth.api.getSession({ headers: await headers() })
```

---

## Key Workflows

### 1. Recording a Liability Payment

```typescript
// Using tRPC mutation
const recordPayment = trpc.liability.recordPayment.useMutation({
  onSuccess: () => utils.liability.list.invalidate()
})

recordPayment.mutate({
  liabilityId: "xxx",
  paymentDate: "2025-01-15",
  amount: "1500.00",
  principalPortion: "1200.00",
  interestPortion: "300.00",
  paymentMethod: "CHECK"
})
```

**What happens:**
1. Creates `liabilityPayment` record
2. Subtracts from `liability.currentBalance`
3. Auto-creates `trustAccounting` EXPENSE entry
4. Returns updated liability

### 2. HEMS Request Flow

```
[Beneficiary]                    [Admin]                         [System]
     │                              │                                │
     │ trpc.hemsRequest.submit()    │                                │
     │ (category, amount,           │                                │
     │  justification)              │                                │
     │─────────────────────────────►│                                │
     │                              │                                │
     │                              │ trpc.hemsRequest.pending()     │
     │                              │◄───────────────────────────────│
     │                              │                                │
     │                              │ trpc.hemsRequest.approve()     │
     │                              │ (approvedAmount, reviewNotes)  │
     │                              │───────────────────────────────►│
     │                              │                                │
     │                              │ Create distribution record     │
     │                              │ Link hemsRequest.distributionId│
     │                              │ Set status=DISTRIBUTED         │
```

### 3. Entity Filtering Pattern

**Every resource query should include entityId:**

```typescript
// tRPC query with entityId filter
const { data } = trpc.liability.list.useQuery({ entityId })

// tRPC mutation with entityId
const create = trpc.liability.create.useMutation()
create.mutate({ entityId, creditor: "...", amount: "..." })

// CRUD factory (how it's configured)
createCrud(liability, { filterColumn: "entityId" })
```

---

## Architecture

### Stack

| Layer | Technology |
|-------|------------|
| Runtime | Bun |
| Framework | Next.js 16 (App Router) |
| API | tRPC + Next.js API routes |
| Database | PostgreSQL (Neon serverless) |
| DB Driver | @neondatabase/serverless (HTTP) + postgres.js (transactions) |
| ORM | Drizzle ORM (drizzle-orm/neon-http) |
| Validation | Zod (via drizzle-zod) |
| Frontend | React 19 + TailwindCSS |
| UI | Radix UI + shadcn/ui |
| Data Fetching | tRPC + TanStack Query |
| Auth | Neon Auth (managed Better Auth, magic link) |
| Email | Resend |
| Deployment | Vercel (with Neon Postgres integration) |

### Database Architecture

```
Production Queries (Drizzle)     Raw SQL/Tests (postgres.js)
         │                               │
         ▼                               ▼
   neon() HTTP driver            postgres.js client
   (fast, stateless)             (template strings, transactions)
         │                               │
         └───────────┬───────────────────┘
                     │
                     ▼
           Neon PostgreSQL (pooled)
           └── PgBouncer (10K connections)
```

**Key exports from `db/index.ts`:**
- `db` - Drizzle ORM instance (uses HTTP driver)
- `getClient()` - postgres.js for raw SQL with transactions
- `initJwtSession(token)` - Initialize RLS session

**Time travel queries** (`db/time-travel.ts`):
- `queryAtTime(table, timestamp)` - Query historical data
- `compareWithHistory(table, timestamp, id)` - Diff current vs past

### File Structure

```
trust-admin/
├── db/
│   ├── index.ts          # DB connections (neon HTTP + postgres.js)
│   ├── schema.ts         # 34 Drizzle tables + enums + type guards
│   ├── relations.ts      # Drizzle relations
│   ├── validation.ts     # Zod schemas from drizzle-zod
│   ├── queries.ts        # CRUD instances + custom queries
│   ├── crud-factory.ts   # Generic CRUD with filtering + pagination
│   └── time-travel.ts    # Historical query utilities
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── page.tsx                # Root: auth gateway (redirects by role)
│   │   ├── layout.tsx              # Root layout with TRPCProvider
│   │   ├── login/page.tsx          # Admin login
│   │   ├── (admin)/                # Admin route group (with sidebar layout)
│   │   │   ├── layout.tsx          # Admin layout with AppSidebar
│   │   │   ├── dashboard/page.tsx  # Admin dashboard
│   │   │   ├── accounts/page.tsx
│   │   │   ├── beneficiaries/page.tsx
│   │   │   └── ...                 # Other admin pages
│   │   ├── portal/                 # Beneficiary portal
│   │   │   ├── page.tsx            # Portal dashboard
│   │   │   └── login/page.tsx      # Beneficiary login
│   │   └── api/
│   │       ├── auth/[...all]/route.ts  # Better Auth API
│   │       └── trpc/[trpc]/route.ts    # tRPC API
│   ├── server/
│   │   └── trpc/
│   │       ├── index.ts            # tRPC init + procedures
│   │       └── routers/            # tRPC routers by resource
│   ├── components/
│   │   ├── ui/                     # shadcn/ui
│   │   └── app-sidebar.tsx         # Admin navigation
│   └── lib/
│       ├── auth.ts                 # Better Auth server config
│       ├── auth-client.ts          # Better Auth client
│       ├── trpc.ts                 # tRPC client hooks
│       ├── trpc-provider.tsx       # TRPCProvider component
│       └── middleware.ts           # requireAdmin(), requireBeneficiary()
```

### API Pattern (tRPC)

**tRPC routers** in `src/server/trpc/routers/` - type-safe API:

```typescript
// src/server/trpc/routers/liability.ts
export const liabilityRouter = createTRPCRouter({
  list: protectedProcedure.query(async () => {
    return liabilityCrud.findAll()
  }),
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return liabilityCrud.findById(input.id)
    }),
  create: adminProcedure
    .input(insertLiabilitySchema)
    .mutation(async ({ input }) => {
      return liabilityCrud.create(input)
    }),
  update: adminProcedure
    .input(z.object({ id: z.string(), data: updateLiabilitySchema }))
    .mutation(async ({ input }) => {
      return liabilityCrud.update(input.id, input.data)
    }),
})
```

**Procedure types:**
- `publicProcedure` - No auth required
- `protectedProcedure` - Any authenticated user
- `adminProcedure` - Admin role required
- `beneficiaryProcedure` - Beneficiary role required

### Frontend Pattern (tRPC)

**Data fetching** - tRPC hooks (auto-generated from routers):
```typescript
// In any component
import { trpc } from "@/lib/trpc"

const { data, isLoading } = trpc.liability.list.useQuery()
const update = trpc.liability.update.useMutation({
  onSuccess: () => utils.liability.list.invalidate()
})
update.mutate({ id, data: { currentBalance: "5000" } })
```

**Inline editing** - click cell to edit:
```typescript
<EditableCurrencyCell
  value={item.currentBalance}
  onSave={(val) => update.mutateAsync({ id, data: { currentBalance: val } })}
/>
```

---

## Development

### Commands

```bash
bun run dev          # Next.js dev server on :3000 (Turbopack)
bun run build        # Production build
bun run start        # Start production server
bun run db:push      # Sync schema to DB (dev only, not db:migrate)
bun run db:studio    # Drizzle Studio GUI
bun run db:seed      # Seed Hudson Trust test data
bun run typecheck    # TypeScript type check
bun run lint         # Biome lint check
bun test             # Run tests
```

**Always use `bun`** - not npm/node/npx. Bun auto-loads `.env`.

### Adding a New Resource

1. **Schema** (`db/schema.ts`): Add pgTable with indexes + FKs
2. **Relations** (`db/relations.ts`): Add relations
3. **Validation** (`db/validation.ts`): Add insert/update Zod schemas
4. **CRUD** (`db/queries.ts`): `export const newCrud = createCrud(table, { filterColumn: "entityId" })`
5. **tRPC Router** (`src/server/trpc/routers/new.ts`): Create router with procedures
6. **Register** (`src/server/trpc/index.ts`): Add router to `appRouter`
7. **Push**: `bun run db:push`

### Common Patterns

**Error handling:**
```typescript
throw ApiError.notFound("Liability", id)
throw ApiError.validationError("Invalid", { field: "message" })
const data = validateWithSchema(schema, body)  // Throws on invalid
```

**Auth middleware:**
```typescript
await requireAdmin(req)        // Throws if not admin
await requireBeneficiary(req)  // Throws if not beneficiary
```

**Type guards for enums:**
```typescript
import { isPaymentMethod } from "@/db/schema"
if (isPaymentMethod(value)) { /* value is typed */ }
```

### Numbers Are Strings

Database stores all money/decimal fields as strings (`"1500.00"` not `1500`). This is intentional for precision.

```typescript
// Display: use formatters
formatCurrency(liability.currentBalance)  // "$1,500.00"

// Math: parse first
const total = parseFloat(a) + parseFloat(b)

// Save: send as string
update.mutate({ id, data: { currentBalance: "1500.00" } })
```

### Gotchas

| Issue | Solution |
|-------|----------|
| Mutations missing entityId | Most creates need `entityId` in payload |
| Date input issues | Form→API: `new Date(val).toISOString()`, API→Form: `iso.split("T")[0]` |
| Enum type errors | Cast: `paymentMethod as "CHECK" \| "ACH"` or use type guards |
| Stale data after related update | `queryClient.invalidateQueries({ queryKey: ["other-resource"] })` |

---

## Reference

### All 34 Tables

**Core:** entity, contact, contactAssociation, activityLog

**Assets:** homestead, rentalProperty, vehicle, bankAccount, investmentAccount, insurancePolicy, personalProperty, artwork

**Liabilities:** liability, liabilityPayment

**Accounting:** trustAccounting, transaction, valuation, document

**Beneficiaries:** beneficiary, distribution, specificBequest, withdrawalRecord, hemsRequest

**Administration:** trustee, trusteeFeeSchedule, trusteeFeeEntry, task

**Auth:** user, session, account, verification

### All Pages

| Route | Purpose |
|-------|---------|
| `/` | Auth gateway - redirects to `/dashboard` (admin) or `/portal` (beneficiary) |
| `/login` | Admin login (magic link) |
| `/dashboard` | Admin dashboard - overview, tasks, accounting summary |
| `/accounts` | Bank + investment accounts |
| `/properties` | Homestead + rental properties |
| `/liabilities` | Debts with payment recording |
| `/beneficiaries` | Profiles, withdrawal status |
| `/hems` | Distribution history |
| `/hems-queue` | Pending HEMS request review |
| `/accounting` | Trust accounting ledger |
| `/trustees` | Trustee management |
| `/vehicles` | Vehicle assets |
| `/bequests` | Specific bequests |
| `/contacts` | Professional contacts |
| `/activity-log` | Audit trail |
| `/settings` | App settings |
| `/portal` | Beneficiary portal dashboard |
| `/portal/login` | Beneficiary login (magic link) |

### Key Enums

| Enum | Values |
|------|--------|
| `RecordStatus` | ACTIVE, INACTIVE, PENDING, CLOSED, PAID_OFF, SOLD, TRANSFERRED... |
| `LiabilityType` | MORTGAGE, LOAN, CREDIT_CARD, TAX_OWED, ACCOUNTS_PAYABLE, LEGAL_JUDGMENT, OTHER |
| `PaymentMethod` | CHECK, ACH, WIRE, CASH, OTHER |
| `AllocationClass` | PRINCIPAL, INCOME |
| `HemsRequestStatus` | PENDING, APPROVED, DENIED, DISTRIBUTED, CANCELLED |
| `DistributionType` | INCOME, PRINCIPAL, CAPITAL_GAIN, EXPENSE_REIMBURSEMENT, OTHER |
| `DistributionStandard` | HEMS, HEMS_PLUS_WITHDRAWAL, BROADER, WITHDRAWAL_ONLY |

### Environment Variables

```bash
# Database (use -pooler endpoint for production)
DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require
DATABASE_URL_DIRECT=postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require  # For migrations

# Neon Auth
NEON_AUTH_BASE_URL=https://ep-xxx.neonauth.region.aws.neon.tech/neondb/auth

# Email (optional in dev)
RESEND_API_KEY=<key>

# URLs
TRUSTED_ORIGINS=https://trust.thehudsonfam.com
FRONTEND_URL=https://trust.thehudsonfam.com
```

### Seed Data

`bun run db:seed` creates **The Hudson Living Trust**:
- Grantor: Richard Hudson (DOD: 2025-12-28)
- ~20 beneficiaries with HEMS + withdrawal rights
- Children: Richard Jr (8.5%), Ashley (4.5%), Wendy (4.5%)
- Stepchildren: Ricky, Timothy, Alicia (4.5% each)
- Other: Luis Fernando (15%), Lois Greer (5%)
- Grandchildren: various shares

---

## Current State

**Stack:** Next.js 16.1 (App Router) + tRPC v11 + Drizzle ORM + Neon Auth + @neondatabase/serverless

**Working:**
- 24 tRPC routers for all resources
- Neon Auth with native roles (admin/user)
- RLS policies with JWT session initialization
- Payment recording with auto-accounting
- HEMS workflow (request → approve → distribute)
- Year-end income-to-principal conversion (Section 7.10(c))
- Beneficiary death handling with share redistribution (Section 7.01)
- Texas compliance fields (principal/income allocation)
- Activity log audit trail
- Inline editable cells with optimistic updates
- Time travel queries for audit (db/time-travel.ts)
- Neon serverless driver (HTTP for Drizzle, postgres.js for transactions)

**Neon Features Enabled:**
- Serverless driver (neon HTTP)
- Connection pooling ready (-pooler endpoint)
- Time travel queries utility
- Vercel preview branching ready (needs console config)

**Not implemented:** File upload, email notifications in prod, reporting/export, multi-entity support
