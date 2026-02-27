# Trust Admin

A trust administration app for the **Hudson Living Trust** (Texas Irrevocable Trust). Grantor Richard Hudson died 2025-12-28 — this covers estate settlement + ongoing administration.

**Two user types:**
- **Admin (Trustee):** Manages assets, liabilities, accounting, distributions
- **Beneficiary:** Views their share, submits HEMS requests via portal

**Key domain concepts:**
- **HEMS:** Health, Education, Maintenance, Support — legal standard for discretionary distributions
- **Principal vs Income:** Texas Property Code requires tracking source of funds
- **DOD Value:** Date-of-death valuation for estate tax basis step-up

## Commands

```bash
bun run dev          # Dev server on :3000 (Turbopack)
bun run build        # Production build
bun run typecheck    # TypeScript check
bun run lint         # Biome lint
bun test             # Unit + component tests (excludes E2E)
bun run test:e2e     # Playwright E2E (requires app on :3000)
bun run db:push      # Sync schema to DB (dev only)
bun run db:studio    # Drizzle Studio GUI
bun run db:seed      # Seed Hudson Trust test data
```

**Always use `bun`** — not npm/node/npx. Bun auto-loads `.env`.

## Commands

```bash
bun run dev          # Dev server on :3000 (Turbopack)
bun run build        # Production build
bun run typecheck    # TypeScript check
bun run lint         # Biome lint
bun test             # Unit + component tests (excludes E2E)
bun run test:e2e     # Playwright E2E (requires app on :3000)
bun run db:push      # Sync schema to DB (dev only)
bun run db:studio    # Drizzle Studio GUI
bun run db:seed      # Seed Hudson Trust test data
```

**Always use `bun`** — not npm/node/npx. Bun auto-loads `.env`.

---

## Mental Model

```
                         ┌─────────────────────────────────────┐
                         │              ENTITY                  │
                         │      (The Hudson Living Trust)       │
                         └─────────────────────────────────────┘
                                          │
            ┌─────────────────────────────┼─────────────────────────────┐
            │                             │                             │
            ▼                             ▼                             ▼
     ┌─────────────┐             ┌───────────────┐             ┌───────────────┐
     │   ASSETS    │             │  LIABILITIES  │             │ BENEFICIARIES │
     │ homestead   │             │  liability    │             │  beneficiary  │
     │ bankAccount │             │      │        │             │      │        │
     │ vehicle     │             │      ▼        │             │      ▼        │
     │ ...         │             │ liabilityPay- │             │ distribution  │
     └─────────────┘             │    ment       │             │ hemsRequest   │
            │                    └───────────────┘             └───────────────┘
            └─────────────────────────────┼─────────────────────────────┘
                                          ▼
                                ┌─────────────────┐
                                │ TRUST ACCOUNTING│
                                │ (income/expense │
                                │    ledger)      │
                                └─────────────────┘
```

**Everything belongs to an Entity.** Always filter queries by `entityId`.
Entity list is ordered by `asc(entity.id)` — `entities[0]` is always The Hudson Living Trust (ID 1).

**Money flows:**
1. Assets generate income → `trustAccounting` (INCOME entries)
2. Liabilities require payments → `trustAccounting` (EXPENSE entries)
3. Beneficiaries receive distributions → `distribution` records

---

## Data Model

### Core

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `entity` | Trust container | `entityType`, `trustType`, `dod`, `governingLaw` |
| `beneficiary` | Trust beneficiaries | `sharePercent`, `distributionStandard`, `withdrawalAge1/2` |
| `trustAccounting` | Income/expense ledger | `entryType` (INCOME/EXPENSE), `isPrincipal`, `amount` |

### Assets (8 tables)

All share: `entityId`, `dodValue`, `dodValueDate`, `status`, `transferStatus`

`homestead`, `rentalProperty`, `bankAccount`, `investmentAccount`, `vehicle`, `insurancePolicy`, `personalProperty`, `artwork`

