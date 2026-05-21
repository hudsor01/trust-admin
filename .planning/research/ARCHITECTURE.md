# Architecture Patterns — v5.0 Firearm Asset Integration

**Domain:** Trust administration — new asset class addition + beneficiary UI cleanup
**Researched:** 2026-05-21
**Overall confidence:** HIGH (all findings from direct codebase inspection)

---

## Firearm Table Shape Decision

**Yes — `firearm` follows the standard 6-asset shared-column shape**, plus firearm-specific columns.

Rationale:

1. The shared columns (`entityId`, `dodValue`, `dodValueDate`, `status`, `transferStatus`) exist on vehicle, homestead, rentalProperty, bankAccount, investmentAccount, and personalProperty for a consistent reason: every transferable estate asset needs DOD valuation for estate tax basis step-up (Texas Property Code), a lifecycle status, and an ATF/title transfer status. Firearms are transferable estate assets and require all three.
2. `transferStatus` for firearms maps directly to ATF Form 4/Form 5 transfer progress — `PENDING | STARTED | COMPLETE` matches that workflow exactly.
3. `insurancePolicy` is the only exception because it is not a transferable asset — it has no estate tax basis concept and no Form 4. Firearms are not that exception.
4. The `asset.listAll` aggregator and dashboard summary both consume `dodValue` and `transferStatus` from every asset type. Following the shared shape means firearm integrates into both with minimal new code.

---

## Component Boundaries and Touch Points

Every entry below is marked **NEW** (create from scratch) or **MODIFIED** (edit existing file).

### Schema Layer

| File | Status | Change |
|------|--------|--------|
| `db/schema.ts` | MODIFIED | Add `nfaClass` pgEnum + `firearm` pgTable |
| `db/relations.ts` | MODIFIED | Add `firearmRelations` + `firearms: many(firearm)` to `entityRelations` |
| `db/validation.ts` | MODIFIED | Add `insertFirearmSchema`, `selectFirearmSchema`, `updateFirearmSchema` |

**`firearm` table shape (recommended columns):**
- Shared: `id`, `entityId` (FK→entity, NOT NULL), `name`, `description`, `dodValue`, `dodValueDate`, `dodValueType` (valuationType enum), `status` (recordStatus), `transferStatus` (transferStatus enum), `notes`, `createdAt`, `updatedAt`
- Firearm-specific: `serialNumber` (text, unique index), `make` (text, NOT NULL), `model` (text, NOT NULL), `caliber` (text), `nfaClass` (new pgEnum: `'NONE' | 'SBR' | 'SBS' | 'SUPPRESSOR' | 'MG' | 'AOW' | 'DD'`), `acquisitionDate` (timestamp), `acquisitionCost` (numeric 12,2), `fflTransferNumber` (text — ATF Form 4/5 reference number), `fflDealerName` (text)
- Indexes: `idx_firearm_entity_id` on `entityId`, `idx_firearm_status` on `status`; unique index on `serialNumber`
- RLS: `.enableRLS()` with four standard `pgPolicy` entries (same `app.is_admin()` shape as vehicle)
- FK: `firearm_entity_id_fkey` → `entity.id`, onUpdate cascade, onDelete restrict

**Valuation table note:** The `valuation` table has a `firarmId` FK column per its polymorphic pattern. Add `firarmId: bigint({ mode: 'number' })` and update the `valuation_single_asset_check` constraint to include it. This is optional for v5.0 if valuation history for firearms is deferred — but the check constraint must be updated if the column is added, or the constraint stays accurate with 6 options.

### Router Layer

| File | Status | Change |
|------|--------|--------|
| `src/server/trpc/routers/firearm.ts` | NEW | `list`, `create`, `update`, `delete` — exact vehicle router pattern |
| `src/server/trpc/router.ts` | MODIFIED | Add `firearm: firearmRouter` import + registration under Assets section |
| `src/server/trpc/routers/asset.ts` | MODIFIED | Add `'firearm'` to `AssetKind` union; add `firearm` to Promise.all fan-out; add mapper loop pushing `{ kind: 'firearm', category: 'Firearm', value: f.dodValue, href: '/firearms', transferStatus: f.transferStatus, ... }` |
| `src/server/trpc/routers/dashboard.ts` | MODIFIED | Add `firearm` import; add `db.select().from(firearm).where(eq(firearm.entityId, entityId))` to Promise.all; add `firearms` to returned object |

