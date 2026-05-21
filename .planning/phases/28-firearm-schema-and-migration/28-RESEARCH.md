# Phase 28: firearm-schema-and-migration — Research

**Researched:** 2026-05-21
**Domain:** Drizzle pgTable schema extension, pgEnum creation, polymorphic CHECK constraint update, RLS migration
**Confidence:** HIGH (all findings from direct codebase inspection; no assumptions on schema-level claims)

---

## Summary

Phase 28 is a pure schema/migration phase — no tRPC router, no UI. The deliverables are: 4 new pgEnums, a new `firearm` pgTable (the 8th asset table), two polymorphic FK column additions (`document.firearmId`, `valuation.firearmId`) with updated CHECK constraints, Zod schemas in `db/validation.ts`, and a clean applied Drizzle migration.

The `vehicle` table is the exact structural template for `firearm`. The shared-column set is verified from the live schema: `id` (bigint identity PK), `entityId` (FK→entity, notNull), `name`, `description`, `dodValue`, `dodValueDate`, `dodValueType`, `status`, `transferStatus`, `notes`, `createdAt`, `updatedAt`. Firearm adds its own domain columns on top.

The `document_single_owner_check` constraint currently sums **8 FK columns** (entityId + 7 asset FKs). Adding `firearmId` to `document` extends it to 9. The `valuation_single_asset_check` currently sums **6 FK columns**. Adding `firearmId` extends it to 7. Both constraints must be dropped and re-added as part of the migration — a DROP CONSTRAINT / ADD CONSTRAINT pair. This is the primary migration risk for existing tables.

The migration will be index 14 in the Drizzle journal (current highest is 13: `0013_kpi_schema_completeness.sql`). The output directory is `./drizzle/` (not `./db/migrations/`). The `db:deploy` command runs `drizzle-kit generate` then `drizzle-kit migrate` — always use this, never `db:push`.

**Primary recommendation:** Follow the `vehicle` pattern exactly. Hand-audit the generated migration for camelCase column references before applying. The four key audit points are: enum type names in CREATE TYPE, column identifiers in ADD COLUMN and CREATE INDEX statements, column references in the CHECK constraint drop/re-add SQL, and the `name` column field in the `firearm` table itself.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Firearm table + enums | Database / Storage | — | Schema DDL lives entirely in DB; no app logic in Phase 28 |
| Zod validation schemas | API / Backend | — | `db/validation.ts` is consumed by tRPC routers (Phase 29) |
| RLS policies | Database / Storage | — | pgPolicy entries in schema.ts are emitted into migration SQL |
| document.firearmId FK | Database / Storage | — | ALTER TABLE on existing table; constraint update required |
| valuation.firearmId FK | Database / Storage | — | ALTER TABLE on existing table; constraint update required |

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FIRE-01 | Admin can add a firearm record with core identity fields — name, make, model, serial number, firearm type, caliber, barrel length | `firearm` pgTable defined below covers all fields; `insertFirearmSchema` validates them |
| FIRE-02 | Admin can classify a firearm as NFA and record NFA class, ATF form type, ATF control number, tax-stamp date | `isNfa` boolean + `nfaClass`, `atfFormType`, `atfControlNumber`, `taxStampDate` columns in table definition |
| FIRE-03 | Admin can record DOD valuation, NRA condition grade, and acquisition details | `dodValue`/`dodValueDate`/`dodValueType` (shared pattern), `condition` (new enum), `acquisitionDate`/`acquisitionCost` columns |
| FIRE-04 | Admin can track storage location, insured flag, and transfer status | `location`, `insured`, `transferStatus` columns (mirrors `personalProperty` pattern) |
| FIRE-05 | Admin can track ATF Form 5 transfer progress separately from generic transfer status | `nfaTransferStatus` column using new `NfaTransferStatus` pgEnum (`NOT_FILED`, `FILED`, `APPROVED`) |
| FIRE-08 | Admin can attach ATF-form and tax-stamp documents to a firearm record | `document.firearmId` FK column added + `document_single_owner_check` updated from 8 → 9 FKs |
| FIRE-09 | Admin can record appraisal / valuation history for a firearm | `valuation.firearmId` FK column added + `valuation_single_asset_check` updated from 6 → 7 FKs |
</phase_requirements>

---

## Ground Truth: Live Schema State

All findings below are from direct codebase inspection of `db/schema.ts` and the drizzle snapshot `drizzle/meta/0013_snapshot.json` (which reflects exactly what drizzle-kit knows about the current DB state).

### Existing `transferStatus` enum — MUST NOT be modified

```typescript
// db/schema.ts line 178 [VERIFIED: direct codebase read]
export const transferStatus = pgEnum('TransferStatus', [
    'PENDING',
    'STARTED',
    'COMPLETE',
])
```

STATE.md explicitly locks: `SURRENDERED` value is OUT OF SCOPE. Do not add it.

### Existing `valuationType` enum — reused by `firearm.dodValueType`

```typescript
// db/schema.ts line 103 [VERIFIED: direct codebase read]
export const valuationType = pgEnum('ValuationType', [
    'APPRAISAL', 'MARKET_ESTIMATE', 'TAX_ASSESSED', 'STATEMENT_BALANCE',
    'PURCHASE_PRICE', 'BOOK_VALUE', 'SELF_ASSESSED', 'STATEMENT',
])
```

### Existing `recordStatus` enum — reused by `firearm.status`

Values include: `ACTIVE`, `INACTIVE`, `OPEN`, `PENDING`, `CLOSED`, `FROZEN`, `SOLD`, `TRANSFERRED`, `DISPOSED`, `PAID_OFF`, and more. Default for assets: `'ACTIVE'`.

