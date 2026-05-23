# Phase 31: asset-aggregator-integration — Pattern Map

**Mapped:** 2026-05-22
**Files analyzed:** 3 (all modifications, no new files)
**Analogs found:** 3 / 3 — each file is its own analog (surgical same-file additions)

---

## File Classification

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/server/trpc/routers/asset.ts` | router | CRUD / request-response | Self — vehicle mapper (lines 127-140) | exact |
| `src/server/trpc/routers/dashboard.ts` | router | CRUD / request-response | Self — vehicle query (line 129) + return obj (lines 156-163) | exact |
| `src/app/(admin)/dashboard/_components/DashboardClient.tsx` | component | request-response | Self — vehicleTotal (lines 211-213) + allocationData (lines 249-253) | exact |

---

## Pattern Assignments

### 1. `src/server/trpc/routers/asset.ts`

**Three surgical insertions.** All patterns are in the file itself.

---

#### Change A — `AssetKind` union (line 29, insert after `'insurancePolicy'`)

**Existing union** (lines 22-29):
```typescript
export type AssetKind =
    | 'vehicle'
    | 'homestead'
    | 'rentalProperty'
    | 'bankAccount'
    | 'investmentAccount'
    | 'personalProperty'
    | 'insurancePolicy'
```

**Insertion:** append `| 'firearm'` after `'insurancePolicy'` (line 29). Union order has no semantic meaning at the TypeScript layer (D-01).

---

#### Change B — `Promise.all` destructure + query array

**Existing destructure** (lines 86-120) — template to copy:
```typescript
const [
    vehicles,
    homesteads,
    rentals,
    banks,
    investments,
    personal,
    insurance,
] = await Promise.all([
    db.select().from(vehicle).where(eq(vehicle.entityId, entityId)),
    db
        .select()
        .from(homestead)
        .where(eq(homestead.entityId, entityId)),
    // ...
    db
        .select()
        .from(insurancePolicy)
        .where(eq(insurancePolicy.entityId, entityId)),
])
```

**Insertions:**
- Add `firearms,` to the destructure array after `insurance,` (line 93)
- Add to the `Promise.all` array after the `insurancePolicy` query (after line 119):
```typescript
db.select().from(firearm).where(eq(firearm.entityId, entityId)),
```

---

#### Change C — Firearm mapper loop (insert after insurance loop, after line 236)

**Template — vehicle mapper** (lines 127-140):
```typescript
for (const v of vehicles) {
    rows.push({
        id: v.id,
        kind: 'vehicle',
        name: v.name,
        description: v.description,
        category: 'Vehicle',
        value: v.dodValue,
        status: v.status,
        href: '/vehicles',
        transferStatus: v.transferStatus,
        updatedAt: v.updatedAt,
    })
}
```

**Firearm mapper to add** (after the `insurance` loop, before the `rows.sort(...)` call on line 239):
```typescript
for (const f of firearms) {
    rows.push({
        id: f.id,
        kind: 'firearm',
        name: f.name,
        description: f.description,
        category: 'Firearm',
        value: f.dodValue,
        status: f.status,
        href: '/firearms',
        transferStatus: f.transferStatus,
        updatedAt: f.updatedAt,
    })
}
```

Field choices per D-06: `value` = `f.dodValue` (same as vehicle/homestead); `transferStatus` = `f.transferStatus` (generic enum, NOT `f.nfaTransferStatus`).

---

#### Import addition

**Existing import block** (lines 1-12):
```typescript
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import {
    bankAccount,
    homestead,
    insurancePolicy,
    investmentAccount,
    personalProperty,
    rentalProperty,
    vehicle,
} from '@/db/schema'
```

**Add `firearm` to the named import list** (alphabetical or after `vehicle` — no semantic order requirement). The `firearm` table is exported from `@/db/schema` (confirmed at line 1466 of `db/schema.ts`).

---

### 2. `src/server/trpc/routers/dashboard.ts`

**Two surgical insertions.**

---

#### Change A — Add `firearms` to `Promise.all` + destructure

**Existing vehicle line in Promise.all** (line 129) — template:
```typescript
db.select().from(vehicle).where(eq(vehicle.entityId, entityId)),
```

**Existing destructure** (lines 63-78):
```typescript
const [
    beneficiaries,
    withdrawalRecords,
    recentIncomeEntries,
    recentExpenseEntries,
    hemsRequests,
    bankAccounts,
    investmentAccounts,
    homesteads,
    rentalProperties,
    vehicles,
    personalProperties,
    insurancePolicies,
    liabilities,
    tasks,
] = await Promise.all([
```

**Insertions:**
- Add `firearms,` to the destructure after `insurancePolicies,` (after line 75, before `liabilities`)
- Add to the `Promise.all` array after the `insurancePolicy` query (after line 137, before `liability`):
```typescript
db
    .select()
    .from(firearm)
    .where(eq(firearm.entityId, entityId)),
```

---

#### Change B — Add `firearms` to return object

**Existing return object** (lines 146-163):
```typescript
return {
    beneficiaries,
    withdrawalRecords,
    recentAccountingEntries: [
        ...recentIncomeEntries,
        ...recentExpenseEntries,
    ],
    hemsRequests,
    bankAccounts,
    investmentAccounts,
    homesteads,
    rentalProperties,
    vehicles,
    personalProperties,
    insurancePolicies,
    liabilities,
    tasks,
}
```

**Add `firearms,`** after `insurancePolicies,` (line 160), before `liabilities,`.

---

#### Import addition

**Existing schema import block** (lines 4-21):
```typescript
import {
    activityLog,
    bankAccount,
    beneficiary,
    distribution,
    hemsRequest,
    homestead,
    insurancePolicy,
    investmentAccount,
    liability,
    personalProperty,
    rentalProperty,
    task,
    trustAccounting,
    trustee,
    vehicle,
    withdrawalRecord,
} from '@/db/schema'
```

**Add `firearm,`** to the named import list (insert between `distribution,` and `hemsRequest,` to maintain alphabetical order, or after `vehicle,` for low-disruption diff — D-01 notes order is non-semantic).

---

### 3. `src/app/(admin)/dashboard/_components/DashboardClient.tsx`

**Five surgical insertions inside the existing `useMemo` block (lines 198-280).**

---

#### Change A — Destructure `firearms` from `summary`

**Existing destructure pattern** (lines 71-83):
```typescript
const bankAccounts = summary?.bankAccounts ?? []
const investmentAccounts = summary?.investmentAccounts ?? []
const homesteads = summary?.homesteads ?? []
const rentalProperties = summary?.rentalProperties ?? []
const vehicles = summary?.vehicles ?? []
const personalProperties = summary?.personalProperties ?? []
const insurancePolicies = summary?.insurancePolicies ?? []
```

**Add after `insurancePolicies` line (after line 77):**
```typescript
const firearms = summary?.firearms ?? []
```

---

#### Change B — `firearmTotal` computation inside `useMemo`

**Template — vehicleTotal** (lines 211-213):
```typescript
const vehicleTotal = sumStrings(
    vehicles.map((v) => v.dodValue ?? '0'),
)
```

**Add after `insuranceTotal` (after line 219), before `liabilityTotal`:**
```typescript
const firearmTotal = sumStrings(
    firearms.map((f) => f.dodValue ?? '0'),
)
```

---

#### Change C — Include `firearmTotal` in `assetTotal`

**Existing `assetTotal` sumStrings array** (lines 223-230):
```typescript
const assetTotal = sumStrings([
    bankTotal,
    investTotal,
    realEstateTotal,
    vehicleTotal,
    personalPropertyTotal,
    insuranceTotal,
])
```

**Add `firearmTotal,` after `insuranceTotal,`:**
```typescript
const assetTotal = sumStrings([
    bankTotal,
    investTotal,
    realEstateTotal,
    vehicleTotal,
    personalPropertyTotal,
    insuranceTotal,
    firearmTotal,
])
```

---

#### Change D — Add `'Firearms'` entry to `allocationData`

**Template — Vehicles entry** (lines 249-253):
```typescript
{
    name: 'Vehicles',
    value: toCents(vehicleTotal) / 100,
    fill: 'var(--chart-4)',
},
```

**Template — Insurance entry** (lines 259-263, last existing entry):
```typescript
{
    name: 'Insurance',
    value: toCents(insuranceTotal) / 100,
    fill: 'var(--chart-1)',
},
```

**Add after the Insurance entry, before `.filter(...)`:**
```typescript
{
    name: 'Firearms',
    value: toCents(firearmTotal) / 100,
    fill: 'var(--chart-2)',
},
```

Per D-04: `var(--chart-2)` continues the wrap pattern (Insurance already wraps back to `--chart-1`). The `.filter((item) => item.value > 0)` on line 264 already suppresses zero-value slices — no change needed there.

---

#### Change E — Add `firearms` to `useMemo` dependency array

**Existing dependency array** (lines 271-280):
```typescript
}, [
    bankAccounts,
    investmentAccounts,
    homesteads,
    rentalProperties,
    vehicles,
    personalProperties,
    insurancePolicies,
    liabilities,
])
```

**Add `firearms,` after `insurancePolicies,`:**
```typescript
}, [
    bankAccounts,
    investmentAccounts,
    homesteads,
    rentalProperties,
    vehicles,
    personalProperties,
    insurancePolicies,
    firearms,
    liabilities,
])
```

---

## Shared Patterns

### Schema import source
All three files import from `@/db/schema`. The `firearm` table is exported at line 1466 of `db/schema.ts` with `entityId`, `name`, `description`, `dodValue`, `status`, `transferStatus`, and `updatedAt` columns — all fields used in the mapper and totals are confirmed present.

### Entity-scoped query pattern
All asset queries in both routers use the same `db.select().from(<table>).where(eq(<table>.entityId, entityId))` shape — no deviation for firearm.

### `dodValue` as canonical estate value
`asset.ts` uses `dodValue` for vehicle, homestead, rentalProperty, personalProperty. Firearm follows the same convention (D-06). `bankAccount`/`investmentAccount` use `currentBalance ?? dodValue`; `insurancePolicy` uses `coverageAmount` — these are not applicable to firearm.

---

## No Analog Found

None. All three modifications have direct in-file analogs.

---

## Metadata

**Analog search scope:** `src/server/trpc/routers/`, `src/app/(admin)/dashboard/_components/`, `db/schema.ts`
**Files read:** 5 (`31-CONTEXT.md`, `asset.ts`, `dashboard.ts`, `DashboardClient.tsx`, `db/schema.ts` lines 1466-1570)
**Schema confirmed:** `firearm` table exported from `@/db/schema`, has `entityId`, `name`, `description`, `dodValue`, `status`, `transferStatus`, `updatedAt`
**Pattern extraction date:** 2026-05-22
