# Phase 19: missing-asset-uis - Research

**Researched:** 2026-03-09
**Domain:** Admin CRUD UI pages for three missing asset types + dashboard totals integration
**Confidence:** HIGH

## Summary

Phase 19 adds admin management pages for three asset types that already have full backend infrastructure (schema, RLS policies, validation schemas, and CRUD functions in `db/queries.ts`) but are missing tRPC routers, sidebar navigation links, and frontend pages. The three types are: **artwork**, **personal property**, and **insurance policies**.

The project has a well-established, highly consistent pattern for asset CRUD pages. Every existing asset page follows the same structure: a tRPC router with list/create/update/delete procedures, a Server Component page with HydrationBoundary prefetch, a Client component using `useResourceForm` hook, a DataTable with editable cells, and a ResourceDialog form. The vehicle page is the cleanest reference implementation.

The dashboard totals calculation (`DashboardClient.tsx` lines 185-245) currently sums bank accounts, investments, real estate, and vehicles but omits artwork, personal property, and insurance policies. The dashboard `summary` query (`dashboard.ts`) similarly fetches only those four asset types. Both must be extended.

**Primary recommendation:** Follow the vehicle page pattern exactly. Create three new tRPC routers, three new admin pages with _components subdirectories, add form defaults to form-factory.ts, add type cast functions to type-utils.ts, extend the dashboard query and client, and add sidebar navigation links.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FEAT-01 | Admin can browse, create, edit, and delete artwork assets | Schema exists (artwork table), validation exists (insertArtworkSchema/updateArtworkSchema), CRUD functions exist in queries.ts. Needs: tRPC router, form defaults, admin page at /artwork, sidebar link |
| FEAT-02 | Admin can browse, create, edit, and delete personal property assets | Schema exists (personal_property table with category enum), validation exists, personalPropertyCrud object exists in queries.ts. Needs: tRPC router, form defaults, admin page at /personal-property, sidebar link |
| FEAT-03 | Admin can browse, create, edit, and delete insurance policies | Schema exists (insurance_policy table with policyType/premiumFrequency enums), validation exists. Needs: tRPC router, form defaults, admin page at /insurance, sidebar link |
| FEAT-04 | Dashboard total assets calculation includes all asset types | Dashboard summary query omits artwork/personalProperty/insurancePolicy. Dashboard client omits them from total. Both must be extended |
</phase_requirements>

## Standard Stack

### Core (already in project)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| Next.js | 16.1 | App Router, Server Components | In use |
| tRPC | v11 | Type-safe API layer | In use |
| Drizzle ORM | current | Database queries | In use |
| @tanstack/react-form | current | Form state management | In use via `useResourceForm` |
| @tanstack/react-table | current | DataTable component | In use |
| shadcn/ui | current | UI components | In use |
| zod | current | Input validation | In use |

### No New Dependencies Required

This phase uses only existing libraries and patterns. No new packages to install.

## Architecture Patterns

### Recommended Project Structure (new files)

```
src/
├── server/trpc/routers/
│   ├── artwork.ts              # NEW: tRPC router
│   ├── insurancePolicy.ts      # NEW: tRPC router
│   └── personalProperty.ts     # NEW: tRPC router
├── app/(admin)/
│   ├── artwork/
│   │   ├── page.tsx            # NEW: Server Component
│   │   ├── loading.tsx         # NEW: Skeleton loader
│   │   ├── error.tsx           # NEW: Error boundary
│   │   └── _components/
│   │       ├── ArtworkClient.tsx
│   │       ├── ArtworkTable.tsx
│   │       └── ArtworkDialog.tsx
│   ├── personal-property/
│   │   ├── page.tsx
│   │   ├── loading.tsx
│   │   ├── error.tsx
│   │   └── _components/
│   │       ├── PersonalPropertyClient.tsx
│   │       ├── PersonalPropertyTable.tsx
│   │       └── PersonalPropertyDialog.tsx
│   └── insurance/
│       ├── page.tsx
│       ├── loading.tsx
│       ├── error.tsx
│       └── _components/
│           ├── InsuranceClient.tsx
│           ├── InsuranceTable.tsx
│           └── InsuranceDialog.tsx
├── components/app-sidebar.tsx  # MODIFY: add 3 nav links
├── lib/
│   ├── form-factory.ts        # MODIFY: add 3 formDefaults
│   └── type-utils.ts          # MODIFY: add cast functions
└── server/trpc/
    ├── router.ts              # MODIFY: register 3 routers
    └── routers/dashboard.ts   # MODIFY: add 3 asset queries
```