### Existing `documentType` enum — no change needed

Already has `'OTHER'` which covers ATF documents. No new values required.

### `vehicle` pgTable — exact structural template for `firearm`

[VERIFIED: direct codebase read, db/schema.ts lines 413–491]

Key structural elements to replicate exactly:
- `id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity()`
- `entityId: bigint({ mode: 'number' }).notNull()`
- Unique index: `uniqueIndex('Vehicle_vin_key').using('btree', table.vin.asc().nullsLast().op('text_ops'))` — replicate for `serialNumber`
- Two non-unique indexes: `idx_vehicle_entity_id`, `idx_vehicle_status`
- FK declaration: `foreignKey({ columns: [table.entityId], foreignColumns: [entity.id], name: 'vehicle_entity_id_fkey' }).onUpdate('cascade').onDelete('restrict')`
- Four pgPolicy entries: select/insert/update/delete, all `app.is_admin()` on select, insert/update/delete open to `authenticated`
- `.enableRLS()` chained at end

**Note on vehicle RLS policy details:**
```typescript
// select uses USING clause [VERIFIED]
pgPolicy('crud-authenticated-policy-select', {
    as: 'permissive', for: 'select', to: ['authenticated'],
    using: sql`( SELECT app.is_admin() AS is_admin)`,
})
// insert has NO withCheck — consistent with other asset tables [VERIFIED]
pgPolicy('crud-authenticated-policy-insert', {
    as: 'permissive', for: 'insert', to: ['authenticated'],
})
// update has no using/withCheck — consistent with other asset tables [VERIFIED]
pgPolicy('crud-authenticated-policy-update', {
    as: 'permissive', for: 'update', to: ['authenticated'],
})
// delete has no using — consistent [VERIFIED]
pgPolicy('crud-authenticated-policy-delete', {
    as: 'permissive', for: 'delete', to: ['authenticated'],
})
```

### `document` table current state — VERIFIED from snapshot

Current `document` columns: `id`, `name`, `documentType`, `filePath`, `entityId`, `vehicleId`, `homesteadId`, `rentalPropertyId`, `bankAccountId`, `investmentAccountId`, `insurancePolicyId`, `personalPropertyId`, `documentDate`, `expirationDate`, `notes`, `createdAt`, `updatedAt`.

`document_single_owner_check` counts **8 FK columns** (entityId + 7 asset FKs). Verified from snapshot `0013_snapshot.json`. The Drizzle schema.ts representation is also verified (lines 1583–1596).

Adding `firearmId` → 9 FK columns in the sum expression.

### `valuation` table current state — VERIFIED from snapshot

Current `valuation` columns: `id`, `vehicleId`, `homesteadId`, `rentalPropertyId`, `bankAccountId`, `investmentAccountId`, `personalPropertyId`, `valuationDate`, `value`, `valuationType`, `source`, `notes`, `createdAt`.

`valuation_single_asset_check` counts **6 FK columns** (no entityId, no artworkId — the baseline migration 0000 had artworkId but it was removed; the snapshot and schema.ts both confirm 6-FK state as of migration 0013). Verified from snapshot `0013_snapshot.json`.

Adding `firearmId` → 7 FK columns in the sum expression.

**Note on `artworkId` discrepancy:** The initial migration file `0000_high_ares.sql` shows `artworkId` in `valuation`, but migration `0001_left_nico_minoru.sql` is marked as a historical no-op, and all subsequent snapshots (including 0013) show only 6 FKs in `valuation`. The snapshot is ground truth. Do not include `artworkId` in the updated CHECK constraint.

### Drizzle migration journal state — VERIFIED

Migration index 13 (`0013_kpi_schema_completeness`) is the current highest. The next migration will be index 14 and will be named `drizzle/0014_<drizzle_generated_name>.sql`.

Migration output directory: `./drizzle/` (from `drizzle.config.ts` `out: './drizzle'`).

The `db:deploy` script runs: `drizzle-kit generate --config drizzle.config.ts && drizzle-kit migrate --config drizzle.config.ts`.

### Migration 0013 camelCase confirmation

[VERIFIED: direct read of `drizzle/0013_kpi_schema_completeness.sql`]

Migration 0013 emitted camelCase column identifiers directly without requiring hand-edit: `"bankAccountId"`, `"investmentAccountId"`, `"estimatedValue"`. The comment in 0013 explicitly confirms: "drizzle-kit emitted the ADD COLUMN statements with the correct camelCase already because the new columns are declared with camelCase names in db/schema.ts." This is the precedent for Phase 28.

**However:** The risk documented in CLAUDE.md MEMORY still applies to CREATE TABLE DDL and CHECK constraint re-expressions. Migration 0008 failed on snake_case column references in UPDATE statements. Phase 28's migration touches two existing tables' CHECK constraints via DROP/ADD — those constraint expressions must be inspected for camelCase correctness.

---

## Standard Stack

No new npm packages. All tools are pre-existing in the codebase.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `drizzle-orm` | 0.45 | `pgEnum`, `pgTable`, `check`, `pgPolicy`, `uniqueIndex` | Project ORM |
| `drizzle-zod` | current | `createInsertSchema`, `createSelectSchema` | Project validation |
| `zod` | current | Schema refinements, string validation | Project validation |
| `drizzle-kit` | 0.31.10 | `db:generate` / `db:migrate` / `db:deploy` | Migration tooling |

### Package Legitimacy Audit

No new packages are installed in Phase 28. This section is not applicable.

---

## Architecture Patterns

### Firearm Table System Architecture

