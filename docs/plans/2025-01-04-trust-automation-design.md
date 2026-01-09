# Trust Automation Architecture Design

**Date**: January 4, 2025
**Status**: Approved
**Trust**: Hudson Living Trust (Texas Irrevocable Trust)

---

## Overview

Build automation for trust administration that handles:
1. HEMS request workflow (beneficiary requests → trustee approval → distribution)
2. Principal/Income auto-classification (Texas Property Code 116)
3. Share distribution with trustee fee calculation
4. Withdrawal eligibility tracking for grandchildren

Design principle: **When data is entered, everything calculates automatically.**

---

## Feature 1: HEMS Request Workflow

### Problem
Beneficiaries need to request distributions for Health, Education, Maintenance, Support. Currently no workflow exists - distributions are recorded after the fact.

### Solution

```
Beneficiary Portal          Admin Dashboard           Database
      │                           │                      │
      ├─ Submit Request ─────────────────────────────► HemsRequest (PENDING)
      │                           │                      │
      │                     Review Request               │
      │                           │                      │
      │                     Approve/Deny ────────────► HemsRequest (APPROVED)
      │                           │                      │
      │                     If Approved ─────────────► Distribution (auto-created)
      │                           │                      │
      │                           ├─────────────────► HemsRequest (DISTRIBUTED)
```

### Schema: HemsRequest Table

```sql
CREATE TABLE "HemsRequest" (
  id TEXT PRIMARY KEY,
  beneficiary_id TEXT NOT NULL REFERENCES "Beneficiary"(id),
  entity_id TEXT NOT NULL REFERENCES "Entity"(id),

  -- Request details
  category HemsCategory NOT NULL, -- HEALTH, EDUCATION, MAINTENANCE, SUPPORT
  amount_requested NUMERIC(14,2) NOT NULL,
  justification TEXT NOT NULL,
  supporting_doc_path TEXT,

  -- Workflow
  status HemsRequestStatus NOT NULL DEFAULT 'PENDING',
    -- PENDING, APPROVED, DENIED, DISTRIBUTED, CANCELLED

  -- Review
  reviewed_by TEXT,
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  approved_amount NUMERIC(14,2), -- May differ from requested

  -- Link to distribution
  distribution_id TEXT REFERENCES "Distribution"(id),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Automation Logic

```typescript
async function approveHemsRequest(requestId: string, approvedAmount: number, reviewNotes: string) {
  // 1. Update request status
  await updateHemsRequest(requestId, {
    status: 'APPROVED',
    approvedAmount,
    reviewNotes,
    reviewedBy: currentTrusteeId,
    reviewedAt: new Date()
  });

  // 2. Auto-create distribution
  const request = await getHemsRequest(requestId);
  const distribution = await createDistribution({
    beneficiaryId: request.beneficiaryId,
    entityId: request.entityId,
    amount: approvedAmount,
    distributionType: 'INCOME', // HEMS typically from income
    hemsCategory: request.category,
    hemsJustification: request.justification,
    distributionDate: new Date(),
    paymentMethod: 'CHECK', // Default, can change
  });

  // 3. Link distribution to request
  await updateHemsRequest(requestId, {
    status: 'DISTRIBUTED',
    distributionId: distribution.id
  });

  return distribution;
}
```

---

## Feature 2: Principal/Income Auto-Classification

### Problem
Every transaction must be classified as PRINCIPAL or INCOME per Texas Property Code 116. Manual classification is error-prone.

### Solution
Rules engine that auto-classifies based on transaction type.

### Classification Rules (Texas Property Code 116)

```typescript
const ALLOCATION_RULES: Record<string, 'PRINCIPAL' | 'INCOME'> = {
  // === INCOME (earnings from corpus) ===
  'DIVIDEND': 'INCOME',
  'INTEREST': 'INCOME',
  'RENT': 'INCOME',
  'ROYALTY': 'INCOME',

  // === PRINCIPAL (corpus itself) ===
  'CAPITAL_GAIN': 'PRINCIPAL',
  'SALE_PROCEEDS': 'PRINCIPAL',
  'DISTRIBUTION': 'PRINCIPAL', // From another entity
  'INSURANCE_PROCEEDS': 'PRINCIPAL', // Asset replacement
  'STOCK_SPLIT': 'PRINCIPAL',

  // === EXPENSES ===
  // Ordinary expenses → charged to INCOME
  'TAX': 'INCOME',
  'INSURANCE': 'INCOME',
  'MAINTENANCE': 'INCOME',
  'REPAIR': 'INCOME',
  'PROFESSIONAL_FEE': 'INCOME', // Trustee fees, CPA, etc.
  'UTILITY': 'INCOME',

  // Capital expenses → charged to PRINCIPAL
  'CAPITAL_IMPROVEMENT': 'PRINCIPAL',

  // Special: Trustee fee split 50/50 (optional)
  'TRUSTEE_FEE': 'INCOME', // Simplified to income
};

