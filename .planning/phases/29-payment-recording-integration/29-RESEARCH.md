# Phase 29: Payment Recording Integration - Research

**Researched:** 2026-01-17
**Domain:** Form UX enhancement, real-time calculation preview, TanStack Form patterns
**Confidence:** HIGH

<research_summary>
## Summary

Researched patterns for enhancing the payment recording dialog with auto-calculation display and instant UI feedback. This phase is primarily **integration work** connecting existing infrastructure (amortization calculations from Phase 25, progress visualization from Phase 28) into the payment dialog UX.

The existing codebase already has:
- Complete amortization calculation utilities (`src/lib/amortization.ts`)
- Backend auto-calculation in `recordLiabilityPayment()` (`db/queries.ts:466-580`)
- Payment dialog UI structure (liabilities page lines 1325-1645)
- TanStack Form patterns established throughout the codebase

The main work is **UX enhancement**: showing calculation previews before save, pre-filling smart defaults, and providing instant feedback after recording.

**Primary recommendation:** Use existing `calculatePaymentSplit()` for real-time preview in dialog. Leverage TanStack Form's `useStore` and `Subscribe` for reactive calculation display. Use `useDeferredValue` pattern already established in `PaymentPreview` component.
</research_summary>

<standard_stack>
## Standard Stack

All required libraries are **already installed and in use** in the codebase:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-form | existing | Form state management | Already used throughout app |
| @tanstack/react-query | existing | Server state + mutations | Already integrated with tRPC |
| React 19 | 19.x | useDeferredValue, useOptimistic | Native React hooks |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | existing | Toast notifications | Already used for success/error feedback |
| zod | existing | Validation schemas | Already integrated in tRPC routers |

### No New Dependencies Required
Phase 29 requires **zero new npm packages**. All necessary tools are already installed.

**Why this matters:** The roadmap correctly flagged "Research: Unlikely (integration of existing work)". This phase is about connecting existing pieces, not introducing new technology.
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Pattern: Real-Time Calculation Preview

Use the established `useDeferredValue` + `useMemo` pattern from `PaymentPreview` (lines 109-184 of liabilities page):

```typescript
// Pattern: Deferred value calculation for smooth typing
function PaymentImpactPreview({ formInstance, liability }) {
  // Subscribe to form amount
  const amount = formInstance.useStore(
    (s) => s.values.amount
  )

  // Defer for smooth typing
  const deferredAmount = useDeferredValue(amount)

  // Calculate only when deferred value settles
  const preview = useMemo(() => {
    if (!deferredAmount || !liability.interestRate) return null

    const split = calculatePaymentSplit(
      liability.currentBalance,
      (parseFloat(liability.interestRate) / 100).toString(),
      deferredAmount,
      liability.escrowMonthly || undefined
    )

    if (!split) return null

    // Get updated payoff projection with new balance
    const payoff = estimatePayoffDate(
      split.newBalance,
      (parseFloat(liability.interestRate) / 100).toString(),
      liability.monthlyPayment || deferredAmount,
      liability.escrowMonthly || undefined
    )

    return { split, payoff }
  }, [deferredAmount, liability])

  if (!preview) return null

  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>Principal: {formatCurrency(preview.split.principal)}</div>
        <div>Interest: {formatCurrency(preview.split.interest)}</div>
        <div>New Balance: {formatCurrency(preview.split.newBalance)}</div>
        {preview.payoff && (
          <div>Payoff: {formatDate(preview.payoff.payoffDate)}</div>
        )}
      </div>
    </div>
  )
}
```

### Pattern: Smart Pre-filling

Pre-fill payment dialog with intelligent defaults:

```typescript
const openPaymentDialog = (liability: Liability) => {
  setPayingLiabilityId(liability.id)

  // Smart defaults
  const today = new Date().toISOString().split('T')[0] ?? ''
  const suggestedAmount = liability.monthlyPayment || ''

  // Remember last-used payment method from localStorage (optional)
  const lastMethod = localStorage.getItem('lastPaymentMethod') || 'CHECK'

  paymentForm.handleEdit({
    paymentDate: today,
    amount: suggestedAmount,  // Pre-fill with expected payment
    paymentMethod: lastMethod,
    checkNumber: '',
    confirmationNumber: '',
    allocationClass: liability.allocationClass || 'PRINCIPAL',
    notes: '',
  })
}
```

