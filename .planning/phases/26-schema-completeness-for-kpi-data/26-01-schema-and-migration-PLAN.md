---
phase: 26-schema-completeness-for-kpi-data
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - db/schema.ts
  - db/relations.ts
  - db/validation.ts
  - drizzle/0013_kpi_schema_completeness.sql
  - drizzle/meta/_journal.json
  - drizzle/meta/0013_snapshot.json
autonomous: true
requirements: []
must_haves:
  truths:
    - "specific_bequest has an estimatedValue money column on the live DB"
    - "personal_property has an insured boolean column (default false) on the live DB"
    - "liability has nullable bankAccountId and investmentAccountId FK columns on the live DB"
    - "Both new liability FK columns reference bank_account.id / investment_account.id with onDelete set null"
    - "db/relations.ts exposes liability.bankAccount and liability.investmentAccount one-relations"
  artifacts:
    - path: "db/schema.ts"
      provides: "estimatedValue on specificBequest, insured on personalProperty, bankAccountId+investmentAccountId FKs on liability"
      contains: "estimatedValue"
    - path: "drizzle/0013_kpi_schema_completeness.sql"
      provides: "ALTER TABLE statements for all three tables, camelCase column identifiers"
      contains: "ADD COLUMN"
    - path: "db/relations.ts"
      provides: "liability → bankAccount / investmentAccount relations"
      contains: "investmentAccount"
  key_links:
    - from: "db/schema.ts"
      to: "drizzle/0013_kpi_schema_completeness.sql"
      via: "drizzle-kit generate"
      pattern: "ADD COLUMN.*estimatedValue|ADD COLUMN.*insured|ADD COLUMN.*bankAccountId"
    - from: "drizzle/0013_kpi_schema_completeness.sql"
      to: "live Postgres (information_schema.columns)"
      via: "bun run db:deploy"
      pattern: "information_schema"
---

<objective>
Add every schema column the phase-26 KPI work depends on, in ONE Drizzle
migration, and push it to the live database.

Three table changes:
1. `specific_bequest.estimatedValue` — money column (numeric, string-typed per
   CLAUDE.md convention) so the /bequests "Total value" KPI can aggregate.
2. `personal_property.insured` — boolean (default false) so the /artwork
   "Insured count" KPI can count.
3. `liability.bankAccountId` + `liability.investmentAccountId` — nullable FK
   columns mirroring the existing `liability.homesteadId`/`rentalPropertyId`/
   `vehicleId` FKs, so a liability can be linked to a bank/investment account
   and /accounts row-detail can show genuinely-linked liabilities.

Purpose: closes the v4.0-MILESTONE-AUDIT phase-23 tech_debt — three placeholder
KPI columns and the /accounts getRowDetail override all stem from missing
schema. This plan is the DB-layer foundation; routers/forms/KPI wiring follow in
plan 26-02 (which depends on these columns existing on the live DB).

Output: updated `db/schema.ts` + `db/relations.ts` + `db/validation.ts`,
migration `drizzle/0013_kpi_schema_completeness.sql`, and a live DB that has all
five new columns.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@CLAUDE.md

<interfaces>
<!-- Source-of-truth analogs. Executor mirrors these exactly — no exploration. -->

specific_bequest table (db/schema.ts ~line 1994). Money columns elsewhere are
typed `t.numeric({ precision: 14, scale: 2 })` and persist a 2-decimal string
(see vehicle.dodValue at db/schema.ts:434). The new column:
```typescript
estimatedValue: t.numeric({ precision: 14, scale: 2 }),
```
Nullable (no .notNull()) — most bequests are non-monetary item descriptions.

personal_property table (db/schema.ts ~line 1320). Boolean precedent:
liability.isRevolvingCredit = `t.boolean().default(false).notNull()`. The new
column:
```typescript
insured: t.boolean().default(false).notNull(),
```