### Pattern 1: tRPC Router (replicate from vehicle.ts)

**What:** Each asset type gets a router with list/create/update/delete procedures.
**When to use:** Every asset CRUD page.
**Example:**

```typescript
// Source: src/server/trpc/routers/vehicle.ts (verified in codebase)
export const artworkRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number() }))
        .query(({ input }) =>
            db.select().from(artwork).where(eq(artwork.entityId, input.entityId)),
        ),

    create: adminProcedure
        .input(insertArtworkSchema)
        .mutation(async ({ input }) => {
            const [created] = await db
                .insert(artwork)
                .values({ ...input, updatedAt: new Date().toISOString() })
                .returning()
            if (!created) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create artwork' })
            return created
        }),

    update: adminProcedure
        .input(z.object({
            id: z.coerce.number(),
            entityId: z.coerce.number(),
            data: updateArtworkSchema,
        }))
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(artwork)
                .set({ ...input.data, updatedAt: new Date().toISOString() })
                .where(and(eq(artwork.id, input.id), eq(artwork.entityId, input.entityId)))
                .returning()
            if (!updated) throw new TRPCError({ code: 'NOT_FOUND', message: 'Artwork not found in this entity' })
            return updated
        }),

    delete: adminProcedure
        .input(z.object({ id: z.coerce.number(), entityId: z.coerce.number() }))
        .mutation(async ({ input }) => {
            const [deleted] = await db
                .delete(artwork)
                .where(and(eq(artwork.id, input.id), eq(artwork.entityId, input.entityId)))
                .returning()
            if (!deleted) throw new TRPCError({ code: 'NOT_FOUND', message: 'Artwork not found in this entity' })
            return deleted
        }),
})
```

### Pattern 2: Server Component Page (replicate from vehicles/page.tsx)

**What:** Server Component that prefetches data and wraps client in HydrationBoundary.

```typescript
// Source: src/app/(admin)/vehicles/page.tsx (verified in codebase)
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createTRPCHelpers } from '@/lib/trpc-server'
import { ArtworkClient } from './_components/ArtworkClient'

export default async function ArtworkPage() {
    const helpers = await createTRPCHelpers()
    await Promise.all([
        helpers.artwork.list.prefetch({ entityId: 1 }),
        helpers.entity.list.prefetch(),
    ])
    return (
        <HydrationBoundary state={dehydrate(helpers.queryClient)}>
            <ArtworkClient />
        </HydrationBoundary>
    )
}
```

### Pattern 3: Client Component (replicate from VehiclesClient.tsx)

**What:** Full CRUD client with useResourceForm, ConfirmDialog, DataTable, and ResourceDialog.
**Key elements:**
- `const entityId = 1` (hardcoded -- will be cleaned up in Phase 22/CLEAN-03)
- `trpc.[type].list.useQuery({ entityId })`
- `trpc.[type].create.useMutation({ onSuccess: () => utils.[type].list.invalidate() })`
- Same for update/delete mutations
- `useResourceForm({ initialData: [type]FormDefaults(), onSubmit: ... })`
- `useConfirmDialog` for delete confirmation
- `handleEdit` callback that maps DB entity to form values
- `handleInlineUpdate` for inline DataTable editing
- `sumStrings` for total DOD value display

### Pattern 4: Form Defaults (add to form-factory.ts)

**What:** Default values for create forms, using `createFormDefaults()`.

```typescript
// Artwork form defaults
export const artworkFormDefaults = createFormDefaults({
    title: '',
    artist: '',
    medium: '',
    dimensions: '',
    acquisitionDate: null as string | null,
    acquisitionCost: '',
    location: '',
    dodValue: '',
    dodValueDate: null as string | null,
    dodValueType: '',
    status: 'ACTIVE',
    transferStatus: 'PENDING',
    notes: '',
})

// Personal property form defaults
export const personalPropertyFormDefaults = createFormDefaults({
    name: '',
    description: '',
    category: 'OTHER',
    location: '',
    acquisitionDate: null as string | null,
    acquisitionCost: '',
    dodValue: '',
    dodValueDate: null as string | null,
    dodValueType: '',
    status: 'ACTIVE',
    transferStatus: 'PENDING',
    notes: '',
})

// Insurance policy form defaults
export const insurancePolicyFormDefaults = createFormDefaults({
    policyType: 'LIFE',
    carrier: '',
    policyNumber: '',
    coverageAmount: '',
    premium: '',
    premiumFrequency: '' as string,
    effectiveDate: null as string | null,
    expirationDate: null as string | null,
    insuredAsset: '',
    beneficiaries: '',
    status: 'ACTIVE',
    notes: '',
})
```