**Secured debt links:** `liability.homesteadId`, `liability.rentalPropertyId`, `liability.vehicleId`

### Distributions

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `hemsRequest` | Beneficiary requests | `category` (HEALTH/EDUCATION/MAINTENANCE/SUPPORT), `status`, `amountRequested`, `approvedAmount` |
| `distribution` | Actual payouts | `distributionType`, `tax1099Issued`, `beneficiaryId` |
| `withdrawalRecord` | Age-based withdrawals | `withdrawalType`, `eligibleAmount`, `withdrawnAmount` |

**hemsRequest fields:** `amountRequested` (not `requestedAmount`), `justification` (not `description`), `distributionId` (FK set on approve)

### Auth Tables

**Do NOT write directly to `neon_auth.*` tables** — use the Admin plugin API only.

| Table | Location | Notes |
|-------|----------|-------|
| `neon_auth."user"` | Neon Auth managed | camelCase columns: `emailVerified`, `updatedAt` |
| `user_profile` | `public.user_profile` | App-managed: `role`, `beneficiaryId`, `forcePasswordChange` |

**`public.user`** — leftover from schema migration, 0 rows. Ignore it.

---

## Neon Auth

Neon Auth is a managed Better Auth service. No local Better Auth config.

### Packages

```
@neondatabase/auth               # Main package
@neondatabase/auth/next          # createAuthClient()
@neondatabase/auth/next/server   # createAuthServer(), neonAuthMiddleware
@neondatabase/auth/react         # AuthView component (sign-in UI)
```

### Auth File Locations

```
src/
├── proxy.ts                        # Next.js 16 proxy (route protection + x-pathname header)
├── lib/
│   ├── auth.ts                     # Type definitions + re-exports
│   ├── auth/
│   │   ├── client.ts               # createAuthClient() for client components
│   │   └── server.ts               # createAuthServer() for server components
│   └── constants.ts                # OWNER_EMAIL from process.env.ADMIN_EMAIL
├── app/
│   ├── page.tsx                    # Root: auth gateway (redirects by role)
│   ├── auth/[path]/page.tsx        # Single login page (AuthView component)
│   ├── api/auth/[...all]/route.ts  # Neon Auth API handler
│   ├── (admin)/                    # All admin pages (route group)
│   └── portal/
│       ├── layout.tsx              # forcePasswordChange guard + x-pathname check
│       └── change-password/page.tsx
```

### Roles

`session.user.role` from Neon Auth: `"admin"` or `"user"` (default).

**tRPC role source of truth is `user_profile.role`**, not the native Neon Auth role.
Layout guards (routing) use the native Neon Auth role.

**Owner email override** — `ADMIN_EMAIL` always gets admin regardless of DB:

```typescript
// src/server/trpc/index.ts
if (session.user.email === OWNER_EMAIL) {
    role = 'admin'        // Owner email always wins
} else if (profile) {
    role = profile.role   // Everyone else uses user_profile.role
}
```

### Server vs Client Session

```tsx
// Server Component ✅
import { authServer } from "@/lib/auth"
const { data: session } = await authServer.getSession()

// Client Component ✅
import { authClient } from "@/lib/auth"
const { data: session } = authClient.useSession()
```

**Do not use `useSession` in layouts** — use `authServer.getSession()` instead.

### Sign-In Flow

Single page at `/auth/sign-in` using `AuthView`. After sign-in:
1. Redirects to `/`
2. Root page routes by role → `/dashboard` (admin) or `/portal` (beneficiary)
3. Beneficiaries with `forcePasswordChange=true` → redirect to `/portal/change-password`

### Proxy (Route Protection)

`src/proxy.ts` — Next.js 16 proxy (replaces deprecated `middleware.ts`):
- Checks `__Secure-neon-auth.session_token` cookie (works on localhost)
- Injects `x-pathname` header so portal layout can detect current route (prevents redirect loops)
- Optimistic only — real validation in Server Components

### Creating Beneficiary Accounts

