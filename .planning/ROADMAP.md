# Roadmap: Trust Admin

## Overview

Trust Admin application development roadmap. v1.0 focused on code quality and reliability improvements to the existing React/Vite + Bun.serve() stack. v2.0 migrates to Next.js 16.1 + tRPC v11 for better type safety, developer experience, and scalability.

## Domain Expertise

- ~/.claude/plans/nextjs-trpc-migration.md (v2.0 migration reference - comprehensive context)

## Milestones

- ✅ [v1.0 Code Quality & Reliability](milestones/v1.0-ROADMAP.md) - Phases 1-11 (shipped 2026-01-09)
- ✅ [v2.0 Next.js + tRPC Migration](milestones/v2.0-ROADMAP.md) - Phases 12-17 (shipped 2026-01-16)
- 🚧 **v3.0 Database Schema Improvements** - Phases 18-24 (in progress)
- ✅ [v4.0 Smart Liability Management](milestones/v4.0-ROADMAP.md) - Phases 25-29 (shipped 2026-01-17)
- ✅ [v5.0 Developer Experience & Observability](milestones/v5.0-ROADMAP.md) - Phases 30-35 (shipped 2026-01-16)
- 🔜 **v6.0 React 19.2 Platform Optimizations** - Phases 36-40 (pending)

## Phases

**Phase Numbering:**
- Integer phases (1-17): Planned work
- Decimal phases (X.1, X.2): Urgent insertions if needed (marked with INSERTED)

<details>
<summary>✅ v1.0 Code Quality & Reliability (Phases 1-11) - SHIPPED 2026-01-09</summary>

### Phase 1: Validation Schema Fix
**Goal**: Fix drizzle-zod schemas to make auto-generated fields optional, unblocking all API POST endpoints
**Plans**: 2 plans
Plans:
- [x] 01-01: Create schema wrapper utility to handle auto-generated fields
- [x] 01-02: Update all 31 table schemas and verify API endpoints

### Phase 2: Phase 3 Test Completion
**Goal**: Complete integration tests for liability payments, HEMS workflow, trustee fees, and distributions
**Plans**: 3 plans
Plans:
- [x] 02-01: Verify and fix liability payment workflow tests
- [x] 02-02: Verify and fix HEMS approval workflow tests
- [x] 02-03: Verify distribution calculator tests (34/34 passing, 100% coverage)

### Phase 3: Error Notification System
**Goal**: Add toast notification system so users see clear error messages instead of silent failures
**Plans**: 3 plans
Plans:
- [x] 03-01: Install and configure toast library (Sonner)
- [x] 03-02: Create error notification hook and integrate with query factory
- [x] 03-03: Add error boundary for React component crashes

### Phase 4: Component Extraction Patterns
**Goal**: Extract reusable patterns (form dialogs, summary cards, data tables) to reduce duplication
**Plans**: 4 plans
Plans:
- [x] 04-01: Extract generic ResourceDialog component with form state
- [x] 04-02: Extract SummaryCard component for metric displays
- [x] 04-03: Extract DataTable component with inline editing support
- [x] 04-04: Document component patterns and usage examples

### Phase 5: Properties Page Refactor
**Goal**: Break down Properties.tsx (1447 lines) using extracted patterns from Phase 4
**Plans**: 3 plans
Plans:
- [x] 05-01: Extract dialog components (replace manual dialogs with ResourceDialog and useResourceForm)
- [x] 05-02: Extract Rental Properties table (replace manual table with DataTable component)
- [x] 05-03: Verify functionality and update tests

### Phase 6: Accounting Page Refactor
**Goal**: Break down Accounting.tsx (1226 lines) using extracted patterns
**Plans**: 3 plans
Plans:
- [x] 06-01: Extract Accounting Dialog Component (ResourceDialog + useResourceForm)
- [x] 06-02: Replace Accounting Table with DataTable Component
- [x] 06-03: Verify Accounting Page Refactor

### Phase 7: Liabilities & Accounts Refactor
**Goal**: Break down Liabilities.tsx (920 lines) and Accounts.tsx (903 lines) using patterns
**Plans**: 4 plans
Plans:
- [x] 07-01: Extract LiabilityDialog and PaymentDialog
- [x] 07-02: Extract LiabilityTable and refactor Liabilities page
- [x] 07-03: Extract AccountDialog and AccountTable
- [x] 07-04: Refactor Accounts page and verify both

### Phase 8: Type Safety Improvements
**Goal**: Eliminate `as any` casts in route factory and CRUD operations, improve TypeScript inference
**Plans**: 4 plans
Plans:
- [x] 08-01: Create typed resource configuration interface
- [x] 08-02: Apply typed config to all resources
- [x] 08-03: Improve CRUD factory type inference
- [x] 08-04: Verify type safety and document patterns

### Phase 9: Performance Optimization
**Goal**: Add pagination to CRUD factory and implement request deduplication
**Plans**: 3 plans
Plans:
- [x] 09-01: Add pagination support to CRUD factory (limit, offset, total count)
- [x] 09-02: Implement simple request deduplication in query hook
- [x] 09-03: Add pagination UI components to data tables

### Phase 10: TanStack Table & Form Integration
**Goal**: Complete integration with TanStack Table and TanStack Form for improved UI components
**Plans**: 7 plans (1 skipped)
Plans:
- [x] 10-01: Research and Strategy (audit current state, document patterns)
- [x] 10-02: TanStack Table Core Wrapper (create wrapper, migrate DataTable)
- [x] 10-03: Form Migration Batch 1 - Simple (Contacts, Vehicles)
- [x] 10-04: Table Migration Batch 2 - Partial (Bequests, HemsQueue)
- [x] 10-05: Table Migration Batch 3 - Complete (Dashboard)
- [x] 10-07: Form Migration Batch 1 - ResourceDialog
- [x] 10-08: Form Migration Batch 2 - Manual Dialogs