### Pattern 5: Sidebar Navigation (modify app-sidebar.tsx)

**What:** Three new links in the Assets collapsible submenu.

The sidebar's Assets submenu currently has: Properties, Accounts, Vehicles, Inventory Queue. Add: Artwork, Personal Property, Insurance -- between Vehicles and Inventory Queue.

**Important:** Update `isInAssets` path list to include `/artwork`, `/personal-property`, `/insurance`.

Add prefetch functions for each:
```typescript
artwork: () => {
    utils.artwork.list.prefetch({ entityId })
    utils.entity.list.prefetch()
},
personalProperty: () => {
    utils.personalProperty.list.prefetch({ entityId })
    utils.entity.list.prefetch()
},
insurance: () => {
    utils.insurancePolicy.list.prefetch({ entityId })
    utils.entity.list.prefetch()
},
```

### Anti-Patterns to Avoid

- **Using old CRUD functions from queries.ts:** The newer router pattern uses inline Drizzle queries (as in vehicle.ts), not the old CRUD objects. Follow the inline pattern for consistency.
- **Missing entityId on mutations:** All create/update/delete must include entityId validation per project convention (entity-id-validation pattern from Phase 18).
- **NOT_FOUND vs INTERNAL_SERVER_ERROR:** create throws INTERNAL_SERVER_ERROR; update/delete throw NOT_FOUND (the entity-scoped WHERE clause may not match).
- **Forgetting `updatedAt`:** All `.values()` and `.set()` calls must include `updatedAt: new Date().toISOString()`.
- **Insurance value vs DOD value:** Insurance policies use `coverageAmount`, not `dodValue`. For dashboard totals, only life insurance policies may contribute their death benefit as asset value. Consider using `coverageAmount` for the total or only summing LIFE policies.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form state | Custom useState form | `useResourceForm` hook | Already handles open/close, create/edit mode, submit lifecycle |
| Data table | Custom table | `DataTable` + `DataTableColumnHeader` | Already has sorting, filtering, pagination |
| Dialog chrome | Custom modal | `ResourceDialog` component | Consistent header/footer, loading state |
| Enum dropdowns | Custom option lists | `enumToOptions()` from type-utils | Auto-converts SCREAMING_SNAKE to Title Case |
| Inline editing | Custom edit mode | `EditableTextCell`, `EditableCurrencyCell`, `EditableSelectCell` | Already handles click-to-edit with save/cancel |
| Delete confirm | `window.confirm()` | `ConfirmDialog` + `useConfirmDialog` | Styled, accessible, matches project convention |
| Error boundary | Custom try/catch UI | Copy `error.tsx` from vehicles | Sentry integration, consistent UI |
| Loading skeleton | Custom spinners | Copy `loading.tsx` from vehicles | Consistent loading experience |

## Common Pitfalls

### Pitfall 1: Insurance Policy Has No dodValue Column
**What goes wrong:** Attempting to read `insurancePolicy.dodValue` -- this column does not exist.
**Why it happens:** Other asset types (artwork, personalProperty, vehicle, etc.) all have dodValue. Insurance policies are structurally different -- they have `coverageAmount` and `premium` instead.
**How to avoid:** For insurance, the dashboard value contribution should use `coverageAmount` (the face value). The insurance page should show `coverageAmount` as the primary value column, not dodValue.
**Warning signs:** TypeScript errors on `dodValue` access for insurance policies.

### Pitfall 2: Missing Type Cast Functions
**What goes wrong:** Form submissions fail at runtime because enum values aren't cast to their TypeScript types.
**Why it happens:** `type-utils.ts` has no `asInsurancePolicyType`, `asPremiumFrequency`, or `asPersonalPropertyCategory` functions.
**How to avoid:** Add these three cast functions to `type-utils.ts` before building the form dialogs:
```typescript
export function asInsurancePolicyType(value: string): InsurancePolicyType { return value as InsurancePolicyType }
export function asPremiumFrequency(value: string | null): PremiumFrequency | null { return value as PremiumFrequency | null }
export function asPersonalPropertyCategory(value: string): PersonalPropertyCategory { return value as PersonalPropertyCategory }
```

Also add `PersonalPropertyCategory` type and `PERSONAL_PROPERTY_CATEGORY_VALUES` exports. The `personalPropertyCategory` enum is imported from schema but not re-exported.

