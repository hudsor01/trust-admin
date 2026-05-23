---
phase: 31
slug: asset-aggregator-integration
status: retroactive
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-23
---

# Phase 31 — Validation Strategy (Retroactive Audit)

> Retrospectively generated 2026-05-23 to close the v5.0 milestone audit Nyquist tech debt.
> Phase 31 is shipped, merged to main, and verified (status=passed, 4/4 must-haves).
> This document reconstructs the validation strategy from the PLAN + SUMMARY + VERIFICATION
> artifacts and maps every task to its actual or prospective verification method.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bun test (built-in) |
| **Config file** | none — `bun test` script in `package.json` targets explicit dirs |
| **Quick run command** | `bun run typecheck` |
| **Full suite command** | `bun test tests/api tests/components tests/lib tests/trpc tests/*.test.ts` |
| **Estimated runtime** | ~30 seconds (full suite); typecheck ~10s |
| **Relevant test files** | `tests/trpc/asset.test.ts` (aggregator shape) · `tests/trpc/firearm.test.ts` (firearm router) · `tests/trpc/dashboard.test.ts` (activityCounts — adjacent, not Phase 31) |

---

## Sampling Rate

- **After every task commit:** `bun run typecheck` — the AssetKind union extension triggers TypeScript exhaustiveness on `Record<AssetKind, string>` consumers; typecheck catches any missed consumer immediately
- **After all 3 implementation tasks (atomic commit):** `bun run lint` (biome 0 warnings) + `bun run typecheck`
- **Before verification sign-off:** programmatic UAT script exercising the data-source transformations + typecheck + lint green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task scope | Plan ref | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Path | Status |
|------------|----------|-------------|------------|-----------------|-----------|-------------------|-----------|--------|
| `AssetKind` union: append `\| 'firearm'` | 31-01 Task 1 | ASSET-02 | T-31-XEN | Exhaustiveness check on `Record<AssetKind, string>` forces all consumers to handle `'firearm'` | typecheck | `bun run typecheck` | `src/server/trpc/routers/asset.ts` | verified-retro |
| `asset.ts` schema import + `firearm` in Promise.all + entityId scope | 31-01 Task 1 | ASSET-02 | T-31-XEN | `eq(firearm.entityId, entityId)` in WHERE — cross-entity rows cannot leak; `adminProcedure` gates the procedure | typecheck + grep | `bun run typecheck && grep -q "from(firearm).where(eq(firearm.entityId" src/server/trpc/routers/asset.ts` | `src/server/trpc/routers/asset.ts` | verified-retro |
| `asset.ts` firearm mapper loop (kind/category/value/href/transferStatus) | 31-01 Task 1 | ASSET-02, D-05, D-06 | T-31-XEN | `category: 'Firearm'` (singular D-05); `f.transferStatus` not `f.nfaTransferStatus` (D-06); `href: '/firearms'` | typecheck + integration | `bun test tests/trpc/asset.test.ts` — **gap: no firearm-kind test exists in this file** | `tests/trpc/asset.test.ts` | deferred test backfill |
| `dashboard.ts` schema import + `firearms` in Promise.all + entityId scope | 31-01 Task 2 | ASSET-01 | T-31-XEN | `eq(firearm.entityId, entityId)` in WHERE; `adminProcedure` gates `summary` | typecheck + grep | `bun run typecheck && grep -q "where(eq(firearm.entityId, entityId))" src/server/trpc/routers/dashboard.ts` | `src/server/trpc/routers/dashboard.ts` | verified-retro |
| `dashboard.ts` `firearms` in return object | 31-01 Task 2 | ASSET-01 | — | `summary.firearms` field present; shape matches DashboardClient destructure | typecheck | `bun run typecheck` (missing-field error fires if return object omits `firearms` while DashboardClient reads `summary?.firearms`) | `src/server/trpc/routers/dashboard.ts` | verified-retro |
| `DashboardClient.tsx` `firearms` destructure + `firearmTotal` + `assetTotal` inclusion | 31-01 Task 3 | ASSET-01 (SC-1) | T-31-INV | `firearmTotal` computed inside useMemo; `firearms` in dep array — no stale-state escape | typecheck + grep | `bun run typecheck && grep -q "const firearmTotal = sumStrings" "src/app/(admin)/dashboard/_components/DashboardClient.tsx"` | `src/app/(admin)/dashboard/_components/DashboardClient.tsx` | verified-retro |
| `DashboardClient.tsx` Firearms allocationData entry (`var(--chart-2)`, `.filter(value > 0)`) | 31-01 Task 3 | ASSET-01 (SC-2, SC-4) | — | Slice absent when `firearmTotal` is zero (`.filter` handles SC-4 automatically); fill is `--chart-2` per D-04, NOT `--chart-6` | typecheck + grep | `bun run typecheck && grep -q "name: 'Firearms'" "src/app/(admin)/dashboard/_components/DashboardClient.tsx" && ! grep -q "chart-6" "src/app/(admin)/dashboard/_components/DashboardClient.tsx"` | `src/app/(admin)/dashboard/_components/DashboardClient.tsx` | verified-retro |
| `_labels.ts` KIND_LABELS exhaustive entry `firearm: 'Firearm'` | 31-01 forced | ASSET-02 | — | TypeScript `Record<AssetKind, string>` exhaustiveness rejects omission at compile time | typecheck | `bun run typecheck` | `src/app/(admin)/assets/_components/_labels.ts` | verified-retro |
| Admin UAT: SC-1..SC-4 via programmatic DB probe | 31-01 Task 4 | ASSET-01, ASSET-02 | — | Data-source transformations produce correct values for all 4 ROADMAP success criteria | programmatic UAT | `scripts/verify-phase-31.ts` (created, run, removed — see VERIFICATION.md transcript) | N/A (script removed after run) | verified-retro |

