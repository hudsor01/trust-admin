---
phase: 30-firearms-admin-page
plan: 01
subsystem: ui
tags: [admin-page, firearm, nfa, datatable, wizard, cqs]

requires:
  - phase: 28-firearm-schema-and-migration
    provides: firearm types, Zod schemas, firearmRelations, live DB
  - phase: 29-firearm-trpc-router
    provides: firearmRouter (6 procedures including setNfaTransferStatus)
provides:
  - /firearms admin route (Server Component + 3 route files)
  - FirearmsClient orchestrator with entity-gated list + KpiStrip + mutations
  - FirearmDialog (3-step wizard, NFA-conditional section, nfaTransferStatus omitted)
  - FirearmTable (9 visible + 21 hidden columns, location excluded from CSV, NFA pill)
  - FirearmRowDetail (3-section panel + Update Form 5 Status trigger)
  - NfaStatusDialog (sole UI path to setNfaTransferStatus)
  - 3 lib additions (FIREARM_WIZARD_STEPS, firearmFormDefaults, 9 STATUS_VARIANTS + 5 label maps)
affects: [31-asset-aggregator-integration, 32-sidebar-nav-alphabetization]

tech-stack:
  added: []
  patterns:
    - "Asset admin page (8th iteration) — copy-and-modify from VehiclesClient with NFA + CQS additions"
    - "CQS UI affordance: dedicated NfaStatusDialog separated from generic FirearmDialog — single path to mutate nfaTransferStatus"
    - "formInstance.Subscribe<boolean> conditional section — first use in an asset dialog (ContactDialog precedent)"
    - "Drizzle CONFLICT handling on the client: TRPCClientError + err.data?.code === 'CONFLICT' + toast + keep-dialog-open"
    - "DataTable meta.excludeFromExport + initialColumnVisibility.location=false — defense-in-depth for sensitive CSV columns"

key-files:
  created:
    - src/app/(admin)/firearms/page.tsx
    - src/app/(admin)/firearms/loading.tsx
    - src/app/(admin)/firearms/error.tsx
    - src/app/(admin)/firearms/_components/FirearmsClient.tsx
    - src/app/(admin)/firearms/_components/FirearmDialog.tsx
    - src/app/(admin)/firearms/_components/FirearmTable.tsx
    - src/app/(admin)/firearms/_components/FirearmRowDetail.tsx
    - src/app/(admin)/firearms/_components/NfaStatusDialog.tsx
  modified:
    - src/lib/asset-wizard-steps.ts
    - src/lib/form-factory.ts
    - src/lib/constants.ts

key-decisions:
  - "Tasks 1-7 committed as a single atomic commit because the components are tightly coupled (page.tsx imports FirearmsClient which imports FirearmTable which imports FirearmRowDetail which imports NfaStatusDialog) — a partial commit fails the pre-commit typecheck on dangling imports"
  - "FirearmDialog OMITS nfaTransferStatus from every form field — D-03 binding from Phase 29 honored end-to-end"
  - "NfaStatusDialog is the ONLY component calling trpc.firearm.setNfaTransferStatus.useMutation — verified by grep across _components/*.tsx"
  - "FirearmsClient.update mutation uses BLANKET utils.firearm.byId.invalidate() — useResourceForm.onSuccess doesn't expose the row id in scope; safe over-invalidation matches row-detail re-render needs. Distinct from NfaStatusDialog which has direct access to firearm.id and uses the scoped form."
  - "23505 → CONFLICT is detected on the client via TRPCClientError instance + err.data?.code === 'CONFLICT' (the router catches the Drizzle wrapper at err.cause, so the client side just reads err.data.code)"
  - "Recordkeeping-not-legal-advice disclaimer surfaces in 3 places (FirearmDialog NFA section + FirearmRowDetail Section 2 + NfaStatusDialog body) — per PITFALLS §scope-note"

patterns-established:
  - "CQS UI pattern: when a backend dedicates a state-transition mutation (like setNfaTransferStatus), the UI builds a dedicated dialog component that is the SOLE caller — and the field is omitted from the generic edit form to enforce single-path-to-change at the UI layer too"
  - "DataTable sensitive-column treatment: when a column is genuinely sensitive (location for firearms), hide it from initialColumnVisibility — CSV export inherits visibility, so this is defense-in-depth without a separate CSV opt-in flag"

requirements-completed: [FIRE-06, FIRE-07]

duration: ~60min
completed: 2026-05-21
---

# Plan 30-01: /firearms Admin Page

**Ships the 8th asset admin page in the trust-admin pattern — full CRUD + sort/filter/CSV via DataTable, plus a CQS-style NfaStatusDialog as the sole UI path for ATF Form 5 transitions, plus NFA-conditional dialog/row-detail sections and the recordkeeping-not-legal-advice disclaimer in 3 surfaces.**

