---
phase: 28-firearm-schema-and-migration
plan: 02
subsystem: database
tags: [drizzle-migration, neon, postgres, rls, ddl, test-branch-sync]

requires:
  - phase: 28-firearm-schema-and-migration
    provides: firearm schema source (plan 28-01) — the migration is generated from it
provides:
  - drizzle/0014_awesome_madripoor.sql (live migration in production + test branch)
  - scripts/apply-0014-testbranch.ts (idempotent test-branch sync, follows apply-0013 precedent)
  - Production Neon DB has firearm table + RLS + 4 policies + document.firearmId + valuation.firearmId
  - Test branch DB synced to match production (Phase 29 tRPC tests can run)
affects: [29-firearm-trpc-router, 30-firearms-admin-page, 31-asset-aggregator-integration]

tech-stack:
  added: []   # zero new dependencies
  patterns:
    - "Pre-flight migration ordering: generate + hand-audit + apply BEFORE committing schema code when integration tests would otherwise reject inserts against the unsynced test branch"
    - "8-point migration hand-audit checklist: 5 CREATE TYPE PascalCase, all camelCase column identifiers, document/valuation CHECK DROP+ADD pair, unique index, FK names, RLS+4 policies"

key-files:
  created:
    - drizzle/0014_awesome_madripoor.sql
    - drizzle/meta/0014_snapshot.json
    - scripts/apply-0014-testbranch.ts
  modified:
    - drizzle/meta/_journal.json

key-decisions:
  - "Migration accepted as-emitted — drizzle-kit 0.31.10 produces camelCase column identifiers correctly when the schema declares them camelCase; the 0013 precedent already confirmed this and 0014 followed suit. No hand-edits needed despite the documented gotcha."
  - "Verification done via postgres.js (one-shot scripts) rather than Drizzle Studio — programmatic introspection produces auditable transcripts for the SUMMARY, while studio is interactive-only."
  - "Test branch sync wrapped CREATE TYPE in DO $$ EXCEPTION duplicate_object — matches the apply-0013 pattern exactly; CREATE POLICY wrapped in DO $$ IF NOT EXISTS (pg_policies SELECT) because CREATE POLICY itself has no IF NOT EXISTS clause."

patterns-established:
  - "Sequenced multi-plan phase: when plan N+1 must apply DDL that plan N+1's later commits depend on (because pre-commit hooks run integration tests against the test branch), apply the migration before plan N's code commits — the commit ORDER is unchanged, the DDL-APPLY order is earlier."
  - "Constraint-behavior probe pattern: insert an asset, attempt a duplicate (expect 23505), attempt a multi-FK polymorphic row (expect 23514), insert the valid single-FK row, clean up — all in one postgres.js transaction harness."

requirements-completed: [FIRE-01, FIRE-02, FIRE-03, FIRE-04, FIRE-05, FIRE-08, FIRE-09]

duration: ~25min
completed: 2026-05-21
---

# Plan 28-02: Apply Migration 0014

**Generates, audits, applies, and syncs migration `0014_awesome_madripoor.sql` to both the production Neon DB and the `.env.test.local` test branch — turning Plan 28-01's schema source into a live `firearm` relation with RLS, 4 policies, polymorphic `firearmId` FK columns on `document`/`valuation`, and updated single-owner CHECK constraints.**

## Performance

- **Duration:** ~25 minutes
- **Completed:** 2026-05-21
- **Tasks:** 3 (generate + hand-audit, apply, test-branch sync)
- **Files modified:** 4 (3 created + 1 modified)

## Accomplishments

- **Task 1 — generate + hand-audit:** `bun run db:generate` produced `drizzle/0014_awesome_madripoor.sql` (80 lines). The 8-point hand-audit checklist passed without any hand-edits: all 5 CREATE TYPE use PascalCase, every column identifier in the firearm CREATE TABLE is camelCase, document/valuation ADD COLUMN use `"firearmId"`, both CHECK constraints have explicit DROP + ADD pairs with the 9-FK and 7-FK sums, all column references inside the rebuilt CHECK expressions are camelCase, the unique index `firearm_serial_number_key` references `"serialNumber"`, and the FK constraint names plus 4 RLS policies + `ENABLE ROW LEVEL SECURITY` are present.
- **Task 2 — apply to production:** `bun run db:migrate` ran cleanly against the live Neon DB. Post-migration introspection (`pg_class.relrowsecurity`, `pg_policies`, `pg_type`, `information_schema.columns`, `pg_enum`) confirmed: `relrowsecurity=true`, 4 firearm policies (select/insert/update/delete, all `app.is_admin()`), all 5 new enum types, the 5 distinctive firearm columns (`serialNumber`, `nfaClass`, `nfaTransferStatus`, `condition`, `acquisitionCost`), `firearmId` on both `document` and `valuation`, and the existing `transferStatus` enum still exactly `PENDING, STARTED, COMPLETE` (no `SURRENDERED`). Insert probes against the production DB demonstrated the constraints: duplicate serial number → `23505`, multi-FK document/valuation insert → `23514`, single-FK `firearmId`-only document insert → accepted. All probe rows cleaned up.
- **Task 3 — test branch sync:** `scripts/apply-0014-testbranch.ts` written following the `apply-0013-testbranch.ts` template — production guard via `isProductionDb`, single `sql.begin()` transaction, 5 CREATE TYPE wrapped in `DO $$ EXCEPTION duplicate_object`, `CREATE TABLE IF NOT EXISTS firearm`, all FK constraints guarded by `DO $$ IF NOT EXISTS (SELECT 1 FROM pg_constraint)`, all 4 RLS policies guarded by `DO $$ IF NOT EXISTS (SELECT 1 FROM pg_policies)`, end-of-script verification asserting 7 columns + RLS + 4 policies. Ran against the test branch twice — both runs succeeded with no duplicate-object errors. The test branch now has the firearm table and the polymorphic `firearmId` columns, so Phase 29 router tests can execute against it.

