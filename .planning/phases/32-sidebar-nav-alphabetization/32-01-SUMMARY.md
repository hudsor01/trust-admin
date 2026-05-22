---
phase: 32-sidebar-nav-alphabetization
plan: 01
subsystem: ui
tags: [sidebar, nav, firearms, prefetch, react-query, ui]

requires:
  - phase: 29-firearm-trpc-router
    provides: utils.firearm.list tRPC client procedure (adminProcedure, entityId-scoped)
  - phase: 30-firearms-admin-page
    provides: /firearms admin route (Server Component + DataTable + KPI strip)
provides:
  - prefetch.firearms handler in AppSidebar (warms firearm.list + entity.list on hover)
  - Firearms SidebarMenuSubItem in the Assets nav group (3rd alphabetical slot)
  - 7-item alphabetical Assets sub-nav (was 6 items in declared insertion order)
affects: [33-beneficiary-ux-cleanup]

tech-stack:
  added: []
  patterns:
    - "Single-file surgical edit pattern — atomic plan, two commits, no new tests (D-06), Phase 19 precedent"

key-files:
  created: []
  modified:
    - src/components/app-sidebar.tsx

key-decisions:
  - "D-02 honored verbatim: prefetch.firearms calls utils.firearm.list.prefetch({ entityId }) + utils.entity.list.prefetch() — matches vehicles handler shape exactly"
  - "D-03 honored verbatim: 7-item alphabetical order is Accounts, Artwork, Firearms, Insurance, Personal Property, Properties, Vehicles — verified by Python positional-grep probe in Task 2 acceptance gate"
  - "D-04 honored: no lucide icons on any Assets sub-item (no item has had an icon since the group was created; Firearms ships without one to match)"
  - "D-06 honored: no dedicated tests for sidebar JSX changes — matches Phase 19 (artwork/personal-property/insurance) precedent; runtime gates were admin UAT only"
  - "D-07 honored: no other SidebarMenuSub blocks (Administration, Financial, Distributions, Liabilities, Activity Log, Settings) touched"

patterns-established:
  - "Sidebar prefetch handlers are cache-warming primitives (React Query staleTime=5min via src/lib/trpc-provider.tsx) — hover fires network only on cold cache; warm-cache hovers are intentionally silent. UAT methodology must hover on cold cache or verify by static wiring + dev log inspection."

requirements-completed: [ASSET-03, ASSET-04]

duration: ~7min
completed: 2026-05-22
---

# Phase 32: sidebar-nav-alphabetization Summary

**Firearms reachable from the Assets sidebar group; Assets sub-nav alphabetized to 7 items with hover-prefetch wired for the new slot.**

## Performance

- **Duration:** ~7 min executor work (Tasks 1+2), bracketed by UAT investigation
- **Started:** 2026-05-22 (executor dispatch)
- **Completed:** 2026-05-22T21:40:53Z
- **Tasks:** 3 (2 auto + 1 human-verify UAT)
- **Files modified:** 1 (`src/components/app-sidebar.tsx`)

## Accomplishments

- `prefetch.firearms` handler added alphabetically between `artwork` and `insurance` in the `prefetch` object (Task 1, commit `cdbd900`).
- Assets `SidebarMenuSub` block fully rewritten — 7 items in locked alphabetical order with Firearms wired to `/firearms`, hover prefetch active, no icons, no `prefetch={false}` (Task 2, commit `68439c3`).
- ASSET-03 + ASSET-04 closed.

## Task Commits

1. **Task 1: Add firearms prefetch handler** — `cdbd900` (feat)
2. **Task 2: Rewrite Assets SidebarMenuSub block — alphabetize + insert Firearms** — `68439c3` (feat)
3. **Task 3: Admin UAT — verify 3 ROADMAP success criteria** — passed by combined evidence (browser UAT + dev log + JSX inspection)

**Adjacent commit on phase branch:**
- `abcea86` (chore): suppress Sentry DEP0205 deprecation under Node 26 (`NODE_OPTIONS='--disable-warning=DEP0205'` on `dev`/`build`/`build:analyze`/`start`). Unrelated to phase scope but discovered during phase UAT — Sentry/node-core@10.53.1 has not migrated to `module.registerHooks()` yet; flag is laser-targeted and will be removable after upstream Sentry release.

