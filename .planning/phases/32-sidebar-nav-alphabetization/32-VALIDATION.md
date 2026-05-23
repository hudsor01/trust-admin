---
phase: 32
slug: sidebar-nav-alphabetization
status: retroactive
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-23
---

# Phase 32 — Validation Strategy

> Retrospectively generated 2026-05-23 from 32-01-PLAN.md, 32-01-SUMMARY.md, 32-VERIFICATION.md,
> and 32-CONTEXT.md artifacts. Phase shipped, merged to main, and verified (status: passed, 3/3
> must-haves) on 2026-05-22.
>
> Phase 32 is a pure UI prune of `src/components/app-sidebar.tsx` — two surgical edits with no
> new tests added per D-06 (Phase 19 precedent). UAT-only verification is acceptable for this
> change class. This document records the verification strategy as executed.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bun test (built-in) |
| **Config file** | none — `bun test` script in `package.json` targets explicit dirs |
| **Quick run command** | `bun run typecheck` |
| **Full suite command** | `bun test tests/api tests/components tests/lib tests/trpc tests/*.test.ts` |
| **Lint command** | `bun run lint` |
| **Estimated runtime** | typecheck ~10s; lint ~5s (481 files) |

---

## Sampling Rate

- **After every task commit:** Run `bun run typecheck` — JSX changes and new tRPC utils references must compile clean
- **After Task 2:** Run `bun run lint` — biome must report 0 fixes; lint warnings are never pre-existing per global memory
- **Before verification:** All static acceptance probes (grep + Python ordering) pass; then admin UAT
- **Max feedback latency:** ~15 seconds (typecheck + lint combined)

---

## Per-Task Verification Map

| Task scope | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|------------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| Add `firearms` prefetch handler to `prefetch` object | 32-01 | 1 | (ASSET-03, SC-3) | T-32-PRE | `utils.firearm.list` is already `adminProcedure` + entityId-gated (Phase 29) — no new attack surface | grep + typecheck | `bun run typecheck && grep -q "firearms: () =>" src/components/app-sidebar.tsx && grep -q "utils.firearm.list.prefetch" src/components/app-sidebar.tsx` | ✅ existing | ✅ green |
| Rewrite Assets `SidebarMenuSub` block — alphabetize + insert Firearms | 32-01 | 1 | ASSET-03, ASSET-04 | T-32-LNK, T-32-ORD | `href="/firearms"` is a static literal — no user input; T-32-ORD ordering confirmed by Python positional probe | grep + python + typecheck + lint | `bun run typecheck && bun run lint && grep -q 'href="/firearms"' src/components/app-sidebar.tsx && python3 -c "..."` (full probe in 32-01-PLAN.md Task 2 `<automated>`) | ✅ existing | ✅ green |
| Admin UAT — verify 3 ROADMAP success criteria (SC-1, SC-2, SC-3) | 32-01 | 1 | ASSET-03, ASSET-04 | T-32-LNK, T-32-PRE, T-32-ORD | Visual DOM order, click navigation to /firearms, cold-cache DevTools GET requests | UAT (human/browser) | Chrome browser agent + dev log inspection | N/A | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

### Task 1 Static Acceptance Checks (all PASS at commit `cdbd900`)

| Check | Command | Result |
|-------|---------|--------|
| Handler key present (count = 1) | `grep -c "firearms: () =>" src/components/app-sidebar.tsx` | 1 |
| `firearm.list.prefetch` call present | `grep -c "utils.firearm.list.prefetch"` | 1 |
| `entity.list.prefetch` call present | `grep -c "utils.entity.list.prefetch"` | 1 |
| All 7 handler keys present | regex grep across 7 keys | 7 |
| TypeScript typecheck | `bun run typecheck` | exit 0 |

### Task 2 Static Acceptance Checks (all PASS at commit `68439c3`)

| Check | Command | Result |
|-------|---------|--------|
| `href="/firearms"` count = 1 | `grep -c 'href="/firearms"'` | 1 |
| `pathname === '/firearms'` count = 1 | `grep -c "pathname === '/firearms'"` | 1 |
| `<span>Firearms</span>` count = 1 | `grep -c '<span>Firearms</span>'` | 1 |
| `onMouseEnter={prefetch.firearms}` present | `grep -c "prefetch.firearms"` | 1 |
| No `prefetch={false}` introduced | `grep -c 'prefetch={false}'` | 0 |
| No Lucide icons on Assets sub-items | manual scan | 0 (only LogOut in footer) |
| `<SidebarMenuSubItem>` total count | `grep -c '<SidebarMenuSubItem>'` | 10 (was 9, +1 for Firearms) |
| Alphabetical href order (Python positional probe) | python3 positional probe | `['Accounts','Artwork','Firearms','Insurance','Personal Property','Properties','Vehicles']` — exit 0 |
| TypeScript typecheck | `bun run typecheck` | exit 0 |
| Biome lint | `bun run lint` | "Checked 481 files. No fixes applied." — exit 0 |

### Task 3 UAT Results (executed via Chrome browser agent, 2026-05-22)

