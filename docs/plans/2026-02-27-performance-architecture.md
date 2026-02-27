# Performance & Architecture Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform every admin page from a blank-shell-then-fetch SPA pattern into a server-prefetched, instantly-hydrated experience with persistent local cache, eliminating all loading spinners on repeat visits.

**Architecture:** Each admin page becomes a Server Component that prefetches its tRPC data and dehydrates it into the HTML payload; the `'use client'` content component rehydrates instantly with no loading state. All pure-CRUD tables (previously Neon Data API only) get tRPC routers so they participate in server prefetch and unified invalidation. React Query persists to localStorage so data survives browser refresh.

**Tech Stack:** Next.js 16 App Router (Server Components + Client Components), tRPC v11 `createServerSideHelpers`, `@tanstack/react-query` HydrationBoundary, `@tanstack/react-query-persist-client`, `@tanstack/query-sync-storage-persister`, Drizzle ORM, Neon Postgres, Bun

---

## Background: What's Wrong

Every admin page today:
1. Ships as empty HTML — server sends zero data
2. Client hydrates React, fires all queries simultaneously
3. User stares at a spinner until all queries resolve (~500ms–3s)
4. On refresh, the whole thing repeats (no cache persistence)

The fix is three layered improvements:
- **Layer 1 (Persistence):** Cache survives browser refresh via localStorage — instant load after first visit
- **Layer 2 (Suspense):** Page frame/header renders immediately; tables stream in behind skeletons — no blank flash
- **Layer 3 (Server Prefetch):** Data arrives WITH the HTML — zero loading state on first visit too

---

## Task 1: Disable Neon Scale-to-Zero

**Files:** No code changes — API call only

**Step 1: Run the API call**

```bash
curl --silent --request PATCH \
  --url https://console.neon.tech/api/v2/projects/fancy-lake-22079735/endpoints/ep-icy-salad-aewqpaip \
  --header 'authorization: Bearer napi_gwbyz60xd1jm701l2njvmr3d94e45l98taef3vgaspke6dj9kucgu7baup2u3sxp' \
  --header 'content-type: application/json' \
  --data '{"endpoint": {"suspend_timeout_seconds": 0}}' | jq '.endpoint.suspend_timeout_seconds'
```

Expected output: `0`

**Step 2: Verify**

```bash
curl --silent \
  --url https://console.neon.tech/api/v2/projects/fancy-lake-22079735/endpoints/ep-icy-salad-aewqpaip \
  --header 'authorization: Bearer napi_gwbyz60xd1jm701l2njvmr3d94e45l98taef3vgaspke6dj9kucgu7baup2u3sxp' | jq '.endpoint.suspend_timeout_seconds'
```

Expected: `0`

**Step 3: Commit**

```bash
git commit --allow-empty -m "ops: disable Neon compute scale-to-zero for always-warm DB"
```

---

## Task 2: Install Persistence Packages

**Files:**
- Modify: `package.json` (via bun add)

**Step 1: Install**

```bash
bun add @tanstack/react-query-persist-client @tanstack/query-sync-storage-persister
```

**Step 2: Verify installed**

```bash
grep "persist-client\|sync-storage" package.json
```

Expected: both packages appear in dependencies.

**Step 3: Commit**

```bash
git add package.json bun.lockb
git commit -m "deps: add React Query persistence packages"
```

---

## Task 3: Add React Query localStorage Persistence

**Files:**
- Modify: `src/lib/trpc-provider.tsx`

**Step 1: Read current file**

Read `src/lib/trpc-provider.tsx` — already done above.

**Step 2: Replace with persistence-enabled version**

```typescript
'use client'

import {
    PersistQueryClientProvider,
    type PersistedClient,
    type Persister,
} from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { QueryClient } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { useState } from 'react'
import { trpc } from './trpc'

function getBaseUrl() {
    if (typeof window !== 'undefined') return ''
    return `http://localhost:${process.env.PORT ?? 3000}`
}

