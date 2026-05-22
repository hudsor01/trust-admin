# Phase 33: beneficiary-ux-cleanup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-22
**Phase:** 33-beneficiary-ux-cleanup
**Areas discussed:** Fate of beneficiary.reorder mutation, Sibling text + lifetime distributions visibility, PageHeader description rewrite, Regression test for the cleanup

---

## Area 1: Fate of beneficiary.reorder mutation

| Option | Description | Selected |
|--------|-------------|----------|
| Delete it (Recommended) | Remove the procedure from beneficiary.ts (and its CASE/WHEN raw SQL block, ~30 lines). Zero consumers post-Phase-33, smaller attack surface, dead-code removal matches the cleanup theme. sortIndex column + ORDER BY untouched. | ✓ |
| Keep it defensively | Leave the procedure intact. No harm sitting there; future drag-reorder return is friction-free. ~30 lines of dead code lingers in bundle/router types. | |
| Delete + remove sortIndex from beneficiary.create/update too | Aggressive cleanup — strictly out of scope per STATE. Flagged as a "no thank you" to capture the boundary. | |

**User's choice:** Delete it.
**Notes:** Corollary decision recorded automatically — `tests/trpc/beneficiary-reorder.test.ts` is deleted alongside the procedure (mechanical follow-on; leaving it would break typecheck). Procedure performs no `activity_log` writes, so no audit-trail cleanup needed.

---

## Area 2: Sibling text + lifetime distributions visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Add as 5th KPI 'Lifetime distributions' (Recommended) | Promote it to the KPI strip alongside the existing 4 items. Legitimate top-line metric trustees need; KPI strip is the right home; `totalDistributed` useMemo already computes it. | ✓ |
| Drop it entirely | Kill the sibling text with the avatar card; lose the lifetime number from the dashboard. Trustees can still see per-beneficiary lifetime in the table. | |
| Keep as inline banner above table | Move "N beneficiaries · $X lifetime · $Y YTD" to a thin text row just above BeneficiaryTable. Ad-hoc pattern outside the established KPI strip convention. | |

**User's choice:** Add as 5th KPI.
**Notes:** Claude's-discretion follow-on — insert "Lifetime distributions" between "Total share %" and "Distributions YTD" so the two distribution-time-window metrics group adjacent. Final order: Beneficiary count → Total share % → Lifetime distributions → Distributions YTD → Pending HEMS.

---

## Area 3: PageHeader description rewrite

| Option | Description | Selected |
|--------|-------------|----------|
| "Trust beneficiaries with share allocations and distribution history." (Recommended) | Mirrors the surviving sections: ShareDonuts (allocations) + Table (distribution history via per-row columns). Same cadence as the current copy. | ✓ |
| "Trust beneficiaries with share allocations." | Terser. Strips the distribution-history mention. Undersells what the table shows. | |
| "Manage trust beneficiaries — share allocations, lifetime distributions, and pending HEMS at a glance." | Richer one-liner naming the headline KPIs. Longer than established cadence; risks lying if KPIs change later. | |

**User's choice:** "Trust beneficiaries with share allocations and distribution history."
**Notes:** Replaces the current "Trust beneficiaries with share allocations and withdrawal milestones." — the "withdrawal milestones" clause becomes a lie after the Gantt removal.

---

## Area 4: Regression test for the cleanup

| Option | Description | Selected |
|--------|-------------|----------|
| No new tests (Recommended) | Match Phase 32 D-06 / Phase 19 precedent. Static gates (typecheck + lint) plus admin UAT cover the deletion. The procedure deletion is type-system-enforced — any reintroduction of utils.beneficiary.reorder would fail typecheck immediately. Runtime regression test offers low marginal value. | ✓ |
| Add a Beneficiaries page smoke test | tests/components/beneficiaries-client.test.tsx — render with mocked trpc, assert deletion-target strings are NOT in the DOM. ~80 lines of test scaffolding. Diminishing return after typecheck/lint guard the imports. | |
| Skip render test, add procedure-removal test | tests/trpc/beneficiary-router.test.ts — assert `beneficiary.reorder` is undefined on appRouter. ~5 lines. Typecheck already catches reintroduction. | |

**User's choice:** No new tests.

---

## Claude's Discretion

- Final post-edit line count of `BeneficiariesClient.tsx` (target: 200-220 lines after the prune).
- Exact wording of the admin UAT prompt in the eventual Task 4 checkpoint.
- KPI strip ordering within the distribution-metrics group ("Lifetime" then "YTD" recommended).
- Whether to drop the `entityDetail` query line + its jsdoc block in one Edit or two (mechanical — planner will decide based on Edit anchor stability).

## Deferred Ideas

- **`beneficiary.sortIndex` auto-management** — if the drag-reorder UI never returns, the column could become server-auto-managed. Strictly out of scope per BENE-04. Track for future cleanup.
- **`beneficiary.create` / `beneficiary.update` sortIndex hooks** — both writers currently accept `sortIndex` in their input schemas. Not touched by this phase (D-14). Separate future phase could tighten the schemas.
- **Smoke test for the cleanup** — explicitly rejected at D-12; future phases could add coverage if production regressions appear.
