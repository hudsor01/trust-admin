# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-09)

**Core value:** Reliable trust administration - The API works without silent failures, users see clear error messages, and the codebase is maintainable for ongoing development.

**Current focus:** v7.0 Codebase Consolidation

## Current Position

Phase: 44 of 45 (Query Optimization)
Plan: 1 of 1 - COMPLETE
Status: Phase complete, ready for Phase 45
Last activity: 2026-01-18 - Completed 44-01-PLAN.md

Progress: ██████████████░░░░░░ 7/8 v7.0 plans

## Performance Metrics

**Velocity:**
- v1.0 plans completed: 41
- v2.0 plans completed: 4
- v3.0 plans completed: 7
- v6.0 plans completed: 4

## Accumulated Context

### v7.0 Phase 44 COMPLETE (Query Optimization):

**44-01 Completed (Query Optimization):**
- Fixed in-memory filtering in distribution router - queries now filter at database level
- Added `getDistributions(entityId?)` with optional entityId parameter
- Added `getDistributionsByBeneficiary(beneficiaryId)` for beneficiary portal
- Documented hemsRequest entityId filter tradeoff (intentional in-memory for small dataset)
- Added custom getById functions for investmentAccount, personalProperty, artwork
- Updated getHomesteadById to include transactions relation
- Commits: b48ef00, 0cfe03d, 14def18
- Pattern: Database-level filtering preferred; in-memory acceptable for small datasets with rare query paths

### v7.0 Phase 43 COMPLETE (Table Consolidation):

**43-01 Completed (Dead Code Removal):**
- Deleted `src/components/tanstack-table.tsx` (255 lines, 0 imports)
- Deleted `src/components/ui/data-table.tsx` (331 lines, 0 imports)
- Confirmed `data-table.tsx` is already TanStack-based (no migration needed)
- Commits: 2853e79, 3e0120e
- Impact: ~586 lines of dead code removed
- Pattern: Single table implementation = `data-table.tsx` + `virtualized-table.tsx`

### v7.0 Phase 42 COMPLETE (tRPC Router Factory):

**42-01 Completed (createCrudRouter Factory):**
- Created `createCrudRouter()` factory in `src/server/trpc/index.ts`
- Migrated 13 routers: artwork, contact, task, trustee, trusteeFeeSchedule, specificBequest, liabilityPayment, personalProperty, vehicle, bankAccount, homestead, investmentAccount, rentalProperty
- Factory provides 5 standard procedures: list, byId, create, update, delete
- Supports custom getById for relation queries and custom listFilterKey
- Commits: 53fb5dd, dde440a
- Impact: Reduced ~481 lines to ~130 lines (73% reduction)
- Pattern: `createCrudRouter({ crud, insertSchema, updateSchema, getById?, listFilterKey? })`

### v7.0 Phase 41 COMPLETE (Hook Extraction):

**41-03 Completed (useCrudMutations Hook):**
- ✅ Created `src/hooks/use-crud-mutations.ts` (48 lines)
- ✅ Migrated 3 pilot pages: contacts, bequests, vehicles
- ✅ Hook provides `{ create, update, delete }` with auto-invalidation
- ✅ Commits: b7651dd, dd2e9ff
- Pattern: `const { create, update, delete } = useCrudMutations('router')`
- Impact: Eliminates ~10 lines per page, standardizes mutation pattern

**41-02 Completed (LoginPage Component):**
- ✅ Created `src/components/login-page.tsx` (195 lines)
- ✅ Migrated admin and portal login pages to use shared component
- ✅ Each page reduced from ~175 lines to ~22 lines
- ✅ Commits: 10b0f45, 3e448d4
- Pattern: Configurable component with props for title, icon, redirectPath, callbackURL
- Impact: ~113 lines net savings, eliminated 308 lines of duplication

**41-01 Completed (useEditableCell Hook):**
- ✅ Created `src/hooks/use-editable-cell.ts` (118 lines)
- ✅ Migrated 5 editable cell components to use the hook
- ✅ EditableSelectCell intentionally kept separate (different pattern)
- ✅ Commits: d60b756, 3f51c4c
- Pattern: `formatForEdit` converts value→string, `parseFromEdit` converts string→value
- Pattern: Hook returns handlers (startEditing, handleSave, handleKeyDown) + state
- Decision: Use hook for text-based editable cells, keep select separate

