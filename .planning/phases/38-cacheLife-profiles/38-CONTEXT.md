# Phase 38: cacheLife Profiles for Data Fetching - Context

**Gathered:** 2026-01-18
**Status:** Ready for planning

<vision>
## How This Should Work

Apply sensible caching based on best practices for trust/financial applications. The user doesn't have specific caching needs — just wants the system to be fast with appropriate freshness for different data types.

For a trust administration app:
- **Financial data** (balances, payments, accounting): Fresh is critical — can be cached briefly but must revalidate quickly
- **Reference data** (beneficiary list, trustees, contacts): Changes infrequently — can be cached longer
- **Configuration** (entity settings, fee schedules): Very stable — can be cached aggressively

The caching should be invisible to users — pages feel fast, data is always appropriate fresh for its type.

</vision>

<essential>
## What Must Be Nailed

- **Apply best practices** — User trusts Claude to determine appropriate cache durations for each data type
- **No stale critical data** — Financial data like balances must never show outdated values that could cause confusion
- **Sensible defaults** — Configure cacheLife profiles that make sense for trust administration workflows

</essential>

<boundaries>
## What's Out of Scope

- Cache invalidation on mutations — that's Phase 39 (cacheTag)
- This phase sets up the profiles and applies `"use cache"` directive
- Phase 39 adds `cacheTag()` and `revalidateTag()` for precise invalidation

</boundaries>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches based on:
- Next.js cacheLife documentation patterns
- Financial application best practices
- The data types already present in this codebase

</specifics>

<notes>
## Additional Context

User wants Claude to apply domain expertise — what caching makes sense for a trust administration application where:
- Admin views financial data that changes with payments/entries
- Beneficiary lists and trustee info changes rarely
- Entity configuration is essentially static

All aspects (fresh data, fast loads, simple code) are equally important — no specific priority.

</notes>

---

*Phase: 38-cacheLife-profiles*
*Context gathered: 2026-01-18*
