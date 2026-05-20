---
phase: 25-reorder-ordering-and-dashboard-data-wiring
verified: 2026-05-20T00:00:00Z
status: passed
score: 6/6 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: null
  note: "Initial verification — no previous VERIFICATION.md existed."
---

# Phase 25: Reorder Ordering and Dashboard Data Wiring Verification Report

**Phase Goal:** Make persisted sort order authoritative app-wide and finish the dashboard data wiring — add `ORDER BY` to `beneficiary.list` / `getBeneficiariesWithDistributions` / `trustee.list` so the migration-0012 composite indexes are used and reorder is honored beyond the SortableList cards (INT-G2); build `trpc.dashboard.activityCounts` and light up the suppressed `/accounts` 30-day sparkline; wire `@next/bundle-analyzer` into `next.config.ts`.

**Verified:** 2026-05-20
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `trustee.list` returns rows ordered by `trustee.order` ascending (persisted reorder honored by the DataTable, not just the SortableList cards) | ✓ VERIFIED | `src/server/trpc/routers/trustee.ts:13-19` — `.select().from(trustee).where(eq(trustee.entityId, ...)).orderBy(asc(trustee.order))`. `asc` imported on line 2. Comment cites `idx_trustee_entity_order`. |
| 2 | `beneficiary.list` and `beneficiary.listWithDistributions` return rows ordered by `beneficiary.sortIndex` ascending | ✓ VERIFIED | `beneficiary.ts:25-29` — `.orderBy(asc(beneficiary.sortIndex))`. `listWithDistributions` (line 32-36) delegates to `getBeneficiariesWithDistributions`, which carries `orderBy: (b, { asc }) => [asc(b.sortIndex)]` (`db/queries.ts:77`). |
| 3 | The migration-0012 composite indexes `idx_trustee_entity_order` and `idx_beneficiary_entity_sort` back the new ORDER BY queries (ORDER BY columns match index columns) | ✓ VERIFIED | `db/schema.ts:1955` — `idx_trustee_entity_order` on `(entityId, order)`; `db/schema.ts:987-989` — `idx_beneficiary_entity_sort` on `(entityId, sortIndex)`; `sortIndex` column at line 942. Each query filters `entityId` (leading index column) and orders by the trailing index column — index-backed by construction. |
| 4 | `trpc.dashboard.activityCounts` returns a per-day activity-count series from `activity_log` for a given `tableName`, scoped to one entity | ✓ VERIFIED | `dashboard.ts:213-274` — `adminProcedure`, input `{ entityId, tableName: z.enum, days }`, entity-scoped via `recordId IN (source-table ids WHERE entityId)`, returns dense `{date,count}[]`. 4/4 tests pass (auth gate, allowlist rejection, 30-bucket shape, cross-entity scoping). |
| 5 | The `/accounts` KPI strip '30d activity' column renders a real sparkline driven by `activityCounts` (no longer '—' / `sparklineSeries: undefined`) | ✓ VERIFIED | `AccountsClient.tsx:65-68` — `trpc.dashboard.activityCounts.useQuery({ entityId, tableName: 'bank_account', days: 30 }, { enabled: !!entityId })`; line 297 derives `activitySeries`; lines 305-310 — `value` is the 30d total, `sparklineSeries` is a conditional expression. No `'—'` literal, no `sparkline deferred` comment. |
| 6 | `ANALYZE=true bun run build` emits a bundle-analyzer report | ✓ VERIFIED (see deviation) | `bun run build:analyze` (`ANALYZE=true next build --webpack`) emitted `.next/analyze/{client.html (1.1M), edge.html (275k), nodejs.html (2.2M)}` and printed `Webpack Bundle Analyzer saved report to ...` x3 before the build aborted on a pre-existing route-type error (DEF-25-01). Reports emit before the error — measurable bundle delta is achieved. See Anti-Patterns / Gaps Summary. |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `tests/trpc/dashboard.test.ts` | tRPC tests for `dashboard.activityCounts` | ✓ VERIFIED | 273 lines; `describe('dashboard.activityCounts')`, 4 `test(` blocks: beneficiary auth rejection, off-allowlist `tableName` Zod rejection, dense 30-bucket day-series shape, cross-entity scoping. Uses `TS`-suffixed isolation + `afterAll` cleanup. 4 pass / 0 fail / 68 expect() calls. |
| `src/server/trpc/routers/trustee.ts` | `trustee.list` with `.orderBy(asc(trustee.order))` | ✓ VERIFIED | Line 19 — `.orderBy(asc(trustee.order))`. Import line 2 includes `asc`. |
| `src/server/trpc/routers/beneficiary.ts` | `beneficiary.list` with `.orderBy(asc(beneficiary.sortIndex))` | ✓ VERIFIED | Line 29 — `.orderBy(asc(beneficiary.sortIndex))`. Import line 2 includes `asc`. |
| `db/queries.ts` | `getBeneficiariesWithDistributions` ordered by `sortIndex` | ✓ VERIFIED | Line 77 — `orderBy: (b, { asc }) => [asc(b.sortIndex)]` (relational-query callback form, no import change). |
| `src/server/trpc/routers/dashboard.ts` | `dashboard.activityCounts` `adminProcedure` query | ✓ VERIFIED | Line 213 `activityCounts:` on `adminProcedure`; `activityLog` imported (line 5); `z.enum(ACTIVITY_COUNTS_TABLES)` 8-name allowlist (lines 34-45); static `ACTIVITY_COUNTS_SOURCE` Drizzle-table lookup (lines 48-57). |
| `next.config.ts` | `withBundleAnalyzer` composed with `withSentryConfig` | ✓ VERIFIED | Line 1 `import bundleAnalyzer from '@next/bundle-analyzer'`; lines 6-8 `withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })`; lines 117-134 `export default withBundleAnalyzer(withSentryConfig(nextConfig, {...}))` — Sentry options unchanged. |
| `package.json` | `@next/bundle-analyzer` dev dependency | ✓ VERIFIED | Line 33 — `"@next/bundle-analyzer": "16.2.6"` in `devDependencies`; installed at `node_modules/@next/bundle-analyzer`. `build:analyze` script (line 8) = `ANALYZE=true next build --webpack`. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `trustee.ts` | `idx_trustee_entity_order` (schema) | `.orderBy(asc(trustee.order))` over `WHERE eq(trustee.entityId)` | ✓ WIRED | `entityId` WHERE + `order` ORDER BY match the `(entityId, order)` composite index. |
| `beneficiary.ts` | `idx_beneficiary_entity_sort` (schema) | `.orderBy(asc(beneficiary.sortIndex))` over `WHERE eq(beneficiary.entityId)` | ✓ WIRED | `entityId` WHERE + `sortIndex` ORDER BY match the `(entityId, sortIndex)` composite index. |
| `AccountsClient.tsx` | `trpc.dashboard.activityCounts` | `useQuery` feeding the '30d activity' `KpiStripItem.sparklineSeries` | ✓ WIRED | Query at line 65, `enabled: !!entityId` guard; result mapped to `activitySeries` (line 297) → KPI `value` + `sparklineSeries` (lines 305-310). |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `AccountsClient.tsx` 30d-activity KPI | `bankActivity` → `activitySeries` | `trpc.dashboard.activityCounts` query | Yes — `dashboard.activityCounts` runs a real `date_trunc('day')` GROUP BY count over `activity_log` filtered by `tableName` + entity-scoped `recordId inArray` + `createdAt` window. Dense `{date,count}[]` returned. | ✓ FLOWING |
| `dashboard.activityCounts` | `grouped` | `activityLog` table GROUP BY | Yes — `db.select(...).from(activityLog).where(and(eq(tableName), inArray(recordId), gte(createdAt))).groupBy(...)` — genuine DB aggregation, not static. | ✓ FLOWING |
| `trustee.list` / `beneficiary.list` | result set | `db.select().from(...)` | Yes — real Drizzle SELECT with `ORDER BY`. | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `dashboard.activityCounts` tests pass | `bun test tests/trpc/dashboard.test.ts` | 4 pass / 0 fail / 68 expect() | ✓ PASS |
| Reorder tests pass | `bun test tests/trpc/trustee.test.ts` | 4 pass / 0 fail | ✓ PASS |
| Reorder tests pass | `bun test tests/trpc/beneficiary-reorder.test.ts` | 4 pass / 0 fail | ✓ PASS |
| Full unit suite green | `bun test` | 1003 pass / 0 fail across 73 files | ✓ PASS |
| Typecheck clean | `bun run typecheck` (after clean `.next`) | exit 0 | ✓ PASS |
| Lint clean | `bun run lint` | 466 files checked, 0 fixes / 0 findings | ✓ PASS |
| Bundle-analyzer reports emit | `ANALYZE=true bun run build:analyze` | `.next/analyze/{client,edge,nodejs}.html` written; build then exits 1 on DEF-25-01 | ✓ PASS (reports emit before the abort) |

