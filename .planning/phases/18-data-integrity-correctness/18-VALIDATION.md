---
phase: 18
slug: data-integrity-correctness
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test |
| **Config file** | bunfig.toml |
| **Quick run command** | `bun test tests/trpc/business-logic.test.ts` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test tests/trpc/business-logic.test.ts`
- **After every plan wave:** Run `bun test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 18-01-01 | 01 | 1 | CORR-01 | unit | `bun test tests/trpc/business-logic.test.ts` | ✅ extend | ⬜ pending |
| 18-01-02 | 01 | 1 | CORR-02 | unit | `bun test tests/trpc/business-logic.test.ts` | ✅ extend | ⬜ pending |
| 18-01-03 | 01 | 1 | CORR-03 | unit | `bun test tests/lib/validation.test.ts` | ❌ W0 | ⬜ pending |
| 18-02-01 | 02 | 1 | CORR-04, PERF-03 | unit | `bun test tests/trpc/crud-admin-ops.test.ts` | ✅ extend | ⬜ pending |
| 18-02-02 | 02 | 1 | CORR-05 | unit | `bun test tests/api/forgot-password.test.ts` | ❌ W0 | ⬜ pending |
| 18-02-03 | 02 | 1 | PERF-05 | unit | `bun test tests/trpc/business-logic.test.ts` | ✅ extend | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/lib/validation.test.ts` — stubs for CORR-03 (update schemas reject empty payloads)
- [ ] `tests/api/forgot-password.test.ts` — stubs for CORR-05 (token dedup + expired cleanup)

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