### Dashboard Client

| File | Status | Change |
|------|--------|--------|
| `src/app/(admin)/dashboard/_components/DashboardClient.tsx` | MODIFIED | Destructure `firearms` from `summary`; add `firearmTotal = sumStrings(firearms.map(f => f.dodValue ?? '0'))` to the `useMemo`; add it to `assetTotal = sumStrings([..., firearmTotal])`; add `{ name: 'Firearms', value: toCents(firearmTotal) / 100, fill: 'var(--chart-6)' }` to `allocationData`; add `firearms` to `useMemo` dependency array |

### Admin Page

| File | Status | Change |
|------|--------|--------|
| `src/app/(admin)/firearms/` | NEW directory | |
| `src/app/(admin)/firearms/page.tsx` | NEW | Server component — prefetch `firearm.list` + `entity.list`, HydrationBoundary wrapper (identical to `vehicles/page.tsx`) |
| `src/app/(admin)/firearms/loading.tsx` | NEW | Skeleton (copy from `vehicles/loading.tsx`) |
| `src/app/(admin)/firearms/error.tsx` | NEW | Error boundary (copy from `vehicles/error.tsx`) |
| `src/app/(admin)/firearms/_components/FirearmsClient.tsx` | NEW | KpiStrip + FirearmTable + FirearmDialog — vehicle pattern |
| `src/app/(admin)/firearms/_components/FirearmTable.tsx` | NEW | DataTable with columns: name, make/model, caliber, NFA class, serial #, DOD value, transfer status, status |
| `src/app/(admin)/firearms/_components/FirearmDialog.tsx` | NEW | Resource dialog with wizard steps |

### Sidebar Nav

| File | Status | Change |
|------|--------|--------|
| `src/components/app-sidebar.tsx` | MODIFIED | Two changes: (1) add `firearms: () => { utils.firearm.list.prefetch({ entityId }); utils.entity.list.prefetch() }` to the `prefetch` object; (2) insert `Firearms` `SidebarMenuSubItem` alphabetically between `Artwork` and `Insurance` in the Assets `CollapsibleContent` section |

Current order (lines ~380–485): Properties, Accounts, Vehicles, Personal Property, Artwork, Insurance.
Target order (alphabetical): Accounts, Artwork, Firearms, Insurance, Personal Property, Properties, Vehicles.

Note: The PROJECT.md target order is `Accounts, Artwork, Firearms, Insurance, Personal Property, Properties, Vehicles` — all six existing items must be reordered, not just Firearms inserted.

### RLS

Firearm follows the standard admin-only RLS pattern. No new Postgres functions needed. The four `pgPolicy` declarations in the `firearm` pgTable definition in `schema.ts` are the source of truth — they are emitted into the migration SQL by `db:deploy`. No manual SQL edit to `db/rls.ts` is needed (that file is documentation-only per its header comment).

---

## Migration Sequencing and the camelCase Gotcha

### Sequence

1. Edit `db/schema.ts` — add `nfaClass` enum + `firearm` table
2. Run `bun run db:generate` — drizzle-kit reads the schema diff and emits SQL into `db/migrations/`
3. **Hand-audit the emitted migration SQL before applying** — see gotcha below
4. Run `bun run db:migrate` to apply, or `bun run db:deploy` to generate+migrate in one step

`db:push` is explicitly broken for this codebase (mishandles RLS policies). Always use `db:deploy` / `db:generate` + `db:migrate`.

### The camelCase Gotcha

**Documented in MEMORY.md and CLAUDE.md:** drizzle-kit auto-generated migrations emit snake_case column references in UPDATE/SET statements even when the schema uses camelCase column names. The `firearm` table will have columns named `"serialNumber"`, `"dodValue"`, `"dodValueDate"`, `"dodValueType"`, `"acquisitionDate"`, `"acquisitionCost"`, `"fflTransferNumber"`, `"fflDealerName"`, `"transferStatus"`, `"entityId"`, `"nfaClass"`, `"createdAt"`, `"updatedAt"` in Postgres — camelCase.