// Persister is created lazily (only in browser — no SSR window access)
function createPersister(): Persister {
    return createSyncStoragePersister({
        storage: window.localStorage,
        key: 'trust-admin-query-cache',
        // Serialize/deserialize with date revival
        serialize: (client: PersistedClient) => JSON.stringify(client),
        deserialize: (str: string) => JSON.parse(str),
    })
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // Single-trustee app: mutations invalidate explicitly,
                        // so stale-time only governs background refetches
                        staleTime: 1000 * 60 * 5, // 5 min
                        gcTime: 1000 * 60 * 60 * 24, // 24 hrs — persist across sessions
                        retry: 1,
                        refetchOnWindowFocus: false,
                        refetchOnReconnect: false,
                    },
                },
            }),
    )

    const [trpcClient] = useState(() =>
        trpc.createClient({
            links: [
                httpBatchLink({
                    url: `${getBaseUrl()}/api/trpc`,
                    headers: () => ({}),
                }),
            ],
        }),
    )

    const [persister] = useState(() =>
        typeof window !== 'undefined' ? createPersister() : null,
    )

    const content = (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            {children}
            {process.env.NODE_ENV === 'development' && (
                <ReactQueryDevtools initialIsOpen={false} />
            )}
        </trpc.Provider>
    )

    if (!persister) {
        // SSR: no persistence, just the provider
        return (
            <trpc.Provider client={trpcClient} queryClient={queryClient}>
                {children}
            </trpc.Provider>
        )
    }

    return (
        <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{
                persister,
                maxAge: 1000 * 60 * 60 * 24, // 24 hours
                buster: process.env.NEXT_PUBLIC_CACHE_BUSTER ?? 'v1',
            }}
        >
            {content}
        </PersistQueryClientProvider>
    )
}
```

**Step 3: Run typecheck**

```bash
bun run typecheck 2>&1 | head -30
```

Expected: no errors related to trpc-provider.tsx

**Step 4: Commit**

```bash
git add src/lib/trpc-provider.tsx
git commit -m "perf: persist React Query cache to localStorage — instant reload after first visit"
```

---

## Task 4: Create Server-Side tRPC Helpers Utility

This utility is used by every Server Component page to prefetch data.

**Files:**
- Create: `src/lib/trpc-server.ts`

**Step 1: Create the file**

```typescript
/**
 * Server-side tRPC helpers for Next.js App Router Server Components.
 *
 * Usage in a page Server Component:
 *
 *   export default async function Page() {
 *     const helpers = await createTRPCHelpers()
 *     await helpers.liability.list.prefetch({ entityId: 1 })
 *     return (
 *       <HydrationBoundary state={dehydrate(helpers.queryClient)}>
 *         <LiabilitiesClient />
 *       </HydrationBoundary>
 *     )
 *   }
 */
import { createServerSideHelpers } from '@trpc/react-query/server'
import { headers } from 'next/headers'
import { appRouter } from '@/server/trpc/router'
import { createContext } from '@/server/trpc/init'

export async function createTRPCHelpers() {
    const headersList = await headers()
    const ctx = await createContext({ headers: headersList })
    return createServerSideHelpers({
        router: appRouter,
        ctx,
    })
}
```

**Step 2: Run typecheck**

```bash
bun run typecheck 2>&1 | grep "trpc-server" | head -10
```

Expected: no errors

**Step 3: Commit**

```bash
git add src/lib/trpc-server.ts
git commit -m "feat: add server-side tRPC helpers utility for RSC prefetching"
```

---

## Task 5: Create Shared Skeleton Components

One file of reusable skeletons used by loading.tsx files.

**Files:**
- Create: `src/components/skeletons.tsx`

**Step 1: Create the file**

```typescript
import { Skeleton } from '@/components/ui/skeleton'

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-8 w-24" />
            </div>
            <div className="rounded-md border">
                <div className="border-b p-3">
                    <div className="flex gap-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-4 w-24" />
                        ))}
                    </div>
                </div>
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="flex gap-4 border-b p-3 last:border-0">
                        {Array.from({ length: 4 }).map((_, j) => (
                            <Skeleton key={j} className="h-4 w-24" />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )
}

export function CardsSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="rounded-lg border p-4 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-8 w-24" />
                </div>
            ))}
        </div>
    )
}