### Requirements Coverage

Phase 25 declares `requirements: []` — it is a v4.0 gap-closure phase. Coverage is tracked via the plan's `must_haves` (verified above) and the milestone audit's INT-G2 + phase-23 tech_debt items:

| Audit Item | Source | Status | Evidence |
|------------|--------|--------|----------|
| INT-G2 — reorder ORDER BY missing from list queries | v4.0-MILESTONE-AUDIT `gaps.integration` | ✓ SATISFIED | All 3 list queries (`trustee.list`, `beneficiary.list`, `getBeneficiariesWithDistributions`) apply index-matching `ORDER BY`; redundant client `.sort()` calls removed from `TrusteesClient.tsx` and `BeneficiariesClient.tsx`. |
| `@next/bundle-analyzer` never wired into `next.config` | v4.0-MILESTONE-AUDIT phase-23 tech_debt | ✓ SATISFIED | Dependency added; `withBundleAnalyzer` composed; `build:analyze` emits the 3 HTML reports. |
| `activityCounts` query absent / `/accounts` placeholder KPI column | v4.0-MILESTONE-AUDIT phase-23 tech_debt | ✓ SATISFIED | `dashboard.activityCounts` shipped; `/accounts` 30d-activity sparkline wired to real data. |

No orphaned requirements — `Phase 25` in ROADMAP.md maps only "Gap closure (INT-G2)" with no REQ-IDs.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `package.json` / `build:analyze` | 8 | `build:analyze` uses `next build --webpack`; the webpack build aborts on a pre-existing route-type error in `src/app/api/e2e/setup/route.ts` (DEF-25-01) | ℹ️ Info | Documented deviation. The webpack build is REQUIRED because `@next/bundle-analyzer` is a no-op under Turbopack. The 3 analyzer HTML reports emit successfully BEFORE the abort — verified on disk. The error is pre-existing (last touched `1dcaf61`, unrelated to phase 25) and the default `bun run build` (Turbopack) is unaffected. Not a phase-25 regression. |
| `dashboard.ts` | 222-273 | `windowStart` uses `setHours(0,0,0,0)` (local TZ) while bucket keys / SQL `date_trunc` resolve in UTC (25-REVIEW WR-01) | ⚠️ Warning | Latent timezone bug — on a non-UTC server, day buckets near local midnight can be offset by one and silently dropped. Not a phase-25 must-have failure (the `{date,count}` per-day series IS produced and correct on the UTC deploy target — Neon/Vercel run UTC), but a real correctness risk flagged by code review. Should be triaged in a follow-up. |
| `dashboard.ts` | 231-263 | Entity scoping by `recordId` alone is safe only because `eq(tableName, ...)` is co-applied (25-REVIEW WR-02) | ℹ️ Info | Fragility note, not a bug — current code is correct. Suggest strengthening the doc comment. |

