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
bun run dev              # Dev server on :3000
bun run build            # Production build
bun run build:analyze    # Bundle analysis (ANALYZE=true)
bun run start            # Production server
bun run typecheck        # tsc --noEmit
bun run lint             # biome check .
bun run lint:fix         # biome check --write .
bun run format           # biome format --write .

bun test                 # Unit + component tests (timeout 30s)
bun run test:unit        # Same as `bun test` with --bail
bun run test:watch       # Watch mode
bun run test:coverage    # Coverage report
bun run test:e2e         # Playwright E2E (requires app on :3000)

bun run db:generate      # drizzle-kit generate (SQL migrations)
bun run db:migrate       # drizzle-kit migrate (apply migrations)
bun run db:deploy        # generate + migrate (preferred for schema changes)
bun run db:pull          # Introspect DB → schema.ts
bun run db:studio        # Drizzle Studio GUI
bun run db:seed          # Seed Hudson Trust data (db/seed-hudson-trust.ts)
bun run db:seed:dev      # Dev-only seed (db/seed-dev.ts)
bun run db:seed:reset    # drizzle-seed reset (truncate)
```

**Always use `bun`** — not npm/node/npx. Bun auto-loads `.env`.

**`db:push` is broken** — `drizzle-kit push` mishandles RLS policies on this schema. The script prints a warning and runs anyway, but use `db:deploy` for any schema change.

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

`db/schema.ts` defines **34 tables**. **27** have `.enableRLS()`.

### Core

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `entity` | Trust container | `entityType`, `trustType`, `dod`, `governingLaw` |
| `beneficiary` | Trust beneficiaries | `sharePercent`, `distributionStandard`, `withdrawalAge1/2`, `withdrawalPct1/2` |
| `trustAccounting` | Income/expense ledger | `entryType` (INCOME/EXPENSE), `isPrincipal`, `amount` |
| `activityLog` | Audit trail | global, no `entityId` filter |

### Assets (7 tables)

All share: `entityId`, `dodValue`, `dodValueDate`, `status`, `transferStatus`.

`vehicle`, `homestead`, `rentalProperty`, `bankAccount`, `investmentAccount`, `insurancePolicy`, `personalProperty`

> **No separate `artwork` table** — artwork is a category within `personalProperty` (the `/artwork` admin page filters that table). The mental model diagram is conceptual.

**Secured debt links:** `liability.homesteadId`, `liability.rentalPropertyId`, `liability.vehicleId`

### Distributions

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `hemsRequest` | Beneficiary requests | `category` (HEALTH/EDUCATION/MAINTENANCE/SUPPORT), `status`, `amountRequested`, `approvedAmount`, `justification`, `distributionId` |
| `distribution` | Actual payouts | `distributionType`, `tax1099Issued`, `beneficiaryId` |
| `withdrawalRecord` | Age-based withdrawals | `withdrawalType`, `eligibleAmount`, `withdrawnAmount` |

**hemsRequest fields:** `amountRequested` (not `requestedAmount`), `justification` (not `description`), `distributionId` (FK set on approve).

### Supporting tables

`valuation`, `valuationCorrection`, `inventoryAnalysisCache` (AI agent results, TTL'd), `document`, `transaction`, `contact`, `contactAssociation`, `task`, `trustee`, `specificBequest`, `liabilityPayment`, `trusteeFeeSchedule`, `trusteeFeeEntry`.

### Auth Tables

| Table | Location | Notes |
|-------|----------|-------|
| `neon_auth."user"` | Neon Auth managed | camelCase columns: `emailVerified`, `updatedAt` |
| `userProfile` | `public.user_profile` | App-managed: `role`, `beneficiaryId`, `forcePasswordChange`. **No RLS** (mutations gated through admin tRPC) |
| `passwordResetToken` | `public` | Custom forgot-password flow (n8n webhook). `token`, `email`, `expiresAt`, `usedAt` |
| `session`, `account`, `verification` | `public` | Legacy Better Auth tables, 0 rows. Ignore |
| `user` | `public` | Legacy from schema migration, 0 rows. Ignore |

**Do NOT write directly to `neon_auth.*` tables** — use the Admin plugin API. Exception: `UPDATE neon_auth."user" SET "emailVerified" = true` after `createUser()` (see below).

---

## Neon Auth

Managed Better Auth — no local config. Packages: `@neondatabase/auth` (+ `/next`, `/next/server`, `/react`). Replaced Next.js's deprecated `middleware.ts` with `src/proxy.ts`.

### Layout

```
src/
├── proxy.ts                            # Cookie check + x-pathname header
├── lib/auth.ts                         # Types (AppUser, SessionData), guards, re-exports
├── lib/auth/{client,server}.ts         # createAuthClient() / createAuthServer()
├── app/auth/[path]/page.tsx            # AuthView; renders custom forms for /forgot-password, /reset-password
├── app/api/auth/[...path]/route.ts     # Neon Auth catch-all
├── app/api/auth/custom/{forgot,reset}-password/route.ts
└── app/portal/{layout,change-password/page}.tsx
```

`AppUser.role` is `'admin' | 'beneficiary' | 'user'`. **tRPC trusts `user_profile.role`**; layout guards read native `session.user.role`.

### Sessions

```tsx
// Server Component
import { authServer } from "@/lib/auth"
const { data: session } = await authServer.getSession()

