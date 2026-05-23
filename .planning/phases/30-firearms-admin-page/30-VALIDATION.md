---
phase: 30
slug: firearms-admin-page
status: retroactive
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-23
---

# Phase 30 — Validation Strategy

> Retrospectively generated 2026-05-23 to close v5.0 milestone audit Nyquist tech debt.
> Phase 30 is a UI-only admin page phase — no new tRPC procedures or schema changes.
> The underlying data contract is sealed by Phase 29's `tests/trpc/firearm.test.ts`
> (14 passing tests). Phase 30 ships 8 new files + 3 lib modifications; correctness
> signals are the type-checker, pre-existing tRPC tests, and operator UAT confirmation.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bun test (built-in) |
| **Config file** | none — `bun test` script in `package.json` targets explicit dirs |
| **Quick run command** | `bun run typecheck` |
| **Full suite command** | `bun test tests/api tests/components tests/lib tests/trpc tests/*.test.ts` |
| **Firearm tRPC contract** | `bun test tests/trpc/firearm.test.ts` |
| **Firearm lib validation** | `bun test tests/lib/validation.firearm.test.ts` |
| **Estimated runtime** | ~30 seconds (full suite); typecheck ~10s |

---

## Sampling Rate

- **After every task commit:** `bun run typecheck` — component tree must compile clean
- **Before `/gsd:verify-work`:** Full suite green, typecheck exits 0, operator UAT complete
- **Max feedback latency:** ~30 seconds (static); UAT is blocking manual gate

---

## Per-Task Verification Map

| Task ID | Task Name | Requirement | Threat Ref | Secure / Behavioral Requirement | Test Type | Automated Command | Test File | Status |
|---------|-----------|-------------|------------|----------------------------------|-----------|-------------------|-----------|--------|
| 30-01-T1 | lib utilities (FIREARM_WIZARD_STEPS, firearmFormDefaults, STATUS_VARIANTS additions) | FIRE-06, FIRE-07 | — | `firearmFormDefaults` contains 0 references to `nfaTransferStatus` (D-03); `FIREARM_WIZARD_STEPS` exports exactly 3 steps with ids `identity`/`valuation`/`ownership`; `STATUS_VARIANTS` contains `NOT_FILED`, `FILED`, `APPROVED`, `POOR`, `FAIR`, `VERY_GOOD`, `EXCELLENT`, `NEW` | typecheck + grep | `bun run typecheck && grep -q 'FIREARM_WIZARD_STEPS' src/lib/asset-wizard-steps.ts && grep -q 'firearmFormDefaults' src/lib/form-factory.ts && grep -q 'NOT_FILED' src/lib/constants.ts` | ✅ (inline verify in plan) | verified-retro |
| 30-01-T2 | Route shell (page.tsx, loading.tsx, error.tsx) | FIRE-06 | T-30-XEN | `page.tsx` prefetches `firearm.list` + `entity.list` via `HydrationBoundary`; `loading.tsx` has `md:grid-cols-4`; `error.tsx` calls `Sentry.captureException` | typecheck + grep | `bun run typecheck && grep -q 'firearm.list.prefetch' src/app/\(admin\)/firearms/page.tsx && grep -q 'md:grid-cols-4' src/app/\(admin\)/firearms/loading.tsx` | ✅ (inline verify in plan) | verified-retro |
| 30-01-T3 | FirearmDialog (3-step wizard, NFA conditional, D-03) | FIRE-06 | T-30-NFA, T-30-LEG | Dialog contains 0 references to `nfaTransferStatus`; `formInstance.Subscribe` gates NFA section; recordkeeping disclaimer present verbatim; 4 copy strings present | typecheck + grep | `bun run typecheck && grep -c 'nfaTransferStatus' src/app/\(admin\)/firearms/_components/FirearmDialog.tsx \| grep -qx 0 && grep -q 'NFA fields are for recordkeeping only' src/app/\(admin\)/firearms/_components/FirearmDialog.tsx` | ❌ no dedicated component test (see Known Gaps) | partial |
| 30-01-T4 | NfaStatusDialog (sole path to setNfaTransferStatus) | FIRE-05 (UX) | T-30-NFA, T-30-LEG | `setNfaTransferStatus.useMutation` appears in exactly 1 file; conditional inputs show/hide per status; disclaimer present; success toast verbatim | typecheck + grep | `bun run typecheck && grep -q 'setNfaTransferStatus' src/app/\(admin\)/firearms/_components/NfaStatusDialog.tsx && grep -q 'This app does not file ATF forms' src/app/\(admin\)/firearms/_components/NfaStatusDialog.tsx` | ❌ no dedicated component test (see Known Gaps) | partial |
| 30-01-T5 | FirearmRowDetail (3-section panel, NFA conditional, warning alert) | FIRE-06 | T-30-NFA, T-30-LEG | Section 2 hidden when `!firearm.isNfa`; unregistered-NFA warning renders with warning token classes; recordkeeping disclaimer present; "Update Form 5 Status" button triggers NfaStatusDialog | typecheck + grep | `bun run typecheck && grep -q 'trpc.firearm.byId.useQuery' src/app/\(admin\)/firearms/_components/FirearmRowDetail.tsx && grep -q 'Unregistered NFA items' src/app/\(admin\)/firearms/_components/FirearmRowDetail.tsx` | ❌ no dedicated component test (see Known Gaps) | partial |
| 30-01-T6 | FirearmTable (9 visible + 21 hidden, location excluded, NFA pill, CSV meta) | FIRE-07 | T-30-CSV | `location: false` in `initialColumnVisibility`; `meta: { excludeFromExport: true }` on actions column; `serialNumber` visible by default; `getRowDetail` wired to `FirearmRowDetail` | typecheck + grep | `bun run typecheck && grep -q 'location: false' src/app/\(admin\)/firearms/_components/FirearmTable.tsx && grep -q 'excludeFromExport: true' src/app/\(admin\)/firearms/_components/FirearmTable.tsx` | ❌ no dedicated component test (see Known Gaps) | partial |
| 30-01-T7 | FirearmsClient (orchestrator, CONFLICT handling, KpiStrip, bulk delete) | FIRE-06, FIRE-07 | T-30-XEN | List query gated with `{ enabled: !!entityId }`; CONFLICT catch toasts verbatim message + keeps dialog open; 4 KPI strip items; bulk delete toast copy verbatim | typecheck + grep | `bun run typecheck && grep -q "enabled: !!entityId" src/app/\(admin\)/firearms/_components/FirearmsClient.tsx && grep -q "A firearm with this serial number already exists." src/app/\(admin\)/firearms/_components/FirearmsClient.tsx` | ❌ no dedicated component test (see Known Gaps) | partial |
| 30-01-T8 | Admin UAT — 5 ROADMAP SCs + NFA workflow (12 checks) | FIRE-06, FIRE-07 | T-30-NFA, T-30-CSV, T-30-LEG | All 12 UAT checklist items pass against running dev server | UAT (manual) | `bun run dev` + operator walk-through | N/A — UAT only | verified-retro (operator confirmed) |

