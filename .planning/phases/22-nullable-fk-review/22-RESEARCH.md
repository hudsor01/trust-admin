# Phase 22: Nullable FK Business Logic Review - Research

**Researched:** 2026-01-18
**Status:** Complete

## Executive Summary

Audited all 17 nullable FK columns in `db/schema.ts`. Most are correctly nullable by design (secured debt links, workflow states, user roles). The key finding is that `trustAccounting` uses a polymorphic `sourceAssetType`/`sourceAssetId` pattern but both are nullable — violating the user's requirement that every accounting entry trace to a bank account.

## Nullable FK Column Inventory

### 1. Polymorphic Tables (Phase 20 CHECK constraints apply)

These tables already have CHECK constraints enforcing exactly-one FK rule:

| Table | FK Columns | Records | Status |
|-------|-----------|---------|--------|
| `Valuation` | 7 asset FKs | 0 | ✅ Covered by CHECK |
| `Document` | 8 entity/asset FKs | 0 | ✅ Covered by CHECK |
| `Transaction` | 6 asset FKs | 0 | ✅ Covered by CHECK |

### 2. Secured Debt Links (SHOULD REMAIN NULLABLE)

| Column | Current State | Business Reason |
|--------|---------------|-----------------|
| `liability.homesteadId` | 2/2 nulls (100%) | Unsecured debt valid |
| `liability.vehicleId` | 2/2 nulls (100%) | Unsecured debt valid |
| `liability.rentalPropertyId` | 2/2 nulls (100%) | Unsecured debt valid |

**Verdict:** Keep nullable — credit cards, tax debt, etc. don't link to assets.

### 3. Workflow State FKs (SHOULD REMAIN NULLABLE)

| Column | Current State | Business Reason |
|--------|---------------|-----------------|
| `hemsRequest.distributionId` | 0/0 | Null until approved & distributed |
| `withdrawalRecord.distributionId` | 0/0 | Null until exercised |

**Verdict:** Keep nullable — represents workflow state (pending → complete).

### 4. Optional Relationships (SHOULD REMAIN NULLABLE)

| Column | Current State | Business Reason |
|--------|---------------|-----------------|
| `beneficiary.parentId` | 8/19 nulls (42%) | Only sub-trust beneficiaries have parent |
| `trustee.coTrusteeId` | 1/3 nulls (33%) | Co-trustee is optional |
| `user.beneficiary_id` | 2/2 nulls (100%) | Admin users have no beneficiary link |

**Verdict:** Keep nullable — optional by design.

### 5. Potentially Incorrect Nullables (REVIEW NEEDED)

| Column | Current State | Issue |
|--------|---------------|-------|
| `trustAccounting.sourceAssetId` | 0/0 | **Should trace to bank account per user vision** |
| `trustAccounting.sourceAssetType` | 0/0 | Paired with sourceAssetId |
| `specificBequest.beneficiaryId` | 1/2 nulls (50%) | Should bequest have recipient? |
| `trustee.contactId` | 3/3 nulls (100%) | Should trustee link to contact? |

### 6. Trust Accounting - Key Finding

Current schema pattern:
```typescript
// db/schema.ts lines 1564-1565
sourceAssetType: t.text(), // 'vehicle', 'rentalProperty', 'bankAccount', etc.
sourceAssetId: t.text(),
```

**User's vision:** "Every income/expense entry must trace to a bank account."

**Options:**
1. **Add `bankAccountId` FK (NOT NULL)** - Direct link to bank account
2. **Enforce sourceAsset* NOT NULL** - Keep polymorphic, require filling
3. **Add CHECK constraint** - Ensure either bankAccountId OR sourceAsset* is set

**Recommendation:** Option 1 is clearest for the user's vision. Trust accounting entries track money flows — all money moves through bank accounts.

## Drizzle Migration Pattern

### Adding NOT NULL to Existing Column

```typescript
// Step 1: Backfill existing nulls (if any)
await db.execute(sql`
  UPDATE "TrustAccounting"
  SET "bankAccountId" = 'default-account-id'
  WHERE "bankAccountId" IS NULL
`);

// Step 2: Modify schema
// db/schema.ts
bankAccountId: t.text().notNull(),

// Step 3: Apply migration
// bun drizzle-kit push --force
```

### Adding New NOT NULL FK Column

```typescript
// db/schema.ts - add to trustAccounting table
bankAccountId: t.text().notNull(),

// Add FK constraint
foreignKey({
    columns: [table.bankAccountId],
    foreignColumns: [bankAccount.id],
    name: 'TrustAccounting_bankAccountId_fkey',
}).onUpdate('cascade').onDelete('restrict'),
```

## Risk Assessment

| Change | Risk | Mitigation |
|--------|------|------------|
| Add `bankAccountId` to trustAccounting | Low - 0 records exist | Add column, apply migration |
| Make `specificBequest.beneficiaryId` NOT NULL | Medium - 1 null exists | Backfill or delete orphan |
| Make `trustee.contactId` NOT NULL | Medium - 3 nulls exist | Create contacts or keep nullable |

## Recommendations for Phase 22 Planning

### High Priority (User Vision)
1. Add `bankAccountId` FK to `trustAccounting` (NOT NULL)

### Medium Priority (Data Quality)
2. Review `specificBequest.beneficiaryId` - should bequests always have a recipient?
3. Review `trustee.contactId` - should trustees always link to a contact record?

### Keep Nullable (Correct Design)
- All liability secured debt FKs
- Workflow FKs (hemsRequest/withdrawalRecord.distributionId)
- Optional relationships (beneficiary.parentId, trustee.coTrusteeId, user.beneficiary_id)

## References

- User context: `.planning/phases/22-nullable-fk-review/22-CONTEXT.md`
- Schema: `db/schema.ts`
- Phase 20 CHECK constraints: `db/schema.ts` lines ~896, ~1062, ~1181

---

*Phase: 22-nullable-fk-review*
*Research completed: 2026-01-18*