### Phase 11: Quality Verification
**Goal**: Comprehensive testing, documentation updates, and final validation
**Plans**: 4 plans
Plans:
- [x] 11-01: Test Suite Verification & Coverage Analysis
- [x] 11-02: Refactor Distributions & Beneficiaries Pages
- [x] 11-03: Update CONCERNS.md Documentation
- [x] 11-04: Create Handoff Documentation

</details>

### ✅ v2.0 Next.js + tRPC Migration (Shipped 2026-01-16)

**Milestone Goal:** Migrate from React/Vite + Bun.serve() to Next.js 16.1 + tRPC v11 for improved type safety, developer experience, and scalability. In-place migration within the same codebase.

**Why Migrating:**
- Manual code splitting (1.5MB bundle)
- Hash-based routing limits growth
- Route factory works but tRPC provides better type safety and DX for future features (payments, integrations, inventory)

**Stack Changes:**
| Layer | Current | Target | Action |
|-------|---------|--------|--------|
| Framework | Vite + Bun.serve() | Next.js 16.1 (App Router) | Replace |
| API | Route factory (index.ts) | tRPC v11 | Replace |
| Data Fetching | TanStack Query | TanStack Query + tRPC | Integrate |
| Forms | TanStack Form | React Hook Form | Replace |
| Auth | Better Auth | Better Auth (Next.js adapter) | Adapt |
| Bundler | Vite | Turbopack (default) | Auto |
| Keep | Drizzle ORM, shadcn/ui, Zod, PostgreSQL | | |

**Critical Fixes Included:**
- SQL injection in `searchActivityLogByField` (db/queries.ts:566-591)
- Add database transactions to `recordLiabilityPayment` (db/queries.ts:415-497)
- Remove unused TanStack Form (keep React Hook Form only)

**Reference:** ~/.claude/plans/nextjs-trpc-migration.md

---

#### Phase 12: Setup
**Goal**: Initialize Next.js 16.1 app in-place, install dependencies, setup migration-friendly structure

**Depends on**: v1.0 complete

**Research**: Likely (Next.js 16.1 specifics - proxy.ts replaces middleware.ts, async params, "use cache", Turbopack)

**Research topics**: Next.js 16.1 migration patterns, proxy.ts vs middleware.ts, Turbopack compatibility

**Plans**: 1 plan (5 tasks)

**Migration-friendly structure with `--src-dir`:**
```
trust-admin/
├── src/
│   ├── app/              # NEW: Next.js App Router
│   ├── server/           # NEW: tRPC routers
│   ├── lib/              # Migrated utilities
│   ├── components/       # Migrated components
│   └── hooks/            # Simplified (tRPC replaces most)
├── db/                   # Keep as-is (shared during migration)
├── index.ts              # OLD: Delete after migration
├── vite.config.ts        # OLD: Delete after migration
└── next.config.ts        # NEW: Next.js config
```

**Tasks:**
1. Initialize Next.js 16.1 in-place:
   ```bash
   bunx create-next-app@latest . --yes --use-bun --src-dir
   ```
   This gives: TypeScript, Tailwind, ESLint, App Router, Turbopack, Bun

2. Install additional dependencies:
   ```bash
   bun add @trpc/server@next @trpc/client@next @trpc/react-query@next \
     drizzle-orm better-auth zod react-hook-form @hookform/resolvers \
     resend @tanstack/react-query
   bun add -d drizzle-kit
   ```

3. Initialize shadcn/ui:
   ```bash
   bunx shadcn@latest init
   ```

4. Copy files to `src/`:
   - `src/components/` ← copy from current `src/components/` (resource-dialog, data-table, editable-cells, ui/)
   - `src/lib/` ← copy from current `src/lib/` (constants, classification-rules, distribution-calculator, fee-calculator, formatters)
   - `db/` stays at root (shared between old and new during migration)

5. Setup environment variables in `.env.local`

Plans:
- [ ] 12-01: Next.js 16.1 project setup and file copying

---

#### Phase 13: tRPC Setup
**Goal**: Create tRPC initialization, context, base procedures, 22 resource routers, HTTP handler, and client

**Depends on**: Phase 12

**Research**: Likely (tRPC v11 patterns, Next.js App Router integration)

**Research topics**: tRPC v11 context patterns, React Query integration, error handling, procedure types

**Plans**: 1 plan (6 tasks)

**Tasks:**
1. Create `server/trpc/index.ts` - tRPC init with context
2. Create base router procedures (public, protected, admin)
3. Create `server/trpc/routers/` - one file per resource (22 routers)
4. Create `server/trpc/router.ts` - merge all routers
5. Create `app/api/trpc/[trpc]/route.ts` - HTTP handler
6. Create `lib/trpc.ts` - client + React Query provider

**Conversion Map (22 resources):**
| Current Route | tRPC Router | Special Procedures |
|---------------|-------------|-------------------|
| /api/entities | entityRouter | - |
| /api/beneficiaries | beneficiaryRouter | - |
| /api/liabilities | liabilityRouter | recordPayment, getPayments |
| /api/bank-accounts | bankAccountRouter | - |
| /api/investment-accounts | investmentAccountRouter | - |
| /api/vehicles | vehicleRouter | - |
| /api/homesteads | homesteadRouter | - |
| /api/rental-properties | rentalPropertyRouter | - |
| /api/trustees | trusteeRouter | - |
| /api/specific-bequests | bequestRouter | - |
| /api/trust-accounting | accountingRouter | - |
| /api/withdrawal-records | withdrawalRouter | - |
| /api/hems-requests | hemsRouter | approve, deny |
| /api/liability-payments | liabilityPaymentRouter | - |
| /api/trustee-fee-schedules | feeScheduleRouter | - |
| /api/trustee-fee-entries | feeEntryRouter | - |
| /api/activity-logs | activityLogRouter | (read-only) |
| /api/distributions | distributionRouter | - |
| /api/documents | documentRouter | - |
| /api/tasks | taskRouter | - |
| /api/contacts | contactRouter | - |
| /api/valuations | valuationRouter | - |

Plans:
- [ ] 13-01: tRPC core setup and 22 resource routers

