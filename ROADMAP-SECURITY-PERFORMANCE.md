# Trust Admin - Strategic Development & Production Roadmap

> Generated from comprehensive code review on 2026-01-05
> This document tracks security, performance, and quality improvements required for production readiness.

---

## Overview

| Phase | Status | Critical Items | Timeline |
|-------|--------|----------------|----------|
| **Development** | In Progress | Type safety, testing infrastructure, error handling | Ongoing |
| **Pre-Production** | Not Started | Authentication, validation, security hardening | 2-3 weeks |
| **Production** | Not Started | Monitoring, caching, performance optimization | 2-4 weeks |

---

## Phase 1: Development Environment (Continue Building Safely)

These items improve developer experience and code quality during active development.

### 1.1 Type Safety & Code Quality

- [ ] **Remove `any` types from crud-factory.ts** (9 instances)
  - File: `db/crud-factory.ts`
  - Impact: Restore Drizzle ORM type inference
  - Effort: 2-3 hours

- [ ] **Remove `any` types from route configs** (22 instances)
  - File: `index.ts` lines 119-228
  - Impact: Type-safe API handlers
  - Effort: 3-4 hours

- [ ] **Add React Error Boundaries**
  - Files: `src/main.tsx`, `src/App.tsx`
  - Impact: Graceful error handling, prevents full app crashes
  - Effort: 2-3 hours

- [ ] **Refactor large page components** (800+ lines each)
  - `src/pages/Dashboard.tsx` → extract TaskList, WithdrawalEligibility, AccountingSummary
  - `src/pages/Beneficiaries.tsx` → extract BeneficiaryTable, DistributionSummary
  - `src/pages/Properties.tsx` → extract PropertyList, PropertyForm
  - `src/pages/Accounting.tsx` → extract AccountingTable, ClassificationSummary
  - `src/pages/Liabilities.tsx` → extract LiabilityTable, PaymentHistory
  - Impact: Maintainability, testability, render performance
  - Effort: 2-3 days

- [ ] **Extract duplicate editable cell logic into hook**
  - File: `src/components/editable-cells.tsx`
  - Create: `src/hooks/use-editable-cell.ts`
  - Impact: DRY principle, easier maintenance
  - Effort: 2-3 hours

- [ ] **Standardize data fetching in Dashboard**
  - Current: 6 manual fetch() calls
  - Target: Use existing hook pattern or create useDashboard()
  - File: `src/pages/Dashboard.tsx` lines 127-136
  - Effort: 2-3 hours

### 1.2 Testing Infrastructure

- [ ] **Create test fixtures and helpers**
  - Create: `tests/fixtures/` directory
  - Add: Mock data generators for all entities
  - Effort: 3-4 hours

- [ ] **Test Texas Property Code 116 classification rules** (CRITICAL)
  - File: `src/lib/classification-rules.ts` (213 lines, 0% coverage)
  - Create: `tests/classification-rules.test.ts`
  - Coverage target: 100%
  - Effort: 4-6 hours

- [ ] **Test distribution calculator** (CRITICAL)
  - File: `src/lib/distribution-calculator.ts` (243 lines, 0% coverage)
  - Create: `tests/distribution-calculator.test.ts`
  - Coverage target: 100%
  - Effort: 4-6 hours

- [ ] **Test fee calculator** (CRITICAL)
  - File: `src/lib/fee-calculator.ts` (245 lines, 0% coverage)
  - Create: `tests/fee-calculator.test.ts`
  - Coverage target: 100%
  - Effort: 4-6 hours

- [ ] **Test withdrawal eligibility** (CRITICAL)
  - File: `src/lib/withdrawal-eligibility.ts` (332 lines, 0% coverage)
  - Create: `tests/withdrawal-eligibility.test.ts`
  - Coverage target: 100%
  - Effort: 4-6 hours

- [ ] **Add CRUD operation tests**
  - File: `tests/api.test.ts` (currently only GET tests)
  - Add: POST, PUT, DELETE tests for all resources
  - Coverage target: 80%
  - Effort: 1-2 days

### 1.3 Documentation

- [ ] **Create TESTING.md**
  - How to run tests
  - Test naming conventions
  - Fixture patterns
  - Coverage requirements
  - Effort: 2-3 hours

- [ ] **Create API.md**
  - Document all 22 CRUD endpoints
  - Document special endpoints (record-payment, approve, deny)
  - Request/response schemas
  - Error formats
  - Effort: 4-6 hours

- [ ] **Add JSDoc comments to exported functions**
  - Priority files: `db/queries.ts`, `src/lib/*.ts`
  - Effort: 3-4 hours

---

## Phase 2: Pre-Production (Security & Stability)

