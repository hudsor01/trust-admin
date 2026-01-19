# Phase 20 Plan 01: Polymorphic Constraint Enforcement Summary

**Added PostgreSQL CHECK constraints to 3 polymorphic tables ensuring exactly one FK is set per row.**

## Accomplishments

- Added `check` import from `drizzle-orm/pg-core` to schema.ts
- Created `valuation_single_asset_check` constraint (7 FK columns)
- Created `document_single_owner_check` constraint (8 FK columns)
- Created `transaction_single_asset_check` constraint (6 FK columns)
- Applied migration with `bun drizzle-kit push --force`
- Cleaned 6 orphaned Valuation records that violated constraint (seed data without FK links)
- Verified all 3 constraints enforce exactly-one-FK rule via test inserts
- All 206 tests pass with no regressions

## Files Created/Modified

- `db/schema.ts` - Added CHECK constraints to valuation, document, and transaction tables

## Commits

| Hash | Type | Description |
|------|------|-------------|
| `0c62adf` | feat | Add CHECK constraint to Valuation table |
| `93dfcbb` | feat | Add CHECK constraints to Document and Transaction tables |

## Decisions Made

- Used CASE WHEN pattern for counting non-null FKs (PostgreSQL-compatible, readable)
- Deleted orphaned Valuation records rather than backfilling fake FKs (data integrity over preservation)

## Issues Encountered

- **Orphaned seed data**: 6 Valuation records had 0 FKs set, blocking constraint creation. Resolved by deleting orphaned records (they were test data with no asset linkage).

## Next Phase Readiness

Phase 20 complete, ready for Phase 21 (Composite Index Optimization)
