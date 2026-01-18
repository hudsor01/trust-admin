# Trust Document Audit - Remaining Gaps

Audit of Hudson Living Trust (Articles 4-8) against codebase.
Last Updated: 2026-01-15

## Fixed (Critical)

| Issue | Status |
|-------|--------|
| Grandchildren had `WITHDRAWAL_ONLY` but trust grants HEMS + withdrawals | FIXED - now `HEMS_PLUS_WITHDRAWAL` |

## Implemented

### 1. Undistributed Income → Principal Annually
**Trust Reference:** Section 7.10(c)

"All income not distributed shall be added to principal at least annually."

**Implementation:**
- `TrustAccounting.convertedToPrincipal` - marks income entries as converted
- `TrustAccounting.conversionDate` - when conversion occurred
- `TrustAccounting.conversionEntryId` - links to principal entry created
- tRPC: `trustAccounting.convertIncomeToPrincipal(entityId, fiscalYear)` - runs conversion
- tRPC: `trustAccounting.unconvertedIncomeSummary(entityId)` - shows pending conversions
- UI: "Year-End Conversion" card on Accounting page with per-year conversion buttons

### 2. Pro-Rata Distribution on Beneficiary Death
**Trust Reference:** Section 7.01

If a beneficiary dies before complete distribution, their share goes pro-rata to other beneficiaries.

**Implementation:**
- `Beneficiary.deceasedDate` - date of death
- tRPC: `beneficiary.markDeceased(beneficiaryId, deceasedDate)` - marks deceased and auto-recalculates shares
- tRPC: `beneficiary.recalculateShares(entityId, excludeBeneficiaryId)` - manual share recalculation
- UI: "Mark as Deceased" button in beneficiary detail dialog with date picker and confirmation

## Not Implementing (By Design)

### 1. LPOA Tracking
**Trust Reference:** Sections 7.02(d), 7.10(d)

Every beneficiary has LPOA right to direct remaining trust assets at death via will.

**Decision:** Not implementing separate tracking. All beneficiaries in this system are named in the trust/will. The will document itself serves as the LPOA record and can be made available as a static document in the app.

### 2. "Consider Other Resources" Guideline
**Trust Reference:** Sections 7.02(a), 7.10(a)

**Decision:** Not implementing. Distributions go to all beneficiaries equally. No need for per-request resource assessment.

## Low Priority (Manual Handling)

### Co-Trustee Independent Action
**Trust Reference:** Section 9.04

"Any one of Co-Trustees may take any action authorized under this agreement."

**Status:** Already implicit in workflow - either trustee can approve.

### Trustee Removal/Resignation Process
**Trust Reference:** Sections 9.02-9.03

**Status:** Edge case. Can be handled manually with notes field.

## Correctly Implemented

| Feature | Trust Section | Status |
|---------|--------------|--------|
| 19 beneficiaries with correct shares | 7.01 | Done |
| HEMS standard for adults | 7.02-7.09 | Done |
| Withdrawal ages 25/30 (50%/50%) | 7.10-7.20 | Done |
| Co-trustees setup | 9.01 | Done |
| Successor trustee (Ashley) | 9.01 | Done |
| Specific bequest (Bandit to Freddie) | 6.01 | Done |
| Spendthrift provision | 10.02 | Done |
| No-contest clause | Entity flags | Done |
| HEMS request workflow | 7.02(a) | Done |
| Principal/Income classification | Texas 116 | Done |
| Trustee fee structure | 9.06 | Done |
| Income-to-principal conversion | 7.10(c) | Done |
| Beneficiary death handling | 7.01 | Done |