```
db/schema.ts
    ├── NEW: pgEnum('FirearmType', [...])
    ├── NEW: pgEnum('NfaClass', [...])
    ├── NEW: pgEnum('AtfFormType', [...])
    ├── NEW: pgEnum('FirearmCondition', [...])
    ├── NEW: pgEnum('NfaTransferStatus', [...])
    ├── NEW: pgTable('firearm', ...).enableRLS()
    ├── MODIFIED: pgTable('document', ...) — add firearmId column + updated CHECK
    └── MODIFIED: pgTable('valuation', ...) — add firearmId column + updated CHECK

db/relations.ts
    ├── NEW: export const firearmRelations (entity→many, valuation→many, document→many)
    ├── MODIFIED: entityRelations — add firearms: many(firearm)
    ├── MODIFIED: valuationRelations — add firearm: one(firearm)
    └── MODIFIED: documentRelations — add firearm: one(firearm)

db/validation.ts
    ├── NEW: insertFirearmSchema
    ├── NEW: selectFirearmSchema
    └── NEW: updateFirearmSchema (= requireAtLeastOneField(insertFirearmSchema.partial()))

drizzle/0014_<name>.sql  [generated by db:generate, hand-audited, applied by db:migrate]
    ├── CREATE TYPE "FirearmType" AS ENUM (...)
    ├── CREATE TYPE "NfaClass" AS ENUM (...)
    ├── CREATE TYPE "AtfFormType" AS ENUM (...)
    ├── CREATE TYPE "FirearmCondition" AS ENUM (...)
    ├── CREATE TYPE "NfaTransferStatus" AS ENUM (...)
    ├── CREATE TABLE firearm (...)
    ├── GENERATED ALWAYS AS IDENTITY (sequence)
    ├── ALTER TABLE document ADD COLUMN "firearmId" bigint
    ├── ALTER TABLE document DROP CONSTRAINT document_single_owner_check
    ├── ALTER TABLE document ADD CONSTRAINT document_single_owner_check CHECK (... 9 FKs ...)
    ├── ALTER TABLE valuation ADD COLUMN "firearmId" bigint
    ├── ALTER TABLE valuation DROP CONSTRAINT valuation_single_asset_check
    ├── ALTER TABLE valuation ADD CONSTRAINT valuation_single_asset_check CHECK (... 7 FKs ...)
    ├── ADD CONSTRAINT firearm_entity_id_fkey FOREIGN KEY (...)
    ├── ADD CONSTRAINT document_firearm_id_fkey FOREIGN KEY (...)
    ├── ADD CONSTRAINT valuation_firearm_id_fkey FOREIGN KEY (...)
    ├── CREATE UNIQUE INDEX "firearm_serial_number_key" ON firearm (...)
    ├── CREATE INDEX idx_firearm_entity_id ON firearm (...)
    ├── CREATE INDEX idx_firearm_status ON firearm (...)
    ├── CREATE INDEX idx_document_firearm_id ON document (...)
    ├── CREATE INDEX idx_valuation_firearm_id ON valuation (...)
    ├── ENABLE ROW LEVEL SECURITY on firearm
    └── CREATE POLICY (4×) on firearm
```

### Recommended Project Structure

No new directories for Phase 28 — all changes are in `db/`.

```
db/
├── schema.ts       # 5 new enums + firearm table + document/valuation modifications
├── relations.ts    # firearmRelations + 3 relation updates
├── validation.ts   # insertFirearmSchema + selectFirearmSchema + updateFirearmSchema
└── (migrations auto-generated into drizzle/)
```

---

## Key Technical Decisions

### 1. Enum Set — Final Recommended Names and Values

[VERIFIED: enum naming convention from direct codebase read — all existing pgEnum names are PascalCase Postgres type names with camelCase TS variable names]

**New enums for Phase 28 (all required by FIRE-01 through FIRE-05):**

```typescript
// Physical form factor — what kind of gun is it [VERIFIED: FEATURES.md recommendation]
export const firearmType = pgEnum('FirearmType', [
    'PISTOL',
    'REVOLVER',
    'RIFLE',
    'SHOTGUN',
    'SUPPRESSOR',
    'SBR',
    'SBS',
    'MACHINE_GUN',
    'AOW',
    'DESTRUCTIVE_DEVICE',
    'OTHER',
])

// Regulatory NFA classification — orthogonal to physical type [VERIFIED: FEATURES.md]
export const nfaClass = pgEnum('NfaClass', [
    'SUPPRESSOR',
    'SBR',
    'SBS',
    'MACHINE_GUN',
    'AOW',
    'DESTRUCTIVE_DEVICE',
])

// ATF form type under which item was last registered/transferred [VERIFIED: FEATURES.md]
export const atfFormType = pgEnum('AtfFormType', [
    'FORM_1',
    'FORM_4',
    'FORM_5',
])

// NRA modern firearms grading scale [VERIFIED: FEATURES.md + NRA grading standards]
export const firearmCondition = pgEnum('FirearmCondition', [
    'POOR',
    'FAIR',
    'GOOD',
    'VERY_GOOD',
    'EXCELLENT',
    'NEW',
])

// ATF Form 5 estate transfer filing status — separate from generic transferStatus
// (covers FIRE-05; STATE.md decision: 3-value enum NOT_FILED/FILED/APPROVED)
export const nfaTransferStatus = pgEnum('NfaTransferStatus', [
    'NOT_FILED',
    'FILED',
    'APPROVED',
])
```

**Why separate `firearmType` and `nfaClass`:** A rifle can have `firearmType = 'RIFLE'` and `nfaClass = 'SBR'` if the barrel was cut. A pistol can have `firearmType = 'PISTOL'` and `nfaClass = 'AOW'` in edge cases. They are orthogonal attributes, not the same dimension. This is confirmed in both FEATURES.md and PITFALLS.md (Pitfall 11).

