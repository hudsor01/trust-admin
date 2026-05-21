# Phase 28: firearm-schema-and-migration — Research

**Researched:** 2026-05-21
**Domain:** Drizzle pgTable schema extension, pgEnum creation, polymorphic CHECK constraint update, RLS migration
**Confidence:** HIGH (all findings from direct codebase inspection; no assumptions on schema-level claims)

---

## Summary

Phase 28 is a pure schema-and-migration phase: no frontend, no tRPC router. It delivers the `firearm` pgTable, 4 new pgEnums, `document.firearmId` FK + updated CHECK, `valuation.firearmId` FK + updated CHECK, Zod schemas in `db/validation.ts`, and a clean applied Drizzle migration. The `firearm` table is the 8th asset class — it follows the `vehicle` pattern exactly. There are no new npm dependencies.

The primary execution risk is the polymorphic CHECK constraint update on both `document` and `valuation`. The current `document_single_owner_check` expression counts 8 FK columns and requires `= 1`. Adding `firearmId` makes it 9. The valuation check currently counts 6 columns. If `db:generate` emits DROP + recreate for the altered constraints, the migration must be verified to contain the correct updated expressions before applying. If it emits `ALTER TABLE ... DROP CONSTRAINT ... ADD CONSTRAINT`, the planner must verify the new CHECK expression is correct.

The secondary risk is the camelCase column name gotcha — documented via migration 0008 which failed exactly this way. Migration 0013 (the most recent, applied Phase 26) confirms that ADD COLUMN statements generated from camelCase schema declarations emit correct quoted camelCase identifiers (`"bankAccountId"`, not `"bank_account_id"`). The risk is specifically in raw SQL sub-blocks: UPDATE, DEFAULT expressions, and inline CHECK constraint SQL. The Phase 28 migration must be hand-audited before `db:migrate`.

There is one explicit scope-vs-success-criteria discrepancy to resolve: **serial number uniqueness scope** (addressed below).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Firearm table definition + enums | Database | — | pgTable, pgEnum declarations in db/schema.ts emit DDL |
| RLS policies | Database | — | pgPolicy() declarations inside pgTable emit ALTER TABLE ENABLE + CREATE POLICY |
| Zod validation schemas | API / Backend | — | db/validation.ts schemas consumed by tRPC input parsing (Phase 29) |
| document.firearmId FK | Database | — | Alters existing document table; must update polymorphic CHECK |
| valuation.firearmId FK | Database | — | Alters existing valuation table; must update polymorphic CHECK |
| Migration sequencing | Database | — | drizzle-kit generate → hand-audit → drizzle-kit migrate |

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FIRE-01 | Admin can add a firearm record with core identity fields — name, make, model, serial number, firearm type, caliber, barrel length | `firearm` pgTable with `name`, `make`, `model`, `serialNumber`, `firearmType` enum, `caliber`, `barrelLength`; `insertFirearmSchema` with serialNumber validation |
| FIRE-02 | Admin can classify a firearm as an NFA item and record its NFA class, ATF form type, ATF control number, and tax-stamp date | `isNfa`, `nfaClass`, `atfFormType`, `atfControlNumber`, `taxStampDate` columns; `NfaClass`, `AtfFormType` enums |
| FIRE-03 | Admin can record a firearm's DOD valuation, NRA condition grade, and acquisition details | `dodValue`, `dodValueDate`, `dodValueType`, `condition` (FirearmCondition enum), `acquisitionDate`, `acquisitionCost` columns |
| FIRE-04 | Admin can track a firearm's storage location, insured flag, and transfer status | `location`, `insured`, `transferStatus` columns (reuse existing `transferStatus` enum) |
| FIRE-05 | Admin can track ATF Form 5 transfer progress separately from generic transfer status | `nfaTransferStatus` column (new `NfaTransferStatus` enum: `NOT_FILED`, `FILED`, `APPROVED`) |
| FIRE-08 | Admin can attach ATF-form and tax-stamp documents to a firearm record | `document.firearmId` FK; updated `document_single_owner_check` from 8 → 9 FK columns |
| FIRE-09 | Admin can record appraisal / valuation history for a firearm | `valuation.firearmId` FK; updated `valuation_single_asset_check` from 6 → 7 FK columns |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

- `db:deploy` only — `db:push` is explicitly broken for this schema (corrupts RLS policies). The `package.json` `db:push` script itself prints `'WARNING: db:push has RLS policy bugs. Use db:deploy instead.'`. [VERIFIED: codebase]
- **camelCase column names in Postgres** — all column identifiers are camelCase (`"serialNumber"`, `"dodValue"`, `"nfaClass"`, etc.). Table names stay snake_case (`firearm`, `bank_account`). [VERIFIED: codebase — migration 0008 header comment + migration 0013 SQL confirm this]
- **Migration gotcha:** drizzle-kit sometimes emits snake_case column references in raw SQL blocks (UPDATE, DEFAULT, CHECK). Always hand-audit the generated migration SQL before applying. [VERIFIED: codebase — MEMORY.md + 0008 migration header]
- Use `getClient()` (postgres.js) to surface migration errors — `getSql()` (Neon HTTP) reports DDL success even on failure. [VERIFIED: db/index.ts]
- `bun run db:deploy` = `drizzle-kit generate` + `drizzle-kit migrate` in one step. [VERIFIED: package.json]
- Migration output directory: `./drizzle/` (from drizzle.config.ts `out: './drizzle'`). [VERIFIED: codebase]

---

## Standard Stack

### Core (Phase 28 only — no new dependencies)

