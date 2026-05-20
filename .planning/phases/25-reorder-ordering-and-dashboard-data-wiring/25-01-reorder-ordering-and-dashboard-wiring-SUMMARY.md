---
phase: 25-reorder-ordering-and-dashboard-data-wiring
plan: 01
subsystem: api
tags: [trpc, drizzle, postgres, dashboard, next-config, bundle-analyzer, tdd]

# Dependency graph
requires:
  - phase: 23-shadcn-registry-adoption-and-dashboard-ux-revamp
    provides: "trustee.reorder / beneficiary.reorder mutations, beneficiary.sortIndex column, migration-0012 composite indexes, /accounts KpiStrip with a suppressed 30d-activity column"
provides:
  - "trustee.list / beneficiary.list / getBeneficiariesWithDistributions apply ORDER BY backed by the migration-0012 composite indexes (INT-G2 closed)"
  - "dashboard.activityCounts adminProcedure: entity-scoped, tableName-allowlisted, dense per-day activity-count series from activity_log"
  - "/accounts 30d-activity KPI column renders a real sparkline driven by activityCounts"
  - "@next/bundle-analyzer wired into next.config.ts; build:analyze emits .next/analyze/*.html via the webpack build"
affects: [dashboard, accounts, future KPI strips that consume activityCounts, bundle-size tracking]

# Tech tracking
tech-stack:
  added: ["@next/bundle-analyzer@16.2.6 (dev)"]
  patterns:
    - "z.enum allowlist + static Drizzle-table lookup map for safe table-name parameterization (mirrors activityLog.search searchableFieldSchema)"
    - "Dense day-bucket series: zero-filled Map keyed by ISO date, filled from a date_trunc('day') GROUP BY count"
    - "Entity scoping for a global audit table via recordId IN (entity's source-table ids)"

key-files:
  created:
    - tests/trpc/dashboard.test.ts
    - .planning/phases/25-reorder-ordering-and-dashboard-data-wiring/deferred-items.md
  modified:
    - src/server/trpc/routers/trustee.ts
    - src/server/trpc/routers/beneficiary.ts
    - db/queries.ts
    - src/server/trpc/routers/dashboard.ts
    - src/app/(admin)/accounts/_components/AccountsClient.tsx
    - src/app/(admin)/trustees/_components/TrusteesClient.tsx
    - src/app/(admin)/beneficiaries/_components/BeneficiariesClient.tsx
    - next.config.ts
    - package.json
    - bun.lock

key-decisions:
  - "dashboard.activityCounts scopes the global activity_log audit table by mapping the allowlisted tableName to its entity-owning source table and filtering recordId IN (that entity's row ids) — activity_log has no entityId column"
  - "tableName is a z.enum of 8 snake_case table names; the value is mapped to a Drizzle table via a static lookup object, never interpolated into raw SQL (T-25-02)"
  - "activityCounts returns a dense days-length {date,count}[] series (zero-filled) so KpiStrip sparklines render a continuous line"
  - "Server ORDER BY is the single source of truth for trustee/beneficiary display order — the redundant client-side .sort() calls were removed"
  - "build:analyze runs `next build --webpack` because @next/bundle-analyzer is a documented no-op under Turbopack (the project's default build)"

patterns-established:
  - "Allowlist-and-map: untrusted enum input -> z.enum validation -> static lookup to a typed Drizzle table object (no string-built SQL)"
  - "Dense time-series buckets: pre-seed a zero Map over the window, then overwrite from a grouped DB count"

requirements-completed: []

# Metrics
duration: ~40min
completed: 2026-05-20
---

# Phase 25 Plan 01: Reorder Ordering and Dashboard Data Wiring Summary

**Persisted reorder is now honored by every list query (INT-G2), the /accounts 30d-activity sparkline runs on a real entity-scoped activity_log series via the new dashboard.activityCounts tRPC query, and @next/bundle-analyzer is wired so build:analyze emits measurable bundle reports.**

## Performance

- **Duration:** ~40 min
- **Started:** 2026-05-20T19:43:00Z (approx)
- **Completed:** 2026-05-20T20:25:00Z (approx)
- **Tasks:** 5/5 completed
- **Files modified:** 9 modified, 2 created

## Accomplishments

- **INT-G2 closed.** `trustee.list` (`.orderBy(asc(trustee.order))`), `beneficiary.list` (`.orderBy(asc(beneficiary.sortIndex))`), and `getBeneficiariesWithDistributions` (root `orderBy` on `sortIndex`) now apply `ORDER BY` matching the migration-0012 composite indexes `idx_trustee_entity_order` and `idx_beneficiary_entity_sort`. The persisted reorder is honored by the main DataTables, not just the SortableList cards; the indexes now back a real query plan. The redundant client-side `.sort()` calls in `TrusteesClient.tsx` and `BeneficiariesClient.tsx` were removed.
- **dashboard.activityCounts shipped.** A new `adminProcedure` tRPC query returns a dense per-day `{date,count}[]` series from `activity_log`, scoped to one entity and one allowlisted table. 4/4 TDD tests pass (auth gate, allowlist rejection, 30-bucket day-series shape, cross-entity scoping).
- **/accounts sparkline wired.** The previously suppressed `30d activity` KpiStripItem (`value: '—'`, `sparklineSeries: undefined`) now renders a real recharts sparkline driven by `dashboard.activityCounts`, with the 30-day total event count as its value.
- **@next/bundle-analyzer wired.** `withBundleAnalyzer` composes as the outermost wrapper around `withSentryConfig`; `bun run build:analyze` emits `.next/analyze/{client,edge,nodejs}.html`.

## Task Commits

