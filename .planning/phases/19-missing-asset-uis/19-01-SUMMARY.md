---
phase: 19-missing-asset-uis
plan: 01
subsystem: ui, api
tags: [trpc, react, drizzle, crud, admin-page, sidebar, form-factory]

# Dependency graph
requires:
  - phase: none
    provides: existing vehicle page pattern, db schema, validation schemas
provides:
  - artwork tRPC router (list/create/update/delete)
  - personalProperty tRPC router (list/create/update/delete)
  - insurancePolicy tRPC router (list/create/update/delete)
  - artworkFormDefaults, personalPropertyFormDefaults, insurancePolicyFormDefaults
  - PersonalPropertyCategory type and cast functions
  - sidebar links for all 3 new asset types
  - complete artwork admin CRUD page at /artwork
affects: [19-02-PLAN, 19-03-PLAN]

# Tech tracking
tech-stack:
  added: []
  patterns: [asset-router-pattern, asset-page-pattern]

key-files:
  created:
    - src/server/trpc/routers/artwork.ts
    - src/server/trpc/routers/personalProperty.ts
    - src/server/trpc/routers/insurancePolicy.ts
    - src/app/(admin)/artwork/page.tsx
    - src/app/(admin)/artwork/_components/ArtworkClient.tsx
    - src/app/(admin)/artwork/_components/ArtworkTable.tsx
    - src/app/(admin)/artwork/_components/ArtworkDialog.tsx
    - src/app/(admin)/artwork/loading.tsx
    - src/app/(admin)/artwork/error.tsx
  modified:
    - src/server/trpc/router.ts
    - src/lib/type-utils.ts
    - src/lib/form-factory.ts
    - src/components/app-sidebar.tsx

key-decisions:
  - "Replicated vehicle router pattern exactly for all three asset type routers"
  - "Sidebar links ordered: Properties, Accounts, Vehicles, Artwork, Personal Property, Insurance, Inventory Queue"

patterns-established:
  - "Asset router pattern: adminProcedure with entityId filter, updatedAt on write, NOT_FOUND on missing"
  - "Asset page pattern: HydrationBoundary + Client with useResourceForm + DataTable + ResourceDialog"

requirements-completed: [FEAT-01]

# Metrics
duration: 11min
completed: 2026-03-09
---

# Phase 19 Plan 01: Missing Asset UIs - Shared Infrastructure + Artwork Summary

**Three tRPC routers for artwork/personal-property/insurance, shared form defaults and type casts, sidebar navigation, and complete artwork CRUD page at /artwork**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-09T15:49:04Z
- **Completed:** 2026-03-09T16:00:57Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Created artwork, personalProperty, and insurancePolicy tRPC routers with full CRUD (list/create/update/delete), registered in appRouter
- Added PersonalPropertyCategory type, 3 type cast functions, and 3 form defaults to shared libraries
- Added Artwork, Personal Property, and Insurance sidebar links with prefetch-on-hover
- Built complete artwork admin page with DataTable (inline editable cells), create/edit dialog, delete confirmation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create three tRPC routers, register in appRouter, add form defaults and type cast functions** - `6892e9b` (feat)
2. **Task 2: Build artwork admin page with full CRUD** - `0bd7a70` (feat)

## Files Created/Modified
- `src/server/trpc/routers/artwork.ts` - Artwork CRUD router (list/create/update/delete)
- `src/server/trpc/routers/personalProperty.ts` - Personal property CRUD router
- `src/server/trpc/routers/insurancePolicy.ts` - Insurance policy CRUD router
- `src/server/trpc/router.ts` - Registered 3 new routers in Assets section
- `src/lib/type-utils.ts` - Added PersonalPropertyCategory type/values, 3 cast functions
- `src/lib/form-factory.ts` - Added artworkFormDefaults, personalPropertyFormDefaults, insurancePolicyFormDefaults
- `src/components/app-sidebar.tsx` - Added 3 asset links with prefetch
- `src/app/(admin)/artwork/page.tsx` - Server component with HydrationBoundary prefetch
- `src/app/(admin)/artwork/_components/ArtworkClient.tsx` - Full CRUD client with mutations + inline update
- `src/app/(admin)/artwork/_components/ArtworkTable.tsx` - DataTable with inline editable cells
- `src/app/(admin)/artwork/_components/ArtworkDialog.tsx` - Create/edit dialog with form sections
- `src/app/(admin)/artwork/loading.tsx` - Skeleton loading state
- `src/app/(admin)/artwork/error.tsx` - Sentry error boundary with retry

## Decisions Made
- Replicated the vehicle page pattern exactly for consistency across all asset pages
- Sidebar ordering places new links between Vehicles and Inventory Queue (alphabetical within new items)
- Biome import sorting enforced alphabetical order on router.ts imports

## Deviations from Plan

None - plan executed exactly as written.

## Deferred Items

- **Pre-existing build failure:** `src/app/forms/_actions/verifyAccess.ts` has "Server Actions must be async functions" error (from phase 16-02, commit 98b370f). Not related to this plan.
- **Pre-existing test failures:** 40 test failures in `bun test` (API route tests, DB connection issues). Not related to this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plans 02 and 03 can now build personal property and insurance pages using the same pattern
- All three tRPC routers are registered and ready for frontend consumption
- Form defaults and type casts are available for Plans 02 and 03

---
*Phase: 19-missing-asset-uis*
*Completed: 2026-03-09*