| SC | Requirement | Verification Method | Result |
|----|-------------|---------------------|--------|
| SC-1 | ASSET-04 | Browser UAT: expanded Assets group; extracted DOM order `["Accounts","Artwork","Firearms","Insurance","Personal Property","Properties","Vehicles"]` | PASS |
| SC-2 | ASSET-03 | Browser UAT: clicked Firearms → `location.pathname === '/firearms'`; DataTable + KPI strip from Phase 30 rendered | PASS |
| SC-3 | (phase-internal) | (a) static: `onMouseEnter={prefetch.firearms}` wired at line 428, handler body at lines 111-114 matches D-02; (b) dev log: `GET /api/trpc/firearm.list?batch=1&input={"0":{"entityId":1}} 200 in 109ms` fired on first (cold-cache) hover; (c) scope analysis: dashboard server-prefetches only `dashboard.summary`, `dashboard.summaryTotals`, `entity.list` — every other `*.list` GET in dev log came from sidebar hovers | PASS |

**SC-3 warm-cache note:** The Chrome browser agent initially reported SC-3 as a DEVIATION because subsequent hovers emitted zero network requests. Investigation confirmed correct behavior: React Query `staleTime: 1000 * 60 * 5` (src/lib/trpc-provider.tsx:33) suppresses re-fetches within the 5-minute window. The first cold-cache hover confirmed the wiring works. UAT methodology for hover-prefetch must always use a fresh session or clear React Query cache before the hover check.

---

## Known Gaps

### UAT-only coverage on SC-1, SC-2, SC-3

**Gap:** No automated test file exists for the three ROADMAP success criteria. Verification relied on grep/Python static probes (SC-1 ordering, SC-2 href literal) and browser-based admin UAT (rendered DOM order, click navigation, Network DevTools).

**Disposition: INTENTIONAL — acceptable per D-06.**

D-06 (32-CONTEXT.md) explicitly locks out test additions for sidebar JSX changes, citing Phase 19 precedent (artwork/personal-property/insurance sidebar additions shipped without dedicated tests). This is a project-wide pattern for pure sidebar composition work — the static acceptance probes (grep + Python positional order) provide machine-checkable coverage of the source truth; UAT provides runtime confirmation of rendered behavior.

Future auditors: if a sidebar-rendering test suite is introduced as a milestone goal, Phase 32 SCs (alphabetical order, /firearms navigation, firearm.list prefetch) should be retrofitted as unit/integration tests at that time. The static grep probes in Task 2 are copy-paste-ready starting points.

### tRPC GET vs POST UAT methodology nit

**Gap:** 32-01-PLAN.md Task 3 step 11 says "two tRPC POST requests." tRPC v11 with `httpBatchLink` emits GET for queries (POST is mutations only). The UAT spec was technically wrong but the UAT itself was executed correctly (GETs were observed).

**Disposition: documentation nit, no code impact.** Future UAT specs for hover-prefetch should say "GET requests" and note that warm-cache hovers are intentionally silent.

---

## Wave 0 Requirements

No Wave 0 required. D-06 prohibits new test files for this phase. The static acceptance gates (typecheck, lint, grep, Python) are embedded in the task `<automated>` blocks and run inline — no separate test file scaffolding needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 7-item alphabetical Assets group visible in browser | ASSET-04 (SC-1) | Rendered DOM order requires a live browser; Python positional-grep confirms source order but not React rendering | Start `bun run dev`, sign in as admin, expand Assets sidebar group, confirm top-to-bottom: Accounts, Artwork, Firearms, Insurance, Personal Property, Properties, Vehicles |
| Clicking Firearms navigates to /firearms | ASSET-03 (SC-2) | Click navigation requires a live browser | Click Firearms sub-item; URL becomes `/firearms`; firearms DataTable + KPI strip renders |
| Hover fires `firearm.list` + `entity.list` GETs | SC-3 | DevTools network inspection requires a live browser; warm-cache suppression requires methodology discipline | Open fresh private window, sign in as admin, go to `/dashboard`, open DevTools → Network → filter `trpc`, clear log, hover Firearms — confirm two GETs: `firearm.list` (with `entityId`) and `entity.list` |

---

## Validation Sign-Off

- [x] All tasks have an `<automated>` verify or an explicit UAT entry — Task 3 uses admin UAT (D-06 sanctioned)
- [x] Sampling continuity: Tasks 1 and 2 both run typecheck; Task 2 also runs lint
- [x] No Wave 0 files required (D-06 prohibits new tests; static probes embedded in tasks)
- [x] No watch-mode flags
- [x] Feedback latency < 30s (typecheck ~10s, lint ~5s)
- [x] `nyquist_compliant: true` — UAT-only is acceptable for pure UI prunes per D-06

**Approval:** retrospective — phase shipped and verified 2026-05-22

---

## VALIDATION COMPLETE

**Verdict:** PASSED — 3/3 must-have truths verified (SC-1 ASSET-04, SC-2 ASSET-03, SC-3 prefetch wiring). Static gates (typecheck exit 0, biome 481 files no fixes, 10 grep/Python probes all PASS) provide machine-checkable source-truth coverage. Admin UAT confirmed rendered behavior in Chrome. Known gap (no automated test file) is intentional per D-06 and documented for future auditors.

*Retrospectively generated: 2026-05-23*
*Phase executed and verified: 2026-05-22*
*Verifier: Claude (nyquist-auditor)*