function classifyTransaction(incomeType?: string, expenseType?: string): 'PRINCIPAL' | 'INCOME' {
  const type = incomeType || expenseType;
  if (!type) return 'PRINCIPAL'; // Default to principal if unknown
  return ALLOCATION_RULES[type] || 'PRINCIPAL';
}
```

### Integration Point

When creating TrustAccounting entry:

```typescript
async function createAccountingEntry(data: NewAccountingEntry) {
  // Auto-classify if not explicitly set
  const isPrincipal = data.isPrincipal ??
    (classifyTransaction(data.incomeType, data.expenseType) === 'PRINCIPAL');

  return await db.insert(trustAccounting).values({
    ...data,
    isPrincipal,
  });
}
```

### Dashboard Display

Show running totals:
- Total Principal: $X
- Total Income: $Y
- Net Distributable Income: $Z (Income - Income Expenses - Trustee Fee)

---

## Feature 3: Share Distribution with Trustee Fees

### Problem
When distributing income, must:
1. Calculate trustee compensation first
2. Deduct expenses
3. Split remainder by beneficiary share percentages

### Trustee Fee Structure

Three components (Texas Property Code 114.061):

| Fee Type | Rate | Applies To |
|----------|------|------------|
| Executor Fee | 5% of estate | Probate assets (one-time) |
| Trustee Fee | 1.5% annually | Trust assets under management |
| Property Management | 8% of rent | Rental income collected |

### Schema: TrusteeFee Tables

```sql
-- Fee schedule (configuration)
CREATE TABLE "TrusteeFeeSchedule" (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL REFERENCES "Entity"(id),
  trustee_id TEXT NOT NULL REFERENCES "Trustee"(id),

  -- Fee rates
  executor_fee_percent NUMERIC(5,2) DEFAULT 5.0,
  annual_asset_percent NUMERIC(5,2) DEFAULT 1.5,
  income_percent NUMERIC(5,2) DEFAULT 8.0,
  hourly_rate NUMERIC(10,2) DEFAULT 125.00,

  effective_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Actual fee entries (what's owed/paid)
CREATE TABLE "TrusteeFeeEntry" (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL REFERENCES "Entity"(id),
  trustee_id TEXT NOT NULL REFERENCES "Trustee"(id),
  schedule_id TEXT REFERENCES "TrusteeFeeSchedule"(id),

  -- Period
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,

  -- Calculated fees
  asset_fee NUMERIC(14,2) DEFAULT 0,
  asset_basis NUMERIC(14,2), -- What assets were valued at

  income_fee NUMERIC(14,2) DEFAULT 0,
  income_basis NUMERIC(14,2), -- Gross income for period

  hours_worked NUMERIC(6,2) DEFAULT 0,
  hourly_fee NUMERIC(14,2) DEFAULT 0,

  executor_fee NUMERIC(14,2) DEFAULT 0, -- One-time probate

  total_fee NUMERIC(14,2) NOT NULL,

  -- Payment tracking
  status TEXT DEFAULT 'ACCRUED', -- ACCRUED, APPROVED, PAID
  paid_date TIMESTAMP,
  payment_method PaymentMethod,
  check_number TEXT,

  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Distribution Calculator

```typescript
interface DistributionCalculation {
  grossIncome: number;
  expenses: number;
  trusteeFee: number;
  netDistributable: number;
  beneficiaryShares: Array<{
    beneficiaryId: string;
    name: string;
    sharePercent: number;
    amount: number;
  }>;
}

async function calculateDistribution(
  entityId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<DistributionCalculation> {
  // 1. Get gross income for period
  const income = await getTotalIncome(entityId, periodStart, periodEnd);

  // 2. Get expenses for period
  const expenses = await getTotalExpenses(entityId, periodStart, periodEnd);

  // 3. Calculate trustee fee
  const feeSchedule = await getTrusteeFeeSchedule(entityId);
  const trusteeFee = income.total * (feeSchedule.incomePercent / 100);

  // 4. Calculate net distributable
  const netDistributable = income.total - expenses.total - trusteeFee;

  // 5. Get beneficiaries and calculate shares
  const beneficiaries = await getBeneficiaries(entityId);
  const beneficiaryShares = beneficiaries.map(b => ({
    beneficiaryId: b.id,
    name: `${b.firstName} ${b.lastName}`,
    sharePercent: b.sharePercent,
    amount: netDistributable * (b.sharePercent / 100),
  }));

  return {
    grossIncome: income.total,
    expenses: expenses.total,
    trusteeFee,
    netDistributable,
    beneficiaryShares,
  };
}
```

### UI Flow

1. Trustee clicks "Distribute Income"
2. Selects period (month, quarter, year)
3. System shows:
   - Gross income: $X
   - Less expenses: -$Y
   - Less trustee fee: -$Z
   - Net distributable: $W
   - Breakdown by 19 beneficiaries
4. Trustee confirms
5. System creates:
   - TrusteeFeeEntry (APPROVED)
   - 19 Distribution records
   - TrustAccounting entries

---

## Feature 4: Withdrawal Eligibility Engine

### Problem
Grandchildren have withdrawal rights at ages 25 (50%) and 30 (remaining 50%). System must track eligibility and available amounts.

### Rules from Trust

| Beneficiary Type | Withdrawal Rights |
|-----------------|-------------------|
| Children (adults) | None - HEMS only |
| Grandchildren | 50% at age 25, remaining 50% at age 30 |

### Already in Schema

```typescript
// Beneficiary table has:
withdrawalAge1: integer     // 25
withdrawalPct1: integer     // 50
withdrawalAge2: integer     // 30
withdrawalPct2: integer     // 50

// WithdrawalRecord table tracks exercises
```

### Eligibility Calculator

```typescript
interface WithdrawalEligibility {
  beneficiaryId: string;
  name: string;
  dob: Date;

  // Age 25 withdrawal
  age25Date: Date;
  age25Eligible: boolean;
  age25Amount: number;
  age25Withdrawn: number;
  age25Remaining: number;

  // Age 30 withdrawal
  age30Date: Date;
  age30Eligible: boolean;
  age30Amount: number;
  age30Withdrawn: number;
  age30Remaining: number;

  // Totals
  totalEligible: number;
  totalWithdrawn: number;
  totalRemaining: number;
}

function calculateWithdrawalEligibility(
  beneficiary: Beneficiary,
  trustValue: number
): WithdrawalEligibility {
  const today = new Date();
  const dob = new Date(beneficiary.dob);

  // Calculate key dates
  const age25Date = addYears(dob, 25);
  const age30Date = addYears(dob, 30);

  // Calculate share value
  const shareValue = trustValue * (beneficiary.sharePercent / 100);

  // Age 25: 50% of share
  const age25Eligible = today >= age25Date;
  const age25Amount = shareValue * 0.5;

  // Age 30: remaining 50%
  const age30Eligible = today >= age30Date;
  const age30Amount = shareValue * 0.5;

  // Get existing withdrawals
  const withdrawals = getWithdrawalRecords(beneficiary.id);
  const age25Withdrawn = withdrawals
    .filter(w => w.withdrawalType === 'AGE_25')
    .reduce((sum, w) => sum + w.withdrawnAmount, 0);
  const age30Withdrawn = withdrawals
    .filter(w => w.withdrawalType === 'AGE_30')
    .reduce((sum, w) => sum + w.withdrawnAmount, 0);

  return {
    beneficiaryId: beneficiary.id,
    name: `${beneficiary.firstName} ${beneficiary.lastName}`,
    dob,
    age25Date,
    age25Eligible,
    age25Amount,
    age25Withdrawn,
    age25Remaining: age25Eligible ? age25Amount - age25Withdrawn : 0,
    age30Date,
    age30Eligible,
    age30Amount,
    age30Withdrawn,
    age30Remaining: age30Eligible ? age30Amount - age30Withdrawn : 0,
    totalEligible: (age25Eligible ? age25Amount : 0) + (age30Eligible ? age30Amount : 0),
    totalWithdrawn: age25Withdrawn + age30Withdrawn,
    totalRemaining: (age25Eligible ? age25Amount - age25Withdrawn : 0) +
                    (age30Eligible ? age30Amount - age30Withdrawn : 0),
  };
}
```

### Automation

1. **Daily job**: Check all grandchildren DOBs
2. **On eligibility**: Create WithdrawalRecord with status ELIGIBLE
3. **Dashboard alert**: "X is now eligible to withdraw $Y"
4. **On request**: Process withdrawal, update records

---

## Implementation Order

1. **Schema changes**
   - Add HemsRequest table
   - Add HemsRequestStatus enum
   - Add TrusteeFeeSchedule table
   - Add TrusteeFeeEntry table

2. **API routes**
   - POST /api/hems-requests (beneficiary submits)
   - GET /api/hems-requests (list for trustee)
   - PUT /api/hems-requests/:id/approve
   - PUT /api/hems-requests/:id/deny

3. **Business logic**
   - Principal/Income classification rules
   - Trustee fee calculator
   - Share distribution calculator
   - Withdrawal eligibility calculator

4. **UI**
   - Beneficiary portal: HEMS request form
   - Admin: HEMS review queue
   - Admin: Distribution wizard
   - Admin: Withdrawal eligibility dashboard

---

## Files to Create/Modify

### New Files
- `db/schema.ts` - Add new tables
- `src/lib/classification-rules.ts` - Principal/Income rules
- `src/lib/fee-calculator.ts` - Trustee fee calculations
- `src/lib/distribution-calculator.ts` - Share distribution math
- `src/lib/withdrawal-eligibility.ts` - Withdrawal tracking
- `src/pages/admin/HemsQueue.tsx` - Review HEMS requests
- `src/pages/admin/DistributionWizard.tsx` - Income distribution UI
- `src/pages/portal/HemsRequestForm.tsx` - Beneficiary request form

### Modified Files
- `index.ts` - Add new API routes
- `db/queries.ts` - Add CRUD for new tables
- `src/pages/Dashboard.tsx` - Add alerts/summary widgets