---

#### Phase 14: Auth Migration
**Goal**: Migrate Better Auth to Next.js adapter with nextCookies plugin, route handler, and proxy.ts

**Depends on**: Phase 12

**Research**: Likely (Better Auth Next.js adapter, nextCookies plugin, toNextJsHandler)

**Research topics**: Better Auth Next.js integration, session handling in proxy.ts, cookie management

**Plans**: 1 plan (4 tasks)

**Tasks:**
1. Update `lib/auth.ts` with Next.js adapter (add nextCookies plugin)
2. Create `app/api/auth/[...all]/route.ts` (toNextJsHandler)
3. Create `app/proxy.ts` for route protection (replaces middleware.ts in Next.js 16)
4. Update `lib/auth-client.ts`

Plans:
- [ ] 14-01: Better Auth Next.js adapter and proxy.ts

---

#### Phase 15: Page Migration
**Goal**: Migrate 18 pages to Next.js App Router with tRPC hooks (14 admin + 4 portal)

**Depends on**: Phases 13, 14

**Research**: Unlikely (mechanical migration, patterns established in migration plan)

**Plans**: 1 plan (4 tasks)

**Tasks:**
1. Create `app/layout.tsx` with providers (tRPC, React Query, Theme)
2. Create `app/(admin)/layout.tsx` with sidebar
3. Migrate pages one by one:
   - Copy page content
   - Replace `useSomething()` hooks with `trpc.something.list.useQuery()`
   - Replace mutations with `trpc.something.create.useMutation()`
   - Update imports
4. Create portal pages under `app/portal/`

**Admin Pages (14):**
- Dashboard (/)
- trustees, beneficiaries, contacts, distributions
- hems-queue, distribution-wizard, bequests
- accounting, properties, accounts, vehicles, liabilities
- activity-log, settings

**Portal Pages (4):**
- login, dashboard, hems-request, (layout)

Plans:
- [ ] 15-01: Page migration to Next.js App Router with tRPC hooks

---

#### Phase 16: Testing & Verification
**Goal**: Verify all functionality works, test auth flow, test special workflows, adapt existing tests

**Depends on**: Phases 13, 14, 15

**Research**: Unlikely (validation and testing)

**Plans**: 1 plan (5 tasks)

**Tasks:**
1. Run `next dev` - verify all pages load
2. Test CRUD operations on each resource
3. Test auth flow (magic link → session → protected routes)
4. Test special workflows (liability payment, HEMS approval)
5. Run existing tests (adapt for tRPC if needed)

**Verification Checklist:**
- [ ] All 14 admin pages render without errors
- [ ] All 4 portal pages render without errors
- [ ] Entity CRUD works (create, read, update, delete)
- [ ] Liability payment recording works
- [ ] HEMS request → approval → distribution flow works
- [ ] Magic link auth sends email and creates session
- [ ] Protected routes redirect to login when unauthenticated
- [ ] Admin routes require admin role
- [ ] Portal routes require beneficiary role
- [ ] Inline editable cells save changes
- [ ] Toast notifications appear on success/error
- [ ] Bundle size < 500KB initial load
- [ ] No console errors in browser
- [ ] TypeScript compiles without errors
- [ ] Existing tests pass (or are adapted)

Plans:
- [ ] 16-01: Testing and verification

---

#### Phase 17: Cleanup
**Goal**: Remove old Vite/Bun files, update package.json scripts, update CI/CD, update documentation

**Depends on**: Phase 16

**Research**: Unlikely (cleanup and documentation)

**Plans**: 1 plan (4 tasks)

**Tasks:**
1. Remove old Vite config, index.ts
2. Update package.json scripts
3. Update CI/CD config
4. Update documentation

**Files to Remove:**
- `index.ts` (Bun API server)
- `vite.config.ts`
- `src/App.tsx` (hash routing)
- `src/pages/` (old page components)
- `src/hooks/` (23 manual hook files - replaced by tRPC)

Plans:
- [ ] 17-01: Cleanup old files and update configuration

---

### 🔜 v3.0 Database Schema Improvements (Pending v2.0 completion)

**Milestone Goal:** Apply PostgreSQL best practices to the database schema based on official Drizzle and PostgreSQL documentation. Address all identified schema issues systematically with proper research, migration strategies, and rollback plans.

**Why This Matters:**
- Current schema uses `timestamp` instead of `timestamptz` (timezone issues)
- TEXT primary keys instead of BIGINT IDENTITY (performance, storage)
- Polymorphic tables lack constraints (data integrity)
- Missing composite indexes (query performance)
- Text fields used where enums should be (type safety)

**Reference Documentation:**
- PostgreSQL Official: https://www.postgresql.org/docs/current/
- Drizzle ORM: https://orm.drizzle.team/docs/column-types/pg
- Drizzle Kit Migrations: https://orm.drizzle.team/docs/migrations

**Breaking Change Strategy:**
- Phases 18-22: Non-breaking (can be applied in production)
- Phases 23-24: Breaking (require migration scripts, downtime planning)

---

#### Phase 18: Timestamp Migration to TIMESTAMPTZ
**Goal**: Migrate all timestamp columns from `timestamp` to `timestamptz` for proper timezone handling

**Depends on**: v2.0 complete

**Research**: Yes (Drizzle ORM timestamp types, PostgreSQL timezone handling)

**Research topics**:
- Drizzle `timestamp` vs `timestamp({ withTimezone: true })` patterns
- PostgreSQL timezone conversion behavior
- Migration strategy for existing data (AT TIME ZONE)

**Plans**: 1 plan (4 tasks)

**Scope:**
- 98 timestamp columns across 31 tables (discovered via grep)
- Current pattern: `t.timestamp({ precision: 3, mode: "string" })`
- Target pattern: `t.timestamp({ precision: 3, mode: "string", withTimezone: true })`

**Tasks:**
1. Research Drizzle ORM timestamptz patterns and migration behavior
2. Create migration script to alter columns with timezone conversion
3. Update all schema.ts timestamp definitions to use withTimezone: true
4. Verify data integrity and run tests

