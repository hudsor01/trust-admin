---
phase: 26-schema-completeness-for-kpi-data
plan: 03
subsystem: api

tags: [trpc, drizzle, kpi, assets, aggregator, react]

# Dependency graph
requires:
  - phase: 23-shadcn-registry-adoption-and-dashboard-ux-revamp
    provides: /assets KpiStrip with a "Transfer-status progress" KPI that approximated transfer progress with status === 'ACTIVE'
provides:
  - AssetRow.transferStatus field on the asset.listAll envelope (TransferStatus enum value for the six transferable kinds, null for insurancePolicy)
  - all 7 per-kind mappers in routers/asset.ts set transferStatus
  - /assets "Transfer-status progress" KPI computed from the real transferStatus field
affects: [assets-kpi, asset-aggregator]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AssetRow envelope: insurancePolicy-specific absence (no transferStatus column) surfaced as an explicit null in the mapper rather than omitted"
    - "KPI denominator scoping: transferable-asset percentages exclude null-transferStatus rows (insurance) so the metric reflects only transferable assets"

key-files:
  created:
    - .planning/phases/26-schema-completeness-for-kpi-data/26-03-transfer-status-through-asset-aggregator-SUMMARY.md
  modified:
    - src/server/trpc/routers/asset.ts
    - src/app/(admin)/assets/_components/AssetsClient.tsx
    - tests/trpc/asset.test.ts

key-decisions:
  - "AssetRow.transferStatus typed string | null — null for insurancePolicy (no transferStatus column per CLAUDE.md), enum value for the six transferable kinds"
  - "Transfer-status progress KPI excludes null-transferStatus rows (insurance policies) from the denominator — insurance is not a transferable estate asset, so progress = COMPLETE transfers / transferable assets"
  - "No schema change — transferStatus already exists on vehicle/homestead/rentalProperty/bankAccount/investmentAccount/personalProperty; the fix is purely in the aggregator envelope"

patterns-established:
  - "Aggregator envelope: a field absent on one of the fanned-out tables is surfaced as an explicit null literal in that table's mapper, with a doc comment, rather than dropped"

requirements-completed: []

# Metrics
duration: 18min
completed: 2026-05-20
---

# Phase 26 Plan 03: Transfer Status Through Asset Aggregator Summary

**Surfaced the real `transferStatus` field through the `asset.listAll` aggregator envelope and recomputed the /assets "Transfer-status progress" KPI from it, replacing the `status === 'ACTIVE'` approximation.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-05-20T23:55:00Z (approx)
- **Completed:** 2026-05-21T00:13:00Z (approx)
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- `AssetRow` interface in `routers/asset.ts` gains a `transferStatus: string | null` field — the `TransferStatus` enum value for the six transferable asset kinds, `null` for `insurancePolicy` (which has no such column).
- All 7 per-kind mappers in `asset.listAll` set `transferStatus`: vehicle/homestead/rentalProperty/bankAccount/investmentAccount/personalProperty pass the source column through; the `insurancePolicy` mapper sets an explicit `null`.
- `tests/trpc/asset.test.ts` gains two aggregator assertions — `transferStatus === 'PENDING'` for the six seeded transferable kinds, `transferStatus === null` for the seeded insurance row (disambiguated by `(kind, id)` per the prior fix).
- `/assets` "Transfer-status progress" KPI in `AssetsClient.tsx` now computes the real metric: COMPLETE transfers / transferable assets, with insurance policies (null transferStatus) excluded from the denominator.
- Closes the v4.0-MILESTONE-AUDIT phase-23 tech_debt — "Assets 'Transfer-status progress' approximated (asset.listAll omits transferStatus)".

## Task Commits

Each task was committed atomically:

1. **Task 1: Add transferStatus to AssetRow + all 7 mappers; extend asset.test.ts** - `d662317` (feat)
2. **Task 2: Recompute the /assets "Transfer-status progress" KPI from real transferStatus** - `1d94826` (feat)

_Note: Task 1 is TDD-flagged. The test, type, and mappers were edited in the same task (the plan specifies a single atomic commit); RED was confirmed by running the new assertions before the implementation (2 fail), GREEN by running them after (11 pass). One commit, per the plan._

