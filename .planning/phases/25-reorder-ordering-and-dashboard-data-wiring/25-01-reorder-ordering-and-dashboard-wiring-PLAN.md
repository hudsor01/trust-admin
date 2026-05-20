---
phase: 25-reorder-ordering-and-dashboard-data-wiring
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - tests/trpc/dashboard.test.ts
  - src/server/trpc/routers/trustee.ts
  - src/server/trpc/routers/beneficiary.ts
  - db/queries.ts
  - src/server/trpc/routers/dashboard.ts
  - src/app/(admin)/accounts/_components/AccountsClient.tsx
  - src/app/(admin)/trustees/_components/TrusteesClient.tsx
  - src/app/(admin)/beneficiaries/_components/BeneficiariesClient.tsx
  - next.config.ts
  - package.json
autonomous: true
requirements: []

must_haves:
  truths:
    - "trustee.list returns rows ordered by trustee.order ascending (persisted reorder honored by the DataTable, not just the SortableList cards)"
    - "beneficiary.list and beneficiary.listWithDistributions return rows ordered by beneficiary.sortIndex ascending"
    - "The migration-0012 composite indexes idx_trustee_entity_order and idx_beneficiary_entity_sort back the new ORDER BY queries (ORDER BY columns match index columns)"
    - "trpc.dashboard.activityCounts returns a per-day activity-count series from activity_log for a given tableName, scoped to one entity"
    - "The /accounts KPI strip '30d activity' column renders a real sparkline driven by activityCounts (no longer '—' / sparklineSeries: undefined)"
    - "ANALYZE=true bun run build emits a bundle-analyzer report"
  artifacts:
    - path: "tests/trpc/dashboard.test.ts"
      provides: "tRPC tests for dashboard.activityCounts (admin-only, entityId-scoped, tableName allowlist, day-series shape)"
      contains: "activityCounts"
    - path: "src/server/trpc/routers/trustee.ts"
      provides: "trustee.list with .orderBy(asc(trustee.order))"
      contains: "orderBy(asc(trustee.order))"
    - path: "src/server/trpc/routers/beneficiary.ts"
      provides: "beneficiary.list with .orderBy(asc(beneficiary.sortIndex))"
      contains: "orderBy(asc(beneficiary.sortIndex))"
    - path: "db/queries.ts"
      provides: "getBeneficiariesWithDistributions ordered by sortIndex"
      contains: "sortIndex"
    - path: "src/server/trpc/routers/dashboard.ts"
      provides: "dashboard.activityCounts adminProcedure query"
      contains: "activityCounts:"
    - path: "next.config.ts"
      provides: "withBundleAnalyzer wrapper composed with withSentryConfig"
      contains: "withBundleAnalyzer"
    - path: "package.json"
      provides: "@next/bundle-analyzer dev dependency"
      contains: "@next/bundle-analyzer"
  key_links:
    - from: "src/server/trpc/routers/trustee.ts"
      to: "idx_trustee_entity_order (migration 0012)"
      via: ".orderBy(asc(trustee.order)) over a WHERE eq(trustee.entityId)"
      pattern: "orderBy\\(asc\\(trustee\\.order\\)\\)"
    - from: "src/server/trpc/routers/beneficiary.ts"
      to: "idx_beneficiary_entity_sort (migration 0012)"
      via: ".orderBy(asc(beneficiary.sortIndex)) over a WHERE eq(beneficiary.entityId)"
      pattern: "orderBy\\(asc\\(beneficiary\\.sortIndex\\)\\)"
    - from: "src/app/(admin)/accounts/_components/AccountsClient.tsx"
      to: "trpc.dashboard.activityCounts"
      via: "useQuery feeding the '30d activity' KpiStripItem.sparklineSeries"
      pattern: "dashboard\\.activityCounts\\.useQuery"
---

<objective>
Close v4.0-MILESTONE-AUDIT INT-G2 and the two phase-23 tech-debt items in one
pass. Three independent workstreams:

1. **INT-G2 — reorder ORDER BY.** Phase 23 added `trustee.reorder` /
   `beneficiary.reorder` (persisting `trustee.order` and `beneficiary.sortIndex`)
   and migration 0012 created composite indexes `idx_trustee_entity_order`
   (entityId, order) and `idx_beneficiary_entity_sort` (entityId, sortIndex).
   No list query applies `ORDER BY`, so persisted order is honored only by the
   SortableList cards' client-side `.sort()` — the main DataTables and every
   other consumer get heap order, and the indexes are unused by any query plan.
   Add `.orderBy(asc(...))` to `trustee.list`, `beneficiary.list`, and
   `getBeneficiariesWithDistributions`.