**Impact**: Non-breaking for application code (dates stored as strings)

Plans:
- [ ] 18-01: Timestamp to timestamptz migration

---

#### Phase 19: Enum Type Corrections
**Goal**: Convert text fields to proper PostgreSQL enums where semantically appropriate

**Depends on**: Phase 18

**Research**: Yes (PostgreSQL enum best practices, Drizzle pgEnum patterns)

**Research topics**:
- When to use enums vs CHECK constraints vs lookup tables
- Drizzle pgEnum migration patterns
- Adding new enum values safely

**Plans**: 1 plan (4 tasks)

**Fields to Convert:**
| Table | Column | Current | Target Enum Values |
|-------|--------|---------|-------------------|
| trustAccounting | entryType | TEXT | INCOME, EXPENSE |
| trustAccounting | incomeType | TEXT | DIVIDEND, INTEREST, RENT, ROYALTY, OTHER |
| trustAccounting | expenseType | TEXT | TAX, INSURANCE, MAINTENANCE, LEGAL, OTHER |
| personalProperty | category | TEXT | JEWELRY, ART, COLLECTIBLES, ELECTRONICS, FURNITURE, OTHER |
| document | documentType | TEXT | DEED, TITLE, STATEMENT, CONTRACT, LEGAL, OTHER |

**Tasks:**
1. Research PostgreSQL enum vs CHECK constraint tradeoffs
2. Create pgEnum definitions in schema.ts
3. Create migration to convert TEXT columns to enum
4. Update validation.ts with proper Zod enum integration

**Impact**: Non-breaking (values already match expected patterns)

Plans:
- [ ] 19-01: Text to enum type conversions

---

#### Phase 20: Polymorphic Constraint Enforcement
**Goal**: Add CHECK constraints to polymorphic tables (Valuation, Document, Transaction) ensuring exactly one FK is set

**Depends on**: Phase 19

**Research**: Yes (PostgreSQL CHECK constraints, Drizzle custom constraints)

**Research topics**:
- CHECK constraint syntax for XOR patterns
- Drizzle ORM check() builder
- Handling existing invalid data

**Plans**: 1 plan (5 tasks)

**Affected Tables:**
- `Valuation`: vehicleId, homesteadId, rentalPropertyId, bankAccountId, investmentAccountId, personalPropertyId, artworkId (7 FKs)
- `Document`: entityId, vehicleId, homesteadId, rentalPropertyId, bankAccountId, investmentAccountId, insurancePolicyId, personalPropertyId (8 FKs)
- `Transaction`: vehicleId, homesteadId, rentalPropertyId, bankAccountId, investmentAccountId, insurancePolicyId (6 FKs)

**Constraint Pattern:**
```sql
CHECK (
  (CASE WHEN vehicleId IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN homesteadId IS NOT NULL THEN 1 ELSE 0 END +
   ...
  ) = 1
)
```

**Tasks:**
1. Research Drizzle check() constraint builder syntax
2. Audit existing data for constraint violations
3. Create data cleanup script for any violations
4. Add CHECK constraints to schema.ts
5. Test constraint enforcement

**Impact**: May require data cleanup if violations exist

Plans:
- [ ] 20-01: Polymorphic constraint implementation

---

#### Phase 21: Composite Index Optimization
**Goal**: Add composite indexes for common query patterns to improve performance

**Depends on**: Phase 20

**Research**: Yes (PostgreSQL composite index ordering, EXPLAIN ANALYZE patterns)

**Research topics**:
- Composite index column ordering strategy
- Covering indexes with INCLUDE
- Partial indexes for filtered queries

**Plans**: 1 plan (4 tasks)

**Candidate Indexes:**
| Table | Columns | Rationale |
|-------|---------|-----------|
| trustAccounting | (entityId, accountingDate) | Common filter + sort |
| distribution | (beneficiaryId, distributionDate) | Beneficiary history |
| liabilityPayment | (liabilityId, paymentDate) | Payment history |
| activityLog | (tableName, recordId) | Audit lookups |
| hemsRequest | (beneficiaryId, status) | Pending requests by beneficiary |

**Tasks:**
1. Analyze current query patterns from application code
2. Run EXPLAIN ANALYZE on common queries
3. Add composite indexes to schema.ts
4. Verify performance improvement

**Impact**: Non-breaking (indexes are additive)

Plans:
- [ ] 21-01: Composite index implementation

---

#### Phase 22: Nullable FK Business Logic Review
**Goal**: Review nullable FKs and tighten to NOT NULL where business logic requires

**Depends on**: Phase 21

**Research**: Yes (Drizzle FK constraints, application domain logic)

**Research topics**:
- Business rules for each relationship
- Orphan record handling
- Migration strategy for existing nulls

**Plans**: 1 plan (4 tasks)

**Candidates for Review:**
| Table | Column | Currently | Question |
|-------|--------|-----------|----------|
| distribution | beneficiaryId | NOT NULL | Correct ✓ |
| hemsRequest | beneficiaryId | NOT NULL | Correct ✓ |
| trustAccounting | bankAccountId | nullable | Should distributions require an account? |
| specificBequest | beneficiaryId | NOT NULL | Correct ✓ |
| liability | homesteadId/vehicleId | nullable | Correct for unsecured debt ✓ |

**Tasks:**
1. Document business rules for each FK relationship
2. Identify FKs that should be NOT NULL
3. Audit data for existing nulls that would violate new constraints
4. Apply tightened constraints where appropriate

**Impact**: May require data cleanup

Plans:
- [ ] 22-01: Nullable FK business logic review

---

#### Phase 23: Primary Key Type Migration (BREAKING)
**Goal**: Migrate from TEXT primary keys to BIGINT GENERATED ALWAYS AS IDENTITY

**Depends on**: Phase 22

**Research**: Yes (Drizzle IDENTITY columns, PostgreSQL sequence migration)