### v7.0 Phase 40 COMPLETE (Quick Fixes):

**40-01 Completed (getAllArray Migration):**
- ✅ Migrated 23 tRPC routers to use getAllArray()
- ✅ Eliminated manual type guards: `Array.isArray(result) ? result : result.data`
- ✅ Verified AllocationClass imports from type-utils.ts
- ✅ Verified liability.ts uses centralized enum constants
- ✅ Commit: 046065a
- Pattern: `liabilityCrud.getAllArray(input?.entityId)` for list queries

### v6.0 Phase 39 COMPLETE (Progressive Enhancement):

**39-01 Completed (useActionState for HEMS Form):**
- ✅ Created Server Action `submitHemsRequest.ts` with Zod validation
- ✅ Refactored HemsRequestForm to use React 19 `useActionState`
- ✅ Form works before JS hydrates via native form submission
- ✅ Used hidden input to sync Radix Select with native form
- ✅ Commits: 3d9ea81, 99a49c1
- Pattern: Hidden input syncs Radix UI component values with native form submission
- Pattern: Server Action returns `{ error: string | null, success: boolean }` for useActionState
- Decision: Keep tRPC for admin operations, Server Action for beneficiary-facing form

### v6.0 Phase 38 COMPLETE (cacheLife Profiles):

**38-01 Completed (Caching Configuration):**
- ✅ Tuned TanStack Query staleTime from 5s to 30s for financial freshness balance
- ✅ Added gcTime of 10 minutes for navigation performance
- ✅ Documented cacheLife profiles (financial/reference/config tiers) for future server-side caching
- ⚠️ cacheComponents: true NOT enabled - incompatible with tRPC client-side architecture
- Commits: 7136640 (chore), fa6aecf (perf)
- Pattern: TanStack Query client-side caching preferred over server-side "use cache" for tRPC apps
- Decision: Document profiles for future Phase 39 adoption when architecture supports it

### v6.0 Phase 37 COMPLETE (after() for Audit Logging):

**37-01 Completed (Non-blocking Audit Logging):**
- ✅ Converted recordAuthEvent() to use after() from next/server
- ✅ Updated recordSignIn() to sync function
- ✅ Removed await from 3 caller sites in auth.ts and middleware.ts
- ✅ Commits: d5c2bf4, ec6c49f
- Pattern: `after(async () => { try { await db.insert() } catch { logger.error() } })`
- Decision: Fire-and-forget for audit logs - errors logged, not thrown

### v6.0 Phase 36 COMPLETE (useOptimistic for Mutations):

**36-01 Completed (useOptimistic Pattern for 3 Mutations):**
- ✅ Added useOptimistic to liability payment recording - instant balance decrease
- ✅ Added useOptimistic to HEMS request approval/denial - instant status badge change
- ✅ Added useOptimistic to task completion toggle - instant checkbox fill/unfill
- ✅ Commits: ce6c81f, 4955323, 9c0d702
- Pattern: `const [optimisticItems, setOptimistic] = useOptimistic(items, reducer)`
- Pattern: Call setOptimistic before mutateAsync for instant feedback
- Pattern: Use proper TypeScript types (e.g., `HemsRequest['status']`) for type safety
- Decision: Use useOptimistic directly, no wrapper hooks

### v3.0 Phase 24 COMPLETE (Table Naming Convention):

**24-01 Completed (Table Name Migration to snake_case):**
- ✅ Created `db/migrations/0001_rename_tables_to_snake_case.sql` with 27 ALTER TABLE RENAME statements
- ✅ Updated all 27 pgTable() names in schema.ts from PascalCase to snake_case
- ✅ Updated 62 FK constraint names in schema.ts to snake_case pattern
- ✅ Executed migration on Neon database via MCP
- ✅ Verified: TypeScript compiles, 206 tests pass, dev server starts
- Commits: 5f09823, 45c46bf, 242bf92
- Pattern: Table names use snake_case, TypeScript variables stay camelCase
- Decision: Better Auth tables (user, session, account, verification) unchanged

