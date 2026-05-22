# Phase 33: beneficiary-ux-cleanup - Context

**Gathered:** 2026-05-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Prune the Admin Beneficiaries page (`src/app/(admin)/beneficiaries/`) so it shows only:
- PageHeader + Add Beneficiary button
- KPI strip (5 items after this phase)
- BeneficiaryShareDonuts (allocation visualization — kept)
- BeneficiaryTable (kept; the existing column-click sorting becomes the sole sort affordance)
- BeneficiaryDialog + AddBeneficiaryDialog (kept)

Delete three components no longer needed and the tRPC mutation that backed one of them. Preserve the `beneficiary.sortIndex` column and the `orderBy(asc(sortIndex))` in `beneficiary.list` — other pages (portal, HEMS queue, distributions) rely on that ordering. The drag-to-reorder UI goes; the persistent sort order stays.

**ROADMAP success criteria locking the boundary (BENE-01..04):**
1. Beneficiaries page renders without an avatar-stack card.
2. Beneficiaries page renders without a "Display Order" drag-to-reorder section.
3. Beneficiaries page renders without a withdrawal-milestone gantt chart.
4. Beneficiary list ordering in the table and everywhere else (portal, HEMS queue, distributions) is identical to the pre-phase order — `sortIndex` + `ORDER BY` preserved.

</domain>

<decisions>
## Implementation Decisions

### Files to delete
- **D-01:** Delete `src/app/(admin)/beneficiaries/_components/BeneficiaryAvatarStack.tsx`. The avatar-stack card mandated for removal by BENE-01 has only one importer (`BeneficiariesClient.tsx`). After the edit it's dead code.
- **D-02:** Delete `src/app/(admin)/beneficiaries/_components/BeneficiarySortableList.tsx`. Removes the drag-to-reorder UI mandated for removal by BENE-02. Only importer is `BeneficiariesClient.tsx`. Also the sole consumer of `trpc.beneficiary.reorder.useMutation`.
- **D-03:** Delete `src/app/(admin)/beneficiaries/_components/WithdrawalMilestoneGantt.tsx`. Removes the withdrawal-milestone gantt mandated for removal by BENE-03. Only importer is `BeneficiariesClient.tsx`.

### Server-side cleanup
- **D-04:** Delete the `beneficiary.reorder` adminProcedure block in `src/server/trpc/routers/beneficiary.ts` (currently lines 113-167 — jsdoc + procedure + raw-SQL CASE/WHEN UPDATE loop inside `getClient().begin()`). Justification: after D-02 it has zero consumers; tRPC types stay clean; smaller attack surface. **Scope fence:** The `beneficiary.sortIndex` column, the composite `idx_beneficiary_entity_sort` index, the `asc(beneficiary.sortIndex)` clause in `beneficiary.list`, and any other writer of `sortIndex` (e.g., `beneficiary.create`, `beneficiary.update`) are **OUT OF SCOPE**. The column + ORDER BY are explicitly preserved per BENE-04.
- **D-05:** Delete `tests/trpc/beneficiary-reorder.test.ts` alongside the procedure. Mandatory follow-on — leaving it triggers `bun run typecheck` failure (calls into a router key that no longer exists). The reorder procedure performs no `activity_log` writes, so no audit-trail cleanup needed.

### BeneficiariesClient.tsx edits
- **D-06:** Remove imports for `BeneficiaryAvatarStack`, `BeneficiarySortableList`, `WithdrawalMilestoneGantt`. Remove the lucide `UserPlus` import only if unused after edits (it remains used by the Add Beneficiary button — keep).
- **D-07:** Remove the `entityDetail` query (`trpc.entity.byId.useQuery(entityId!, ...)`) and its surrounding jsdoc comment. After Gantt deletion the only consumer (`entityDetail?.dod ?? null` for gantt fallback) is gone. Confirmed by grep — no other reference.
- **D-08:** Remove the `avatarItems` and `milestoneItems` `useMemo` blocks. Keep `donutItems` (powers ShareDonuts), `totalDistributed`/`totalDistributedYtd`/`pendingHemsCount` (power the KPI strip), and `totalShares` (powers the KPI strip).
- **D-09:** Remove three JSX blocks: the avatar/sidekick grid (`<div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">` wrapping `BeneficiaryAvatarStack` and the inline `N beneficiaries · $X lifetime · $Y YTD` text), the "Display Order" Card wrapping `BeneficiarySortableList`, and the `<WithdrawalMilestoneGantt ...>` element.
- **D-10:** Rewrite the PageHeader description: `description="Trust beneficiaries with share allocations and distribution history."` Replaces the current `"Trust beneficiaries with share allocations and withdrawal milestones."` (the "withdrawal milestones" clause lies after Gantt removal).

