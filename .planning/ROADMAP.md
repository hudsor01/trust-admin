# Roadmap: Trust Admin

## Overview

Trust Admin application development roadmap. v1.0 focused on code quality and reliability improvements to the existing React/Vite + Bun.serve() stack. v2.0 migrates to Next.js 16.1 + tRPC v11 for better type safety, developer experience, and scalability.

## Domain Expertise

- ~/.claude/plans/nextjs-trpc-migration.md (v2.0 migration reference - comprehensive context)

## Milestones

- ✅ **v1.0 Code Quality & Reliability** - Phases 1-11 (shipped 2026-01-09)
- 🚧 **v2.0 Next.js + tRPC Migration** - Phases 12-17 (in progress)
- 🔜 **v3.0 Database Schema Improvements** - Phases 18-24 (pending v2.0)

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

### 🚧 v2.0 Next.js + tRPC Migration (In Progress)

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

## Progress

**Execution Order:**
- v2.0: 12 → 13 → 14 → 15 → 16 → 17
- v3.0: 18 → 19 → 20 → 21 → 22 → 23 → 24

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
| 12. Setup | v2.0 | 0/1 | Not started | - |
| 13. tRPC Setup | v2.0 | 0/1 | Not started | - |
| 14. Auth Migration | v2.0 | 0/1 | Not started | - |
| 15. Page Migration | v2.0 | 0/1 | Not started | - |
| 16. Testing & Verification | v2.0 | 0/1 | Not started | - |
| 17. Cleanup | v2.0 | 0/1 | Not started | - |
| 18. Timestamp Migration to TIMESTAMPTZ | v3.0 | 0/1 | Not started | - |
| 19. Enum Type Corrections | v3.0 | 0/1 | Not started | - |
| 20. Polymorphic Constraint Enforcement | v3.0 | 0/1 | Not started | - |
| 21. Composite Index Optimization | v3.0 | 0/1 | Not started | - |
| 22. Nullable FK Business Logic Review | v3.0 | 0/1 | Not started | - |
| 23. Primary Key Type Migration | v3.0 | 0/1 | Not started | - |
| 24. Table Naming Convention | v3.0 | 0/1 | Not started | - |
