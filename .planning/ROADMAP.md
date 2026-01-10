# Roadmap: Trust Admin Code Quality & Reliability

## Overview

Systematic quality improvements to the Trust Admin application, starting with a critical validation bug fix that blocks all API functionality, then completing test coverage for business logic workflows, adding error visibility for users, improving code maintainability through component refactoring, enhancing type safety, and optimizing performance. Each phase delivers incremental improvements while maintaining the simplicity constraint of the existing Bun/React/PostgreSQL stack.

## Domain Expertise

None (brownfield project with established patterns)

## Phases

**Phase Numbering:**
- Integer phases (1-10): Planned quality improvement work
- Decimal phases (X.1, X.2): Urgent insertions if needed (marked with INSERTED)

- [ ] **Phase 1: Validation Schema Fix** - Unblock all API POST endpoints
- [ ] **Phase 2: Phase 3 Test Completion** - Complete critical workflow integration tests
- [ ] **Phase 3: Error Notification System** - Add toast notifications for user feedback
- [ ] **Phase 4: Component Extraction Patterns** - Extract reusable dialog and card patterns
- [ ] **Phase 5: Properties Page Refactor** - Break down 1447-line component
- [ ] **Phase 6: Accounting Page Refactor** - Break down 1226-line component
- [ ] **Phase 7: Liabilities & Accounts Refactor** - Break down 920 and 903-line components
- [ ] **Phase 8: Type Safety Improvements** - Eliminate `as any` casts
- [ ] **Phase 9: Performance Optimization** - Add pagination and caching
- [ ] **Phase 10: TanStack Table & Form Integration** - Complete TanStack ecosystem adoption
- [ ] **Phase 11: Quality Verification** - Comprehensive testing and validation

## Phase Details

### Phase 1: Validation Schema Fix
**Goal**: Fix drizzle-zod schemas to make auto-generated fields optional, unblocking all API POST endpoints

**Depends on**: Nothing (critical blocker)

**Research**: Unlikely (drizzle-zod API is documented, pattern is clear)

**Plans**: 2 plans

Plans:
- [x] 01-01: Create schema wrapper utility to handle auto-generated fields
- [x] 01-02: Update all 31 table schemas and verify API endpoints

### Phase 2: Phase 3 Test Completion
**Goal**: Complete integration tests for liability payments, HEMS workflow, trustee fees, and distributions

**Depends on**: Phase 1 (API must work for integration tests)

**Research**: Unlikely (test patterns established, seeded data available)

**Plans**: 3 plans

Plans:
- [x] 02-01: Verify and fix liability payment workflow tests
- [x] 02-02: Verify and fix HEMS approval workflow tests
- [x] 02-03: Verify distribution calculator tests (34/34 passing, 100% coverage)

### Phase 3: Error Notification System
**Goal**: Add toast notification system so users see clear error messages instead of silent failures

**Depends on**: Phase 1 (needs working API to test error scenarios)

**Research**: Likely (choosing toast library, integration patterns)

**Research topics**: Sonner vs react-hot-toast for React 19, integration with existing error handling, styling with Tailwind

**Plans**: 3 plans

Plans:
- [x] 03-01: Install and configure toast library (Sonner)
- [x] 03-02: Create error notification hook and integrate with query factory
- [x] 03-03: Add error boundary for React component crashes

### Phase 4: Component Extraction Patterns
**Goal**: Extract reusable patterns (form dialogs, summary cards, data tables) to reduce duplication

**Depends on**: Nothing (can proceed in parallel with Phase 3)

**Research**: Unlikely (internal patterns, Radix UI already in use)

**Plans**: 4 plans

Plans:
- [x] 04-01: Extract generic ResourceDialog component with form state
- [x] 04-02: Extract SummaryCard component for metric displays
- [x] 04-03: Extract DataTable component with inline editing support
- [x] 04-04: Document component patterns and usage examples

### Phase 5: Properties Page Refactor
**Goal**: Break down Properties.tsx (1447 lines) using extracted patterns from Phase 4

**Depends on**: Phase 4 (needs extracted components)

**Research**: Unlikely (using established patterns from Phase 4)

**Plans**: 3 plans

Plans:
- [x] 05-01: Extract dialog components (replace manual dialogs with ResourceDialog and useResourceForm)
- [x] 05-02: Extract Rental Properties table (replace manual table with DataTable component)
- [x] 05-03: Verify functionality and update tests

### Phase 6: Accounting Page Refactor
**Goal**: Break down Accounting.tsx (1226 lines) using extracted patterns

**Depends on**: Phase 4 (needs extracted components)

**Research**: Unlikely (using established patterns from Phase 4)

**Plans**: 3 plans

Plans:
- [x] 06-01: Extract Accounting Dialog Component (ResourceDialog + useResourceForm)
- [x] 06-02: Replace Accounting Table with DataTable Component
- [ ] 06-03: Verify Accounting Page Refactor

### Phase 7: Liabilities & Accounts Refactor
**Goal**: Break down Liabilities.tsx (920 lines) and Accounts.tsx (903 lines) using patterns

**Depends on**: Phase 4 (needs extracted components)

**Research**: Unlikely (using established patterns from Phase 4)

**Plans**: 4 plans

Plans:
- [x] 07-01: Extract LiabilityDialog and PaymentDialog
- [x] 07-02: Extract LiabilityTable and refactor Liabilities page
- [x] 07-03: Extract AccountDialog and AccountTable
- [x] 07-04: Refactor Accounts page and verify both