// Client Component
import { authClient } from "@/lib/auth"
const { data: session } = authClient.useSession()
```

Never `useSession` in layouts (use `authServer`); never `authClient` in Server Components.

### Role resolution (`src/server/trpc/init.ts`)

`ADMIN_EMAIL` always wins → else `user_profile.role` → else `'user'`. The resolved role + JWT is cached ~4 minutes per session token. `createContext` calls `setRequestAuthToken(jwt)` so RLS queries run as `authenticated`.

### Proxy (`src/proxy.ts`)

Optimistic — checks `__Secure-neon-auth.session_token` (works on localhost; `__Secure-` allows it), redirects unauthenticated to `/auth/sign-in`. Injects `x-pathname` into request headers so the portal layout can avoid redirect loops. Public paths: `/`, `/auth`, `/api/{auth,trpc,e2e,health,inventory}`, `/forms`, `/_next`. Real validation happens in Server Components and tRPC.

### Flows

**Sign-in:** `AuthView` redirects to `/`. Root routes by role → `/dashboard` (admin) or `/portal` (beneficiary, or `/portal/change-password` if `forcePasswordChange=true`).

**Forgot/reset:** custom forms POST to `/api/auth/custom/{forgot,reset}-password`. Forgot stores a token in `password_reset_token` and POSTs `{ email, name, resetLink }` to `N8N_PASSWORD_RESET_WEBHOOK_URL`. Reset validates the token and calls `authServer.admin.setUserPassword()`.

**Beneficiary creation** (`trpc.userManagement.createBeneficiaryUser`, admin only): `authServer.admin.createUser()` → raw SQL `UPDATE neon_auth."user" SET "emailVerified" = true WHERE id = $1` → upsert `user_profile`. **Skipping the emailVerified update returns 403 on sign-in.**

### Don'ts

- `authServer.admin.updateUser()` — Neon Auth proxy returns 400. Write directly to `neon_auth."user"` instead (camelCase columns: `"emailVerified"`, `"updatedAt"`)
- `getSessionCookie` from `better-auth/cookies` — wrong cookie name for Neon Auth
- `authClient` in Server Components / `useSession` in layouts (see Sessions)

---

## Architecture

Bun runtime · Next.js 16.2 (App Router, Turbopack, React Compiler) · React 19.2 · TailwindCSS 4 + shadcn/ui (slate) + Radix · react-hook-form + zod · @tanstack/{react-table, react-virtual} · tRPC v11 · Drizzle 0.45 + drizzle-zod on Neon Postgres (`@neondatabase/serverless` HTTP + `postgres.js` for transactions) · Neon Auth · `@anthropic-ai/sdk` (Managed Agents beta) · UploadThing · `@sentry/nextjs` (server/client/edge) · Biome 2.4 · TypeScript 6 · Vercel.

### Database (`db/index.ts`)

Two drivers behind a Drizzle proxy: `@neondatabase/serverless` (HTTP, stateless) for queries; `postgres.js` for transactions and raw SQL.

- `db` — Drizzle proxy. Auth-enabled when a JWT is bound to AsyncLocalStorage; else `getPublicDb()`
- `getPublicDb()` — Drizzle as `neondb_owner` (BYPASSRLS) — seeds, migrations
- `getClient()` — postgres.js client (transactions)
- `getSql()` — raw `neon()` for tagged-template queries
- `setRequestAuthToken(token)` — binds JWT for the request (called by tRPC `createContext`)

**RLS:** tRPC binds the session JWT → auth-enabled Drizzle runs as `authenticated` role → `app.is_admin()` / `app.get_user_beneficiary_id()` policies filter rows. No token → `neondb_owner` (BYPASSRLS). Beneficiary-scoped tables (`beneficiary`, `distribution`, `hemsRequest`, `withdrawalRecord`) allow SELECT for admin or own row, mutations admin-only. `userProfile` has no RLS — gated through admin tRPC. Reference: `db/rls.ts`, `db/migrations/add-rls-policies.sql`.

### tRPC

`src/server/trpc/init.ts` defines context, procedures, JWT cache, and role resolution. `src/server/trpc/router.ts` registers the 25 domain routers under `routers/`. Procedures: `publicProcedure`, `protectedProcedure`, `adminProcedure` (includes owner-email override), `ownerProcedure` (`ADMIN_EMAIL` only), `beneficiaryProcedure`.

```typescript
// Router
export const liabilityRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number() }))
        .query(({ input }) => liabilityCrud.getAllArray(input.entityId)),
})

