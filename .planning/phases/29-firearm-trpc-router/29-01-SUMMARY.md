---
phase: 29-firearm-trpc-router
plan: 01
subsystem: api
tags: [trpc, firearm, asset-router, cqs, nfa, zod, drizzle]

requires:
  - phase: 28-firearm-schema-and-migration
    provides: firearm table + types + insertFirearmSchema + insertFirearmSchemaBase + firearmRelations + live DB
provides:
  - firearmRouter (6 procedures) registered as `firearm: firearmRouter` in appRouter Assets section
  - isFirearmSerialConflict predicate handling both Drizzle wrapper AND raw-SQL shapes
  - tests/trpc/firearm.test.ts — 14 integration tests sealing all 5 ROADMAP SCs + NFA guard + D-03 regression
  - db/validation.ts: insertFirearmSchemaBase publicly exported
affects: [30-firearms-admin-page, 31-asset-aggregator-integration, 32-sidebar-nav-alphabetization]

tech-stack:
  added: []
  patterns:
    - "CQS state-transition mutation (setNfaTransferStatus) — mirrors hemsRequest.approve / markDistributed"
    - "byId with eager-loaded relations + explicit NOT_FOUND guard — extends liability.byId precedent with the deviation ROADMAP SC-3 requires"
    - "Drizzle-error-aware 23505 predicate — checks both top-level err and err.cause; matches both Drizzle wrapper and raw Neon HTTP"
    - "nfaTransferStatus omitted from generic update via insertFirearmSchemaBase.omit().partial().refine() inline — Zod v4 workaround for the .partial()-on-refined-schema restriction"

key-files:
  created:
    - src/server/trpc/routers/firearm.ts
    - tests/trpc/firearm.test.ts
  modified:
    - src/server/trpc/router.ts
    - db/validation.ts

key-decisions:
  - "Followed CONTEXT.md D-01..D-09 with two RESEARCH-driven corrections to the implementation expression (D-03 inline expression; byId explicit NOT_FOUND)"
  - "isFirearmSerialConflict predicate handles both Drizzle's DrizzleQueryError wrapper (err.cause) AND raw Neon HTTP shape (err.code top-level) — discovered the wrapper variant when SC-2 test fell through to INTERNAL_SERVER_ERROR on the live DB"
  - "NFA guard locked IN in setNfaTransferStatus per RESEARCH Finding 6 — preflight findFirst + BAD_REQUEST when !existing.isNfa"
  - "No activity-log emission anywhere (D-09 confirmed in RESEARCH Finding 1 — zero asset routers do this)"

patterns-established:
  - "Drizzle 23505 catch pattern: when catching 23505 inside a Drizzle insert/update, check both err and err.cause for code+constraint match — raw postgres.js/Neon HTTP exposes them at the top level, but Drizzle wraps them in DrizzleQueryError"

requirements-completed: [SC-1, SC-2, SC-3, SC-4, SC-5]

duration: ~35min
completed: 2026-05-21
---

# Plan 29-01: Firearm tRPC Router

**Ships the `firearmRouter` (6 procedures), registers it in `appRouter`, and seals all 5 ROADMAP success criteria with a 14-test integration suite against the live test-branch DB.**

## Performance