| Library | Version | Purpose | Source |
|---------|---------|---------|--------|
| drizzle-orm | 0.45.2 | `pgTable`, `pgEnum`, `pgPolicy`, `check`, `foreignKey`, `uniqueIndex`, `index` | [VERIFIED: npm registry + package.json] |
| drizzle-kit | 0.31.10 | `generate` + `migrate` commands | [VERIFIED: npm registry + package.json] |
| drizzle-zod | 0.8.3 | `createInsertSchema`, `createSelectSchema` | [VERIFIED: npm registry + package.json] |
| zod | 4.4.3 | Schema overrides, `requireAtLeastOneField` | [VERIFIED: npm registry + package.json] |

**No new packages needed.** Zero new npm installs.

---

## Package Legitimacy Audit

> No new packages — this phase installs nothing. Section not applicable.

**Packages added:** none

---

## Architecture Patterns

### Firearm Table — Exact Column List

Based on FEATURES.md (authoritative field list) reconciled against `vehicle`'s actual schema (verified from `db/schema.ts` lines 413–491) and the locked STATE.md v5.0 decisions:

```typescript
// db/schema.ts — add after personalProperty, before inventoryAnalysisCache

export const firearmType = pgEnum('FirearmType', [
    'PISTOL',
    'REVOLVER',
    'RIFLE',
    'SHOTGUN',
    'OTHER',
])

export const nfaClass = pgEnum('NfaClass', [
    'SUPPRESSOR',
    'SBR',
    'SBS',
    'MACHINE_GUN',
    'AOW',
    'DESTRUCTIVE_DEVICE',
])

export const atfFormType = pgEnum('AtfFormType', [
    'FORM_1',
    'FORM_4',
    'FORM_5',
])

export const firearmCondition = pgEnum('FirearmCondition', [
    'POOR',
    'FAIR',
    'GOOD',
    'VERY_GOOD',
    'EXCELLENT',
    'NEW',
])

export const nfaTransferStatus = pgEnum('NfaTransferStatus', [
    'NOT_FILED',
    'FILED',
    'APPROVED',
])

export const firearm = pgTable(
    'firearm',
    (t) => ({
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
        entityId: bigint({ mode: 'number' }).notNull(),
        name: t.text().notNull(),
        description: t.text(),
        // Core identity
        make: t.text().notNull(),
        model: t.text().notNull(),
        serialNumber: t.text().notNull(),
        firearmType: firearmType().notNull(),
        caliber: t.text(),
        barrelLength: t.numeric({ precision: 6, scale: 2 }),
        action: t.text(),
        // NFA classification
        isNfa: t.boolean().default(false).notNull(),
        nfaClass: nfaClass(),                    // nullable — only set when isNfa=true
        atfFormType: atfFormType(),              // nullable — form under which item was registered
        atfControlNumber: t.text(),
        taxStampDate: t.timestamp({ precision: 3, mode: 'string', withTimezone: true }),
        nfaTransferStatus: nfaTransferStatus(), // nullable — only relevant when isNfa=true
        // Estate valuation (shared pattern with all transferable assets)
        acquisitionDate: t.timestamp({ precision: 3, mode: 'string', withTimezone: true }),
        acquisitionCost: t.numeric({ precision: 12, scale: 2 }),
        dodValue: t.numeric({ precision: 14, scale: 2 }),
        dodValueDate: t.timestamp({ precision: 3, mode: 'string', withTimezone: true }),
        dodValueType: valuationType(),           // reuse existing enum
        condition: firearmCondition().default('GOOD').notNull(),
        // Lifecycle
        status: recordStatus().default('ACTIVE').notNull(),
        transferStatus: transferStatus().default('PENDING').notNull(),
        // Physical tracking
        location: t.text(),
        insured: t.boolean().default(false).notNull(),
        notes: t.text(),
        createdAt: t.timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`).notNull(),
        updatedAt: t.timestamp({ precision: 3, mode: 'string', withTimezone: true }).notNull(),
    }),
    (table) => [
        uniqueIndex('firearm_serial_number_key').using(
            'btree',
            table.serialNumber.asc().nullsLast().op('text_ops'),
        ),
        index('idx_firearm_entity_id').on(table.entityId),
        index('idx_firearm_status').on(table.status),
        foreignKey({
            columns: [table.entityId],
            foreignColumns: [entity.id],
            name: 'firearm_entity_id_fkey',
        }).onUpdate('cascade').onDelete('restrict'),
        pgPolicy('crud-authenticated-policy-select', {
            as: 'permissive', for: 'select', to: ['authenticated'],
            using: sql`( SELECT app.is_admin() AS is_admin)`,
        }),
        pgPolicy('crud-authenticated-policy-insert', {
            as: 'permissive', for: 'insert', to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-update', {
            as: 'permissive', for: 'update', to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-delete', {
            as: 'permissive', for: 'delete', to: ['authenticated'],
        }),
    ],
).enableRLS()
```

[VERIFIED: codebase — vehicle table pattern at db/schema.ts:413–491; enum naming convention from existing pgEnum declarations]

### Why 5 Enums, Not 2

ARCHITECTURE.md listed only `nfaClass`. FEATURES.md is the authoritative field list and specifies 5 enums. STATE.md locked `nfaTransferStatus` as `NOT_FILED / FILED / APPROVED`. All 5 are needed:

| Enum | Drizzle name | Values | Notes |
|------|-------------|--------|-------|
| FirearmType | `firearmType` | PISTOL, REVOLVER, RIFLE, SHOTGUN, OTHER | Physical form factor — orthogonal to NFA class |
| NfaClass | `nfaClass` | SUPPRESSOR, SBR, SBS, MACHINE_GUN, AOW, DESTRUCTIVE_DEVICE | Regulatory classification — only set when isNfa=true |
| AtfFormType | `atfFormType` | FORM_1, FORM_4, FORM_5 | Form type under which item was registered |
| FirearmCondition | `firearmCondition` | POOR, FAIR, GOOD, VERY_GOOD, EXCELLENT, NEW | NRA grading scale for valuation |
| NfaTransferStatus | `nfaTransferStatus` | NOT_FILED, FILED, APPROVED | ATF Form 5 lifecycle — separate from generic `transferStatus` |

**Existing enums reused (no modification):** `transferStatus` (PENDING/STARTED/COMPLETE), `recordStatus` (ACTIVE/etc.), `valuationType` (APPRAISAL/etc.)

**`SURRENDERED` on `transferStatus` is OUT OF SCOPE** — confirmed by STATE.md v5.0 and REQUIREMENTS.md Out of Scope table. The `nfaRegistered` boolean + notes handle unregistered NFA items.

### Enum Naming Convention

[VERIFIED: codebase] Existing pgEnum declarations use PascalCase for the Postgres type name as the first argument, and camelCase for the exported JS variable:

```typescript
export const transferStatus = pgEnum('TransferStatus', [...])  // JS var: camelCase, PG type: PascalCase
export const recordStatus = pgEnum('RecordStatus', [...])
export const valuationType = pgEnum('ValuationType', [...])
export const documentType = pgEnum('DocumentType', [...])
```

New enums follow the same convention: `firearmType` / `'FirearmType'`, `nfaClass` / `'NfaClass'`, etc.

### document CHECK Constraint — Exact Before/After

**Current state** [VERIFIED: db/schema.ts:1583–1595]:

```sql
-- document_single_owner_check (CURRENT — 8 FK columns, requires = 1)
(CASE WHEN entityId IS NOT NULL THEN 1 ELSE 0 END +
 CASE WHEN vehicleId IS NOT NULL THEN 1 ELSE 0 END +
 CASE WHEN homesteadId IS NOT NULL THEN 1 ELSE 0 END +
 CASE WHEN rentalPropertyId IS NOT NULL THEN 1 ELSE 0 END +
 CASE WHEN bankAccountId IS NOT NULL THEN 1 ELSE 0 END +
 CASE WHEN investmentAccountId IS NOT NULL THEN 1 ELSE 0 END +
 CASE WHEN insurancePolicyId IS NOT NULL THEN 1 ELSE 0 END +
 CASE WHEN personalPropertyId IS NOT NULL THEN 1 ELSE 0 END
) = 1
```

**After Phase 28 — add `firearmId` (9 FK columns)**:

```sql
-- document_single_owner_check (PHASE 28 — 9 FK columns)
(CASE WHEN entityId IS NOT NULL THEN 1 ELSE 0 END +
 CASE WHEN vehicleId IS NOT NULL THEN 1 ELSE 0 END +
 CASE WHEN homesteadId IS NOT NULL THEN 1 ELSE 0 END +
 CASE WHEN rentalPropertyId IS NOT NULL THEN 1 ELSE 0 END +
 CASE WHEN bankAccountId IS NOT NULL THEN 1 ELSE 0 END +
 CASE WHEN investmentAccountId IS NOT NULL THEN 1 ELSE 0 END +
 CASE WHEN insurancePolicyId IS NOT NULL THEN 1 ELSE 0 END +
 CASE WHEN personalPropertyId IS NOT NULL THEN 1 ELSE 0 END +
 CASE WHEN firearmId IS NOT NULL THEN 1 ELSE 0 END
) = 1
```

**document column additions required:**
- `firearmId: bigint({ mode: 'number' })` (nullable FK)
- `index('idx_document_firearm_id').on(table.firearmId)`
- `foreignKey({ columns: [table.firearmId], foreignColumns: [firearm.id], name: 'document_firearm_id_fkey' }).onUpdate('cascade').onDelete('set null')`

### valuation CHECK Constraint — Exact Before/After

**Current state** [VERIFIED: db/schema.ts:1206–1216]:

```sql
-- valuation_single_asset_check (CURRENT — 6 FK columns, requires = 1)
(CASE WHEN vehicleId IS NOT NULL THEN 1 ELSE 0 END +
 CASE WHEN homesteadId IS NOT NULL THEN 1 ELSE 0 END +
 CASE WHEN rentalPropertyId IS NOT NULL THEN 1 ELSE 0 END +
 CASE WHEN bankAccountId IS NOT NULL THEN 1 ELSE 0 END +
 CASE WHEN investmentAccountId IS NOT NULL THEN 1 ELSE 0 END +
 CASE WHEN personalPropertyId IS NOT NULL THEN 1 ELSE 0 END
) = 1
```

Note: `valuation` does NOT have an `entityId` column in the CHECK — unlike `document` which includes `entityId` as a valid single-owner target. The valuation table is always owned by a specific asset, never by the entity directly.

**After Phase 28 — add `firearmId` (7 FK columns)**:

```sql
-- valuation_single_asset_check (PHASE 28 — 7 FK columns)
(CASE WHEN vehicleId IS NOT NULL THEN 1 ELSE 0 END +
 CASE WHEN homesteadId IS NOT NULL THEN 1 ELSE 0 END +
 CASE WHEN rentalPropertyId IS NOT NULL THEN 1 ELSE 0 END +
 CASE WHEN bankAccountId IS NOT NULL THEN 1 ELSE 0 END +
 CASE WHEN investmentAccountId IS NOT NULL THEN 1 ELSE 0 END +
 CASE WHEN personalPropertyId IS NOT NULL THEN 1 ELSE 0 END +
 CASE WHEN firearmId IS NOT NULL THEN 1 ELSE 0 END
) = 1
```

**valuation column additions required:**
- `firearmId: bigint({ mode: 'number' })` (nullable FK, after `personalPropertyId`)
- `index('idx_valuation_firearm_id').on(table.firearmId)`
- `foreignKey({ columns: [table.firearmId], foreignColumns: [firearm.id], name: 'valuation_firearm_id_fkey' }).onUpdate('cascade').onDelete('set null')`

### Zod Validation Pattern

[VERIFIED: db/validation.ts] The exact pattern for a vehicle-like asset:

```typescript
// db/validation.ts — add firearm schemas

