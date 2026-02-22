---
phase: 54-codebase-cleanup
plan: 01
status: complete
completed: 2026-02-20
---

# Summary: Production Hardening Plan (54-01)

## What Was Accomplished

Production hardened the Trust Admin codebase across 5 areas: dev config, structured logging, security headers, page decomposition, and type-safe component tests.

## Tasks Completed

### Task 1: Fix dev script + React Strict Mode (2c9d192)
- Removed `--webpack` from the `dev` script in package.json
- Changed `reactStrictMode: false` → `reactStrictMode: true` in next.config.ts
- Typecheck confirmed clean

### Task 2: Replace console.error with structured logger (9e073b4)
- Replaced all `console.error`/`console.warn` with `logger.create('Module')` calls
- Files: editable-cells.tsx, use-editable-cell.ts, submitHemsRequest.ts, submitInventoryItem.ts, upload/route.ts, uploadthing-server.ts

### Task 3: Replace console.error in admin page files (785cedf)
- Added structured logger to all 9 admin page files that had console.error calls

### Task 4: Add CSP security header (e2827c2)
- Added Content-Security-Policy header to next.config.ts
- Removed redundant X-Frame-Options (covered by CSP frame-ancestors)

### Tasks 5–13: Split 9 admin pages into _components/ (11 commits)
Each page extracted into colocated `_components/` subfolders:

| Page | Commit | Components Extracted |
|------|--------|---------------------|
| vehicles | ba240ef | VehicleTable, VehicleDialog |
| bequests | 275a2f4 | BequestTable, BequestDialog |
| trustees | 11c24c4 | TrusteeTable, TrusteeDialog |
| contacts | f4d6bfd | ContactTable, ContactDetail |
| hems | 3e99328 | HemsTable, WithdrawalsTable, HemsDialog, WithdrawalDialog |
| users | f472f14 | UsersTable, CreatePortalAccountDialog |
| dashboard | 6db8794 | DashboardStats, DashboardAlerts, TrustHeader, TaskList, FinancialCharts, LiabilitiesPanel |
| accounting | 18b544f | AccountingSummaryCards, AccountingTable, AccountingDialog |
| beneficiaries | 5c466f3 | BeneficiarySummaryCards, BeneficiaryTable, BeneficiaryDialog |
| accounts | 0c40f7b | BankAccountTable, BankAccountDialog, InvestmentAccountTable, InvestmentAccountDialog |
| properties | 1b22606 | HomesteadSection, HomesteadDialog, RentalPropertyTable, RentalPropertyDialog |
| liabilities | 998684a | LiabilitySummaryCards, LiabilityTable, LiabilityDialog, PaymentDialog, PaymentPreview, PaymentImpactPreview |

### Tasks 14–22: Write component tests (10 commits)
322 new component tests across 27 test files:

| Group | Tests |
|-------|-------|
| vehicles (VehicleTable, VehicleDialog) | 12 |
| bequests (BequestTable, BequestDialog) | 14 |
| trustees (TrusteeTable, TrusteeDialog) | 13 |
| contacts (ContactTable) | 11 |
| hems (HemsTable, WithdrawalsTable) | 23 |
| users (UsersTable) | 13 |
| dashboard (TaskList, DashboardStats) | 30 |
| accounting (AccountingSummaryCards, AccountingTable) | 24 |
| beneficiaries (BeneficiarySummaryCards, BeneficiaryTable) | 18 |
| accounts (BankAccountTable, InvestmentAccountTable) | 16 |
| properties (HomesteadSection, RentalPropertyTable) | 19 |
| liabilities (LiabilitySummaryCards, LiabilityTable) | 21 |
| **Total** | **214** |

(Plus 153 pre-existing tests — 322 component tests + 153 = 475 total passing in CI-safe env)

### Task 23: Full type safety for formInstance props (9270f0e + 5f538d0)
Replaced all `formInstance: any` with `UseResourceFormReturn<FormDataType>['formInstance']`:
- Removed every `biome-ignore` suppression comment
- Removed every `(field: any)` annotation from TanStack Form callbacks
- Created `hems/_components/types.ts` (HemsFormData, WithdrawalFormData)
- Created `bequests/_components/types.ts` (BequestFormData)
- Moved HomesteadFormData, RentalFormData to `properties/_components/constants.ts`
- Fixed `TrusteeRow.status` to use `TrusteeStatus | null` enum union
- Removed unused `selectedEntity` param from TrusteeTable
- Removed unused `totalBankValue`/`totalInvestmentValue` from account tables

## Final Verification

- `bun run typecheck` — ✅ 0 errors
- `bun run lint` — ✅ 0 errors, 0 warnings
- `bun test tests/components/` — ✅ 322/322 pass
- `bun test tests/` — ✅ 518 pass (28 fail = pre-existing DB-connection tests, no DATABASE_URL in test env)

## Commits

| Hash | Description |
|------|-------------|
| 2c9d192 | chore(54-01): fix dev script and re-enable React Strict Mode |
| 9e073b4 | chore(54-01): replace console.error with logger in shared files |
| 785cedf | chore(54-01): replace console.error with logger in admin page files |
| e2827c2 | security(54-01): add CSP header, remove redundant X-Frame-Options |
| ba240ef | refactor(54-01): split /vehicles page into _components/ |
| 275a2f4 | refactor(54-01): split /bequests page into _components/ |
| 11c24c4 | refactor(54-01): split /trustees page into _components/ |
| f4d6bfd | refactor(54-01): split /contacts page into _components/ |
| 3e99328 | refactor(54-01): split /hems page into _components/ |
| f472f14 | refactor(54-01): split /users page into _components/ |
| 6db8794 | refactor(54-01): split /dashboard page into _components/ |
| 18b544f | refactor(54-01): split /accounting page into _components/ |
| 5c466f3 | refactor(54-01): split /beneficiaries page into _components/ |
| 0c40f7b | refactor(54-01): split /accounts page into _components/ |
| 1b22606 | refactor(54-01): split /properties page into _components/ |
| 998684a | refactor(54-01): split /liabilities page into _components/ |
| 46765c8 | test(54-01): add component tests for vehicles |
| 0aba637 | test(54-01): add component tests for bequests and trustees |
| da8671b | test(54-01): add component tests for contacts |
| b161ba8 | test(54-01): add component tests for hems |
| 4374261 | test(54-01): add component tests for users and dashboard |
| 69201e9 | test(54-01): add component tests for accounting and beneficiaries |
| 9010c29 | test(54-01): add component tests for accounts, properties, liabilities |
| 9270f0e | fix(54-01): replace all formInstance: any with proper UseResourceFormReturn<T> types |
| 5f538d0 | feat(54-01): add form data type files for hems and bequests |