### KPI strip change
- **D-11:** Add a 5th KPI: `{ label: 'Lifetime distributions', value: formatCurrency(totalDistributed) }`. Insert it between "Total share %" and "Distributions YTD" so the two distribution-time-window metrics group together. Final KPI order: Beneficiary count, Total share %, Lifetime distributions, Distributions YTD, Pending HEMS. The `totalDistributed` useMemo at lines 121-130 already computes the value — repurposes existing state, no new query.

### Testing
- **D-12:** No new tests. Static gates (`bun run typecheck` exit 0 + `bun run lint` exit 0) plus an admin UAT cover the deletion. Rationale: matches Phase 32 D-06 / Phase 19 precedent for pure UI prunes. The procedure deletion is type-system-enforced (any reintroduction of `utils.beneficiary.reorder` would fail typecheck immediately) — runtime regression test offers low marginal value.

### Execution order (Claude's discretion, locked here for the planner)
- **D-13:** Edit `BeneficiariesClient.tsx` first (remove all 3 imports + dangling derived vars + JSX). Then delete the 3 component files. Then delete the procedure + test. Then `bun run typecheck` + `bun run lint`. This sequence matches STATE.md's locked decision ("edit BeneficiariesClient.tsx first, then delete files, then typecheck + lint") and avoids transient broken-import states.

