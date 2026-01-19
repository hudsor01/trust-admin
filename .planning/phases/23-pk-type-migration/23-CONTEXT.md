# Phase 23: Primary Key Type Migration - Context

**Gathered:** 2026-01-17
**Status:** Ready for research

<vision>
## How This Should Work

Since this is pre-production, we can do a clean migration without compatibility concerns. The focus is on getting the schema right the first time so it's solid for the future.

All 31 tables currently use TEXT primary keys (CUID strings). These should be migrated to BIGINT GENERATED ALWAYS AS IDENTITY, following PostgreSQL best practices. No need for dual-write periods, gradual rollouts, or backward compatibility shims — just a clean cutover to the better approach.

</vision>

<essential>
## What Must Be Nailed

All three equally important:

- **Performance & storage** — BIGINT is faster for joins, smaller storage footprint, better index performance than TEXT
- **Developer experience** — Auto-increment IDs are simpler to work with in queries, debugging, and general development
- **Database conventions** — Follow PostgreSQL best practices for a professional, maintainable schema

</essential>

<boundaries>
## What's Out of Scope

- **API backward compatibility** — No need to support old CUID format in APIs or responses. Pre-production means we can cleanly switch ID formats.
- **Migration rollback plan** — Since there's no production data to protect, we can be more aggressive with the migration approach.

</boundaries>

<specifics>
## Specific Ideas

No specific requirements — open to standard PostgreSQL IDENTITY patterns:
- Standard BIGINT with GENERATED ALWAYS AS IDENTITY
- Sequential starting from 1 (or PostgreSQL default)
- No need to preserve original CUIDs

</specifics>

<notes>
## Additional Context

Key insight: This is pre-production, so the main constraint is **quality** not **migration complexity**. We're building the foundation right the first time, not retrofitting a live system.

The 31 tables all need their PKs migrated, plus all FK references updated to match. Since we're using Drizzle ORM, the schema changes will propagate through the type system.

</notes>

---

*Phase: 23-pk-type-migration*
*Context gathered: 2026-01-17*