### v3.0 Phase 23 COMPLETE (PK Type Migration):

**23-01 Completed (BIGINT IDENTITY PKs):**
- ✅ Migrated 27 application tables from TEXT to BIGINT IDENTITY PKs
- ✅ Updated ~50 FK columns to `bigint({ mode: 'number' })` type
- ✅ Configured Better Auth with `database.generateId: false`
- ✅ Commit: 44d4a9c
- Pattern: `bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity()` for PKs

**23-02 Completed (Validation Layer):**
- ✅ Removed 27 id refinements from insert schemas
- ✅ Updated all tRPC router inputs to z.coerce.number() for IDs
- ✅ Commit: 924f0c8
- Pattern: z.coerce.number() handles string→number conversion for URL params

**23-03 Completed (Application Layer):**
- ✅ Updated db/queries.ts and db/crud-factory.ts for numeric IDs
- ✅ Updated db/seed-hudson-trust.ts with .returning() pattern
- ✅ Updated 15 admin pages with numeric ID types
- ✅ All TypeScript errors resolved (was 130, now 0)
- ✅ All tests pass (206 pass, 0 fail)
- ✅ Commit: c11c2b6
- Pattern: Select components need .toString() for entity IDs
- Decision: recordId in ActivityLog stays text (polymorphic to Better Auth tables)
- Decision: Better Auth tables (user, session) keep TEXT IDs

### v3.0 Phase 22 COMPLETE (Nullable FK Business Logic Review):

**22-01 Completed (bankAccountId FK on trustAccounting):**
- ✅ Added `bankAccountId` NOT NULL column to trustAccounting table
- ✅ Added FK constraint `TrustAccounting_bankAccountId_fkey` referencing bankAccount
- ✅ Added index `idx_trust_accounting_bank_account` for query performance
- ✅ Updated RecordPaymentData interface and convertIncomeToPrincipal function
- ✅ Added bank account selector to accounting entry form
- ✅ Added bank account selector to liability payment form
- ✅ Applied migration with `bun drizzle-kit push --force`
- ✅ Verified column, FK, and index exist; all 206 tests pass
- Pattern: Required FK addition requires schema, queries, tRPC schemas, and forms updates
- Decision: Keep sourceAssetType/sourceAssetId nullable (context), bankAccountId required (money flow)

### v3.0 Phase 21 COMPLETE (Composite Index Optimization):

**21-01 Completed (Composite Indexes for 3 Tables):**
- ✅ Added `idx_liability_payment_liability_date` on (liabilityId, paymentDate DESC)
- ✅ Added `idx_activity_log_table_record` on (tableName, recordId)
- ✅ Added `idx_hems_request_beneficiary_status` on (beneficiaryId, status)
- ✅ Applied migration with `bun drizzle-kit push --force`
- ✅ Verified indexes exist in pg_indexes, all 206 tests pass
- Pattern: Composite index for filter+sort query patterns

### v3.0 Phase 20 COMPLETE (Polymorphic Constraints):

**20-01 Completed (CHECK Constraints for Polymorphic Tables):**
- ✅ Added CHECK constraint to Valuation table (7 FK columns)
- ✅ Added CHECK constraint to Document table (8 FK columns)
- ✅ Added CHECK constraint to Transaction table (6 FK columns)
- ✅ Applied migration with `bun drizzle-kit push --force`
- ✅ Cleaned 6 orphaned Valuation records that violated constraint
- ✅ Verified constraints enforce exactly-one-FK rule
- Pattern: CASE WHEN counting for PostgreSQL CHECK constraints

### v3.0 Phase 19 COMPLETE (Enum Type Corrections):

**19-01 Completed (TEXT to pgEnum Conversion):**
- ✅ Defined 5 new pgEnums: accountingEntryType, incomeType, expenseType, personalPropertyCategory, documentType
- ✅ Converted 5 TEXT columns to use pgEnum types
- ✅ Added type aliases and type guard functions for all new enums
- ✅ Applied database migration via `bun drizzle-kit push --force`
- ✅ Fixed accounting page form types for enum compatibility
- Pattern: Expand enums to match actual UI usage (not minimal spec)
- Pattern: Use `as EnumType` casts in form payloads for Select components