**Why `nfaTransferStatus` not `form5Status`:** STATE.md locks the 3-value set `NOT_FILED | FILED | APPROVED`. SUMMARY.md resolved the FEATURES.md (3-value) vs PITFALLS.md (5-value) discrepancy in favor of the simpler 3-value set. The column name `nfaTransferStatus` matches STATE.md's explicit decision.

### 2. `firearm` Table — Complete Column Specification

```typescript
export const firearm = pgTable(
    'firearm',
    (t) => ({
        // --- PK + entity scope (vehicle pattern) ---
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
        entityId: bigint({ mode: 'number' }).notNull(),

        // --- Core identity (FIRE-01) ---
        name: t.text().notNull(),                          // display label
        description: t.text(),
        make: t.text().notNull(),                          // manufacturer
        model: t.text().notNull(),                         // model designation
        serialNumber: t.text().notNull(),                  // unique — see uniqueIndex below
        firearmType: firearmType().notNull(),               // physical form factor
        caliber: t.text(),                                 // free-text, Zod .trim()
        barrelLength: t.numeric({ precision: 6, scale: 2 }), // inches; SBR/SBS relevance

        // --- NFA fields (FIRE-02) ---
        isNfa: t.boolean().default(false).notNull(),
        nfaClass: nfaClass(),                              // nullable — set when isNfa = true
        atfFormType: atfFormType(),                        // FORM_1 / FORM_4 / FORM_5
        atfControlNumber: t.text(),                        // ATF approval number on stamp
        taxStampDate: t.timestamp({
            precision: 3, mode: 'string', withTimezone: true,
        }),
        nfrtrSerial: t.text(),                             // may differ from serialNumber
        nfaRegistered: t.boolean(),                        // null=unknown, false=unregistered contraband

        // --- NFA Form 5 transfer status (FIRE-05) ---
        nfaTransferStatus: nfaTransferStatus(),            // nullable — only meaningful when isNfa=true

        // --- Estate/valuation fields (FIRE-03) — shared asset pattern ---
        acquisitionDate: t.timestamp({
            precision: 3, mode: 'string', withTimezone: true,
        }),
        acquisitionCost: t.numeric({ precision: 12, scale: 2 }),
        dodValue: t.numeric({ precision: 14, scale: 2 }),
        dodValueDate: t.timestamp({
            precision: 3, mode: 'string', withTimezone: true,
        }),
        dodValueType: valuationType(),                     // reuses existing enum
        condition: firearmCondition().default('GOOD').notNull(), // NRA grade (FIRE-03)

        // --- Shared lifecycle fields (vehicle pattern) ---
        status: recordStatus().default('ACTIVE').notNull(),
        transferStatus: transferStatus().default('PENDING').notNull(),

        // --- Storage/physical tracking (FIRE-04) ---
        location: t.text(),
        insured: t.boolean().default(false).notNull(),     // mirrors personalProperty.insured

        // --- Metadata ---
        notes: t.text(),
        createdAt: t.timestamp({
            precision: 3, mode: 'string', withTimezone: true,
        }).default(sql`CURRENT_TIMESTAMP`).notNull(),
        updatedAt: t.timestamp({
            precision: 3, mode: 'string', withTimezone: true,
        }).notNull(),
    }),
    (table) => [
        // Serial number uniqueness — see Section 3 for global vs per-entity decision
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

### 3. Serial Number Uniqueness: Global vs Per-Entity

**Discrepancy:** PITFALLS.md (Pitfall 9) recommends a **global** unique index ("serial numbers identify specific physical firearms regardless of ownership"). Success criterion #2 says "same `serialNumber` for the same entity" — implying per-entity.

**Resolution: Use a global uniqueIndex.** Rationale:

1. A firearm's serial number is engraved on the physical receiver by federal law and is globally unique per ATF regulations. Two different trusts cannot legitimately hold two firearms with the same serial number.
2. The `vehicle` table uses `uniqueIndex('Vehicle_vin_key')` on VIN — also a globally unique physical identifier. The firearm precedent follows the vehicle precedent.
3. Success criterion #2 says "A unique-index violation is raised when inserting two firearm rows with the same `serialNumber` for the same entity" — this is true whether the index is global or per-entity. A global unique index satisfies this criterion (and is stricter).
4. The trust has a single entity. Even if multi-entity were ever supported, duplicate serial numbers across entities are physically impossible.

**Index name:** `'firearm_serial_number_key'` following the `'Vehicle_vin_key'` naming pattern.

### 4. NFA Conditional CHECK Constraint

**Question:** Should a DB-level CHECK enforce `isNfa = false OR nfaClass IS NOT NULL`?

**Recommendation: NO — do not add a conditional CHECK constraint for Phase 28.** Rationale:

1. Drizzle's `check()` helper emits a `CHECK` constraint in DDL. This pattern exists in the codebase for the polymorphic FK constraints (valuation, document, transaction). However, those constraints are structural requirements; the NFA conditionality is business logic.
2. A CHECK constraint `(isNfa = false OR nfaClass IS NOT NULL)` would block seeding or importing historical records where the NFA class is filled in later, creates friction in partial saves (e.g., user checks `isNfa` then must immediately provide `nfaClass` before saving), and is better enforced in the Zod schema for `insertFirearmSchema`.
3. The Zod validation should use `.refine()` to enforce this: `(data) => !data.isNfa || data.nfaClass != null`.
4. The UI enforces it further by gating the NFA field group on `isNfa`.

If this is reconsidered, the Drizzle syntax would be:
```typescript
check('firearm_nfa_class_check',
    sql`(${table.isNfa} = false OR ${table.nfaClass} IS NOT NULL)`)