*Status key: `verified-retro` — requirement confirmed via artifact inspection and/or programmatic UAT during Phase 31 execution · `deferred test backfill` — gap exists; no automated test covers this behavior; backfill warranted*

---

## Known Gaps

### GAP-31-01 — No automated test for `kind: 'firearm'` rows in `asset.listAll`

**File:** `tests/trpc/asset.test.ts`

**What is missing:** `asset.test.ts` was written before Phase 31 shipped. It tests 7 asset kinds (`vehicle`, `homestead`, `rentalProperty`, `bankAccount`, `investmentAccount`, `personalProperty`, `insurancePolicy`) but does NOT:

1. Assert `kinds.has('firearm')` in the "returns rows for every asset kind" test
2. Seed a firearm row in `beforeAll`
3. Verify `category: 'Firearm'` (singular, D-05 contract)
4. Verify `href: '/firearms'` (D-06 contract)
5. Verify `value = f.dodValue` (D-06 contract — dodValue, not nfaTransferStatus or coverageAmount)
6. Verify `transferStatus = f.transferStatus` (D-06 contract — generic enum, not nfaTransferStatus)

**Risk:** If a future refactor accidentally changes `category: 'Firearms'` (plural), `href: '/assets'`, or routes `value` from `nfaTransferStatus`, no automated test catches it.

**Why it was not written at phase time:** Phase 31 deliberately deferred automated tests per D-08 (following the Phase 19 precedent for aggregator additions; UAT was the established verification pattern). The PLAN explicitly states "Zero automated tests added (per D-08)".

**Backfill priority:** MEDIUM — the programmatic UAT script executed during execution confirmed all 4 SCs; the behavioral contract is captured in VERIFICATION.md. However, the test suite currently has an incomplete assertion in `asset.test.ts` line 233-239 that asserts 7 kinds but not `'firearm'`, which will silently pass even if the Phase 31 wiring is removed.

**Deferred test backfill:** Add to `tests/trpc/asset.test.ts`:
- Seed one `firearm` row in `beforeAll` with a known `dodValue`, `transferStatus: 'PENDING'`
- Assert `kinds.has('firearm')` in the existing kinds test
- Add a dedicated `firearm row has correct AssetRow shape (D-05, D-06)` test asserting `category === 'Firearm'`, `href === '/firearms'`, `value === f.dodValue`, `transferStatus === 'PENDING'` (not null, not `nfaTransferStatus`)

### GAP-31-02 — `dashboard.summary` `firearms` field not covered by any automated test

**File:** no dedicated `tests/trpc/dashboard.test.ts` coverage for `summary.firearms`

**What is missing:** `tests/trpc/dashboard.test.ts` covers `activityCounts` only (Phase 25). The `summary` procedure has no automated test. Phase 31's addition of `firearms` to the `summary` return object (Task 2) is verified only by typecheck (missing field → compile error) and the programmatic UAT script that ran at execution time and was then removed.

**Risk:** If `dashboard.ts:summary` silently returns `firearms: []` regardless of actual DB rows (e.g., a WHERE clause typo excludes all rows), no automated test catches it.

**Deferred test backfill:** Add a `dashboard.summary` describe block to `tests/trpc/dashboard.test.ts`:
- Seed an entity + one `firearm` row with `dodValue = '1000.00'`
- Assert `summary.firearms.length === 1` and `summary.firearms[0].dodValue === '1000.00'`
- Assert that a second entity's firearm does NOT appear in the first entity's `summary.firearms` (entity-scope enforcement)

### GAP-31-03 — Programmatic UAT script not preserved as a repeatable test

**What happened:** `scripts/verify-phase-31.ts` was created, run against the live production DB, confirmed all 4 ROADMAP SCs, then removed. The UAT is recorded only as a transcript in VERIFICATION.md.

**Risk:** The verification is not repeatable without reconstructing the script from the transcript. Future re-verification of Phase 31 requirements requires reading VERIFICATION.md and trusting the transcript rather than re-running a test.