export function PageSkeleton({ cards = 3, rows = 5 }: { cards?: number; rows?: number }) {
    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-72" />
            </div>
            <CardsSkeleton count={cards} />
            <TableSkeleton rows={rows} />
        </div>
    )
}

export function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96" />
            </div>
            <div className="grid gap-4 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-lg border p-4 space-y-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-8 w-20" />
                    </div>
                ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-64 rounded-lg" />
                <Skeleton className="h-64 rounded-lg" />
            </div>
            <TableSkeleton rows={6} />
        </div>
    )
}
```

**Step 2: Commit**

```bash
git add src/components/skeletons.tsx
git commit -m "feat: add shared skeleton components for loading states"
```

---

## Task 6: Add loading.tsx Files for All Admin Routes

Next.js uses these automatically as the Suspense fallback while the Server Component is streaming.

**Files to create (9 files):**
- `src/app/(admin)/dashboard/loading.tsx`
- `src/app/(admin)/accounts/loading.tsx`
- `src/app/(admin)/properties/loading.tsx`
- `src/app/(admin)/vehicles/loading.tsx`
- `src/app/(admin)/liabilities/loading.tsx`
- `src/app/(admin)/beneficiaries/loading.tsx`
- `src/app/(admin)/hems-queue/loading.tsx`
- `src/app/(admin)/trust-accounting/loading.tsx`
- `src/app/(admin)/users/loading.tsx`
- `src/app/(admin)/activity-log/loading.tsx`

**Step 1: Create dashboard/loading.tsx**

```typescript
import { DashboardSkeleton } from '@/components/skeletons'
export default function Loading() { return <DashboardSkeleton /> }
```

**Step 2: Create all other loading.tsx files**

For accounts, properties, vehicles, liabilities, beneficiaries, hems-queue, trust-accounting, users, activity-log — each gets:

```typescript
import { PageSkeleton } from '@/components/skeletons'
export default function Loading() { return <PageSkeleton /> }
```

**Step 3: Commit**

```bash
git add "src/app/(admin)/*/loading.tsx"
git commit -m "feat: add loading.tsx skeleton files for all admin routes"
```

---

## Task 7: Create tRPC Routers for Pure-CRUD Tables

The following tables are currently Neon Data API only. They need tRPC routers to participate in server-side prefetch and unified cache invalidation: `bank_account`, `investment_account`, `homestead`, `rental_property`, `vehicle`, `task`.

**Files:**
- Create: `src/server/trpc/routers/bankAccount.ts`
- Create: `src/server/trpc/routers/investmentAccount.ts`
- Create: `src/server/trpc/routers/homestead.ts`
- Create: `src/server/trpc/routers/rentalProperty.ts`
- Create: `src/server/trpc/routers/vehicle.ts`
- Create: `src/server/trpc/routers/task.ts`

**Step 1: Inspect schema fields for each table**

Read `db/schema.ts` lines around the table definitions found earlier (bankAccount:692, investmentAccount:766, homestead:499, rentalProperty:589, vehicle:417, task:1803). Read ~60 lines for each.

**Step 2: Create `src/server/trpc/routers/bankAccount.ts`**

Follow the pattern from `liability.ts`. Use `adminProcedure` for all operations. Include list, create, update, delete. Filter by `entityId` on all queries.

```typescript
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { bankAccount } from '@/db/schema'
import { insertBankAccountSchema, updateBankAccountSchema } from '@/db/validation'
import { adminProcedure, createTRPCRouter } from '../init'
import { TRPCError } from '@trpc/server'