```

### 5. Updated CHECK Constraints

**`document_single_owner_check` — updated expression (8 → 9 FKs):**

The Drizzle schema.ts change adds `firearmId: bigint({ mode: 'number' })` to the `document` column map, adds a `CASE WHEN` to the existing `check()` call, adds a `foreignKey` declaration, and adds an `index('idx_document_firearm_id')`.

New CHECK in `schema.ts`:
```typescript
check(
    'document_single_owner_check',
    sql`(
        (CASE WHEN ${table.entityId} IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN ${table.vehicleId} IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN ${table.homesteadId} IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN ${table.rentalPropertyId} IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN ${table.bankAccountId} IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN ${table.investmentAccountId} IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN ${table.insurancePolicyId} IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN ${table.personalPropertyId} IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN ${table.firearmId} IS NOT NULL THEN 1 ELSE 0 END
        ) = 1
    )`,
)
```

The generated migration will emit a DROP CONSTRAINT + ADD CONSTRAINT pair. Inspect the generated SQL to verify camelCase column references (e.g., `"firearmId"` not `"firearm_id"`).

**`valuation_single_asset_check` — updated expression (6 → 7 FKs):**

```typescript
check(
    'valuation_single_asset_check',
    sql`(
        (CASE WHEN ${table.vehicleId} IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN ${table.homesteadId} IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN ${table.rentalPropertyId} IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN ${table.bankAccountId} IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN ${table.investmentAccountId} IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN ${table.personalPropertyId} IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN ${table.firearmId} IS NOT NULL THEN 1 ELSE 0 END
        ) = 1
    )`,
)
```

---

## Zod Validation Schema Pattern

[VERIFIED: direct codebase read of `db/validation.ts`]

The `vehicle` pattern in `db/validation.ts`:
```typescript
export const insertVehicleSchema = createInsertSchema(vehicle, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
    vin: () => vinValidation,
    acquisitionCost: () => positiveNumberValidation,
    dodValue: () => positiveNumberValidation,
    name: (schema) => schema.min(1, 'Name is required'),
})
export const selectVehicleSchema = createSelectSchema(vehicle)
export const updateVehicleSchema = requireAtLeastOneField(insertVehicleSchema.partial())
```

**`insertFirearmSchema` — recommended overrides:**

```typescript
export const insertFirearmSchema = createInsertSchema(firearm, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
    name: (schema) => schema.min(1, 'Name is required'),
    make: (schema) => schema.min(1, 'Make is required'),
    model: (schema) => schema.min(1, 'Model is required'),
    serialNumber: () => z.string()
        .min(1, 'Serial number is required')
        .max(50, 'Serial number must be 50 characters or fewer')  // ATF Form 4473 allows up to 40; 50 is safe ceiling
        .trim()
        .regex(/^[A-Za-z0-9\-]+$/, 'Serial number must contain only letters, numbers, and hyphens'),
    caliber: (schema) => schema.trim().optional(),
    acquisitionCost: () => positiveNumberValidation,
    dodValue: () => positiveNumberValidation,
}).refine(
    (data) => !data.isNfa || data.nfaClass != null,
    { message: 'NFA class is required when firearm is classified as NFA', path: ['nfaClass'] }
)

export const selectFirearmSchema = createSelectSchema(firearm)

