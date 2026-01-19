# Phase 36: useOptimistic for Mutations - Context

**Gathered:** 2026-01-17
**Status:** Ready for planning

<vision>
## How This Should Work

The entire admin UI should feel instant and responsive. Every mutation - saves, updates, approvals, deletions - should provide immediate visual feedback. When a user records a payment, the balance decreases instantly. When they approve a HEMS request, the status flips to "Approved" immediately. No waiting for spinners.

The key is **consistency**: when one piece of data updates optimistically, related displays should update together. If a payment reduces a liability balance, the progress bar should advance, the payoff date should recalculate, and the dashboard summary should reflect the new total - all instantly.

If a mutation fails, the UI should gracefully revert and show a clear error. But the happy path should feel like a native app.

</vision>

<essential>
## What Must Be Nailed

- **Data consistency** - When a balance changes, all related UI (progress bars, payoff dates, totals, summaries) must update together, not one at a time
- **Instant feedback everywhere** - Not just the four roadmap targets, but all significant mutations in the admin UI

</essential>

<boundaries>
## What's Out of Scope

- Offline support - Optimistic updates work while connected, but no offline queue or sync mechanism
- Portal (beneficiary side) can use existing patterns, not a priority for this phase

</boundaries>

<specifics>
## Specific Ideas

**Use `useOptimistic` directly** - No custom wrapper hooks. It's a native React 19.2 feature with a clean API. Apply it inline where needed rather than adding abstraction layers.

The existing research in 26-RESEARCH.md provides good patterns for direct usage.

</specifics>

<notes>
## Additional Context

User emphasized "instant feedback everywhere" over the minimal roadmap scope. The phase should apply optimistic patterns broadly across the admin UI rather than just to the four specific mutation targets listed.

Existing research in `.planning/phases/26-type-aware-liability-form/26-RESEARCH.md` covers:
- `useOptimistic` hook patterns
- Integration with async handlers
- Automatic revert on error
- Code examples for payment recording

</notes>

---

*Phase: 36-useoptimistic-mutations*
*Context gathered: 2026-01-17*