### v4.0 Phase 29 COMPLETE (Payment Recording Integration):

**29-01 Completed (Payment Recording UX Enhancement):**
- ✅ Created `PaymentImpactPreview` component (~100 lines)
- ✅ Real-time principal/interest/escrow breakdown using `calculatePaymentSplit()`
- ✅ Estimated payoff date projection using `estimatePayoffDate()`
- ✅ Contextual warnings: yellow (partial), green (extra), red (negative principal)
- ✅ Enhanced post-save toast shows new balance
- ✅ Skips calculation preview for revolving credit (credit cards)
- Pattern: useDeferredValue + useMemo for smooth real-time calculation
- Pattern: Interest rate conversion - DB stores "6.5", calculations need "0.065"
- Pattern: 90% threshold for partial payment warning

### v4.0 Phase 28 COMPLETE (Progress Visualization):

**28-01 Completed (Liability Progress Visualization):**
- ✅ Created `src/components/liability-progress-card.tsx` (reusable progress card)
- ✅ Supports compact mode (for dashboard list) and full card mode
- ✅ Shows payment position, payoff date, monthly payment, interest rate
- ✅ Added Liabilities tab to Dashboard with summary statistics
- ✅ Added Progress column to Liabilities table with color-coded bars
- Pattern: Progress bar color coding (green >75%, yellow 25-75%, default <25%)
- Pattern: Progress calculation `(original - current) / original * 100`
- Uses amortization utilities from Phase 25 (estimatePayoffDate, getCurrentLoanPosition)

### v4.0 Phase 27 COMPLETE (Bulk Entry Mode):

**27-01 Completed (Spreadsheet-Style Bulk Entry):**
- ✅ Created `src/components/bulk-entry-table.tsx` (473 lines)
- ✅ `useFieldArray` for multi-row form state management
- ✅ Keyboard navigation: Tab cycles columns, Enter adds rows, Arrow keys move rows
- ✅ Excel/Google Sheets paste handling (tab-delimited)
- ✅ Type-aware column visibility (loan term fields for MORTGAGE/LOAN only)
- ✅ Per-row Zod validation with inline error display
- ✅ Added `bulkCreate` tRPC procedure for batch creation
- ✅ Integrated into liabilities page with mode toggle
- Pattern: `data-row`/`data-col` attributes for keyboard nav targeting
- Pattern: `clipboardData.getData('text/plain')` + tab split for paste

### v4.0 Phase 26 COMPLETE (Type-Aware Liability Form):

**26-01 Completed (Type-aware Form Enhancements):**
- ✅ Animated transitions for conditional form sections (200ms, opacity + max-height)
- ✅ PaymentPreview component showing estimated monthly payment and payoff date
- ✅ Uses useDeferredValue for smooth typing without calculation lag
- ✅ Inline validation with TanStack Form onBlur validators
- ✅ Creditor required, currentBalance required + valid + non-negative, interestRate valid + range warning
- Pattern: Always render wrapper, toggle visibility via CSS classes
- Pattern: useDeferredValue + useMemo for real-time calculation preview
- Pattern: TanStack Form validators prop with onBlur trigger

### v4.0 Phase 25 COMPLETE (Loan Terms Schema & Calculation Engine):

**25-03 Completed (Integration into Payment Recording):**
- ✅ Auto-calculation in `recordLiabilityPayment` using `calculatePaymentSplit()`
- ✅ Added `getPayoffProjection` tRPC procedure
- ✅ Smart conditional form fields (credit cards vs mortgages/loans)
- ✅ Moved allocation class from liability to payment level
- ✅ Sidebar active nav indicator (blue vertical bar)
- Pattern: Form fields adapt based on liability type
- Pattern: Payment-level allocation for trust accounting compliance

### v4.0 Phase 25-02 Completed (Amortization Calculation Utilities):
- ✅ Created `src/lib/amortization.ts` with 4 calculation functions:
  - `calculatePaymentSplit`: splits payment into principal/interest/escrow
  - `estimatePayoffDate`: projects loan payoff date
  - `calculateMonthlyPayment`: standard amortization formula
  - `getCurrentLoanPosition`: analyzes current loan lifecycle position