liability table (db/schema.ts ~line 2253). Existing FK columns + foreignKey()
blocks (verbatim pattern to mirror):
```typescript
// columns block (~line 2286-2289):
rentalPropertyId: bigint({ mode: 'number' }),
homesteadId: bigint({ mode: 'number' }),
vehicleId: bigint({ mode: 'number' }),
// → ADD after vehicleId:
bankAccountId: bigint({ mode: 'number' }),
investmentAccountId: bigint({ mode: 'number' }),

// foreignKey() block (~line 2333-2339, the vehicle FK is the template):
foreignKey({
    columns: [table.vehicleId],
    foreignColumns: [vehicle.id],
    name: 'liability_vehicle_id_fkey',
})
    .onUpdate('cascade')
    .onDelete('set null'),
// → ADD two more, mirroring exactly:
foreignKey({
    columns: [table.bankAccountId],
    foreignColumns: [bankAccount.id],
    name: 'liability_bank_account_id_fkey',
})
    .onUpdate('cascade')
    .onDelete('set null'),
foreignKey({
    columns: [table.investmentAccountId],
    foreignColumns: [investmentAccount.id],
    name: 'liability_investment_account_id_fkey',
})
    .onUpdate('cascade')
    .onDelete('set null'),
```
NOTE: `bankAccount` is already imported in db/schema.ts (used by other tables).
Confirm `investmentAccount` is in scope — both are declared earlier in the file.

liabilityRelations (db/relations.ts:325-343). The vehicle one-relation is the
template:
```typescript
vehicle: one(vehicle, {
    fields: [liability.vehicleId],
    references: [vehicle.id],
}),
// → ADD inside the same relations({ one, many }) block:
bankAccount: one(bankAccount, {
    fields: [liability.bankAccountId],
    references: [bankAccount.id],
}),
investmentAccount: one(investmentAccount, {
    fields: [liability.investmentAccountId],
    references: [investmentAccount.id],
}),
```

Migration template — drizzle/0012_add_sort_index.sql:
- Uses `--> statement-breakpoint` between statements
- Quoted identifiers are camelCase ("sortIndex", "entityId")
- Uses `IF NOT EXISTS` on ADD COLUMN for idempotency
- Header comment explains the camelCase hand-edit rationale

Journal — drizzle/meta/_journal.json: last entry is idx 12, tag
"0012_add_sort_index". New entry continues at idx 13, tag
"0013_kpi_schema_completeness", version "7", breakpoints true.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add the five columns to db/schema.ts and the two relations to db/relations.ts</name>
  <read_first>
    - db/schema.ts — specificBequest block (~1994-2056), personalProperty block
      (~1320-1380), liability block (~2253-2362). Read all three in full.
    - db/relations.ts — liabilityRelations (lines 325-343),
      bankAccountRelations (93-102), investmentAccountRelations (104-115).
  </read_first>
  <action>
    In db/schema.ts:
    1. specificBequest columns block — add `estimatedValue: t.numeric({ precision: 14, scale: 2 }),`
       after `category: t.text(),` (keep nullable; do NOT add .notNull()).
    2. personalProperty columns block — add `insured: t.boolean().default(false).notNull(),`
       after `transferStatus: transferStatus().default('PENDING').notNull(),`.
    3. liability columns block — after `vehicleId: bigint({ mode: 'number' }),`
       add `bankAccountId: bigint({ mode: 'number' }),` and
       `investmentAccountId: bigint({ mode: 'number' }),`.
    4. liability `(table) => [...]` block — after the `liability_vehicle_id_fkey`
       foreignKey() entry, add two foreignKey() entries for
       `liability_bank_account_id_fkey` (foreignColumns [bankAccount.id]) and
       `liability_investment_account_id_fkey` (foreignColumns
       [investmentAccount.id]), each `.onUpdate('cascade').onDelete('set null')`
       — exact shape in the <interfaces> block.
    5. Optionally add indexes mirroring `idx_liability_entity_id`:
       `index('idx_liability_bank_account_id').on(table.bankAccountId)` and
       `index('idx_liability_investment_account_id').on(table.investmentAccountId)`
       in the same `(table) => [...]` block — Postgres does NOT auto-index FK
       columns and /accounts getRowDetail (plan 26-02) filters liabilities by
       these columns.
    Confirm `bankAccount` and `investmentAccount` are imported / declared in
    db/schema.ts scope (they are top-level pgTable consts earlier in the file —
    no import needed within the same file).

    In db/relations.ts:
    6. Inside `liabilityRelations` add `bankAccount: one(bankAccount, {...})`
       and `investmentAccount: one(investmentAccount, {...})` mirroring the
       existing `vehicle: one(vehicle, {...})` relation (exact shape in
       <interfaces>). Confirm `bankAccount` and `investmentAccount` are imported
       at the top of db/relations.ts (they are — bankAccountRelations and
       investmentAccountRelations reference them).
  </action>
  <verify>
    <automated>grep -q "estimatedValue" db/schema.ts && grep -q "insured: t.boolean" db/schema.ts && grep -q "bankAccountId: bigint" db/schema.ts && grep -q "investmentAccountId: bigint" db/schema.ts && grep -q "liability_bank_account_id_fkey" db/schema.ts && grep -q "liability_investment_account_id_fkey" db/schema.ts && grep -q "investmentAccount: one(investmentAccount" db/relations.ts && bun run typecheck</automated>
  </verify>
  <acceptance_criteria>
    - `db/schema.ts` specificBequest block contains `estimatedValue`
    - `db/schema.ts` personalProperty block contains `insured: t.boolean().default(false).notNull()`
    - `db/schema.ts` liability block contains BOTH `bankAccountId` and `investmentAccountId`
    - `db/schema.ts` contains foreignKey names `liability_bank_account_id_fkey` AND `liability_investment_account_id_fkey`
    - `db/relations.ts` liabilityRelations contains `bankAccount: one(` AND `investmentAccount: one(`
    - `bun run typecheck` exits 0
  </acceptance_criteria>
  <done>All five columns + two FKs declared in schema, two relations added, typecheck green.</done>