### Out of scope (boundary fence)
- **D-14:** The `beneficiary.sortIndex` column, the `idx_beneficiary_entity_sort` composite index, and the `asc(beneficiary.sortIndex)` ORDER BY in `beneficiary.list` are NOT touched. BENE-04 makes this a verified success criterion — list ordering everywhere else in the app (portal, HEMS queue, distributions, BeneficiaryTable's default order) must remain identical.
- **D-15:** No changes to `BeneficiaryShareDonuts.tsx`, `BeneficiaryTable.tsx`, `BeneficiaryDialog.tsx`, `BeneficiaryDialogContent.tsx`, `AddBeneficiaryDialog.tsx`, `BeneficiarySummaryCards.tsx`, or `types.ts`. The page composition shrinks; the surviving components are untouched.
- **D-16:** No changes to `/portal` or its `_components/`. Portal does not import any deletion target; this phase has zero cross-page blast radius.

### Claude's Discretion
- Final post-edit line count of `BeneficiariesClient.tsx` is not prescribed (will land in the 200-220 range after the prune). Whitespace/formatting normalize via biome.
- The exact wording of the admin UAT prompt for Task 4 (handed to the user for visual confirmation) is left to the planner.

### Folded Todos
None — no `.planning/TODOS.md` references map into this phase's scope.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 33 scope source
- `.planning/REQUIREMENTS.md` §"Beneficiaries View" — BENE-01..04 acceptance criteria
- `.planning/ROADMAP.md` §"Phase 33: beneficiary-ux-cleanup" — goal + 4 success criteria
- `.planning/STATE.md` §"Key Decisions" entries `[v5.0]` rows mentioning `BeneficiarySortableList.tsx`, `WithdrawalMilestoneGantt.tsx`, `BeneficiariesClient.tsx`, `beneficiary.sortIndex`

### Files this phase modifies (read in full before editing)
- `src/app/(admin)/beneficiaries/_components/BeneficiariesClient.tsx` — 300 lines; the single edit target
- `src/server/trpc/routers/beneficiary.ts` — lines 113-167 contain the `reorder` procedure to delete

### Files this phase deletes
- `src/app/(admin)/beneficiaries/_components/BeneficiaryAvatarStack.tsx`
- `src/app/(admin)/beneficiaries/_components/BeneficiarySortableList.tsx`
- `src/app/(admin)/beneficiaries/_components/WithdrawalMilestoneGantt.tsx`
- `tests/trpc/beneficiary-reorder.test.ts`

### Precedent (read for pattern context, not for re-implementation)
- `.planning/phases/32-sidebar-nav-alphabetization/32-01-PLAN.md` — most recent pure UI prune; D-06 no-test precedent
- `.planning/phases/32-sidebar-nav-alphabetization/32-01-SUMMARY.md` — pattern: surgical edits, atomic commits, admin UAT
- `.planning/phases/23/` (or wherever Phase 23-04 lives) — origin commit `5894e57 feat(23-04): migration 0012 + reorder mutations + sortable consumers` introduced the now-deleted machinery (no docs needed; commit + the about-to-be-deleted code is the trail)

### Repository constraints (always read first)
- `CLAUDE.md` — root project instructions; "lint warnings are never pre-existing"; `bun run db:deploy` not `db:push`; use `bun`, not npm/node
- `~/.claude/CLAUDE.md` — user prefs: terse-direct, code-only, perfect-by-all-measures UI standard

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `KpiStrip` + `KpiStripItem` (`@/components/kpi-strip`) — the existing strip already accepts an array of items; adding a 5th is a one-line change in the `kpiData` array. No prop changes needed.
- `formatCurrency` (`@/utils/formatters`) — wraps the new KPI's `totalDistributed` value, consistent with the existing 2 currency KPIs.
- `sumStrings` (`@/lib/money`) — already in use; powers the existing `totalDistributed` useMemo. No new aggregation needed.

### Established Patterns
- **Surgical edit + delete pattern** — same as Phase 32 / Phase 19. One file edited, supporting files deleted, no migration, no schema change.
- **Atomic commits per task** — `feat(33-01): <verb> ...` with `[hudsor01]` trailer. Each task commits independently so the diff stays reviewable.
- **No new tests for pure UI prunes** — D-06 precedent established Phase 32.
- **Don't touch sidebar** — the Beneficiaries entry in `AppSidebar` is unchanged; phase 32 wiring is preserved.

### Integration Points
- The `beneficiary.list` tRPC query (`src/server/trpc/routers/beneficiary.ts:23-30`) keeps its `ORDER BY beneficiary.sortIndex`. Consumers across `/portal`, HEMS queue, distributions, and the Admin Beneficiaries table continue to receive rows in the same order.
- The `beneficiary.listWithDistributions` query (consumed by BeneficiariesClient.tsx via `trpc.beneficiary.listWithDistributions.useQuery`) is also untouched — it already orders by sortIndex transitively.
- React Query cache: the `beneficiary.reorder` mutation's `onSuccess` invalidation key (`utils.beneficiary.list.invalidate()` and `utils.beneficiary.listWithDistributions.invalidate()`) only fires from the now-deleted SortableList. No other invalidation source affected.

</code_context>

<specifics>
## Specific Ideas

- KPI strip ordering rationale (D-11): the two distribution-time-window metrics ("Lifetime distributions" + "Distributions YTD") group adjacent so trustees can compare lifetime vs YTD totals at a glance.
- PageHeader copy (D-10): `"Trust beneficiaries with share allocations and distribution history."` mirrors the cadence of the prior "with X and Y" pattern; "distribution history" names what the table column "Distributions Lifetime" surfaces.
- Execution order (D-13) prevents the dangling-import window: deleting `BeneficiaryAvatarStack.tsx` first would crash `BeneficiariesClient.tsx`'s import resolution before the edit lands. Edit first → delete second.

</specifics>

<deferred>
## Deferred Ideas

- **`beneficiary.sortIndex` auto-management** — if the drag-reorder UI never returns, `sortIndex` could become server-auto-managed (insertion order or ROW_NUMBER on `(entityId, lastName, firstName)`). Out of scope for this phase per BENE-04. Track for a future cleanup if the column genuinely drifts from useful — not now.
- **`beneficiary.create` / `beneficiary.update` sortIndex hooks** — both writers currently accept `sortIndex` in their input schemas. Not touched by Phase 33 (D-14). A separate future phase could tighten the schemas if needed.
- **Smoke test for the cleanup** — explicitly rejected at D-12; future phases could add coverage if regressions appear in production.

### Reviewed Todos (not folded)
None — no todos in `.planning/TODOS.md` map into Phase 33's scope.

</deferred>

---

*Phase: 33-beneficiary-ux-cleanup*
*Context gathered: 2026-05-22*