export const bankAccountRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number() }))
        .query(({ input }) =>
            db.select().from(bankAccount).where(eq(bankAccount.entityId, input.entityId))
        ),

    create: adminProcedure
        .input(insertBankAccountSchema)
        .mutation(async ({ input }) => {
            const [created] = await db.insert(bankAccount).values(input).returning()
            return created
        }),

    update: adminProcedure
        .input(z.object({
            id: z.number(),
            entityId: z.number(),
            data: updateBankAccountSchema,
        }))
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(bankAccount)
                .set({ ...input.data, updatedAt: new Date() })
                .where(and(eq(bankAccount.id, input.id), eq(bankAccount.entityId, input.entityId)))
                .returning()
            if (!updated) throw new TRPCError({ code: 'NOT_FOUND' })
            return updated
        }),

    delete: adminProcedure
        .input(z.object({ id: z.number(), entityId: z.number() }))
        .mutation(async ({ input }) => {
            const [deleted] = await db
                .delete(bankAccount)
                .where(and(eq(bankAccount.id, input.id), eq(bankAccount.entityId, input.entityId)))
                .returning()
            if (!deleted) throw new TRPCError({ code: 'NOT_FOUND' })
            return deleted
        }),
})
```

**Step 3: Create the remaining 5 routers** following identical pattern for `investmentAccount`, `homestead`, `rentalProperty`, `vehicle`, `task`. Note:
- `task` does not have `entityId` — omit entity filter from all task operations
- Check `db/validation.ts` for the correct insert/update schema names for each table

**Step 4: Run typecheck after creating all routers**

```bash
bun run typecheck 2>&1 | grep "routers/" | head -20
```

Expected: no errors

**Step 5: Commit**

```bash
git add src/server/trpc/routers/bankAccount.ts src/server/trpc/routers/investmentAccount.ts \
        src/server/trpc/routers/homestead.ts src/server/trpc/routers/rentalProperty.ts \
        src/server/trpc/routers/vehicle.ts src/server/trpc/routers/task.ts
git commit -m "feat: add tRPC routers for bankAccount, investmentAccount, homestead, rentalProperty, vehicle, task"
```

---

## Task 8: Create dashboard.summary tRPC Procedure

Replaces 11 independent queries on the dashboard with a single server-side aggregation.

**Files:**
- Create: `src/server/trpc/routers/dashboard.ts`

**Step 1: Create the router**

```typescript
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import {
    bankAccount, beneficiary, distribution, hemsRequest,
    homestead, investmentAccount, liability, rentalProperty,
    task, trustAccounting, vehicle, withdrawalRecord,
} from '@/db/schema'
import { adminProcedure, createTRPCRouter } from '../init'
import { entityRouter } from './entity'

export const dashboardRouter = createTRPCRouter({
    summary: adminProcedure
        .input(z.object({ entityId: z.coerce.number() }))
        .query(async ({ input: { entityId } }) => {
            const [
                beneficiaries,
                withdrawalRecords,
                accountingEntries,
                hemsRequests,
                bankAccounts,
                investmentAccounts,
                homesteads,
                rentalProperties,
                vehicles,
                liabilities,
                tasks,
            ] = await Promise.all([
                db.select().from(beneficiary).where(eq(beneficiary.entityId, entityId)),
                db.select().from(withdrawalRecord).where(eq(withdrawalRecord.entityId, entityId)),
                db.select().from(trustAccounting).where(eq(trustAccounting.entityId, entityId)),
                db.select().from(hemsRequest).where(eq(hemsRequest.entityId, entityId)),
                db.select().from(bankAccount).where(eq(bankAccount.entityId, entityId)),
                db.select().from(investmentAccount).where(eq(investmentAccount.entityId, entityId)),
                db.select().from(homestead).where(eq(homestead.entityId, entityId)),
                db.select().from(rentalProperty).where(eq(rentalProperty.entityId, entityId)),
                db.select().from(vehicle).where(eq(vehicle.entityId, entityId)),
                db.select().from(liability).where(eq(liability.entityId, entityId)),
                db.select().from(task),
            ])

            return {
                beneficiaries,
                withdrawalRecords,
                accountingEntries,
                hemsRequests,
                bankAccounts,
                investmentAccounts,
                homesteads,
                rentalProperties,
                vehicles,
                liabilities,
                tasks,
            }
        }),
})
```

**Step 2: Run typecheck**

```bash
bun run typecheck 2>&1 | grep "dashboard" | head -10
```

**Step 3: Commit**

```bash
git add src/server/trpc/routers/dashboard.ts
git commit -m "feat: add dashboard.summary procedure — consolidates 11 queries into 1 server-side fetch"
```

---

## Task 9: Register All New Routers

**Files:**
- Modify: `src/server/trpc/router.ts`

**Step 1: Update router.ts**

```typescript
import { createTRPCRouter } from './init'