</task>

<task type="auto">
  <name>Task 2: Generate and hand-edit migration 0013, refine validation schemas</name>
  <read_first>
    - drizzle/0012_add_sort_index.sql — migration format template (statement
      breakpoints, camelCase identifiers, IF NOT EXISTS, header comment).
    - drizzle/meta/_journal.json — last entry idx 12.
    - db/validation.ts lines 262-322 (insertLiabilitySchema, insertPersonalPropertySchema,
      insertSpecificBequestSchema), 431-451 (update schemas).
  </read_first>
  <action>
    1. Run `bun run db:generate` to let drizzle-kit emit the migration from the
       updated schema. It will create `drizzle/00NN_*.sql` and update
       `drizzle/meta/_journal.json` + add a `drizzle/meta/00NN_snapshot.json`.
    2. RENAME the generated `.sql` file to
       `drizzle/0013_kpi_schema_completeness.sql` IF drizzle-kit chose a
       different name/number. Update the matching `_journal.json` entry's `tag`
       to `0013_kpi_schema_completeness` and the snapshot filename to
       `0013_snapshot.json` so the journal, file, and snapshot all agree. If
       drizzle-kit already numbered it 0013, just rename the random suffix to
       `kpi_schema_completeness`.
    3. HAND-EDIT the migration SQL: per CLAUDE.md "Postgres Column Naming
       Convention", drizzle-kit emits snake_case column identifiers in raw
       ALTER statements even though this schema persists camelCase. Rewrite
       EVERY quoted column identifier to camelCase:
         - `"estimated_value"` → `"estimatedValue"`
         - `"insured"` stays `"insured"` (single word, no change)
         - `"bank_account_id"` → `"bankAccountId"`
         - `"investment_account_id"` → `"investmentAccountId"`
       Table names stay snake_case (`specific_bequest`, `personal_property`,
       `liability`, `bank_account`, `investment_account`) — that is correct per
       CLAUDE.md (tables ARE snake_case, columns are camelCase).
       The FK constraint REFERENCES targets reference bank_account/
       investment_account `("id")` — `id` is single-word, no change.
    4. Add `IF NOT EXISTS` to each `ADD COLUMN` for idempotency, mirroring 0012.
       (drizzle-kit's ADD CONSTRAINT for FKs cannot take IF NOT EXISTS — leave
       FK statements as generated; a partial re-run is recoverable per the
       MEMORY note on manual application.)
    5. Add a header comment block (mirroring 0012's) explaining: this migration
       adds non-destructive nullable columns + FKs across three tables; every
       quoted column identifier was hand-edited to camelCase per the CLAUDE.md
       gotcha.
    6. db/validation.ts: the insert schemas are derived via
       `createInsertSchema(table)` so the new columns are picked up
       automatically — NO new field declarations needed. Verify
       `insertSpecificBequestSchema`, `insertPersonalPropertySchema`,
       `insertLiabilitySchema` still compile. Optionally add a `.refine()` to
       `insertSpecificBequestSchema` for `estimatedValue` enforcing 2-decimal
       money format + non-negative, mirroring the `originalAmount` refine on
       `insertLiabilitySchema` (lines 265-269) — only if it does not break the
       nullable case (refine must allow null/undefined). Keep this minimal.
  </action>
  <verify>
    <automated>test -f drizzle/0013_kpi_schema_completeness.sql && grep -qE 'ADD COLUMN.*"estimatedValue"|ADD COLUMN.*estimatedValue' drizzle/0013_kpi_schema_completeness.sql && grep -q "bankAccountId" drizzle/0013_kpi_schema_completeness.sql && grep -q "investmentAccountId" drizzle/0013_kpi_schema_completeness.sql && ! grep -E '"[a-z]+_[a-z_]+"' drizzle/0013_kpi_schema_completeness.sql | grep -vE 'specific_bequest|personal_property|bank_account|investment_account|liability' && grep -q '0013_kpi_schema_completeness' drizzle/meta/_journal.json && bun run typecheck</automated>
  </verify>
  <acceptance_criteria>
    - `drizzle/0013_kpi_schema_completeness.sql` exists
    - The migration contains ADD COLUMN for `estimatedValue`, `insured`, `bankAccountId`, `investmentAccountId`
    - NO snake_case COLUMN identifiers in the migration: `grep -E '"[a-z]+_[a-z_]+"'` on the file returns only table names (specific_bequest / personal_property / bank_account / investment_account / liability), never `"estimated_value"` / `"bank_account_id"` / `"investment_account_id"`
    - `drizzle/meta/_journal.json` has an entry tagged `0013_kpi_schema_completeness`
    - `drizzle/meta/0013_snapshot.json` exists
    - `bun run typecheck` exits 0
  </acceptance_criteria>
  <done>Migration 0013 written, hand-edited to camelCase, journal + snapshot in lockstep.</done>
</task>

<task type="auto">
  <name>Task 3: [BLOCKING] Apply migration 0013 to the live DB and verify columns exist</name>
  <read_first>
    - CLAUDE.md "Commands" section (db:deploy vs db:push) and the Gotchas table
      rows on db:push corruption + the Drizzle migration error-swallowing notes.
    - drizzle/0013_kpi_schema_completeness.sql (the migration from Task 2).
  </read_first>
  <action>
    [BLOCKING] — this task gates plan 26-02. The migration is mandatory:
    `bun run typecheck` / `bun run build` pass WITHOUT it because types come
    from db/schema.ts, not the live DB — applying the migration is the only
    thing that makes the new columns real. Skipping it creates a false-positive
    verification.

    1. Run `bun run db:deploy` (this is `db:generate` + `db:migrate`).
       NEVER `bun run db:push` — drizzle-kit push corrupts this schema's RLS
       policies (CLAUDE.md).
    2. If `db:deploy` / `drizzle-kit migrate` exits with bare code 1 and no
       error message (it swallows the underlying Postgres error — CLAUDE.md
       gotcha), apply the SQL manually to surface the real error: open a
       `getClient()` (postgres.js) transaction and run the migration statements
       inside it. Do NOT use `getSql()` (Neon HTTP driver) — it reports DDL as
       success even when nothing persists. After a successful manual apply,
       reconcile `drizzle.__drizzle_migrations` per the MEMORY "Stale
       __drizzle_migrations Row Recovery" note (UPDATE the row's hash to the
       sha256 of the migration file; do not DELETE).
    3. RUNTIME VERIFICATION — after the migration applies, run a `bun -e`
       one-liner that queries `information_schema.columns` on the live DB and
       asserts all five columns exist. Use the project's DB client. Example
       shape (the executor adapts imports to the codebase):
       ```
       bun -e "import { getSql } from './db'; const sql = getSql(); const rows = await sql\`SELECT table_name, column_name FROM information_schema.columns WHERE (table_name='specific_bequest' AND column_name='estimatedValue') OR (table_name='personal_property' AND column_name='insured') OR (table_name='liability' AND column_name IN ('bankAccountId','investmentAccountId'))\`; if (rows.length !== 4) { console.error('MISSING COLUMNS — got', rows); process.exit(1); } console.log('OK — all 4 new columns present', rows.map(r=>r.column_name)); process.exit(0);"
       ```
       (4 rows expected: estimatedValue, insured, bankAccountId,
       investmentAccountId. The `insured` column is single-word so its
       information_schema name is `insured`; the camelCase columns appear
       exactly as `estimatedValue` / `bankAccountId` / `investmentAccountId`.)
       The command MUST exit 0 with all four columns present.
    4. Also sync the test-branch DB if the project's test suite runs against
       `.env.test.local` — per the Phase 23 SUMMARY pattern (migration 0012),
       apply the same DDL to the test branch via a postgres.js transaction so
       plan 26-02's tRPC tests pass. Per MEMORY: test branch schema must stay in
       sync with production.
  </action>
  <verify>
    <automated>bun -e "import { getSql } from './db'; const sql = getSql(); const rows = await sql\`SELECT table_name, column_name FROM information_schema.columns WHERE (table_name='specific_bequest' AND column_name='estimatedValue') OR (table_name='personal_property' AND column_name='insured') OR (table_name='liability' AND column_name IN ('bankAccountId','investmentAccountId'))\`; if (rows.length !== 4) { console.error('MISSING', rows); process.exit(1); } console.log('OK', rows.length); process.exit(0);"</automated>
  </verify>
  <acceptance_criteria>
    - `bun run db:deploy` completes (or manual postgres.js apply succeeds)
    - The `information_schema.columns` query returns exactly 4 rows: `estimatedValue` on specific_bequest, `insured` on personal_property, `bankAccountId` + `investmentAccountId` on liability
    - The runtime `bun -e` verification command exits 0
    - `drizzle.__drizzle_migrations` contains a row for migration 0013 with a hash matching the migration file content
  </acceptance_criteria>
  <done>All five columns exist on the live DB (and test branch); runtime check exits 0.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| migration → live Postgres | DDL applied by `db:deploy`; no user input crosses here |