### Pattern: Post-Save UI Feedback

After mutation success, invalidate all relevant queries and show brief toast:

```typescript
const recordPaymentMutation = trpc.liability.recordPayment.useMutation({
  onSuccess: (data, variables) => {
    // Invalidate all related queries
    utils.liability.list.invalidate()
    utils.trustAccounting.listPaginated.invalidate()
    utils.liability.getPayoffProjection.invalidate({ liabilityId: variables.liabilityId })

    // Get updated liability for feedback
    const updatedLiability = data  // assuming mutation returns updated liability

    // Brief success toast with new balance
    toast.success(
      `Payment recorded. Balance: ${formatCurrency(updatedLiability.currentBalance)}`
    )
  },
  onError: (error) => toast.error(error.message),
})
```

### Anti-Patterns to Avoid
- **Calculating on every keystroke:** Use `useDeferredValue` to batch calculations
- **Manual state for preview:** Use TanStack Form's `useStore` with selectors
- **Blocking UI during calculation:** Calculations are fast (< 1ms), but defer anyway for UX
- **Duplicating calculation logic:** Use existing `calculatePaymentSplit()` from Phase 25
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Payment split calculation | Custom P/I formula | `calculatePaymentSplit()` | Already tested with 29 unit tests |
| Payoff projection | Manual amortization loop | `estimatePayoffDate()` | Handles edge cases (zero rate, already paid) |
| Form state management | useState for each field | TanStack Form `useStore` | Already integrated, handles validation |
| Optimistic UI for balance | Manual state + rollback | tRPC mutation + invalidation | Simpler, already working pattern |
| Toast notifications | Custom notification system | `sonner` toast | Already configured, consistent UX |

**Key insight:** Phase 29 is about **connecting existing pieces**, not building new infrastructure. The amortization module from Phase 25 is battle-tested with comprehensive unit tests. The payment dialog structure already exists. The work is adding the preview component and improving defaults.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Interest Rate Format Mismatch
**What goes wrong:** Calculation returns wildly wrong values
**Why it happens:** `interestRate` in DB is stored as percentage (e.g., "6.5"), but `calculatePaymentSplit()` expects decimal (e.g., "0.065")
**How to avoid:** Always divide by 100 when calling amortization functions:
```typescript
const rateDecimal = (parseFloat(liability.interestRate) / 100).toString()
```
**Warning signs:** Principal portion larger than payment, negative interest

### Pitfall 2: Null/Undefined Balance Fields
**What goes wrong:** Calculation returns null, preview doesn't render
**Why it happens:** Optional fields like `currentBalance`, `interestRate` can be null
**How to avoid:** Check for existence before calculating:
```typescript
const canCalculate = liability.currentBalance && liability.interestRate && amount
```
**Warning signs:** Preview component renders nothing, no errors

### Pitfall 3: Escrow Not Subtracted Correctly
**What goes wrong:** Principal calculation is off by escrow amount
**Why it happens:** Escrow portion needs to be passed to `calculatePaymentSplit()` for correct P/I split
**How to avoid:** Pass escrow amount if liability has one:
```typescript
calculatePaymentSplit(
  balance,
  rate,
  payment,
  liability.escrowMonthly || undefined  // Pass escrow if exists
)
```
**Warning signs:** Principal + Interest + Escrow !== Payment Amount

### Pitfall 4: Credit Card Edge Case
**What goes wrong:** Showing "Payoff Date: Never" for credit cards
**Why it happens:** Revolving credit has no fixed term, payment may not cover interest
**How to avoid:** Check `isRevolvingCredit` before showing loan-specific fields:
```typescript
const isRevolvingCredit = liability.isRevolvingCredit || liability.liabilityType === 'CREDIT_CARD'
// Don't show payoff date for revolving credit
```
**Warning signs:** Confusing payoff dates, calculation returns null

