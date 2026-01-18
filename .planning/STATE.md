# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-09)

**Core value:** Reliable trust administration - The API works without silent failures, users see clear error messages, and the codebase is maintainable for ongoing development.

**Current focus:** v3.0 Database Schema Improvements - Phase 18 (Timestamp Migration)

## Current Position

Phase: 18 of 40 (Timestamp Migration to TIMESTAMPTZ)
Plan: 01 complete
Status: Ready for Phase 19
Last activity: 2026-01-17 - Phase 18-01 completed (timestamp migration)

Progress: █████▌░░░░░░░░░░░░░ 1/7 v3.0 plans complete

## Performance Metrics

**Velocity:**
- v1.0 plans completed: 41
- v2.0 plans completed: 4

## Accumulated Context

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

Last session: 2026-01-17
Stopped at: Completed Phase 18-01 (timestamp migration to TIMESTAMPTZ)
Resume file: None

## Milestone History

| Milestone | Phases | Plans | Status | Shipped |
|-----------|--------|-------|--------|---------|
| v1.0 Code Quality & Reliability | 1-11 | 41 | ✅ Complete | 2026-01-09 |
| v2.0 Next.js + tRPC Migration | 12-17 | 6 | ✅ Complete | 2026-01-16 |
| v3.0 Database Schema Improvements | 18-24 | 7 | 🚧 In Progress | - |
| v4.0 Smart Liability Management | 25-29 | 7 | ✅ Complete | 2026-01-17 |
| v5.0 Developer Experience & Observability | 30-35 | 6 | ✅ Complete | 2026-01-16 |
| v6.0 React 19.2 Platform Optimizations | 36-40 | 5 | 🔜 Pending | - |
| v7.0 Codebase Consolidation | 41-46 | 6 | 📋 Planned | - |
