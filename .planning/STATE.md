# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-09)

**Core value:** Reliable trust administration - The API works without silent failures, users see clear error messages, and the codebase is maintainable for ongoing development.

**Current focus:** Phase 16 — Testing & Verification (v2.0 Next.js + tRPC Migration)

## Current Position

Phase: 16 of 17 (Testing & Verification)
Plan: 16-01 complete, awaiting CRUD verification
Status: Migration verified - build passes, typecheck clean, 174/177 tests pass
Last activity: 2026-01-15 - Fixed residual Vite/Sentry references in lib files

Progress: ████████████████████░░░░ 94% (16/17 phases complete, Phase 16 in progress)

## Performance Metrics

**Velocity:**
- v1.0 plans completed: 41
- v2.0 plans completed: 4

## Accumulated Context

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

Last session: 2026-01-15
Stopped at: Phase 15 complete - Ready to execute Phase 16 (Testing & Verification)
Note: All pages migrated to Next.js App Router with tRPC. Phase 16 will verify functionality.

## Milestone History

| Milestone | Phases | Plans | Status | Shipped |
|-----------|--------|-------|--------|---------|
| v1.0 Code Quality & Reliability | 1-11 | 41 | ✅ Complete | 2026-01-09 |
| v2.0 Next.js + tRPC Migration | 12-17 | 6 | 🚧 In Progress | - |
| v3.0 Database Schema Improvements | 18-24 | 7 | 🔜 Pending v2.0 | - |
| v4.0 Smart Liability Management | 25-29 | 5 | 🔜 Pending v2.0 | - |
| v5.0 Developer Experience & Observability | 30-35 | 6 | 🔜 Pending v2.0 | - |
