# Trust Document Audit - Remaining Gaps

Audit of Hudson Living Trust (Articles 4-8) against codebase.
Date: 2025-01-04

## Fixed (Critical)

| Issue | Status |
|-------|--------|
| Grandchildren had `WITHDRAWAL_ONLY` but trust grants HEMS + withdrawals | FIXED - now `HEMS_PLUS_WITHDRAWAL` |

## Medium Priority Gaps

### 1. Testamentary Limited Power of Appointment (LPOA)
**Trust Reference:** Sections 7.02(d), 7.10(d), etc.

Every beneficiary has the right to direct remaining trust assets at their death via will. This needs tracking:
- `hasLPOA: boolean` on beneficiary (always true per trust)
- `lpoaExercised: boolean`
- `lpoaDocumentPath: text` (link to their will if exercised)

**Impact:** If beneficiary dies, we need to know if they exercised LPOA before distributing pro-rata.

### 2. Undistributed Income → Principal Annually
**Trust Reference:** Section 7.10(c)

"All income not distributed shall be added to principal at least annually."

**Implementation needed:**
- Year-end job that moves undistributed income to principal
- Or automatic classification in trust accounting

### 3. Pro-Rata Distribution on Beneficiary Death
**Trust Reference:** Section 7.01

If a beneficiary dies before complete distribution and doesn't exercise LPOA, their share goes pro-rata to other beneficiaries.

**Implementation needed:**
- `deceasedDate: timestamp` on beneficiary
- Logic to recalculate shares when beneficiary dies
- Handle LPOA exercise vs pro-rata fallback

## Low Priority Gaps

### 4. "Consider Other Resources" Guideline
**Trust Reference:** Sections 7.02(a), 7.10(a)

Trustee should "consider other resources reasonably available" when making HEMS decisions.

**Status:** Advisory only. Could add a checkbox/note field on HEMS request form, but not blocking.

### 5. Co-Trustee Independent Action
**Trust Reference:** Section 9.04

"Any one of Co-Trustees may take any action authorized under this agreement."

**Status:** Current system allows either trustee to approve. Already implicit in workflow.

### 6. Trustee Removal/Resignation Process
**Trust Reference:** Sections 9.02-9.03

- Trustee can resign with 30-day written notice
- Beneficiaries can remove trustee by majority vote

**Status:** Edge case. Can be handled manually with notes field for now.

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

## Recommendations

1. **Phase 1 (Now):** All critical functionality works. Grandchildren can request HEMS AND exercise withdrawals.

2. **Phase 2 (When needed):** Add LPOA tracking when a beneficiary's health becomes a concern.

3. **Phase 3 (Year-end):** Implement income-to-principal annual rollover before first fiscal year end.
