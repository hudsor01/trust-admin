---
phase: 33-beneficiary-ux-cleanup
plan: 01
subsystem: ui
tags: [ui, prune, beneficiaries, kpi-strip, trpc-cleanup, milestone-closeout]

requires:
  - phase: 23-shadcn-registry-adoption-and-dashboard-ux-revamp
    provides: KpiStrip component, beneficiary.reorder mutation, BeneficiarySortableList, BeneficiaryShareDonuts, BeneficiaryAvatarStack, WithdrawalMilestoneGantt — Phase 33 prunes the subset built in Phase 23-03/23-04 that is no longer used.
provides:
  - Pruned Admin Beneficiaries page (PageHeader → KPI strip 5 tiles → ShareDonuts → Table → dialogs)
  - 5th KPI "Lifetime distributions" between "Total share %" and "Distributions YTD"
  - KpiStrip component supports 5-tile callers without skeleton/loaded layout jump (derive-from-data pattern)
affects: []

tech-stack:
  added: []
  patterns:
    - "Skeleton-derives-from-data: KpiStrip skeleton + loaded branches share a single conditional grid-class expression and tile count from `data.length` — eliminates the layout jump that would otherwise appear when a strip's tile count exceeds the hardcoded default."
    - "FLAG-to-CONTEXT promotion: when a UI-SPEC FLAG must be enforced as scope (not merely advised), promote it to a CONTEXT.md `[MANDATORY TASK]` decision with verbatim diff shape before dispatching the planner. The planner reads CONTEXT first and treats it as source of truth; UI-SPEC FLAGs are advisory only by GSD convention."

key-files:
  modified:
    - src/components/kpi-strip.tsx
    - src/app/(admin)/beneficiaries/_components/BeneficiariesClient.tsx
    - src/server/trpc/routers/beneficiary.ts
    - tests/components/kpi-strip.test.tsx
  deleted:
    - src/app/(admin)/beneficiaries/_components/BeneficiaryAvatarStack.tsx
    - src/app/(admin)/beneficiaries/_components/BeneficiarySortableList.tsx
    - src/app/(admin)/beneficiaries/_components/WithdrawalMilestoneGantt.tsx
    - tests/trpc/beneficiary-reorder.test.ts

key-decisions:
  - "D-17 (kpi-strip skeleton fix) was a UI-SPEC FLAG that we promoted into a CONTEXT mandatory task before planning so the planner couldn't drop it as out-of-scope cosmetic. The promotion happened after both the UI-researcher and UI-checker independently surfaced the issue; locking it into CONTEXT made it non-negotiable for the plan."
  - "Execution order D-13 was inviolable: kpi-strip fix MUST land before the BeneficiariesClient 5th-KPI insertion, otherwise the first dev-mode reload of /beneficiaries flashes a 4-tile skeleton → 5-tile loaded state."
  - "D-04 deletion of `beneficiary.reorder` mutation came with surface-area pruning: `getClient` and `TxSql` imports in `beneficiary.ts` were the only consumers, so they get removed too. Acceptance criterion confirmed via grep that the file's import block reduced."
  - "D-12 no-new-tests precedent (Phase 32 D-06, Phase 19) carried forward — typecheck + lint + admin UAT cover the deletion; smoke tests for component-absence offer low marginal value over typecheck enforcement of the dangling-import contract."
  - "D-14 scope fence kept the sortIndex column + `orderBy(asc(sortIndex))` ORDER BY untouched in `beneficiary.list`. Verified at /settings during UAT: beneficiary order matches /beneficiaries table = `[Richard Hudson Jr., Domineek Govea, Rick Brown]`. BENE-04 sealed."

patterns-established:
  - "When a UI-SPEC FLAG matters for scope: promote it to a CONTEXT mandatory task with verbatim diff shape before planning. Don't trust the planner to pick it up advisory."
  - "KpiStrip derive-from-data pattern: `cn('grid grid-cols-1 md:grid-cols-2 gap-4', data.length === N ? 'lg:grid-cols-N' : 'lg:grid-cols-4')` on BOTH skeleton and loaded branches eliminates first-render layout jump. Reusable for future 5+ tile strips (extend the conditional or generalize the function)."
  - "Surgical-delete workflow: edit consumer first (remove imports + JSX), then `git rm` the orphaned components, then prune downstream server-side surface. Avoids transient broken-import windows."

requirements-completed: [BENE-01, BENE-02, BENE-03, BENE-04]

duration: ~10min
completed: 2026-05-22
---