import { activityLogRouter } from './routers/activityLog'
import { bankAccountRouter } from './routers/bankAccount'
import { beneficiaryRouter } from './routers/beneficiary'
import { contactRouter } from './routers/contact'
import { dashboardRouter } from './routers/dashboard'
import { distributionRouter } from './routers/distribution'
import { entityRouter } from './routers/entity'
import { hemsRequestRouter } from './routers/hemsRequest'
import { homesteadRouter } from './routers/homestead'
import { investmentAccountRouter } from './routers/investmentAccount'
import { liabilityRouter } from './routers/liability'
import { liabilityPaymentRouter } from './routers/liabilityPayment'
import { pendingInventoryItemRouter } from './routers/pendingInventoryItem'
import { rentalPropertyRouter } from './routers/rentalProperty'
import { taskRouter } from './routers/task'
import { trustAccountingRouter } from './routers/trustAccounting'
import { userManagementRouter } from './routers/userManagement'
import { valuationRouter } from './routers/valuation'
import { vehicleRouter } from './routers/vehicle'
import { withdrawalRecordRouter } from './routers/withdrawalRecord'

export const appRouter = createTRPCRouter({
    // Core
    entity: entityRouter,
    beneficiary: beneficiaryRouter,
    contact: contactRouter,

    // Assets (now unified via tRPC)
    bankAccount: bankAccountRouter,
    investmentAccount: investmentAccountRouter,
    homestead: homesteadRouter,
    rentalProperty: rentalPropertyRouter,
    vehicle: vehicleRouter,

    // Liabilities
    liability: liabilityRouter,
    liabilityPayment: liabilityPaymentRouter,

    // Accounting
    trustAccounting: trustAccountingRouter,
    valuation: valuationRouter,

    // Beneficiary workflows
    hemsRequest: hemsRequestRouter,
    distribution: distributionRouter,
    withdrawalRecord: withdrawalRecordRouter,

    // Operations
    task: taskRouter,
    dashboard: dashboardRouter,

    // Audit & inventory
    activityLog: activityLogRouter,
    pendingInventoryItem: pendingInventoryItemRouter,

    // User management
    userManagement: userManagementRouter,
})

export type AppRouter = typeof appRouter
```

**Step 2: Run typecheck**

```bash
bun run typecheck 2>&1 | head -20
```

Expected: no errors

**Step 3: Commit**

```bash
git add src/server/trpc/router.ts
git commit -m "feat: register all new tRPC routers — unified data access layer"
```

---

## Task 10: Split Dashboard Page — Server Component Wrapper + Client Content

This is the pattern repeated for every page. Dashboard is done first as the template.

**Files:**
- Create: `src/app/(admin)/dashboard/_components/DashboardClient.tsx` (move current page.tsx content here)
- Modify: `src/app/(admin)/dashboard/page.tsx` (replace with Server Component wrapper)

**Step 1: Read current dashboard/page.tsx fully**

Read `src/app/(admin)/dashboard/page.tsx` — all lines.

**Step 2: Create DashboardClient.tsx**

Move the entire current `page.tsx` content (the `'use client'` component) into `_components/DashboardClient.tsx`. Update all `useNeonList` / `useNeonMutations` calls to use tRPC instead:

```typescript
// Replace these imports and hooks:
// import { useNeonList, useNeonMutations } from '@/hooks/use-neon-data'
// useNeonList<Task>('task')
// useNeonList<BankAccount>('bank_account', entityFilter)
// etc.

// With:
const { data: summary } = trpc.dashboard.summary.useQuery({ entityId })
// Then destructure: summary.tasks, summary.bankAccounts, etc.
```

Remove the `loading` flag and full-page `<Loader2>` spinner (Suspense + loading.tsx handles this now).

**Step 3: Update page.tsx to Server Component**

```typescript
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createTRPCHelpers } from '@/lib/trpc-server'
import DashboardClient from './_components/DashboardClient'

