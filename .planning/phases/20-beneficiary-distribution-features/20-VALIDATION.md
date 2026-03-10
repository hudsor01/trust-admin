---
phase: 20
slug: beneficiary-distribution-features
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test + @testing-library/react |
| **Config file** | bunfig.toml |
| **Quick run command** | `bun test tests/trpc/business-logic.test.ts tests/components/beneficiary tests/components/distribution` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun run typecheck && bun test tests/trpc tests/components`
- **After every plan wave:** Run `bun test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 20-01-01 | 01 | 1 | FEAT-05 | typecheck | `bun run typecheck` | ✅ | ⬜ pending |
| 20-01-02 | 01 | 1 | FEAT-08 | typecheck | `bun run typecheck` | ✅ | ⬜ pending |
| 20-02-01 | 02 | 1 | FEAT-06 | typecheck | `bun run typecheck` | ✅ | ⬜ pending |
| 20-02-02 | 02 | 1 | FEAT-07 | typecheck | `bun run typecheck` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. No new test framework installs needed.*

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
