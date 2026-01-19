# Phase 41 Context: Hook Extraction

## Vision

**Primary driver:** Reduce duplication - the same patterns are repeated across components.

**Scope:** Extract three reusable pieces:
1. `useEditableCell` hook - inline editing pattern used in table cells
2. `useCrudMutations` hook - create/update/delete mutation setup repeated per resource
3. Shared `<LoginPage>` component - admin and beneficiary login have similar structure

**Priority:** All three equally valuable - similar amounts of duplication across each.

## Boundaries

**Out of scope:**
- No new features - pure extraction, hooks should match current behavior exactly
- Extraction only - the goal is DRY code, not enhancement

**In scope:**
- Extract patterns as they exist today
- Migrate existing consumers to use the new hooks
- Ensure type safety is preserved

## What Success Looks Like

- Three reusable abstractions that eliminate repeated code
- Existing functionality unchanged
- Future components can use these hooks instead of reimplementing

---
*Gathered: 2026-01-18*
*Ready for: /gsd:plan-phase 41*