## Files Created/Modified

- `src/components/app-sidebar.tsx` — added `firearms` prefetch handler (lines 111-114) and rewrote the Assets `SidebarMenuSub` block (lines ~383-505) to 7-item alphabetical order with the new Firearms `SidebarMenuSubItem`.

## Decisions Made

None beyond honoring D-02..D-08 from `32-CONTEXT.md` and `32-PATTERNS.md` verbatim. No new design questions surfaced during execution.

## Deviations from Plan

None — plan executed exactly as written. Both auto tasks committed atomically with all acceptance gates passing (typecheck exit 0, biome 481 files no fixes, all 7 grep checks + Python positional-order probe).

## SC Coverage

| SC | Requirement | Verification | Result |
|----|-------------|--------------|--------|
| SC-1 | ASSET-04 | Python positional-grep in Task 2 automated gate; browser UAT confirmed `["Accounts","Artwork","Firearms","Insurance","Personal Property","Properties","Vehicles"]` | ✅ PASS |
| SC-2 | ASSET-03 | Browser UAT: click Firearms → `location.pathname === '/firearms'`, firearms admin page rendered with DataTable + KPI strip | ✅ PASS |
| SC-3 | (phase-internal) | (a) JSX: `onMouseEnter={prefetch.firearms}` wired at `src/components/app-sidebar.tsx:427-429`; (b) prefetch handler body matches D-02 at lines 111-114; (c) dev log shows `GET /api/trpc/firearm.list?batch=1&input={"0":{"entityId":1}} 200 in 109ms` fired on the first (cold-cache) hover during UAT | ✅ PASS |

## Issues Encountered

**SC-3 initial UAT methodology gap — investigated, resolved as PASS.**

The Chrome browser UAT agent reported SC-3 as DEVIATION because hovering Firearms (and Accounts/Artwork/Insurance/Personal Property) emitted zero tRPC requests. Investigation revealed the agent's hover test ran on a warm cache: each item had already been hovered during the agent's initial sidebar exploration sweep (visible in the dev log), and React Query's `staleTime: 1000 * 60 * 5` (`src/lib/trpc-provider.tsx:33`) correctly suppressed re-fetches within that 5-minute window. `prefetch()` is a cache-warming primitive, not a request emitter — warm-cache silence is correct behavior.

Three layers of converging evidence proved the wiring works:
1. **Static** — JSX wires `onMouseEnter={prefetch.firearms}` on the Firearms `<Link>`; handler body matches D-02 exactly.
2. **Dashboard scope** — `src/app/(admin)/dashboard/page.tsx` server-prefetches only `dashboard.summary`, `dashboard.summaryTotals`, `entity.list` via HydrationBoundary; the admin layout adds no queries; `CommandPalette` adds only `entity.list`. Every other `/api/trpc/*.list` request in the dev log therefore came from a sidebar hover.
3. **Runtime** — dev log shows `GET /api/trpc/firearm.list ... 200 in 109ms` fired on the first cold-cache hover, plus equivalent first-hover fires for `insurancePolicy.list`, both `personalProperty.list` variants, `beneficiary.listWithDistributions`, `trustee.list`, and (later) `homestead.list,rentalProperty.list` and `vehicle.list`.

**Spec doc nit (no code change):** SC-3 in the plan/CONTEXT mentioned "POST" tRPC requests. tRPC v11 with `httpBatchLink` emits **GET** for queries (POST is reserved for mutations). All observed prefetches are GETs as expected. Future UAT specs for hover prefetches should say "GET" and account for `staleTime` cache-aware behavior in their methodology.

## User Setup Required

None — no environment variables, no external service configuration, no migrations.

## Next Phase Readiness

Phase 33 (`beneficiary-ux-cleanup`) is unblocked. Per ROADMAP and STATE, Phase 33 is fully independent of the firearms phases — no shared files, no schema changes. The deletion targets are `BeneficiarySortableList.tsx` and `WithdrawalMilestoneGantt.tsx`; the edit target is `BeneficiariesClient.tsx`. `beneficiary.sortIndex` and `orderBy(asc(beneficiary.sortIndex))` in `beneficiary.list` must NOT be touched.

---
*Phase: 32-sidebar-nav-alphabetization*
*Completed: 2026-05-22*