2. **dashboard.activityCounts + /accounts sparkline.** Phase 23 shipped the
   `/accounts` KPI strip with a "30d activity" sparkline column suppressed
   (`sparklineSeries: undefined`) because no backing query existed. Build
   `dashboard.activityCounts` and light up the sparkline with real data.
3. **@next/bundle-analyzer wiring.** `next.config.ts` never wired
   `withBundleAnalyzer`, so `ANALYZE=true bun run build` produces no report.
   Add the dependency and compose the wrapper.

Purpose: makes migration 0012's indexes earn their keep, completes the
dashboard data wiring, and restores measurable bundle deltas.
Output: 3 list queries ordered, 1 new tRPC query, 1 sparkline wired,
1 build-tooling wrapper, 1 new test file.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@CLAUDE.md
@.planning/v4.0-MILESTONE-AUDIT.md

<interfaces>
<!-- Key contracts the executor needs. Extracted from the codebase 2026-05-20. -->
<!-- Use these directly — no codebase exploration needed for the contracts. -->

Schema (db/schema.ts) — confirmed columns and indexes (migration 0012 applied):
```typescript
// trustee table
order: t.integer().notNull()            // existing column, reused by reorder
index('idx_trustee_entity_order').on(table.entityId, table.order)

// beneficiary table
sortIndex: t.integer('sortIndex').notNull().default(0)   // added by migration 0012
index('idx_beneficiary_entity_sort').on(table.entityId, table.sortIndex)

// activity_log table (pgTable name 'activity_log')
tableName: t.text().notNull()           // e.g. 'bank_account', 'investment_account'
recordId: t.text().notNull()
action: logAction().notNull()
createdAt: t.timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`).notNull()
index('idx_activity_log_table_name').on(table.tableName)
index('idx_activity_log_created_at').on(table.createdAt.desc())
// RLS SELECT policy: app.is_admin() — admin/trustee/arbiter only
```

Current trustee.list (src/server/trpc/routers/trustee.ts:10-17) — NO orderBy:
```typescript
list: adminProcedure
    .input(z.object({ entityId: z.coerce.number() }))
    .query(({ input }) =>
        db.select().from(trustee).where(eq(trustee.entityId, input.entityId))),
```

Current beneficiary.list (src/server/trpc/routers/beneficiary.ts:20-27) — NO orderBy:
```typescript
list: adminProcedure
    .input(z.object({ entityId: z.coerce.number() }))
    .query(async ({ input }) => {
        return db.select().from(beneficiary)
            .where(eq(beneficiary.entityId, input.entityId))
    }),
