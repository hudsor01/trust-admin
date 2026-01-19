# Phase 24 Research: Table Naming Convention Migration

**Research Date:** 2026-01-17
**Phase Goal:** Migrate from PascalCase to snake_case table names per PostgreSQL conventions

## Executive Summary

The migration from PascalCase to snake_case table names is primarily a **database DDL operation** with minimal application impact because Drizzle ORM abstracts table names. The main concerns are:
1. Generating correct `ALTER TABLE RENAME` statements
2. Updating constraint and index names for consistency
3. Updating schema.ts table name strings

## Research Domains

### 1. PostgreSQL Identifier Case Sensitivity

**Key Finding:** PostgreSQL folds unquoted identifiers to lowercase, but quoted identifiers preserve case.

| Scenario | Result |
|----------|--------|
| `CREATE TABLE Customer` | Creates table `customer` (unquoted → lowercase) |
| `CREATE TABLE "Customer"` | Creates table `Customer` (quoted → preserved) |
| `SELECT * FROM Customer` | Queries `customer` (unquoted → lowercase) |
| `SELECT * FROM "Customer"` | Queries `Customer` (exact match required) |

**Current State:** Our tables are stored with PascalCase names because Drizzle quotes the table name strings:
```sql
CREATE TABLE "ActivityLog" (...)  -- Stored as ActivityLog (case preserved)
```

**Best Practice from PostgreSQL community:**
- Use lowercase snake_case for all identifiers
- Avoid quoted identifiers - they create maintenance burden
- Consistent naming prevents "table not found" bugs in raw SQL