- ✅ Created 29 unit tests with comprehensive edge case coverage
- ✅ Replaced dinero.js with native Intl.NumberFormat in money.ts:
  - Zero external dependencies for money math
  - Pattern: toCents() → integer math → fromCents() → string storage
  - Intl.NumberFormat for locale-aware display
- ✅ Removed dinero.js dependency from package.json
- Pattern: Return null for impossible calculations (payment < interest)
- Pattern: Use strings for DB storage, integers for calculations

### v5.0 Phase 35 Completed (@sentry/nextjs Error Monitoring):
- ✅ Installed @sentry/nextjs v10.34.0
- ✅ Created `sentry.client.config.ts` (browser-side with replay)
- ✅ Created `sentry.server.config.ts` (Node.js server)
- ✅ Created `sentry.edge.config.ts` (edge runtime)
- ✅ Created `instrumentation.ts` with onRequestError handler
- ✅ Updated `instrumentation-client.ts` for client-side init
- ✅ Wrapped `next.config.ts` with withSentryConfig
- ✅ Created `src/app/global-error.tsx` (root error boundary)
- ✅ Created `src/app/(admin)/error.tsx` (admin error boundary)
- ✅ Added Sentry env vars to `.env.example`
- Pattern: Graceful degradation - runs without DSN configured (production only)
- Note: User configures Sentry project/DSN when ready

### v5.0 Phase 34 Completed (cmdk Command Palette):
- ✅ Installed shadcn command component (cmdk)
- ✅ Created `src/components/command-palette.tsx`:
  - 14 navigation items with fuzzy search keywords
  - Entity quick-switch via URL params
  - ⌘K / Ctrl+K keyboard shortcut
- ✅ Integrated into admin layout with visual hint
- Pattern: Keywords array enables fuzzy search discovery

### v5.0 Phase 33 Completed (@tanstack/react-virtual):
- ✅ Installed @tanstack/react-virtual v3.13.18
- ✅ Created `src/components/virtualized-table.tsx`:
  - Uses `useVirtualizer` to only render visible rows
  - Same interface as DataTable (drop-in replacement)
  - Configurable: `rowHeight`, `maxHeight`, `overscan`
- ✅ Activity log page now uses VirtualizedTable for large datasets
- ✅ Accounting page left with server-side pagination (optimal for financial data)
- Pattern: Use VirtualizedTable for 100+ rows, DataTable for smaller lists

### v5.0 Phase 32 Completed (recharts Dashboard Charts):
- ✅ Installed shadcn chart component (recharts wrapper)
- ✅ Created `src/components/charts/net-worth-chart.tsx`:
  - Donut chart showing assets (green) vs liabilities (red)
  - Center label displays calculated net worth
- ✅ Created `src/components/charts/asset-allocation-chart.tsx`:
  - Pie chart with percentage labels and legend
  - Categories: Bank Accounts, Investments, Real Estate, Vehicles
- ✅ Dashboard integration with 6 new tRPC queries for asset data
- ✅ Charts use dinero.js `sumStrings` for precise calculations
- ✅ Added biome.json override for chart.tsx (community best practice)
- Pattern: Charts placed BEFORE summary cards in dashboard layout

### v5.0 Phase 31 Completed (dinero.js Money Calculations):
- ✅ Installed dinero.js v2 alpha and @dinero.js/currencies
- ✅ Created `src/lib/money.ts` utility module:
  - `toDinero()`: Convert DB strings to Dinero objects
  - `sumStrings()`: Sum array of money strings with precision
  - `addMoney()`, `subtractMoney()`: Binary operations
  - `formatMoney()`: Display formatting with locale support
  - `isPositive()`, `isNegative()`, `isZero()`: Comparison helpers
- ✅ Updated `formatCurrency` to delegate to dinero.js
- ✅ Replaced parseFloat calculations in 9 component files
- ✅ All 174 tests pass, build succeeds
- Pattern: `sumStrings(items.map(x => x.amount))` for totals

