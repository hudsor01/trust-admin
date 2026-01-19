---
phase: 31-dinero-money
plan: 01
subsystem: utils
tags: [dinero.js, money, precision, typescript, react]

# Dependency graph
requires:
  - phase: 30-nuqs-url-state
    provides: admin page components with parseFloat patterns
provides:
  - Precision-safe money utilities using dinero.js v2
  - sumStrings, addMoney, subtractMoney functions
  - formatMoney for display formatting
  - isPositive, isNegative, isZero comparison helpers
affects: [future-calculations, reporting, distributions]

# Tech tracking
tech-stack:
  added: [dinero.js, @dinero.js/currencies]
  patterns: [integer-cents-internally, string-money-externally]

key-files:
  created: [src/lib/money.ts]
  modified: [src/utils/formatters.ts, 9 component files]

key-decisions:
  - "Use dinero.js v2 alpha for modern ES modules support"
  - "Store amounts as strings in DB, convert to integer cents internally"
  - "Use sumStrings pattern for array aggregations instead of reduce+parseFloat"

patterns-established:
  - "sumStrings(array.map(x => x.amount)) for totals"
  - "isNegative/isPositive for comparisons instead of numeric >= 0"
  - "formatCurrency delegates to formatMoney via dinero"

issues-created: []

# Metrics
duration: 10min
completed: 2026-01-16
---

# Phase 31: Dinero Money Calculations Summary

**Precision-safe money utilities using dinero.js v2 - replacing parseFloat arithmetic with integer cents internally**

## Performance

- **Duration:** 10 min
- **Started:** 2026-01-16T21:20:09Z
- **Completed:** 2026-01-16T21:30:02Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- Created money utility module with toDinero, sumStrings, addMoney, subtractMoney
- Updated formatCurrency to use dinero.js for precision-safe formatting
- Replaced all parseFloat-based calculations in 9 admin/portal components

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dinero.js and create money utility module** - `297546d` (feat)
2. **Task 2: Update formatCurrency to use dinero** - `800f9d8` (feat)
3. **Task 3: Replace parseFloat calculations with dinero** - `94e768a` (feat)

## Files Created/Modified

- `src/lib/money.ts` - Core money utilities: toDinero, sumStrings, addMoney, subtractMoney, compareMoney, isZero/isPositive/isNegative
- `src/utils/formatters.ts` - formatCurrency now delegates to formatMoney
- `src/app/(admin)/accounting/page.tsx` - Income/expense totals use sumStrings, netIncome uses subtractMoney
- `src/app/(admin)/dashboard/page.tsx` - Accounting totals and HEMS pending use sumStrings
- `src/app/(admin)/beneficiaries/page.tsx` - Distribution totals and share calculations use sumStrings
- `src/app/(admin)/hems/page.tsx` - HEMS and withdrawal totals use sumStrings/addMoney
- `src/app/(admin)/hems-queue/page.tsx` - Pending request totals use sumStrings
- `src/app/(admin)/accounts/page.tsx` - Bank/investment DOD totals use sumStrings
- `src/app/(admin)/vehicles/page.tsx` - Vehicle value totals use sumStrings
- `src/app/(admin)/liabilities/page.tsx` - Liability totals use sumStrings
- `src/app/portal/page.tsx` - Distribution totals use sumStrings

## Decisions Made

- **dinero.js v2 alpha**: Chose alpha version for modern ES module support and cleaner API
- **Integer cents internally**: All amounts converted to integer cents to avoid floating-point precision issues
- **String interface**: All functions accept/return strings to match database storage pattern

## Deviations from Plan

None - plan executed exactly as written

## Issues Encountered

- **totalShares.toFixed type error**: After changing totalShares to string via sumStrings, the `.toFixed(1)` call failed. Fixed by using the string directly since sumStrings already returns proper decimal format.

## Next Phase Readiness

- Money utilities ready for use throughout application
- Pattern established for future money calculations
- All existing tests pass (174 pass, 3 skip)

---
*Phase: 31-dinero-money*
*Completed: 2026-01-16*
