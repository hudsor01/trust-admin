---
phase: 15
slug: auth-session-security
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-08
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bun test (built-in) + Playwright |
| **Config file** | `package.json` scripts + `playwright.config.ts` |
| **Quick run command** | `bun test tests/lib/env-validation.test.ts tests/api/reset-password-validation.test.ts tests/api/e2e-setup-auth.test.ts` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun run typecheck && bun run lint`
- **After every plan wave:** Run `bun test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | SEC-01 | unit | `bun test tests/lib/env-validation.test.ts` | ❌ W0 | ⬜ pending |
| 15-01-02 | 01 | 1 | SEC-02 | static | `bun run typecheck` + grep verification | N/A | ⬜ pending |
| 15-01-03 | 01 | 1 | SEC-03 | integration | `bun run typecheck` (call site verification) | N/A | ⬜ pending |
| 15-01-04 | 01 | 1 | SEC-05 | unit | `bun test tests/api/reset-password-validation.test.ts` | ❌ W0 | ⬜ pending |
| 15-01-05 | 01 | 1 | SEC-06 | unit | `bun test tests/api/e2e-setup-auth.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/lib/env-validation.test.ts` — test env module rejects missing/short NEON_AUTH_COOKIE_SECRET
- [ ] `tests/api/reset-password-validation.test.ts` — test Zod schema rejects bad token format, long passwords
- [ ] `tests/api/e2e-setup-auth.test.ts` — test route returns 401 without secret header

*SEC-03 (session revocation) verified by typecheck + code review — mocking authServer.admin requires deep module mocking.*
*SEC-02 verified by grep (no process.env.ADMIN_EMAIL in src/server/) + typecheck.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sessions invalidated after password reset | SEC-03 | Requires live Neon Auth session + password change | 1. Sign in as user 2. Copy session cookie 3. Reset password 4. Verify old cookie returns 401 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