## Performance

- **Duration:** ~60 minutes (2 commit cycles + UAT)
- **Completed:** 2026-05-21
- **Tasks:** 7 implementation + 1 UAT checkpoint
- **Files created:** 8 (3 route + 5 components)
- **Files modified:** 3 (lib)

## Accomplishments

- **Task 1 — lib utilities:** `firearmFormDefaults` (27 fields, intentionally omits `nfaTransferStatus`), `FIREARM_WIZARD_STEPS` (identity → valuation → ownership), 9 new `STATUS_VARIANTS` keys, 5 label maps (firearm type, NFA class, ATF form type, condition, NFA transfer status).
- **Task 2 — route shell:** Server Component `page.tsx` with `HydrationBoundary` + prefetch (`firearm.list` + `entity.list`); `loading.tsx` with 4-card Skeleton matching the KpiStrip; `error.tsx` as verbatim `AdminError` copy.
- **Task 3 — FirearmDialog:** 3-step `ResourceDialog` wizard. NFA Classification subsection toggles via `formInstance.Subscribe<boolean>` on `isNfa` — when true, renders nfaClass / atfFormType / nfaRegistered switch / atfControlNumber / taxStampDate / nfrtrSerial + the recordkeeping disclaimer. `nfaTransferStatus` field is absent (D-03 honored).
- **Task 4 — NfaStatusDialog:** Bare shadcn `Dialog` (not `ResourceDialog` — small focused state-transition affordance). Local `useState` for status + taxStampDate + atfControlNumber, with conditional inputs (`atfControlNumber` on FILED|APPROVED, `taxStampDate` on APPROVED). Calls `trpc.firearm.setNfaTransferStatus.useMutation` — the ONLY component allowed to. Invalidates list + scoped byId on success. Disclaimer "This app does not file ATF forms..." present.
- **Task 5 — FirearmRowDetail:** 3-section panel. Physical Details (always visible) lists barrel length, action type, caliber, condition, location, insured, acquisition data, notes. NFA Classification (conditional on `isNfa`) shows the violet `--milestone` "NFA" pill, NFA fields, transfer-status badge + "Update Form 5 Status" trigger, unregistered-NFA warning (`--warning` token alert when `nfaRegistered=false`), and the persistent recordkeeping disclaimer. Related Records section uses the Phase 29 `byId` eager-load (`entity`, `valuations`, `documents`) — single round-trip, no fetch waterfall.
- **Task 6 — FirearmTable:** DataTable with 9 visible default columns (select + name + make/model + serial# + type/NFA badge + condition + DOD value + transfer + actions) and 21 columns hidden via `initialColumnVisibility` (incl. `location: false` per PITFALLS §13 and `nfaTransferStatus: false`). Pencil + Trash2 row-action buttons wrapped in Tooltip with `aria-label`. `actions` column carries `meta: { excludeFromExport: true }` so CSV exports include `serialNumber` (legal identifier) but exclude action buttons and the hidden `location`. Bulk-delete via `bulkActions: [{ label: 'Delete', variant: 'destructive', ... }]`.
- **Task 7 — FirearmsClient orchestrator:** Entity-gated list query (`{ enabled: !!entityId }`); three mutations with onSuccess invalidation; **23505 → CONFLICT** detection (`TRPCClientError` + `err.data?.code === 'CONFLICT'` → toast "A firearm with this serial number already exists." + `return` to keep the dialog open); sequential bulk-delete with partial-failure toast; ConfirmDialog wired via `useConfirmDialog` with title "Delete Firearm" + body "Are you sure you want to delete this firearm? This action cannot be undone." + confirmText "Delete Firearm"; KpiStrip computes 4 cards (count, total DOD value, transfer % complete, NFA items).
- **Task 8 — UAT:** Operator confirmed all 12 verification checks pass (SC-1..SC-5 + NFA workflow + unregistered warning + non-NFA hidden UI + entity gating + static gates).

## ROADMAP Success Criteria Coverage

| # | Criterion | Verification |
|---|-----------|--------------|
| SC-1 | `/firearms` lists firearm records for the selected entity | ✓ UAT: page renders, empty state correct, KpiStrip 4 cards |
| SC-2 | Admin can create a new firearm via the form | ✓ UAT: 3-step wizard creates a row; CONFLICT toast on duplicate serial keeps dialog open |
| SC-3 | Admin can edit any field | ✓ UAT: dialog edit ("Save Changes") + inline-edit (name/dodValue/condition/transferStatus) |
| SC-4 | Admin can delete a firearm; success toast shown | ✓ UAT: single delete via ConfirmDialog; bulk delete with `Deleted N firearms` toast |
| SC-5 | Sort by any column + filter by text + CSV export | ✓ UAT: column-click sort; search filters; CSV download excludes `location` + actions/select |

## Task Commits

| Task | Commit | What |
|------|--------|------|
| Task 1 (attempted, rejected by hook because of incomplete tree) | — | Working-tree-only — followed by full commit below |
| Tasks 1 + 2 + 3 + 4 + 5 + 6 + 7 (combined) | `454d5a1` | Full /firearms admin page — lib utilities + route shell + 5 component files |
| Phase complete | (this summary) | docs(30-01): summary + verification + ROADMAP/STATE marking |

## Files Created/Modified

### New (8)
- `src/app/(admin)/firearms/page.tsx` — Server Component
- `src/app/(admin)/firearms/loading.tsx` — Skeleton
- `src/app/(admin)/firearms/error.tsx` — ErrorBoundary
- `src/app/(admin)/firearms/_components/FirearmsClient.tsx` — orchestrator (~250 lines)
- `src/app/(admin)/firearms/_components/FirearmDialog.tsx` — 3-step wizard (~720 lines, 27 fields)
- `src/app/(admin)/firearms/_components/FirearmTable.tsx` — DataTable (30 columns total)
- `src/app/(admin)/firearms/_components/FirearmRowDetail.tsx` — 3-section detail panel
- `src/app/(admin)/firearms/_components/NfaStatusDialog.tsx` — dedicated CQS dialog

### Modified (3)
- `src/lib/asset-wizard-steps.ts` — added `FIREARM_WIZARD_STEPS`
- `src/lib/form-factory.ts` — added `firearmFormDefaults` (no `nfaTransferStatus`)
- `src/lib/constants.ts` — extended `STATUS_VARIANTS` + 5 new label maps

## Decisions Made

1. **One commit covering Tasks 1-7** (instead of one per task). The pre-commit hook runs typecheck + tests against the working tree, so a partial commit (e.g., Task 1 alone) fails because `page.tsx` imports `./_components/FirearmsClient` which doesn't exist yet. Combining the 7 tasks into a single atomic commit preserves the spirit of "atomic deliverables" (the commit message enumerates each task's contribution) without artificial fragmentation.

