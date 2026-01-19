# Phase 26: Type-Aware Liability Form - Context

**Gathered:** 2026-01-17
**Status:** Ready for planning

<vision>
## How This Should Work

When users add or edit a liability, they first select the type (mortgage, loan, credit card, etc.), and the form transforms to show only the fields relevant to that type. No confusion, no irrelevant fields cluttering the screen.

Credit cards don't show loan term or escrow fields. Mortgages show everything including escrow. The form adapts intelligently based on what type of debt it is.

The backend calculation engine from Phase 25 powers real-time feedback — as the user enters loan terms, they see "Your monthly payment would be $X" calculated live.

</vision>

<essential>
## What Must Be Nailed

- **Reduce confusion** — Users shouldn't see fields that don't apply to their liability type
- **Type picker transforms form** — Select type, fields morph to show only what's relevant
- **Clean, focused forms** — Each liability type gets exactly the fields it needs, nothing more

</essential>

<boundaries>
## What's Out of Scope

- Bulk entry mode — that's Phase 27, keep this to single-liability editing
- Progress visualization dashboards — may do light progress hints but main viz is Phase 28
- One-by-one filling is fine — no spreadsheet-style entry needed

</boundaries>

<specifics>
## Specific Ideas

- **Smooth field transitions** — Animate fields in/out as type changes rather than jarring swaps
- **Inline validation** — Show validation messages as user types, not just on submit
- **Payment preview** — "Your monthly payment would be $X" calculated live as they enter loan terms
- Uses calculation utilities from Phase 25 (`calculateMonthlyPayment`, `estimatePayoffDate`, etc.)

</specifics>

<notes>
## Additional Context

Phase 25 completed the backend:
- `calculatePaymentSplit`: splits payment into principal/interest/escrow
- `estimatePayoffDate`: projects loan payoff date
- `calculateMonthlyPayment`: standard amortization formula
- `getCurrentLoanPosition`: analyzes current loan lifecycle position

Schema already has the fields:
- `loanTermMonths`, `loanStartDate`, `escrowMonthly`, `isRevolvingCredit`

This phase is purely about surfacing all that intelligence in a smart, type-aware UI form.

</notes>

---

*Phase: 26-type-aware-liability-form*
*Context gathered: 2026-01-17*