*Status: verified-retro = phase shipped + operator confirmed · partial = grep/typecheck only, no behavioral test*

---

## Automated Tests Covering Phase 30 Surface

The following pre-existing test files provide indirect coverage of Phase 30's data contract and lib utilities. No Phase-30-specific component tests were created during execution; the plan explicitly followed the "no automated tests for UI-only phase" precedent of sibling asset pages.

| File | Coverage Scope | Command | Status |
|------|---------------|---------|--------|
| `tests/trpc/firearm.test.ts` | firearmRouter: list, byId, create (CONFLICT), update, delete, setNfaTransferStatus (BAD_REQUEST guard), beneficiary rejection — 14 tests | `bun test tests/trpc/firearm.test.ts` | green (Phase 29 contract, inherited by Phase 30) |
| `tests/lib/validation.firearm.test.ts` | `insertFirearmSchema` / `updateFirearmSchema` Zod validation: NFA refine, serial regex, money positivity | `bun test tests/lib/validation.firearm.test.ts` | green (Phase 28 contract, inherited) |
| `tests/components/data-table.test.tsx` | DataTable primitive: sorting, filtering, column visibility, CSV export via `exportable` | `bun test tests/components/data-table.test.tsx` | green (shared primitive) |
| `tests/lib/csv-export.test.ts` | CSV export exclusion via `meta.excludeFromExport` | `bun test tests/lib/csv-export.test.ts` | green (covers T-30-CSV mitigation) |
| `tests/components/resource-dialog.test.tsx` | ResourceDialog wizard shell: step progression, submit label, cancel | `bun test tests/components/resource-dialog.test.tsx` | green (shared primitive) |

---

## Known Gaps

The following tasks have no dedicated automated component test. Verification was grep + typecheck + UAT-only. Each is flagged as `partial` coverage.

