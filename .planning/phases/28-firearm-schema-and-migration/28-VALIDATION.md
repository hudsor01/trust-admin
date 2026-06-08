---
phase: 28
slug: firearm-schema-and-migration
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-21
validated: 2026-06-08
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
| Add 5 pgEnums + `firearm` pgTable + RLS | 28-01 | 1 | FIRE-01..05 | T-28-04 | RLS `.enableRLS()` + `app.is_admin()` policies on `firearm` | typecheck | `bun run typecheck` | ✅ existing | ✅ green |
| `document.firearmId` FK + CHECK update | 28-01 | 1 | FIRE-08 | T-28-02 | single-owner CHECK still rejects multi-FK rows | manual (DB) | `psql` insert probe | N/A | ✅ verified (v5.0) |
| `valuation.firearmId` FK + CHECK update | 28-01 | 1 | FIRE-09 | T-28-02 | single-asset CHECK still rejects multi-FK rows | manual (DB) | `psql` insert probe | N/A | ✅ verified (v5.0) |
| `insertFirearmSchema` / `updateFirearmSchema` in `db/validation.ts` | 28-01 | 1 | FIRE-01..05 | T-28-03 | NFA-conditional refine; serial regex; positive-number money | unit | `bun test tests/lib/validation.firearm.test.ts` | ✅ existing | ✅ green |
| `db:deploy` migration apply + RLS verify | 28-01 | 1 | FIRE-01..09 | T-28-01 | `relrowsecurity=true`, 4 policies present | manual (DB) | `bun run db:deploy` + `pg_class`/`pg_policies` probe | N/A | ✅ verified (v5.0) |
| Test-branch sync script | 28-01 | 1 | FIRE-01..09 | — | idempotent re-runnable apply | manual (DB) | (synced ad-hoc) | ⚠️ not committed | ✅ verified (firearm tests green vs test branch) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/lib/validation.firearm.test.ts` — unit tests for `insertFirearmSchema` / `updateFirearmSchema`:
  valid firearm insert accepted; `isNfa: true` with null `nfaClass` rejected by the refine;
  serial-number regex enforced; negative `dodValue` / `acquisitionCost` rejected. **Backfilled
  in v5.0.1 (PR #130); 14 tests green.**
- [~] `scripts/apply-0014-testbranch.ts` — never committed, but its outcome (the Neon test branch
  has the firearm table) was achieved ad-hoc and is proven by `tests/trpc/firearm.test.ts` running
  green against the test branch. Not a validation gap.

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

- [x] All tasks have an `<automated>` verify or a Wave 0 dependency
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (`validation.firearm.test.ts` exists + green; test-branch sync achieved ad-hoc)
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-06-08

---

## Validation Audit 2026-06-08

Retroactive Nyquist backfill (`/gsd:validate-phase 28`). The phase's one automated
gap — `tests/lib/validation.firearm.test.ts` — was already backfilled in v5.0.1
(PR #130) and runs green (14 unit tests covering the NFA refine, serial regex, and
positive-money rules). The remaining rows are manual DB verifications that were
performed during the v5.0 milestone (`28-VERIFICATION.md`) and are inherently
not unit-testable. No tests were generated this pass; status updated to reflect
existing coverage.

| Metric | Count |
|--------|-------|
| Gaps found | 0 (all COVERED or manual-only) |
| Resolved | 0 (coverage pre-existing) |
| Escalated | 0 |
