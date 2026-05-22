# Phase 31 — Discussion Log

**Conducted:** 2026-05-22
**Mode:** discuss (single gray area; rest of phase deterministic)
**Areas presented:** 1
**Areas discussed:** 1
**Decisions produced:** 9 LOCKED + 4 DEFERRED

---

## Phase 31 framing

**Domain stated:** "Wire `firearm` into the 3 hardcoded aggregator points so firearms appear in `/assets` unified view + dashboard KPIs + the pie chart. Three surgical edits, zero new files."

**Carried-forward decisions surfaced before any questions were asked:**
- Vehicle mapper pattern is the verbatim template for the firearm mapper in `asset.ts`
- Phase 30's `/firearms` page is the link target for `href`
- Phase 28 schema: firearm has `dodValue`, `transferStatus`, `status`, `entityId`, `updatedAt` — exactly the AssetRow shape
- The 3 touch points are confirmed by codebase scan

**Explicitly NOT discussed (no value):**
- Identifier names (firearm, firearms) and category label "Firearm"
- Mapper position in the routers
- Verification approach (admin UAT, mirroring Phase 19's artwork/insurance precedent)

---

## Area 1 — Pie chart fill color for Firearms

**Question presented:** Which fill color should Firearms use? — reuse `--chart-2` / introduce `--chart-6`.

**User selected:** Reuse `--chart-2` (Recommended).

**Decision:** D-04 LOCKED — Firearms uses `var(--chart-2)`. Continues the existing wrap pattern (Insurance already wraps to `--chart-1`). Zero new design tokens added; `.filter(item => item.value > 0)` removes empty slices so the visual distinction is acceptable in practice.

---

## Decisions captured (LOCKED — see CONTEXT.md)

| ID | Decision |
|---|---|
| D-01 | asset.ts changes: add `'firearm'` to AssetKind + add firearms to Promise.all + add firearm mapper loop |
| D-02 | dashboard.ts changes: add firearms to Promise.all + return object + schema import |
| D-03 | DashboardClient.tsx changes: destructure firearms + firearmTotal in useMemo + include in assetTotal + add allocationData entry + add to useMemo deps |
| D-04 | Firearms pie slice uses `var(--chart-2)` |
| D-05 | Category label is "Firearm" (singular) |
| D-06 | Mapper fields: value=dodValue, transferStatus=transferStatus (NOT nfaTransferStatus), href=/firearms |
| D-07 | NO NFA-specific dashboard surface in scope |
| D-08 | NO automated tests — admin UAT (matches Phase 19 precedent) |
| D-09 | NO tRPC router additions — Phase 29 already shipped 6 procedures |

---

## Deferred Ideas

- NFA-specific dashboard cards (future phase if workflow surfaces the need)
- Configurable allocation pie color tokens (only if palette grows past 8 slices)
- Automated tests for aggregator integration (holistic decision across all 8 asset types if test coverage becomes a milestone goal)
- Filter/sort enhancements on `/assets` for NFA-specific facets (Category facet auto-surfaces "Firearm" — fine for now)

---

## Scope Creep — Redirected

None — discussion stayed entirely within the 3 aggregator touch points.