import { firearm } from './schema'

export const insertFirearmSchema = createInsertSchema(firearm, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
    name: (schema) => schema.min(1, 'Name is required'),
    make: (schema) => schema.min(1, 'Make is required'),
    model: (schema) => schema.min(1, 'Model is required'),
    serialNumber: (schema) =>
        schema
            .min(1, 'Serial number is required')
            .max(50, 'Serial number must be 50 characters or fewer')
            .trim(),
    acquisitionCost: () => positiveNumberValidation,
    dodValue: () => positiveNumberValidation,
})
export const selectFirearmSchema = createSelectSchema(firearm)
export const updateFirearmSchema = requireAtLeastOneField(
    insertFirearmSchema.partial(),
)
```

Key validation choices [CITED: ATF Form 4473 Box 16 per FEATURES.md research]:
- `serialNumber` max 50 chars (ATF Form 4473 allows up to 40 chars — 50 gives minor buffer for unusual formats)
- `caliber` free text with implicit `.trim()` from the schema (Zod string schema normalizes via `createInsertSchema`)
- `positiveNumberValidation` for `acquisitionCost` and `dodValue` — matches vehicle/homestead/rentalProperty precedent
- No `vinValidation`-equivalent for serial numbers — serial numbers have no standardized format (manufacturer-specific, 4–40 alphanumeric chars)

### relations.ts Pattern

[VERIFIED: db/relations.ts:60–68] Vehicle relation pattern to copy:

```typescript
// db/relations.ts — add to imports: firearm
// Add to entityRelations: firearms: many(firearm)
// Add new relation:

export const firearmRelations = relations(firearm, ({ one, many }) => ({
    entity: one(entity, {
        fields: [firearm.entityId],
        references: [entity.id],
    }),
    valuations: many(valuation),
    documents: many(document),
}))
```

The `entityRelations` gains `firearms: many(firearm)` in the `many()` declarations.

### Migration Mechanics

**Directory:** `./drizzle/` (not `./db/migrations/` — that folder contains manually applied one-off SQL). The drizzle-kit output goes to `./drizzle/` per `drizzle.config.ts`. [VERIFIED: codebase]

**Current migration index:** 0013 is the last applied migration. Phase 28 generates `0014_<name>.sql`. [VERIFIED: drizzle/meta/_journal.json]

**Migration sequence:**
1. Edit `db/schema.ts` — add 5 pgEnums, `firearm` table, update `document` and `valuation`
2. Edit `db/relations.ts` — add `firearmRelations`, add `firearms` to `entityRelations`
3. Edit `db/validation.ts` — add 3 schemas
4. `bun run db:generate` → emits `drizzle/0014_<name>.sql`
5. **Hand-audit 0014:** verify all column identifiers in CREATE TABLE, ADD COLUMN, and the CHECK constraint expressions use camelCase (not snake_case). Verify the `firearm_serial_number_key` unique index declaration. Verify the check constraint expressions include all 9 (document) and 7 (valuation) FK columns with correct quoted camelCase names.
6. `bun run db:migrate` to apply
7. Verify RLS and table existence

**What to audit in the generated migration SQL:**
- Column names in `CREATE TABLE "firearm"` — must be `"serialNumber"`, `"firearmType"`, `"isNfa"`, `"nfaClass"`, `"atfFormType"`, `"atfControlNumber"`, `"taxStampDate"`, `"nfaTransferStatus"`, `"acquisitionDate"`, `"acquisitionCost"`, `"dodValue"`, `"dodValueDate"`, `"dodValueType"`, `"firearmCondition"`, `"entityId"`, `"barrelLength"`, `"createdAt"`, `"updatedAt"` — all camelCase
- `ALTER TABLE "document" ADD COLUMN "firearmId"` — must be `"firearmId"` not `"firearm_id"`
- `ALTER TABLE "valuation" ADD COLUMN "firearmId"` — must be `"firearmId"`
- The `DROP CONSTRAINT` + `ADD CONSTRAINT` blocks for `document_single_owner_check` and `valuation_single_asset_check` — verify the new CHECK expression uses `"firearmId"` not `"firearm_id"` in the CASE WHEN clauses
- The enum type names: `'FirearmType'`, `'NfaClass'`, `'AtfFormType'`, `'FirearmCondition'`, `'NfaTransferStatus'`

**How to surface migration errors when db:migrate exits with bare exit code 1:**
Use `getClient()` (postgres.js, `db/index.ts:132`) — not `getSql()` (Neon HTTP, `db/index.ts:119`). `getSql()` reports DDL success even when nothing persists; `getClient()` surfaces the real Postgres error. [VERIFIED: MEMORY.md + db/index.ts]

**Test-branch sync:** Per the Phase 26 precedent (STATE.md decision + `scripts/apply-0013-testbranch.ts`), a committed idempotent postgres.js transaction script should be created at `scripts/apply-0014-testbranch.ts`. The script pattern is established: postgres.js `sql.begin(async (tx) => {...})` with `IF NOT EXISTS` guards on ADD COLUMN and `DO $$ BEGIN IF NOT EXISTS ... END $$` guards on ADD CONSTRAINT. The production DB guard pattern from `apply-0013-testbranch.ts` must be preserved.

### RLS Policy Source of Truth

[VERIFIED: db/rls.ts header comment] `db/rls.ts` is **documentation only** — no Drizzle pgRole/pgPolicy objects are used there. RLS policies for existing tables were applied via `db/migrations/add-rls-policies.sql` (a manual script, applied once).

For the `firearm` table, the RLS policy approach is **different**: the four `pgPolicy()` declarations inside the `pgTable()` definition in `schema.ts` are the source of truth. `db:generate` + `db:migrate` will emit the `ALTER TABLE "firearm" ENABLE ROW LEVEL SECURITY` and `CREATE POLICY` statements into the migration SQL automatically. This is the same mechanism used for all other tables that have `pgPolicy` + `.enableRLS()` in the schema (confirmed by comparing `vehicle` schema declarations vs the `add-rls-policies.sql` content — vehicle appears there, meaning the policies were applied historically via that script, but new tables added via drizzle-kit will get policies inline in the generated migration).

**Verification after migration:**
```sql
-- Confirm RLS is enabled
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'firearm';
-- relrowsecurity must be 't'

