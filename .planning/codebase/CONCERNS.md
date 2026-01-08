# Codebase Concerns

**Analysis Date:** 2026-01-08

## Tech Debt

**Excessive Type Casting (`as any`):**
- Issue: Multiple type safety escape hatches throughout codebase
- Files: `db/crud-factory.ts` (lines 37-96), `index.ts` (lines 265-425), `src/lib/form-factory.ts`
- Why: Drizzle ORM generic constraints require type assertions for dynamic table operations
- Impact: Reduces type safety in critical data handling paths; harder to refactor safely
- Fix approach: Use conditional types or improve Drizzle type definitions; consider creating typed wrappers

**Large Component Files (>800 lines):**
- Issue: Page components violate single-responsibility principle
- Files: `src/pages/Properties.tsx` (1447 lines), `src/pages/Accounting.tsx` (1226 lines), `src/pages/Liabilities.tsx` (920 lines), `src/pages/Accounts.tsx` (903 lines), `src/pages/Distributions.tsx` (854 lines), `src/pages/Beneficiaries.tsx` (852 lines)
- Why: Rapid prototyping prioritized speed over componentization
- Impact: Difficult to test, maintain, and reuse; high cognitive load
- Fix approach: Extract form dialogs, table components, and summary cards into separate files; create shared components for common patterns

**Manual Enum Type Casting:**
- Issue: String values must be manually cast to enum types
- File: `db/validation.ts` (lines 336-364)
- Example: `paymentMethod: (data.paymentMethod as "CHECK" | "ACH" | "WIRE") || null`
- Why: Zod validation doesn't automatically narrow to enum types
- Impact: Runtime type errors possible if invalid string passed
- Fix approach: Create Zod enum validators that automatically narrow types; use `z.enum()` instead of manual casting

**Missing Error Handling in UI:**
- Issue: Network errors silently fail; no user feedback
- Files: `src/hooks/use-query.ts` (line 78), all page components
- Why: Error state stored but not displayed to users
- Impact: Users don't see failed requests; appears broken without explanation
- Fix approach: Create global error notification system (toast library); display errors in UI components

## Known Bugs

**No Critical Bugs Detected**
- Codebase appears functionally stable
- No TODO/FIXME comments indicating known issues
- Integration tests passing (when server running)

## Security Considerations

**Authentication Bypass - CRITICAL:**
- Risk: Production endpoints accessible without authentication
- Files: `index.ts` (lines 831-886 - portal endpoints), `src/App.tsx` (lines 129-174 - admin dashboard)
- Current mitigation: TODO comments warning to restore before production
- Recommendations:
  - Uncomment authentication checks before any deployment
  - Add integration tests for auth-protected endpoints
  - Add middleware to verify session tokens on all `/api/portal/*` routes
  - Implement admin role check for admin dashboard access

**CORS Wildcard Origin:**
- Risk: Any domain can access API if credentials enabled
- File: `index.ts` (lines 467-472)
- Current mitigation: Defaults to requesting origin, falls back to `*`
- Recommendations: Whitelist specific origins in production; never use wildcard with credentials

**Hardcoded Localhost in Auth Config:**
- Risk: Production auth will fail with localhost trustedOrigins
- File: `src/lib/auth.ts` (line 21)
- Current mitigation: None
- Recommendations: Use environment variable for `trustedOrigins`; validate on startup

**Missing Environment Variable Validation:**
- Risk: Server starts without required configuration, fails at runtime
- Files: No startup validation detected
- Current mitigation: None
- Recommendations: Create startup validation script; fail fast if required env vars missing (`DATABASE_URL`, `BETTER_AUTH_SECRET`)

## Performance Bottlenecks

**No Pagination on Large Datasets:**
- Problem: All resources return full result sets
- Files: `db/crud-factory.ts` (`getAll()` method), page components with large tables
- Measurement: Not measured yet; will degrade with >1000 records
- Cause: No limit/offset parameters in CRUD factory
- Improvement path: Add pagination to `getAll()`, implement cursor-based pagination for better performance

