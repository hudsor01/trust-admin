# Phase 30 Plan 01: nuqs URL State Integration Summary

**Replaced useState with URL-based entity selection across all 11 admin pages using nuqs.**

## Accomplishments

- Installed nuqs v2.8.6 (~6KB gzipped) for type-safe URL state management
- Created `useEntityFilter` hook wrapping nuqs `useQueryState`
- Migrated all 11 admin pages from `useState` to URL-based entity filtering
- Entity selection now persists in URL as `?entity=<id>`

## Files Created/Modified

- `src/hooks/use-entity-filter.ts` - Created: custom hook for entity URL state
- `src/app/layout.tsx` - Added NuqsAdapter wrapper around TRPCProvider
- `src/app/(admin)/beneficiaries/page.tsx` - Migrated
- `src/app/(admin)/trustees/page.tsx` - Migrated
- `src/app/(admin)/vehicles/page.tsx` - Migrated
- `src/app/(admin)/bequests/page.tsx` - Migrated
- `src/app/(admin)/settings/page.tsx` - Migrated
- `src/app/(admin)/liabilities/page.tsx` - Migrated
- `src/app/(admin)/properties/page.tsx` - Migrated
- `src/app/(admin)/accounts/page.tsx` - Migrated
- `src/app/(admin)/accounting/page.tsx` - Migrated (with pagination reset on entity change)
- `src/app/(admin)/hems/page.tsx` - Migrated (removed useEffect for initial selection)
- `src/app/(admin)/hems-queue/page.tsx` - Migrated (preserves "All Entities" option)

## Decisions Made

- Used `parseAsString.withDefault('')` to handle empty state gracefully
- hems-queue page treats empty string as "all entities" for its special filtering behavior
- Removed useEffect-based initial entity selection in hems page (fallback pattern handles it)
- NuqsAdapter placed outside TRPCProvider as recommended by nuqs docs

## Issues Encountered

- Import order lint errors: Biome requires alphabetical imports - fixed with `bun run lint:fix`
- Accidentally removed `useState` imports needed for other state (activeTab, dialogs) - re-added

## Commits

- `71a2084` - feat(30-01): install nuqs and create useEntityFilter hook
- `77fecd5` - feat(30-01): migrate 11 admin pages to nuqs useEntityFilter

## Next Step

Phase 30 complete. Ready for Phase 31 (dinero.js Money Calculations).
