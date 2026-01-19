# Phase 43: Table Consolidation - Context

**Gathered:** 2026-01-18
**Status:** Ready for planning

<vision>
## How This Should Work

A clean sweep migration — find every page still using the old `data-table.tsx` and migrate them all to TanStack Table in one go. Then delete the old file entirely.

The codebase currently has two parallel table implementations. This phase eliminates that duplication so there's only one way to render tables going forward.

</vision>

<essential>
## What Must Be Nailed

- **Single source of truth** — One table implementation across the entire codebase. Delete `data-table.tsx` completely, no lingering references.

</essential>

<boundaries>
## What's Out of Scope

- Nothing explicitly excluded — whatever it takes to get the migration done and delete the old file

</boundaries>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<notes>
## Additional Context

VirtualizedTable (built on TanStack Table) already exists and is used for large datasets like activity log. The regular TanStack Table wrapper (`tanstack-table.tsx`) is used elsewhere. Both are the "new" approach.

The goal is eliminating `data-table.tsx` (the old implementation) entirely.

</notes>

---

*Phase: 43-table-consolidation*
*Context gathered: 2026-01-18*
