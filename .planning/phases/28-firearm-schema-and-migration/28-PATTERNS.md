# Phase 28: firearm-schema-and-migration — Pattern Map

**Mapped:** 2026-05-21
**Files analyzed:** 6
**Analogs found:** 6 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `db/schema.ts` (add enums + firearm table + document/valuation mods) | model | CRUD | `db/schema.ts` — `vehicle` pgTable (lines 413–488) | exact |
| `db/relations.ts` (add firearmRelations + extend 3 existing) | model | CRUD | `db/relations.ts` — `vehicleRelations` (lines 60–68) + `entityRelations` (lines 30–58) | exact |
| `db/validation.ts` (add 3 firearm schemas) | model | transform | `db/validation.ts` — `insertVehicleSchema` / `updateVehicleSchema` (lines 398–421) | exact |
| `drizzle/0014_<name>.sql` (generated migration) | migration | batch | `drizzle/0013_kpi_schema_completeness.sql` | role-match |
| `scripts/apply-0014-testbranch.ts` | utility | batch | `scripts/apply-0013-testbranch.ts` (lines 1–84) | exact |
| `tests/lib/validation.firearm.test.ts` | test | request-response | `tests/lib/validation.test.ts` (lines 1–100+) | role-match |

---

## Pattern Assignments

### `db/schema.ts` — pgEnum declarations (5 new enums)

**Analog:** `db/schema.ts` lines 23–42 (`recordStatus`), line 178 (`transferStatus`)

**Enum naming convention** (lines 23, 45, 52, 61, 70, 77, 83, 92, 98, 103, 115, 122, 125, 131, 137, 144, 151, 160, 167, 171, 178):
```typescript
// Convention: camelCase TS variable name, PascalCase Postgres type name
export const transferStatus = pgEnum('TransferStatus', [
    'PENDING',
    'STARTED',
    'COMPLETE',
])
```

All 5 new enums follow this exact pattern. Place them in the enums section after line 178 (`transferStatus`), before `activityLog` table:
```typescript
export const firearmType = pgEnum('FirearmType', [
    'PISTOL', 'REVOLVER', 'RIFLE', 'SHOTGUN',
    'SUPPRESSOR', 'SBR', 'SBS', 'MACHINE_GUN',
    'AOW', 'DESTRUCTIVE_DEVICE', 'OTHER',
])

export const nfaClass = pgEnum('NfaClass', [
    'SUPPRESSOR', 'SBR', 'SBS', 'MACHINE_GUN', 'AOW', 'DESTRUCTIVE_DEVICE',
])

export const atfFormType = pgEnum('AtfFormType', [
    'FORM_1', 'FORM_4', 'FORM_5',
])

export const firearmCondition = pgEnum('FirearmCondition', [
    'POOR', 'FAIR', 'GOOD', 'VERY_GOOD', 'EXCELLENT', 'NEW',
])

export const nfaTransferStatus = pgEnum('NfaTransferStatus', [
    'NOT_FILED', 'FILED', 'APPROVED',
])
```

---

### `db/schema.ts` — `firearm` pgTable (new table)

**Analog:** `db/schema.ts` lines 413–491 (`vehicle` pgTable)

**PK + entityId FK pattern** (lines 416–417):
```typescript
id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
entityId: bigint({ mode: 'number' }).notNull(),
```

**Timestamp column pattern** (lines 428–431, 444–451):
```typescript
acquisitionDate: t.timestamp({
    precision: 3,
    mode: 'string',
    withTimezone: true,
}),
createdAt: t
    .timestamp({ precision: 3, mode: 'string', withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
updatedAt: t
    .timestamp({ precision: 3, mode: 'string', withTimezone: true })
    .notNull(),
```

**Numeric money column pattern** (lines 433, 437):
```typescript
acquisitionCost: t.numeric({ precision: 12, scale: 2 }),
dodValue: t.numeric({ precision: 14, scale: 2 }),
```

