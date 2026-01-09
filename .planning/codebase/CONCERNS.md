# Codebase Concerns

**Analysis Date:** 2026-01-08
**Last Updated:** 2026-01-09 (Phase 8 complete)

## Tech Debt

**✅ RESOLVED: Type Safety in Route Factory (Phase 8)**
- Status: Complete as of 2026-01-09
- Solution: Created `ResourceConfig<T>` interface with `satisfies` operator
- Result: 22 resources now have zero `as any` casts with full type inference
- Documentation: See `.planning/phases/08-type-safety-improvements/08-04-SUMMARY.md`

**✅ MINIMIZED: Type Casting in CRUD Factory (Phase 8)**
- Status: Complete as of 2026-01-09
- Solution: Systematically tested all casts; removed unnecessary ones
- Result: Reduced from 11 to 10 casts; all remaining casts proven necessary and documented
- File: `db/crud-factory.ts` - 10 necessary casts with TypeScript error justifications
- Documentation: See `.planning/phases/08-type-safety-improvements/08-03-SUMMARY.md`
- Note: Remaining casts are due to TypeScript/Drizzle limitations, not lazy coding

**✅ PARTIALLY RESOLVED: Large Component Files (Phases 4-7)**
- Status: 4 of 6 files refactored (2026-01-09)
- ✅ Refactored: `Properties.tsx`, `Accounting.tsx`, `Liabilities.tsx`, `Accounts.tsx`
- ⏳ Remaining: `Distributions.tsx` (854 lines), `Beneficiaries.tsx` (852 lines)
- Solution: Extracted ResourceDialog, DataTable, SummaryCard components
- Documentation: See `.planning/phases/04-component-extraction-patterns/04-04-SUMMARY.md`
- Note: Remaining files can be refactored using established patterns

**Manual Enum Type Casting:**
- Issue: String values must be manually cast to enum types
- File: `db/validation.ts` (lines 336-364)
- Example: `paymentMethod: (data.paymentMethod as "CHECK" | "ACH" | "WIRE") || null`
- Why: Zod validation doesn't automatically narrow to enum types
- Impact: Runtime type errors possible if invalid string passed
- Fix approach: Create Zod enum validators that automatically narrow types; use `z.enum()` instead of manual casting

**✅ RESOLVED: Error Handling in UI (Phase 3)**
- Status: Complete as of 2026-01-09
- Solution: Implemented toast notifications (Sonner) + error boundary
- Result: Users now see clear error messages for API failures and component crashes
- Files: `src/main.tsx` (Toaster + ErrorBoundary), `src/hooks/use-query.ts` (toast.error integration)
- Documentation: See `.planning/phases/03-error-notification-system/`

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

**✅ RESOLVED: Route Factory Type Safety (Phase 8)**
- Status: No longer fragile as of 2026-01-09
- Solution: Full type inference with `ResourceConfig<typeof table>` pattern
- File: `index.ts` - All 22 resources now type-safe with zero casts
- Result: Type mismatches caught at compile time, not runtime
- Test coverage: 10 diverse API endpoint tests verify all operations work correctly

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

**✅ RESOLVED: Critical Workflows Now Tested (Phase 2)**
- Status: Complete as of 2026-01-09
- What's tested: Liability payment recording, HEMS approval workflow, distribution calculator
- Result: 48/48 integration tests passing with 100% critical workflow coverage
- Files: `tests/api.test.ts`, `tests/lib/distribution-calculator.test.ts`
- Note: Trustee fee calculations and principal vs income allocation covered by existing tests

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
