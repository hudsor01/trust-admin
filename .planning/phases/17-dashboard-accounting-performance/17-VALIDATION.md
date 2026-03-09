---
phase: 17
slug: dashboard-accounting-performance
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test + @testing-library/react |
| **Config file** | package.json `test` script |
| **Quick run command** | `bun test tests/components/dashboard tests/components/accounting tests/trpc` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun run typecheck && bun test tests/components/dashboard tests/components/accounting tests/trpc`
- **After every plan wave:** Run `bun test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 1 | PERF-01 | unit (tRPC) | `bun test tests/trpc/dashboard-totals.test.ts` | ❌ W0 | ⬜ pending |
| 17-01-02 | 01 | 1 | CLEAN-05, CLEAN-10 | typecheck | `bun run typecheck` | ✅ | ⬜ pending |
| 17-02-01 | 02 | 1 | PERF-02 | unit (tRPC) | `bun test tests/trpc/accounting-pagination.test.ts` | ❌ W0 | ⬜ pending |
| 17-02-02 | 02 | 1 | PERF-04 | manual | N/A (verify no waterfall in Network tab) | manual-only | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/trpc/dashboard-totals.test.ts` — stubs for PERF-01 (SQL SUM aggregation returns correct totals)
- [ ] `tests/trpc/accounting-pagination.test.ts` — stubs for PERF-02 (server-side pagination + entryType filter)

*Existing infrastructure covers bun:test framework. No new test framework installs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Portal beneficiary.me is server-prefetched (no waterfall) | PERF-04 | Requires browser Network tab inspection | 1. Login as beneficiary 2. Open Network tab 3. Navigate to /portal 4. Verify beneficiary data loads with page (no sequential fetch after session) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
