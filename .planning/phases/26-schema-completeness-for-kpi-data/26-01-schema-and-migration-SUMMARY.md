---
phase: 26-schema-completeness-for-kpi-data
plan: 01
subsystem: database

tags: [drizzle, postgres, schema, migration, foreign-keys, kpi]

# Dependency graph
requires:
  - phase: 23-shadcn-registry-adoption-and-dashboard-ux-revamp
    provides: KPI strips on /bequests, /artwork, /accounts whose value/count columns are placeholders pending these schema columns
provides:
  - specific_bequest.estimatedValue numeric(14,2) money column on the live DB
  - personal_property.insured boolean (default false) column on the live DB
  - liability.bankAccountId + liability.investmentAccountId nullable FK columns on the live DB
  - liability → bankAccount / investmentAccount Drizzle one-relations
  - migration drizzle/0013_kpi_schema_completeness.sql (applied, journaled)
affects: [26-02 (router/form/KPI wiring depends on these columns existing), bequests-kpi, artwork-kpi, accounts-row-detail]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "FK column convention: nullable bigint + foreignKey() onUpdate cascade / onDelete set null + explicit btree index (Postgres does not auto-index FK columns)"
    - "Migration hand-edit: camelCase quoted column identifiers verified; drizzle-kit emitted them correctly because new columns are declared with camelCase names in db/schema.ts"
    - "Test-branch DDL sync via idempotent postgres.js transaction script (scripts/apply-00NN-testbranch.ts)"

key-files:
  created:
    - drizzle/0013_kpi_schema_completeness.sql
    - drizzle/meta/0013_snapshot.json
    - scripts/apply-0013-testbranch.ts
  modified:
    - db/schema.ts
    - db/relations.ts
    - db/validation.ts
    - drizzle/meta/_journal.json

key-decisions:
  - "estimatedValue typed numeric(14,2) string-typed money (mirrors dodValue) — nullable since most bequests are non-monetary item descriptions"
  - "insured boolean default false NOT NULL — Postgres backfills existing personal_property rows with the default, no NOT-NULL-on-unbacked-column risk"
  - "liability bank/investment FKs mirror the existing rentalPropertyId/homesteadId/vehicleId pattern exactly (onDelete set null, dedicated btree index)"
  - "insertSpecificBequestSchema.estimatedValue override uses the existing null-safe positiveNumberValidation — no new validator added"
  - "Test-branch DB synced via idempotent postgres.js transaction script (DO $$ guards FK ADD CONSTRAINT) so plan 26-02 tRPC tests pass"

patterns-established:
  - "FK + index pairing: every new liability FK column gets a matching idx_liability_<col> btree index"
  - "Migration header comment documents non-destructive DDL classification + camelCase identifier rationale"

requirements-completed: []

# Metrics
duration: 25min
completed: 2026-05-20
---

# Phase 26 Plan 01: Schema and Migration Summary

**Added four KPI-enabling columns (specific_bequest.estimatedValue, personal_property.insured, liability.bankAccountId + investmentAccountId) in one Drizzle migration (0013), applied to the live DB and the test branch, with FK relations and validation wired.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-05-20T18:24:00Z (approx)
- **Completed:** 2026-05-20T23:49:08Z
- **Tasks:** 3
- **Files modified:** 7 (3 created, 4 modified)

## Accomplishments
- Four new columns declared in `db/schema.ts`: `estimatedValue` on `specificBequest`, `insured` on `personalProperty`, `bankAccountId` + `investmentAccountId` on `liability` — plus two FK constraints and two FK-column indexes.
- `liabilityRelations` extended with `bankAccount` and `investmentAccount` one-relations.
- Migration `drizzle/0013_kpi_schema_completeness.sql` generated, renamed from the drizzle-kit random tag, hand-edited (header comment + `IF NOT EXISTS` idempotency), and journaled (idx 13).
- Migration applied to the **live DB** via `bun run db:deploy` — runtime `information_schema.columns` check confirms all 4 columns exist.
- Migration applied to the **test branch DB** via an idempotent postgres.js transaction script so plan 26-02's tRPC tests will pass.
- `insertSpecificBequestSchema` refined with a null-safe `estimatedValue` validator.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add five columns to db/schema.ts and two relations to db/relations.ts** - `f9dee94` (feat)
2. **Task 2: Generate and hand-edit migration 0013, refine validation schemas** - `311a06c` (feat)
3. **Task 3: [BLOCKING] Apply migration 0013 to the live DB and verify columns exist** - `9c5e532` (chore)

