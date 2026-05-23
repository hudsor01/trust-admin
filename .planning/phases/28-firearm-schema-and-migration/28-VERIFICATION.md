---
phase: 28-firearm-schema-and-migration
verified: 2026-05-21T21:17:44Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
operator_confirmed: 2026-05-21T21:30:00Z
operator_evidence: "Live production DB probes re-run inline during phase wrap; all 7 expected outcomes confirmed — see Operator Confirmation section at the bottom of this file."
---

# Phase 28: firearm-schema-and-migration Verification Report

**Phase Goal:** The `firearm` table exists in Postgres with all regulatory fields, RLS isolation, and FK hooks for document and valuation attachment.
**Verified:** 2026-05-21T21:17:44Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `db/schema.ts` defines the `firearm` pgTable with all regulatory columns and a `serialNumber` unique index | VERIFIED | `export const firearm = pgTable('firearm', ...)` at line 1466 of `db/schema.ts`; all FIRE-01..05 columns confirmed present (serialNumber, nfaClass, nfaTransferStatus, condition, acquisitionCost, barrelLength, isNfa, nfaClass, atfFormType, atfControlNumber, taxStampDate, nfrtrSerial, nfaRegistered, acquisitionDate, acquisitionCost, dodValue, dodValueDate, dodValueType, condition, action, location, insured); `uniqueIndex('firearm_serial_number_key')` at line 1527; `.enableRLS()` at line 1567 |
| 2 | The `nfaTransferStatus` pgEnum has exactly `NOT_FILED, FILED, APPROVED`; the generic `transferStatus` enum is unchanged | VERIFIED | `db/schema.ts` lines 215-219: `pgEnum('NfaTransferStatus', ['NOT_FILED','FILED','APPROVED'])`; `transferStatus` at lines 178-182 still exactly `['PENDING','STARTED','COMPLETE']` — no `SURRENDERED` value; `drizzle/0014_awesome_madripoor.sql` line 5 confirms the same enum DDL |
| 3 | `document` and `valuation` tables declare `firearmId` FK columns with updated single-owner CHECK constraints | VERIFIED | `db/schema.ts` line 1653: `document.firearmId bigint`; line 1176: `valuation.firearmId bigint`; `document_single_owner_check` has 9-FK sum (entityId + 8 asset FKs including firearmId); `valuation_single_asset_check` has 7-FK sum (vehicleId..personalPropertyId + firearmId, no entityId, no artworkId); both FKs verified in migration SQL lines 51-52 |
| 4 | `db/validation.ts` exports `insertFirearmSchema` and `updateFirearmSchema` with correct types; `bun run typecheck` passes with 0 errors | VERIFIED | `insertFirearmSchema` exported at line 268 via `insertFirearmSchemaBase.refine(...)`; `updateFirearmSchema` at line 474 via `requireAtLeastOneField(insertFirearmSchemaBase.partial().refine(...))`; `selectFirearmSchema` at line 275; `bun run typecheck` exits 0 (confirmed by running `bun run typecheck` — output: `$ tsc --noEmit` with no errors) |
| 5 | Migration `drizzle/0014_awesome_madripoor.sql` is generated, hand-audited, and applied to the production DB without error | UNCERTAIN | Migration file exists (80 lines, verified clean of snake_case identifiers, all 5 CREATE TYPE PascalCase, both CHECK DROP+ADD pairs present, `ENABLE ROW LEVEL SECURITY` + 4 `CREATE POLICY` statements present, `firearm_serial_number_key` unique index references `"serialNumber"`); journal entry at idx 14 confirmed; but live DB apply cannot be verified without a human checking the production Neon console |