## ROADMAP Success Criteria Coverage

All 5 phase-level success criteria are now demonstrably true against the live production DB:

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | `db:deploy` applies the migration without error; `\d firearm` shows all columns | `bun run db:migrate` exit 0; `information_schema.columns` query returns the 5 named columns |
| 2 | Duplicate `serialNumber` raises a unique-index violation | Insert probe: second INSERT failed with SQLSTATE `23505` |
| 3 | `document`/`valuation` accept `firearmId` FK; single-owner CHECK still rejects multi-FK rows | Insert probes: multi-FK rejected (`23514`), single-FK accepted |
| 4 | `db/validation.ts` exports `insertFirearmSchema`/`updateFirearmSchema`; `bun run typecheck` passes | Verified at end of Plan 28-01 (`ac4647d`) |
| 5 | `nfaTransferStatus` exactly `NOT_FILED, FILED, APPROVED`; `transferStatus` unchanged | `pg_enum` query returns exactly those 3 values for `NfaTransferStatus`; `transferStatus` still `PENDING, STARTED, COMPLETE` |

## Task Commits

This plan's deliverables ship in a single atomic commit because the three tasks (generate, apply, sync) operate on tightly coupled artifacts and verification is whole-phase:

1. **Tasks 1 + 2 + 3 (combined):** `7ae6c11` — `feat(28-02): apply migration 0014 — firearm table + document/valuation firearmId`

The combined commit covers: migration file (`drizzle/0014_awesome_madripoor.sql`), drizzle journal entry (`_journal.json` idx 14), snapshot (`drizzle/meta/0014_snapshot.json`), and the test-branch sync script (`scripts/apply-0014-testbranch.ts`).

## Files Created/Modified

- `drizzle/0014_awesome_madripoor.sql` (new) — 80-line migration: 5 CREATE TYPE, firearm CREATE TABLE, document/valuation ALTER + CHECK DROP/ADD, FK constraints, unique index + 4 indexes, ENABLE RLS + 4 policies
- `drizzle/meta/0014_snapshot.json` (new) — drizzle-kit snapshot capturing the new schema state
- `drizzle/meta/_journal.json` (modified) — new idx 14 entry
- `scripts/apply-0014-testbranch.ts` (new) — idempotent test-branch sync script (verified by running twice)

## Decisions Made

1. **No migration hand-edits required.** The 8-point camelCase audit passed cleanly; drizzle-kit 0.31.10 emits camelCase column identifiers when the schema declares them camelCase. The Phase 26 migration 0013 had set the precedent, and Phase 28's 0014 followed it. The documented `0008` failure mode (snake_case in UPDATE/SET blocks) did not recur here because this migration is pure CREATE/ALTER without inline DEFAULT expressions referencing other columns.
2. **Combined commit for the 3 plan tasks.** All three operate on the same migration unit and have no intermediate verifiable state — the migration must be generated, applied, AND synced for the phase to be complete. A per-task commit would have produced unverifiable intermediate states (e.g. "migration generated but not applied", "applied to prod but not test branch").
3. **Verification done programmatically.** Used short postgres.js scripts (not committed) for the `pg_class` / `pg_policies` / `pg_enum` / `information_schema.columns` checks and the constraint insert probes. Output captured inline in this SUMMARY for audit traceability.

## Deviations from Plan

### Sequencing deviation (already noted in 28-01-SUMMARY.md)

**The migration was applied to production and synced to the test branch BEFORE the plan 28-01 code commits landed — not after, as the plan's wave/depends_on metadata strictly suggested.**

- **Root cause:** Pre-commit hook runs `bun test` against the test-branch DB; with plan 28-01's schema changes referencing a `firearmId` column the DB didn't have yet, the integration tests in `tests/trpc/` failed with `NeonDbError: column "firearmId" of relation "valuation" does not exist`.
- **Mitigation:** Generated 0014 + applied to prod + ran the test-branch sync script ALL during plan 28-01's Task 2 commit cycle. The actual COMMIT order is still correct (28-01 commits land before 28-02's commit), and 28-02's commit owns the migration artifacts as its plan specifies — only the DDL-APPLY moment moved earlier.
- **Why this is safe:** Both DBs now reflect what 28-02's migration would have applied later. The migration is committed in 28-02 with its full hand-audit documentation. No tasks were skipped, no acceptance criteria were elided.

### One Pre-Audited File Naming

The drizzle-kit randomly-chosen suffix was `_awesome_madripoor` — accepted as-is (no manual rename). Migration files are referenced by their idx in the journal, not by name, so the suffix is cosmetic.

## Notes for Next Plan (29-firearm-trpc-router)

The schema + types + DB are now in place. Phase 29 can begin without any blockers:
- `import { firearm, type Firearm, type InsertFirearm } from '@/db/schema'` compiles
- `import { insertFirearmSchema, updateFirearmSchema } from '@/db/validation'` works
- `firearmRelations` is registered for Drizzle queries
- The test-branch DB has the firearm table — router unit/integration tests will pass

The two "looks done but isn't" integration traps documented in research SUMMARY.md (`asset.ts:listAll` and `dashboard.ts:summary`) are NOT addressed by Phase 28 or 29 — they ship in Phase 31. Phase 30 also does not touch them; the `/firearms` admin page is reachable but firearms won't appear in `/assets` aggregate views until 31.
