---
phase: 22-nullable-fk-review
plan: 01
subsystem: database
tags: [postgresql, drizzle, foreign-key, trust-accounting, data-integrity]

# Dependency graph
requires:
  - phase: 20-polymorphic-constraints
    provides: CHECK constraint patterns for data integrity
provides:
  - bankAccountId FK on trustAccounting enforcing account traceability
  - Bank account selectors in accounting and payment forms
affects: [accounting, liabilities, payments, income-conversion]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Required FK pattern for polymorphic table augmentation
    - Form field addition pattern with tRPC schema updates

key-files:
  created: []
  modified:
    - db/schema.ts
    - db/queries.ts
    - src/app/(admin)/accounting/page.tsx
    - src/app/(admin)/liabilities/page.tsx
    - src/server/trpc/routers/liability.ts
    - src/server/trpc/routers/trustAccounting.ts

key-decisions:
  - "Keep sourceAssetType/sourceAssetId as nullable context fields while bankAccountId is required"
  - "Use first bank account as default for income-to-principal conversion"

patterns-established:
  - "Required FK addition: update schema, queries, tRPC schemas, and forms together"

issues-created: []

# Metrics
duration: 7min
completed: 2026-01-18
---

# Phase 22 Plan 01: Add bankAccountId FK to trustAccounting Summary

**NOT NULL FK constraint on trustAccounting.bankAccountId ensures every accounting entry traces to a specific bank account**

## Performance

- **Duration:** 7 min
- **Started:** 2026-01-18T01:59:45Z
- **Completed:** 2026-01-18T02:06:47Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added `bankAccountId` NOT NULL column to trustAccounting table
- Created FK constraint `TrustAccounting_bankAccountId_fkey` referencing bankAccount
- Created index `idx_trust_accounting_bank_account` for query performance
- Updated `RecordPaymentData` interface and `convertIncomeToPrincipal` function signatures
- Added bank account selector to accounting entry form
- Added bank account selector to liability payment form

## Task Commits

Each task was committed atomically:

1. **Task 1: Add bankAccountId FK to trustAccounting table** - `f77a8bf` (feat)
2. **Task 2: Apply migration and verify** - No code changes (verification only)

**Plan metadata:** (next commit)

## Files Created/Modified

- `db/schema.ts` - Added bankAccountId column, FK constraint, and index to trustAccounting
- `db/queries.ts` - Updated RecordPaymentData interface and convertIncomeToPrincipal function
- `src/app/(admin)/accounting/page.tsx` - Added bank account query and form field
- `src/app/(admin)/liabilities/page.tsx` - Added bank account query and payment form field
- `src/server/trpc/routers/liability.ts` - Updated recordPaymentSchema to require bankAccountId
- `src/server/trpc/routers/trustAccounting.ts` - Updated convertIncomeToPrincipal input schema

## Decisions Made

1. **Keep sourceAssetType/sourceAssetId nullable** - These fields provide additional context about what an accounting entry relates to (vehicle sale, rental income, etc.), but bankAccountId is the mandatory "where did the money flow through" field.

2. **Use first bank account as default for conversion** - The income-to-principal conversion uses the first available bank account. A more sophisticated approach would let users select, but this is sufficient for the single-trust use case.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Next Phase Readiness

- Phase 22 complete with all nullable FK review work finished
- Data integrity: Every trustAccounting entry now requires a bank account reference
- Ready for Phase 23 (Primary Key Type Migration) when planned

---
*Phase: 22-nullable-fk-review*
*Completed: 2026-01-18*