**BLOCKING: These items MUST be completed before any production deployment.**

### 2.1 Authentication & Authorization (CRITICAL)

- [ ] **Add API authentication middleware**
  - File: `index.ts`
  - Verify Better Auth session on all `/api/*` routes (except `/api/auth/*`)
  - Return 401 for unauthenticated requests
  - Effort: 4-6 hours
  ```typescript
  // Add before route handling
  if (path.startsWith("/api/") && !path.startsWith("/api/auth")) {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return json({ error: "Unauthorized" }, 401);
    }
  }
  ```

- [ ] **Implement role-based access control (RBAC)**
  - Admin role: Full CRUD access
  - Beneficiary role: Read-only access to own data
  - File: `index.ts`, `src/lib/auth.ts`
  - Effort: 6-8 hours

- [ ] **Fix HEMS request authorization**
  - File: `index.ts` lines 371-408
  - Verify user has permission to approve/deny
  - Prevent self-approval
  - Effort: 2-3 hours

- [ ] **Add entity-level authorization**
  - Users should only access entities they're authorized for
  - Add `entityId` checks to all filtered queries
  - Effort: 4-6 hours

### 2.2 Input Validation (CRITICAL)

- [ ] **Apply Zod validation to all POST endpoints**
  - Schemas exist in `db/validation.ts` but are UNUSED
  - Add validation in `createRouteHandlers()` function
  - File: `index.ts` lines 88-91
  - Effort: 3-4 hours
  ```typescript
  async handleCreate(req: Request) {
    const data = await req.json();
    const validated = schema.parse(data);  // ADD THIS
    const item = await crud.create(validated);
    return json(item, 201);
  }
  ```

- [ ] **Apply Zod validation to all PUT endpoints**
  - File: `index.ts` lines 100-104
  - Effort: 2-3 hours

- [ ] **Add request body size limits**
  - Prevent DoS via large payloads
  - Effort: 1 hour

### 2.3 Security Hardening

- [ ] **Configure CORS whitelist for production**
  - Current: Allows any origin (`req.headers.get("Origin") || "*"`)
  - File: `index.ts` line 264
  - Create environment-based whitelist
  - Effort: 1-2 hours

- [ ] **Add rate limiting**
  - Prevent brute force and DoS attacks
  - Recommended: 100 requests/minute per IP for API
  - File: `index.ts`
  - Effort: 3-4 hours

- [ ] **Redact sensitive data from activity logs**
  - Current: Full record values stored including SSNs, account numbers
  - File: Activity log trigger or application code
  - Redact: taxId, accountNumber, routingNumber
  - Effort: 2-3 hours

- [ ] **Add security headers**
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - Strict-Transport-Security (HTTPS only)
  - Content-Security-Policy
  - Effort: 1-2 hours

- [ ] **Encrypt sensitive fields at rest**
  - Fields: bankAccount.accountNumber, bankAccount.routingNumber
  - Consider: beneficiary.taxId
  - Effort: 4-6 hours

### 2.4 Database Integrity

- [ ] **Add database indexes for performance**
  - `beneficiary.entityId`
  - `distribution.beneficiaryId`
  - `trustAccounting.entityId`
  - `hemsRequest.status`
  - `hemsRequest.beneficiaryId`
  - `liabilityPayment.liabilityId`
  - Create migration file
  - Effort: 1-2 hours

- [ ] **Wrap multi-operation queries in transactions**
  - `recordLiabilityPayment` - 3 operations need atomicity
  - `approveHemsRequest` - status update + distribution creation
  - File: `db/queries.ts`, `index.ts`
  - Effort: 3-4 hours

- [ ] **Add database connection pooling config**
  - Configure max connections
  - Set idle timeout
  - File: `db/index.ts`
  - Effort: 1-2 hours

### 2.5 Error Handling

- [ ] **Implement structured error responses**
  - Current: Generic 500 errors
  - Add: Validation errors (400), Auth errors (401/403), Not found (404)
  - File: `index.ts`
  - Effort: 3-4 hours

- [ ] **Add request logging**
  - Log: timestamp, method, path, status, duration
  - Use existing logger from `src/lib/logger.ts`
  - Effort: 2-3 hours

- [ ] **Environment variable validation at startup**
  - Validate required env vars before server starts
  - Clear error messages for missing config
  - Effort: 1-2 hours

---

## Phase 3: Production Optimization (Scale & Performance)

These items optimize for production load and user experience.

### 3.1 Performance - Database

- [ ] **Fix N+1 query in Beneficiaries page**
  - Current: 1 query + N distribution queries
  - Create: `getBeneficiariesWithDistributions()` using Drizzle relations
  - File: `db/queries.ts`, `src/pages/Beneficiaries.tsx`
  - Impact: 90% reduction in queries
  - Effort: 3-4 hours