**Research topics**:
- Drizzle BIGINT with IDENTITY pattern
- Migrating existing UUID/CUID text PKs
- Foreign key cascade updates
- Application code impact

**Plans**: 1 plan (6 tasks)

**⚠️ BREAKING CHANGE - Requires:**
- Database migration with FK updates
- Application code changes (ID generation)
- API contract changes (ID format)
- Client-side ID handling updates

**Scope:**
- 31 tables with TEXT primary keys
- All FK references must update

**Migration Strategy:**
1. Add new BIGINT column with IDENTITY
2. Backfill with sequential values
3. Update FKs to reference new column
4. Drop old TEXT column
5. Rename new column to id

**Tasks:**
1. Research Drizzle IDENTITY column patterns
2. Create comprehensive migration script
3. Update schema.ts with BIGINT IDENTITY PKs
4. Update application code for numeric IDs
5. Update API contracts and documentation
6. Create rollback plan

**Impact**: BREAKING - Major change requiring coordinated deployment

Plans:
- [ ] 23-01: Primary key type migration

---

#### Phase 24: Table Naming Convention (BREAKING)
**Goal**: Migrate from PascalCase to snake_case table names per PostgreSQL conventions

**Depends on**: Phase 23

**Research**: Yes (PostgreSQL identifier rules, Drizzle table mapping)

**Research topics**:
- PostgreSQL identifier case sensitivity
- Drizzle table name vs schema name mapping
- ORM query impact
- Migration strategy

**Plans**: 1 plan (5 tasks)

**⚠️ BREAKING CHANGE - Requires:**
- Database migration (ALTER TABLE RENAME)
- Application code review
- SQL query updates
- Index and constraint rename

**Current → Target:**
| Current | Target |
|---------|--------|
| ActivityLog | activity_log |
| BankAccount | bank_account |
| Beneficiary | beneficiary |
| Document | document |
| Distribution | distribution |
| Entity | entity |
| ... | ... (31 tables total) |

**Tasks:**
1. Research Drizzle table renaming patterns
2. Create migration script for table renames
3. Update all FK constraint names
4. Update index names
5. Verify ORM queries still work

**Impact**: BREAKING - Requires coordinated deployment

Plans:
- [ ] 24-01: Table naming convention migration

---

## Files to Copy As-Is

These files can be copied directly with minimal changes:

| File | Changes |
|------|---------|
| `db/schema.ts` | No changes needed |
| `db/crud-factory.ts` | No changes needed |
| `db/queries.ts` | Fix SQL injection, add transactions |
| `db/validation.ts` | No changes needed |
| `db/helpers.ts` | No changes needed |
| `components/ui/*` | No changes needed (shadcn) |
| `components/data-table.tsx` | Minor import updates |
| `components/editable-cells.tsx` | No changes needed |
| `components/summary-card.tsx` | No changes needed |
| `lib/constants.ts` | No changes needed |
| `lib/classification-rules.ts` | No changes needed |
| `lib/distribution-calculator.ts` | No changes needed |
| `lib/fee-calculator.ts` | No changes needed |
| `utils/formatters.ts` | No changes needed |

---

<details>
<summary>✅ v4.0 Smart Liability Management (Phases 25-29) - SHIPPED 2026-01-17</summary>

**Milestone Goal:** Transform liability tracking to intelligent loan management with automatic amortization calculations.

- [x] Phase 25: Loan Terms Schema & Calculation Engine (3/3 plans) - completed 2026-01-17
- [x] Phase 26: Type-Aware Liability Form (1/1 plan) - completed 2026-01-17
- [x] Phase 27: Bulk Entry Mode (1/1 plan) - completed 2026-01-17
- [x] Phase 28: Progress Visualization & Dashboard (1/1 plan) - completed 2026-01-17
- [x] Phase 29: Payment Recording Integration (1/1 plan) - completed 2026-01-17

See [v4.0 Archive](milestones/v4.0-ROADMAP.md) for full details.

</details>

<!--
ARCHIVED: v4.0 Phase details moved to milestones/v4.0-ROADMAP.md

#### Phase 25: Loan Terms Schema & Calculation Engine
**Goal**: Add schema fields for loan terms and build backend amortization calculation logic

**Depends on**: v2.0 complete

**Research**: Yes (amortization formulas, edge cases for different loan types)

**Plans**: 1 plan (5 tasks)

**Schema Additions:**
| Field | Type | Purpose |
|-------|------|---------|
| `loanTermMonths` | integer (nullable) | Loan duration (360 for 30yr, 60 for 5yr) |
| `loanStartDate` | date (nullable) | When loan originated |
| `escrowMonthly` | decimal (nullable) | Monthly escrow for taxes/insurance |
| `isRevolvingCredit` | boolean | True for credit cards (no fixed term) |

**Calculation Functions:**
- `calculateAmortizationSchedule(principal, rate, termMonths, startDate)`
- `getCurrentLoanPosition(schedule, currentBalance)`
- `calculatePaymentSplit(currentBalance, annualRate, paymentAmount)`
- `estimatePayoffDate(balance, rate, monthlyPayment)`

**Tasks:**
1. Add new fields to liability schema
2. Create amortization calculation utilities
3. Update recordPayment to auto-calculate principal/interest split
4. Add payoff projection calculations
5. Write unit tests for calculation edge cases

Plans:
- [x] 25-01: Loan terms schema (4 fields added)
- [x] 25-02: Amortization calculation utilities
- [x] 25-03: Integration into payment workflow

---

#### Phase 26: Type-Aware Liability Form
**Goal**: Dynamic form that adapts based on liability type, with smart defaults and real-time calculation feedback

**Depends on**: Phase 25

**Research**: Unlikely (UI patterns established)

**Plans**: 1 plan (4 tasks)

**Type Configurations:**
| Type | Term Fields | Escrow | Smart Defaults |
|------|-------------|--------|----------------|
| MORTGAGE | Yes | Yes | 30yr, monthly payment |
| LOAN | Yes | No | 5yr term |
| CREDIT_CARD | No (revolving) | No | Show APR, min payment |
| TAX_OWED | Optional | No | Payment plan terms |
| ACCOUNTS_PAYABLE | No | No | Simple balance tracking |