**Mitigation that exists:** The four SCs map directly to code paths that typecheck validates structurally. GAP-31-01 and GAP-31-02 backfills would provide behavioral re-verifiability.

**Deferred test backfill:** The transcript in VERIFICATION.md is sufficient for the audit record; full re-verification is covered by the GAP-31-01 and GAP-31-02 backfills.

---

## Static Gates (All Passed)

| Gate | Result | Evidence |
|------|--------|----------|
| `bun run typecheck` | 0 errors | VERIFICATION.md §Static Gates |
| `bun run lint` (biome) | 0 warnings / 481 files checked | VERIFICATION.md §Static Gates |

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Status |
|----------|-------------|------------|--------|
| SC-1: Adding a firearm with `dodValue = 1000.00` increases dashboard "Total Assets" KPI by $1,000.00 | ASSET-01 | Requires running server + browser or live DB + programmatic probe | VERIFIED via postgres.js probe (see VERIFICATION.md UAT transcript) |
| SC-2: Allocation pie chart shows "Firearms" slice when at least one firearm exists | ASSET-01 | Requires DashboardClient rendering (React component — not unit testable at server layer) | VERIFIED via data-layer probe confirming `summary.firearms` non-empty (proxy: slice appears when `toCents(firearmTotal)/100 > 0`) |
| SC-3: Firearm row in `/assets` with `category: 'Firearm'` and `href: '/firearms'` | ASSET-02 | Requires live query via `asset.listAll` | VERIFIED via data-layer probe (VERIFICATION.md transcript confirms mapper output shape) |
| SC-4: Deleting the firearm reverses SC-1, SC-2, and removes row from `/assets` | ASSET-01, ASSET-02 | Requires delete + re-query | VERIFIED via postgres.js probe (post-delete `firearmTotal` back to $0.00, no firearm row in source query) |

---

## Nyquist Compliance Verdict

Phase 31 modified 4 files and had **no automated test deliverable by design** (D-08 decision locked in CONTEXT.md, following Phase 19 aggregator precedent). The structural correctness of all 4 changes is enforced by TypeScript's exhaustiveness check (`Record<AssetKind, string>` + tRPC return type inference), which treats a missing `firearm` case as a compile error. The behavioral correctness of the 4 ROADMAP success criteria was verified by a programmatic probe against the live production DB at execution time.

Three gaps exist (GAP-31-01, GAP-31-02, GAP-31-03), all classified as **deferred test backfill** — not blockers. The phase is `nyquist_compliant: true` because:

1. Every implementation task has at least one verification method (typecheck, grep, or programmatic UAT)
2. The UAT transcript in VERIFICATION.md provides the behavioral evidence record
3. The static gates (typecheck + lint) are clean
4. The gaps are documented and backfill-scoped

`nyquist_compliant: true` is conditional on the understanding that GAP-31-01 (firearm kind not asserted in `asset.test.ts`) represents a real regression-detection gap. If regression coverage becomes a hard Nyquist requirement for this project, the compliance verdict must be revisited and GAP-31-01 backfilled.

---

## Validation Sign-Off

- [x] All 4 implementation tasks have a verification method (typecheck, grep, programmatic UAT)
- [x] Static gates clean (typecheck 0 errors, lint 0 warnings)
- [x] 4/4 ROADMAP success criteria verified by programmatic UAT (VERIFICATION.md transcript)
- [x] Known gaps documented and classified
- [x] Design decision compliance verified (D-04 `--chart-2`, D-05 singular, D-06 `transferStatus` not `nfaTransferStatus`)
- [x] Anti-patterns absent (no `nfaTransferStatus` in asset.ts, no `--chart-6`, no plural 'Firearms' category)
- [ ] GAP-31-01: `asset.test.ts` firearm-kind assertions (deferred)
- [ ] GAP-31-02: `dashboard.summary` `firearms` field automated test (deferred)
- [ ] GAP-31-03: UAT script preserved as repeatable test (deferred — covered by GAP-31-01 + GAP-31-02 backfills)

---

*Retrospectively generated: 2026-05-23*
*Purpose: close v5.0 milestone audit Nyquist tech debt*
*Verifier: Claude (nyquist-auditor)*

---

## VALIDATION COMPLETE

**Verdict: NYQUIST COMPLIANT (with deferred backfill)**

Phase 31 satisfies the structural Nyquist requirement: every task has a verification method, static gates are clean, and the behavioral contract for all 4 ROADMAP success criteria is recorded with evidence. Three deferred backfill gaps exist (all non-blocking), documented above. The most actionable gap is GAP-31-01: the existing `asset.test.ts` "returns rows for every asset kind" test does not assert `kinds.has('firearm')` and does not seed a firearm row, meaning the Phase 31 wiring could be silently reverted without any test catching it.