**Potential N+1 Query Patterns:**
- Problem: No eager loading visible for relationships
- Files: `src/pages/Accounting.tsx`, `src/pages/Properties.tsx`
- Measurement: Not measured; depends on relationship depth
- Cause: CRUD factory doesn't use Drizzle relations for joined queries
- Improvement path: Use Drizzle `.with()` for eager loading; implement GraphQL/Relay-style data loading

**No Request Deduplication:**
- Problem: Multiple concurrent requests for same resource
- File: `src/hooks/use-query.ts` (lines 64-82)
- Measurement: Observable in Network tab when components mount in parallel
- Cause: No caching layer between hook instances
- Improvement path: Implement React Query or SWR for request deduplication and caching

## Fragile Areas

**Route Factory Type Safety:**
- Why fragile: All CRUD operations typed as `any` in route configuration
- File: `index.ts` (lines 265-425)
- Common failures: Type mismatches only caught at runtime
- Safe modification: Add runtime schema validation at route entry; don't rely on types alone
- Test coverage: Integration tests cover basic CRUD, but not all edge cases

**Database Constraint Reliance:**
- Why fragile: Validation comment states "database constraint will enforce validity" for polymorphic FK
- File: `index.ts` (line 683)
- Common failures: Client sends invalid assetType, database rejects with cryptic error
- Safe modification: Add whitelist validation before database insert
- Test coverage: No tests for asset type validation

## Scaling Limits

**Single Server Architecture:**
- Current capacity: Unknown; not load tested
- Limit: Single Bun process can't scale horizontally without session store
- Symptoms at limit: Request queueing, timeouts
- Scaling path: Add Redis for session storage; deploy multiple API instances behind load balancer

**In-Memory Session Storage:**
- Current capacity: Better Auth uses database for sessions (scalable)
- Limit: N/A - database-backed sessions scale horizontally
- Symptoms at limit: N/A
- Scaling path: Already scalable

## Dependencies at Risk

**No Obvious At-Risk Dependencies:**
- All major dependencies actively maintained
- Bun, React 19, Vite 7, Drizzle ORM have regular releases
- Better Auth 1.4.10 is recent (check for updates)

**Recommendation:** Run `bun outdated` regularly; monitor security advisories

## Missing Critical Features

**No Production Deployment Guide:**
- Problem: No documentation for production deployment
- Current workaround: Developers must infer from Dockerfile and docker-compose.yml
- Blocks: Production deployments without manual configuration
- Implementation complexity: Low (documentation task)

**No Admin Authentication:**
- Problem: Admin dashboard accessible without login
- Current workaround: TODO comments warn to restore before production
- Blocks: Cannot deploy admin interface securely
- Implementation complexity: Low (uncomment existing code, add tests)

**No Error Reporting Service:**
- Problem: Production errors invisible; only console logging
- Current workaround: Manual log inspection
- Blocks: Proactive error detection and debugging
- Implementation complexity: Medium (integrate Sentry or similar)

## Test Coverage Gaps

**Critical Workflows Untested:**
- What's not tested: Liability payment recording (creates payment + updates balance + creates expense entry), HEMS approval workflow, trustee fee calculations, principal vs income allocation
- Risk: Business logic bugs go undetected until production
- Priority: High
- Difficulty to test: Medium; requires test database with seeded data and multi-step assertions

**Authentication Flows Untested:**
- What's not tested: Magic link generation, token verification, session creation
- Risk: Auth system could break silently
- Priority: High (especially given current bypass)
- Difficulty to test: Medium; requires email mocking or Resend test mode

**Frontend Components Untested:**
- What's not tested: All React components, editable cells, form dialogs
- Risk: UI regressions on refactoring
- Priority: Medium
- Difficulty to test: Medium; requires React Testing Library setup

---

*Concerns audit: 2026-01-08*
*Update as issues are fixed or new ones discovered*