## Files Created/Modified
- `db/schema.ts` - Added `estimatedValue` (specificBequest), `insured` (personalProperty), `bankAccountId` + `investmentAccountId` + 2 FKs + 2 indexes (liability)
- `db/relations.ts` - Added `bankAccount` / `investmentAccount` one-relations to `liabilityRelations`
- `db/validation.ts` - `insertSpecificBequestSchema` gains a null-safe `estimatedValue` validator (`positiveNumberValidation`)
- `drizzle/0013_kpi_schema_completeness.sql` - ADD COLUMN x4 + 2 FK constraints + 2 indexes; idempotent; all column identifiers camelCase
- `drizzle/meta/0013_snapshot.json` - drizzle-kit snapshot for migration 0013
- `drizzle/meta/_journal.json` - idx 13 entry tagged `0013_kpi_schema_completeness`
- `scripts/apply-0013-testbranch.ts` - One-off idempotent postgres.js transaction syncing the same DDL to the `.env.test.local` branch

## Decisions Made
- **`estimatedValue` typed `numeric(14, 2)`** — mirrors how other asset tables type `dodValue` (string-typed money per CLAUDE.md convention). Left nullable: most bequests are non-monetary item descriptions.
- **`insured` is `boolean DEFAULT false NOT NULL`** — Postgres backfills existing `personal_property` rows with the default at ADD COLUMN time, so the NOT NULL is safe (no unbacked-column risk per threat T-26-03).
- **`liability` FKs mirror the existing `rentalPropertyId`/`homesteadId`/`vehicleId` pattern verbatim** — nullable bigint, `onUpdate cascade` / `onDelete set null`, plus a dedicated `idx_liability_<col>` btree index since Postgres does not auto-index FK columns and plan 26-02's `/accounts` getRowDetail filters liabilities by these columns.
- **No new validator** — `insertSpecificBequestSchema.estimatedValue` reuses the existing `positiveNumberValidation` (2-decimal, non-negative, magnitude-bounded, `.nullable()`), which is the documented helper for nullable money columns.
- **Test-branch DDL sync via committed script** — `scripts/apply-0013-testbranch.ts` follows the existing `scripts/apply-0006-migration.ts` precedent; it wraps the FK `ADD CONSTRAINT` in `DO $$` existence guards so a re-run is idempotent.

## Deviations from Plan

None - plan executed exactly as written.

The plan anticipated drizzle-kit might emit snake_case column identifiers requiring a hand-edit (CLAUDE.md gotcha). In this case drizzle-kit emitted the column identifiers as **camelCase already** — because the new columns are declared with camelCase names directly in `db/schema.ts` (`bankAccountId`, `investmentAccountId`, `estimatedValue`), not via an explicit snake_case `t.numeric('snake_name')` override. The Task 2 `<verify>` grep for forbidden snake_case forms (`"estimated_value"` / `"bank_account_id"` / `"investment_account_id"`) passed clean. Hand-editing was still performed for the header comment and `IF NOT EXISTS` idempotency, as the plan specified.

## Issues Encountered
- **Transient `ECONNREFUSED` during one pre-commit test run** — the Task 3 commit's first pre-commit hook reported a test failure (973/1003 tests, `error: ECONNREFUSED`). A clean re-run of the full suite passed all 1003 tests with 0 failures; the failure was a Neon connection blip during the parallel test run, not a code defect. The commit succeeded on retry.

## Verification

- `bun run typecheck` — exits 0 (schema + relations + validation compile).
- `bun run lint` (biome) — clean, 466 files, no fixes applied.
- Full test suite — **1003 pass / 0 fail** across 73 files.
- Live-DB `information_schema.columns` runtime check — **exits 0, 4 columns present**: `specific_bequest.estimatedValue`, `personal_property.insured`, `liability.bankAccountId`, `liability.investmentAccountId`.
- Test-branch `information_schema.columns` check — 4 columns present.
- `drizzle.__drizzle_migrations` row 13 hash (`76418553e777b20eb0a0792d17b8d28fb596f00d91e06f280de57f6fc67281ec`) matches the sha256 of `drizzle/0013_kpi_schema_completeness.sql` exactly — journal, snapshot, file, and live-DB record are in lockstep. No stale-row recovery needed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All four KPI columns exist on both the live DB and the test branch — plan 26-02 (router/form/KPI wiring) can proceed; its tRPC tests have the columns they depend on.
- `liability` FK relations to `bankAccount` / `investmentAccount` are wired, ready for 26-02's `/accounts` getRowDetail linked-liability query.
- Threat T-26-01 (cross-entity FK tampering on the liability router) is deferred to plan 26-02 — this plan added no mutation surface.

## Self-Check: PASSED

- FOUND: drizzle/0013_kpi_schema_completeness.sql
- FOUND: drizzle/meta/0013_snapshot.json
- FOUND: scripts/apply-0013-testbranch.ts
- FOUND: commit f9dee94
- FOUND: commit 311a06c
- FOUND: commit 9c5e532

---
*Phase: 26-schema-completeness-for-kpi-data*
*Completed: 2026-05-20*
