---
phase: 28
slug: firearm-schema-and-migration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-21
---

# Phase 28 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Phase 28 is schema + migration only — no tRPC router (Phase 29), no UI (Phase 30).
> The primary correctness signals are the type-checker, a Zod-schema unit test, and
> post-migration DB introspection.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bun test (built-in) |
| **Config file** | none — `bun test` script in `package.json` targets explicit dirs |
| **Quick run command** | `bun run typecheck` |
| **Full suite command** | `bun test tests/api tests/components tests/lib tests/trpc tests/*.test.ts` |
| **Estimated runtime** | ~30 seconds (full suite); typecheck ~10s |

---

## Sampling Rate

- **After every task commit:** Run `bun run typecheck` — schema types must compile clean before any Phase 29 router work
- **After every plan wave:** Run `bun test tests/lib` — Zod firearm-schema unit tests
- **Before `/gsd:verify-work`:** Full suite green, `bun run typecheck` exits 0, migration applied to prod + test branch, RLS verified
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

Task IDs (`28-01-NN`) are assigned by the planner; rows below map phase requirements to
their verification method.

| Task scope | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|------------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| Add 5 pgEnums + `firearm` pgTable + RLS | 28-01 | 1 | FIRE-01..05 | T-28-04 | RLS `.enableRLS()` + `app.is_admin()` policies on `firearm` | typecheck | `bun run typecheck` | ✅ existing | ⬜ pending |
| `document.firearmId` FK + CHECK update | 28-01 | 1 | FIRE-08 | T-28-02 | single-owner CHECK still rejects multi-FK rows | manual (DB) | `psql` insert probe | N/A | ⬜ pending |
| `valuation.firearmId` FK + CHECK update | 28-01 | 1 | FIRE-09 | T-28-02 | single-asset CHECK still rejects multi-FK rows | manual (DB) | `psql` insert probe | N/A | ⬜ pending |
| `insertFirearmSchema` / `updateFirearmSchema` in `db/validation.ts` | 28-01 | 1 | FIRE-01..05 | T-28-03 | NFA-conditional refine; serial regex; positive-number money | unit | `bun test tests/lib/validation.firearm.test.ts` | ❌ W0 | ⬜ pending |
| `db:deploy` migration apply + RLS verify | 28-01 | 1 | FIRE-01..09 | T-28-01 | `relrowsecurity=true`, 4 policies present | manual (DB) | `bun run db:deploy` + `pg_class`/`pg_policies` probe | N/A | ⬜ pending |
| Test-branch sync script | 28-01 | 1 | FIRE-01..09 | — | idempotent re-runnable apply | manual (DB) | `bun run scripts/apply-0014-testbranch.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/lib/validation.firearm.test.ts` — unit tests for `insertFirearmSchema` / `updateFirearmSchema`:
  valid firearm insert accepted; `isNfa: true` with null `nfaClass` rejected by the refine;
  serial-number regex enforced; negative `dodValue` / `acquisitionCost` rejected
- [ ] `scripts/apply-0014-testbranch.ts` — idempotent postgres.js script applying the migration
  DDL to the `.env.test.local` Neon test branch (Phase 26 `apply-0013-testbranch.ts` precedent)

*Existing infrastructure (`bun test tests/lib`, `tsc --noEmit`) covers the automated portion.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Migration applies without error; `\d firearm` shows all columns | FIRE-01..09 | DDL apply against a live Neon DB cannot be unit-tested | Run `bun run db:deploy`; connect via `bun run db:studio` or `getSql()` and confirm `serialNumber`, `nfaClass`, `nfaTransferStatus`, `condition`, `acquisitionCost` columns exist |
| Duplicate `serialNumber` raises a unique-index violation | FIRE-01 | Requires a real INSERT against the DB | Insert two `firearm` rows with the same `serialNumber`; second must fail with `23505` |
| `document` / `valuation` single-owner CHECK constraints still reject multi-FK rows after `firearmId` added | FIRE-08, FIRE-09 | DB CHECK-constraint behavior is not type-checkable | Insert a `document` row with two non-null asset FKs — must be rejected; insert one with only `firearmId` — must succeed |
| `firearm` table has RLS enabled with 4 `app.is_admin()` policies | V4 Access Control | Requires live DB catalog introspection | `SELECT relrowsecurity FROM pg_class WHERE relname='firearm'` → `true`; `SELECT policyname FROM pg_policies WHERE tablename='firearm'` → 4 rows |
| `transferStatus` enum unchanged; `nfaTransferStatus` enum is exactly `NOT_FILED/FILED/APPROVED` | FIRE-05 | Enum DDL state | `\dT+ "transferStatus"` and `\dT+ "NfaTransferStatus"` |

---

## Validation Sign-Off

- [ ] All tasks have an `<automated>` verify or a Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (`validation.firearm.test.ts`, test-branch sync script)
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