export default async function DashboardPage() {
    const helpers = await createTRPCHelpers()
    await Promise.all([
        helpers.dashboard.summary.prefetch({ entityId: 1 }),
        helpers.entity.byId.prefetch(1),
    ])

    return (
        <HydrationBoundary state={dehydrate(helpers.queryClient)}>
            <DashboardClient />
        </HydrationBoundary>
    )
}
```

**Step 4: Run typecheck**

```bash
bun run typecheck 2>&1 | grep "dashboard" | head -20
```

**Step 5: Run dev server and verify dashboard loads**

```bash
bun run dev
```

Navigate to `/dashboard`. Verify:
- No loading spinner on first load
- Data appears immediately
- Browser DevTools Network tab shows no client-side tRPC fetch on initial load

**Step 6: Commit**

```bash
git add "src/app/(admin)/dashboard/"
git commit -m "perf: server-prefetch dashboard — 11 queries → 1, zero loading state"
```

---

## Task 11: Split Accounts Page

**Files:**
- Create: `src/app/(admin)/accounts/_components/AccountsClient.tsx`
- Modify: `src/app/(admin)/accounts/page.tsx`

**Step 1: Create AccountsClient.tsx**

Move entire current `page.tsx` content here. Replace `useNeonList` / `useNeonMutations` calls:

```typescript
// Before:
const { data: bankAccounts = [] } = useNeonList<BankAccount>('bank_account', { entity_id: entityId })
const { create, update, delete: del } = useNeonMutations<BankAccount>('bank_account')

// After:
const { data: bankAccounts = [] } = trpc.bankAccount.list.useQuery({ entityId })
const utils = trpc.useUtils()
// mutations become:
const createMutation = trpc.bankAccount.create.useMutation({ onSuccess: () => utils.bankAccount.list.invalidate() })
const updateMutation = trpc.bankAccount.update.useMutation({ onSuccess: () => utils.bankAccount.list.invalidate() })
const deleteMutation = trpc.bankAccount.delete.useMutation({ onSuccess: () => utils.bankAccount.list.invalidate() })
```

Repeat for `investmentAccount`.

**Step 2: Update page.tsx**

```typescript
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createTRPCHelpers } from '@/lib/trpc-server'
import AccountsClient from './_components/AccountsClient'