**Index + FK + RLS block** (lines 452–488) — copy verbatim, substituting `firearm`/`serialNumber` for `vehicle`/`vin`:
```typescript
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
    })
        .onUpdate('cascade')
        .onDelete('restrict'),
    pgPolicy('crud-authenticated-policy-select', {
        as: 'permissive',
        for: 'select',
        to: ['authenticated'],
        using: sql`( SELECT app.is_admin() AS is_admin)`,
    }),
    pgPolicy('crud-authenticated-policy-insert', {
        as: 'permissive',
        for: 'insert',
        to: ['authenticated'],
    }),
    pgPolicy('crud-authenticated-policy-update', {
        as: 'permissive',
        for: 'update',
        to: ['authenticated'],
    }),
    pgPolicy('crud-authenticated-policy-delete', {
        as: 'permissive',
        for: 'delete',
        to: ['authenticated'],
    }),
],
).enableRLS()
```

**Type exports after table** (lines 490–491):
```typescript
export type Firearm = typeof firearm.$inferSelect
export type InsertFirearm = typeof firearm.$inferInsert
```

---

### `db/schema.ts` — `document` table modification (FIRE-08)

**Analog:** `db/schema.ts` lines 1481–1619 (current `document` table)

Add `firearmId` column after `personalPropertyId` (line 1495):
```typescript
personalPropertyId: bigint({ mode: 'number' }),
firearmId: bigint({ mode: 'number' }),   // NEW — add here
```

Add new index after line 1525:
```typescript
index('idx_document_personal_property_id').on(table.personalPropertyId),
index('idx_document_firearm_id').on(table.firearmId),   // NEW
```

Add new foreignKey after line 1578–1581 (personalProperty FK):
```typescript
foreignKey({
    columns: [table.firearmId],
    foreignColumns: [firearm.id],
    name: 'document_firearm_id_fkey',
})
    .onUpdate('cascade')
    .onDelete('set null'),
```

**Updated CHECK constraint** (replaces lines 1583–1596, 8 → 9 FKs):
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
),
```

---

### `db/schema.ts` — `valuation` table modification (FIRE-09)

**Analog:** `db/schema.ts` lines 1129–1240 (current `valuation` table)

Add `firearmId` column after `personalPropertyId` (line 1138):
```typescript
personalPropertyId: bigint({ mode: 'number' }),
firearmId: bigint({ mode: 'number' }),   // NEW — add here
```

Add new index after line 1159–1161 (personalProperty index):
```typescript
index('idx_valuation_personal_property_id').on(table.personalPropertyId),
index('idx_valuation_firearm_id').on(table.firearmId),   // NEW
```

Add new foreignKey after line 1198–1203 (personalProperty FK):
```typescript
foreignKey({
    columns: [table.firearmId],
    foreignColumns: [firearm.id],
    name: 'valuation_firearm_id_fkey',
})
    .onUpdate('cascade')
    .onDelete('set null'),
```

**Updated CHECK constraint** (replaces lines 1205–1217, 6 → 7 FKs):
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
),
```

**Note:** The `valuation` table has NO `entityId` FK. The baseline migration `0000` included `artworkId` but it was removed before migration 0001. Ground truth is snapshot `drizzle/meta/0013_snapshot.json` — 6 FKs. Do not include `artworkId`.

---

### `db/relations.ts` — firearmRelations (new) + 3 extensions

**Analog:** `db/relations.ts` lines 60–68 (`vehicleRelations`), lines 30–58 (`entityRelations`), lines 159–184 (`valuationRelations`), lines 208–241 (`documentRelations`)

**Import addition** (line 2, add `firearm` to import list):
```typescript
import {
    // ... existing imports ...
    firearm,           // ADD
    // ...
} from './schema'
```

**New firearmRelations export** (insert after `personalPropertyRelations` block ~line 206):
```typescript
export const firearmRelations = relations(firearm, ({ one, many }) => ({
    entity: one(entity, {
        fields: [firearm.entityId],
        references: [entity.id],
    }),
    valuations: many(valuation),
    documents: many(document),
}))
```

