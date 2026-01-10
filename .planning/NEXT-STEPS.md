# Trust Admin - Next Steps

**Milestone Status:** Quality Improvement COMPLETE ✅
**Current State:** Development-ready, NOT production-ready
**Last Updated:** 2026-01-09

---

## Production Readiness Checklist

**Before deploying to production, you MUST address these items:**

### 🔴 Critical (Must Fix)

1. **Enable Authentication**
   - File: `index.ts` (lines 831-886)
   - Action: Uncomment authentication checks on `/api/portal/*` routes
   - File: `src/App.tsx` (lines 129-174)
   - Action: Add admin role check, redirect unauthenticated users

2. **Configure CORS Properly**
   - File: `index.ts` (lines 467-472)
   - Action: Whitelist specific origins, never use wildcard with credentials
   - Example: `origin: process.env.ALLOWED_ORIGINS?.split(",") || []`

3. **Fix Hardcoded Localhost**
   - File: `src/lib/auth.ts` (line 21)
   - Action: Use environment variable for `trustedOrigins`
   - Add: `trustedOrigins: [process.env.APP_URL!]`

4. **Add Environment Variable Validation**
   - Location: Create `src/lib/env.ts`
   - Action: Validate required env vars on startup
   - Required vars: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `APP_URL`, `RESEND_API_KEY` (if email enabled)
   - Pattern: Fail fast if missing

5. **Test Authentication Flows**
   - Action: Add integration tests for magic link generation, token verification, session creation
   - Coverage gap: Auth system untested (high priority)

### 🟡 Important (Should Fix)

6. **Add Error Reporting Service**
   - Recommendation: Integrate Sentry or similar
   - Purpose: Proactive error detection in production
   - Complexity: Medium

7. **Create Production Deployment Guide**
   - Location: `docs/DEPLOYMENT.md`
   - Content: Environment variables, database migrations, server setup, monitoring
   - Complexity: Low (documentation)

8. **Review Session Security**
   - Current: Better Auth uses database sessions (scalable ✅)
   - Action: Verify session timeout, refresh logic, logout behavior
   - Test: Session fixation, CSRF protection

---

## Optional Enhancements

**Not required for production, but recommended for future milestones:**

### Performance

1. **Measure N+1 Query Patterns**
   - Tool: Drizzle query logging + performance profiler
   - Action: Identify N+1 queries, add eager loading with `.with()`
   - Priority: Medium (not critical at current scale)

2. **Add Cursor-Based Pagination**
   - Current: Offset pagination (Phase 9)
   - Enhancement: Cursor pagination for better performance at scale
   - Priority: Low (offset works fine for <10k records)

### Testing

3. **Set Up Frontend Component Tests**
   - Tool: React Testing Library + Bun test
   - Coverage: UI components, editable cells, form dialogs
   - Priority: Medium (UI regression protection)
   - Complexity: Medium

4. **Add E2E Tests**
   - Tool: Playwright or Cypress
   - Coverage: Complete user workflows (login → create → edit → delete)
   - Priority: Low (integration tests cover most workflows)
   - Complexity: High

### Code Quality

5. **Fix Manual Enum Type Casting**
   - File: `db/validation.ts` (lines 336-364)
   - Action: Use `z.enum()` instead of manual casting
   - Priority: Low (no runtime issues observed)
   - Complexity: Low

6. **Add API Documentation**
   - Tool: OpenAPI/Swagger or TypeDoc
   - Coverage: All 110 API endpoints
   - Priority: Low (internal API, not public)
   - Complexity: Medium

### Features

7. **Admin Authentication UI**
   - Current: Auth disabled for development
   - Enhancement: Add proper admin login page with magic link
   - Priority: High (required for production, see checklist)
   - Complexity: Low (copy portal login pattern)

8. **Audit Log Enhancements**
   - Current: Basic activity log exists
   - Enhancement: Add filtering, search, export
   - Priority: Low
   - Complexity: Medium

---

## Future Milestone Ideas

### Milestone 2: Production Deployment
- Address all production readiness checklist items
- Set up CI/CD pipeline
- Configure monitoring and alerting
- Load testing and performance tuning

### Milestone 3: Advanced Features
- Document upload/management
- Email notifications (distribution reminders, HEMS approval)
- Advanced reporting (tax forms, trustee fee summaries)
- Multi-entity support (manage multiple trusts)

### Milestone 4: Mobile Optimization
- Responsive design improvements
- Mobile-specific navigation
- Offline support (PWA)

---

## Maintenance Recommendations

### Regular Tasks

1. **Dependency Updates**
   - Run `bun outdated` monthly
   - Update dependencies quarterly
   - Monitor security advisories

2. **Test Maintenance**
   - Run full test suite before each deployment
   - Update tests when schemas change
   - Add tests for new features

3. **Code Quality Checks**
   - Review CONCERNS.md quarterly
   - Address deferred tech debt as capacity allows
   - Refactor when files exceed 800 lines

### Monitoring Production

1. **Error Tracking**
   - Monitor error rates (integrate Sentry)
   - Set alerts for critical errors
   - Review error logs weekly

2. **Performance Monitoring**
   - Track API response times
   - Monitor database query performance
   - Set up uptime monitoring

3. **User Feedback**
   - Collect user feedback on UX
   - Track feature usage
   - Prioritize improvements based on user needs

---

## Deferred Items (From CONCERNS.md)

**Tech Debt:**
- Manual enum type casting (low priority)

**Performance:**
- N+1 query patterns (not measured)

**Testing:**
- Frontend component tests (RTL not set up)
- Authentication flow tests (auth bypassed in dev)

**See:** `.planning/codebase/CONCERNS.md` for details

---

*For questions or clarification, refer to `.planning/ACCOMPLISHMENTS.md` or phase summaries in `.planning/phases/`*