export default async function AccountsPage() {
    const helpers = await createTRPCHelpers()
    await Promise.all([
        helpers.bankAccount.list.prefetch({ entityId: 1 }),
        helpers.investmentAccount.list.prefetch({ entityId: 1 }),
    ])

    return (
        <HydrationBoundary state={dehydrate(helpers.queryClient)}>
            <AccountsClient />
        </HydrationBoundary>
    )
}
```

**Step 3: Typecheck + commit**

```bash
bun run typecheck 2>&1 | grep "accounts" | head -10
git add "src/app/(admin)/accounts/"
git commit -m "perf: server-prefetch accounts page — convert bankAccount/investmentAccount to tRPC"
```

---

## Task 12: Split Properties Page

**Files:**
- Create: `src/app/(admin)/properties/_components/PropertiesClient.tsx`
- Modify: `src/app/(admin)/properties/page.tsx`

Same pattern as Task 11. Replace:
- `useNeonList('homestead')` → `trpc.homestead.list.useQuery({ entityId })`
- `useNeonList('rental_property')` → `trpc.rentalProperty.list.useQuery({ entityId })`
- `useNeonMutations('homestead')` → individual `trpc.homestead.create/update/delete.useMutation()`
- `useNeonMutations('rental_property')` → individual tRPC mutations

Server Component prefetches:
```typescript
await Promise.all([
    helpers.homestead.list.prefetch({ entityId: 1 }),
    helpers.rentalProperty.list.prefetch({ entityId: 1 }),
])
```

**Commit:**

```bash
git add "src/app/(admin)/properties/"
git commit -m "perf: server-prefetch properties page — convert homestead/rentalProperty to tRPC"
```

---

## Task 13: Split Vehicles Page

**Files:**
- Create: `src/app/(admin)/vehicles/_components/VehiclesClient.tsx`
- Modify: `src/app/(admin)/vehicles/page.tsx`

Replace:
- `useNeonList('vehicle')` → `trpc.vehicle.list.useQuery({ entityId })`
- `useNeonMutations('vehicle')` → tRPC mutations

Server Component prefetches:
```typescript
await helpers.vehicle.list.prefetch({ entityId: 1 })
```

**Commit:**

```bash
git add "src/app/(admin)/vehicles/"
git commit -m "perf: server-prefetch vehicles page — convert vehicle to tRPC"
```

---

## Task 14: Split Liabilities Page

**Files:**
- Create: `src/app/(admin)/liabilities/_components/LiabilitiesClient.tsx`
- Modify: `src/app/(admin)/liabilities/page.tsx`

The liabilities page uses `trpc.liability.*` (already tRPC) plus `useNeonList('bank_account')` for the payment form selector. Replace the bank account call with `trpc.bankAccount.list.useQuery({ entityId })`.

Also fix: `utils.trustAccounting.list.invalidate()` is already correct from earlier session.

Server Component prefetches:
```typescript
await Promise.all([
    helpers.liability.list.prefetch({ entityId: 1 }),
    helpers.bankAccount.list.prefetch({ entityId: 1 }),
])
```

**Commit:**

```bash
git add "src/app/(admin)/liabilities/"
git commit -m "perf: server-prefetch liabilities page"
```

---

## Task 15: Split Remaining Pages (Beneficiaries, HEMS Queue, Trust Accounting, Users, Activity Log)

Apply the same pattern to each remaining page. For each:

1. Create `_components/[PageName]Client.tsx` — move `'use client'` content
2. Update `page.tsx` to Server Component with `createTRPCHelpers()` + `prefetch` + `HydrationBoundary`

**Procedures to prefetch per page:**

| Page | Prefetch calls |
|------|---------------|
| `beneficiaries` | `helpers.beneficiary.listWithDistributions.prefetch({ entityId: 1 })` |
| `hems-queue` | `helpers.hemsRequest.listWithBeneficiary.prefetch({ entityId: 1 })` |
| `trust-accounting` | `helpers.trustAccounting.list.prefetch({ entityId: 1 })` |
| `users` | `helpers.userManagement.listAllUsers.prefetch()`, `helpers.userManagement.isOwner.prefetch()` |
| `activity-log` | `helpers.activityLog.list.prefetch({ limit: 100 })` |

**Commit each page separately:**

```bash
git add "src/app/(admin)/beneficiaries/"
git commit -m "perf: server-prefetch beneficiaries page"

git add "src/app/(admin)/hems-queue/"
git commit -m "perf: server-prefetch hems-queue page"

git add "src/app/(admin)/trust-accounting/"
git commit -m "perf: server-prefetch trust-accounting page"

git add "src/app/(admin)/users/"
git commit -m "perf: server-prefetch users page"

git add "src/app/(admin)/activity-log/"
git commit -m "perf: server-prefetch activity-log page"
```

---

## Task 16: Add Navigation Hover Prefetch to Sidebar

When a nav link is hovered, prefetch that route's primary data so it's ready before click.

**Files:**
- Modify: `src/components/app-sidebar.tsx`

**Step 1: Read app-sidebar.tsx fully**

**Step 2: Add prefetch on hover to nav items**

```typescript
'use client'
import { trpc } from '@/lib/trpc'

// Inside the component, create utils once:
const utils = trpc.useUtils()