Use `trpc.userManagement.createBeneficiaryUser` (admin only):

```typescript
createBeneficiaryUser.mutate({
    email: "user@example.com",
    name: "First Last",
    password: "temp-password",
    beneficiaryId: 123,
})
```

Steps: `createUser()` → set `emailVerified = true` via raw SQL → upsert `user_profile`.

**Critical:** Admin-created users need `emailVerified = true` or sign-in returns 403.

### DO NOT Use

```typescript
// ❌ Wrong cookie prefix
import { getSessionCookie } from 'better-auth/cookies'
getSessionCookie(request, { cookiePrefix: 'trust-admin' })  // Cookie does not exist

// ❌ authClient in Server Components
authClient.getSession()

// ❌ updateUser() — Neon Auth proxy returns 400
authServer.admin.updateUser(userId, { name: "..." })

// ✅ Update neon_auth.user directly
await getSql().query(
    `UPDATE neon_auth."user" SET "updatedAt" = $1 WHERE id = $2`,
    [new Date(), userId],
)
// neon_auth.user uses camelCase: "updatedAt", "emailVerified"
```

---

## Architecture

| Layer | Technology |
|-------|------------|
| Runtime | Bun |
| Framework | Next.js 16.1 (App Router, Turbopack) |
| API | tRPC v11 |
| Database | PostgreSQL (Neon serverless) |
| DB Driver | @neondatabase/serverless (HTTP) + postgres.js (transactions) |
| ORM | Drizzle ORM |
| Frontend | React 19 + TailwindCSS + shadcn/ui |
| Auth | Neon Auth (managed Better Auth, email/password) |
| Linting | Biome |
| Deployment | Vercel + Neon Postgres |

### Database

```
Production Queries (Drizzle)     Raw SQL/Tests (postgres.js)
         │                               │
         ▼                               ▼
   neon() HTTP driver            postgres.js client
   (fast, stateless)             (template strings, transactions)
         └──────────────┬────────────────┘
                        ▼
              Neon PostgreSQL (pooled)
              └── PgBouncer (10K connections)
```

**Key exports from `db/index.ts`:**
- `db` — Drizzle proxy: auth-enabled when JWT set, else `getPublicDb()`
- `getPublicDb()` — Drizzle as `neondb_owner` (BYPASSRLS) — seeds, migrations
- `getClient()` / `getSql()` — postgres.js for raw SQL and transactions
- `setRequestAuthToken(token)` — binds JWT to async context (called in tRPC `createContext`)

**RLS flow:**
1. tRPC `createContext` → `setRequestAuthToken(sessionJwt)`
2. `db` proxy detects token → auth-enabled Drizzle instance
3. Neon Authorize validates JWT → query runs as `authenticated` role
4. `app.is_admin()` / `app.get_user_beneficiary_id()` filter rows in policies
5. No token → `getPublicDb()` → `neondb_owner` → BYPASSRLS

**RLS scope (33 tables):**
- **Admin-only** (25 tables): all assets, liabilities, accounting, contacts, admin tables
- **Beneficiary-scoped** (SELECT: admin OR own row; mutations: admin only): `beneficiary`, `distribution`, `hems_request`, `withdrawal_record`
- **user_profile**: SELECT open to authenticated; mutations neondb_owner only
- Reference: `db/rls.ts`, `db/migrations/add-rls-policies.sql`

### tRPC Procedures

| Procedure | Access |
|-----------|--------|
| `publicProcedure` | No auth |
| `protectedProcedure` | Any authenticated user |
| `adminProcedure` | Admin role (includes owner email override) |
| `ownerProcedure` | Trust owner only (ADMIN_EMAIL) |
| `beneficiaryProcedure` | Beneficiary role only |

### Patterns

**tRPC router:**
```typescript
export const liabilityRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number() }))
        .query(async ({ input }) => liabilityCrud.getAllArray(input.entityId)),
})
```