### v5.0 Phase 30 Completed (nuqs URL State):
- ✅ Installed nuqs v2.8.6 (~6KB gzipped)
- ✅ Created `useEntityFilter` hook wrapping nuqs `useQueryState`
- ✅ Added NuqsAdapter to root layout
- ✅ Migrated all 11 admin pages from useState to URL-based entity selection
- ✅ Entity selection now persists in URL as `?entity=<id>`
- ✅ Verified: build passes, typecheck clean, no remaining selectedEntityOverride patterns
- Note: Full testing requires multiple entities (currently only 1 trust exists)

### v2.0 Phase 16 Progress (Testing & Verification):
- ✅ Build passes (22 routes)
- ✅ TypeScript compiles clean
- ✅ 174 tests pass, 3 skip, 0 fail
- ✅ Fixed env.ts SENTRY_DSN reference (removed from schema)
- ✅ Cleaned up src/env.d.ts (removed Vite types, SENTRY_DSN)
- ✅ Fixed admin layout missing auth check (caused infinite loading spinners)
- ⏳ Awaiting CRUD/workflow manual verification (Phase 16 Task 3)

### v2.0 Phase 17 Completed (Cleanup):
- ✅ Old files already removed (index.ts, vite.config.ts, src/pages/, src/App.tsx)
- ✅ package.json scripts already updated for Next.js
- ✅ neon_workflow.yml updated: Bun setup, db:push, build verification, schema diff comments
- ✅ ci.yml updated: Added Next.js build step with DATABASE_URL handling
- ✅ All GitHub Actions pinned to commit SHAs for security
- ✅ CLAUDE.md updated: tRPC patterns, new commands, current state

### Trust Audit Gap Features (Ad-hoc, outside GSD):
- ✅ Beneficiary death handling: `deceasedDate` field + `markDeceased` tRPC procedure
- ✅ Automatic share redistribution on beneficiary death (Section 7.01)
- ✅ Year-end income-to-principal conversion (Section 7.10(c))
- ✅ UI: "Mark as Deceased" button in beneficiary dialog
- ✅ UI: "Year-End Conversion" card in accounting page
- ✅ docs/trust-audit-gaps.md updated with completed implementations

### v2.0 Phase 15 Completed:
- ✅ All 15 admin pages migrated to App Router with tRPC
- ✅ Portal dashboard migrated to use `trpc.beneficiary.me.useQuery()`
- ✅ HemsRequestForm migrated to use `trpc.hemsRequest.submit.useMutation()`
- ✅ 24 tRPC routers created and merged in router.ts
- ✅ Root layout with TRPCProvider and Toaster
- ✅ Admin layout with sidebar
- ✅ Portal login page
- ✅ Build verified passing (22 routes)

### v2.0 Phase 14 Completed:
- ✅ auth.ts updated with nextCookies plugin (last in plugins array)
- ✅ Added localhost:3000 to trustedOrigins
- ✅ Auth route handler created (`src/app/api/auth/[...all]/route.ts`)
- ✅ proxy.ts created for route protection (`src/app/proxy.ts`)
- ✅ auth-client.ts updated for Next.js (removed baseURL, added "use client")
- ✅ Build verified passing

## Session Continuity

Last session: 2026-01-18
Stopped at: Completed Phase 44 (1 plan), ready for Phase 45
Resume file: None

## Milestone History

| Milestone | Phases | Plans | Status | Shipped |
|-----------|--------|-------|--------|---------|
| v1.0 Code Quality & Reliability | 1-11 | 41 | ✅ Complete | 2026-01-09 |
| v2.0 Next.js + tRPC Migration | 12-17 | 6 | ✅ Complete | 2026-01-16 |
| v3.0 Database Schema Improvements | 18-24 | 8 | ✅ Complete | 2026-01-18 |
| v4.0 Smart Liability Management | 25-29 | 7 | ✅ Complete | 2026-01-17 |
| v5.0 Developer Experience & Observability | 30-35 | 6 | ✅ Complete | 2026-01-16 |
| v6.0 React 19.2 Platform Optimizations | 36-39 | 4 | ✅ Complete | 2026-01-18 |
| v7.0 Codebase Consolidation | 40-45 | 7 | 🔄 In Progress (6/7) | - |
