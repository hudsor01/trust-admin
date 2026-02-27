# v4.0 Comprehensive Audit Report

**Date:** 2026-02-24  
**Status:** Complete (Layers 1 & 2)

---

## Layer 1: Static Analysis

### TypeScript Check

```
$ tsc --noEmit
```

**Exit code:** 0
**Error count:** 0
**Status:** Clean — no TypeScript errors.

> Note: An earlier run of this report captured 2 TS errors in `forgot-password/route.ts`. Those were present in a stale working-tree state where `.query<T>()` syntax was used. The file was already fixed to use tagged-template-literal syntax (`sql\`...\` as unknown as T[]`) before this audit was finalised. Current code is type-safe.

---

### Lint Check

```
$ biome check .
Checked 301 files in 118ms. No fixes applied.
```

**Exit code:** 0  
**Violations:** 0  
**Files checked:** 301  
**Status:** Clean — no lint issues.

---

## Layer 2: Unit & Integration Tests

### Test Results

```
 683 pass
 0 fail
 1309 expect() calls
Ran 683 tests across 42 files. [78.26s]
```

**Exit code:** 0  
**Pass:** 683  
**Fail:** 0  
**Total expect() calls:** 1309  
**Files:** 42 test files

### Coverage Summary

| File | % Funcs | % Lines | Notes |
|------|---------|---------|-------|
| All files (aggregate) | 77.98 | 86.45 | |
| `db/index.ts` | 72.73 | 86.30 | |
| `db/queries.ts` | 31.10 | 41.88 | Low — most CRUD helpers untested |
| `db/relations.ts` | 100.00 | 100.00 | |
| `db/schema.ts` | 80.49 | 95.05 | |
| `db/validation.ts` | 98.94 | 100.00 | |
| `src/app/api/inventory/analyze/route.ts` | 100.00 | 89.11 | |
| `src/lib/amortization.ts` | 100.00 | 98.46 | |
| `src/lib/classification-rules.ts` | 60.00 | 58.65 | Medium coverage gap |
| `src/lib/column-helpers.tsx` | 43.33 | 65.50 | |
| `src/lib/inventory-analysis.ts` | 87.50 | 78.83 | |
| `src/lib/money.ts` | 45.45 | 72.97 | |
| `src/lib/sentry.ts` | 25.00 | 31.91 | Low — mostly error-path untested |
| `src/lib/type-utils.ts` | 29.41 | 78.95 | |
| `src/components/bulk-entry-table.tsx` | 39.13 | 71.55 | |
| `src/components/editable-cells.tsx` | 69.23 | 83.99 | |
| `src/server/trpc/init.ts` | 66.67 | 27.71 | Low — auth middleware paths mostly untested |
| `src/server/trpc/routers/distribution.ts` | 62.50 | 63.81 | |
| `src/server/trpc/routers/hemsRequest.ts` | 56.25 | 55.56 | Medium — approve/distribute paths partially tested |
| `src/server/trpc/routers/trustAccounting.ts` | 78.57 | 75.00 | |
| `src/server/trpc/routers/userManagement.ts` | 40.00 | 23.59 | Low — user lifecycle paths mostly untested |
| `src/server/trpc/routers/beneficiary.ts` | 93.75 | 87.56 | |
| `src/server/trpc/routers/liability.ts` | 100.00 | 97.40 | |
| `src/server/trpc/routers/liabilityPayment.ts` | 100.00 | 90.53 | |
| `src/server/trpc/routers/valuation.ts` | 100.00 | 100.00 | |
| `src/server/trpc/routers/withdrawalRecord.ts` | 100.00 | 91.43 | |
| `src/utils/formatters.ts` | 100.00 | 100.00 | |

### Failing Tests

None — all 683 tests passed.

---

## Layer 3: E2E Tests

### Results

PENDING — run after Playwright setup is complete.

---

## Root Cause Summary

| # | Category | Description | Severity | File | Status |
|---|----------|-------------|----------|------|--------|
| 1 | TypeScript | `getSql().query()` return union includes `FullQueryResults<boolean>` which lacks `[Symbol.iterator]`; array destructuring fails type check (TS2488) | High | `src/app/api/auth/custom/forgot-password/route.ts:21` | **Resolved** (file uses tagged-template + `as unknown as T[]`) |
| 2 | TypeScript | Generic type argument `<T>` passed to `query()` overload that accepts 0 type arguments (TS2558) | High | `src/app/api/auth/custom/forgot-password/route.ts:21` | **Resolved** |
| 3 | Coverage | `db/queries.ts` — 41.88% line coverage; large portions of CRUD helpers for all asset tables untested | Medium | `db/queries.ts` | Open |
| 4 | Coverage | `src/server/trpc/routers/userManagement.ts` — 23.59% line coverage; user creation/update/delete flows not unit-tested | Medium | `src/server/trpc/routers/userManagement.ts` | Open |
| 5 | Coverage | `src/server/trpc/init.ts` — 27.71% line coverage; `adminProcedure`, `ownerProcedure`, `beneficiaryProcedure` guards not exercised in isolation | Medium | `src/server/trpc/init.ts` | Open |
| 6 | Coverage | `src/lib/sentry.ts` — 31.91% line coverage; error-reporting and breadcrumb paths untested | Low | `src/lib/sentry.ts` | Open |
| 7 | Coverage | `src/lib/classification-rules.ts` — 58.65% line coverage | Low | `src/lib/classification-rules.ts` | Open |

---

## Fix Plan

### Fix 1 — TypeScript errors in `forgot-password/route.ts:21` — **RESOLVED**

Already fixed: `forgot-password/route.ts` uses tagged-template-literal syntax with `as unknown as T[]` cast. `bun run typecheck` exits 0.

---

### Fix 2 — Coverage improvements (Low Priority / Backlog)

Target modules with < 50% line coverage for additional tests. All are in admin-only or infrastructure paths that require mocking Neon Auth admin APIs or the tRPC auth context:

| Module | Current | Target | Effort |
|--------|---------|--------|--------|
| `src/server/trpc/routers/userManagement.ts` | 23.59% | 60% | High — requires Neon Auth admin mock |
| `src/server/trpc/init.ts` | 27.71% | 70% | Medium — procedure guard unit tests |
| `src/lib/sentry.ts` | 31.91% | 60% | Low — mock Sentry SDK |
| `db/queries.ts` | 41.88% | 70% | High — needs test-branch DB access per asset type |
| `src/lib/classification-rules.ts` | 58.65% | 80% | Low — pure functions, easy to unit test |

**Priority:** Low — all 683 existing tests pass; coverage gaps are non-critical paths.