## Files Created/Modified
- `src/server/trpc/routers/asset.ts` - `AssetRow` interface gains `transferStatus: string | null` with a doc comment; all 7 per-kind mappers set the field (6 pass the source column, insurancePolicy sets `null`)
- `src/app/(admin)/assets/_components/AssetsClient.tsx` - replaced the `status === 'ACTIVE'` transfer-progress approximation with a real computation over `r.transferStatus` (COMPLETE / transferable; null rows excluded from the denominator)
- `tests/trpc/asset.test.ts` - two new aggregator assertions for `transferStatus` (PENDING for the 6 transferable kinds, null for insurance)

## Decisions Made
- **`AssetRow.transferStatus` typed `string | null`** — `null` for `insurancePolicy` (CLAUDE.md: "insurancePolicy is the exception — entityId and status only", no transferStatus column), the `TransferStatus` enum value (PENDING/STARTED/COMPLETE) for the six transferable kinds. The mapper surfaces the absence as an explicit `null` literal with a doc comment rather than omitting the field, keeping the envelope shape uniform across all kinds.
- **KPI denominator excludes null-transferStatus rows** — insurance policies are not transferable estate assets, so the "Transfer-status progress" percentage reflects only transferable assets (COMPLETE transfers / transferable assets). Documented inline in `AssetsClient.tsx`.
- **No schema change** — `transferStatus` already exists on vehicle/homestead/rentalProperty/bankAccount/investmentAccount/personalProperty (confirmed in `db/schema.ts`: 6 column declarations + the `TransferStatus` pgEnum). The fix is purely in the aggregator; `db/schema.ts` and `drizzle/` were not touched.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- **Transient single-test failure in a pre-commit hook run** — the first attempt to commit Task 2 hit a pre-commit hook failure (936 pass / 1 fail; only 937 of 1005 tests ran, indicating test files aborted mid-run). This is the same Neon `ECONNREFUSED` connection-blip pattern documented in the 26-01 SUMMARY. A clean re-run of the full suite passed all 1005 tests with 0 failures, and the in-scope `tests/trpc/asset.test.ts` passed all 11. The Task 2 commit succeeded on retry (`1d94826`, 1005 pass / 0 fail). Not a code defect — no fix required.

## Verification

- `bun run typecheck` — exits 0 (AssetRow type change + AssetsClient consumer compile).
- `bun run lint` (biome) — clean, 467 files, no fixes applied.
- `bun test tests/trpc/asset.test.ts` — 11 pass / 0 fail; the two new assertions confirm `transferStatus` is PENDING on the six transferable kinds and null on insurance.
- Full unit suite — **1005 pass / 0 fail** across 73 files (pre-commit hook on `1d94826`).
- `grep -c "transferStatus" src/server/trpc/routers/asset.ts` — ≥ 8 occurrences (interface + 7 mappers).
- `AssetsClient.tsx` — contains `transferStatus === 'COMPLETE'`; no longer contains `r.status === 'ACTIVE'`.
- **Manual smoke:** `/assets` "Transfer-status progress" KPI now reflects the share of transferable assets marked COMPLETE. With the seeded data (six transferable assets all `transferStatus = 'PENDING'`, one insurance policy excluded), the KPI reads 0% — the real metric, not the prior `status === 'ACTIVE'` approximation which would have shown ~88% (7 of 8 rows ACTIVE).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The asset aggregator now carries the real `transferStatus` field — any future /assets feature (e.g. a faceted transfer-status filter) can consume `AssetRow.transferStatus` directly.
- Plan 26-02 (router/form/KPI wiring) is independent of this plan (Wave separation) — no shared files; the orchestrator dispatches it next.
- Threat T-26-04 was dispositioned `accept` — this plan added no new query, table, or column to the result set, and each per-kind query stays `entityId`-scoped under `app.is_admin()` RLS. No new trust-boundary surface.

## Self-Check: PASSED

- FOUND: src/server/trpc/routers/asset.ts (transferStatus field + 7 mappers)
- FOUND: src/app/(admin)/assets/_components/AssetsClient.tsx (transferStatus === 'COMPLETE')
- FOUND: tests/trpc/asset.test.ts (transferStatus assertions)
- FOUND: commit d662317
- FOUND: commit 1d94826

---
*Phase: 26-schema-completeness-for-kpi-data*
*Completed: 2026-05-20*