### Pitfall 5: Form State Not Syncing with Preview
**What goes wrong:** Preview shows stale data while user is typing
**Why it happens:** Not using reactive form subscription
**How to avoid:** Use `formInstance.useStore()` with selector, not `useState`:
```typescript
// ✅ Reactive
const amount = formInstance.useStore((s) => s.values.amount)

// ❌ Not reactive - won't update as user types
const [amount, setAmount] = useState(formInstance.state.values.amount)
```
**Warning signs:** Preview doesn't update while typing, only updates on blur
</common_pitfalls>

<code_examples>
## Code Examples

### Pre-fill Payment Dialog with Smart Defaults
```typescript
// Source: Pattern from existing liabilities page, enhanced
const openPaymentDialog = (l: Liability) => {
  setPayingLiabilityId(l.id)

  // Smart defaults
  const today = new Date().toISOString().split('T')[0] ?? ''

  // Pre-fill amount: use monthly payment if available
  // For credit cards without monthly payment, leave empty
  const suggestedAmount = l.monthlyPayment?.toString() || ''

  paymentForm.handleEdit({
    paymentDate: today,
    amount: suggestedAmount,  // Pre-filled with expected payment
    paymentMethod: 'CHECK',
    checkNumber: '',
    confirmationNumber: '',
    allocationClass: l.allocationClass || 'PRINCIPAL',
    notes: '',
  })
}
```

### Real-Time Payment Impact Preview Component
```typescript
// Source: Pattern from PaymentPreview component + amortization.ts
function PaymentImpactPreview({
  formInstance,
  liability,
}: {
  formInstance: any  // TanStack Form instance
  liability: Liability
}) {
  // Subscribe to payment amount from form
  const amount = formInstance.useStore(
    (s: { values: PaymentFormData }) => s.values.amount
  )

  // Defer for smooth typing experience
  const deferredAmount = useDeferredValue(amount)

  // Calculate preview when deferred value settles
  const preview = useMemo(() => {
    // Skip if no amount or missing required fields
    if (!deferredAmount?.trim()) return null
    if (!liability.interestRate || !liability.currentBalance) return null

    const paymentNum = parseFloat(deferredAmount.replace(/[,$]/g, ''))
    if (Number.isNaN(paymentNum) || paymentNum <= 0) return null

    // Convert rate from percentage to decimal
    const rateDecimal = (parseFloat(liability.interestRate) / 100).toString()

    // Calculate payment split
    const split = calculatePaymentSplit(
      liability.currentBalance,
      rateDecimal,
      paymentNum.toString(),
      liability.escrowMonthly || undefined
    )

    if (!split) return null

    // Calculate updated payoff date with new balance
    const payoff = estimatePayoffDate(
      split.newBalance,
      rateDecimal,
      liability.monthlyPayment || paymentNum.toString(),
      liability.escrowMonthly || undefined
    )

    return { split, payoff }
  }, [deferredAmount, liability])

  // Don't render if no valid calculation
  if (!preview) return null

  // Check if this is an extra payment
  const isExtraPayment = liability.monthlyPayment &&
    parseFloat(deferredAmount) > parseFloat(liability.monthlyPayment)

  return (
    <div className="rounded-lg bg-muted/50 p-3 mt-4 space-y-2">
      <div className="text-sm text-muted-foreground font-medium">
        Payment Breakdown
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div className="text-muted-foreground">Principal</div>
        <div className="font-medium">{formatCurrency(preview.split.principal)}</div>
        <div className="text-muted-foreground">Interest</div>
        <div className="font-medium">{formatCurrency(preview.split.interest)}</div>
        {parseFloat(preview.split.escrow) > 0 && (
          <>
            <div className="text-muted-foreground">Escrow</div>
            <div className="font-medium">{formatCurrency(preview.split.escrow)}</div>
          </>
        )}
        <div className="text-muted-foreground border-t pt-1">New Balance</div>
        <div className="font-semibold border-t pt-1">
          {formatCurrency(preview.split.newBalance)}
        </div>
      </div>

      {preview.payoff && (
        <div className="text-xs text-muted-foreground pt-1">
          Est. payoff: {new Date(preview.payoff.payoffDate).toLocaleDateString()}
          {isExtraPayment && (
            <span className="text-green-600 ml-2">
              (Extra payment accelerates payoff!)
            </span>
          )}
        </div>
      )}
    </div>
  )
}
```