**UI Features:**
- Type selector changes visible fields
- Real-time payment calculation as user types
- Validation feedback ("Calculated payment differs from entered")
- "Existing Loan" mode: enter current balance, system calculates position
- Collapsible sections for optional details

**Tasks:**
1. Create liability type configuration map
2. Build dynamic form component with conditional fields
3. Add real-time calculation display (payment, payoff date, progress)
4. Implement validation with helpful feedback

Plans:
- [ ] 26-01: Type-aware liability form

---

#### Phase 27: Bulk Entry Mode
**Goal**: Quick-entry interface for initial inventory of multiple liabilities

**Depends on**: Phase 26

**Research**: Unlikely (table/spreadsheet UI patterns)

**Plans**: 1 plan (3 tasks)

**Features:**
- Spreadsheet-like table for rapid entry
- Tab between cells, enter to add row
- Paste from Excel/Google Sheets
- Type column with dropdown
- Validation row-by-row with error highlighting
- "Import from CSV" option (future enhancement)

**Tasks:**
1. Build bulk entry table component
2. Add keyboard navigation and paste handling
3. Implement row validation and batch save

Plans:
- [x] 27-01: Bulk entry mode for liabilities

---

#### Phase 28: Progress Visualization & Dashboard
**Goal**: Visual representation of liability payoff progress and projections

**Depends on**: Phase 25

**Research**: Unlikely (visualization patterns)

**Plans**: 1 plan (4 tasks)

**Visualizations:**
- Progress bars showing % paid off
- Payments made vs total (e.g., "48/360")
- Estimated payoff date
- Principal paid vs interest paid breakdown
- "On track" / "Ahead" / "Behind" indicators

**Dashboard Enhancements:**
- Liability summary cards with progress
- Total debt trending over time
- Next payments due calendar view
- Payoff milestone celebrations

**Tasks:**
1. Create LiabilityProgressBar component
2. Build enhanced liability list with progress indicators
3. Add liability summary to main dashboard
4. Implement payoff projections display

Plans:
- [x] 28-01: Progress visualization and dashboard

---

#### Phase 29: Payment Recording Integration
**Goal**: Seamless payment recording that auto-calculates splits and updates projections

**Depends on**: Phases 25, 28

**Research**: Unlikely (integration of existing work)

**Plans**: 1 plan (3 tasks)

**Payment Flow:**
1. User clicks Record Payment
2. Dialog pre-fills: suggested amount (monthly payment), current balance
3. User enters actual payment amount
4. System calculates: principal portion, interest portion, new balance
5. Shows: "This payment reduces your balance to $X. Payoff date: Y"
6. On save: creates payment record, updates balance, logs to trust accounting

**Edge Cases:**
- Extra payment → show accelerated payoff impact
- Partial payment → warn about potential penalties
- No interest rate → entire payment to principal
- Escrow → separate from principal/interest

**Tasks:**
1. Update payment dialog with auto-calculation display
2. Integrate payoff impact preview
3. Handle edge cases (extra payments, partial, etc.)

Plans:
- [x] 29-01: Payment recording integration

-->

---

<details>
<summary>✅ v5.0 Developer Experience & Observability (Phases 30-35) - SHIPPED 2026-01-16</summary>

**Milestone Goal:** Add modern DX packages for URL state, charts, virtualization, command palette, and error monitoring.

- [x] Phase 30: nuqs URL State Management (1/1 plan) - completed 2026-01-16
- [x] Phase 31: dinero.js Money Calculations (1/1 plan) - completed 2026-01-16
- [x] Phase 32: recharts Dashboard Charts (1/1 plan) - completed 2026-01-16
- [x] Phase 33: @tanstack/react-virtual List Virtualization (1/1 plan) - completed 2026-01-16
- [x] Phase 34: cmdk Command Palette (1/1 plan) - completed 2026-01-16
- [x] Phase 35: @sentry/nextjs Error Monitoring (1/1 plan) - completed 2026-01-16

See [v5.0 Archive](milestones/v5.0-ROADMAP.md) for full details.

</details>

<!--
ARCHIVED: v5.0 Phase details moved to milestones/v5.0-ROADMAP.md

#### Phase 30: nuqs URL State Management
**Goal**: Replace useState with URL-based state for entity selection across all admin pages

**Depends on**: v2.0 complete

**Research**: Likely (nuqs Next.js 16 App Router patterns, searchParams handling)

**Research topics**: nuqs parseAsString patterns, shallow routing, server component compatibility

**Plans**: 1 plan (3 tasks)

**Tasks:**
1. Install nuqs, create useEntityFilter hook
2. Replace selectedEntity useState with useQueryState in all 9 admin pages
3. Test URL persistence, back button, shareable links

Plans:
- [x] 30-01: nuqs URL state integration (completed 2026-01-16)

---

#### Phase 31: dinero.js Money Calculations
**Goal**: Replace parseFloat() with dinero.js for precise currency math

**Depends on**: Phase 30

**Research**: Likely (dinero.js v2 API, USD currency setup)

**Research topics**: dinero.js v2 patterns, Drizzle string→dinero conversion, formatting

**Plans**: 1 plan (4 tasks)

**Tasks:**
1. Install dinero.js, create money utility functions
2. Update formatCurrency to use dinero
3. Replace all parseFloat calculations with dinero operations
4. Update summary cards and totals calculations

Plans:
- [x] 31-01: dinero.js money calculations (completed 2026-01-16)

---

#### Phase 32: recharts Dashboard Charts
**Goal**: Add visual charts to dashboard for asset allocation, distributions over time, liability progress

**Depends on**: Phase 31

**Research**: Unlikely (standard React charting patterns)

**Plans**: 1 plan (4 tasks)

