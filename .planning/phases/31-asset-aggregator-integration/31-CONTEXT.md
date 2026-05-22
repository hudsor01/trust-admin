# Phase 31: asset-aggregator-integration — Context

**Gathered:** 2026-05-22
**Status:** Ready for planning
**Source:** Discuss-phase (1 gray area resolved + binding milestone decisions carried forward)

<domain>
## Phase Boundary

Wire `firearm` into the 3 hardcoded aggregator touch points so firearm rows appear in the `/assets` unified view alongside the other 7 asset types AND firearm values contribute to dashboard KPIs (Total Assets + allocation pie chart). This is purely backend + light client wiring — zero new files, zero new components, zero new tRPC procedures. Out of scope: sidebar nav (Phase 32), beneficiary cleanup (Phase 33).

Covers REQ-IDs **ASSET-01** (firearm values in dashboard KPIs + allocation chart) and **ASSET-02** (firearms in unified `/assets` view).

This is the documented "looks done but isn't" trap from the milestone research SUMMARY.md — the `/firearms` page (Phase 30) is fully functional, but until this phase ships, firearms silently vanish from cross-asset surfaces because both aggregator fan-outs are hardcoded 7-table arrays with no auto-discovery.
</domain>

<decisions>
## Implementation Decisions

### File-level edits — exactly 3 files, all surgical

- **D-01** [LOCKED]: `src/server/trpc/routers/asset.ts` — Three changes:
  1. Add `'firearm'` to the `AssetKind` union (lines 22-29), alphabetically positioned (between `bankAccount` and `homestead` per the existing alphabetical order ... actually following the existing order which appears scope-grouped: keep firearm next to vehicle? Final placement: alphabetical by kind name — between `bankAccount` and `homestead`). Note: existing order in the union is NOT pure alphabetical (`vehicle | homestead | rentalProperty | bankAccount | investmentAccount | personalProperty | insurancePolicy`). The executor should add `'firearm'` at the end of the union for the lowest-disruption diff; the union order has no semantic meaning at the TypeScript layer.
  2. Add `firearms` to the `Promise.all` destructure block (lines 86-94) + add `db.select().from(firearm).where(eq(firearm.entityId, entityId))` to the array (line 95-119).
  3. Add a firearm mapper loop after the insurance loop (~line 222), pushing `{ id, kind: 'firearm', name, description, category: 'Firearm', value: dodValue, status, href: '/firearms', transferStatus, updatedAt }`.

- **D-02** [LOCKED]: `src/server/trpc/routers/dashboard.ts` — Two changes:
  1. Add `firearms` to the `Promise.all` destructure block (lines 63-78) + add `db.select().from(firearm).where(eq(firearm.entityId, entityId))` to the array. Alphabetical-ish placement; after `vehicles` is fine (mirrors how dashboard already groups them loosely).
  2. Add `firearms` to the return object (~line 147).
  3. Add `firearm` to the schema imports.

