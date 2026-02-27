# Texas Property Code Compliance

This document tracks compliance with applicable Texas statutes for trust administration.

## Texas Property Code Chapter 113 - Texas Trust Code

### Section 113.152 - Contents of Annual Accounting

The trust accounting system tracks all required elements:

| Requirement | Implementation | Location |
|-------------|---------------|----------|
| 113.152(1) Trust property at beginning | Valuation table with date-of-death values | `db/schema.ts:Valuation` |
| 113.152(2) Additions to property | TrustAccounting entries with INCOME type | `db/schema.ts:TrustAccounting` |
| 113.152(3) Decreases in property | TrustAccounting entries with EXPENSE type | `db/schema.ts:TrustAccounting` |
| 113.152(4) Cash balance | currentBalance on BankAccount/InvestmentAccount | `db/schema.ts:206,231` |
| 113.152(5) Liabilities | Liability table with payment tracking | `db/schema.ts:Liability` |

## Texas Property Code Chapter 114 - Trustee Powers and Duties

### Section 114.061 - Reasonable Compensation

Implemented in fee calculator with Texas-standard rates:

| Component | Rate | Description |
|-----------|------|-------------|
| Executor Fee | 5% | One-time probate work |
| Annual Asset Fee | 1.5% | Assets under management |
| Income Fee | 8% | Property management/income collection |
| Hourly Rate | $125/hr | Extraordinary services |

Location: `src/lib/fee-calculator.ts`

## Texas Property Code Chapter 116 - Uniform Principal and Income Act

### Section 116.152 - Principal vs Income Allocation

Auto-classification implemented based on transaction type:

**Allocated to INCOME:**
- Dividends
- Interest
- Rent
- Royalties
- Property taxes
- Insurance premiums
- Maintenance and repairs
- Professional fees
- Trustee fees

**Allocated to PRINCIPAL:**
- Capital gains
- Sale proceeds
- Stock splits
- Return of capital
- Capital improvements
- Condemnation proceeds

Location: `src/lib/classification-rules.ts`

### Section 116.204 - Administrative Expenses

Texas allows 50/50 split between principal and income for certain administrative expenses. Current implementation simplifies to income allocation. This is a conservative approach that can be adjusted per trustee discretion.

## Trust-Specific Provisions

### HEMS Standard (Section 7.02-7.20)

Health, Education, Maintenance, Support distributions require:
- Beneficiary request with justification
- Trustee review and approval
- Documentation of decision
- "Consider other resources" guideline

Implemented via HemsRequest workflow.

### Withdrawal Rights (Section 7.10-7.20)

Grandchildren have age-based principal withdrawal rights:
- 50% at age 25
- Remaining 50% at age 30

Tracked via WithdrawalRecord table with eligibility dates calculated from DOB.

### Spendthrift Provision (Section 10.02)

Tracked on Entity table: `hasSpendthriftProvision`

### No-Contest Clause

Tracked on Entity table: `hasNoContestClause`

## Audit Trail

All changes tracked via ActivityLog table per Texas 113.152 requirements:
- Table name
- Record ID
- Action (INSERT/UPDATE/DELETE)
- Old and new values
- Changed by
- Timestamp

## Notes

- All monetary values stored as `numeric(14,2)` for precision
- Dates stored as ISO 8601 timestamps
- Principal/Income classification is auto-applied but can be overridden
- Fee calculations are suggestions; actual fees subject to trustee discretion and beneficiary agreement