-- Confirm policies exist
SELECT policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'firearm';
-- Must have 4 rows: crud-authenticated-policy-select/insert/update/delete
```

### Recommended Project Structure

This phase modifies 4 existing files and creates no new directories:

```
db/
├── schema.ts        MODIFIED — 5 new pgEnums, firearm pgTable, document FK, valuation FK
├── relations.ts     MODIFIED — firearmRelations, entityRelations.firearms
├── validation.ts    MODIFIED — insertFirearmSchema, selectFirearmSchema, updateFirearmSchema
drizzle/
└── 0014_<name>.sql  NEW (generated by db:generate)
scripts/
└── apply-0014-testbranch.ts  NEW — idempotent test-branch sync script
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Zod schema for firearm table | Custom z.object() | `createInsertSchema(firearm, {...})` from drizzle-zod | Stays in sync with table type automatically; same pattern as all 25+ other schemas in validation.ts |
| Serial number uniqueness | Application-level dedup check | `uniqueIndex` in pgTable + handle `23505` in tRPC create (Phase 29) | DB constraint is the only reliable guarantee; race conditions defeat app-level checks |
| RLS policies | Raw SQL in a separate script | `pgPolicy()` inside `pgTable()` + `.enableRLS()` | Generates correctly into the migration; `add-rls-policies.sql` was a one-off for pre-existing tables, not the ongoing pattern |
| Polymorphic ownership check | Separate ownership table or nullable discriminator | `check()` expression counting CASE WHEN IS NOT NULL | Established pattern in this codebase for both `document` and `valuation` |
| Migration recovery | Delete stale `drizzle.__drizzle_migrations` row | Update hash field after manual SQL apply | Per MEMORY.md: DELETE causes re-run on next migrate; UPDATE hash is correct recovery |

---

## Serialization Uniqueness: Global vs Per-Entity — Resolution

**The discrepancy:** PITFALLS.md recommends a **global** unique index (serial numbers identify physical firearms regardless of ownership). Success criterion #2 in the phase description says "same `serialNumber` for the same entity" — implying a **per-entity** composite unique index.

**Analysis:**
- ATF serial numbers are manufacturer-assigned and globally unique on the specific firearm (the physical item). However: (a) different manufacturers can and do use the same serial number format, (b) the ATF identifies a specific firearm by the combination of manufacturer + model + serial number, not serial number alone, (c) the Hudson Trust is a single-entity app (entity ID 1) so global vs per-entity produces identical results today.
- The `vehicle` precedent uses `uniqueIndex('Vehicle_vin_key').using('btree', table.vin...)` — a **global** unique index (VINs are globally unique by ISO standard).
- Following the `vehicle` pattern exactly (as locked in STATE.md) means a **global** unique index.
- However, the success criterion says "same serialNumber for the same entity" — this is the validation check the criterion wants to observe, not necessarily an architectural mandate for a composite index.

**Recommendation:** Use a **global** unique index on `serialNumber`, consistent with the `vehicle` precedent and ATF recordkeeping semantics. The success criterion is still satisfied: if you insert two rows with the same `serialNumber` for the same entity, the global unique index raises the violation. The criterion does not say the constraint scope must be per-entity — it says the behavior (violation raised on duplicate) must occur. Global index produces that behavior.

**Index declaration:**
```typescript
uniqueIndex('firearm_serial_number_key').using(
    'btree',
    table.serialNumber.asc().nullsLast().op('text_ops'),
)
```

---

## NFA Conditional CHECK Constraint — Analysis

FEATURES.md recommends a table-level CHECK: `CHECK (isNfa = false OR nfaClass IS NOT NULL)`.

**How to declare in Drizzle:**
```typescript
// Inside the (table) => [...] array:
check(
    'firearm_nfa_class_required_check',
    sql`(${table.isNfa} = false OR ${table.nfaClass} IS NOT NULL)`,
)
```

**Should it ship in Phase 28?**

Arguments for: Enforces data integrity at the DB level; `nfaClass` IS NULL when `isNfa = true` is a data model error; the schema knows about this constraint.

Arguments against: (1) The tRPC router (Phase 29) will enforce this at the application layer anyway; (2) a DB-level CHECK means any bulk data edit or seed operation must also comply; (3) it adds one more thing to the CHECK constraint that can produce an opaque error if violated.

**Recommendation:** Include it. DB-level enforcement is correct for a constraint that must hold across all write paths (tRPC, seeds, direct SQL). The error message from Postgres is reasonably clear. Declare it using the `check()` helper — same mechanism as `document_single_owner_check` and `valuation_single_asset_check`.

The migration must verify: the emitted CHECK constraint SQL uses `"isNfa"` and `"nfaClass"` (camelCase), not `"is_nfa"` and `"nfa_class"`.

---

## Common Pitfalls

### Pitfall 1: CHECK Constraint Column Reference Goes snake_case
**What goes wrong:** drizzle-kit emits the CHECK expression for `document_single_owner_check` with `"firearm_id"` instead of `"firearmId"`. Migration applies, but every subsequent INSERT to `document` with `firearmId` set fails with `column "firearm_id" does not exist` (Postgres evaluates the CHECK at runtime).
**Why it happens:** Same root cause as the 0008 migration failure — drizzle-kit raw SQL blocks sometimes use snake_case even when schema is camelCase.
**How to avoid:** Open `drizzle/0014_<name>.sql` after generation. Find every `CASE WHEN` clause in the document and valuation constraint expressions. Verify `"firearmId"` not `"firearm_id"`. Same check for the NFA conditional CHECK on the `firearm` table itself.
**Warning signs:** Migration applies cleanly but `INSERT INTO document (firearmId, ...) VALUES (...)` fails immediately.