- [ ] **Create consolidated Dashboard API endpoint**
  - Current: 6 separate API calls
  - Create: `GET /api/dashboard` returning all dashboard data
  - Impact: 60-75% faster dashboard load
  - Effort: 4-6 hours

- [ ] **Add pagination to list endpoints**
  - Modify CRUD factory to support limit/offset
  - Update all list endpoints
  - Effort: 6-8 hours

- [ ] **Add database query result caching**
  - In-memory cache for frequently accessed data
  - TTL: 60 seconds for lists, 5 minutes for static data
  - Effort: 4-6 hours

### 3.2 Performance - Frontend

- [ ] **Implement code splitting**
  - Use React.lazy() for all page components
  - File: `src/App.tsx`
  - Impact: 75% reduction in initial bundle (1.2MB → 300KB)
  - Effort: 3-4 hours
  ```tsx
  const Dashboard = lazy(() => import('./pages/Dashboard'));
  const Beneficiaries = lazy(() => import('./pages/Beneficiaries'));
  ```

- [ ] **Add HTTP caching headers**
  - Cache-Control headers based on resource type
  - ETag support for conditional requests
  - File: `index.ts` json() helper
  - Effort: 2-3 hours

- [ ] **Implement React Query or SWR**
  - Replace custom use-query.ts with battle-tested solution
  - Benefits: Caching, deduplication, stale-while-revalidate
  - Effort: 1-2 days

- [ ] **Add virtualization for large lists**
  - Use @tanstack/react-virtual for tables with 100+ rows
  - Priority pages: Beneficiaries, Accounting, Activity Log
  - Effort: 4-6 hours

### 3.3 Production Infrastructure

- [ ] **Create DEPLOYMENT.md**
  - Environment variable requirements
  - Database migration strategy
  - Backup/restore procedures
  - Monitoring setup
  - Effort: 3-4 hours

- [ ] **Add health check endpoint**
  - `GET /health` returning database connectivity status
  - For load balancer health checks
  - Effort: 1 hour

- [ ] **Add response compression**
  - gzip/brotli for API responses
  - Effort: 1-2 hours

- [ ] **Configure production logging**
  - Structured JSON logs
  - Log levels by environment
  - Error aggregation service integration
  - Effort: 3-4 hours

- [ ] **Add application metrics**
  - Request count, latency percentiles
  - Database query performance
  - Error rates
  - Effort: 4-6 hours

### 3.4 Monitoring & Observability

- [ ] **Set up error tracking** (e.g., Sentry)
  - Frontend error capture
  - Backend error capture with context
  - Effort: 2-3 hours

- [ ] **Add performance monitoring**
  - Core Web Vitals tracking
  - API latency monitoring
  - Effort: 3-4 hours

- [ ] **Create operational runbook**
  - Common issues and resolutions
  - Escalation procedures
  - Backup verification
  - Effort: 3-4 hours

---

## Progress Tracking

### Phase 1: Development
- Total items: 17
- Completed: 0
- In Progress: 0
- Blocked: 0

### Phase 2: Pre-Production
- Total items: 18
- Completed: 0
- In Progress: 0
- Blocked: 0

### Phase 3: Production
- Total items: 15
- Completed: 0
- In Progress: 0
- Blocked: 0

---

## Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data breach via unauth API | HIGH | CRITICAL | Phase 2.1 - Add authentication |
| SQL injection | MEDIUM | CRITICAL | Phase 2.2 - Input validation |
| Incorrect distributions | MEDIUM | HIGH | Phase 1.2 - Business logic tests |
| Performance degradation at scale | HIGH | MEDIUM | Phase 3.1 - Database optimization |
| App crash on error | MEDIUM | MEDIUM | Phase 1.1 - Error boundaries |

---

## Definition of Done

### For Development Phase
- [ ] All `any` types removed
- [ ] Business logic test coverage > 95%
- [ ] Error boundaries implemented
- [ ] Documentation complete

### For Pre-Production Phase
- [ ] All API routes authenticated
- [ ] All inputs validated
- [ ] Security headers configured
- [ ] Rate limiting active
- [ ] Database indexes created
- [ ] Transactions wrapping multi-op queries

### For Production Phase
- [ ] Initial bundle < 400KB
- [ ] Dashboard load < 1 second
- [ ] Beneficiaries load < 500ms (any count)
- [ ] Error tracking configured
- [ ] Monitoring dashboards created
- [ ] Runbook documented

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-01-05 | Initial roadmap created from comprehensive review | Claude |

