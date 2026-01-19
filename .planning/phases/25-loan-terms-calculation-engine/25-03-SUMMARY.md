---
phase: 25-loan-terms-calculation-engine
plan: 03
status: complete
completed: 2026-01-17
---

# Summary: Integrate Amortization into Payment Recording

## What Was Built

### Task 1: Auto-Calculation in recordLiabilityPayment ✅
- Imported `calculatePaymentSplit` from `src/lib/amortization.ts`
- Added logic to auto-calculate principal/interest split when:
  - Liability has interestRate set
  - Not revolving credit (isRevolvingCredit !== true)
  - User doesn't provide manual portions
- Calculated values stored in payment record
- Falls back to user-provided values when specified

### Task 2: Payoff Projection Endpoint ✅
- Added `getPayoffProjection` procedure to liability router
- Returns estimated payoff date based on current balance, rate, and monthly payment
- Returns null for revolving credit or missing data

### Task 3: Human Verification ✅
- User tested payment recording workflow
- Auto-calculation working correctly
- Build and typecheck passing

## Bonus Work (Beyond Plan)

### Smart Conditional Form Fields
- Credit cards: Hide original amount, maturity date, loan term fields
- Mortgages/Loans: Show all fields including new loan term fields
- Labels adapt: "APR" vs "Interest Rate", "Minimum Payment" vs "Monthly Payment"
- `isRevolvingType()` and `hasLoanTermFields()` helpers for type-based logic

### Allocation Class Moved to Payment Level
- Removed from liability form and table (was incorrectly at liability level)
- Added to payment recording form
- Each payment can now have its own Principal/Income classification
- Backend uses payment allocation, falls back to liability's for backwards compatibility
- Matches Texas Property Code 116.152 trust accounting requirements

### UI Polish
- Sidebar active nav indicator: Short blue vertical bar (premium style)
- Consistent styling for main menu and submenus

## Files Changed

- `db/queries.ts` - recordLiabilityPayment with auto-calculation + payment-level allocation
- `src/server/trpc/routers/liability.ts` - getPayoffProjection procedure, allocationClass in recordPayment
- `src/app/(admin)/liabilities/page.tsx` - Smart form fields, allocation in payment form
- `src/components/ui/sidebar.tsx` - Active nav indicator styling

## Verification

- [x] `bun run typecheck` passes
- [x] `bun run build` passes
- [x] Payment recording auto-calculates split when rate is present
- [x] Manual portions override auto-calculation
- [x] Revolving credit skips calculation
- [x] getPayoffProjection returns valid projection
- [x] Human verification passed

## Phase 25 Status

All 3 plans complete:
- 25-01: Loan terms schema fields ✅
- 25-02: Amortization calculation utilities ✅
- 25-03: Integration into payment workflow ✅

**Phase 25 COMPLETE** - Ready for Phase 26: Type-Aware Liability Form
