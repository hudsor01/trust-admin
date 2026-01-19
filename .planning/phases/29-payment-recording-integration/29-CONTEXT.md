# Phase 29: Payment Recording Integration - Context

**Gathered:** 2026-01-17
**Status:** Ready for planning

<vision>
## How This Should Work

Recording a liability payment should be quick and minimal — as few clicks as possible. The user clicks "Record Payment," a pre-filled dialog opens with sensible defaults (expected monthly payment, today's date, last-used payment method), and they just hit confirm.

All the math happens behind the scenes. The system figures out the principal vs interest split automatically based on the loan terms entered in Phase 25. The user never has to think about amortization calculations — they just record what they paid, and the system handles the rest.

After saving, the UI updates immediately: new balance shown, progress bars updated, payoff projections recalculated. A brief toast confirms success.

</vision>

<essential>
## What Must Be Nailed

- **Auto principal/interest calculation** - This is the core value. The system calculates how much of each payment goes to principal vs interest vs escrow based on loan terms. The user never manually enters this split.

- **Pre-filled dialog with smart defaults** - Expected monthly payment pre-populated, today's date, last-used payment method. Standard payments are one-click confirms.

- **Instant UI feedback** - Balance updates immediately, progress visualization reflects the new payment.

</essential>

<boundaries>
## What's Out of Scope

- Batch payments (recording multiple payments across liabilities at once)
- Payment scheduling or recurring payment setup
- Payment import from bank statements
- Complex payment scenarios beyond standard/extra/partial

Focus on what's in the roadmap: seamless single-payment recording that leverages the calculation engine from Phase 25.

</boundaries>

<specifics>
## Specific Ideas

- Pre-fill dialog with `calculateMonthlyPayment()` result for loans with terms
- For credit cards (revolving), pre-fill minimum payment or last payment amount
- Use `calculatePaymentSplit()` from Phase 25 to auto-determine principal/interest portions
- Show brief confirmation toast with new balance after save
- Handle edge cases gracefully:
  - Extra payment → entire extra goes to principal
  - Partial payment → warn but allow (pro-rate the split)
  - No interest rate → entire payment to principal

</specifics>

<notes>
## Additional Context

This is the capstone of v4.0 Smart Liability Management. Phases 25-28 built all the infrastructure:
- Phase 25: `calculatePaymentSplit()`, `estimatePayoffDate()`, loan term schema
- Phase 26: Type-aware forms with conditional fields
- Phase 27: Bulk entry for initial inventory
- Phase 28: Progress visualization

This phase connects them all — when you record a payment, the calculations from Phase 25 fire automatically, and the visualizations from Phase 28 update instantly.

UX priority over feature density. Quick and minimal beats comprehensive and complex.

</notes>

---

*Phase: 29-payment-recording-integration*
*Context gathered: 2026-01-17*
