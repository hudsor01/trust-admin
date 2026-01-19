# Phase 41: Quick Fixes - Context

**Gathered:** 2026-01-17
**Status:** Ready for planning

<vision>
## How This Should Work

Execute the three tasks exactly as defined in the roadmap. This is the first phase of v7.0 Codebase Consolidation — tackling the low-hanging fruit to set up a cleaner foundation for the more substantial consolidation work in Phases 42-46.

Three targeted changes:
1. Remove the duplicate `AllocationClass` type from `classification-rules.ts` (import from `type-utils.ts` instead)
2. Replace hardcoded enum values in the liability router with the existing `PAYMENT_METHOD_VALUES` and `ALLOCATION_CLASS_VALUES` constants
3. Add `getAllArray()` method to the CRUD factory that always returns `Select[]`, eliminating 20+ type guards scattered across the codebase

No surprises, no scope creep — just clean execution of well-defined tasks.

</vision>

<essential>
## What Must Be Nailed

- **All three tasks equally important** — each contributes to reducing duplication and improving consistency
- **Type safety preserved or improved** — changes should make TypeScript happier, not introduce new `as any` casts
- **Zero breaking changes** — purely internal refactoring with no visible API or behavior changes

</essential>

<boundaries>
## What's Out of Scope

- No new features or API changes — purely internal cleanup
- No touching files beyond what's necessary for the three tasks
- No expanding scope to "while we're here" improvements
- Hook extraction, router factories, table consolidation — those are Phases 42-46

</boundaries>

<specifics>
## Specific Ideas

No specific requirements — the roadmap tasks are well-defined with clear files and changes.

</specifics>

<notes>
## Additional Context

This is v7.0's entry point. The goal is quick wins that make the larger consolidation phases easier. If getAllArray() works as expected, it removes friction from 20+ places in the codebase that currently need type guards after CRUD operations.

</notes>

---

*Phase: 41-quick-fixes*
*Context gathered: 2026-01-17*