### Pitfall 2: Missing `.enableRLS()` on firearm Table
**What goes wrong:** `pgPolicy()` entries are present inside the `pgTable()` call but `.enableRLS()` is omitted from the chain. Policies are registered but RLS is not enabled — effectively a no-op protection. `pg_class.relrowsecurity` will be `f`.
**How to avoid:** The `.enableRLS()` must be the last chained call: `}).enableRLS()`. Verify with `SELECT relrowsecurity FROM pg_class WHERE relname = 'firearm'` after migration.

### Pitfall 3: db:push Used Instead of db:deploy
**What goes wrong:** `bun run db:push` mishandles RLS policies on this schema (documented failure). The `db:push` script itself prints a warning but proceeds.
**How to avoid:** Always `bun run db:deploy`. Never `bun run db:push`. The warning in `package.json` is there for a reason.

### Pitfall 4: CHECK Constraint Not Updated When Adding FK to document/valuation
**What goes wrong:** `firearmId` FK column is added to `document` but the `document_single_owner_check` is not updated (still requires 8 FKs = 1). Every INSERT to `document` with `firearmId` set now violates the CHECK (8 FKs = 0, 9 is impossible with old check counting only 8). Every INSERT without `firearmId` is unaffected. Result: ATF document attachment silently fails.
**How to avoid:** The schema edit must update the `check()` call to add the ninth CASE WHEN. Drizzle-kit will detect the changed constraint and emit DROP + ADD in the migration. Verify the migration contains both the DROP and ADD for both `document_single_owner_check` and `valuation_single_asset_check`.

### Pitfall 5: Migration Output Directory Confusion
**What goes wrong:** Developer looks in `db/migrations/` for the generated migration file. It is not there. `db/migrations/` contains manually applied one-off scripts (numbered 0001-004 and named add-rls-*.sql). drizzle-kit output goes to `./drizzle/` per `drizzle.config.ts`.
**How to avoid:** Generated migration is at `./drizzle/0014_<name>.sql`. The meta directory is `./drizzle/meta/`.

### Pitfall 6: Stale __drizzle_migrations Row
**What goes wrong:** Migration fails partway through. The `drizzle.__drizzle_migrations` table has a row with the migration hash but the schema changes are partially applied. Re-running `db:migrate` skips the migration (it's already recorded). The schema is in a broken state.
**Recovery:** Per MEMORY.md — apply remaining SQL manually via `getClient()` (postgres.js), then UPDATE the hash in `drizzle.__drizzle_migrations` to the correct sha256 of the file. Do NOT delete the row.

---

## Code Examples

### Vehicle Table Declaration (exact template) [VERIFIED: db/schema.ts:413–491]

```typescript
export const vehicle = pgTable(
    'vehicle',
    (t) => ({
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
        entityId: bigint({ mode: 'number' }).notNull(),
        name: t.text().notNull(),
        description: t.text(),
        year: t.integer().notNull(),
        make: t.text().notNull(),
        model: t.text().notNull(),
        vin: t.text().notNull(),
        color: t.text(),
        titleStatus: titleStatus().default('CLEAR').notNull(),
        licensePlate: t.text(),
        mileage: t.integer(),
        acquisitionDate: t.timestamp({ precision: 3, mode: 'string', withTimezone: true }),
        acquisitionCost: t.numeric({ precision: 12, scale: 2 }),
        dodValue: t.numeric({ precision: 14, scale: 2 }),
        dodValueDate: t.timestamp({ precision: 3, mode: 'string', withTimezone: true }),
        dodValueType: valuationType(),
        status: recordStatus().default('ACTIVE').notNull(),
        transferStatus: transferStatus().default('PENDING').notNull(),
        notes: t.text(),
        createdAt: t.timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`).notNull(),
        updatedAt: t.timestamp({ precision: 3, mode: 'string', withTimezone: true }).notNull(),
    }),
    (table) => [
        uniqueIndex('Vehicle_vin_key').using('btree', table.vin.asc().nullsLast().op('text_ops')),
        index('idx_vehicle_entity_id').on(table.entityId),
        index('idx_vehicle_status').on(table.status),
        foreignKey({ columns: [table.entityId], foreignColumns: [entity.id], name: 'vehicle_entity_id_fkey' })
            .onUpdate('cascade').onDelete('restrict'),
        pgPolicy('crud-authenticated-policy-select', { as: 'permissive', for: 'select', to: ['authenticated'], using: sql`( SELECT app.is_admin() AS is_admin)` }),
        pgPolicy('crud-authenticated-policy-insert', { as: 'permissive', for: 'insert', to: ['authenticated'] }),
        pgPolicy('crud-authenticated-policy-update', { as: 'permissive', for: 'update', to: ['authenticated'] }),
        pgPolicy('crud-authenticated-policy-delete', { as: 'permissive', for: 'delete', to: ['authenticated'] }),
    ],
).enableRLS()
```

### requireAtLeastOneField Pattern [VERIFIED: db/validation.ts:42–49]

```typescript
function requireAtLeastOneField<T extends z.ZodObject<z.ZodRawShape>>(schema: T) {
    return schema.refine(
        (data) => Object.values(data).some((v) => v !== undefined),
        { message: 'Update requires at least one field to be provided' },
    )
}
// Usage:
export const updateFirearmSchema = requireAtLeastOneField(insertFirearmSchema.partial())
```

### Migration 0013 Generated SQL Pattern [VERIFIED: drizzle/0013_kpi_schema_completeness.sql]

drizzle-kit emits camelCase for columns declared camelCase in the schema:

```sql
-- camelCase column names emitted correctly:
ALTER TABLE "liability" ADD COLUMN IF NOT EXISTS "bankAccountId" bigint;
ALTER TABLE "personal_property" ADD COLUMN IF NOT EXISTS "insured" boolean DEFAULT false NOT NULL;
ALTER TABLE "liability" ADD CONSTRAINT "liability_bank_account_id_fkey"
    FOREIGN KEY ("bankAccountId") REFERENCES "public"."bank_account"("id")
    ON DELETE set null ON UPDATE cascade;