// Frontend — always gate on selectedEntity, invalidate on mutation
const { data } = trpc.liability.list.useQuery(
    { entityId: selectedEntity! },
    { enabled: !!selectedEntity },
)
const update = trpc.liability.update.useMutation({
    onSuccess: () => utils.liability.list.invalidate(),
})
```

### App layout

Admin pages live under `src/app/(admin)/` (route group, hidden from URL): `accounting`, `accounts`, `activity-log`, `artwork`, `beneficiaries`, `bequests`, `contacts`, `dashboard`, `hems`, `hems-queue`, `insurance`, `liabilities`, `personal-property`, `properties`, `settings`, `trustees`, `users`, `vehicles`. Page-local code lives in colocated `_components/` and `_actions/` subfolders.

### Inventory Agent (Anthropic Managed Agents)

`src/lib/inventory-agent.ts` runs an async session: `/api/inventory/analyze` kicks off, `/api/inventory/analyze/status` polls. Results cache in `inventoryAnalysisCache` keyed by sessionId. When `ANTHROPIC_AGENT_ID` + `ANTHROPIC_AGENT_ENVIRONMENT_ID` are set the request goes through the managed agent; otherwise it falls back to direct tool-use in `src/lib/inventory-analysis.ts`. **`ANTHROPIC_AGENT_VAULT_IDS` must be attached via `client.beta.sessions.create({ vault_ids })`** — without it the agent runs but credentialed MCP calls (e.g. the Airtable writer) fail silently.

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
    paymentMethod: "CHECK",
})
```

Creates `liabilityPayment`, subtracts from `liability.currentBalance`, auto-creates `trustAccounting` EXPENSE entry.

### HEMS Request Flow

```
Beneficiary → trpc.hemsRequest.submit()  → status: PENDING
Admin       → trpc.hemsRequest.approve() → status: APPROVED + auto-creates distribution record
Admin       → marks distribution paid    → status: DISTRIBUTED (manual)
```

### Adding a New Resource

1. **Schema** (`db/schema.ts`): `pgTable` with indexes + FKs (+ `.enableRLS()` if scoped)
2. **Relations** (`db/relations.ts`)
3. **Validation** (`db/validation.ts`): insert/update Zod schemas
4. **CRUD** (`db/queries.ts`): `createCrud(table, { filterColumn: "entityId" })`
5. **Router** (`src/server/trpc/routers/<name>.ts`)
6. **Register** (`src/server/trpc/router.ts`): add to `appRouter`
7. `bun run db:deploy` (NOT `db:push` — see Commands)

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
| `db:push` corrupts RLS | drizzle-kit push mishandles policies on this schema — use `db:deploy` |
| Inventory agent silent fail | If Airtable row never appears, check `ANTHROPIC_AGENT_VAULT_IDS` is set in env |
| TS 6 `types: ["node"]` | Explicit because TS 6 changed the default from `["*"]` to `[]` — without it, Node globals (`process`, `Buffer`) stop resolving |
| Vercel env trailing newlines | Pasted Vercel env values silently include `\n` and break Sentry CLI / etc — retype manually |

---

## Environment Variables

Defined and validated in `src/lib/env.ts` (`@t3-oss/env-nextjs`). All server values are `.trim()`'d to strip Vercel's trailing newlines.

### Server (required)

```bash
DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require
NEON_AUTH_BASE_URL=https://ep-xxx.neonauth.region.aws.neon.tech/neondb/auth
ADMIN_EMAIL=rhudsontspr@gmail.com         # Always gets admin role regardless of DB
NEON_AUTH_COOKIE_SECRET=<>=32 chars>      # Cookie signing
```

### Server (optional)

```bash
NODE_ENV=development|production|test
LOG_LEVEL=debug|info|warn|error           # Default: info

# Anthropic Managed Agent (Estate Property Valuation)
ANTHROPIC_API_KEY=<key>
ANTHROPIC_AGENT_ID=<id>                   # Set both ID + ENVIRONMENT_ID to route through managed agent
ANTHROPIC_AGENT_ENVIRONMENT_ID=<id>
ANTHROPIC_AGENT_VAULT_IDS=vlt_xxx,vlt_yyy # Comma-separated; required for MCP credentials (e.g. Airtable)

INVENTORY_ACCESS_CODE=<code>              # Gate the public /forms inventory submission

UPLOADTHING_TOKEN=<token>

SENTRY_DSN=<url>
SENTRY_ORG=<org-slug>                     # URL slug (e.g. hudsor01) — NOT display name
SENTRY_PROJECT=<project-slug>             # URL slug (e.g. trust-admin) — NOT display name
SENTRY_AUTH_TOKEN=<token>                 # Required for source map uploads; build silently skips if absent

N8N_PASSWORD_RESET_WEBHOOK_URL=<url>      # Custom forgot-password email delivery
```

### Client

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000   # http://localhost:3000 in dev; https://trust.thehudsonfam.com in prod
NEXT_PUBLIC_SENTRY_DSN=<url>                # Mirror of SENTRY_DSN for client bundle
NEXT_PUBLIC_NEON_DATA_API_URL=<url>
```

### Sentry env var gotchas

- Values must be URL slugs (e.g. `hudsor01`, `trust-admin`) — Sentry CLI rejects display names
- Trailing newlines in Vercel env vars silently corrupt the value → CLI error `invalid value 'trust-admin\n'`. The `.trim()` in `env.ts` covers app code, but the Sentry CLI reads `process.env` directly — retype values in Vercel rather than pasting