**Sources:**
- [Postgres Case Sensitivity Explained](https://www.bytebase.com/blog/postgres-case-sensitivity/)
- [PostgreSQL Lexical Structure](https://www.postgresql.org/docs/current/sql-syntax-lexical.html)

### 2. Drizzle ORM Table Naming

**Key Finding:** Drizzle has a `casing` option but it only affects **column names**, not table names.

```typescript
// Column casing (NOT what we need)
const db = drizzle({ connection: process.env.DATABASE_URL, casing: 'snake_case' })
// Maps: firstName → first_name (columns only)
```

**Table names are explicit strings:**
```typescript
// Current:
export const activityLog = pgTable('ActivityLog', ...)

// Target:
export const activityLog = pgTable('activity_log', ...)
```

**Important:** The TypeScript variable name (`activityLog`) stays camelCase - only the database table name string changes.

**Sources:**
- [Drizzle ORM Schema Declaration](https://orm.drizzle.team/docs/sql-schema-declaration)

### 3. Drizzle Kit Migration Behavior

**Key Finding:** `drizzle-kit generate` detects table renames and prompts interactively.

When you change a table name in schema.ts and run `drizzle-kit generate`:
1. Drizzle detects the change
2. Prompts: "Is `activity_log` created or renamed from `ActivityLog`?"
3. If renamed → generates `ALTER TABLE "ActivityLog" RENAME TO "activity_log"`
4. If created → generates DROP + CREATE (data loss!)

**Known Issues:**
- Bug with composite primary keys during rename (June 2024)
- Mixed changes (rename + alter column) may miss some SQL

**Recommendation:** Use `drizzle-kit generate` for migration generation, but **review generated SQL carefully**.

**Alternative:** Write custom migration SQL manually for full control.

**Sources:**
- [Drizzle ORM Migrations](https://orm.drizzle.team/docs/migrations)
- [Drizzle Kit Generate](https://orm.drizzle.team/docs/drizzle-kit-generate)

### 4. Current Database State Analysis

**Tables (31 total):**

| Category | Count | Current Naming | Action |
|----------|-------|----------------|--------|
| Application tables | 27 | PascalCase | Rename to snake_case |
| Better Auth tables | 4 | lowercase | Keep as-is |

**Application Tables to Rename:**
```
ActivityLog      → activity_log
Artwork          → artwork
BankAccount      → bank_account
Beneficiary      → beneficiary
Contact          → contact
ContactAssociation → contact_association
Distribution     → distribution
Document         → document
Entity           → entity
HemsRequest      → hems_request
Homestead        → homestead
InsurancePolicy  → insurance_policy
InvestmentAccount → investment_account
Liability        → liability
LiabilityPayment → liability_payment
PersonalProperty → personal_property
RentalProperty   → rental_property
SpecificBequest  → specific_bequest
Task             → task
Transaction      → transaction
TrustAccounting  → trust_accounting
Trustee          → trustee
TrusteeFeeEntry  → trustee_fee_entry
TrusteeFeeSchedule → trustee_fee_schedule
Valuation        → valuation
Vehicle          → vehicle
WithdrawalRecord → withdrawal_record
```

**Better Auth Tables (keep as-is):**
```
account, session, user, verification
```

**Constraint Naming Patterns:**
| Type | Current Pattern | Target Pattern |
|------|-----------------|----------------|
| Primary Key | `TableName_pkey` | `table_name_pkey` |
| Foreign Key | `TableName_columnName_fkey` | `table_name_column_name_fkey` |
| Unique | `TableName_columnName_key` | `table_name_column_name_key` |
| Custom Index | `idx_snake_case` | Keep as-is (already correct) |

**Good News:** Custom indexes already use snake_case naming (`idx_activity_log_table_name`).

## Migration Strategy Options

### Option A: Drizzle Kit Generate (Recommended)

**Process:**
1. Update all table name strings in schema.ts
2. Run `drizzle-kit generate`
3. Answer "renamed" for each table prompt
4. Review generated SQL
5. Apply with `drizzle-kit migrate` or `push`

**Pros:**
- Handles FK constraint updates automatically
- Interactive prompts prevent mistakes
- Tracks migration in versioned files

**Cons:**
- May miss constraint renames in some edge cases
- Requires careful review of generated SQL

### Option B: Custom Migration Script

**Process:**
1. Write explicit `ALTER TABLE RENAME` SQL
2. Write explicit `ALTER INDEX RENAME` SQL
3. Write explicit `ALTER TABLE RENAME CONSTRAINT` SQL
4. Update schema.ts
5. Run migration

**Pros:**
- Full control over SQL
- Can handle all renames in specific order

**Cons:**
- More manual work
- Must track all constraints manually

### Recommended Approach: Hybrid

1. **Use custom migration** for table renames (explicit control)
2. **Let PostgreSQL** cascade constraint renames where possible
3. **Update schema.ts** after migration
4. **Verify with `drizzle-kit push --dry-run`** to ensure sync

## SQL Migration Template

```sql
-- Phase 24: Table Naming Convention Migration
-- Rename 27 PascalCase tables to snake_case

BEGIN;

-- Simple tables (single word - just case change)
ALTER TABLE "Artwork" RENAME TO "artwork";
ALTER TABLE "Beneficiary" RENAME TO "beneficiary";
ALTER TABLE "Contact" RENAME TO "contact";
ALTER TABLE "Distribution" RENAME TO "distribution";
ALTER TABLE "Document" RENAME TO "document";
ALTER TABLE "Entity" RENAME TO "entity";
ALTER TABLE "Homestead" RENAME TO "homestead";
ALTER TABLE "Liability" RENAME TO "liability";
ALTER TABLE "Task" RENAME TO "task";
ALTER TABLE "Transaction" RENAME TO "transaction";
ALTER TABLE "Trustee" RENAME TO "trustee";
ALTER TABLE "Valuation" RENAME TO "valuation";
ALTER TABLE "Vehicle" RENAME TO "vehicle";

-- Compound tables (PascalCase → snake_case)
ALTER TABLE "ActivityLog" RENAME TO "activity_log";
ALTER TABLE "BankAccount" RENAME TO "bank_account";
ALTER TABLE "ContactAssociation" RENAME TO "contact_association";
ALTER TABLE "HemsRequest" RENAME TO "hems_request";
ALTER TABLE "InsurancePolicy" RENAME TO "insurance_policy";
ALTER TABLE "InvestmentAccount" RENAME TO "investment_account";
ALTER TABLE "LiabilityPayment" RENAME TO "liability_payment";
ALTER TABLE "PersonalProperty" RENAME TO "personal_property";
ALTER TABLE "RentalProperty" RENAME TO "rental_property";
ALTER TABLE "SpecificBequest" RENAME TO "specific_bequest";
ALTER TABLE "TrustAccounting" RENAME TO "trust_accounting";
ALTER TABLE "TrusteeFeeEntry" RENAME TO "trustee_fee_entry";
ALTER TABLE "TrusteeFeeSchedule" RENAME TO "trustee_fee_schedule";
ALTER TABLE "WithdrawalRecord" RENAME TO "withdrawal_record";

COMMIT;
```

**Note:** PostgreSQL automatically renames indexes when tables are renamed, but constraint names must be renamed explicitly.

## Application Code Impact

### Schema.ts Changes Required

```typescript
// Before:
export const activityLog = pgTable('ActivityLog', ...)
export const bankAccount = pgTable('BankAccount', ...)

// After:
export const activityLog = pgTable('activity_log', ...)
export const bankAccount = pgTable('bank_account', ...)
```

### No Application Code Changes

The TypeScript variable names (`activityLog`, `bankAccount`) stay the same. All application code uses these variables:

```typescript
// This code DOES NOT change:
const accounts = await db.select().from(bankAccount)
await db.insert(activityLog).values({...})
```

### Constraint Names in Schema

FK constraint names in schema.ts should also be updated for consistency:

```typescript
// Before:
foreignKey({
  columns: [table.entityId],
  foreignColumns: [entity.id],
  name: 'BankAccount_entityId_fkey',  // ← Update this
})

// After:
foreignKey({
  columns: [table.entityId],
  foreignColumns: [entity.id],
  name: 'bank_account_entity_id_fkey',  // ← snake_case
})
```

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data loss from DROP instead of RENAME | Low | Critical | Review migration SQL carefully |
| FK constraints broken | Low | High | Test all relationships after migration |
| Raw SQL queries break | Low | Medium | Grep for hardcoded table names |
| Index performance degradation | None | N/A | Index renames don't affect data |
| Application downtime | Certain | Low | Table renames are fast DDL operations |

## Verification Checklist

After migration:
- [ ] All 27 application tables renamed
- [ ] Better Auth tables unchanged (account, session, user, verification)
- [ ] All FK constraints functional
- [ ] All indexes present
- [ ] Application queries work
- [ ] `drizzle-kit push` shows no pending changes

## Decision: What NOT to Hand-Roll

1. **Don't manually track all FK constraints** - PostgreSQL handles cascading renames for table-based constraints
2. **Don't update application code** - Drizzle abstracts table names
3. **Don't rename Better Auth tables** - They already follow conventions

## Next Steps

1. Create PLAN.md with explicit tasks
2. Write migration SQL (or use drizzle-kit generate)
3. Update schema.ts table name strings
4. Update FK constraint names in schema.ts
5. Test thoroughly in dev
6. Apply to production
