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

### Auth Tables

**Do NOT write directly to `neon_auth.*` tables** — use the Admin plugin API only.

| Table | Location | Notes |
|-------|----------|-------|
| `neon_auth."user"` | Neon Auth managed | camelCase columns: `emailVerified`, `updatedAt`, etc. |
| `user_profile` | `public.user_profile` | App-managed: `role`, `beneficiaryId`, `forcePasswordChange` |
| `neon_auth.session` | Neon Auth managed | Session tokens |
| `neon_auth.account` | Neon Auth managed | Password hashes |
**`public.user`** — leftover table from schema migration, has 0 rows. Ignore it.

## Neon Auth (Next.js App Router)
Neon Auth is a managed Better Auth service. Auth is entirely managed — no local Better Auth config.

### Auth Packages

```
@neondatabase/auth         # Main package
@neondatabase/auth/next    # createAuthClient()
@neondatabase/auth/next/server  # createAuthServer(), neonAuthMiddleware
@neondatabase/auth/react   # AuthView component (sign-in UI)
```

### Auth File Locations

```
src/
├── proxy.ts                          # Next.js 16 proxy (route protection + x-pathname header)
├── lib/
│   ├── auth.ts                       # Type definitions + re-exports
│   ├── auth/
│   │   ├── client.ts                 # createAuthClient() for client components
│   │   └── server.ts                 # createAuthServer() for server components
│   └── constants.ts                  # OWNER_EMAIL from process.env.ADMIN_EMAIL
├── app/
│   ├── page.tsx                      # Root: auth gateway (redirects by role)
│   ├── auth/[path]/page.tsx          # Single login page (AuthView component)
│   ├── api/auth/[...all]/route.ts    # Neon Auth API handler
│   └── portal/
│       ├── layout.tsx                # forcePasswordChange guard + x-pathname check
│       └── change-password/page.tsx  # Forced password change page
```

### Native Roles
`session.user.role` values from Neon Auth:
- `"admin"` - set via `authServer.admin.setRole()`
- `"user"` (default) - all new users

**tRPC role source of truth is `user_profile.role`**, not the native Neon Auth role.
Layout guards (routing) use the native Neon Auth role.

### RBAC: Email-Based Owner Override
The trust owner (`ADMIN_EMAIL` env var) always gets admin access regardless of DB state.
This is enforced in tRPC context creation (`src/server/trpc/index.ts`):

```typescript
let role: 'admin' | 'beneficiary' | 'user' = 'user'
if (session.user.email === OWNER_EMAIL) {
    role = 'admin'  // Owner email always wins
} else if (profile) {
    role = profile.role  // Everyone else uses user_profile.role
}
```

**Required env var:** `ADMIN_EMAIL=rhudsontspr@gmail.com`

### Server-Side Session
```tsx
import { authServer } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function ProtectedPage() {
    const { data: session } = await authServer.getSession()

    if (!session?.user) {
        redirect("/auth/sign-in")
    }

    // Native role for layout routing
    if (session.user.role === "admin") {
        redirect("/dashboard")
    }
    redirect("/portal")
}
```

### Client-Side Session
```tsx
"use client"
import { authClient } from "@/lib/auth"

export function UserMenu() {
    const { data: session, isPending } = authClient.useSession()
    // ...
}
```

**Do not use `useSession` in layouts** — use Server Component `authServer.getSession()` instead.

### Sign-In Flow
Single login page at `/auth/sign-in` using `AuthView` from `@neondatabase/auth/react`:

```tsx
// src/app/auth/[path]/page.tsx
<AuthView path={path} redirectTo="/" />
```

After sign-in:
1. `AuthView` redirects to `/`
2. Root page checks session role → redirects to `/dashboard` (admin) or `/portal` (beneficiary)
3. For beneficiaries with `forcePasswordChange=true` → portal layout redirects to `/portal/change-password`
All sign-out redirects go to `/auth/sign-in`.

### Proxy (Route Protection)
`src/proxy.ts` — Next.js 16 proxy (replaces deprecated `middleware.ts`):

```typescript
// Checks for Neon Auth session cookie
const sessionCookie = request.cookies.get('__Secure-neon-auth.session_token')

// Also injects x-pathname header on every request
requestHeaders.set('x-pathname', pathname)
```

**Key facts:**
- Neon Auth cookie name: `__Secure-neon-auth.session_token` (works on localhost too)
- `x-pathname` header enables portal layout to detect current route (avoids redirect loops)
- This is an optimistic check only — real validation happens in Server Components

### forcePasswordChange Flow
Admin-created beneficiary accounts have `user_profile.forcePasswordChange = true`.
On first sign-in, portal layout detects this and redirects to `/portal/change-password`.
Loop prevention: portal layout reads `x-pathname` header (set by proxy) to skip redirect when already on the change-password page.