### Pitfall 3: Dashboard Query Must Return New Asset Arrays
**What goes wrong:** Dashboard summary returns undefined for new asset types, causing client crash.
**Why it happens:** `dashboard.ts` `summary` procedure's Promise.all doesn't include artwork/personalProperty/insurancePolicy queries.
**How to avoid:** Add three queries to the Promise.all and include them in the return object. Then update DashboardClient to destructure and sum them.

### Pitfall 4: Sidebar isInAssets Check
**What goes wrong:** New asset pages don't highlight the Assets submenu as active.
**Why it happens:** `isInAssets` array doesn't include the new paths.
**How to avoid:** Add `/artwork`, `/personal-property`, `/insurance` to the `isInAssets` array.

### Pitfall 5: PersonalProperty Category Enum Overlap
**What goes wrong:** PersonalPropertyCategory includes 'ART' but there is a separate artwork table.
**Why it happens:** The schema models artwork separately from personal property (artwork has specialized fields like artist, medium, dimensions).
**How to avoid:** The personal property page should use all category values. The distinction is by table, not by category value. Users choose artwork page for fine art with provenance tracking, personal property for everything else.

### Pitfall 6: Insurance Policy Has No transferStatus
**What goes wrong:** Attempting to show transferStatus column for insurance policies.
**Why it happens:** Unlike other assets, the insurancePolicy schema has no `transferStatus` or `dodValue` columns. It's a fundamentally different asset type (a contract, not property).
**How to avoid:** Insurance table columns should show: policyType, carrier, policyNumber, coverageAmount, premium, premiumFrequency, status, effectiveDate/expirationDate. No transferStatus column.

## Code Examples

### Router Registration (modify router.ts)

```typescript
// Add to imports
import { artworkRouter } from './routers/artwork'
import { insurancePolicyRouter } from './routers/insurancePolicy'
import { personalPropertyRouter } from './routers/personalProperty'

// Add to appRouter in "Assets (pure CRUD)" section
artwork: artworkRouter,
personalProperty: personalPropertyRouter,
insurancePolicy: insurancePolicyRouter,
```

### Dashboard Summary Extension (modify dashboard.ts)

```typescript
// Add to imports
import { artwork, insurancePolicy, personalProperty } from '@/db/schema'

// Add to Promise.all in summary procedure
db.select().from(artwork).where(eq(artwork.entityId, entityId)),
db.select().from(personalProperty).where(eq(personalProperty.entityId, entityId)),
db.select().from(insurancePolicy).where(eq(insurancePolicy.entityId, entityId)),

// Add to return object
artworks,
personalProperties,
insurancePolicies,
```

### Dashboard Client Totals Extension (modify DashboardClient.tsx)

```typescript
// Add destructuring
const artworks = summary?.artworks ?? []
const personalProperties = summary?.personalProperties ?? []
const insurancePolicies = summary?.insurancePolicies ?? []

// Add to useMemo calculation
const artworkTotal = sumStrings(artworks.map((a) => a.dodValue ?? '0'))
const personalPropertyTotal = sumStrings(personalProperties.map((p) => p.dodValue ?? '0'))
const insuranceTotal = sumStrings(insurancePolicies.map((p) => p.coverageAmount ?? '0'))

// Extend assetTotal
const assetTotal = sumStrings([
    bankTotal, investTotal, realEstateTotal, vehicleTotal,
    artworkTotal, personalPropertyTotal, insuranceTotal,
])

// Add to allocationData
{ name: 'Artwork', value: Number.parseFloat(artworkTotal) || 0, fill: 'hsl(340, 82%, 52%)' },
{ name: 'Personal Property', value: Number.parseFloat(personalPropertyTotal) || 0, fill: 'hsl(25, 95%, 53%)' },
{ name: 'Insurance', value: Number.parseFloat(insuranceTotal) || 0, fill: 'hsl(195, 74%, 44%)' },

// Add to useMemo dependency array
artworks, personalProperties, insurancePolicies,
```

### Schema Field Reference

**Artwork fields:** title (required), artist, medium, dimensions, acquisitionDate, acquisitionCost, location, dodValue, dodValueDate, dodValueType, transferStatus, status, notes

**PersonalProperty fields:** name (required), description, category (required, enum: JEWELRY/ART/COLLECTIBLES/ELECTRONICS/FURNITURE/OTHER), location, acquisitionDate, acquisitionCost, dodValue, dodValueDate, dodValueType, status, transferStatus, notes

