---
phase: 29
slug: firearm-trpc-router
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-21
validated: 2026-06-08
---

# Phase 29 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Phase 29 is router-only — no schema, no UI. The 5 ROADMAP success criteria
> are the binding contract; each maps to either a tRPC integration test or
> the type-checker.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test (built-in) |
| **Config file** | `package.json "test"` script |
| **Quick run command** | `bun run typecheck` |
| **Full suite command** | `bun test --timeout 30000 tests/api tests/components tests/lib tests/trpc tests/*.test.ts` |
| **Estimated runtime** | typecheck ~10s; full suite ~120s |

---

## Sampling Rate

- **After every task commit:** `bun run typecheck` — fast structural check; catches procedure-signature breaks
- **After every plan wave:** `bun test tests/trpc/firearm.test.ts` — integration coverage of all 5 success criteria
- **Before `/gsd:verify-work`:** Full suite green + typecheck exits 0
- **Max feedback latency:** ~30 seconds (typecheck) / ~10 seconds (single firearm test file)

---

## Per-Task Verification Map

Task IDs (`29-01-NN`) are assigned by the planner; rows below map each
ROADMAP success criterion to the verification mechanism. The same test file
(`tests/trpc/firearm.test.ts`) covers SC-1..SC-4; SC-5 is the standalone
typecheck.

| ROADMAP SC | Behavior | Threat Ref | Test Type | Automated Command | File Exists | Status |
|------------|----------|------------|-----------|-------------------|-------------|--------|
| SC-1 | `firearm.list` returns entity-scoped rows | T-29-XEN | integration (tRPC caller) | `bun test tests/trpc/firearm.test.ts` | ✅ existing | ✅ green |
| SC-2 | `firearm.create` rejects duplicate `serialNumber` → `TRPCError(CONFLICT)` | T-29-SER | integration (tRPC caller) | same | ✅ existing | ✅ green |
| SC-3 | `firearm.byId` throws `NOT_FOUND` for cross-entity / nonexistent id | T-29-XEN | integration (tRPC caller) | same | ✅ existing | ✅ green |
| SC-4 | All 6 procedures reject beneficiary JWT with `FORBIDDEN` | T-29-AUTH | integration (tRPC caller) | same | ✅ existing | ✅ green |
| SC-5 | `bun run typecheck` passes with 0 errors after router registration | — | typecheck | `bun run typecheck` | ✅ existing | ✅ green |

Additional coverage beyond the 5 SCs (recommended in the test file):
- `firearm.setNfaTransferStatus` happy-path transition (NOT_FILED → FILED → APPROVED)
- `firearm.setNfaTransferStatus` rejects when `isNfa = false` (if router-layer guard is added per RESEARCH §Open Q1)
- `firearm.update` `.omit({ nfaTransferStatus: true })` prevents the field from flowing through generic update (regression for D-03)
- `firearm.update` 23505 mapping (rare serial-edit collision)

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/trpc/firearm.test.ts` — covering SC-1..SC-4 + the
  `setNfaTransferStatus` + update-omit cases above. Uses
  `createCallerFactory(appRouter)` + the existing `createAdminContext()` /
  `createBeneficiaryContext()` helpers in `tests/helpers/mock-context.ts`,
  wrapped in `describe.skipIf(isProductionDb)`. **Backfilled in v5.0.1 (PR #130);
  green.**

*Existing infrastructure (`bun test tests/trpc`, `tsc --noEmit`,
`tests/helpers/mock-context.ts`) covers the rest — no additional helpers,
fixtures, or framework setup needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `firearmRouter` is registered in the appRouter and typed end-to-end (the Phase-30 frontend can `import { trpc }` and see `trpc.firearm.*` autocompleting) | SC-5 | Type-availability for downstream phases is inherent in TypeScript compilation — `bun run typecheck` IS the test, but the spot-check that the IDE sees the new procedures is human-only | After execution, open any client component and confirm `trpc.firearm.list.useQuery({ entityId })` autocompletes and accepts the input shape |

---

## Validation Sign-Off

- [x] All 5 SCs have an `<automated>` verify OR a Wave 0 dependency
- [x] Sampling continuity: every task has automated verify; no 3-consecutive-without window
- [x] Wave 0 covers all MISSING references (`tests/trpc/firearm.test.ts` exists + green)
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-06-08

---

## Validation Audit 2026-06-08

Retroactive Nyquist backfill (`/gsd:validate-phase 29`). The phase's automated
contract — `tests/trpc/firearm.test.ts` covering SC-1..SC-4 (entity scoping,
duplicate-serial CONFLICT, cross-entity NOT_FOUND, beneficiary FORBIDDEN) plus the
NFA-transition and update-omit regressions — was already backfilled in v5.0.1
(PR #130) and runs green; SC-5 is `bun run typecheck`. All 5 success criteria are
COVERED. No tests were generated this pass; status updated to reflect existing
coverage.

| Metric | Count |
|--------|-------|
| Gaps found | 0 (all COVERED) |
| Resolved | 0 (coverage pre-existing) |
| Escalated | 0 |