**entityRelations extension** (add after `liabilities: many(liability)` at line 57):
```typescript
firearms: many(firearm),
```

**valuationRelations extension** (add after `personalProperty` entry at line 182–183):
```typescript
firearm: one(firearm, {
    fields: [valuation.firearmId],
    references: [firearm.id],
}),
```

**documentRelations extension** (add after `personalProperty` entry at line 237–239):
```typescript
firearm: one(firearm, {
    fields: [document.firearmId],
    references: [firearm.id],
}),
```

---

### `db/validation.ts` — firearm schemas (3 new)

**Analog:** `db/validation.ts` lines 398–421 (`insertVehicleSchema`, `selectVehicleSchema`, `updateVehicleSchema`)

**Imports pattern** (lines 1–32) — add `firearm` to the schema import block:
```typescript
import {
    // ... existing imports ...
    firearm,   // ADD
    // ...
} from './schema'
```

**Core insert/select/update triple** (lines 398–421 for vehicle — exact structure to copy):
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
export const updateVehicleSchema = requireAtLeastOneField(
    insertVehicleSchema.partial(),
)
```

**Firearm insert schema** — uses same helpers (`positiveNumberValidation`, `requireAtLeastOneField`) plus a `.refine()` for NFA conditional and a new serial number validator:
```typescript
const serialNumberValidation = z
    .string()
    .min(1, 'Serial number is required')
    .max(50, 'Serial number must be 50 characters or fewer')
    .trim()
    .regex(
        /^[A-Za-z0-9\-]+$/,
        'Serial number must contain only letters, numbers, and hyphens',
    )

export const insertFirearmSchema = createInsertSchema(firearm, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
    name: (schema) => schema.min(1, 'Name is required'),
    make: (schema) => schema.min(1, 'Make is required'),
    model: (schema) => schema.min(1, 'Model is required'),
    serialNumber: () => serialNumberValidation,
    caliber: (schema) => schema.trim().optional(),
    acquisitionCost: () => positiveNumberValidation,
    dodValue: () => positiveNumberValidation,
}).refine(
    (data) => !data.isNfa || data.nfaClass != null,
    { message: 'NFA class is required when firearm is classified as NFA', path: ['nfaClass'] },
)
export const selectFirearmSchema = createSelectSchema(firearm)
export const updateFirearmSchema = requireAtLeastOneField(
    insertFirearmSchema.partial(),
)
```

**`requireAtLeastOneField` helper** is defined at lines 42–49. Do not redefine it — reference is already in scope.

**`positiveNumberValidation`** is defined at lines 101–118. Not exported (lowercase) — it's file-scope. Already in scope.

**Placement:** Add the `serialNumberValidation` const after `vinValidation` (line 129). Add `insertFirearmSchema` / `selectFirearmSchema` / `updateFirearmSchema` in alphabetical order with the other insert schemas (between `insertEntitySchema` and `insertHemsRequestSchema`). Add `updateFirearmSchema` in the update block at the bottom (alphabetically between `updateEntitySchema` and `updateHemsRequestSchema`).

---

### `drizzle/0014_<name>.sql` — generated migration

**Analog:** `drizzle/0013_kpi_schema_completeness.sql` (camelCase ADD COLUMN precedent)

**Generation:** Run `bun run db:deploy` — this runs `drizzle-kit generate` then `drizzle-kit migrate`. Never use `db:push`.

**Hand-audit checklist before applying** (extract from RESEARCH.md §Migration Mechanics):

1. All `CREATE TYPE` use PascalCase: `"FirearmType"`, `"NfaClass"`, `"AtfFormType"`, `"FirearmCondition"`, `"NfaTransferStatus"`
2. `CREATE TABLE firearm` column names are camelCase: `"entityId"`, `"serialNumber"`, `"firearmType"`, `"isNfa"`, `"nfaClass"`, `"atfFormType"`, `"atfControlNumber"`, `"taxStampDate"`, `"nfrtrSerial"`, `"nfaRegistered"`, `"nfaTransferStatus"`, `"acquisitionDate"`, `"acquisitionCost"`, `"dodValue"`, `"dodValueDate"`, `"dodValueType"`, `"barrelLength"`, `"createdAt"`, `"updatedAt"`, `"transferStatus"`, `"insured"`
3. `ADD COLUMN` in `document` and `valuation` uses `"firearmId"` not `"firearm_id"`
4. `DROP CONSTRAINT document_single_owner_check` + `ADD CONSTRAINT` pair is present (not just ADD)
5. `DROP CONSTRAINT valuation_single_asset_check` + `ADD CONSTRAINT` pair is present
6. Column refs in both re-added CHECK expressions are camelCase (e.g., `"firearmId"` not `"firearm_id"`)
7. `CREATE UNIQUE INDEX "firearm_serial_number_key"` references `"serialNumber"` not `"serial_number"`
8. FK constraint names follow convention: `firearm_entity_id_fkey`, `document_firearm_id_fkey`, `valuation_firearm_id_fkey`

**Migration failure recovery:** If `bun run db:migrate` exits silently (code 1, no message), run the SQL manually via `getClient()` (postgres.js transaction) — NOT `getSql()`. See MEMORY.md "Stale __drizzle_migrations Row Recovery" for hash update procedure.

---

### `scripts/apply-0014-testbranch.ts` — test branch sync

**Analog:** `scripts/apply-0013-testbranch.ts` lines 1–84 — copy structure exactly

**Header imports and production guard** (lines 1–34):
```typescript
import postgres from 'postgres'