**InsurancePolicy fields:** policyType (required, enum: LIFE/PROPERTY/AUTO/UMBRELLA/LIABILITY/HEALTH/OTHER), carrier (required), policyNumber (required), coverageAmount, premium, premiumFrequency (enum: MONTHLY/QUARTERLY/SEMI_ANNUAL/ANNUAL), effectiveDate, expirationDate, insuredAsset, beneficiaries, status, notes

## State of the Art

| Aspect | Current State | What Phase 19 Changes |
|--------|---------------|----------------------|
| Asset pages | 5 types have pages (bank, investment, homestead, rental, vehicle) | 3 more types get pages (8 total) |
| Dashboard totals | Sums 4 asset types | Sums all 7 asset types |
| Sidebar Assets menu | 4 links (Properties, Accounts, Vehicles, Inventory Queue) | 7 links (add Artwork, Personal Property, Insurance) |
| tRPC routers | 22 registered | 25 registered |
| Form defaults | 8 in form-factory.ts | 11 in form-factory.ts |

**What already exists (do NOT recreate):**
- Schema tables: `artwork`, `personal_property`, `insurance_policy` -- all with RLS policies
- Validation: `insertArtworkSchema`, `updateArtworkSchema`, `insertPersonalPropertySchema`, `updatePersonalPropertySchema`, `insertInsurancePolicySchema`, `updateInsurancePolicySchema`
- Relations: `artworkRelations`, `personalPropertyRelations`, `insurancePolicyRelations` in db/relations.ts
- Type exports: `Artwork`, `InsertArtwork`, `PersonalProperty`, `InsertPersonalProperty`, `InsurancePolicy`, `InsertInsurancePolicy`
- Enum types/values: `InsurancePolicyType`, `PremiumFrequency` in type-utils.ts (but no cast functions or PersonalPropertyCategory)
- Old CRUD functions in queries.ts (will not use -- inline Drizzle in routers instead)

## Validation Architecture

> nyquist_validation not explicitly set to false in config.json -- including section.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Bun test (built-in) + Playwright |
| Config file | `package.json` (scripts), `playwright.config.ts` |
| Quick run command | `bun test` |
| Full suite command | `bun test && bun run test:e2e` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FEAT-01 | Artwork CRUD via tRPC | unit | `bun test tests/trpc/crud-core-assets.test.ts` | Exists but may not cover artwork |
| FEAT-02 | PersonalProperty CRUD via tRPC | unit | `bun test tests/trpc/crud-core-assets.test.ts` | Exists but may not cover personalProperty |
| FEAT-03 | InsurancePolicy CRUD via tRPC | unit | `bun test tests/trpc/crud-core-assets.test.ts` | Exists but may not cover insurancePolicy |
| FEAT-04 | Dashboard totals include all assets | unit | `bun test tests/trpc/business-logic.test.ts` | Exists -- needs extension |

### Sampling Rate
- **Per task commit:** `bun run typecheck && bun run lint`
- **Per wave merge:** `bun test`
- **Phase gate:** `bun run build` (catches all type errors across pages)

### Wave 0 Gaps
- None -- existing test infrastructure covers phase requirements. New router tests can be added to existing test files (`crud-core-assets.test.ts`).

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `db/schema.ts` lines 831-899 (insurancePolicy), 1236-1304 (personalProperty), 1850-1919 (artwork)
- Codebase inspection: `db/validation.ts` -- confirmed all six schemas exist (insert + update for each type)
- Codebase inspection: `src/server/trpc/routers/vehicle.ts` -- verified complete router pattern
- Codebase inspection: `src/app/(admin)/vehicles/` -- verified complete page pattern (4 files, 3 components)
- Codebase inspection: `src/server/trpc/routers/dashboard.ts` -- confirmed missing asset queries
- Codebase inspection: `src/app/(admin)/dashboard/_components/DashboardClient.tsx` -- confirmed missing asset totals
- Codebase inspection: `src/components/app-sidebar.tsx` -- confirmed missing nav links
- Codebase inspection: `src/lib/form-factory.ts` -- confirmed no form defaults for three types
- Codebase inspection: `src/lib/type-utils.ts` -- confirmed missing cast functions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all existing, no new dependencies
- Architecture: HIGH -- exact replication of existing patterns verified in codebase
- Pitfalls: HIGH -- identified from schema differences (insurancePolicy lacks dodValue/transferStatus)

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable -- internal patterns, no external dependencies)
