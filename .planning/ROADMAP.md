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
- [ ] **Phase 10: Quality Verification** - Comprehensive testing and validation

## Phase Details

### Phase 1: Validation Schema Fix
**Goal**: Fix drizzle-zod schemas to make auto-generated fields optional, unblocking all API POST endpoints

**Depends on**: Nothing (critical blocker)

**Research**: Unlikely (drizzle-zod API is documented, pattern is clear)

**Plans**: 2 plans

Plans:
- [x] 01-01: Create schema wrapper utility to handle auto-generated fields
- [ ] 01-02: Update all 31 table schemas and verify API endpoints

### Phase 2: Phase 3 Test Completion
**Goal**: Complete integration tests for liability payments, HEMS workflow, trustee fees, and distributions

**Depends on**: Phase 1 (API must work for integration tests)

**Research**: Unlikely (test patterns established, seeded data available)

**Plans**: 3 plans

Plans:
- [ ] 02-01: Verify and fix liability payment workflow tests
- [ ] 02-02: Verify and fix HEMS approval workflow tests
- [ ] 02-03: Add distribution calculator integration tests

### Phase 3: Error Notification System
**Goal**: Add toast notification system so users see clear error messages instead of silent failures

**Depends on**: Phase 1 (needs working API to test error scenarios)

**Research**: Likely (choosing toast library, integration patterns)

**Research topics**: Sonner vs react-hot-toast for React 19, integration with existing error handling, styling with Tailwind

**Plans**: 3 plans

Plans:
- [ ] 03-01: Install and configure toast library (Sonner)
- [ ] 03-02: Create error notification hook and integrate with query factory
- [ ] 03-03: Add error boundary for React component crashes

### Phase 4: Component Extraction Patterns
**Goal**: Extract reusable patterns (form dialogs, summary cards, data tables) to reduce duplication

**Depends on**: Nothing (can proceed in parallel with Phase 3)

**Research**: Unlikely (internal patterns, Radix UI already in use)

**Plans**: 4 plans

Plans:
- [ ] 04-01: Extract generic ResourceDialog component with form state
- [ ] 04-02: Extract SummaryCard component for metric displays
- [ ] 04-03: Extract DataTable component with inline editing support
- [ ] 04-04: Document component patterns and usage examples

### Phase 5: Properties Page Refactor
**Goal**: Break down Properties.tsx (1447 lines) using extracted patterns from Phase 4

**Depends on**: Phase 4 (needs extracted components)

**Research**: Unlikely (using established patterns from Phase 4)

**Plans**: 3 plans

Plans:
- [ ] 05-01: Extract PropertyDialog and PropertyTable components
- [ ] 05-02: Extract PropertySummaryCards and refactor main page
- [ ] 05-03: Verify functionality and update tests

### Phase 6: Accounting Page Refactor
**Goal**: Break down Accounting.tsx (1226 lines) using extracted patterns

**Depends on**: Phase 4 (needs extracted components)

**Research**: Unlikely (using established patterns from Phase 4)

**Plans**: 3 plans

Plans:
- [ ] 06-01: Extract AccountingDialog and AccountingFilters
- [ ] 06-02: Extract AccountingTable and refactor main page
- [ ] 06-03: Verify functionality and update tests

### Phase 7: Liabilities & Accounts Refactor
**Goal**: Break down Liabilities.tsx (920 lines) and Accounts.tsx (903 lines) using patterns

**Depends on**: Phase 4 (needs extracted components)

**Research**: Unlikely (using established patterns from Phase 4)

**Plans**: 4 plans

Plans:
- [ ] 07-01: Extract LiabilityDialog and PaymentDialog
- [ ] 07-02: Extract LiabilityTable and refactor Liabilities page
- [ ] 07-03: Extract AccountDialog and AccountTable
- [ ] 07-04: Refactor Accounts page and verify both

### Phase 8: Type Safety Improvements
**Goal**: Eliminate `as any` casts in route factory and CRUD operations, improve TypeScript inference

**Depends on**: Phases 1-7 complete (avoid conflicts with ongoing refactors)

**Research**: Likely (Drizzle ORM generic constraints, conditional types)

**Research topics**: Drizzle TypeScript patterns for dynamic table operations, conditional type helpers, typed wrapper approaches

**Plans**: 4 plans

Plans:
- [ ] 08-01: Create typed resource configuration interface
- [ ] 08-02: Improve CRUD factory type inference with conditional types
- [ ] 08-03: Replace `as any` in route factory with proper generics
- [ ] 08-04: Add compile-time validation and verify no regressions

### Phase 9: Performance Optimization
**Goal**: Add pagination to CRUD factory and implement request deduplication

**Depends on**: Phase 8 (type-safe pagination parameters)

**Research**: Unlikely (cursor pagination patterns well-established)

**Plans**: 3 plans

Plans:
- [ ] 09-01: Add pagination support to CRUD factory (limit, offset, total count)
- [ ] 09-02: Implement simple request deduplication in query hook
- [ ] 09-03: Add pagination UI components to data tables

### Phase 10: Quality Verification
**Goal**: Comprehensive testing, documentation updates, and final validation

**Depends on**: Phases 1-9 complete

**Research**: Unlikely (validation and documentation)

**Plans**: 3 plans

Plans:
- [ ] 10-01: Run full test suite and fix any regressions
- [ ] 10-02: Update CONCERNS.md with resolved issues
- [ ] 10-03: Create handoff documentation for next milestone

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Validation Schema Fix | 0/2 | Not started | - |
| 2. Phase 3 Test Completion | 0/3 | Not started | - |
| 3. Error Notification System | 0/3 | Not started | - |
| 4. Component Extraction Patterns | 0/4 | Not started | - |
| 5. Properties Page Refactor | 0/3 | Not started | - |
| 6. Accounting Page Refactor | 0/3 | Not started | - |
| 7. Liabilities & Accounts Refactor | 0/4 | Not started | - |
| 8. Type Safety Improvements | 0/4 | Not started | - |
| 9. Performance Optimization | 0/3 | Not started | - |
| 10. Quality Verification | 0/3 | Not started | - |