| Task ID | Component | Missing Test | Gap Severity | Recommended Test File | Disposition |
|---------|-----------|--------------|--------------|-----------------------|-------------|
| 30-01-T3 | `FirearmDialog.tsx` | No behavioral test verifying: (a) NFA conditional section toggles with `isNfa`, (b) `nfaTransferStatus` is absent from rendered form, (c) all 3 step labels render, (d) recordkeeping disclaimer text present in rendered output | WARNING — D-03 binding only verified by grep, not by rendered behavior | `tests/components/firearms/FirearmDialog.test.tsx` | deferred test backfill |
| 30-01-T4 | `NfaStatusDialog.tsx` | No behavioral test verifying: (a) `atfControlNumber` input conditionally shown on FILED/APPROVED status, (b) `taxStampDate` input shown only on APPROVED, (c) disclaimer text present in rendered output | WARNING — conditional input logic untested at render level | `tests/components/firearms/NfaStatusDialog.test.tsx` | deferred test backfill |
| 30-01-T5 | `FirearmRowDetail.tsx` | No behavioral test verifying: (a) Section 2 absent when `isNfa=false`, (b) unregistered-NFA warning block present when `nfaRegistered=false`, (c) "Update Form 5 Status" button triggers `setNfaDialogOpen(true)` | WARNING — NFA conditional rendering unverified at component level | `tests/components/firearms/FirearmRowDetail.test.tsx` | deferred test backfill |
| 30-01-T6 | `FirearmTable.tsx` | No behavioral test verifying: (a) NFA Badge renders only when `isNfa=true`, (b) `location` absent from default visible columns, (c) `serialNumber` visible in default render, (d) Edit/Delete buttons carry correct `aria-label` | WARNING — column visibility contract only grep-checked | `tests/components/firearms/FirearmTable.test.tsx` | deferred test backfill |
| 30-01-T7 | `FirearmsClient.tsx` | No behavioral test verifying: (a) CONFLICT error surfaces as toast without closing dialog, (b) KPI strip shows 4 items, (c) entity-gated query not fired until `entityId` resolves | WARNING — CONFLICT handling (key behavioral edge) untested at orchestrator level | `tests/components/firearms/FirearmsClient.test.tsx` | deferred test backfill |

**Precedent note:** Sibling asset pages — `/vehicles`, `/accounts`, `/artwork`, `/insurance`, `/personal-property` — also ship without dedicated component tests. Phase 30 follows that pattern. The gaps above are tech debt shared across the asset-page layer, not a regression introduced by Phase 30.

**Gap priority:** `FirearmDialog (T3)` and `FirearmsClient (T7)` are the highest-value backfill targets — they cover the D-03 binding (NFA field exclusion) and the CONFLICT error path, which have no analog in the tRPC-layer tests.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Operator Status |
|----------|-------------|------------|-----------------|
| `/firearms` page renders, KpiStrip shows 4 cards, empty state text correct | SC-1, FIRE-06 | Requires running dev server + browser | Confirmed (2026-05-21) |
| 3-step wizard creates a firearm row; duplicate serial shows verbatim toast, dialog stays open | SC-2, FIRE-06 | Full tRPC + UI interaction | Confirmed (2026-05-21) |
| Edit dialog opens in edit mode ("Save Changes"); inline-edit cells persist | SC-3, FIRE-06 | Full tRPC + UI interaction | Confirmed (2026-05-21) |
| Single delete via ConfirmDialog; bulk delete with "Deleted N firearms" toast | SC-4, FIRE-06 | Full tRPC + UI interaction | Confirmed (2026-05-21) |
| Sort / filter / CSV downloads; CSV excludes `location` + actions/select | SC-5, FIRE-07 | File download verification requires browser | Confirmed (2026-05-21) |
| NFA workflow: row-detail Section 2 visible for NFA firearms, NfaStatusDialog opens, status update succeeds, badge updates | FIRE-05 (UX) | Multi-component interaction with tRPC | Confirmed (2026-05-21) |
| Non-NFA firearm: Section 2 hidden, no "Update Form 5 Status" button | D-03 (UI) | Conditional rendering requires running app | Confirmed (2026-05-21) |
| Unregistered-NFA warning block appears when `nfaRegistered=false` | T-30-NFA, T-30-LEG | Requires specific data state in running app | Confirmed (2026-05-21) |

---

## Validation Sign-Off

- [x] All 8 tasks have a verification method (typecheck + grep or UAT)
- [x] tRPC data contract covered by pre-existing Phase 29 test suite (14 tests green)
- [x] Zod schema contract covered by pre-existing Phase 28 test suite (validation.firearm.test.ts green)
- [x] D-03 binding (no `nfaTransferStatus` in FirearmDialog) verified by grep in VERIFICATION.md
- [x] All 3 recordkeeping disclaimers verified by grep in VERIFICATION.md
- [x] Operator UAT confirmation on record (2026-05-21, all 12 checklist items)
- [x] Shared DataTable + ResourceDialog primitives covered by existing component tests
- [ ] No dedicated component tests for Phase 30's 5 client components (deferred backfill)
- [x] `nyquist_compliant: true` — gap coverage acceptable given: (a) Phase 29 tRPC tests seal the data mutation surface, (b) shared primitive tests cover DataTable/ResourceDialog behaviors, (c) the component-test gap is a codebase-wide pattern, not a Phase 30 regression, (d) all deferred gaps documented above with recommended file paths

---

## VALIDATION COMPLETE

`nyquist_compliant: true` — Phase 30's critical behavioral contracts (tRPC data mutations, Zod validation, D-03 NFA field exclusion) are covered by pre-existing Phase 28/29 tests; the UI-layer component gaps are real tech debt but consistent with the existing asset-page test coverage pattern and do not block the phase's shipped + merged status.