**Tasks:**
1. Install recharts
2. Create AssetAllocationChart (pie chart by asset type)
3. Create DistributionTrendChart (line chart over time)
4. Create LiabilityProgressChart (stacked bar showing paid vs remaining)

Plans:
- [x] 32-01: Dashboard charts with recharts (completed 2026-01-16)

---

#### Phase 33: @tanstack/react-virtual List Virtualization
**Goal**: Virtualize large tables (accounting entries, activity log) for performance

**Depends on**: Phase 32

**Research**: Unlikely (@tanstack/react-virtual well-documented)

**Plans**: 1 plan (3 tasks)

**Tasks:**
1. Install @tanstack/react-virtual
2. Create VirtualizedTable component wrapping DataTable
3. Apply to accounting page and activity log

Plans:
- [x] 33-01: Virtual list implementation (completed 2026-01-16)

---

#### Phase 34: cmdk Command Palette
**Goal**: Add ⌘K command palette for quick navigation and actions

**Depends on**: Phase 33

**Research**: Unlikely (shadcn/ui cmdk component established)

**Plans**: 1 plan (4 tasks)

**Tasks:**
1. Add shadcn command component (bunx shadcn@latest add command)
2. Create CommandPalette with page navigation
3. Add entity quick-switch commands
4. Add keyboard shortcut (⌘K) to open palette

Plans:
- [x] 34-01: Command palette implementation (completed 2026-01-16)

---

#### Phase 35: @sentry/nextjs Error Monitoring
**Goal**: Add production error monitoring and performance tracking

**Depends on**: Phase 34

**Research**: Likely (Sentry Next.js 16 integration, App Router patterns)

**Research topics**: Sentry Next.js 16 setup, instrumentation.ts, error boundaries, performance monitoring

**Plans**: 1 plan (4 tasks)

**Tasks:**
1. Install @sentry/nextjs, run setup wizard
2. Configure sentry.client.config.ts and sentry.server.config.ts
3. Add error boundary integration
4. Test error capture in development

Plans:
- [x] 35-01: Sentry error monitoring setup (completed 2026-01-16)

-->

---

### 🔜 v6.0 React 19.2 Platform Optimizations (Pending v4.0 completion)

**Milestone Goal:** Leverage React 19.2 and Next.js 16 native features to eliminate dependencies, improve UX with optimistic updates, and enhance performance with intelligent caching.

**Why This Matters:**
- React 19.2 provides useOptimistic for instant UI feedback during mutations
- Next.js 16 after() can move audit logging out of the response path
- cacheLife/cacheTag provide fine-grained caching without manual invalidation
- These features are production-ready and can replace custom implementations

**Key Features:**
| Feature | React 19.2 / Next.js 16 | Current State | Improvement |
|---------|-------------------------|---------------|-------------|
| Optimistic Updates | `useOptimistic` | None | Instant UI feedback |
| Post-Response Tasks | `after()` | Inline audit logging | Non-blocking logging |
| Cache Management | `cacheLife`, `cacheTag`, `revalidateTag` | Manual invalidation | Automatic, tag-based |
| Form Actions | `useActionState` | Client-only mutations | Progressive enhancement |
| Ref Prop | No forwardRef needed | forwardRef wrappers | Simpler components |

---

#### Phase 36: useOptimistic for Mutations
**Goal**: Add optimistic UI updates to payment recording, HEMS approval, and task completion

**Depends on**: v4.0 complete

**Research**: Unlikely (documented in 26-RESEARCH.md)

**Plans**: 1 plan (4 tasks)

**Mutation Targets:**
| Mutation | Current UX | With useOptimistic |
|----------|------------|-------------------|
| Record payment | Loading spinner → update | Balance decreases instantly |
| Approve HEMS | Loading → status change | Status shows "Approved" instantly |
| Complete task | Loading → checkbox | Checkbox fills instantly |
| Update balance | Loading → new value | Value updates instantly |

**Tasks:**
1. Create useOptimisticMutation hook wrapper
2. Apply to liability payment recording
3. Apply to HEMS request approval flow
4. Apply to task completion toggle

Plans:
- [ ] 36-01: useOptimistic integration for mutations

---

#### Phase 37: after() for Audit Logging
**Goal**: Move audit logging (activityLog entries) to after() so responses aren't blocked

**Depends on**: Phase 36

**Research**: Unlikely (documented in 26-RESEARCH.md)

**Plans**: 1 plan (3 tasks)

**Current Flow:**
```
Request → Mutation → Audit Log → Response
                     ↑ blocking
```

**Target Flow:**
```
Request → Mutation → Response → Audit Log (background)
                               ↑ non-blocking via after()
```

**Tasks:**
1. Create auditLogAfter() utility wrapping after() + createActivityLog
2. Update tRPC mutation procedures to use after() for logging
3. Verify audit entries still capture request context (headers, user)

Plans:
- [ ] 37-01: after() for non-blocking audit logging

---

#### Phase 38: cacheLife Profiles for Data Fetching
**Goal**: Configure caching profiles for different data types (financial data, config, reference data)

**Depends on**: Phase 37

**Research**: Unlikely (documented in 26-RESEARCH.md)

**Plans**: 1 plan (4 tasks)

**Cache Profiles:**
| Profile | stale | revalidate | expire | Use Case |
|---------|-------|------------|--------|----------|
| `financial` | 60s | 5min | 1hr | Balances, transactions |
| `reference` | 1hr | 6hr | 24hr | Beneficiary list, trustees |
| `config` | 1day | 1week | 2weeks | Entity settings, fee schedules |

**Tasks:**
1. Add cacheLife profiles to next.config.ts
2. Enable cacheComponents: true
3. Apply 'use cache' + cacheLife() to tRPC queries
4. Test cache behavior and invalidation

Plans:
- [ ] 38-01: cacheLife profiles for data fetching

---

#### Phase 39: cacheTag for Smart Invalidation
**Goal**: Tag cached data and use revalidateTag() for precise cache invalidation on mutations

**Depends on**: Phase 38

**Research**: Unlikely (documented in 26-RESEARCH.md)