If the generated migration contains any `UPDATE`, `ALTER ... SET DEFAULT`, or inline expressions referencing these columns in snake_case (e.g. `"serial_number"`, `"dod_value"`), those references must be hand-edited to camelCase before running `db:migrate`.

The CREATE TABLE DDL itself is typically correct (drizzle uses the column name from the schema definition). The risk is in any secondary statements. Verify before applying. If `db:migrate` exits with bare exit code 1 and no message, run the SQL manually via `getClient()` (postgres.js) to surface the real Postgres error — `getSql()` (Neon HTTP driver) reports DDL as success even when nothing persists.

---

## Beneficiary Cleanup — Component Removal

### Components to Remove

Three things are removed from `BeneficiariesClient.tsx` (the orchestrator component in `src/app/(admin)/beneficiaries/_components/`):

1. **Avatar-stack card** — The `<div className="grid grid-cols-1 md:grid-cols-3 gap-6 ...">` block at lines ~218–226 that renders `<BeneficiaryAvatarStack beneficiaries={avatarItems} />` plus the inline summary text. After removal, `BeneficiaryAvatarStack.tsx` becomes dead code and should be deleted.

2. **Display Order card** — The conditional `{!loading && beneficiaries.length > 1 && entityId && (...)}` block at lines ~234–256 that renders a `<Card>` with `<CardTitle>Display Order</CardTitle>` and `<BeneficiarySortableList />` inside it. The `BeneficiarySortableList.tsx` component becomes dead code and should be deleted. The `sortIndex` DB column stays — only the reorder UI is removed; the `ORDER BY sortIndex` in list queries stays intact.

3. **WithdrawalMilestoneGantt** — The `<WithdrawalMilestoneGantt beneficiaries={milestoneItems} entityDod={entityDetail?.dod ?? null} isLoading={loading} />` at lines ~258–262. After removal, `WithdrawalMilestoneGantt.tsx` becomes dead code and should be deleted.

### Safe Removal Order

1. **Edit `BeneficiariesClient.tsx` first** — remove all three JSX blocks in a single edit. This makes all three components unreferenced.
2. **Remove derived variables that become unused** after the JSX is gone:
   - `avatarItems` useMemo (lines ~167–174) — only feeds AvatarStack
   - `milestoneItems` useMemo (lines ~176–188) — only feeds Gantt
   - `entityDetail` query (`trpc.entity.byId.useQuery`) — only feeds Gantt's `entityDod` prop
3. **Remove imports** at the top of `BeneficiariesClient.tsx`:
   - `import { BeneficiaryAvatarStack } from './BeneficiaryAvatarStack'`
   - `import { BeneficiarySortableList } from './BeneficiarySortableList'`
   - `import { WithdrawalMilestoneGantt } from './WithdrawalMilestoneGantt'`
4. **Delete the three dead component files** — `BeneficiaryAvatarStack.tsx`, `BeneficiarySortableList.tsx`, `WithdrawalMilestoneGantt.tsx`
5. Run `bun run typecheck` and `bun run lint` to confirm no dangling references

**Do not remove `BeneficiaryShareDonuts.tsx`** — it is not part of the cleanup scope and remains rendered between KpiStrip and the table.

**Do not touch `beneficiary.sortIndex` column** or any query that orders by it. The `BeneficiarySortableList` component was the write path for `sortIndex`, but the read path (ORDER BY sortIndex in list queries) is independent and intentionally preserved.

### Dependency Check for BeneficiarySortableList

Before deleting, verify no other page imports `BeneficiarySortableList`:

```bash
grep -rn "BeneficiarySortableList" src/
```

Expected: only one hit in `BeneficiariesClient.tsx` (the import line, already removed). If any other file imports it, investigate before deleting.

---

## Suggested Build Order for v5.0