1. **Task 1 (RED) + Task 2 + Task 3 (GREEN)** — `3fdedae` (feat) — `tests/trpc/dashboard.test.ts` + the three ORDER BY queries + `dashboard.activityCounts`. See "Deviations" for why these share one commit.
2. **Task 4: wire /accounts 30d-activity sparkline** — `0cc6838` (feat)
3. **Task 5: wire @next/bundle-analyzer** — `73c2878` (chore)

## TDD Gate Compliance

The plan sequenced Task 1 as a RED commit and Task 3 as the GREEN commit. The project's pre-commit hook runs the **full unit suite** and rejects any commit while a test fails — so a standalone RED commit showing the failing test in history is impossible without `--no-verify` (prohibited by project convention / sequential-execution rules).

RED state **was** verified before implementation: `bun test tests/trpc/dashboard.test.ts` was run with no `activityCounts` procedure present and produced **2 fail / 2 pass** (the shape and entity-scoping tests fail; the two rejection tests trivially "pass" because calling a nonexistent procedure also throws). The RED test file was then held off-disk and restored only once Task 3's implementation made the suite green (now **4 pass / 0 fail**, 68 expect() calls).

Result: the git history contains a `test`-then-`feat` *sequence within* `3fdedae` rather than two separate commits. The RED/GREEN discipline was followed; only the commit boundary was collapsed by the hook constraint.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Tasks 1-3 folded into a single commit**
- **Found during:** Task 1 commit attempt
- **Issue:** The pre-commit hook runs the full unit suite *and* lints the whole tree (`biome check .`). A standalone Task-1 RED commit fails the suite (intentional RED); committing Task 2 alone fails lint because the in-progress `dashboard.ts` (Task 3) is on disk. `--no-verify` is prohibited.
- **Fix:** Tasks 1 (RED test), 2 (ORDER BY queries), and 3 (`activityCounts`) were all committed together in `3fdedae` once the suite was green. Each task's verification (`<verify><automated>`) was still run independently before the commit. Tasks 4 and 5 committed atomically as planned.
- **Files modified:** all Task 1-3 files
- **Commit:** `3fdedae`

**2. [Rule 3 - Blocking] build:analyze switched to `next build --webpack`**
- **Found during:** Task 5 verification (`ANALYZE=true bun run build`)
- **Issue:** `@next/bundle-analyzer` explicitly detects Turbopack and skips report generation (`"The Next Bundle Analyzer is not compatible with Turbopack builds, no report will be generated"`). The project's default `bun run build` uses Turbopack, so composing `withBundleAnalyzer` alone produced **no report** — the plan's stated acceptance criterion would not be met.
- **Fix:** Updated the existing `build:analyze` script from `ANALYZE=true next build` to `ANALYZE=true next build --webpack`. Verified: it emits `.next/analyze/{client,edge,nodejs}.html`. The `next.config.ts` wrapper composition is exactly as the plan specified.
- **Files modified:** `package.json`
- **Commit:** `73c2878`

## Deferred Issues

**DEF-25-01 — `next build --webpack` fails on the e2e route type (out of scope).**
`src/app/api/e2e/setup/route.ts` exports non-route constants (`E2E_ADMIN_EMAIL` etc.) alongside its `POST` handler. Next.js 16's webpack route-type validator rejects this; the default Turbopack `bun run build` does not run that validation, so the project ships fine. The bundle-analyzer reports **are** emitted before the type error aborts the webpack build. Pre-existing (last touched in `1dcaf61`, unrelated to phase 25) — logged to `deferred-items.md`, not fixed. Suggested future fix: extract the `E2E_*` constants to a sibling module (mirrors the existing `auth-paths.ts` pattern).

Note: running the webpack build writes a stricter `.next/types/` than Turbopack; `bun run typecheck` will pick up that stale generated type and fail until `.next` is cleared. The Turbopack `bun run build` and a clean `bun run typecheck` both pass.

## Threat Mitigations Evidenced

| Threat | Mitigation in code |
|--------|--------------------|
| T-25-01 (Info Disclosure / Elevation) | `dashboard.activityCounts` is `adminProcedure`-gated. `activity_log` has no `entityId`, so the count is restricted to `recordId IN (the entity's source-table row ids)` via a typed Drizzle `inArray` — cross-entity activity cannot leak. `entityId` is `z.coerce.number()`. |
| T-25-02 (Tampering / Injection) | `tableName` is `z.enum(ACTIVITY_COUNTS_TABLES)` (8-name allowlist); off-allowlist values are rejected by Zod before the resolver runs. The allowlisted name maps to a Drizzle table via the static `ACTIVITY_COUNTS_SOURCE` lookup — never interpolated into raw SQL. `days` is `z.coerce.number().int().min(1).max(365)`. |
| T-25-03 / T-25-04 | Accept (N/A) — ORDER BY additions add no new trust surface; the bundle-analyzer wrapper is build-time only, gated by `ANALYZE`. |

## Verification

- `bun run typecheck` — exit 0 (after clearing the stale webpack `.next/types`; see Deferred Issues).
- `bun run lint` — exit 0, 0 findings on all modified files.
- `bun test tests/trpc/dashboard.test.ts` — 4/4 pass (GREEN).
- `bun test tests/trpc/trustee.test.ts tests/trpc/beneficiary-reorder.test.ts` — 8/8 pass.
- Full unit suite — green (enforced by the pre-commit hook on every commit).
- `bun run build` (Turbopack) — succeeds, no `[Compiler bailout]`.
- `bun run build:analyze` (`next build --webpack`) — emits `.next/analyze/{client,edge,nodejs}.html`.
- No schema change — no `db:deploy` / `db:push` run (migration 0012's columns and indexes already exist).

## Self-Check: PASSED