```

Current getBeneficiariesWithDistributions (db/queries.ts ~line 73) — NO root orderBy:
```typescript
export async function getBeneficiariesWithDistributions(
    entityId?: number, options?: BeneficiaryDistributionOptions,
) {
    return db.query.beneficiary.findMany({
        where: entityId ? eq(beneficiary.entityId, entityId) : undefined,
        with: { distributions: { orderBy: (d, { desc }) => [desc(d.distributionDate)],
                                 limit: options?.distributionLimit ?? 20 } },
        limit: options?.limit ?? 100,
        offset: options?.offset ?? 0,
    })
}
```
NOTE: db/queries.ts already imports `{ and, desc, eq, sql }` from 'drizzle-orm' —
the relational-query `.findMany()` root `orderBy` uses the callback form
`orderBy: (b, { asc }) => [asc(b.sortIndex)]`, so no new import is needed.

Current dashboard router (src/server/trpc/routers/dashboard.ts) — `summary`,
`summaryTotals` only. Imports already include `and, count, desc, eq, sql, sum`
from 'drizzle-orm' and `adminProcedure, createTRPCRouter` from '../init'. The
`activityLog` table is NOT yet imported there.

KpiStripItem contract (src/components/kpi-strip.tsx):
```typescript
type KpiStripItem = {
    label: string
    value: string | number
    sparklineSeries?: number[]   // when present + non-empty, renders inline recharts sparkline
    // ...delta / invertDelta fields omitted — not needed here
}
```

Current /accounts KPI (src/app/(admin)/accounts/_components/AccountsClient.tsx:292-301):
```typescript
const kpiData: KpiStripItem[] = [
    { label: 'Account count', value: accountCount },
    { label: 'Total balance', value: formatCurrency(totalBalance) },
    { label: 'Bank vs Investment', value: `${bankAccounts.length} / ${investmentAccounts.length}` },
    // sparkline deferred until activityCounts query lands
    { label: '30d activity', value: '—', sparklineSeries: undefined },
]
```
AccountsClient already has `const { data: entities } = trpc.entity.list.useQuery()`
and derives `selectedEntity` from it; existing list queries use
`{ enabled: !!selectedEntity }`.

Current next.config.ts export (next.config.ts:108):
```typescript
export default withSentryConfig(nextConfig, { /* org, project, authToken, ... */ })
```

tRPC test pattern (tests/trpc/trustee.test.ts) — Bun test, createCallerFactory:
```typescript
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { createCallerFactory } from '@/server/trpc/init'
import { appRouter } from '@/server/trpc/router'
import { isProductionDb } from '../helpers/db-guard'
import { createAdminContext, createBeneficiaryContext } from '../helpers/mock-context'
const createCaller = createCallerFactory(appRouter)
// adminCaller() => createCaller(createAdminContext({ id, name, email }))
// beneficiaryCaller() => createCaller(createBeneficiaryContext(null, { id, name, email }))
```
</interfaces>

@src/server/trpc/routers/trustee.ts
@src/server/trpc/routers/beneficiary.ts
@src/server/trpc/routers/dashboard.ts
@src/server/trpc/routers/activityLog.ts
@db/queries.ts
@next.config.ts
@src/app/(admin)/accounts/_components/AccountsClient.tsx
@tests/trpc/trustee.test.ts
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1 (Wave 0): Write failing tRPC tests for dashboard.activityCounts</name>
  <files>tests/trpc/dashboard.test.ts</files>
  <read_first>
    - tests/trpc/trustee.test.ts — copy the Bun-test harness exactly: imports
      from 'bun:test', `createCallerFactory(appRouter)`, `adminCaller()` /
      `beneficiaryCaller()` helpers, `isProductionDb()` guard, a unique `TS`
      suffix, and `afterAll` cleanup.
    - tests/helpers/mock-context.ts — `createAdminContext` / `createBeneficiaryContext`
      signatures.
    - tests/helpers/db-guard.ts — `isProductionDb()` guard usage.
    - db/schema.ts (activity_log table, ~line 267) — `tableName`, `recordId`,
      `action`, `changedBy`, `createdAt` columns; `logAction` enum values.
  </read_first>
  <behavior>
    The test file is the contract for `dashboard.activityCounts` (built in
    Task 3). It MUST fail at creation time because the procedure does not exist
    yet. Cover:
    - Test 1 (auth): `beneficiaryCaller().dashboard.activityCounts(...)` rejects
      — `adminProcedure`-gated. Assert it throws (FORBIDDEN/UNAUTHORIZED).
    - Test 2 (allowlist): calling with an unknown `tableName` (e.g.
      `'drop_table'`) rejects with a Zod validation error — the input enum
      must reject anything off the allowlist.
    - Test 3 (shape + default days): seed N activity_log rows for one entity's
      `bank_account` records across a few days, call
      `activityCounts({ entityId, tableName: 'bank_account' })` (days
      defaulting to 30) and assert the result is an array of length 30
      (one bucket per day, oldest→newest), each element shaped
      `{ date: string, count: number }`, and that the total of all `count`
      values equals the number of seeded rows that fall inside the window.
    - Test 4 (entity scoping): seed activity for the table under a *different*
      entity's records and assert those rows do NOT appear in the count for
      the first entity. (If activity_log is global with no entity column,
      scope by joining/filtering on recordIds belonging to the entity — see
      Task 3 action for the exact scoping decision; the test asserts whatever
      Task 3 implements: cross-entity rows are excluded.)
    Use the `TS`-suffixed unique-record pattern from trustee.test.ts so seeded
    rows are isolatable, and clean them up in `afterAll`.
  </behavior>
  <action>
    Create tests/trpc/dashboard.test.ts. Mirror tests/trpc/trustee.test.ts's
    structure verbatim (bun:test imports, `createCaller`, `adminCaller()`,
    `beneficiaryCaller()`, `TEST_TIMEOUT = 30000`, `isProductionDb()` skip
    guard, `TS` suffix, `afterAll` cleanup). Create a `describe('dashboard.activityCounts')`
    block with the four tests above.

    For seeding: insert rows directly into the `activityLog` table via
    `getPublicDb()` (BYPASSRLS) so the test controls `tableName`, `recordId`,
    `action`, `changedBy`, and `createdAt` precisely — set `createdAt` to
    explicit ISO strings at known day offsets from now so the day-bucketing is
    deterministic. Reuse `entities[0]` (The Hudson Living Trust) for the
    in-scope entity; for the cross-entity test, create or reuse a second
    `entity` row (follow trustee.test.ts's `otherEntityId` pattern).

    This file MUST fail when first run (`activityCounts` does not exist yet) —
    that is the RED state. Do not implement the procedure in this task.
  </action>
  <verify>
    <automated>bun test tests/trpc/dashboard.test.ts 2>&1 | grep -qiE "activityCounts|fail|error" && echo "RED-OK"</automated>
  </verify>
  <acceptance_criteria>
    - File tests/trpc/dashboard.test.ts exists.
    - File contains the string "activityCounts".
    - File contains "describe(" and at least 4 "test(" occurrences.
    - File contains "beneficiaryCaller" (the auth-rejection test).
    - Running `bun test tests/trpc/dashboard.test.ts` FAILS (RED) because
      `dashboard.activityCounts` is not yet defined — this is expected and
      required before Task 3.
  </acceptance_criteria>
  <done>tests/trpc/dashboard.test.ts exists with 4 failing tests covering auth, tableName allowlist, day-series shape, and entity scoping.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Add ORDER BY to trustee.list, beneficiary.list, and getBeneficiariesWithDistributions (INT-G2)</name>
  <files>src/server/trpc/routers/trustee.ts, src/server/trpc/routers/beneficiary.ts, db/queries.ts, src/app/(admin)/trustees/_components/TrusteesClient.tsx, src/app/(admin)/beneficiaries/_components/BeneficiariesClient.tsx</files>
  <read_first>
    - src/server/trpc/routers/trustee.ts — `list` at line 10; current import is
      `import { and, eq } from 'drizzle-orm'` (line 2). `asc` must be added.
    - src/server/trpc/routers/beneficiary.ts — `list` at line 20,
      `listWithDistributions` at line 29; current import is
      `import { and, eq } from 'drizzle-orm'` (line 2). `asc` must be added.
    - db/queries.ts — `getBeneficiariesWithDistributions` at ~line 73; the
      drizzle import at line 2 is `import { and, desc, eq, sql } from 'drizzle-orm'`.
      The function uses `db.query.beneficiary.findMany` (relational query) — its
      root `orderBy` uses the callback form and needs NO new import.
    - db/schema.ts — confirm `trustee.order` (integer notNull) and
      `beneficiary.sortIndex` (integer notNull default 0) columns, and the
      composite indexes `idx_trustee_entity_order` / `idx_beneficiary_entity_sort`.
    - src/app/(admin)/trustees/_components/TrusteesClient.tsx — line ~147
      `.sort((a, b) => a.order - b.order)` and line ~256-257 the arbiter
      `.sort((a, b) => a.order - b.order)`; these feed the SortableList.
    - src/app/(admin)/beneficiaries/_components/BeneficiariesClient.tsx — line
      ~244-248 `.sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0))` feeding
      `BeneficiarySortableList`.
  </read_first>
  <action>
    1. **trustee.ts** — change the import on line 2 to
       `import { and, asc, eq } from 'drizzle-orm'`. Change `list` to append
       `.orderBy(asc(trustee.order))` after the `.where(...)`:
       ```typescript
       list: adminProcedure
           .input(z.object({ entityId: z.coerce.number() }))
           .query(({ input }) =>
               db
                   .select()
                   .from(trustee)
                   .where(eq(trustee.entityId, input.entityId))
                   .orderBy(asc(trustee.order)),
           ),
       ```
       This matches `idx_trustee_entity_order (entityId, order)` — the WHERE
       filters `entityId`, the ORDER BY uses `order`, so the composite index
       backs the query.

    2. **beneficiary.ts** — change the import on line 2 to
       `import { and, asc, eq } from 'drizzle-orm'`. Change `list` to append
       `.orderBy(asc(beneficiary.sortIndex))`:
       ```typescript
       list: adminProcedure
           .input(z.object({ entityId: z.coerce.number() }))
           .query(async ({ input }) => {
               return db
                   .select()
                   .from(beneficiary)
                   .where(eq(beneficiary.entityId, input.entityId))
                   .orderBy(asc(beneficiary.sortIndex))
           }),
       ```
       This matches `idx_beneficiary_entity_sort (entityId, sortIndex)`.

    3. **db/queries.ts** — in `getBeneficiariesWithDistributions`, add a root
       `orderBy` to the `db.query.beneficiary.findMany` call using the callback
       form (no import change needed):
       ```typescript
       return db.query.beneficiary.findMany({
           where: entityId ? eq(beneficiary.entityId, entityId) : undefined,
           orderBy: (b, { asc }) => [asc(b.sortIndex)],
           with: {
               distributions: {
                   orderBy: (d, { desc }) => [desc(d.distributionDate)],
                   limit: options?.distributionLimit ?? 20,
               },
           },
           limit: options?.limit ?? 100,
           offset: options?.offset ?? 0,
       })
       ```
       `listWithDistributions` delegates to this function, so it is now ordered
       too — no change needed in beneficiary.ts for that procedure.

    4. **Remove the now-redundant client-side `.sort()`.** With the server
       queries authoritative, the SortableList feeds are already in `order` /
       `sortIndex` order. Removing the client `.sort()` is cleaner (single
       source of truth) and the audit explicitly asks for a concrete call —
       make it: REMOVE the redundant sorts.
       - **TrusteesClient.tsx**: the sort at line ~147 and the arbiter sort at
         line ~256-257 both operate on data already ordered by `trustee.list`.
         Delete the `.sort((a, b) => a.order - b.order)` calls — keep the
         `.map(...)`/`.filter(...)` they were chained with intact.
       - **BeneficiariesClient.tsx**: the `.sort((a, b) => (a.sortIndex ?? 0) -
         (b.sortIndex ?? 0))` at line ~244-248 operates on
         `listWithDistributions` data which is now ordered. Delete the `.sort()`
         call; keep the surrounding `.map(...)` that builds the SortableList
         items.
       Read each file first to confirm the exact chain shape before editing —
       only remove the `.sort()` call itself, never the map/filter around it.
       If removing a `.sort()` would leave an unused destructured `order` /
       `sortIndex` variable or an unused import, clean that up too (biome will
       flag it — see CLAUDE.md "Lint warnings are never pre-existing").

    Money/date conventions unchanged — this task touches only ordering.
  </action>
  <verify>
    <automated>bun run typecheck && bun test tests/trpc/trustee.test.ts tests/trpc/beneficiary-reorder.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `src/server/trpc/routers/trustee.ts` contains `.orderBy(asc(trustee.order))`.
    - `src/server/trpc/routers/trustee.ts` line-2 import contains `asc`.
    - `src/server/trpc/routers/beneficiary.ts` contains `.orderBy(asc(beneficiary.sortIndex))`.
    - `src/server/trpc/routers/beneficiary.ts` line-2 import contains `asc`.
    - `db/queries.ts` `getBeneficiariesWithDistributions` contains
      `orderBy: (b, { asc }) => [asc(b.sortIndex)]`.
    - `TrusteesClient.tsx` no longer contains `.sort((a, b) => a.order - b.order)`.
    - `BeneficiariesClient.tsx` no longer contains a `.sort(` over `sortIndex`.
    - `bun run typecheck` exits 0.
    - `bun test tests/trpc/trustee.test.ts tests/trpc/beneficiary-reorder.test.ts` exits 0.
    - `bun run lint` reports 0 findings on the 5 modified files.
  </acceptance_criteria>
  <done>All three list queries apply ORDER BY matching the migration-0012 composite indexes; the redundant client-side sorts are removed; typecheck and the reorder tests pass.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Build dashboard.activityCounts tRPC query (GREEN)</name>
  <files>src/server/trpc/routers/dashboard.ts</files>
  <read_first>
    - tests/trpc/dashboard.test.ts — the contract written in Task 1. The
      procedure MUST satisfy every assertion in that file.
    - src/server/trpc/routers/dashboard.ts — existing `summary` /
      `summaryTotals` procedures; the drizzle import already includes
      `and, count, desc, eq, sql, sum`; `adminProcedure` is imported from
      '../init'. `activityLog` is NOT yet in the schema-import block.
    - src/server/trpc/routers/activityLog.ts — note the `searchableFieldSchema`
      allowlist pattern (`z.enum(SEARCHABLE_ACTIVITY_LOG_FIELDS)`) — apply the
      same allowlist discipline to the `tableName` input.
    - db/schema.ts (activity_log, ~line 267) — `tableName: text`,
      `recordId: text`, `createdAt: timestamp(mode:'string', withTimezone)`.
      activity_log has NO `entityId` column (it is a global audit table).
  </read_first>
  <action>
    Add an `activityCounts` procedure to `dashboardRouter` in
    src/server/trpc/routers/dashboard.ts.

    1. Add `activityLog` to the existing `@/db/schema` import block.

    2. Define a `tableName` allowlist as a `z.enum` of the audited table names
       relevant to the dashboard sparkline. Include at minimum the names used
       by the activity_log writers for account tables — use the snake_case DB
       table names: `'bank_account'`, `'investment_account'`. Also include
       `'beneficiary'`, `'trustee'`, `'liability'`, `'distribution'`,
       `'hems_request'`, `'trust_accounting'` so the query is reusable by other
       KPI strips (phase 26/27). Define it as a module-level const so it can be
       referenced in the input schema. This allowlist is the T-25-02 mitigation
       — `tableName` is NEVER interpolated raw; only an enum-validated value
       reaches the WHERE clause.

    3. Procedure signature (`adminProcedure`-gated — T-25-01 mitigation):
       ```typescript
       activityCounts: adminProcedure
           .input(
               z.object({
                   entityId: z.coerce.number(),
                   tableName: activityCountsTableSchema,
                   days: z.coerce.number().int().min(1).max(365).default(30),
               }),
           )
           .query(async ({ input: { entityId, tableName, days } }) => { ... })
       ```

    4. **Entity scoping (T-25-01).** activity_log has no `entityId` column, so
       scope by `recordId`: first SELECT the ids of the entity's rows for the
       requested table (e.g. for `tableName === 'bank_account'`, query
       `bankAccount` WHERE `entityId = entityId`), then count activity_log rows
       WHERE `tableName = tableName AND recordId = ANY(those ids cast to text)
       AND createdAt >= windowStart`. Map the allowlisted `tableName` to its
       Drizzle table via a small lookup object (`bank_account -> bankAccount`,
       `investment_account -> investmentAccount`, etc.) so the entity-id SELECT
       is type-safe and never string-built. activity_log stores `recordId` as
       `text`, so cast the numeric ids with `String(id)` before the IN/`inArray`.
       Tables with no `entityId` column are not in the allowlist, so every
       allowlisted name has a scopable source table.

    5. **Day bucketing.** Compute `windowStart` as `days - 1` days before the
       start of today (so the series is exactly `days` buckets, oldest→newest,
       inclusive of today). Run a grouped count over activity_log:
       `date_trunc('day', "createdAt")` as the group key. Use the existing
       `sql` helper for `date_trunc` and `count()`. Then build a dense series:
       a zero-filled array of `days` buckets keyed by ISO date (`YYYY-MM-DD`),
       fill from the grouped rows, and return
       `Array<{ date: string; count: number }>` ordered oldest→newest. Days
       with no activity are `count: 0` (the sparkline needs a dense series).

    6. Return the dense `{ date, count }[]` array.

    This is the GREEN step — after this task, `bun test tests/trpc/dashboard.test.ts`
    MUST pass. If any test fails, fix the procedure (not the test) until green,
    unless the test encodes a wrong assumption about the schema — in that case
    fix the test to match the real schema and note it in the SUMMARY.
  </action>
  <verify>
    <automated>bun run typecheck && bun test tests/trpc/dashboard.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `src/server/trpc/routers/dashboard.ts` contains `activityCounts:`.
    - `src/server/trpc/routers/dashboard.ts` contains `adminProcedure` on the
      `activityCounts` procedure.
    - The `activityCounts` input zod object contains `entityId` and a
      `z.enum(...)`-based `tableName` field (the allowlist — T-25-02).
    - `src/server/trpc/routers/dashboard.ts` imports `activityLog` from `@/db/schema`.
    - The procedure returns an array of `{ date, count }` objects.
    - `bun run typecheck` exits 0.
    - `bun test tests/trpc/dashboard.test.ts` exits 0 (GREEN — all 4 tests pass).
    - `bun run lint` reports 0 findings on `dashboard.ts`.
  </acceptance_criteria>
  <done>dashboard.activityCounts is an adminProcedure, entityId-scoped, tableName-allowlisted query returning a dense per-day count series; all 4 tests from Task 1 pass.</done>
</task>

<task type="auto">
  <name>Task 4: Wire the /accounts 30d-activity sparkline to dashboard.activityCounts</name>
  <files>src/app/(admin)/accounts/_components/AccountsClient.tsx</files>
  <read_first>
    - src/app/(admin)/accounts/_components/AccountsClient.tsx — line ~292-301
      (the `kpiData` array, currently `{ label: '30d activity', value: '—',
      sparklineSeries: undefined }`); lines ~34-39 (`trpc.useUtils()`,
      `trpc.entity.list.useQuery()`, the `selectedEntity` derivation, the
      `{ enabled: !!selectedEntity }` query-guard pattern).
    - src/components/kpi-strip.tsx — `KpiStripItem.sparklineSeries?: number[]`;
      a sparkline renders only when `sparklineSeries` is present and non-empty.
    - tests/trpc/dashboard.test.ts — the `activityCounts` return shape
      (`{ date, count }[]`).
  </read_first>
  <action>
    1. Add a query for the new procedure, guarded the same way as the other
       AccountsClient list queries:
       ```typescript
       const { data: bankActivity } = trpc.dashboard.activityCounts.useQuery(
           { entityId: selectedEntity!, tableName: 'bank_account', days: 30 },
           { enabled: !!selectedEntity },
       )
       ```
       (Use whatever the existing `selectedEntity` variable is named in this
       file — read the file first to confirm; the codebase pattern is
       `entities?.[0]?.id`.)

    2. Derive the numeric series the sparkline expects (`number[]`) from the
       `{ date, count }[]` result:
       ```typescript
       const activitySeries = bankActivity?.map((d) => d.count) ?? []
       ```

    3. Update the `'30d activity'` KpiStripItem so it renders real data:
       ```typescript
       {
           label: '30d activity',
           value: activitySeries.reduce((a, b) => a + b, 0),
           sparklineSeries: activitySeries.length > 0 ? activitySeries : undefined,
       }
       ```
       The `value` becomes the 30-day total event count; `sparklineSeries` is
       the dense per-day series (or `undefined` while the query is still
       loading, which keeps KpiStrip from rendering an empty chart). Delete the
       `// sparkline deferred until activityCounts query lands` comment.

    No money fields involved; counts are integers. Do not change the other
    three KpiStripItems.
  </action>
  <verify>
    <automated>bun run typecheck && bun run lint</automated>
  </verify>
  <acceptance_criteria>
    - `AccountsClient.tsx` contains `dashboard.activityCounts.useQuery`.
    - `AccountsClient.tsx` no longer contains `sparklineSeries: undefined` as a
      hardcoded literal for the 30d-activity item (it is now a conditional
      expression) and no longer contains the
      `// sparkline deferred` comment.
    - The 30d-activity KpiStripItem `value` is no longer the literal `'—'`.
    - `bun run typecheck` exits 0.
    - `bun run lint` exits 0 with 0 findings on `AccountsClient.tsx`.
  </acceptance_criteria>
  <done>The /accounts KPI strip 30d-activity column renders a real sparkline driven by dashboard.activityCounts, with a 30-day total as its value.</done>
</task>

<task type="auto">
  <name>Task 5: Wire @next/bundle-analyzer into next.config.ts</name>
  <files>next.config.ts, package.json</files>
  <read_first>
    - next.config.ts — the full file; the export on line 108 is
      `export default withSentryConfig(nextConfig, { ... })`. The config
      already sets `reactCompiler: true`, `outputFileTracingIncludes`,
      `experimental.optimizePackageImports`, `images`, `headers`.
    - package.json — `devDependencies` block, to confirm `@next/bundle-analyzer`
      is not already present and to see the Next.js version for a compatible
      analyzer version.
  </read_first>
  <action>
    1. Install the analyzer as a dev dependency:
       ```
       bun add -d @next/bundle-analyzer
       ```
       (bun-only per CLAUDE.md — never npm/npx.) This updates `package.json`
       and `bun.lock`.

    2. In `next.config.ts`, import and create the analyzer wrapper near the
       top, after the existing imports:
       ```typescript
       import bundleAnalyzer from '@next/bundle-analyzer'

       const withBundleAnalyzer = bundleAnalyzer({
           enabled: process.env.ANALYZE === 'true',
       })
       ```

    3. Compose the wrapper with the existing `withSentryConfig` export.
       `withBundleAnalyzer` is the outermost wrapper (it only injects the
       analyzer webpack plugin and is a no-op unless `ANALYZE=true`), and
       `withSentryConfig` stays innermost so Sentry's config transform still
       applies. Change the default export from:
       ```typescript
       export default withSentryConfig(nextConfig, { /* ...sentry opts... */ })
       ```
       to:
       ```typescript
       export default withBundleAnalyzer(
           withSentryConfig(nextConfig, { /* ...sentry opts... unchanged... */ }),
       )
       ```
       Keep every existing Sentry option exactly as-is — only wrap the call.

    4. `@next/bundle-analyzer` has no bundled types in some versions; if
       `bun run typecheck` reports a missing-types error for the import, add a
       minimal module declaration to the project's ambient types (an existing
       `*.d.ts` under `src/` or a new `types/next-bundle-analyzer.d.ts`
       referenced by tsconfig). Prefer the package's own types if present —
       check `node_modules/@next/bundle-analyzer` after install before adding a
       shim.
  </action>
  <verify>
    <automated>bun run typecheck && ANALYZE=true bun run build 2>&1 | tail -20</automated>
  </verify>
  <acceptance_criteria>
    - `package.json` `devDependencies` contains `@next/bundle-analyzer`.
    - `next.config.ts` contains `withBundleAnalyzer`.
    - `next.config.ts` contains `import bundleAnalyzer from '@next/bundle-analyzer'`
      (or equivalent require) and the `enabled: process.env.ANALYZE === 'true'`
      option.
    - The default export composes `withBundleAnalyzer(withSentryConfig(...))`.
    - `bun run typecheck` exits 0.
    - `ANALYZE=true bun run build` completes and emits a bundle-analyzer report
      (the build prints/opens the analyzer HTML output, or writes
      `.next/analyze/*.html`).
  </acceptance_criteria>
  <done>@next/bundle-analyzer is a dev dependency; next.config.ts composes withBundleAnalyzer around withSentryConfig; ANALYZE=true bun run build produces a bundle report.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client → tRPC (`dashboard.activityCounts`) | Untrusted `entityId` + `tableName` + `days` input crosses into a SELECT over the `activity_log` audit table |