Dependencies flow schema → router → page → nav → dashboard. The beneficiary cleanup is fully independent.

### Phase 1 — Schema + Migration (firearm foundation)

1. Add `nfaClass` enum to `db/schema.ts` (add to enums section near top)
2. Add `firearm` table to `db/schema.ts` (after `personalProperty`, before `inventoryAnalysisCache`)
3. Add `firearmRelations` to `db/relations.ts`; add `firearms: many(firearm)` to `entityRelations`
4. Add `insertFirearmSchema`, `selectFirearmSchema`, `updateFirearmSchema` to `db/validation.ts`
5. Run `bun run db:generate` → hand-audit emitted SQL for snake_case column refs → fix → `bun run db:migrate`
6. Run `bun run typecheck` — schema types must resolve before router work starts

### Phase 2 — tRPC Router

7. Create `src/server/trpc/routers/firearm.ts` (list/create/update/delete, vehicle pattern)
8. Register in `src/server/trpc/router.ts` under Assets section
9. Run `bun run typecheck` — tRPC client types regenerate from appRouter, must pass before UI

### Phase 3 — Admin Page

10. Create `src/app/(admin)/firearms/` directory with `page.tsx`, `loading.tsx`, `error.tsx`
11. Create `_components/FirearmTable.tsx`, `FirearmDialog.tsx`, `FirearmsClient.tsx`
12. Run dev server, verify page loads and CRUD works end-to-end

### Phase 4 — Asset Aggregators

13. Modify `src/server/trpc/routers/asset.ts` — add `firearm` to AssetKind, fan-out, mapper
14. Modify `src/server/trpc/routers/dashboard.ts` — add `firearm` to Promise.all, return
15. Modify `src/app/(admin)/dashboard/_components/DashboardClient.tsx` — add firearmTotal to useMemo

### Phase 5 — Sidebar Nav

16. Modify `src/components/app-sidebar.tsx` — add `firearms` prefetch function + reorder all 7 sub-items alphabetically

### Phase B (parallel/independent) — Beneficiary Cleanup

Can run in parallel with any of the above phases or as a standalone PR.

1. Edit `BeneficiariesClient.tsx` — remove three JSX blocks + derived variables + imports
2. Delete `BeneficiaryAvatarStack.tsx`, `BeneficiarySortableList.tsx`, `WithdrawalMilestoneGantt.tsx`
3. Verify with `bun run typecheck && bun run lint`

---

## Patterns to Follow

### Standard Asset Table Declaration

Every asset table in `db/schema.ts` follows this structure: bigint PK with `generatedAlwaysAsIdentity`, `entityId` FK referencing `entity.id` with `onUpdate: 'cascade'` and `onDelete: 'restrict'`, four standard RLS policies (`select/insert/update/delete`), `.enableRLS()`. The `firearm` table must match exactly.

### Standard Router Pattern

See `src/server/trpc/routers/vehicle.ts`: `list` uses `db.select().from(table).where(eq(table.entityId, input.entityId))`; `update` and `delete` use `and(eq(table.id, input.id), eq(table.entityId, input.entityId))` and throw `TRPCError({ code: 'NOT_FOUND' })` when `.returning()` is empty.

### Asset.listAll Mapper Pattern

Each asset type in `asset.ts` maps to a common `AssetRow` envelope: `{ id, kind, name, description, category, value, status, href, transferStatus, updatedAt }`. Firearm's `value` source is `dodValue` (same as vehicle/personalProperty). `href` is `'/firearms'`. `transferStatus` is `f.transferStatus` (non-null, it follows the shared shape).

### Dashboard Integration Pattern

`dashboard.ts` returns raw arrays per asset type from `summary`. The client-side `DashboardClient.tsx` derives totals in a `useMemo`. Adding firearms requires one new parallel query in the router's `Promise.all`, one new field in the returned object, and one new `sumStrings` + allocationData entry in the client's memo.

---

## Anti-Patterns to Avoid

### Do Not Use personalProperty Category for Firearms