# Phase 33: beneficiary-ux-cleanup Summary

**Beneficiaries page pruned to 5 sections (Header → KPI 5-tile → Donuts → Table → Dialogs); `beneficiary.reorder` mutation + 3 component files deleted; KpiStrip skeleton fixed to derive grid class from `data.length`.**

## Performance

- **Duration:** ~10 min executor work (Tasks 1-4)
- **Started:** 2026-05-22 (executor dispatch)
- **Completed:** 2026-05-22
- **Tasks:** 5 (4 auto + 1 human-verify UAT)
- **Files modified:** 4 edits + 4 deletes = 8 total

## Accomplishments

- **D-17 KpiStrip skeleton fix (Task 1, `3f975c7`)** — added `cn` import; both skeleton and loaded branches now use `cn('grid grid-cols-1 md:grid-cols-2 gap-4', data.length === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4')` with tile count from `data.length`. No layout jump on first render of any strip.
- **BeneficiariesClient prune (Task 2, `e304d7c`)** — removed 3 imports, `entityDetail` query, `avatarItems` + `milestoneItems` useMemo blocks, 3 JSX blocks (avatar grid, "Display Order" Card, Gantt). Rewrote PageHeader description per D-10. Added 5th KPI "Lifetime distributions" at position 3 per D-11. Net delta: 300 → ~210 lines.
- **Component deletes (Task 3, `48aebda`)** — `git rm` of `BeneficiaryAvatarStack.tsx`, `BeneficiarySortableList.tsx`, `WithdrawalMilestoneGantt.tsx`. All three had a single importer (BeneficiariesClient.tsx), zero downstream consumers.
- **tRPC + test cleanup (Task 4, `80208fe`)** — deleted `beneficiary.reorder` adminProcedure (jsdoc + procedure body, ~50 lines) from `src/server/trpc/routers/beneficiary.ts`. Pruned orphaned `getClient`/`TxSql` imports. Deleted `tests/trpc/beneficiary-reorder.test.ts`.
- **All 4 BENE requirements sealed** — BENE-01 (avatar gone), BENE-02 (Display Order gone), BENE-03 (Gantt gone), BENE-04 (sort order preserved via untouched `sortIndex` column + ORDER BY).

## Task Commits

1. **Task 1: KpiStrip skeleton derive-from-data (D-17)** — `3f975c7` (feat)
2. **Task 2: BeneficiariesClient prune + 5th KPI (D-06..D-11)** — `e304d7c` (refactor)
3. **Task 3: Delete 3 orphaned components (D-01..D-03)** — `48aebda` (refactor)
4. **Task 4: Delete beneficiary.reorder + test + orphan imports (D-04, D-05)** — `80208fe` (refactor)
5. **Task 5: Admin UAT — verified BENE-01..04 + cross-page KpiStrip non-regression** — passed by browser UAT (17 pages swept; only /beneficiaries uses `lg:grid-cols-5`, all others stay on `lg:grid-cols-4`)

**Adjacent docs commits on this branch:**
- `220d623` (docs): create phase 33 plan
- `f92127d` (docs): sync stale KpiStripItem interface snippet in PLAN.md
- `dcae089` (docs): lock UI-SPEC FLAG into CONTEXT as D-17
- `bd20454` (docs): UI design contract for beneficiary-ux-cleanup
- `640b77e` (docs): capture phase context (zero gray areas remaining)

## Files Created/Modified

**Modified:**
- `src/components/kpi-strip.tsx` — added `cn` import + conditional `lg:grid-cols-N` class on both skeleton and loaded branches + tile count from `data.length`.
- `src/app/(admin)/beneficiaries/_components/BeneficiariesClient.tsx` — 300 → ~210 lines. Removed 3 imports, 1 query, 2 useMemos, 3 JSX blocks. Added 5th KPI. Rewrote PageHeader description.
- `src/server/trpc/routers/beneficiary.ts` — deleted `reorder` adminProcedure (~50 lines) + orphan `getClient`/`TxSql` imports.
- `tests/components/kpi-strip.test.tsx` — updated to pass 4 items instead of an empty array (degenerate after D-17; D-17 makes empty-array skeleton render 0 tiles).

**Deleted:**
- `src/app/(admin)/beneficiaries/_components/BeneficiaryAvatarStack.tsx`
- `src/app/(admin)/beneficiaries/_components/BeneficiarySortableList.tsx`
- `src/app/(admin)/beneficiaries/_components/WithdrawalMilestoneGantt.tsx`
- `tests/trpc/beneficiary-reorder.test.ts`