export const updateFirearmSchema = requireAtLeastOneField(insertFirearmSchema.partial())
```

**`requireAtLeastOneField` helper** — already defined at line 42 of `db/validation.ts`. Used on all 26 existing update schemas. The firearm update schema must use it too (STATE.md: "requireAtLeastOneField() Zod .refine() on all 26 update schemas").

Note: `insertFirearmSchema.partial()` produces a partial schema, then `requireAtLeastOneField()` wraps it with the "at least one field" refine. These are chained correctly — `updateFirearmSchema` will be the 27th such schema.

---

## Migration Mechanics

### Step-by-Step Migration Protocol

1. Edit `db/schema.ts`:
   - Add 5 new pgEnum declarations in the enums section (after existing enums, before `activityLog` table)
   - Add `firearm` pgTable after `personalProperty` (line ~1413), before `inventoryAnalysisCache`
   - Add `firearmId: bigint({ mode: 'number' })` column to `document` table
   - Update `document_single_owner_check` to include `firearmId` CASE WHEN (8→9)
   - Add `foreignKey` for `document.firearmId` → `firearm.id` with `.onUpdate('cascade').onDelete('set null')`
   - Add `index('idx_document_firearm_id').on(table.firearmId)` to document
   - Add `firearmId: bigint({ mode: 'number' })` column to `valuation` table
   - Update `valuation_single_asset_check` to include `firearmId` CASE WHEN (6→7)
   - Add `foreignKey` for `valuation.firearmId` → `firearm.id` with `.onUpdate('cascade').onDelete('set null')`
   - Add `index('idx_valuation_firearm_id').on(table.firearmId)` to valuation

2. Edit `db/relations.ts`:
   - Add `import { firearm }` to imports
   - Add `firearmRelations` export
   - Add `firearms: many(firearm)` to `entityRelations`
   - Add `firearm: one(firearm, { fields: [valuation.firearmId], references: [firearm.id] })` to `valuationRelations`
   - Add `firearm: one(firearm, { fields: [document.firearmId], references: [firearm.id] })` to `documentRelations`

3. Edit `db/validation.ts`:
   - Add `firearm` to imports from `./schema`
   - Add `insertFirearmSchema`, `selectFirearmSchema`, `updateFirearmSchema`

4. Run `bun run db:generate` — generates `drizzle/0014_<name>.sql`

5. **Hand-audit the generated SQL before applying.** Audit checklist:
   - All `CREATE TYPE` statements use the PascalCase names: `"FirearmType"`, `"NfaClass"`, `"AtfFormType"`, `"FirearmCondition"`, `"NfaTransferStatus"`
   - `CREATE TABLE firearm` column names are camelCase: `"entityId"`, `"serialNumber"`, `"firearmType"`, `"isNfa"`, `"nfaClass"`, `"atfFormType"`, `"atfControlNumber"`, `"taxStampDate"`, `"nfrtrSerial"`, `"nfaRegistered"`, `"nfaTransferStatus"`, `"acquisitionDate"`, `"acquisitionCost"`, `"dodValue"`, `"dodValueDate"`, `"dodValueType"`, `"barrelLength"`, `"createdAt"`, `"updatedAt"`, `"transferStatus"`, `"insured"`
   - `DROP CONSTRAINT document_single_owner_check` and re-add with 9-FK expression — column refs camelCase
   - `DROP CONSTRAINT valuation_single_asset_check` and re-add with 7-FK expression — column refs camelCase
   - `ADD COLUMN "firearmId"` (not `"firearm_id"`) in both `document` and `valuation`
   - `CREATE UNIQUE INDEX "firearm_serial_number_key"` uses camelCase `"serialNumber"`
   - FK constraint names follow naming conventions: `firearm_entity_id_fkey`, `document_firearm_id_fkey`, `valuation_firearm_id_fkey`

6. Run `bun run db:migrate` (or `db:deploy` to combine steps 4+6)

7. Post-migration verification SQL:
   ```sql
   -- Verify RLS enabled
   SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'firearm';
   -- Expected: relrowsecurity = true

   -- Verify policies exist
   SELECT policyname, cmd FROM pg_policies WHERE tablename = 'firearm';
   -- Expected: 4 rows (select, insert, update, delete)

   -- Verify enums created
   SELECT typname FROM pg_type WHERE typname IN (
       'FirearmType', 'NfaClass', 'AtfFormType', 'FirearmCondition', 'NfaTransferStatus'
   );
   -- Expected: 5 rows

   -- Verify table columns
   SELECT column_name FROM information_schema.columns WHERE table_name = 'firearm';

   -- Verify firearmId added to document and valuation
   SELECT column_name FROM information_schema.columns
   WHERE table_name IN ('document', 'valuation') AND column_name = 'firearmId';
   -- Expected: 2 rows
   ```

### Migration Failure Recovery

If `bun run db:migrate` exits with bare exit code 1 and no error message:
1. Run the SQL manually via `getClient()` (postgres.js transaction) — NOT `getSql()` (Neon HTTP reports DDL success even when nothing persists)
2. Check `drizzle.__drizzle_migrations` for a stale row with idx=14 — if present and the SQL was partially applied, update the hash rather than deleting the row (per MEMORY.md stale row recovery)

### Test Branch Sync

STATE.md Phase 23 precedent: "Test branch DB synced manually after db:deploy — migration DDL applied to .env.test.local branch via postgres.js tx so tRPC reorder tests pass."

STATE.md Phase 26 precedent: committed idempotent postgres.js script `scripts/apply-0013-testbranch.ts`.

Phase 28 creates a new table — the test branch must also have the `firearm` table for any Phase 29 tRPC tests to compile and run. The planner must include a task to sync the test branch after the migration is applied to the main DB.

Pattern for Phase 28 test-branch sync script (`scripts/apply-0014-testbranch.ts`):
```typescript
// Apply migration 0014 to .env.test.local DB
// Wrapped in DO $$ existence checks so idempotent
import { getClient } from '../db'
const sql = getClient()
await sql.begin(async (tx) => {
    // CREATE TYPE guards (DO $$ ... EXCEPTION duplicate_object $$ END)
    // CREATE TABLE IF NOT EXISTS firearm (...)
    // ALTER TABLE document ADD COLUMN IF NOT EXISTS "firearmId" bigint
    // DROP CONSTRAINT (IF EXISTS) + ADD CONSTRAINT for document_single_owner_check
    // ALTER TABLE valuation ADD COLUMN IF NOT EXISTS "firearmId" bigint
    // DROP CONSTRAINT (IF EXISTS) + ADD CONSTRAINT for valuation_single_asset_check
    // ADD CONSTRAINT FK (guarded by DO $$ existence check)
    // CREATE INDEX IF NOT EXISTS
    // ENABLE ROW LEVEL SECURITY
    // CREATE POLICY (guarded by DO $$ existence check)
})
```

---

## `db/relations.ts` — Exact Pattern to Follow

[VERIFIED: direct codebase read of `db/relations.ts`]

```typescript
// Add to imports:
// firearm

// New declaration:
export const firearmRelations = relations(firearm, ({ one, many }) => ({
    entity: one(entity, {
        fields: [firearm.entityId],
        references: [entity.id],
    }),
    valuations: many(valuation),
    documents: many(document),
}))

// Modify entityRelations — add after existing many() entries:
//     firearms: many(firearm),

// Modify valuationRelations — add after personalProperty:
//     firearm: one(firearm, {
//         fields: [valuation.firearmId],
//         references: [firearm.id],
//     }),

// Modify documentRelations — add after personalProperty:
//     firearm: one(firearm, {
//         fields: [document.firearmId],
//         references: [firearm.id],
//     }),
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Serial number uniqueness | Custom duplicate-check query | Drizzle `uniqueIndex` on `serialNumber` | DB-enforced; handles race conditions |
| Polymorphic FK tracking | Custom "asset type" enum on firearm | Drizzle `foreignKey` on document/valuation | Existing pattern; CHECK constraint guards integrity |
| NFA status tracking | Custom status table | Single `nfaTransferStatus` column + enum | Simple 3-state lifecycle; no history needed in Phase 28 |
| Conditional field validation | DB CHECK constraint | Zod `.refine()` in `insertFirearmSchema` | More flexible; CHECK prevents partial saves |