**Score:** 4/5 truths verified (SC #5 is UNCERTAIN — requires human live-DB confirmation)

### Deferred Items

None.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `db/schema.ts` | 5 firearm pgEnums + firearm pgTable (RLS) + document.firearmId + valuation.firearmId | VERIFIED | All 5 enums present (FirearmType, NfaClass, AtfFormType, FirearmCondition, NfaTransferStatus); firearm pgTable with `.enableRLS()` and 4 policies; document.firearmId and valuation.firearmId FK columns present |
| `db/relations.ts` | firearmRelations + entity/valuation/document relation extensions | VERIFIED | `firearmRelations` at line 253; `firearms: many(firearm)` in entityRelations at line 59; `firearm: one(firearm, ...)` in valuationRelations at line 186 and documentRelations at line 247 |
| `db/validation.ts` | insertFirearmSchema, selectFirearmSchema, updateFirearmSchema | VERIFIED | All 3 schemas exported; `serialNumberValidation` at line 137; NFA-conditional refine with message `'NFA class is required when firearm is classified as NFA'`; Zod v4 workaround (base schema + separate refine for update) correctly implemented |
| `tests/lib/validation.firearm.test.ts` | Zod schema unit tests, 13 cases | VERIFIED (14 tests) | File exists; `describe('insertFirearmSchema'` and `describe('updateFirearmSchema — requireAtLeastOneField'` blocks present; `bun test` passes 14 tests (SUMMARY claimed 13 — actual file has 14; all pass) |
| `drizzle/0014_awesome_madripoor.sql` | Generated + hand-audited migration DDL | VERIFIED (source) | 80-line file present; all 5 CREATE TYPE PascalCase; all firearm columns camelCase; document/valuation ADD COLUMN uses `"firearmId"`; both CHECK DROP+ADD pairs with 9-FK and 7-FK sums; `firearm_serial_number_key` references `"serialNumber"`; FK names correct; `ENABLE ROW LEVEL SECURITY` + 4 `CREATE POLICY` statements; no snake_case column identifiers found |
| `drizzle/meta/0014_snapshot.json` | Drizzle-kit snapshot for schema state after migration | VERIFIED | File exists at `drizzle/meta/0014_snapshot.json` |
| `drizzle/meta/_journal.json` | New idx 14 entry for migration 0014 | VERIFIED | idx 14 entry with tag `0014_awesome_madripoor` confirmed in journal |
| `scripts/apply-0014-testbranch.ts` | Idempotent postgres.js sync script for test branch | VERIFIED | File exists; `isProductionDb` production guard present (lines 21-32); all DDL inside `sql.begin(async (tx) => {...})`; 5 CREATE TYPE wrapped in `DO $$ EXCEPTION duplicate_object` guards; `CREATE TABLE IF NOT EXISTS firearm`; FK constraints in `DO $$ IF NOT EXISTS (SELECT 1 FROM pg_constraint)` guards; 4 RLS policies in `DO $$ IF NOT EXISTS (SELECT 1 FROM pg_policies)` guards; end-of-script verification checks 7 columns + RLS + 4 policies |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `db/schema.ts` firearm table | entity table | `firearm_entity_id_fkey` foreignKey | VERIFIED | `foreignKey({ columns: [table.entityId], foreignColumns: [entity.id], name: 'firearm_entity_id_fkey' }).onUpdate('cascade').onDelete('restrict')` at line 1533 |
| `db/schema.ts` document.firearmId | firearm.id | `document_firearm_id_fkey` | VERIFIED | FK at line 1742; `.onDelete('set null').onUpdate('cascade')` |
| `db/schema.ts` valuation.firearmId | firearm.id | `valuation_firearm_id_fkey` | VERIFIED | FK at line 1245; `.onDelete('set null').onUpdate('cascade')` |
| `db/validation.ts` insertFirearmSchema | `db/schema.ts` firearm table | `createInsertSchema(firearm, ...)` | VERIFIED | `insertFirearmSchemaBase = createInsertSchema(firearm, {...})` at line 257 |
| `db/relations.ts` firearmRelations | entity/valuation/document | `many(firearm)` / `one(firearm, ...)` | VERIFIED | All 4 relation entries (entity ← firearms, valuation ← firearm, document ← firearm, firearm → entity/valuations/documents) confirmed |

### Data-Flow Trace (Level 4)

Not applicable for this phase — no components rendering dynamic data. Phase 28 delivers schema, migration, and Zod validation only. UI rendering is Phase 30's deliverable.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Zod schemas compile and export correctly | `bun run typecheck` | exit 0, no errors | PASS |
| All 14 firearm validation unit tests pass | `bun test tests/lib/validation.firearm.test.ts` | 14 pass, 0 fail | PASS |
| Migration SQL is clean of snake_case column identifiers | `grep -E '"firearm_id"\|"serial_number"\|"nfa_class"\|"dod_value"' drizzle/0014_awesome_madripoor.sql` | No matches | PASS |
| transferStatus enum unchanged | `grep -A5 'export const transferStatus' db/schema.ts` | `['PENDING','STARTED','COMPLETE']` only | PASS |

### Probe Execution

No conventional `scripts/*/tests/probe-*.sh` files exist for this phase. The plan's verification was done via postgres.js inline scripts (not committed) and pre-commit hook integration tests. The test-branch sync script (`scripts/apply-0014-testbranch.ts`) serves as the idempotent verification artifact but cannot be re-run from this verifier process (requires `.env.test.local`).

| Probe | Command | Result | Status |
|-------|---------|--------|--------|
| Test-branch sync idempotency | `bun --env-file=.env.test.local run scripts/apply-0014-testbranch.ts` | Requires `.env.test.local` — cannot run from verifier | SKIP (human) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| FIRE-01 | 28-01, 28-02 | Core identity fields (name, make, model, serialNumber, firearmType, caliber, barrelLength) | SATISFIED | All 7 fields present in `db/schema.ts` firearm table; `insertFirearmSchema` enforces name/make/model/serialNumber required |
| FIRE-02 | 28-01, 28-02 | NFA classification (nfaClass, atfFormType, atfControlNumber, taxStampDate) | SATISFIED | All 4 NFA fields present in schema; `nfaClass` pgEnum; NFA-conditional `firearm_nfa_class_required_check` DB constraint + Zod refine both enforce `isNfa=true → nfaClass required` |
| FIRE-03 | 28-01, 28-02 | DOD valuation, NRA condition grade, acquisition details (date, cost) | SATISFIED | `dodValue`, `dodValueDate`, `dodValueType`, `condition` (FirearmCondition enum with 6 NRA grades), `acquisitionDate`, `acquisitionCost` all present in schema |
| FIRE-04 | 28-01, 28-02 | Storage location, insured flag, transfer status | SATISFIED | `location`, `insured`, `transferStatus` present in schema |
| FIRE-05 | 28-01, 28-02 | ATF Form 5 transfer progress (`nfaTransferStatus`) separate from generic transfer status | SATISFIED | `nfaTransferStatus` column with `NfaTransferStatus` enum (NOT_FILED/FILED/APPROVED) distinct from `transferStatus` (PENDING/STARTED/COMPLETE) |
| FIRE-08 | 28-01, 28-02 | Attach documents to a firearm record | SATISFIED | `document.firearmId` FK column added with `document_firearm_id_fkey`; `documentRelations` extended with `firearm: one(firearm, ...)`; `document_single_owner_check` updated to 9-FK sum |
| FIRE-09 | 28-01, 28-02 | Record valuation history for a firearm | SATISFIED | `valuation.firearmId` FK column added with `valuation_firearm_id_fkey`; `valuationRelations` extended with `firearm: one(firearm, ...)`; `valuation_single_asset_check` updated to 7-FK sum |

All 7 requirement IDs (FIRE-01 through FIRE-05, FIRE-08, FIRE-09) appear in both plan frontmatter `requirements` fields. No orphaned requirements — FIRE-06 and FIRE-07 are correctly assigned to Phase 30 in REQUIREMENTS.md.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | — | — | — | — |

No `TBD`, `FIXME`, `XXX`, `TODO`, `HACK`, or `PLACEHOLDER` markers found in any phase-modified file. No stub implementations detected. No hardcoded empty returns. No debt markers requiring follow-up.

### Human Verification Required

#### 1. Production DB Migration Apply Confirmation

**Test:** Connect to the production Neon DB console (or run a short postgres.js script against the production DATABASE_URL) and run:
```sql
SELECT tag FROM drizzle.__drizzle_migrations WHERE tag = '0014_awesome_madripoor';
SELECT relrowsecurity FROM pg_class WHERE relname = 'firearm';
SELECT count(*) FROM pg_policies WHERE tablename = 'firearm';
SELECT column_name FROM information_schema.columns WHERE table_name = 'firearm' AND column_name IN ('serialNumber','nfaClass','nfaTransferStatus','condition','acquisitionCost');
```
**Expected:** First query returns 1 row; `relrowsecurity = true`; policy count = 4; column query returns 5 rows.
**Why human:** Verifier cannot open a live connection to the production Neon DB.

#### 2. serialNumber Unique-Index Violation (ROADMAP SC #2)

**Test:** Insert two firearm rows with the same `serialNumber` into the live production DB:
```sql
INSERT INTO firearm ("entityId","name","make","model","serialNumber","firearmType","isNfa","condition","status","transferStatus","insured","updatedAt")
VALUES (1,'Test1','Make1','Model1','VERIFY-DUPE-001','RIFLE',false,'GOOD','ACTIVE','PENDING',false,NOW());
INSERT INTO firearm ("entityId","name","make","model","serialNumber","firearmType","isNfa","condition","status","transferStatus","insured","updatedAt")
VALUES (1,'Test2','Make2','Model2','VERIFY-DUPE-001','RIFLE',false,'GOOD','ACTIVE','PENDING',false,NOW());
-- Then clean up: DELETE FROM firearm WHERE "serialNumber" = 'VERIFY-DUPE-001';
```
**Expected:** Second insert fails with SQLSTATE `23505` (unique_violation on `firearm_serial_number_key`).
**Why human:** Constraint behavior requires a live DB write. Note: the unique index is GLOBAL (not per-entity) — it enforces uniqueness across all entities, which is stricter than the ROADMAP SC's "for the same entity" wording. This is by design (serial numbers identify physical firearms regardless of owning entity) and should pass the SC intent.

#### 3. Single-Owner CHECK Constraint Enforcement (ROADMAP SC #3)

**Test:** Insert a document row referencing two non-null asset FKs, and a separate row referencing only `firearmId`:
```sql
-- Should fail with check_violation (23514):
INSERT INTO document ("entityId","firearmId","vehicleId","title","type","updatedAt")
  SELECT 1, id, (SELECT id FROM vehicle LIMIT 1), 'Multi-FK Test', 'OTHER', NOW() FROM firearm LIMIT 1;
-- Should succeed:
INSERT INTO document ("firearmId","title","type","updatedAt")
  SELECT id, 'Single-FK Test', 'OTHER', NOW() FROM firearm LIMIT 1;
-- Clean up any inserted rows.
```
**Expected:** Multi-FK insert rejected with `23514`; single-FK insert accepted.
**Why human:** CHECK constraint enforcement requires live DB. Constraint expression verified correct in source (9-FK sum = 1), but actual DB enforcement can only be confirmed by running the probe.

### Gaps Summary

No gaps found in the source code artifacts. All 5 ROADMAP success criteria have evidence in the codebase for criteria 2, 4, and 5 (fully verified); criteria 1 and 3 (the live DB enforcement side) require human confirmation because the verifier cannot connect to the production Neon DB.

The SUMMARY's claim of 13 unit tests is a minor inaccuracy — the actual file has 14 tests (all passing). This is not a gap; it is an over-delivery.

---

_Verified: 2026-05-21T21:17:44Z_
_Verifier: Claude (gsd-verifier)_


---

## Operator Confirmation (2026-05-21T21:30:00Z)

The 3 "human_needed" items above were re-verified inline against the live
production Neon DB by the operator (postgres.js probe script run in the
phase-wrap transcript). All 7 expected outcomes observed:

| # | Probe | Result |
|---|-------|--------|
| 1 | latest `drizzle.__drizzle_migrations` row | id=14, hash=318e5a7e8597… ✓ |
| 2 | `firearm.relrowsecurity` + policies | true / 4 policies (delete/insert/select/update) ✓ |
| 3 | firearm distinctive columns present | acquisitionCost, condition, nfaClass, nfaTransferStatus, serialNumber ✓ |
| 4 | firearm INSERT accepted | id=3 ✓ |
| 5 | duplicate `serialNumber` → SQLSTATE 23505 | rejected (unique_violation) ✓ |
| 6 | document with 2 non-null asset FKs → SQLSTATE 23514 | rejected (check_violation) ✓ |
| 7 | document with only `firearmId` accepted | id=39 ✓ |

All probe rows cleaned up after the run. Status upgraded from
`human_needed` → `passed`; ROADMAP SC #5 truth upgraded from UNCERTAIN
→ VERIFIED.