## Decisions Made

None beyond honoring D-01..D-17 from CONTEXT.md verbatim. No new design questions surfaced during execution. The single executor-discovered nuance (test file at `tests/components/kpi-strip.test.tsx` passing `data={[]}` becomes a degenerate test under D-17) was handled by updating the test to use realistic data, and Task 1's acceptance criteria still pass.

## Deviations from Plan

Only minor — Task 1 included an update to `tests/components/kpi-strip.test.tsx` that wasn't named in the original `files_modified` frontmatter. Reason: the existing test called `<KpiStrip data={[]} isLoading />` which after D-17 renders 0 skeleton tiles (`Array.from({ length: 0 })`), making the test's "skeleton renders" assertion meaningless. The fix updates the test to pass 4 items (real-world caller behavior) and confirms the skeleton renders correctly with `lg:grid-cols-4`. No acceptance criterion violated; the change is corrective, not scope creep.

## SC Coverage

| SC | Requirement | Verification | Result |
|----|-------------|--------------|--------|
| SC-1 | BENE-01 (no avatar-stack) | UAT A.5: `document.querySelector('[class*="avatar-stack"]')` returns null; `document.body.innerHTML.match(/avatar-stack/i)` returns 0 matches | ✅ PASS |
| SC-2 | BENE-02 (no Display Order) | UAT A.5: no heading matching `/display order/i`; 0 grip icons in DOM; "Display Order" not in `document.body.innerText` | ✅ PASS |
| SC-3 | BENE-03 (no Gantt) | UAT A.5: 0 matches for `/withdrawal milestone|gantt/i` in body text | ✅ PASS |
| SC-4 | BENE-04 (ordering preserved) | UAT B.3: /settings shows `[Richard Hudson Jr., Domineek Govea, Rick Brown]` — exactly the order seen in /beneficiaries table (ADMIN_ORDER). `beneficiary.list` ORDER BY untouched. | ✅ PASS |
| Bonus | KPI strip 5 tiles in locked order | UAT A.2: `[Beneficiary count, Total share %, Lifetime distributions, Distributions YTD, Pending HEMS]` with "Lifetime distributions" = `$0.00` (currency string) | ✅ PASS |
| Bonus | PageHeader copy (D-10) | UAT A.1: exact string `"Trust beneficiaries with share allocations and distribution history."` | ✅ PASS |
| Bonus | D-17 cross-page non-regression | UAT C: 15 KpiStrip-consuming pages swept — all use `lg:grid-cols-4`, none introduced `lg:grid-cols-5`. Only `/beneficiaries` uses `lg:grid-cols-5` (intended). Tile counts unchanged on every other page. | ✅ PASS |
| Bonus | D-17 skeleton/loaded layout match | Source-verified at `src/components/kpi-strip.tsx`: skeleton + loaded share the same `cn(...)` conditional expression; layout jump is structurally impossible. | ✅ PASS |

## Issues Encountered

**Sole non-blocker:** the existing `tests/components/kpi-strip.test.tsx` called `<KpiStrip data={[]} isLoading />` to test the skeleton state. Under D-17 the skeleton renders `Array.from({ length: data.length })` tiles, so an empty-array call now renders 0 skeletons — the test would assert "no skeletons render" instead of "skeletons render correctly," which inverts the intent. Updated the test to pass 4 items (matching real-world caller behavior) so the skeleton path is exercised meaningfully. The test still passes all assertions about loading-state structure.

## User Setup Required

None — no environment variables, no external service configuration, no migrations.

## Next Phase Readiness

**v5.0 milestone is fully complete.** Phase 28-33 all shipped:
- Phase 28: firearm-schema-and-migration (2026-05-21)
- Phase 29: firearm-trpc-router (2026-05-21)
- Phase 30: firearms-admin-page (2026-05-22)
- Phase 31: asset-aggregator-integration (2026-05-22)
- Phase 32: sidebar-nav-alphabetization (2026-05-22)
- Phase 33: beneficiary-ux-cleanup (2026-05-22)

ROADMAP "Phase 33" row + progress table updated. REQUIREMENTS BENE-01..04 marked complete. STATE.md progress 5/6 → 6/6 (100%). Ready for milestone-complete workflow: `/gsd:complete-milestone v5.0` (or whichever closing flow the project uses).

---
*Phase: 33-beneficiary-ux-cleanup*
*Completed: 2026-05-22*