const url = process.env.DATABASE_URL
if (!url) {
    console.error('DATABASE_URL not set')
    process.exit(1)
}

// Defense-in-depth: refuse to run against production
const isProductionDb =
    url.includes('-pooler.') &&
    !url.includes('/br-') &&
    !process.env.ALLOW_PRODUCTION_DB
if (isProductionDb) {
    console.error(
        'Refusing to run: DATABASE_URL points at the production database. ' +
            'Use a Neon test-branch URL (.env.test.local), or set ' +
            'ALLOW_PRODUCTION_DB=1 to override deliberately.',
    )
    process.exit(1)
}

const sql = postgres(url, { max: 1 })
```

**Transaction body pattern** (lines 36–66) — use `sql.begin(async (tx) => { ... })` with idempotent guards:
```typescript
try {
    await sql.begin(async (tx) => {
        // CREATE TYPE guards (DO $$ ... EXCEPTION duplicate_object $$ END)
        for (const typeName of ['FirearmType', 'NfaClass', 'AtfFormType', 'FirearmCondition', 'NfaTransferStatus']) {
            await tx`
                DO $$ BEGIN
                    CREATE TYPE ${tx.unsafe(`"${typeName}"`)} AS ENUM (...);
                EXCEPTION WHEN duplicate_object THEN null;
                END $$
            `
        }
        // CREATE TABLE IF NOT EXISTS firearm (...)
        // ALTER TABLE document ADD COLUMN IF NOT EXISTS "firearmId" bigint
        // DROP CONSTRAINT (IF EXISTS) + ADD CONSTRAINT document_single_owner_check
        // ALTER TABLE valuation ADD COLUMN IF NOT EXISTS "firearmId" bigint
        // DROP CONSTRAINT (IF EXISTS) + ADD CONSTRAINT valuation_single_asset_check
        // FK ADD CONSTRAINT wrapped in DO $$ IF NOT EXISTS $$
        // CREATE INDEX IF NOT EXISTS (all 5 new indexes)
        // ENABLE ROW LEVEL SECURITY
        // CREATE POLICY (4×) wrapped in DO $$ IF NOT EXISTS $$
    })
    // Verification query — confirm key columns exist
} finally {
    await sql.end()
}
```

**FK idempotent guard pattern** (lines 43–52 from analog):
```typescript
await tx`
    DO $$ BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'firearm_entity_id_fkey'
        ) THEN
            ALTER TABLE "firearm" ADD CONSTRAINT "firearm_entity_id_fkey"
                FOREIGN KEY ("entityId") REFERENCES "public"."entity"("id")
                ON DELETE restrict ON UPDATE cascade;
        END IF;
    END $$
`
```

**Run command:**
```bash
bun --env-file=.env.test.local run scripts/apply-0014-testbranch.ts
```

---

### `tests/lib/validation.firearm.test.ts` — Zod schema unit test

**Analog:** `tests/lib/validation.test.ts` lines 1–100+ (import/describe/it structure)

**Imports pattern** (lines 1–27):
```typescript
import { describe, expect, it } from 'bun:test'
import {
    insertFirearmSchema,
    updateFirearmSchema,
} from '@/db/validation'
```

**Test structure to follow:**

1. `describe('insertFirearmSchema')` block:
   - `it('accepts a valid firearm with all required fields')`
   - `it('rejects missing name')`
   - `it('rejects missing make')`
   - `it('rejects missing model')`
   - `it('rejects missing serialNumber')`
   - `it('rejects serialNumber with special chars outside allowed set')`
   - `it('rejects serialNumber longer than 50 chars')`
   - `it('rejects isNfa=true with null nfaClass', () => { const result = insertFirearmSchema.safeParse({ ...validBase, isNfa: true, nfaClass: null }); expect(result.success).toBe(false) })`
   - `it('accepts isNfa=true with nfaClass set')`
   - `it('accepts isNfa=false with null nfaClass')`
   - `it('rejects negative dodValue')`

2. `describe('updateFirearmSchema — requireAtLeastOneField')` block:
   - `it('rejects empty object {}', () => { const result = updateFirearmSchema.safeParse({}); expect(result.success).toBe(false); /* check "at least one field" message */ })`
   - `it('accepts { name: "Test Firearm" }')`

**`requireAtLeastOneField` rejection check pattern** (lines 58–68 from analog):
```typescript
const result = updateFirearmSchema.safeParse({})
expect(result.success).toBe(false)
if (!result.success) {
    const messages = result.error.issues.map((i) => i.message)
    expect(messages.some((m) => m.includes('at least one field'))).toBe(true)
}
```

**Run command:** `bun test tests/lib/validation.firearm.test.ts`

---

## Shared Patterns

### pgPolicy RLS Block
**Source:** `db/schema.ts` lines 466–487 (vehicle table)
**Apply to:** `firearm` pgTable (copy verbatim — all 4 policies identical across all asset tables)
```typescript
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
```
Chain `.enableRLS()` after the closing `]` — not inside it.

### foreignKey onDelete semantics
**Source:** `db/schema.ts` lines 459–465 (vehicle) vs lines 1526–1532 (document)
**Rule:**
- Asset's own `entityId` FK: `.onDelete('restrict')` (vehicle pattern, line 465) — blocks entity deletion if assets exist
- Polymorphic FK on `document`/`valuation` pointing back to an asset: `.onDelete('set null')` (document pattern, line 1532) — nullifies the document link if the asset is deleted

### positiveNumberValidation
**Source:** `db/validation.ts` lines 101–118 (file-scope, not exported)
**Apply to:** `acquisitionCost`, `dodValue` in `insertFirearmSchema` — override with `() => positiveNumberValidation`

### requireAtLeastOneField
**Source:** `db/validation.ts` lines 42–49
**Apply to:** `updateFirearmSchema` — wrap `insertFirearmSchema.partial()` with it. This is the 27th such schema (26 existing update schemas listed in lines 417–494).

### Production guard in test-branch scripts
**Source:** `scripts/apply-0013-testbranch.ts` lines 18–32
**Apply to:** `scripts/apply-0014-testbranch.ts` — copy the `isProductionDb` guard block exactly. Do not skip it.

---

## No Analog Found

None. All 6 files have exact or role-match analogs in the codebase.

---

## Metadata

**Analog search scope:** `db/schema.ts`, `db/relations.ts`, `db/validation.ts`, `scripts/`, `tests/lib/`
**Files scanned:** 7 source files read directly
**Pattern extraction date:** 2026-05-21