- **Duration:** ~35 minutes (3 commit cycles; one extra cycle for a SC-2 defect surfaced by Task 3's tests and fixed inline)
- **Completed:** 2026-05-21
- **Tasks:** 3 (collapsed into 2 commits — Tasks 2 and 3 shipped together because Task 3's tests surfaced the SC-2 defect in Task 1's predicate)
- **Files modified:** 4 (2 new + 2 modified)

## Accomplishments

- `db/validation.ts` — 1-word edit: `export` prepended to `const insertFirearmSchemaBase` so the firearm router can import the unrefined base for its update input shape (the D-03 inline expression requires omitting `nfaTransferStatus` BEFORE refining, since Zod v4 throws on `.omit()` against a refined schema).
- `src/server/trpc/routers/firearm.ts` — new 240-line router with 6 procedures (`list`, `byId`, `create`, `update`, `delete`, `setNfaTransferStatus`) and the local `isFirearmSerialConflict` predicate. All procedures are `adminProcedure` and `entityId`-gated. The byId procedure eager-loads `entity + valuations + documents` AND throws an explicit NOT_FOUND on undefined result (the explicit-throw deviation from `liability.byId` that ROADMAP SC-3 requires). `create` and `update` wrap their DB calls in try/catch with the predicate mapping 23505 → CONFLICT; `update`'s catch also re-throws TRPCError instances FIRST so the inner NOT_FOUND isn't rewrapped as CONFLICT (Pitfall 2). `setNfaTransferStatus` follows the `hemsRequest.markDistributed` preflight-then-update CQS shape: findFirst → NOT_FOUND → NFA guard (BAD_REQUEST when `!existing.isNfa`) → atomic update.
- `src/server/trpc/router.ts` — `firearmRouter` imported on line 11 (alphabetical between `entityRouter` and `hemsRequestRouter`) and registered as `firearm: firearmRouter,` on line 39 in the Assets section between `investmentAccount` and `homestead` (alphabetical within the Assets group per CONTEXT.md D-07 + RESEARCH Finding 4). `bun run typecheck` passes immediately — ROADMAP SC-5 sealed.
- `tests/trpc/firearm.test.ts` — new file, 14 integration tests, all green. Coverage: SC-1 entity-scoped list; SC-2 duplicate-serial CONFLICT; SC-3 NOT_FOUND on cross-entity AND nonexistent id (two probes); byId happy-path eager-load verification; SC-4 six beneficiary-JWT-rejection tests (one per procedure); `setNfaTransferStatus` NOT_FILED → FILED → APPROVED happy-path with metadata; `setNfaTransferStatus` BAD_REQUEST on non-NFA firearm (T-29-NFA guard regression); `setNfaTransferStatus` NOT_FOUND on nonexistent firearm; **D-03 regression** confirming `nfaTransferStatus` cannot flow through generic `update` (Zod strips the field; the "at least one field" refine then fires → BAD_REQUEST).

## ROADMAP Success Criteria Coverage

| # | Criterion | Verification |
|---|-----------|--------------|
| SC-1 | `firearm.list({ entityId })` returns entity-scoped rows | Test SC-1 — verified `length ≥ 2` AND every row's `entityId` matches |
| SC-2 | `firearm.create` rejects duplicate serialNumber with `TRPCError({ code: 'CONFLICT' })` | Test SC-2 — verified the SQLSTATE 23505 on `firearm_serial_number_key` flows through the Drizzle wrapper into the predicate and out as CONFLICT |
| SC-3 | `firearm.byId` throws `NOT_FOUND` for cross-entity / nonexistent id | Test SC-3 — verified both probes (real id + wrong entity; nonexistent id + real entity) throw `TRPCError` code `NOT_FOUND` |
| SC-4 | All 6 procedures reject a beneficiary JWT | Six tests, one per procedure, all using `beneficiaryCaller().firearm.<proc>()` with `.rejects.toThrow()` — all green |
| SC-5 | `bun run typecheck` passes with 0 errors after registration | Verified after Task 2's commit (`tsc --noEmit` exits 0) AND again after Task 3's commit |

## Task Commits

| Task | Commit | What it shipped |
|------|--------|-----------------|
| Task 1 | `1e7cd77` | firearm.ts source + `insertFirearmSchemaBase` export — router file in isolation |
| Tasks 2 + 3 | `72bc24c` | router.ts registration + 14-test integration suite + `isFirearmSerialConflict` Drizzle-wrapper fix (Task-3 tests surfaced the defect) |

## Files Created/Modified

- `db/validation.ts` (modified, 1 word) — `export` added to `insertFirearmSchemaBase` so the router can import it
- `src/server/trpc/routers/firearm.ts` (new, ~240 lines) — firearmRouter with 6 procedures + local conflict predicate
- `src/server/trpc/router.ts` (modified) — import line 11 + Assets-section registration line 39
- `tests/trpc/firearm.test.ts` (new, ~340 lines) — 14 integration tests sealing all 5 SCs + NFA guard + D-03 regression

## Decisions Made

1. **Implementation deviated from CONTEXT.md D-03 expression in one specific way** (already telegraphed by RESEARCH Finding 2): used `insertFirearmSchemaBase.omit({ nfaTransferStatus: true }).partial().refine(...)` inline in `update.input.data` instead of `updateFirearmSchema.omit({ nfaTransferStatus: true })`. Zod v4 throws on `.omit()` against a refined schema (same root cause as Phase 28's `.partial()` issue). The INTENT of D-03 — single path to change `nfaTransferStatus` — is preserved: D-03 regression test confirms the field cannot reach the table via generic update.
2. **byId explicitly throws NOT_FOUND** instead of returning undefined like `liability.byId`. This deviation is required by ROADMAP SC-3 and was telegraphed by RESEARCH Finding 3.
3. **NFA guard locked IN** in `setNfaTransferStatus` (RESEARCH Open Q1 — was Claude's discretion). Preflight `findFirst` + `BAD_REQUEST` when `!existing.isNfa`. Cost ~1ms; closes the "non-NFA firearm with NFA tracking data" integrity gap the DB CHECK doesn't enforce.
4. **`isFirearmSerialConflict` checks both top-level and `.cause`** — the CONTEXT.md / RESEARCH.md description copied the `userManagement.ts` predicate verbatim, but the userManagement path uses raw Neon HTTP (`getSql().query()`) where 23505 sits at the top level. Drizzle's `db.insert()` / `db.update()` wraps the error in `DrizzleQueryError` with the original NeonDbError at `err.cause`. The fix checks both shapes so the predicate works regardless of the calling path. This is the only "real" deviation from the plan and the only one that would have been caught only by integration tests.

## Deviations from Plan

### 1. Task 2 and Task 3 committed together (not atomically per the plan)

- **Found during:** Task 2 first commit attempt; pre-commit hook ran the full test suite against the working tree (which contained Task 3's test file already written but not yet committed). The hook surfaced the SC-2 defect.
- **Issue:** Task 1's `isFirearmSerialConflict` predicate did not catch Drizzle's `DrizzleQueryError` wrapper. The duplicate-serial-number SC-2 test threw `INTERNAL_SERVER_ERROR` instead of `CONFLICT`.
- **Fix:** Updated `isFirearmSerialConflict` to also dig into `err.cause`. Committed Tasks 2 and 3 together with the predicate fix to keep the commits passing the hook in order.
- **Why this is safe:** The plan's task atomicity was preserved in spirit: Task 2's `router.ts` registration + Task 3's tests both rely on Task 1's router being importable, and Task 3's tests rely on Task 2's registration. Combining the two later tasks into one commit is a structural simplification, not a scope change. The fix in `firearm.ts` is genuinely Task-3-discovered work (integration tests caught what unit-level reasoning missed) and properly belongs in the commit that ships those tests.

### 2. Transient test infrastructure noise

- **Found during:** Task 1's first commit attempt
- **Issue:** Pre-commit hook reported test failure; manual rerun of the same test suite passed 1033/0. The transient failure appeared to be an ECONNREFUSED noise event that garbled the test runner's exit code.
- **Fix:** Re-ran the commit. Hook passed on retry.
- **Why this is safe:** No source code change was needed; the working tree state that the first attempt rejected is bit-identical to the state the second attempt accepted.

## Notes for Next Plan (30-firearms-admin-page)

The router is now publicly callable from any client component:

```typescript
const { data } = trpc.firearm.list.useQuery({ entityId: selectedEntity! })
const create = trpc.firearm.create.useMutation()
const setNfa = trpc.firearm.setNfaTransferStatus.useMutation()
```

All 6 procedure types end-to-end-typed and autocompleting. The byId eager-load means a Phase 30 row-expand detail view can render `firearm + entity + valuations + documents` with one round-trip; no client-side document/valuation refetch needed.

The Drizzle-wrapper conflict pattern surfaced here is reusable — if any future asset router needs unique-constraint→CONFLICT mapping, copy the `isFirearmSerialConflict` shape (check both `err` and `err.cause`) instead of the older `userManagement.isBeneficiaryLinkUniqueViolation` shape (which only handles raw Neon HTTP errors).