| build env → next.config | `ANALYZE` env var toggles a webpack plugin — local/CI build-time only, no runtime surface |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-25-01 | Information Disclosure / Elevation | `dashboard.activityCounts` reading `activity_log` | mitigate | Procedure is `adminProcedure`-gated (admin/trustee/arbiter only; ADMIN_EMAIL override; JWT-bound RLS `app.is_admin()` on the `activity_log` SELECT policy is defense-in-depth). The query is entity-scoped: `activity_log` has no `entityId` column, so the count is restricted to `recordId`s belonging to the requested `entityId`'s rows in the mapped source table — cross-entity activity rows cannot leak. `entityId` is `z.coerce.number()` and used in a typed Drizzle `eq(...)`, never string-built. |
| T-25-02 | Tampering / Injection | `tableName` input → `activity_log` WHERE clause | mitigate | `tableName` is a `z.enum(...)` allowlist of known snake_case table names; an off-allowlist value is rejected by Zod before the resolver runs. The allowlisted name is mapped to a Drizzle table object via a static lookup — never interpolated into raw SQL. `days` is `z.coerce.number().int().min(1).max(365)`-bounded. Mirrors the existing `activityLog.search` `searchableFieldSchema` allowlist discipline. |
| T-25-03 | (none) | `trustee.list` / `beneficiary.list` / `getBeneficiariesWithDistributions` `ORDER BY` additions | accept (N/A) | Adding `.orderBy(asc(...))` over already-`adminProcedure`-gated, already-`entityId`-WHERE-filtered queries introduces no new trust boundary, no new input, and no new data exposure — pure result ordering. No threat surface. |
| T-25-04 | (none) | `@next/bundle-analyzer` `next.config.ts` wrapper | accept (N/A) | Build-time tooling only; `enabled: process.env.ANALYZE === 'true'` gates a dev-dependency webpack plugin. No runtime code path, no request handling, no data access. No threat surface. |

