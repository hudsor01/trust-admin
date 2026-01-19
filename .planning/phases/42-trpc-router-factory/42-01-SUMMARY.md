---
phase: 42-trpc-router-factory
plan: 01
subsystem: api
tags: [trpc, factory-pattern, code-consolidation]

requires:
  - phase: 40-quick-fixes
    provides: getAllArray method on CRUD factory

provides:
  - createCrudRouter factory function
  - 13 migrated routers using factory pattern

affects: [43-table-consolidation, 44-query-optimization, 45-admin-page-patterns]

tech-stack:
  added: []
  patterns: [tRPC router factory, generic type inference]

key-files:
  created: []
  modified:
    - src/server/trpc/index.ts
    - src/server/trpc/routers/artwork.ts
    - src/server/trpc/routers/bankAccount.ts
    - src/server/trpc/routers/contact.ts
    - src/server/trpc/routers/homestead.ts
    - src/server/trpc/routers/investmentAccount.ts
    - src/server/trpc/routers/liabilityPayment.ts
    - src/server/trpc/routers/personalProperty.ts
    - src/server/trpc/routers/rentalProperty.ts
    - src/server/trpc/routers/specificBequest.ts
    - src/server/trpc/routers/task.ts
    - src/server/trpc/routers/trustee.ts
    - src/server/trpc/routers/trusteeFeeSchedule.ts
    - src/server/trpc/routers/vehicle.ts

key-decisions:
  - "Factory uses generic type parameters for full type safety"
  - "Custom getById option for routers with relation queries"
  - "listFilterKey option for non-standard filter columns"

patterns-established:
  - "createCrudRouter: factory pattern for standard CRUD routers"

issues-created: []

duration: 8min
completed: 2026-01-18
---

# Phase 42 Plan 01: tRPC Router Factory Summary

**Created createCrudRouter factory and migrated 13 routers, eliminating ~350 lines (73% reduction)**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-18T19:15:00Z
- **Completed:** 2026-01-18T19:23:00Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments

- Created generic createCrudRouter factory with full type inference
- Migrated 13 simple routers to factory pattern
- Reduced average router from ~37 lines to ~10 lines

## Task Commits

1. **Task 1: Create createCrudRouter factory** - `53fb5dd` (feat)
2. **Task 2: Migrate 13 routers** - `dde440a` (refactor)

**Plan metadata:** (this commit)

## What Was Done

Created `createCrudRouter()` factory function in `src/server/trpc/index.ts` and migrated 13 simple tRPC routers to use it, eliminating significant boilerplate code.

### Task 1: Create createCrudRouter Factory Function

Added a generic factory function that creates standard CRUD routers with 5 procedures:
- `list` - Get all records with optional filter (defaults to `entityId`, configurable via `listFilterKey`)
- `byId` - Get single record by ID (supports custom getById for relation queries)
- `create` - Create new record with Zod validation
- `update` - Update record with Zod validation
- `delete` - Delete record by ID

**Key design decisions:**
- Factory uses generic type parameters `TModel`, `TInsert`, `TUpdate`, `TGetById` for full type safety
- Types are inferred from the CRUD instance passed in, preserving all TypeScript benefits
- Custom `getById` option allows routers with relation queries (joins) to override default behavior
- `listFilterKey` option supports non-standard filter columns (e.g., `liabilityId` for payments)

### Task 2: Migrate 13 Routers to Factory

**Pattern A - Simple routers (8 routers):**
- artwork, contact, task, trustee, trusteeFeeSchedule
- specificBequest, personalProperty, investmentAccount

**Pattern B - Custom getById routers (4 routers):**
- vehicle (uses getVehicleById with relations)
- bankAccount (uses getBankAccountById with relations)
- homestead (uses getHomesteadById with relations)
- rentalProperty (uses getRentalPropertyById with relations)

**Special case:**
- liabilityPayment uses `listFilterKey: 'liabilityId'` instead of default `entityId`

## Metrics

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Total lines (13 routers) | ~481 | ~130 | -351 lines |
| Average per router | ~37 | ~10 | -27 lines (73% reduction) |
| Boilerplate eliminated | - | - | 5 procedures x 13 routers = 65 procedure definitions |

## Files Changed

- `src/server/trpc/index.ts` - Added createCrudRouter factory (+75 lines)
- 13 router files in `src/server/trpc/routers/`:
  - artwork.ts, bankAccount.ts, contact.ts, homestead.ts
  - investmentAccount.ts, liabilityPayment.ts, personalProperty.ts
  - rentalProperty.ts, specificBequest.ts, task.ts
  - trustee.ts, trusteeFeeSchedule.ts, vehicle.ts

## Verification

- [x] `bun run typecheck` passes
- [x] `bun run build` succeeds
- [x] All 206 tests pass
- [x] Lint passes

## Commits

1. `53fb5dd` - feat(42-01): create createCrudRouter factory function
2. `dde440a` - refactor(42-01): migrate 13 routers to createCrudRouter factory

## Deviations from Plan

1. **investmentAccount reclassified**: Plan listed it as Pattern B (custom getById), but actual code showed it uses `investmentAccountCrud.getById` (no custom query). Migrated as Pattern A.

2. **Type system iteration**: Initial factory implementation used `Promise<unknown>` return types which lost type inference. Refactored to use proper generic constraints that preserve CRUD instance types through to tRPC output.

## Usage Pattern

```typescript
// Simple router (Pattern A)
export const artworkRouter = createCrudRouter({
    crud: artworkCrud,
    insertSchema: insertArtworkSchema,
    updateSchema: updateArtworkSchema,
})

// Custom getById router (Pattern B)
export const vehicleRouter = createCrudRouter({
    crud: vehicleCrud,
    insertSchema: insertVehicleSchema,
    updateSchema: updateVehicleSchema,
    getById: getVehicleById,
})

// Custom filter key
export const liabilityPaymentRouter = createCrudRouter({
    crud: liabilityPaymentCrud,
    insertSchema: insertLiabilityPaymentSchema,
    updateSchema: updateLiabilityPaymentSchema,
    listFilterKey: 'liabilityId',
})
```

## Next Steps

Phase 42-02 could extend the factory pattern or address remaining consolidation opportunities.
