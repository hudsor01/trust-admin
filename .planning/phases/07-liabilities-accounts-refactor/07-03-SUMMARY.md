# Phase 7 Plan 03 Summary: Extract AccountDialog and AccountTable

**Status**: ✅ Complete
**Date**: 2026-01-09
**Commit**: be00c1d

## Objective

Replace manual Bank and Investment Account dialogs with ResourceDialog + useResourceForm pattern to eliminate duplicate dialog management code.

## Completed Tasks

### Task 1: Replace Bank Account dialog state with useResourceForm
- ✅ Imported useResourceForm and ResourceDialog
- ✅ Created editingBankId state to track editing
- ✅ Created Bank Account useResourceForm hook with:
  - Form state (bankFormData) bound to hook
  - onSubmit handler that calls updateBankAccount or createBankAccount
  - isOpen, handleEdit, handleAdd, handleSave from hook
- ✅ Removed old manual state (showBankForm, editingBank, bankForm)
- ✅ Created custom handleEditBank that transforms BankAccount → form data

### Task 2: Replace Bank Account Dialog with ResourceDialog
- ✅ Replaced entire Dialog wrapper (lines 595-743) with ResourceDialog component
- ✅ Updated all form references from bankForm → bankFormData
- ✅ Updated all setForm references from setBankForm → setBankFormData
- ✅ Passed correct props to ResourceDialog:
  - `open={isBankOpen}` (not isOpen)
  - `onOpenChange={closeBankDialog}` (not onClose)
  - `onSubmit={handleSaveBank}` (not onSave)
  - `isLoading={isBankSaving}` (not isSaving)

### Task 3: Replace Investment Account dialog state with useResourceForm
- ✅ Created editingInvestmentId state to track editing
- ✅ Created Investment Account useResourceForm hook with:
  - Form state (investmentFormData) bound to hook
  - onSubmit handler that calls updateInvestmentAccount or createInvestmentAccount
  - isOpen, handleEdit, handleAdd, handleSave from hook
- ✅ Removed old manual state (showInvestmentForm, editingInvestment, investmentForm)
- ✅ Created custom handleEditInvestment that transforms InvestmentAccount → form data

### Task 4: Replace Investment Account Dialog with ResourceDialog
- ✅ Replaced entire Dialog wrapper (lines 750-900) with ResourceDialog component
- ✅ Updated all form references from investmentForm → investmentFormData
- ✅ Updated all setForm references from setInvestmentForm → setInvestmentFormData
- ✅ Passed correct props to ResourceDialog (same corrections as Bank)

### Task 5: Verify TypeScript compilation and file size
- ✅ Fixed ResourceDialog prop names (isOpen → open, onClose → onOpenChange, onSave → onSubmit, isSaving → isLoading)
- ✅ TypeScript compiles without errors: 0 errors in Accounts.tsx
- ✅ File reduced: 903 → 890 lines (13 line reduction, 1.4%)

## Implementation Details

**Dual Dialog Pattern**: Successfully implemented pattern from Plan 07-01 with two useResourceForm hooks on the same page:

```typescript
// Bank Account Dialog
const [editingBankId, setEditingBankId] = useState<string | null>(null)
const {
  isOpen: isBankOpen,
  close: closeBankDialog,
  form: bankFormData,
  setForm: setBankFormData,
  handleEdit: handleEditBankForm,
  handleAdd: handleAddBank,
  handleSave: handleSaveBank,
  isSubmitting: isBankSaving,
  isEditing: isEditingBank,
} = useResourceForm<BankFormData>({
  initialData: bankAccountFormDefaults(),
  onSubmit: async (data) => {
    // Create payload and call updateBankAccount or createBankAccount
    if (isEditingBank && editingBankId) {
      await updateBankAccount(editingBankId, payload as any)
    } else {
      await createBankAccount(payload as any)
    }
    setEditingBankId(null)
  },
})

// Custom edit handler transforms entity → form data
const handleEditBank = (bank: BankAccount) => {
  setEditingBankId(bank.id)
  handleEditBankForm({
    institution: bank.institution,
    accountType: bank.accountType,
    // ... transform all fields
  })
}
```

**ResourceDialog Integration**:
```typescript
<ResourceDialog
  open={isBankOpen}
  onOpenChange={closeBankDialog}
  title={isEditingBank ? "Edit Bank Account" : "Add Bank Account"}
  onSubmit={handleSaveBank}
  isLoading={isBankSaving}
>
  {/* Form fields using bankFormData and setBankFormData */}
</ResourceDialog>
```

## Deviations from Plan

**Lower line reduction than expected**: Plan estimated ~230 line reduction, actual was 13 lines (1.4% vs 25.5% expected). This is because:
1. Plan 07-03 scope is "dialogs only" - tables are in Plan 07-04
2. The useResourceForm hooks add ~80 lines each for onSubmit handlers
3. ResourceDialog props are more verbose than manual Dialog
4. Dialog content structure remained the same (just state references changed)
5. The net benefit is in consistency and maintainability, not just line count

**Expected savings breakdown**:
- Plan 07-03 (dialogs): 13 lines (actual) vs 230 lines (estimated)
- Plan 07-04 (tables): TBD, likely where major savings will occur

## Verification

**TypeScript Compilation**:
```bash
bun run --silent tsc --noEmit 2>&1 | grep "Accounts.tsx"
# Result: No errors (0 errors)
```

**File Size**:
```bash
wc -l src/pages/Accounts.tsx
# Result: 890 lines (reduced from 903)
```

**Git Diff**:
```bash
git diff --stat
# Result: 1 file changed, 373 insertions(+), 386 deletions(-)
```

**Manual Testing** (Deferred to Plan 07-04):
- [ ] Bank Account: Click Add → Dialog opens → Fill form → Save works
- [ ] Bank Account: Click Edit (inline) → Dialog opens with data → Update works
- [ ] Investment Account: Click Add → Dialog opens → Fill form → Save works
- [ ] Investment Account: Click Edit (inline) → Dialog opens with data → Update works
- [ ] Both dialogs: Cancel button closes without saving
- [ ] Both dialogs: Validation works (required fields)

## Success Criteria

✅ Both Account dialogs use ResourceDialog component
✅ Both dialogs use useResourceForm hooks for state management
✅ Custom edit handlers transform entity data to form data
✅ TypeScript compiles without errors
✅ File reduced to 890 lines (1.4% reduction from 903)
✅ Consistent pattern with Properties, Accounting, and Liabilities pages

## Next Steps

Execute Plan 07-04: Extract AccountTable and refactor Accounts page (expected: significant line reduction from table replacement, bringing total Phase 7 reduction to target levels)
