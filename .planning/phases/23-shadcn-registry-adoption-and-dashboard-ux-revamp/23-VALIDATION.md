---
phase: 23
slug: shadcn-registry-adoption-and-dashboard-ux-revamp
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-19
---

# Phase 23 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bun test (component + lib + trpc + api) + Playwright (E2E) |
| **Config file** | `bunfig.toml`, `playwright.config.ts` |
| **Quick run command** | `bun test --bail --timeout 30000 tests/components` |
| **Full suite command** | `bun test` |
| **E2E command** | `bun run test:e2e` |
| **Estimated runtime** | unit ~70s (910-test baseline) · E2E ~3min |

---

## Sampling Rate

- **After every task commit:** Run `bun test --bail --timeout 30000 tests/components tests/lib` (only files touched + their tests). Pre-commit hook already enforces this.
- **After every plan wave:** Run full `bun test` + `bun run typecheck` + `bun run lint`. Pre-push hook enforces typecheck.
- **After Phase 2 redesigns:** `bun run test:e2e` for `/hems-queue`, `/activity-log` (covers default-view transitions).
- **Before `/gsd-verify-work`:** Full suite + E2E both green.
- **Max feedback latency:** unit < 75s, E2E < 200s.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 23-01-01 | 01 | 1 | foundation | — | Registries resolve via shadcn CLI without bypassing project conventions | smoke | `bunx shadcn@latest list && bun run build` | n/a | ⬜ pending |
| 23-01-02 | 01 | 1 | foundation | — | New primitive files use `var(--*)` CSS vars; no hard-coded color literals | grep | `! grep -rE "bg-\[#\|text-\[#\|border-\[#" src/components/ui/$NEW src/components/kibo-ui/$NEW` | ✅ | ⬜ pending |
| 23-01-03 | 01 | 1 | foundation | — | PageHeader composes title + breadcrumb + actions slot without theme drift | unit | `bun test tests/components/page-header.test.tsx` | ❌ W0 | ⬜ pending |
| 23-01-04 | 01 | 1 | foundation | — | KpiStrip renders count + value + delta + sparkline; uses formatMoney / chart.tsx | unit | `bun test tests/components/kpi-strip.test.tsx` | ❌ W0 | ⬜ pending |
| 23-01-05 | 01 | 1 | foundation | — | No bundle regression > +50 KB gz after Phase 1 install | manual | `ANALYZE=true bun run build` + compare report | n/a | ⬜ pending |
| 23-02-01 | 02 | 2 | hems-queue redesign | T-23-01 | Kanban drag-to-approve requires admin role (RLS preserved via tRPC ctx) | integration | `bun test tests/trpc/hemsRequest.test.ts` | ✅ | ⬜ pending |
| 23-02-02 | 02 | 2 | hems-queue redesign | — | `markDistributed` mutation enforces PENDING → APPROVED → DISTRIBUTED state machine | unit | `bun test tests/trpc/hemsRequest.test.ts -t markDistributed` | ❌ W0 | ⬜ pending |
| 23-02-03 | 02 | 2 | hems-queue redesign | — | Board view + Table tab keep same data source (`trpc.hemsRequest.list`) | E2E | `bun run test:e2e tests/e2e/hems-queue.e2e.ts` | ❌ W0 | ⬜ pending |
| 23-02-04 | 02 | 2 | activity-log redesign | T-23-02 | Timeline view does not leak rows the user lacks permission to see (RLS via existing activityLog router) | integration | `bun test tests/trpc/activityLog.test.ts` | ✅ | ⬜ pending |
| 23-02-05 | 02 | 2 | activity-log redesign | — | Heatmap respects 30-day window + entity scoping | unit | `bun test tests/components/activity-heatmap.test.tsx` | ❌ W0 | ⬜ pending |
| 23-03-01 | 03 | 2 | liabilities Gantt | — | Payoff projection batched query returns one row per active liability with payoffMonth | integration | `bun test tests/trpc/liability.test.ts -t payoffProjections` | ❌ W0 | ⬜ pending |
| 23-03-02 | 03 | 2 | liabilities Gantt | — | KPI strip aggregates use `sumStrings` (cent precision); never `parseFloat().reduce()` | grep | `grep -L "sumStrings" src/app/\\(admin\\)/liabilities/_components/LiabilityKpiStrip.tsx \|\| true; ! grep -E "parseFloat.*reduce" src/app/\\(admin\\)/liabilities/_components/` | ❌ W0 | ⬜ pending |
| 23-03-03 | 03 | 2 | beneficiaries donuts | — | Donut totals sum to exactly 100% (within rounding tolerance for `sharePercent`) | unit | `bun test tests/components/beneficiary-share-donuts.test.tsx` | ❌ W0 | ⬜ pending |
| 23-03-04 | 03 | 2 | cross-page KPI strips | — | Each of 10 list pages renders KpiStrip above the existing client component; existing tables unchanged | E2E | `bun run test:e2e tests/e2e/admin-pages.e2e.ts` | ❌ W0 | ⬜ pending |
| 23-04-01 | 04 | 3 | DataTable bulk actions | T-23-03 | Bulk action toolbar only visible when `enableRowSelection` is true AND rows selected | unit | `bun test tests/components/data-table.test.tsx -t "bulk action"` | ❌ W0 | ⬜ pending |
| 23-04-02 | 04 | 3 | DataTable CSV export | T-23-04 | CSV export respects current `columnFilters` + `sorting` state; uses `formatCurrency`/`formatDate` for cell values | unit | `bun test tests/lib/csv-export.test.ts` | ❌ W0 | ⬜ pending |
| 23-04-03 | 04 | 3 | DataTable row expansion | — | `getRowDetail` opt-in renders expansion row without breaking existing pagination/sorting | unit | `bun test tests/components/data-table.test.tsx -t "row expansion"` | ❌ W0 | ⬜ pending |
| 23-05-01 | 05 | 4 | settings refresh | — | PreferenceRow composition preserves existing setting values across pre/post refresh; no data loss | unit | `bun test tests/components/preference-row.test.tsx` | ❌ W0 | ⬜ pending |
| 23-05-02 | 05 | 4 | sortable trustees/beneficiaries | T-23-05 | Reorder mutation enforces entityId scoping (RLS); only admins can reorder | integration | `bun test tests/trpc/trustee.test.ts -t reorder; bun test tests/trpc/beneficiary.test.ts -t reorder` | ❌ W0 | ⬜ pending |
| 23-05-03 | 05 | 4 | sortable migration | — | Migration 0012 adds `sortIndex` to `beneficiary`, backfills monotonically, indexes `(entityId, sortIndex)`; existing `trustee.order` reused | manual | `bun run db:migrate && bun run db:studio` (verify schema) | ❌ W0 | ⬜ pending |
| 23-06-01 | 06 | 5 | asset-creation wizard | — | 3-step wizard collects same payload shape as the prior single-step dialog (no API contract change) | unit | `bun test tests/components/resource-dialog.test.tsx -t "wizard"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 runs before any feature work to install missing test infrastructure.

- [ ] `tests/components/page-header.test.tsx` — stubs for PageHeader composition
- [ ] `tests/components/kpi-strip.test.tsx` — stubs for KpiStrip composition (count/value/delta/sparkline)
- [ ] `tests/components/activity-heatmap.test.tsx` — stubs for ActivityHeatmap entity-scope + 30-day window
- [ ] `tests/components/beneficiary-share-donuts.test.tsx` — stubs for donut total = 100%
- [ ] `tests/components/preference-row.test.tsx` — stubs for PreferenceRow composition
- [ ] `tests/lib/csv-export.test.ts` — stubs for CSV export respecting filter + sort state
- [ ] `tests/trpc/hemsRequest.test.ts` — add `markDistributed` mutation tests
- [ ] `tests/trpc/liability.test.ts` — add `payoffProjections` batched query tests
- [ ] `tests/trpc/trustee.test.ts` — add `reorder` mutation tests
- [ ] `tests/trpc/beneficiary.test.ts` — add `reorder` mutation tests
- [ ] `tests/e2e/hems-queue.e2e.ts` — drag-to-approve flow
- [ ] `tests/e2e/admin-pages.e2e.ts` — KPI strip render check on all 10 list pages
- [ ] (DataTable bulk-action / row-expansion stubs go in the existing `tests/components/data-table.test.tsx`)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| OKLCH theme tokens not regressed by any newly installed registry component | Phase 23 constraint | Visual / cross-theme verification; not deterministic in unit tests | After each install: open `/dashboard` and one redesigned page in light + dark + high-contrast via `ThemeToggle`. Compare to pre-install screenshot. No drift permitted. |
| Bundle delta stays under +120 KB gzipped across the full phase | Phase 23 constraint | Requires `ANALYZE=true bun run build` + manual diff vs baseline | `ANALYZE=true bun run build` before and after each PR; inspect the bundle-analyzer HTML. Record delta per PR in PR body. |
| React Compiler bailouts not introduced by any new dep | Phase 23 constraint | Compiler bailout messages are only visible in build log; no test framework asserts on them | Grep build log for `[Compiler bailout]` after each install. New bailout → opt out the consumer with `'use no memo'` per PR #87 pattern. |
| Drag-and-drop kanban interaction works on touch devices | Phase 2.1 | Touch event simulation in unit tests is unreliable; needs real device | Open `/hems-queue` on iOS Safari and Android Chrome. Drag a card from PENDING to APPROVED. Verify state transition and toast. |
| Browser-agent re-verification post-deploy | every PR | Production smoke test for visual + console regressions | After Vercel ready: run the browser-agent prompt established in PR #89/#90 verification — confirm no React #418 errors, all 56 painting rows still visible, totals consistent, navigation works. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 75s (unit), < 200s (E2E)
- [ ] `nyquist_compliant: true` set in frontmatter (after Wave 0 lands)

**Approval:** pending
