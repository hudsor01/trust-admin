---
phase: 36-useoptimistic-mutations
plan: 01
subsystem: ui
tags: [react-19, useOptimistic, optimistic-ui, mutations, trpc]

# Dependency graph
requires:
  - phase: 26-type-aware-liability-form
    provides: tRPC mutation patterns
provides:
  - useOptimistic pattern for tRPC mutations
  - Instant UI feedback for liability payments
  - Instant UI feedback for HEMS approvals
  - Instant UI feedback for task toggles
affects: [37-after-audit-logging, future-mutations]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useOptimistic for optimistic UI updates
    - Optimistic state reducers for list mutations

key-files:
  created: []
  modified:
    - src/app/(admin)/liabilities/page.tsx
    - src/app/(admin)/hems-queue/page.tsx
    - src/app/(admin)/dashboard/page.tsx

key-decisions:
  - "Use useOptimistic directly, no wrapper hooks"
  - "HemsRequest['status'] type for type safety"

patterns-established:
  - "useOptimistic + tRPC: setOptimistic before mutateAsync"
  - "Optimistic reducer: (current, update) => current.map(...)"

issues-created: []

# Metrics
duration: 7min
completed: 2026-01-18
---

# Phase 36 Plan 01: useOptimistic for Mutations Summary

**Added React 19's useOptimistic hook to three high-value mutations for instant UI feedback**

## Accomplishments

- Liability payment recording now shows instant balance decrease before server responds
- HEMS request approval/denial shows instant status badge change (APPROVED/DENIED)
- Task completion toggle fills/unfills checkbox instantly on click
- All derived values (totals, progress bars, counts) update together with primary data

## Files Modified

- `src/app/(admin)/liabilities/page.tsx` - Added useOptimistic for payment recording
- `src/app/(admin)/hems-queue/page.tsx` - Added useOptimistic for approval/denial
- `src/app/(admin)/dashboard/page.tsx` - Added useOptimistic for task toggle

## Commits

1. `ce6c81f` - feat(36-01): add useOptimistic to liability payment recording
2. `4955323` - feat(36-01): add useOptimistic to HEMS request approval/denial
3. `9c0d702` - feat(36-01): add useOptimistic to task completion toggle

## Pattern Established

```tsx
// useOptimistic pattern for tRPC mutations
const [optimisticItems, setOptimisticItem] = useOptimistic(
  items ?? [],
  (current, update: { id: number; changes: Partial<Item> }) =>
    current.map((item) =>
      item.id === update.id ? { ...item, ...update.changes } : item
    )
)

async function handleMutation(id: number, changes: Partial<Item>) {
  setOptimisticItem({ id, changes })  // Instant UI update
  await mutation.mutateAsync(data)     // Background operation
  // On error, optimistic state automatically reverts to server state
}
```

Key implementation details:
- Use `useOptimistic` directly in components (no wrapper hooks)
- Calculate optimistic state before calling mutation
- Replace all derived data sources with optimistic version for consistency
- TypeScript: use proper enum types for status fields to avoid type errors

## Decisions Made

- Used `HemsRequest['status']` type instead of `string` to maintain type safety
- Moved `setReviewingRequest(null)` before mutation for instant dialog close
- Updated all derived values (totals, counts, filtered lists) to use optimistic state

## Issues Encountered

None. All three implementations followed the same pattern and worked as expected.

## Next Phase Readiness

Phase 36 complete. Pattern established for extending optimistic updates to remaining mutations:
- Beneficiary updates
- Liability inline edits
- Trust accounting entries
- Contact management