**Frontend:**
```typescript
const { data } = trpc.liability.list.useQuery({ entityId: selectedEntity! })
const update = trpc.liability.update.useMutation({
    onSuccess: () => utils.liability.list.invalidate()
})
update.mutate({ id, entityId: selectedEntity!, data: { currentBalance: "5000" } })
```

**Page components** live in colocated `_components/` subfolders under each route directory.

---

## Key Workflows

### Recording a Liability Payment

```typescript
recordPayment.mutate({
    liabilityId: "xxx",
    paymentDate: "2025-01-15",
    amount: "1500.00",
    principalPortion: "1200.00",
    interestPortion: "300.00",
    paymentMethod: "CHECK"
})
```

Creates `liabilityPayment`, subtracts from `liability.currentBalance`, auto-creates `trustAccounting` EXPENSE entry.

### HEMS Request Flow

```
Beneficiary → trpc.hemsRequest.submit() → status: PENDING
Admin       → trpc.hemsRequest.approve() → status: APPROVED + auto-creates distribution record
Admin       → marks distribution paid → status: DISTRIBUTED (manual)
```

### Adding a New Resource

1. **Schema** (`db/schema.ts`): `pgTable` with indexes + FKs
2. **Relations** (`db/relations.ts`): add relations
3. **Validation** (`db/validation.ts`): insert/update Zod schemas
4. **CRUD** (`db/queries.ts`): `createCrud(table, { filterColumn: "entityId" })`
5. **Router** (`src/server/trpc/routers/new.ts`): procedures
6. **Register** (`src/server/trpc/routers/index.ts`): add to `appRouter`
7. `bun run db:push`

---

## Gotchas

| Issue | Solution |
|-------|----------|
| Money fields are strings | `"1500.00"` not `1500` — parse with `parseFloat()` for math, save as string |
| Mutations missing `entityId` | Most creates need `entityId` in payload |
| Date handling | Form→API: `new Date(val).toISOString()`, API→Form: `iso.split("T")[0]` |
| Enum type errors | Cast: `value as "CHECK" \| "ACH"` or use `isPaymentMethod()` type guard |
| Stale data after mutation | Invalidate related queries in `onSuccess` |
| Beneficiary sign-in 403 | Admin-created users need `emailVerified = true` in `neon_auth."user"` |
| Wrong auth cookie | Cookie is `__Secure-neon-auth.session_token`, not `trust-admin.*` |
| `neon_auth.user` columns | camelCase: `"emailVerified"`, `"updatedAt"` — not snake_case |
| Admin page routes | Live under `src/app/(admin)/` route group, not `src/app/` directly |
| `useSession` in layouts | Use `authServer.getSession()` in Server Components instead |
| `selectedEntity` timing | Use `{ enabled: !!selectedEntity }` to prevent queries before entity loads |

---

## Environment Variables

```bash
DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require
NEON_AUTH_BASE_URL=https://ep-xxx.neonauth.region.aws.neon.tech/neondb/auth
NEXT_PUBLIC_APP_URL=http://localhost:3000  # App base URL — used by NeonAuthUIProvider.baseURL for forgot-password reset links; set to https://trust.thehudsonfam.com in Vercel
ADMIN_EMAIL=rhudsontspr@gmail.com   # Always gets admin role regardless of DB state
UPLOADTHING_TOKEN=<token>
RESEND_API_KEY=<key>
SENTRY_ORG=<org-slug>               # URL slug from sentry.io/organizations/<slug>/ — NOT display name
SENTRY_PROJECT=<project-slug>       # URL slug from Sentry project settings — NOT display name
SENTRY_AUTH_TOKEN=<token>           # Required for source map uploads; build silently skips if absent
```

**Sentry env var gotchas:**
- Values must be URL slugs (e.g. `hudsor01`, `trust-admin`) — Sentry CLI rejects display names
- Trailing newlines in Vercel env vars silently corrupt the value → CLI error `invalid value 'trust-admin\n'`; retype values manually rather than pasting