Firearms are not a `personalPropertyCategory` enum value. Do not add `'FIREARM'` to that enum. The decision is a dedicated table (confirmed in PROJECT.md) because NFA classification, serial number uniqueness, and ATF Form 4/5 tracking cannot fit the generic `personalProperty` pattern.

### Do Not Add Firearms to valuation's Check Constraint Without Adding the FK Column

The `valuation` table has a `check` constraint (`valuation_single_asset_check`) counting non-null FK columns. If you add a `firearmId` FK column to `valuation`, you must update that check expression to include it, or every INSERT to the `valuation` table will fail the constraint. If you defer valuation history for firearms, simply omit the `firearmId` column from `valuation` entirely for v5.0.

### Do Not Remove sortIndex from Queries

`beneficiary.list` orders by `sortIndex`. The drag-reorder UI is removed, but `sortIndex` remains the sort key. Removing `ORDER BY sortIndex` from list queries would break the admin-defined display order silently.

---

## File Inventory Summary

| File | Status | Phase |
|------|--------|-------|
| `db/schema.ts` | MODIFIED | P1 |
| `db/relations.ts` | MODIFIED | P1 |
| `db/validation.ts` | MODIFIED | P1 |
| `db/migrations/<next>.sql` | NEW (generated) | P1 |
| `src/server/trpc/routers/firearm.ts` | NEW | P2 |
| `src/server/trpc/router.ts` | MODIFIED | P2 |
| `src/server/trpc/routers/asset.ts` | MODIFIED | P4 |
| `src/server/trpc/routers/dashboard.ts` | MODIFIED | P4 |
| `src/app/(admin)/firearms/page.tsx` | NEW | P3 |
| `src/app/(admin)/firearms/loading.tsx` | NEW | P3 |
| `src/app/(admin)/firearms/error.tsx` | NEW | P3 |
| `src/app/(admin)/firearms/_components/FirearmsClient.tsx` | NEW | P3 |
| `src/app/(admin)/firearms/_components/FirearmTable.tsx` | NEW | P3 |
| `src/app/(admin)/firearms/_components/FirearmDialog.tsx` | NEW | P3 |
| `src/app/(admin)/dashboard/_components/DashboardClient.tsx` | MODIFIED | P4 |
| `src/components/app-sidebar.tsx` | MODIFIED | P5 |
| `src/app/(admin)/beneficiaries/_components/BeneficiariesClient.tsx` | MODIFIED | PB |
| `src/app/(admin)/beneficiaries/_components/BeneficiaryAvatarStack.tsx` | DELETED | PB |
| `src/app/(admin)/beneficiaries/_components/BeneficiarySortableList.tsx` | DELETED | PB |
| `src/app/(admin)/beneficiaries/_components/WithdrawalMilestoneGantt.tsx` | DELETED | PB |

---

## Sources

All findings from direct inspection of:
- `/Users/richard/Developer/trust-admin/db/schema.ts` — asset table patterns
- `/Users/richard/Developer/trust-admin/db/relations.ts` — relation declarations
- `/Users/richard/Developer/trust-admin/db/validation.ts` — schema validation patterns
- `/Users/richard/Developer/trust-admin/db/rls.ts` — RLS documentation
- `/Users/richard/Developer/trust-admin/src/server/trpc/router.ts` — router registration
- `/Users/richard/Developer/trust-admin/src/server/trpc/routers/vehicle.ts` — canonical asset router
- `/Users/richard/Developer/trust-admin/src/server/trpc/routers/asset.ts` — listAll aggregator
- `/Users/richard/Developer/trust-admin/src/server/trpc/routers/dashboard.ts` — dashboard summary
- `/Users/richard/Developer/trust-admin/src/app/(admin)/vehicles/_components/VehiclesClient.tsx` — reference UI
- `/Users/richard/Developer/trust-admin/src/app/(admin)/beneficiaries/_components/BeneficiariesClient.tsx` — cleanup target
- `/Users/richard/Developer/trust-admin/src/components/app-sidebar.tsx` — nav group
- `/Users/richard/Developer/trust-admin/.planning/PROJECT.md` — milestone scope
- `/Users/richard/Developer/trust-admin/CLAUDE.md` — architecture constraints
