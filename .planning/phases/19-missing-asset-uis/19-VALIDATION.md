---
phase: 19
slug: missing-asset-uis
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test + @testing-library/react |
| **Config file** | bunfig.toml |
| **Quick run command** | `bun test tests/components/artwork tests/components/personal-property tests/components/insurance tests/trpc` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun run typecheck && bun test tests/components tests/trpc`
- **After every plan wave:** Run `bun test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 19-01-01 | 01 | 1 | FEAT-01 | unit (tRPC) | `bun test tests/trpc/artwork.test.ts` | ❌ W0 | ⬜ pending |
| 19-01-02 | 01 | 1 | FEAT-01 | component | `bun test tests/components/artwork` | ❌ W0 | ⬜ pending |
| 19-02-01 | 02 | 1 | FEAT-02 | unit (tRPC) | `bun test tests/trpc/personal-property.test.ts` | ❌ W0 | ⬜ pending |
| 19-02-02 | 02 | 1 | FEAT-02 | component | `bun test tests/components/personal-property` | ❌ W0 | ⬜ pending |
| 19-03-01 | 03 | 1 | FEAT-03 | unit (tRPC) | `bun test tests/trpc/insurance.test.ts` | ❌ W0 | ⬜ pending |
| 19-03-02 | 03 | 1 | FEAT-03 | component | `bun test tests/components/insurance` | ❌ W0 | ⬜ pending |
| 19-04-01 | 04 | 2 | FEAT-04 | unit (tRPC) | `bun test tests/trpc/dashboard-totals.test.ts` | ✅ extend | ⬜ pending |
| 19-04-02 | 04 | 2 | FEAT-04 | component | `bun test tests/components/dashboard` | ✅ extend | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/trpc/artwork.test.ts` — stubs for FEAT-01 (artwork CRUD operations)
- [ ] `tests/trpc/personal-property.test.ts` — stubs for FEAT-02 (personal property CRUD)
- [ ] `tests/trpc/insurance.test.ts` — stubs for FEAT-03 (insurance policy CRUD)

*Existing infrastructure covers bun:test framework. No new test framework installs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| None | — | — | — |

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