```typescript
// src/app/portal/layout.tsx
const pathname = headersList.get('x-pathname') ?? ''
if (pathname !== '/portal/change-password') {
    const [profile] = await publicDb.select(...)...
    if (profile?.forcePasswordChange) {
        redirect('/portal/change-password')
    }
}
```

### Creating Beneficiary Accounts
Use `trpc.userManagement.createBeneficiaryUser`:

```typescript
// Admin-only mutation
createBeneficiaryUser.mutate({
    email: "user@example.com",
    name: "First Last",
    password: "temp-password",
    beneficiaryId: 123,
})
```

The mutation:
1. Calls `authServer.admin.createUser()` → creates Neon Auth user
2. Sets `emailVerified = true` via raw SQL (required or sign-in returns 403)
3. Upserts `user_profile` with `role: 'beneficiary'`, `forcePasswordChange: true`

**Critical:** Admin-created users must have `emailVerified = true` or Better Auth returns 403.

### DO NOT Use

```typescript
// ❌ WRONG - uses Better Auth cookie, not Neon Auth cookie
import { getSessionCookie } from 'better-auth/cookies'
getSessionCookie(request, { cookiePrefix: 'trust-admin' })  // Cookie doesn't exist!

// ❌ WRONG - doesn't work in Server Components
import { authClient } from "@/lib/auth"
authClient.getSession()

// ❌ WRONG - Neon Auth proxy doesn't support updateUser()
authServer.admin.updateUser(userId, { name: "..." })  // Returns 400

// ✅ CORRECT - update neon_auth.user directly via raw SQL
await getSql().query(
    `UPDATE neon_auth."user" SET "updatedAt" = $1 WHERE id = $2`,
    [new Date(), userId],
)
// Note: neon_auth.user uses camelCase columns ("updatedAt", "emailVerified")
```

## Key Workflows
### 1. Recording a Liability Payment

```typescript
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
     │─────────────────────────────►│                                │
     │                              │ trpc.hemsRequest.pending()     │
     │                              │◄───────────────────────────────│
     │                              │ trpc.hemsRequest.approve()     │
     │                              │───────────────────────────────►│
     │                              │ Create distribution record     │
     │                              │ Set status=DISTRIBUTED         │
```

### 3. Entity Filtering Pattern

Every resource query includes entityId. Entity list is ordered by `asc(entity.id)` so `entities[0]` is always The Hudson Living Trust (entity ID 1).

```typescript
const { data } = trpc.liability.list.useQuery({ entityId })
create.mutate({ entityId, creditor: "...", amount: "..." })
```

## Architecture
### Stack

| Layer | Technology |
|-------|------------|
| Runtime | Bun |
| Framework | Next.js 16.1 (App Router, webpack) |
| API | tRPC v11 + Next.js API routes |
| Database | PostgreSQL (Neon serverless) |
| DB Driver | @neondatabase/serverless (HTTP) + postgres.js (transactions) |
| ORM | Drizzle ORM (drizzle-orm/neon-http) |
| Validation | Zod (via drizzle-zod) |
| Frontend | React 19 + TailwindCSS |
| UI | Radix UI + shadcn/ui |
| Data Fetching | tRPC + TanStack Query |
| Auth | Neon Auth (managed Better Auth, email/password + magic link) |
| Linting | Biome (no ESLint) |
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
- `getClient()` / `getSql()` - postgres.js for raw SQL with transactions
- `getPublicDb()` - Drizzle bypassing RLS (for system-level queries)
- `initJwtSession(token)` - Initialize RLS session
- `setRequestAuthToken(token)` - Set JWT for neon() HTTP driver

**Time travel queries** (`db/time-travel.ts`):
- `queryAtTime(table, timestamp)` - Query historical data
- `compareWithHistory(table, timestamp, id)` - Diff current vs past

### tRPC Procedure Types
| Procedure | Access |
|-----------|--------|
| `publicProcedure` | No auth required |
| `protectedProcedure` | Any authenticated user |
| `adminProcedure` | Admin role (includes owner email override) |
| `ownerProcedure` | Trust owner only (ADMIN_EMAIL) |
| `beneficiaryProcedure` | Beneficiary role only |

### API Pattern (tRPC)

```typescript
// src/server/trpc/routers/liability.ts
export const liabilityRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number() }))
        .query(async ({ input }) => liabilityCrud.getAllArray(input.entityId)),

    create: adminProcedure
        .input(insertLiabilitySchema)
        .mutation(async ({ input }) => liabilityCrud.create(input)),
})
```

### Frontend Pattern (tRPC)
```typescript
import { trpc } from "@/lib/trpc"

const { data, isLoading } = trpc.liability.list.useQuery({ entityId: selectedEntity! })
const update = trpc.liability.update.useMutation({
    onSuccess: () => utils.liability.list.invalidate()
})
update.mutate({ id, entityId: selectedEntity!, data: { currentBalance: "5000" } })
```

### Commands