**Plans**: 1 plan (4 tasks)

**Tagging Strategy:**
| Data | Tag Pattern | Invalidate On |
|------|-------------|---------------|
| Beneficiaries | `beneficiaries-{entityId}` | Any beneficiary mutation |
| Liabilities | `liabilities-{entityId}` | Payment, balance update |
| Accounting | `accounting-{entityId}-{year}` | New entry, edit |
| Dashboard | `dashboard-{entityId}` | Any financial change |

**Tasks:**
1. Add cacheTag() to cached queries
2. Create revalidateEntityCache() utility
3. Call revalidateTag() in mutation procedures
4. Verify cache invalidation across related queries

Plans:
- [ ] 39-01: cacheTag for smart cache invalidation

---

#### Phase 40: Progressive Enhancement with useActionState
**Goal**: Add Server Actions with useActionState for form submissions that work without JS

**Depends on**: Phase 39

**Research**: Unlikely (documented in 26-RESEARCH.md)

**Plans**: 1 plan (3 tasks)

**Form Targets:**
- HEMS request submission (portal)
- Payment recording
- Quick task creation

**Benefits:**
- Forms work even if JS fails to load
- Built-in pending state management
- Server-side validation + error handling

**Tasks:**
1. Create Server Actions for key forms
2. Update forms to use useActionState + Next.js Form component
3. Maintain tRPC for complex mutations (keep both patterns)

Plans:
- [ ] 40-01: useActionState for progressive forms

---

## Progress

**Execution Order:**
- v2.0: 12 → 13 → 14 → 15 → 16 → 17
- v3.0: 18 → 19 → 20 → 21 → 22 → 23 → 24
- v4.0: 25 → 26 → 27 → 28 → 29
- v5.0: 30 → 31 → 32 → 33 → 34 → 35
- v6.0: 36 → 37 → 38 → 39 → 40

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Validation Schema Fix | v1.0 | 2/2 | ✅ Complete | 2026-01-09 |
| 2. Phase 3 Test Completion | v1.0 | 3/3 | ✅ Complete | 2026-01-09 |
| 3. Error Notification System | v1.0 | 3/3 | ✅ Complete | 2026-01-09 |
| 4. Component Extraction Patterns | v1.0 | 4/4 | ✅ Complete | 2026-01-09 |
| 5. Properties Page Refactor | v1.0 | 3/3 | ✅ Complete | 2026-01-09 |
| 6. Accounting Page Refactor | v1.0 | 3/3 | ✅ Complete | 2026-01-09 |
| 7. Liabilities & Accounts Refactor | v1.0 | 4/4 | ✅ Complete | 2026-01-09 |
| 8. Type Safety Improvements | v1.0 | 4/4 | ✅ Complete | 2026-01-09 |
| 9. Performance Optimization | v1.0 | 3/3 | ✅ Complete | 2026-01-09 |
| 10. TanStack Table & Form Integration | v1.0 | 7/7 | ✅ Complete | 2026-01-09 |
| 11. Quality Verification | v1.0 | 4/4 | ✅ Complete | 2026-01-09 |
| 12. Setup | v2.0 | 1/1 | ✅ Complete | 2026-01-15 |
| 13. tRPC Setup | v2.0 | 1/1 | ✅ Complete | 2026-01-15 |
| 14. Auth Migration | v2.0 | 1/1 | ✅ Complete | 2026-01-15 |
| 15. Page Migration | v2.0 | 1/1 | ✅ Complete | 2026-01-15 |
| 16. Testing & Verification | v2.0 | 1/1 | ✅ Complete | 2026-01-16 |
| 17. Cleanup | v2.0 | 1/1 | ✅ Complete | 2026-01-16 |
| 18. Timestamp Migration to TIMESTAMPTZ | v3.0 | 0/1 | Not started | - |
| 19. Enum Type Corrections | v3.0 | 0/1 | Not started | - |
| 20. Polymorphic Constraint Enforcement | v3.0 | 0/1 | Not started | - |
| 21. Composite Index Optimization | v3.0 | 0/1 | Not started | - |
| 22. Nullable FK Business Logic Review | v3.0 | 0/1 | Not started | - |
| 23. Primary Key Type Migration | v3.0 | 0/1 | Not started | - |
| 24. Table Naming Convention | v3.0 | 0/1 | Not started | - |
| 25. Loan Terms Schema & Calculation Engine | v4.0 | 3/3 | ✅ Complete | 2026-01-17 |
| 26. Type-Aware Liability Form | v4.0 | 1/1 | ✅ Complete | 2026-01-17 |
| 27. Bulk Entry Mode | v4.0 | 1/1 | ✅ Complete | 2026-01-17 |
| 28. Progress Visualization & Dashboard | v4.0 | 1/1 | ✅ Complete | 2026-01-17 |
| 29. Payment Recording Integration | v4.0 | 1/1 | ✅ Complete | 2026-01-17 |
| 30. nuqs URL State Management | v5.0 | 1/1 | ✅ Complete | 2026-01-16 |
| 31. dinero.js Money Calculations | v5.0 | 1/1 | ✅ Complete | 2026-01-16 |
| 32. recharts Dashboard Charts | v5.0 | 1/1 | ✅ Complete | 2026-01-16 |
| 33. @tanstack/react-virtual Lists | v5.0 | 1/1 | ✅ Complete | 2026-01-16 |
| 34. cmdk Command Palette | v5.0 | 1/1 | ✅ Complete | 2026-01-16 |
| 35. Sentry Error Monitoring | v5.0 | 1/1 | ✅ Complete | 2026-01-16 |
| 36. useOptimistic for Mutations | v6.0 | 0/1 | Not started | - |
| 37. after() for Audit Logging | v6.0 | 0/1 | Not started | - |
| 38. cacheLife Profiles | v6.0 | 0/1 | Not started | - |
| 39. cacheTag Smart Invalidation | v6.0 | 0/1 | Not started | - |
| 40. Progressive Enhancement | v6.0 | 0/1 | Not started | - |
