# Retrospective: Trust Admin

A living retrospective — one section per milestone, newest appended above the cross-milestone trends.

## Milestone: v4.0 — Production Hardening & Completeness

**Shipped:** 2026-05-21
**Phases:** 13 (15-27) | **Plans:** 32 | **Tasks:** 71

### What Was Built

A comprehensive production-hardening pass plus a dashboard UX revamp, closing 45 critical-review findings and the v4.0 audit's own gaps:
- **Security/infra (15-16):** validated env + cookie secret, centralized ADMIN_EMAIL, session revocation, E2E-setup secret gate, immutable activity_log RLS, timing-safe access codes, UploadThing migration.
- **Performance/correctness (17-18):** SQL-aggregated dashboard totals, server-side accounting pagination, portal prefetch; payment-math nullish fixes, bulk share recalculation, deprecated-API removal, non-empty update validation.
- **Feature completeness (19-21):** artwork/personal-property/insurance admin pages, portal HEMS history, beneficiary tax fields, distribution compliance, accounting reconciliation, trustee editing.
- **Code quality (22):** dead-code removal, entityId cache pattern, runtime type guards, structured logging.
- **Dashboard UX revamp (23):** Kibo/Dice shadcn registries, HEMS kanban, activity timeline+heatmap, gantt + donut charts, KPI strips on 11 pages, DataTable bulk-actions/CSV/row-expansion, sortable lists, 3-step asset wizard.
- **Gap closure (24-27):** test/lint hygiene, reorder ORDER BY, dashboard.activityCounts, schema completeness (migration 0013), DataTable rollout to 14 tables, `--milestone` token, doc accuracy.

### What Worked

- The plan → plan-check → execute → code-review → verify loop caught real defects pre-merge every phase (e.g. the phase-27 `enableHiding` CSV-export false premise, the phase-25 `activityCounts` timezone bug, the phase-23 OKLCH violation). Fixing review findings inline before merge kept `main` clean throughout.
- The milestone audit → `plan-milestone-gaps` → gap-closure-phases → re-audit cycle worked: v4.0 went `tech_debt` → all 9 gaps closed → `passed`.
- Per-phase feature branches + one PR each kept CI green and history reviewable.

### What Was Inefficient

- Phase 24's entire scope was found already-resolved at planning time — the audit had aggregated stale tech_debt from March-2026 phase SUMMARYs that phases 17-23 had since fixed. Lesson below.
- PR branch-stacking: planning branches and execution branches stacked, causing one auto-closed PR (#96 → recreated as #97) and manual retargeting. A flatter merge cadence would avoid it.
- A recurring transient Neon test-branch `ECONNREFUSED` flake forced re-runs across several phases — infra, not code, but noisy.
- The planner agent twice committed plan files directly to `main`; caught and moved to branches each time.

### Patterns Established

- **Code-review findings fixed inline before phase completion** — every phase ends green, no deferred-review debt.
- **Version-locked dependency families bump together** — `@tanstack/*` query packages, `react`/`react-dom`, etc.; a `groups:` block was added to `dependabot.yml` so dependabot raises pre-grouped PRs.
- **Gap-closure phases close a phase's own audit gaps** within the milestone; genuinely new scope earns a new milestone.

### Key Lessons

- **Re-verify audit-sourced tech_debt against the live codebase before planning fixes for it** — aggregated audit findings can be stale (phase 24).
- **Single-package dependency bumps break version-locked families** — bumping `@tanstack/react-query` alone split `query-core` into two copies; always bump the family.
- **A milestone audit is a snapshot** — re-audit after gap closure rather than assuming `passed`; the re-audit surfaced a genuine new wiring gap (beneficiary reorder cache invalidation).

### Cost Observations

- Heavy subagent use: gsd-planner (opus), gsd-executor / gsd-plan-checker / gsd-verifier / gsd-code-reviewer (sonnet) — orchestrator stayed lean by delegating per-plan work.
- 13 phases over ~2.5 months; gap-closure phases 24-27 + the dependency/CI cleanup compressed into the final sessions.

## Cross-Milestone Trends

_(First retrospective entry — trends will accrue as future milestones complete.)_
