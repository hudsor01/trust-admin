---
phase: 25-loan-terms-calculation-engine
plan: 02
subsystem: calculation
tags: [amortization, loan-calculations, intl, money-math]

# Dependency graph
requires:
  - phase: 25-01
    provides: liability schema with loan term fields
provides:
  - amortization calculation utilities (calculatePaymentSplit, estimatePayoffDate, calculateMonthlyPayment, getCurrentLoanPosition)
  - native Intl-based money utilities (replacing dinero.js)
affects: [25-03-auto-payment-allocation, liability-payments, trust-accounting]

# Tech tracking
tech-stack:
  added: []
  removed: [dinero.js]
  patterns: [integer-cents-for-precision, intl-numberformat-for-display]

key-files:
  created: [src/lib/amortization.ts, tests/lib/amortization.test.ts]
  modified: [src/lib/money.ts, package.json]

key-decisions:
  - "Replaced dinero.js with native Intl.NumberFormat - zero dependencies, same precision"
  - "Use integer cents for calculations, strings for storage, Intl for display"
  - "startDate in getCurrentLoanPosition used to calculate monthsElapsed for accurate interest estimation"

patterns-established:
  - "Money pattern: toCents() → calculate in integers → fromCents() → store as strings"
  - "Amortization edge cases: return null for impossible calculations (payment < interest)"

issues-created: []

# Metrics
duration: 23min
completed: 2026-01-16
---

# Plan 25-02: Amortization Calculation Utilities Summary

**TDD implementation of loan amortization functions with native Intl money utilities replacing dinero.js**

## Performance

- **Duration:** 23 min
- **Started:** 2026-01-16T18:28:24Z
- **Completed:** 2026-01-16T18:51:03Z
- **Tasks:** 3 (RED, GREEN, REFACTOR)
- **Files modified:** 7

## Accomplishments

- 4 amortization functions with comprehensive edge case handling
- 29 unit tests covering standard cases and edge cases (zero rate, negative amortization, zero balance)
- Replaced dinero.js (abandoned v2 alpha) with native Intl.NumberFormat
- Zero new dependencies - removed one

## TDD Cycle

### RED Phase
Wrote 29 failing tests covering:
- `calculatePaymentSplit`: standard mortgage, no escrow, zero rate, negative principal, zero balance
- `estimatePayoffDate`: standard mortgage, custom start date, never-pays-off detection, zero rate
- `calculateMonthlyPayment`: 30-year mortgage, 15-year mortgage, car loan, edge cases
- `getCurrentLoanPosition`: partial payment, paid ahead, brand new loan, fully paid, zero rate

### GREEN Phase
Implemented all 4 functions:
- Standard amortization formula: M = P × [r(1+r)^n] / [(1+r)^n - 1]
- Interest calculation: Balance × (AnnualRate / 12)
- Payoff estimation: n = -log(1 - (P × r / M)) / log(1 + r)
- Edge case handling: null returns for impossible calculations, zero rate special cases

### REFACTOR Phase
- Replaced dinero.js with native JavaScript Intl implementation
- Reason: dinero.js v2 is abandoned (no maintainer activity for 1+ year, still alpha after 3+ years)
- New pattern: integer cents for precision, Intl.NumberFormat for locale-aware display
- Removed dinero.js dependency from package.json

## Task Commits

1. **TDD: Amortization calculation utilities** - `bbf6259` (feat)
   - Tests, implementation, money.ts refactor, chart type fixes combined

**Plan metadata:** [pending this commit]

## Files Created/Modified

- `src/lib/amortization.ts` - 4 amortization calculation functions with TypeScript types
- `tests/lib/amortization.test.ts` - 29 comprehensive tests
- `src/lib/money.ts` - Replaced dinero.js with native Intl.NumberFormat implementation
- `package.json` - Removed dinero.js dependency
- `bun.lock` - Updated lockfile
- `src/components/ui/chart.tsx` - Fixed pre-existing TypeScript errors
- `src/components/charts/asset-allocation-chart.tsx` - Fixed Recharts type compatibility

## Decisions Made

1. **Replaced dinero.js with native Intl.NumberFormat**
   - dinero.js v2 is abandoned (alpha for 3+ years, no maintainer activity)
   - Native Intl provides locale-aware formatting with zero dependencies
   - Pattern: Store as strings → toCents() → calculate in integers → fromCents() → store

2. **Properly implemented startDate parameter**
   - Uses startDate to calculate monthsElapsed
   - Enables accurate interest estimation for loans ahead/behind schedule

3. **Combined TDD commits**
   - Single commit for test + implementation + money.ts refactor
   - Atomic: either all pass or none

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] dinero.js import failures**
- **Found during:** GREEN phase (tests failing on import)
- **Issue:** dinero.js was downgraded from v2-alpha to v1.9.1, breaking v2 API
- **Fix:** Replaced with native Intl.NumberFormat implementation (user suggestion)
- **Files modified:** src/lib/money.ts, package.json, bun.lock
- **Verification:** All 203 tests pass
- **Committed in:** bbf6259

**2. [Rule 3 - Blocking] Pre-existing chart TypeScript errors**
- **Found during:** Commit pre-hook
- **Issue:** Recharts type incompatibilities in chart.tsx and asset-allocation-chart.tsx
- **Fix:** Added explicit type definitions for payload types
- **Files modified:** src/components/ui/chart.tsx, src/components/charts/asset-allocation-chart.tsx
- **Verification:** TypeScript compiles clean
- **Committed in:** bbf6259

---

**Total deviations:** 2 auto-fixed (both blocking), 0 deferred
**Impact on plan:** Both auto-fixes necessary to proceed. Money utility rewrite is an improvement (zero deps).

## Issues Encountered

- dinero.js version mismatch required full rewrite to native Intl - resolved by user's suggestion to use Intl.NumberFormat
- Pre-existing chart type errors blocked commit - fixed as part of this commit

## Next Phase Readiness

- Amortization utilities ready for use in 25-03 (auto payment allocation)
- money.ts now uses native Intl (no external dependencies for money math)
- All 203 tests passing

---
*Phase: 25-loan-terms-calculation-engine*
*Completed: 2026-01-16*