### Phase 8: Type Safety Improvements
**Goal**: Eliminate `as any` casts in route factory and CRUD operations, improve TypeScript inference

**Depends on**: Phases 1-7 complete (avoid conflicts with ongoing refactors)

**Research**: Likely (Drizzle ORM generic constraints, conditional types)

**Research topics**: Drizzle TypeScript patterns for dynamic table operations, conditional type helpers, typed wrapper approaches

**Plans**: 4 plans

Plans:
- [x] 08-01: Create typed resource configuration interface
- [x] 08-02: Apply typed config to all resources
- [x] 08-03: Improve CRUD factory type inference
- [x] 08-04: Verify type safety and document patterns

### Phase 9: Performance Optimization
**Goal**: Add pagination to CRUD factory and implement request deduplication

**Depends on**: Phase 8 (type-safe pagination parameters)

**Research**: Unlikely (cursor pagination patterns well-established)

**Plans**: 3 plans

Plans:
- [x] 09-01: Add pagination support to CRUD factory (limit, offset, total count)
- [x] 09-02: Implement simple request deduplication in query hook
- [x] 09-03: Add pagination UI components to data tables

### Phase 10: TanStack Table & Form Integration
**Goal**: Complete integration with TanStack Table and TanStack Form for improved UI components

**Depends on**: Phases 1-9 complete (TanStack Query already integrated in Phase 8)

**Research**: Moderate (integration patterns completed in Plan 10-01)

**Plans**: 8 plans (split between Table and Form migrations)

**Current State**:
- **Tables**: 4 pages use DataTable, 12 pages use manual Table implementation
- **Forms**: 4 pages use ResourceDialog, 8+ pages use manual Dialog forms
- **TanStack Query**: ✅ Already integrated (Phase 8)

**Scope**:

**Part 1: TanStack Table Integration (Plans 10-01 to 10-05)**
- Install @tanstack/react-table
- Create TanStackTable wrapper (maintains shadcn/ui styling)
- Migrate DataTable component to use TanStack Table internally
- Migrate 12 manual table pages in 3 batches (simple → complex → workflow)
- Benefits: Built-in sorting, filtering, pagination, column resizing, virtual scrolling

**Part 2: TanStack Form Integration (Plans 10-06 to 10-08)**
- Install @tanstack/react-form
- Create FormField wrappers with Zod validation
- Update ResourceDialog to use TanStack Form
- Migrate all form pages in 2 batches
- Benefits: Type-safe forms, automatic validation, field-level errors, reduced boilerplate

Plans:
- [x] 10-01: Research and Strategy (audit current state, document patterns)
- [x] 10-02: TanStack Table Core Wrapper (create wrapper, migrate DataTable)
- [x] 10-03: Form Migration Batch 1 - Simple (Contacts, Vehicles)
- [x] 10-04: Table Migration Batch 2 - Partial (Bequests, HemsQueue)
- [x] 10-05: Table Migration Batch 3 - Complete (Dashboard - Settings deferred for row component refactor)
- [x] 10-06: ~~TanStack Form Core Setup~~ (SKIPPED - redundant, already done in Plan 10-02)
- [x] 10-07: Form Migration Batch 1 - ResourceDialog (COMPLETE: Accounting ✅, Accounts ✅, Liabilities ✅, Properties ✅)
- [x] 10-08: Form Migration Batch 2 - Manual Dialogs (COMPLETE: Contacts ✅, Vehicles ✅, Bequests ✅, Trustees ✅, Settings ✅, Distributions ✅)

**Note**: Phase 8 completed TanStack Query integration (data fetching). This phase completes the TanStack ecosystem adoption with Table and Form libraries. See `.planning/phases/10-tanstack-table-form-integration/OVERVIEW.md` for detailed migration strategy.

### Phase 11: Quality Verification
**Goal**: Comprehensive testing, documentation updates, and final validation

**Depends on**: Phases 1-10 complete

**Research**: Unlikely (validation and documentation)

**Plans**: 4 plans

Plans:
- [x] 11-01: Test Suite Verification & Coverage Analysis (verify all tests passing, document coverage)
- [x] 11-02: Refactor Distributions & Beneficiaries Pages (complete component pattern migration)
- [ ] 11-03: Update CONCERNS.md Documentation (mark resolved issues from Phases 1-11)
- [ ] 11-04: Create Handoff Documentation (accomplishments, next steps, production checklist)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Validation Schema Fix | 2/2 | ✅ Complete | 2026-01-09 |
| 2. Phase 3 Test Completion | 3/3 | ✅ Complete | 2026-01-09 |
| 3. Error Notification System | 3/3 | ✅ Complete | 2026-01-09 |
| 4. Component Extraction Patterns | 4/4 | ✅ Complete | 2026-01-09 |
| 5. Properties Page Refactor | 3/3 | ✅ Complete | 2026-01-09 |
| 6. Accounting Page Refactor | 3/3 | ✅ Complete | 2026-01-09 |
| 7. Liabilities & Accounts Refactor | 4/4 | ✅ Complete | 2026-01-09 |
| 8. Type Safety Improvements | 4/4 | ✅ Complete | 2026-01-09 |
| 9. Performance Optimization | 3/3 | ✅ Complete | 2026-01-09 |
| 10. TanStack Table & Form Integration | 7/8 | ✅ Complete | 2026-01-09 |
| 11. Quality Verification | 2/4 | 🔄 In Progress | - |