| (no client boundary in this plan) | router/form mutation surface is added in plan 26-02 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-26-02 | I (Information disclosure) / Tampering | New `estimatedValue` / `insured` / FK columns on RLS-enabled tables (`specific_bequest`, `personal_property`, `liability`) | accept (N/A — no new policy needed) | `specific_bequest`, `personal_property`, `liability` already `.enableRLS()` with column-agnostic `crud-authenticated-policy-*` policies (`app.is_admin()` for liability/personal_property; admin-OR-own-row for specific_bequest). RLS policies in Postgres are row-scoped, not column-scoped — a new column on an already-protected table inherits the table's policies automatically. No ALTER POLICY / new pgPolicy is required. Rationale for `accept`: adding columns does not widen the row-visibility surface; reads/writes of the new columns are gated by the same policies that already gate every other column on these tables. |
| T-26-03 | D (Denial of service) / data loss | Migration 0013 itself (DDL on three populated tables) | mitigate | All three changes are non-destructive: nullable ADD COLUMN (`estimatedValue`), ADD COLUMN with DEFAULT false (`insured` — Postgres backfills existing rows with the default, no table rewrite lock concern at this row count), and nullable FK columns + `ADD CONSTRAINT ... ON DELETE SET NULL`. No DROP, no NOT NULL on an unbacked column, no data transform. Zero data-loss risk. `IF NOT EXISTS` on ADD COLUMN makes a partial re-run safe. |

Note: T-26-01 (cross-entity FK tampering on the liability router) is dispositioned in plan 26-02 — this plan adds no mutation surface, so the threat does not yet apply here. It is recorded in 26-02's threat_model.
</threat_model>

<verification>
- `bun run typecheck` exits 0 (schema + relations compile).
- `drizzle/0013_kpi_schema_completeness.sql` contains the 4 ADD COLUMN
  statements + 2 FK constraints, all column identifiers camelCase.
- The live-DB `information_schema.columns` runtime check exits 0 with 4 columns.
- `drizzle/meta/_journal.json` and the snapshot file are in lockstep with the
  migration filename.
</verification>

<success_criteria>
- specific_bequest.estimatedValue, personal_property.insured,
  liability.bankAccountId, liability.investmentAccountId all exist on the live
  database.
- liability has working FK relations to bankAccount and investmentAccount in
  db/relations.ts.
- Migration 0013 is the canonical record of these changes, applied and journaled.
</success_criteria>

<output>
After completion, create
`.planning/phases/26-schema-completeness-for-kpi-data/26-01-SUMMARY.md`.
</output>