// Helper to prefetch a route's data
const prefetchRoute = (route: string) => {
    const entityId = 1
    switch (route) {
        case '/accounts':
            utils.bankAccount.list.prefetch({ entityId })
            utils.investmentAccount.list.prefetch({ entityId })
            break
        case '/properties':
            utils.homestead.list.prefetch({ entityId })
            utils.rentalProperty.list.prefetch({ entityId })
            break
        case '/vehicles':
            utils.vehicle.list.prefetch({ entityId })
            break
        case '/liabilities':
            utils.liability.list.prefetch({ entityId })
            utils.bankAccount.list.prefetch({ entityId })
            break
        case '/beneficiaries':
            utils.beneficiary.listWithDistributions.prefetch({ entityId })
            break
        case '/hems-queue':
            utils.hemsRequest.listWithBeneficiary.prefetch({ entityId })
            break
        case '/trust-accounting':
            utils.trustAccounting.list.prefetch({ entityId })
            break
        case '/dashboard':
            utils.dashboard.summary.prefetch({ entityId })
            break
    }
}

// Add to each nav link:
<Link
    href={item.href}
    onMouseEnter={() => prefetchRoute(item.href)}
>
```

**Step 3: Typecheck + commit**

```bash
bun run typecheck 2>&1 | grep "sidebar" | head -10
git add src/components/app-sidebar.tsx
git commit -m "perf: prefetch route data on nav link hover — zero-latency navigation"
```

---

## Task 17: Dashboard Tab Lazy Loading

Currently all 4 dashboard tabs render and fetch on load. Only the active tab should be rendered.

**Files:**
- Modify: `src/app/(admin)/dashboard/_components/DashboardClient.tsx`

**Step 1: Wrap inactive tab content in lazy Suspense**

```typescript
import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { TableSkeleton } from '@/components/skeletons'

// Lazy load non-default tab panels
const LiabilitiesPanel = dynamic(() => import('./LiabilitiesPanel'), {
    loading: () => <TableSkeleton rows={4} />,
})
const WithdrawalsPanel = dynamic(() => import('./WithdrawalsPanel'), {
    loading: () => <TableSkeleton rows={4} />,
})
const AccountingSummary = dynamic(() => import('./AccountingSummary'), {
    loading: () => <TableSkeleton rows={4} />,
})

// In JSX:
<TabsContent value="liabilities">
    <Suspense fallback={<TableSkeleton rows={4} />}>
        <LiabilitiesPanel liabilities={summary.liabilities} />
    </Suspense>
</TabsContent>
```

**Step 2: Typecheck + commit**

```bash
bun run typecheck 2>&1 | grep "Dashboard" | head -10
git add "src/app/(admin)/dashboard/_components/DashboardClient.tsx"
git commit -m "perf: lazy-load dashboard tab panels — faster initial render"
```

---

## Task 18: Final Verification

**Step 1: Full typecheck**

```bash
bun run typecheck
```

Expected: 0 errors

**Step 2: Unit tests**

```bash
bun test
```

Expected: all passing

**Step 3: Build verification**

```bash
bun run build 2>&1 | tail -20
```

Expected: successful build, no errors

**Step 4: Manual smoke test**

Start dev server:
```bash
bun run dev
```

Verify for each page:
- [ ] First visit: no loading spinner, data appears immediately
- [ ] Browser refresh: data appears instantly (from localStorage cache)
- [ ] Hover sidebar link: data prefetched (check Network tab — requests fire on hover)
- [ ] Dashboard: loads in one network request, all 4 tabs work
- [ ] Accounts/Properties/Vehicles: data from tRPC, mutations work (create/edit/delete)
- [ ] Liabilities page: bank account selector populated

**Step 5: Commit final state**

```bash
git add -A
git commit -m "perf: complete performance architecture overhaul — server prefetch, persistence, lazy tabs"
```

---

## Step 6: Push to PR

```bash
git push origin session/sentry-monitoring-bugfixes
```

---

## Expected User Experience After

| Scenario | Before | After |
|----------|--------|-------|
| First page load (cold Neon) | 1–3s blank spinner | ~100ms (compute always warm) |
| First page load (warm Neon) | 300–800ms spinner | <100ms (server prefetched) |
| Browser refresh | Full reload + spinner | Instant (localStorage cache) |
| Switching between pages | 300–500ms spinner | ~0ms (hover prefetch + cache) |
| Dashboard specifically | 1–2s for 11 queries | <100ms (1 summary query) |
