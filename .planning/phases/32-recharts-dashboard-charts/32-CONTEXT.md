# Phase 32: recharts Dashboard Charts - Context

**Gathered:** 2026-01-16
**Status:** Ready for planning

<vision>
## How This Should Work

When I (the trustee) open the admin dashboard, I immediately see the financial health of the trust at a glance. The primary visual is a **net worth summary** - total assets vs total liabilities - so I instantly know "how healthy is this trust?"

This is about **financial snapshot**, not historical analysis. Current state only. The charts should communicate value in seconds, not require study.

Note: Beneficiaries have their own portal (magic link login) with a different, limited view. These charts are for the admin dashboard only.

</vision>

<essential>
## What Must Be Nailed

- **Clarity over features** - One or two charts that are immediately understandable. No dashboard clutter. Quality over quantity.
- **Net worth first** - The big picture (assets vs liabilities) should be the most prominent visual element.
- **Instant comprehension** - I glance at the dashboard and know the trust's financial position.

</essential>

<boundaries>
## What's Out of Scope

- Historical trends - No time-series charts showing changes over months/years. Just current state.
- Complex interactive features can wait - focus on clear, static visuals first
- Per-beneficiary breakdowns - trust-wide totals only for this phase

</boundaries>

<specifics>
## Specific Ideas

- **Bold and colorful** - Distinct colors for each category (asset types, paid vs remaining debt). Easy to distinguish at a glance.
- Asset allocation pie/donut chart as secondary visual (showing breakdown by asset type)
- Liability progress visualization (paid vs remaining)
- Should complement existing shadcn/ui aesthetic while standing out visually

</specifics>

<notes>
## Additional Context

The roadmap mentions three potential charts:
1. AssetAllocationChart (pie chart by asset type)
2. DistributionTrendChart (line chart over time) - OUT OF SCOPE per user
3. LiabilityProgressChart (stacked bar showing paid vs remaining)

User prioritizes: net worth summary > asset allocation > liability progress

Focus: Charts I can understand in 2 seconds.

</notes>

---

*Phase: 32-recharts-dashboard-charts*
*Context gathered: 2026-01-16*