### Partial Payment Warning
```typescript
// Source: Edge case handling pattern
function PartialPaymentWarning({
  amount,
  monthlyPayment,
}: {
  amount: string
  monthlyPayment: string | null
}) {
  if (!monthlyPayment || !amount) return null

  const enteredAmount = parseFloat(amount.replace(/[,$]/g, ''))
  const expectedAmount = parseFloat(monthlyPayment)

  if (Number.isNaN(enteredAmount) || Number.isNaN(expectedAmount)) return null

  // Only warn if payment is less than 90% of expected
  if (enteredAmount >= expectedAmount * 0.9) return null

  return (
    <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm">
      <div className="font-medium text-yellow-800">Partial Payment</div>
      <div className="text-yellow-700 mt-1">
        This is less than the expected payment of {formatCurrency(monthlyPayment)}.
        Partial payments may result in late fees or increased interest charges.
      </div>
    </div>
  )
}
```
</code_examples>

<sota_updates>
## State of the Art (2024-2025)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| useState for form fields | TanStack Form with useStore | 2023+ | Better performance, less boilerplate |
| Direct state updates | useDeferredValue for calculations | React 18+ | Smoother typing experience |
| Manual cache invalidation | tRPC mutation onSuccess | Already in place | Automatic query refresh |

**React 19 Opportunities (Future - Phase 36):**
- `useOptimistic` hook for instant balance updates before server confirms
- Currently using tRPC mutation → invalidation, which works well
- Consider optimistic UI in v6.0 Phase 36 per roadmap

**Current best practice:**
The existing pattern (tRPC mutation → onSuccess → invalidate) is production-ready and matches the codebase style. React 19's `useOptimistic` could enhance this in Phase 36, but is not required for Phase 29.
</sota_updates>

<open_questions>
## Open Questions

1. **Extra payment handling detail level**
   - What we know: Extra payments should go to principal
   - What's unclear: Should we show projected interest savings? How detailed?
   - Recommendation: Show "Extra payment accelerates payoff!" message, defer detailed savings to future enhancement

2. **Payment method memory**
   - What we know: Could remember last-used payment method
   - What's unclear: Is localStorage appropriate? Should it be per-liability?
   - Recommendation: Keep simple - use last-used method via localStorage. Don't over-engineer.

3. **Negative principal edge case**
   - What we know: `calculatePaymentSplit()` can return negative principal if payment < interest
   - What's unclear: How to display this edge case in UI
   - Recommendation: Show warning when principal is negative ("Payment doesn't cover interest")
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- `/tanstack/form` Context7 docs - useStore, Subscribe, form initialization patterns
- Existing codebase `src/lib/amortization.ts` - 29 unit tests, battle-tested
- Existing codebase `db/queries.ts:recordLiabilityPayment()` - already handles auto-calculation
- Existing codebase liabilities page - established patterns for dialogs and forms

### Secondary (MEDIUM confidence)
- [React useOptimistic docs](https://react.dev/reference/react/useOptimistic) - React 19 hook reference
- [TkDodo's blog on optimistic updates](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query) - TanStack Query patterns

### Tertiary (LOW confidence - not needed)
- None - this phase uses existing patterns, no new technology research required
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: TanStack Form (already in use)
- Ecosystem: React 19 hooks, tRPC mutations (already integrated)
- Patterns: Real-time calculation preview, smart defaults
- Pitfalls: Rate format, null handling, credit card edge cases

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed and used
- Architecture: HIGH - patterns established in codebase (PaymentPreview component)
- Pitfalls: HIGH - discovered from existing amortization tests and code review
- Code examples: HIGH - adapted from existing patterns in the codebase

**Research date:** 2026-01-17
**Valid until:** 2026-02-17 (30 days - stable integration work)

**Key insight:** This phase is **integration work**, not new technology adoption. The research confirms that all infrastructure exists - the work is connecting the pieces with good UX.
</metadata>

---

*Phase: 29-payment-recording-integration*
*Research completed: 2026-01-17*
*Ready for planning: yes*
