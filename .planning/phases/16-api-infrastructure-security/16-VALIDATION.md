---
phase: 16
slug: api-infrastructure-security
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-08
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test (unit/integration), Playwright 1.58.2 (E2E) |
| **Config file** | bunfig.toml, playwright.config.ts |
| **Quick run command** | `bun test tests/api tests/lib` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test tests/api tests/lib`
- **After every plan wave:** Run `bun test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | SEC-04 | unit | `bun test tests/api/activity-log-rls.test.ts` | ❌ W0 | ⬜ pending |
| 16-01-02 | 01 | 1 | SEC-08 | unit | `bun test tests/lib/proxy-paths.test.ts tests/api/inventory-analyze.test.ts` | ❌ W0 / ✅ extend | ⬜ pending |
| 16-02-01 | 02 | 1 | SEC-09 | unit | `bun test tests/lib/verify-access.test.ts` | ❌ W0 | ⬜ pending |
| 16-02-02 | 02 | 1 | SEC-07 | unit | `bun test tests/api/inventory-upload.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/api/activity-log-rls.test.ts` — stubs for SEC-04 (INSERT policy enforces userId match; UPDATE/DELETE policies removed)
- [ ] `tests/lib/proxy-paths.test.ts` — stubs for SEC-08a (verify `/api/inventory` NOT in publicPaths)
- [ ] `tests/lib/verify-access.test.ts` — stubs for SEC-09 (timing-safe comparison, lockout after 5 failures, lockout reset, lockout expiry)
- [ ] `tests/api/inventory-upload.test.ts` — stubs for SEC-07 (mock UTApi, verify no fs.writeFile, verify URL format)
- [ ] Extend `tests/api/inventory-analyze.test.ts` — SEC-08b (oversized base64 rejection)

*Existing infrastructure covers bun:test framework. No new test framework installs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| RLS policies applied to live DB | SEC-04 | Requires running migration against actual Neon DB | Run migration SQL, then verify via `SELECT * FROM pg_policies WHERE tablename = 'activity_log'` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
