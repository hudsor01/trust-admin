# Trust Admin - Code Quality & Reliability

## What This Is

A trust administration application for managing the Hudson Living Trust (Texas Irrevocable Trust) with comprehensive CRUD operations for assets, liabilities, beneficiaries, and distributions. Currently undergoing systematic quality improvements to enhance reliability, error visibility, and code maintainability.

## Core Value

**Reliable trust administration** - The API works without silent failures, users see clear error messages, and the codebase is maintainable for ongoing development.

## Requirements

### Validated

<!-- Shipped and confirmed working (inferred from existing codebase) -->

- ✓ Trust entity management (31 database tables) — existing
- ✓ CRUD operations for 22 resource types via route factory — existing
- ✓ React SPA with inline editable cells for direct table editing — existing
- ✓ Magic link authentication for beneficiary portal — existing
- ✓ Texas Property Code compliance (principal vs income allocation) — existing
- ✓ Liability payment recording workflow (payment + balance update + expense entry) — existing
- ✓ HEMS request workflow (create → approve/deny) — existing
- ✓ Distribution calculator (share-based income distribution) — existing
- ✓ Trustee fee calculator (executor, asset, income, hourly fees) — existing
- ✓ Withdrawal eligibility tracking (age-based withdrawal rights) — existing
- ✓ Route factory pattern (eliminates 80% of endpoint boilerplate) — existing
- ✓ CRUD factory pattern (generates type-safe database operations) — existing

### Active

<!-- Current scope being built toward -->

- [ ] **CRITICAL:** Fix Zod validation schemas (id/updatedAt/createdAt must be optional in insertSchemas)
- [ ] Complete Phase 3 integration tests (liability payments, HEMS workflow)
- [ ] Add error notification UI (toast system for user feedback)
- [ ] Improve code maintainability (extract patterns from 1447-line components)
- [ ] Optional: Performance optimizations if blocking workflow (pagination, request deduplication)

### Out of Scope

<!-- Explicit boundaries -->

- Authentication/security improvements — Admin auth intentionally disabled for local development
- New feature development — Focus is quality of existing functionality, not adding capabilities
- Production deployment preparation — Still in development phase, not ready for production
- Heavy framework additions — Keep stack simple (Bun, React, PostgreSQL, Drizzle ORM)

## Context

**Critical Bug Discovered:**
- drizzle-zod v0.8.3 `createInsertSchema()` makes all fields required unless explicitly marked optional
- Auto-generated fields (id, createdAt, updatedAt) not marked optional in `db/validation.ts`
- **Impact:** All API POST endpoints return 400 validation errors, blocking resource creation
- **Blocks:** Phase 3 integration tests (5 tests failing), any CRUD operations via API

**Current Testing Status:**
- Unit tests: 101/101 passing (classification rules, fee calculator, distribution calculator)
- Integration tests: 5/5 failing (blocked by validation bug)
- Test files created: `tests/lib/classification-rules.test.ts`, `tests/lib/fee-calculator.test.ts`, `tests/lib/distribution-calculator.test.ts`

**Code Quality Issues (from CONCERNS.md):**
- Large components: Properties.tsx (1447 lines), Accounting.tsx (1226 lines), Liabilities.tsx (920 lines)
- Missing error notifications: Network errors fail silently, no user feedback
- Type safety gaps: Excessive `as any` in route factory and CRUD factory
- No pagination: All endpoints return full datasets (will degrade at scale)

**Architecture Context:**
- Full-stack monolith (single codebase for frontend + backend)
- Bun HTTP server on port 5050, React SPA on port 5173 (dev)
- PostgreSQL with Drizzle ORM (31 tables for trust administration)
- Route factory generates 110 endpoints from configuration object
- Magic link auth via Better Auth + Resend (portal only)

## Constraints

- **Tech Stack**: Bun runtime, React 19, Vite 7, PostgreSQL, Drizzle ORM — Keep simple, no heavy frameworks
- **No Breaking Changes**: Must preserve existing API contracts and database schema
- **Development Focus**: Local development environment, not production deployment
- **Database**: Seed script available (`bun run db:seed`) with Hudson Trust demo data

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Prioritize error visibility + maintainability over type safety | User experience and developer velocity more important than compile-time guarantees | — Pending |
| Fix validation bug first before other improvements | Blocks all API functionality and testing; must unblock immediately | — Pending |
| Use GSD workflow for systematic improvements | Provides structure and progress tracking for quality work | — Pending |
| Keep current tech stack (no React Query, no Redux) | Simplicity constraint - avoid adding heavy dependencies | — Pending |

---
*Last updated: 2026-01-09 after project initialization*