No `high`-severity (ASVS L1) threats — T-25-01 and T-25-02 are both fully
mitigated by `adminProcedure` gating, entity scoping, and Zod allowlist
validation. No checkpoint required.
</threat_model>

<verification>
- INT-G2 closed: `trustee.list`, `beneficiary.list`, and
  `getBeneficiariesWithDistributions` all apply `ORDER BY` matching the
  migration-0012 composite indexes; the indexes are now used by a query plan.
- The redundant client-side `.sort()` calls in `TrusteesClient.tsx` /
  `BeneficiariesClient.tsx` are removed — server order is the single source of
  truth.
- `dashboard.activityCounts` exists, is `adminProcedure`-gated, entityId-scoped,
  and `tableName`-allowlisted; all 4 tests in `tests/trpc/dashboard.test.ts`
  pass.
- The `/accounts` "30d activity" KPI column renders a real sparkline.
- `ANALYZE=true bun run build` emits a bundle-analyzer report.
- `bun run typecheck` exits 0; `bun run lint` reports 0 findings;
  `bun test tests/trpc/dashboard.test.ts tests/trpc/trustee.test.ts tests/trpc/beneficiary-reorder.test.ts`
  exits 0.
</verification>

<success_criteria>
- All 5 tasks' acceptance criteria pass.
- `bun run typecheck` exits 0.
- `bun run lint` reports 0 findings.
- `bun test tests/trpc/dashboard.test.ts` exits 0 (4/4 green).
- `ANALYZE=true bun run build` produces a bundle-analyzer report.
- No `db:push` / `db:deploy` run — this phase makes NO schema change (migration
  0012's columns and indexes already exist).
</success_criteria>

<output>
After completion, create `.planning/phases/25-reorder-ordering-and-dashboard-data-wiring/25-01-SUMMARY.md`
</output>