```bash
bun run dev          # Next.js dev server on :3000 (webpack)
bun run build        # Production build
bun run start        # Start production server
bun run db:push      # Sync schema to DB (dev only, not db:migrate)
bun run db:studio    # Drizzle Studio GUI
bun run db:seed      # Seed Hudson Trust test data
bun run typecheck    # TypeScript type check
bun run lint         # Biome lint check
bun test             # Run tests
```

**Always use `bun`** — not npm/node/npx. Bun auto-loads `.env`.

### Adding a New Resource
1. **Schema** (`db/schema.ts`): Add pgTable with indexes + FKs
2. **Relations** (`db/relations.ts`): Add relations
3. **Validation** (`db/validation.ts`): Add insert/update Zod schemas
4. **CRUD** (`db/queries.ts`): `export const newCrud = createCrud(table, { filterColumn: "entityId" })`
5. **tRPC Router** (`src/server/trpc/routers/new.ts`): Create router with procedures
6. **Register** (`src/server/trpc/routers/index.ts`): Add router to `appRouter`
7. **Push**: `bun run db:push`

### Common Patterns
**Type guards for enums:**
```typescript
import { isPaymentMethod } from "@/db/schema"
if (isPaymentMethod(value)) { /* value is typed */ }
```

**Auth middleware helpers** (for non-tRPC API routes):
```typescript
import { requireAdmin, requireBeneficiary } from "@/lib/middleware"
await requireAdmin(req)        // Throws if not admin
await requireBeneficiary(req)  // Throws if not beneficiary
```

### Numbers Are Strings
Database stores all money/decimal fields as strings (`"1500.00"` not `1500`). Intentional for precision.

```typescript
formatCurrency(liability.currentBalance)  // "$1,500.00"
const total = parseFloat(a) + parseFloat(b)  // Math: parse first
update.mutate({ id, data: { currentBalance: "1500.00" } })  // Save as string
```

### Gotchas

| Issue | Solution |
|-------|----------|
| Mutations missing entityId | Most creates need `entityId` in payload |
| Date input issues | Form→API: `new Date(val).toISOString()`, API→Form: `iso.split("T")[0]` |
| Enum type errors | Cast: `paymentMethod as "CHECK" \| "ACH"` or use type guards |
| Stale data after related update | Invalidate related queries in `onSuccess` |
| Beneficiary sign-in 403 | Admin-created users need `emailVerified = true` in `neon_auth."user"` |
| Wrong Neon Auth cookie | Cookie is `__Secure-neon-auth.session_token`, NOT `trust-admin.*` |
| `neon_auth.user` columns | camelCase: `"emailVerified"`, `"updatedAt"` (not snake_case) |

## Reference

### All 34 Tables

**Core:** entity, contact, contactAssociation, activityLog
**Assets:** homestead, rentalProperty, vehicle, bankAccount, investmentAccount, insurancePolicy, personalProperty, artwork
**Liabilities:** liability, liabilityPayment
**Accounting:** trustAccounting, transaction, valuation, document
**Beneficiaries:** beneficiary, distribution, specificBequest, withdrawalRecord, hemsRequest
**Administration:** trustee, trusteeFeeSchedule, trusteeFeeEntry, task
**App Auth:** user_profile (role, beneficiaryId, forcePasswordChange)
**Neon Auth (managed, do not write directly):** neon_auth.user, neon_auth.session, neon_auth.account, neon_auth.verification

### All Pages

| Route | Purpose |
|-------|---------|
| `/` | Auth gateway — redirects to `/dashboard` (admin) or `/portal` (beneficiary) |
| `/auth/sign-in` | Single sign-in page for all users (Neon Auth UI) |
| `/dashboard` | Admin dashboard — overview, tasks, accounting summary |
| `/users` | User management CRUD (owner-only) |
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
| `/portal/change-password` | Forced password change (first login gate) |

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

```bash
# Database (use -pooler endpoint for production)
DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require
NEON_AUTH_BASE_URL=https://ep-xxx.neonauth.region.aws.neon.tech/neondb/auth

# Trust owner — always gets admin role regardless of DB state
ADMIN_EMAIL=rhudsontspr@gmail.com
UPLOADTHING_TOKEN=<token>
RESEND_API_KEY=<key>

# URLs
TRUSTED_ORIGINS=https://trust.thehudsonfam.com
FRONTEND_URL=https://trust.thehudsonfam.com
```

### Seed Data

`bun run db:seed` creates **The Hudson Living Trust**:
- Grantor: Richard Hudson Sr. (DOD: 2025-12-28)
- ~20 beneficiaries with HEMS + withdrawal rights
- Children: Richard Jr (8.5%), Ashley (4.5%), Wendy (4.5%)
- Stepchildren: Ricky, Timothy, Alicia (4.5% each)
- Other: Luis Fernando (15%), Lois Greer (5%)
- Grandchildren: various shares

**Not implemented:** beneficiary data isolation (RLS phase 53)