### Human Verification Required

None. All six must-have truths are verifiable programmatically (DB queries, test suite, build output, file inspection). The `/accounts` sparkline render is backed by a passing data-flow trace and the `KpiStripItem` contract; no visual-only behavior is load-bearing for goal achievement.

### Gaps Summary

**No gaps block goal achievement.** All 6 must-have truths are VERIFIED, all 7 artifacts pass all four levels (exist, substantive, wired, data-flowing), all 3 key links are WIRED, and the full 1003-test suite + typecheck + lint are green.

**On the DEF-25-01 deviation (truth 6 / "bundle delta is measurable"):** This does NOT undermine the goal. The phase goal item is "wire `@next/bundle-analyzer` so cumulative bundle delta is measurable." The analyzer IS wired into `next.config.ts` exactly as planned, and `bun run build:analyze` DOES emit all three measurable reports (`client.html` 1.1M, `edge.html` 275k, `nodejs.html` 2.2M) — confirmed on disk with the `Webpack Bundle Analyzer saved report` log lines. The build's subsequent exit-1 is a pre-existing, unrelated route-type error in the e2e setup route that the default Turbopack `bun run build` never validates and that ships fine in production. The executor logged it honestly as DEF-25-01 with a root cause and a concrete fix suggestion. This is an acceptable documented deviation: the analyzer's deliverable (measurable bundle reports) is fully achieved; the abort happens strictly after report generation and touches an out-of-scope file.

**Two code-review warnings (WR-01 timezone bucketing, WR-02 recordId-collision doc) are noted as Anti-Patterns** but neither fails a phase-25 must-have: the `activityCounts` series is produced, correct on the UTC deployment target, and entity-scoped with no leak. They are quality follow-ups, appropriate for a future triage pass, not gap-closure blockers for phase 25.

---

_Verified: 2026-05-20_
_Verifier: Claude (gsd-verifier)_