CREATE INDEX IF NOT EXISTS "idx_liability_bank_account_id" ON "liability" USING btree ("bankAccountId");
```

Note: FK constraint names use snake_case (`liability_bank_account_id_fkey`) while column references use camelCase (`"bankAccountId"`). The Phase 28 migration must follow the same pattern.

### Test-Branch Sync Script Pattern [VERIFIED: scripts/apply-0013-testbranch.ts]

```typescript
// scripts/apply-0014-testbranch.ts
import postgres from 'postgres'

const url = process.env.DATABASE_URL
if (!url) { console.error('DATABASE_URL not set'); process.exit(1) }

// Production guard (mirrors db-guard pattern)
const isProductionDb = url.includes('-pooler.') && !url.includes('/br-') && !process.env.ALLOW_PRODUCTION_DB
if (isProductionDb) { console.error('Refusing: production DB detected'); process.exit(1) }

const sql = postgres(url, { max: 1 })

try {
    await sql.begin(async (tx) => {
        // CREATE TYPE must come before CREATE TABLE
        await tx`CREATE TYPE IF NOT EXISTS "FirearmType" AS ENUM ('PISTOL', 'REVOLVER', 'RIFLE', 'SHOTGUN', 'OTHER')`
        // ... other enums
        await tx`CREATE TABLE IF NOT EXISTS "firearm" (...)`
        // ADD COLUMN to document and valuation with IF NOT EXISTS
        await tx`ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "firearmId" bigint`
        // FK with DO $$ existence guard
        await tx`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_firearm_id_fkey') THEN ALTER TABLE "document" ADD CONSTRAINT "document_firearm_id_fkey" FOREIGN KEY ("firearmId") REFERENCES "public"."firearm"("id") ON DELETE set null ON UPDATE cascade; END IF; END $$`
        // DROP OLD CHECK + ADD NEW CHECK for document
        // DROP OLD CHECK + ADD NEW CHECK for valuation
    })
    console.log('Migration 0014 applied to test branch')
} finally {
    await sql.end()
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Drizzle-kit push for new tables | `db:generate` + `db:migrate` (`db:deploy`) | v4.0 (RLS corruption discovered) | All schema changes must use deploy path; push is broken |
| Snake_case column names | camelCase everywhere in Postgres | Pre-existing convention | Every migration column reference must be quoted camelCase |
| RLS via separate `add-rls-policies.sql` | `pgPolicy()` inline in `pgTable()` → emitted by drizzle-kit | v4.0 onward for new tables | New tables get RLS policy SQL automatically in generated migration |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `pgPolicy()` inline in new `pgTable()` definitions causes drizzle-kit to emit `ALTER TABLE ENABLE ROW LEVEL SECURITY` + `CREATE POLICY` statements in the generated migration | Migration Mechanics, RLS section | If drizzle-kit does NOT emit these statements, the firearm table will be unprotected; must manually verify migration SQL before applying |
| A2 | drizzle-kit will emit `DROP CONSTRAINT` + `ADD CONSTRAINT` for the altered CHECK constraints on document and valuation | CHECK Constraint sections | If it emits only `ADD COLUMN` without updating the constraints, the polymorphic CHECK will be wrong; must verify in generated SQL |

**All schema-level claims (column types, exact constraint expressions, enum values, table structure) are VERIFIED from direct codebase inspection.**

---

## Open Questions

1. **NFA Conditional CHECK — include or defer?**
   - What we know: The `isNfa = false OR nfaClass IS NOT NULL` constraint is technically sound and follows the CHECK pattern in this codebase.
   - What's unclear: Whether the planner wants DB enforcement or application-layer enforcement only (Phase 29 router can enforce).
   - Recommendation: Include the DB CHECK. Schema enforcement is the right layer for invariants that should hold across all write paths.

2. **`prohibitedPersonCheck` boolean field — include or defer?**
   - PITFALLS.md recommends a `prohibitedPersonCheck` boolean to record trustee attestation before setting `transferStatus = COMPLETE`. FEATURES.md does not include it in the table stakes field list; it's listed as a Phase 2 concern there.
   - STATE.md has no locked decision on this field.
   - Recommendation: Include it. It's one boolean column (`prohibitedPersonCheck: t.boolean().default(false).notNull()`), costs nothing in schema complexity, and PITFALLS.md rates omitting it as "never acceptable" for trustee liability reasons. Easier to add now than in a later migration.

3. **`nfaRegistered` boolean field — include or defer?**
   - PITFALLS.md recommends this boolean to distinguish registered NFA items (legal to transfer via Form 5) from unregistered (contraband, must surrender). STATE.md has no explicit decision on it.
   - FEATURES.md does not include it in the table stakes field list.
   - Recommendation: Include it as `nfaRegistered: t.boolean()` (nullable — NULL for non-NFA items, true/false for NFA items). Complements `isNfa` and gates the warning logic in Phase 30 UI. Adding it later requires another migration.

---

## Environment Availability

> This phase is pure code/config — no external CLI tools beyond what's already installed.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| drizzle-kit | `bun run db:deploy` | ✓ | 0.31.10 | — |
| bun | All scripts | ✓ | runtime | — |
| Neon Postgres (production branch) | `db:migrate` | ✓ | — | — |
| Neon Postgres (test branch) | `scripts/apply-0014-testbranch.ts` | ✓ | — | — |

---

## Validation Architecture

> `workflow.nyquist_validation` is absent from `.planning/config.json` — treating as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | bun test (built-in) |
| Config file | `package.json` `test` script |
| Quick run command | `bun test tests/trpc` |
| Full suite command | `bun test --timeout 30000 tests/api tests/components tests/lib tests/trpc tests/*.test.ts` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Exists? |
|--------|----------|-----------|-------------------|---------|
| FIRE-01..05 | `insertFirearmSchema` accepts valid firearm, rejects missing required fields | unit | `bun test tests/trpc` (schema test) | ❌ Wave 0 |
| FIRE-01 | `serialNumber` uniqueness — DB raises 23505 on duplicate | integration | manual via `bun run db:studio` or seed insert | ❌ |
| FIRE-08 | `document` with `firearmId` set passes CHECK constraint | integration | manual SQL insert test | ❌ |
| FIRE-08 | `document` with `firearmId` + another FK raises CHECK violation | integration | manual SQL insert test | ❌ |
| FIRE-09 | `valuation` with `firearmId` set passes CHECK constraint | integration | manual SQL insert test | ❌ |
| FIRE-05 | `updateFirearmSchema.partial()` rejects empty object | unit | `bun test tests/trpc` | ❌ Wave 0 |

> Phase 28 has no router or UI — automated tests are limited to Zod schema validation unit tests and manual DB verification. The success criteria (#1-#5) are all verified via direct DB inspection after migration, which is the appropriate validation method for a pure schema phase.

### Sampling Rate
- **Per task commit:** `bun run typecheck` (schema types must compile clean before any subsequent phase can start)
- **Phase gate:** `bun run typecheck && bun run lint` green + all 5 success criteria verified via DB queries

### Wave 0 Gaps
- [ ] `tests/trpc/firearm-schema.test.ts` — Zod schema unit tests for `insertFirearmSchema` and `updateFirearmSchema`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | yes | RLS via pgPolicy + `.enableRLS()`; `app.is_admin()` function gates all 4 ops |
| V5 Input Validation | yes | Zod schemas in `db/validation.ts` with `positiveNumberValidation`, `min(1)`, `max(50)` on serialNumber |
| V6 Cryptography | no | — |

### Known Threat Patterns for Schema Phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Beneficiary reads firearm location/serialNumber | Information Disclosure | RLS `app.is_admin()` on ALL 4 ops — beneficiary role returns empty set |
| SQL injection via CHECK constraint column names | Tampering | Drizzle parameterized template — `sql\`...\`` template literals, not string interpolation |
| Missing `.enableRLS()` silently disables RLS | Elevation of Privilege | Post-migration verification: `SELECT relrowsecurity FROM pg_class WHERE relname = 'firearm'` |

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)
- `db/schema.ts` — vehicle table (lines 413–491), document table (lines 1481–1622), valuation table (lines 1129–1243), personalProperty table (lines 1320–1413), all enum definitions (lines 23–261), exact CHECK constraint expressions
- `db/validation.ts` — `createInsertSchema` pattern, `requireAtLeastOneField`, `positiveNumberValidation`, `vinValidation`, all existing schemas
- `db/relations.ts` — `vehicleRelations` pattern, `entityRelations` many() declarations
- `db/index.ts` — `getClient()` vs `getSql()` distinction, `getPublicDb()`
- `db/rls.ts` — documentation-only header confirms pgPolicy in schema.ts is the active pattern for new tables
- `drizzle/0013_kpi_schema_completeness.sql` — confirms camelCase column identifiers in drizzle-kit generated ADD COLUMN statements
- `drizzle/0008_add_name_description_to_assets.sql` — confirms hand-edit was needed for older migration (historical); 0013 shows the auto-generation now works correctly for camelCase columns
- `drizzle/meta/_journal.json` — confirms next migration will be `0014_<name>.sql`
- `drizzle.config.ts` — confirms `out: './drizzle'` (not `./db/migrations/`)
- `package.json` — exact `db:generate`, `db:migrate`, `db:deploy` script definitions; drizzle-orm 0.45.2, drizzle-kit 0.31.10, drizzle-zod 0.8.3
- `scripts/apply-0013-testbranch.ts` — exact test-branch sync pattern for Phase 28 to replicate
- `.planning/STATE.md` — locked v5.0 decisions: enum names, valuation FK scope, SURRENDERED exclusion
- `CLAUDE.md` — db:deploy vs db:push, camelCase column convention, migration gotcha, db:studio verification

### Secondary (MEDIUM confidence — milestone research docs)
- `.planning/research/FEATURES.md` — authoritative field list, NFA domain research, ATF source citations
- `.planning/research/ARCHITECTURE.md` — component boundaries, migration sequencing
- `.planning/research/PITFALLS.md` — 15 pitfalls including serialNumber uniqueness scope recommendation
- `.planning/research/SUMMARY.md` — executive reconciliation across all researchers

### Tertiary (LOW confidence — flagged)
- A1, A2 in Assumptions Log — drizzle-kit behavior regarding pgPolicy and CHECK constraint updates; must be verified by inspecting generated SQL before `db:migrate`

---

## Metadata

**Confidence breakdown:**
- Schema design: HIGH — all column types, constraint expressions, and enum values verified from codebase
- Migration mechanics: HIGH — verified from 0013 SQL, drizzle.config.ts, package.json scripts
- RLS: MEDIUM-HIGH — pgPolicy in schema.ts is confirmed pattern; exact SQL emitted by drizzle-kit for new pgPolicy entries is ASSUMED (A1 above)
- Pitfalls: HIGH — drawn directly from documented failures (MEMORY.md, 0008 header) + codebase inspection

**Research date:** 2026-05-21
**Valid until:** 2026-06-21 (stable stack; drizzle-kit behavior unlikely to change within 30 days)