---

## Common Pitfalls

### Pitfall 1: camelCase Migration Column References
**What goes wrong:** drizzle-kit emits snake_case column refs (`"firearm_id"`, `"serial_number"`, `"nfa_class"`) in DROP/ADD CONSTRAINT expressions even when the schema uses camelCase column names. The migration fails with `column "firearm_id" does not exist`.
**Why it happens:** drizzle-kit sometimes generates snake_case in raw SQL blocks. Documented failure: migration 0008.
**How to avoid:** Hand-audit every column reference in the generated SQL — especially in the CHECK constraint expressions for `document` and `valuation`. The CREATE TABLE DDL is typically correct; the constraint re-expressions are the risk.
**Warning signs:** `bun run db:migrate` exits with code 1 and no message. Run via `getClient()` postgres.js to surface the real Postgres error.

### Pitfall 2: Missing `.enableRLS()`
**What goes wrong:** Firearm table exists but `relrowsecurity = false`. RLS policies are registered but have no effect.
**How to avoid:** Verify after migration: `SELECT relrowsecurity FROM pg_class WHERE relname = 'firearm'` must return `true`.

### Pitfall 3: Updating CHECK Constraint Without Dropping First
**What goes wrong:** Adding `firearmId` to the CASE WHEN sum without dropping and re-creating the constraint. Postgres does not support `ALTER TABLE ... ALTER CONSTRAINT` for CHECK constraints. The generated migration should DROP + ADD. Verify this is what drizzle-kit emitted.

### Pitfall 4: `db:push` Instead of `db:deploy`
**What goes wrong:** RLS policies are mishandled or dropped. Documented failure in CLAUDE.md.
**How to avoid:** Always `bun run db:deploy`. The `db:push` script now prints a warning and exits. Never override it.

### Pitfall 5: Forgetting Test Branch Sync
**What goes wrong:** Phase 29 tRPC tests fail with `relation "firearm" does not exist` because the test branch DB (`ep-gentle-salad-aef4mc4y`) doesn't have the migration applied.
**How to avoid:** Phase 28 must include a task to create and run a test-branch sync script, following the Phase 23/26 precedent.

### Pitfall 6: SURRENDERED in transferStatus Enum
**What goes wrong:** Temptation to add `SURRENDERED` to the generic `transferStatus` enum for unregistered NFA items.
**How to avoid:** STATE.md explicitly locks this out of scope. The `nfaRegistered` boolean + notes covers unregistered NFA items. Do not modify `transferStatus`.

### Pitfall 7: `valuation_single_asset_check` Count Mismatch
**What goes wrong:** The live DB has 6 FKs in `valuation_single_asset_check` (verified from snapshot 0013). The baseline migration 0000 has 7 (included `artworkId`). Using the baseline migration as the reference would produce the wrong count.
**How to avoid:** Use the snapshot (`drizzle/meta/0013_snapshot.json`) as ground truth, not the baseline SQL. The snapshot confirms: 6 FKs. Adding `firearmId` → 7 FKs.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Bun test (built-in) |
| Config file | none — `bun test` script in `package.json` targets explicit dirs |
| Quick run command | `bun test tests/trpc` |
| Full suite command | `bun test tests/api tests/components tests/lib tests/trpc tests/*.test.ts` |

### Phase Requirements → Test Map

Phase 28 is schema-only. No tRPC router yet (Phase 29). Automated tests for firearm CRUD are Phase 29's concern. Phase 28 has one automation target:

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FIRE-01..05 | `insertFirearmSchema` accepts valid firearm fields | unit | `bun test tests/lib` or new `tests/lib/validation.firearm.test.ts` | No — Wave 0 |
| FIRE-01..05 | `insertFirearmSchema` rejects isNfa=true with null nfaClass | unit | same | No — Wave 0 |
| FIRE-08 | document FK column exists in DB | smoke (post-migration SQL) | manual verify via psql/studio | N/A |
| FIRE-09 | valuation FK column exists in DB | smoke (post-migration SQL) | manual verify via psql/studio | N/A |

### Sampling Rate
- **Per task commit:** `bun run typecheck` (schema types must compile clean before router work in Phase 29)
- **Per wave merge:** `bun test tests/lib` (Zod schema unit tests)
- **Phase gate:** `bun run typecheck` passes with 0 errors; `bun run db:migrate` applied cleanly; RLS verified

### Wave 0 Gaps
- [ ] `tests/lib/validation.firearm.test.ts` — covers Zod schema behavior (valid insert, NFA refine, serial number validation)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Not applicable — schema-only phase |
| V3 Session Management | No | Not applicable |
| V4 Access Control | Yes | `pgPolicy` + `.enableRLS()` on `firearm` table; `app.is_admin()` SELECT guard; all tRPC procedures use `adminProcedure` (Phase 29) |
| V5 Input Validation | Yes | `insertFirearmSchema` with `positiveNumberValidation` for money fields, trim on caliber, serial number regex |
| V6 Cryptography | No | No cryptographic operations |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Serial number + location in exported CSV | Information Disclosure | `location` excluded from default CSV export columns (Phase 30 concern); RLS restricts `firearm` to admin role |
| Cross-entity firearm data access | Elevation of Privilege | `entityId` filter required on all tRPC list/byId/update/delete (Phase 29); RLS is defense-in-depth |
| NFA status spoofing (COMPLETE before ATF approval) | Tampering | `nfaTransferStatus` field exposes status; UI enforcement is Phase 30's concern; schema doesn't auto-set |
| Duplicate serial number insert | Tampering | `uniqueIndex('firearm_serial_number_key')` — DB-enforced globally |