- **D-03** [LOCKED]: `src/app/(admin)/dashboard/_components/DashboardClient.tsx` — Four changes inside the existing `useMemo` block (lines 198-264):
  1. Destructure `firearms` from `summary` (or from the summary's destructured shape).
  2. Add `firearmTotal = sumStrings(firearms.map((f) => f.dodValue ?? '0'))` before `assetTotal`.
  3. Include `firearmTotal` in the `sumStrings([...])` array that computes `assetTotal` (line 223-230).
  4. Add `{ name: 'Firearms', value: toCents(firearmTotal) / 100, fill: 'var(--chart-2)' }` to `allocationData`, placed after `Insurance` (last entry).
  5. Add `firearms` to the `useMemo` dependency array (line 271+).

### Pie chart fill color

- **D-04** [LOCKED]: Firearms uses `var(--chart-2)` in the allocation pie chart. The existing 6 slices already cycle through `--chart-1..5` and wrap back to `--chart-1` for Insurance; adding firearms as `--chart-2` continues the wrap pattern at zero design-token cost. The `.filter(item => item.value > 0)` clause already removes empty slices, so when only 2-3 firearm + investment slices are simultaneously present, the visual distinction is acceptable.

### Category label

- **D-05** [LOCKED]: `category: 'Firearm'` in the AssetRow envelope (singular, matches the firearm-type label format). The unified `/assets` view's Category filter facet will surface "Firearm" as a new option automatically.

### Mapper field choices

- **D-06** [LOCKED]: For each firearm row pushed to `AssetRow`:
  - `value`: `f.dodValue` (matches vehicle, homestead, rentalProperty, personalProperty — DOD value is the canonical estate-value surface for transferable assets)
  - `transferStatus`: `f.transferStatus` (the generic enum — NOT `nfaTransferStatus`, which is the ATF Form 5 lifecycle, distinct from the physical transfer to a beneficiary)
  - `status`: `f.status`
  - `href`: `'/firearms'` (Phase 30's admin page)
  - `category`: `'Firearm'` (per D-05)

### Out of scope (deliberate)

- **D-07** [LOCKED]: Do NOT add any dashboard cards that distinguish NFA vs Title I firearms. The aggregator surface treats all firearms as a single "Firearm" category. NFA-specific metrics (e.g. "NFA items awaiting Form 5") are a Phase 32+ enhancement if ever needed.

- **D-08** [LOCKED]: Do NOT add automated tests for this phase. The wirings are mechanical; the 4 ROADMAP success criteria are admin-driven UAT (add firearm → KPI increases / pie has Firearms slice / `/assets` lists firearm rows / removing all firearms shrinks back). This mirrors how Phase 19 added artwork/insurance to `dashboard.ts` without adding aggregator tests.

- **D-09** [LOCKED]: No tRPC router additions. Phase 29 already shipped the 6 firearm procedures; this phase only consumes them through the existing list query.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Codebase analogs (HIGHEST priority — direct templates)
- `src/server/trpc/routers/asset.ts` (lines 22-29 AssetKind, 78-120 Promise.all, 127-219 mapper loops) — the file being modified; the vehicle/homestead/etc mappers are the verbatim templates for the firearm mapper
- `src/server/trpc/routers/dashboard.ts` (lines 55-150) — the file being modified
- `src/app/(admin)/dashboard/_components/DashboardClient.tsx` (lines 198-275) — the file being modified; the existing 6 totals + 6 allocationData entries are the template
- `src/lib/money.ts` — `sumStrings`, `toCents` (used in DashboardClient's useMemo)

### Schema + types (consumed)
- `db/schema.ts` — `firearm` pgTable (already shipped Phase 28)
- `src/server/trpc/router.ts` — `firearm: firearmRouter` already registered (Phase 29)

### Phase artifacts
- `.planning/phases/30-firearms-admin-page/30-01-SUMMARY.md` — confirms `/firearms` page is the link target
- `.planning/REQUIREMENTS.md` — ASSET-01, ASSET-02
- `.planning/ROADMAP.md` — Phase 31 + 4 success criteria
- `.planning/research/SUMMARY.md` — Critical Pitfall #1 (the hardcoded 7-table fan-outs); this phase IS the fix
- `.planning/research/PITFALLS.md` §7 — "Forgetting to wire the Firearm table into asset.ts listAll and dashboard.ts summary"
- `.planning/STATE.md` — `[v5.0]` decisions, especially "asset.ts:listAll and dashboard.ts:summary are hardcoded 7-table fan-outs"

### Documentation
- `CLAUDE.md` — tRPC patterns; Entity ID Validation Pattern (non-applicable here since both aggregators already enforce entityId)
</canonical_refs>

<specifics>
## Specific Ideas

### Exact firearm mapper code shape (for `asset.ts`)

```typescript
for (const f of firearms) {
    rows.push({
        id: f.id,
        kind: 'firearm',
        name: f.name,
        description: f.description,
        category: 'Firearm',
        value: f.dodValue,
        status: f.status,
        href: '/firearms',
        transferStatus: f.transferStatus,
        updatedAt: f.updatedAt,
    })
}
```

(Identical shape to the `for (const v of vehicles)` block. Sketch — planner/executor will refine.)

### Exact DashboardClient additions

In the `useMemo` block:

```typescript
const firearmTotal = sumStrings(firearms.map((f) => f.dodValue ?? '0'))
// ...
const assetTotal = sumStrings([
    bankTotal,
    investTotal,
    realEstateTotal,
    vehicleTotal,
    personalPropertyTotal,
    insuranceTotal,
    firearmTotal,  // NEW
])
// ...
const allocationData = [
    // ... existing 6 entries ...
    {
        name: 'Firearms',
        value: toCents(firearmTotal) / 100,
        fill: 'var(--chart-2)',
    },
].filter((item) => item.value > 0)
```

Plus `firearms` added to the destructure of `summary` AND the useMemo dependency array.

### Verification (4 ROADMAP SCs map to single UAT flow)

1. Open `/firearms` admin page, add a firearm with `dodValue = "1000.00"`.
2. Navigate to dashboard → "Total Assets" KPI shows +$1,000 vs prior; allocation pie shows a "Firearms" slice.
3. Navigate to `/assets` → firearm row appears with category "Firearm" and clicking links to `/firearms`.
4. Delete the firearm from `/firearms` page → dashboard "Total Assets" shrinks back; "Firearms" slice disappears from the pie.

All 4 SCs verified in <2 minutes of admin clicking. No automated test deliverable.
</specifics>

<deferred>
## Deferred Ideas

- **NFA-specific dashboard surface** (e.g. "NFA items awaiting ATF Form 5" card on dashboard) — not in scope; would require additional aggregator query + UI. If a future trustee workflow surfaces this need, build as a follow-up phase.
- **Configurable allocation pie color tokens** — the `--chart-1..5` cycle is fine; if the chart palette grows past 8 slices in the future, introduce `--chart-6..N`.
- **Automated tests for the aggregator integration** — sibling additions (artwork, insurance) shipped without tests; admin UAT is the established pattern. If integration test coverage becomes a milestone goal, address holistically across all 8 asset types.
- **Filter/sort enhancements on `/assets` for firearm-specific facets (NFA / non-NFA)** — leave the existing Category facet to surface "Firearm" as a value; granular NFA filtering can ship as a Phase 30 follow-up if desired.
</deferred>

---

*Phase: 31-asset-aggregator-integration*
*Context gathered: 2026-05-22*
*Decisions: 9 locked, 4 deferred*