2. **Blanket `byId` invalidation in FirearmsClient.update mutation** (vs. scoped in NfaStatusDialog). `useResourceForm.onSuccess` doesn't expose the row id; blanket form invalidates all `byId` queries — safe over-invalidation that matches the row-detail re-render need. `NfaStatusDialog` has direct access to `firearm.id` and uses the scoped form. The distinction is documented inline.

3. **Tooltip + aria-label on both row-action buttons** (Pencil edit / Trash2 delete). Plan-checker FLAG addressed during UI-SPEC iteration; this ships the accessibility-correct version from day one.

## Deviations from Plan

### Task 6 `getRowDetail` signature mismatch (caught during typecheck)

**Issue:** The plan's pattern (and the original draft) used `getRowDetail={(row) => <FirearmRowDetail firearm={row.original} />}`. The actual `DataTable` API passes the row data directly: `getRowDetail?: (row: TData) => React.ReactNode`. Typecheck failed with `Property 'original' does not exist on type Firearm`.

**Fix:** Changed signature to `getRowDetail={(firearm) => <FirearmRowDetail firearm={firearm} />}`. The plan's reference to `row.original` was a pattern carry-over from `ColumnDef.cell` where the argument IS the cell-context object with `.original`. The DataTable's `getRowDetail` is simpler — direct row data.

### Task 1 isolated commit was rejected by pre-commit hook

**Issue:** I initially attempted to commit Task 1's lib changes alone. The working tree at that moment contained the `page.tsx` route file (Task 2 prep, written ahead) which imports `./_components/FirearmsClient` — a file that didn't exist yet. Typecheck failed → hook rejected.

**Fix:** Restructured to a single commit covering all 7 tasks. The plan's task-atomicity intent is preserved in the commit message.

## Notes for Next Phase (31)

The page is functional but does NOT yet appear in the unified `/assets` view or the dashboard KPIs — both `asset.ts:listAll` and `dashboard.ts:summary` are hardcoded 7-table fan-outs that silently omit firearms. Phase 31 fixes this — these are the "looks done but isn't" integration traps the milestone research called out.

The sidebar nav also does not yet include a "Firearms" link — that's Phase 32 work (alphabetize Assets sub-nav + insert Firearms).

For now: the page is reachable by typing `/firearms` in the URL. After Phase 32 ships, it'll be one click from the Assets group in the sidebar.