---

## Open Questions

1. **`nfaRegistered` field default value**
   - What we know: Pitfall 3 (PITFALLS.md) recommends `nfaRegistered boolean nullable` with `default null` for `nfaClass = 'NONE'`.
   - What's unclear: Should Phase 28 include this field at all? It's not explicitly listed in FIRE-01 through FIRE-05. The `notes` field substitutes per STATE.md OUT OF SCOPE section.
   - Recommendation: **Include `nfaRegistered boolean` with no default (nullable).** Costs nothing to add in Phase 28 and avoids a future migration for a high-value field. Confirm with plan/human before finalizing.

2. **`action` field (bolt-action, semi-auto, etc.)**
   - What we know: FEATURES.md lists `action: text` as optional but "useful for valuation."
   - What's unclear: Is it in scope for Phase 28?
   - Recommendation: **Include as nullable text column.** Very low cost, no enum needed, useful for insurance and appraisal context. Confirm with plan.

3. **Test-branch sync timing**
   - What we know: Phase 26 used `scripts/apply-0013-testbranch.ts` committed with the migration.
   - What's unclear: Should the script be in the same commit as the migration or a separate task?
   - Recommendation: Same commit as migration, follow Phase 26 pattern exactly.

---

## Environment Availability

No external dependencies for Phase 28. All tooling (drizzle-kit, postgres.js, bun) is already installed.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `drizzle-kit` | `db:generate`, `db:migrate` | ✓ | 0.31.10 (devDep) | — |
| `postgres` (postgres.js) | manual migration recovery | ✓ | via `db/index.ts` `getClient()` | — |
| Neon production DB | `db:migrate` | ✓ | Live (DATABASE_URL) | — |
| Neon test branch DB | test-branch sync script | ✓ | `.env.test.local` branch | — |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `action` (bolt-action/semi-auto field) should be included in `firearm` table | Key Technical Decisions §2 | Minor — removable before migration is applied |
| A2 | `nfaRegistered` boolean should be included despite not being explicitly in FIRE-01..05 | Open Questions #1 | Minor — removable before migration is applied; or requires a future ALTER TABLE migration |
| A3 | Drizzle-kit will emit the DROP CONSTRAINT + ADD CONSTRAINT pair for CHECK updates rather than requiring a manual SQL edit | Migration Mechanics | Medium — if drizzle-kit doesn't emit the DROP/ADD pair, the migration must be hand-edited to include it |

---

## Sources

### Primary (HIGH confidence)
- `db/schema.ts` — all asset table patterns, existing enum definitions, document/valuation CHECK constraints [VERIFIED: direct read]
- `db/validation.ts` — createInsertSchema patterns, requireAtLeastOneField, positiveNumberValidation [VERIFIED: direct read]
- `db/relations.ts` — vehicleRelations, entityRelations, documentRelations, valuationRelations patterns [VERIFIED: direct read]
- `drizzle/meta/0013_snapshot.json` — confirmed live document (8 FK) and valuation (6 FK) CHECK constraint column counts [VERIFIED: direct read + python extraction]
- `drizzle/0013_kpi_schema_completeness.sql` — confirmed camelCase emission from drizzle-kit for ADD COLUMN [VERIFIED: direct read]
- `drizzle/0000_high_ares.sql` — baseline CREATE TABLE vehicle DDL, pgPolicy pattern, uniqueIndex pattern [VERIFIED: direct read]
- `package.json` — exact `db:generate`, `db:migrate`, `db:deploy`, `db:push` scripts [VERIFIED: direct read]
- `drizzle.config.ts` — output directory `./drizzle/`, schema source `./db/schema.ts` [VERIFIED: direct read]
- `db/index.ts` — `getClient()`, `getSql()`, `getPublicDb()` for migration recovery [VERIFIED: direct read]
- `.planning/STATE.md` — all [v5.0] key decisions [VERIFIED: direct read]
- `.planning/REQUIREMENTS.md` — FIRE-01..09 requirement text [VERIFIED: direct read]
- `.planning/research/FEATURES.md` — firearm field list, enum values, NFA legal domain [VERIFIED: direct read]
- `.planning/research/PITFALLS.md` — 15 pitfalls, migration/schema ones extracted [VERIFIED: direct read]
- `./CLAUDE.md` — db:deploy vs db:push, camelCase migration gotcha, RLS section [VERIFIED: direct read]
- MEMORY.md — camelCase migration failure (0008), stale __drizzle_migrations row recovery [VERIFIED: direct read via CLAUDE.md context]

### Secondary (MEDIUM confidence)
- `.planning/research/SUMMARY.md` — milestone research synthesis, confidence levels [CITED: project planning docs]
- `.planning/research/ARCHITECTURE.md` — component boundaries, migration sequencing [CITED: project planning docs]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all pre-existing dependencies, no new packages
- Schema design: HIGH — verified against live schema.ts and drizzle snapshot
- CHECK constraint expressions: HIGH — exact current expressions extracted from snapshot
- Migration mechanics: HIGH — 0013 provides direct precedent for camelCase ADD COLUMN; DROP/ADD for CHECK is standard Postgres DDL
- Pitfalls: HIGH (codebase) — all pitfalls sourced from documented production failures in CLAUDE.md/MEMORY.md

**Research date:** 2026-05-21
**Valid until:** 2026-06-21 (stable schema; no fast-moving dependencies)
