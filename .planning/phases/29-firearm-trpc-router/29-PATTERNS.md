# Phase 29: firearm-trpc-router — Pattern Map

**Mapped:** 2026-05-21
**Files analyzed:** 3
**Analogs found:** 3 / 3

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/server/trpc/routers/firearm.ts` | router (composite) | CRUD + state-machine | `src/server/trpc/routers/vehicle.ts` (4-procedure shape), `src/server/trpc/routers/hemsRequest.ts` (CQS mutation), `src/server/trpc/routers/userManagement.ts` (unique-violation predicate) | exact (multi-source composite) |
| `src/server/trpc/router.ts` | config | registration | `src/server/trpc/router.ts` itself (existing file, surgical insert) | exact |
| `tests/trpc/firearm.test.ts` | integration test | CRUD + auth gate | `tests/trpc/trustee.test.ts` (compact CRUD + beneficiary rejection), `tests/trpc/hemsRequest.test.ts` (TRPCError try/catch assertion pattern, `describe.skipIf`, entity cleanup) | role-match |

---

## Pattern Assignments

### `src/server/trpc/routers/firearm.ts` (router, CRUD + state-machine)

This file is a composite of three analogs. Each section below names its source.

---

#### Source 1: `src/server/trpc/routers/vehicle.ts` — 4-procedure template

**Full file** (81 lines — read once, excerpt below):

**Imports pattern** (`vehicle.ts` lines 1–7):
```typescript
import { TRPCError } from '@trpc/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { vehicle } from '@/db/schema'
import { insertVehicleSchema, updateVehicleSchema } from '@/db/validation'
import { adminProcedure, createTRPCRouter } from '../init'
```

Replace with for firearm:
```typescript
import { TRPCError } from '@trpc/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { firearm } from '@/db/schema'
import { insertFirearmSchema, insertFirearmSchemaBase } from '@/db/validation'
import { adminProcedure, createTRPCRouter } from '../init'
```

Note: import `insertFirearmSchemaBase` (not `updateFirearmSchema`) — the router builds its own
partial inline to exclude `nfaTransferStatus`. `insertFirearmSchemaBase` is a `const` (not
`export const`) at `db/validation.ts` line 257. **The planner must add `export` before that `const`
in `db/validation.ts`** so the router can import it.

**`list` procedure** (`vehicle.ts` lines 10–17) — copy verbatim, swap identifiers:
```typescript
list: adminProcedure
    .input(z.object({ entityId: z.coerce.number() }))
    .query(({ input }) =>
        db
            .select()
            .from(vehicle)
            .where(eq(vehicle.entityId, input.entityId)),
    ),
```

**`create` procedure** (`vehicle.ts` lines 19–32) — copy, wrap in try/catch for 23505:
```typescript
create: adminProcedure
    .input(insertVehicleSchema)
    .mutation(async ({ input }) => {
        const [created] = await db
            .insert(vehicle)
            .values({ ...input, updatedAt: new Date().toISOString() })
            .returning()
        if (!created)
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to create vehicle',
            })
        return created
    }),
```
In `firearm.ts`, this becomes `try { ... if (!created) throw INTERNAL_SERVER_ERROR ... return created } catch (err) { if (isFirearmSerialConflict(err)) throw CONFLICT; throw err }`.

**`update` procedure** (`vehicle.ts` lines 34–59) — copy structure; replace `updateVehicleSchema` with the inline partial (see D-03 section below); wrap in try/catch for both TRPCError re-throw and 23505:
```typescript
update: adminProcedure
    .input(
        z.object({
            id: z.coerce.number(),
            entityId: z.coerce.number(),
            data: updateVehicleSchema,   // ← replaced with inline partial in firearm.ts
        }),
    )
    .mutation(async ({ input }) => {
        const [updated] = await db
            .update(vehicle)
            .set({ ...input.data, updatedAt: new Date().toISOString() })
            .where(
                and(
                    eq(vehicle.id, input.id),
                    eq(vehicle.entityId, input.entityId),
                ),
            )
            .returning()
        if (!updated)
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Vehicle not found in this entity',
            })
        return updated
    }),
```

**`delete` procedure** (`vehicle.ts` lines 61–79) — copy verbatim, swap identifiers:
```typescript
delete: adminProcedure
    .input(z.object({ id: z.coerce.number(), entityId: z.coerce.number() }))
    .mutation(async ({ input }) => {
        const [deleted] = await db
            .delete(vehicle)
            .where(
                and(
                    eq(vehicle.id, input.id),
                    eq(vehicle.entityId, input.entityId),
                ),
            )
            .returning()
        if (!deleted)
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Vehicle not found in this entity',
            })
        return deleted
    }),
```

---

#### D-03 Critical: `update.input.data` schema construction

`updateFirearmSchema` (line 474 in `db/validation.ts`) stacks two refinements. In Zod v4,
`.omit()` on a refined schema throws at runtime. The `update.input.data` field must be built
inline from `insertFirearmSchemaBase`:

```typescript
data: insertFirearmSchemaBase
    .omit({ nfaTransferStatus: true })
    .partial()
    .refine(
        (data) => Object.values(data).some((v) => v !== undefined),
        { message: 'Update requires at least one field to be provided' },
    ),
```

`insertFirearmSchemaBase` is defined at `db/validation.ts` lines 257–267. It is currently `const`
(no `export`). The planner must add `export` to that declaration before the router can import it.

The NFA-conditional refine (`!data.isNfa || data.nfaClass != null`) from `updateFirearmSchema` is
intentionally NOT re-applied here because `update` is a partial patch path — if the caller sets
`isNfa: true` without touching `nfaClass`, the existing DB value provides the constraint. The DB-
level CHECK constraint (`db/schema.ts` line 1540–1543) enforces this as defense-in-depth.

---

#### `byId` with relations + NOT_FOUND guard

The `byId` pattern is **not present in `vehicle.ts`**. Source is `hemsRequest.ts` lines 71–80 for
the `db.query.X.findFirst` shape, plus the ROADMAP binding contract that mandates a NOT_FOUND throw
(which `hemsRequest.byId` does not include — deliberate deviation):

**`hemsRequest.byId`** (`hemsRequest.ts` lines 71–80) — base shape:
```typescript
byId: adminProcedure
    .input(z.object({ id: z.coerce.number(), entityId: z.coerce.number() }))
    .query(async ({ input }) => {
        return db.query.hemsRequest.findFirst({
            where: and(
                eq(hemsRequest.id, input.id),
                eq(hemsRequest.entityId, input.entityId),
            ),
        })
    }),
```

For `firearm.byId`, add the NOT_FOUND guard AND the relations eager-load (ROADMAP SC-3):
```typescript
byId: adminProcedure
    .input(z.object({ id: z.coerce.number(), entityId: z.coerce.number() }))
    .query(async ({ input }) => {
        const result = await db.query.firearm.findFirst({
            where: and(
                eq(firearm.id, input.id),
                eq(firearm.entityId, input.entityId),
            ),
            with: { entity: true, valuations: true, documents: true },
        })
        if (!result)
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Firearm not found in this entity',
            })
        return result
    }),
```

The `firearmRelations` in `db/relations.ts` (Phase 28-01) and the `{ schema: { ...schema, ...relations } }` initialization in `db/index.ts` make `db.query.firearm` available immediately.

---

#### Source 2: `src/server/trpc/routers/userManagement.ts` — `isFirearmSerialConflict` predicate

**`isBeneficiaryLinkUniqueViolation` predicate** (`userManagement.ts` lines 29–39) — direct template:

```typescript
function isBeneficiaryLinkUniqueViolation(err: unknown): boolean {
    return (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code?: string }).code === '23505' &&
        'constraint' in err &&
        (err as { constraint?: string }).constraint ===
            'user_profile_beneficiary_id_uniq'
    )
}
```

Replicate as `isFirearmSerialConflict` — substitute constraint name:
```typescript
function isFirearmSerialConflict(err: unknown): boolean {
    return (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code?: string }).code === '23505' &&
        'constraint' in err &&
        (err as { constraint?: string }).constraint === 'firearm_serial_number_key'
    )
}
```

Constraint name `firearm_serial_number_key` confirmed at `db/schema.ts` line 1527 via `uniqueIndex('firearm_serial_number_key')`.

This function lives at the **top of `firearm.ts`** before the router export — identical placement to
`userManagement.ts` lines 29–39.

**try/catch shape for `create`:**
```typescript
try {
    const [created] = await db.insert(firearm).values(...).returning()
    if (!created) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', ... })
    return created
} catch (err) {
    if (isFirearmSerialConflict(err))
        throw new TRPCError({ code: 'CONFLICT', message: 'A firearm with this serial number already exists.' })
    throw err
}
```

**try/catch shape for `update`** — must re-throw `TRPCError` first (NOT_FOUND guard runs inside the try, so it will be a TRPCError instance; swallowing it as a CONFLICT would be wrong):
```typescript
} catch (err) {
    if (err instanceof TRPCError) throw err
    if (isFirearmSerialConflict(err))
        throw new TRPCError({ code: 'CONFLICT', message: 'A firearm with this serial number already exists.' })
    throw err
}
```

---

#### Source 3: `src/server/trpc/routers/hemsRequest.ts` — `setNfaTransferStatus` CQS mutation

**`markDistributed` mutation** (`hemsRequest.ts` lines 211–266) — the cleanest CQS precedent (no Sentry instrumentation, simple preflight + update):

```typescript
markDistributed: adminProcedure
    .input(
        z.object({
            id: z.coerce.number(),
            entityId: z.coerce.number(),
        }),
    )
    .mutation(async ({ input }) => {
        const existing = await db.query.hemsRequest.findFirst({
            where: and(
                eq(hemsRequest.id, input.id),
                eq(hemsRequest.entityId, input.entityId),
            ),
        })
        if (!existing)
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'HEMS request not found in this entity',
            })
        if (existing.status !== 'APPROVED') {
            throw new TRPCError({
                code: 'CONFLICT',
                message: `Cannot mark distributed: current status is ${existing.status}. Request must be APPROVED first.`,
            })
        }
        const [updated] = await db
            .update(hemsRequest)
            .set({ status: 'DISTRIBUTED', updatedAt: new Date().toISOString() })
            .where(and(eq(hemsRequest.id, input.id), eq(hemsRequest.entityId, input.entityId)))
            .returning()
        if (!updated)
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to mark request distributed' })
        return updated
    }),
```

`setNfaTransferStatus` follows the same preflight-then-update shape. Differences from `markDistributed`:

1. Additional optional input fields (`taxStampDate`, `atfControlNumber`) — conditional spread into `updates` object
2. `nfaTransferStatus` enum values from `db/schema.ts` lines 215–219: `'NOT_FILED' | 'FILED' | 'APPROVED'`
3. NFA guard (Finding 6, Claude's discretion): preflight checks `existing.isNfa` and throws `BAD_REQUEST` if false
4. No CONFLICT pre-check on current status (any NFA status can be re-set)

The CONTEXT.md sketch (`setNfaTransferStatus` body, lines 88–119) is already well-formed — the planner should use it directly, adding the NFA guard from RESEARCH Finding 6 at lines 345–355 between the NOT_FOUND check and the `updates` construction.

---

### `src/server/trpc/router.ts` (config, surgical insert)

**Full file** (73 lines — read once):

**Import block** (lines 1–27) — alphabetical position for `firearmRouter`:

Current order relevant to insertion:
```typescript
// line 10:
import { entityRouter } from './routers/entity'
// line 11:
import { hemsRequestRouter } from './routers/hemsRequest'
```

`firearm` sorts between `entity` and `hemsRequest` alphabetically. Insert between those two lines:
```typescript
import { entityRouter } from './routers/entity'
import { firearmRouter } from './routers/firearm'   // ← INSERT HERE (line 11)
import { hemsRequestRouter } from './routers/hemsRequest'
```

**`appRouter` registration block** (lines 29–70) — Assets section is lines 35–43:

```typescript
// Assets (pure CRUD)
bankAccount: bankAccountRouter,       // line 36
investmentAccount: investmentAccountRouter,  // line 37
homestead: homesteadRouter,           // line 38
rentalProperty: rentalPropertyRouter, // line 39
vehicle: vehicleRouter,               // line 40
personalProperty: personalPropertyRouter, // line 41
insurancePolicy: insurancePolicyRouter,   // line 42
```

Per RESEARCH Finding 4, `firearm` (alphabetically after `bankAccount`/`investmentAccount`, before `homestead`) inserts at line 38:
```typescript
// Assets (pure CRUD)
bankAccount: bankAccountRouter,
investmentAccount: investmentAccountRouter,
firearm: firearmRouter,          // ← INSERT HERE (between investmentAccount and homestead)
homestead: homesteadRouter,
rentalProperty: rentalPropertyRouter,
vehicle: vehicleRouter,
personalProperty: personalPropertyRouter,
insurancePolicy: insurancePolicyRouter,
```

---

### `tests/trpc/firearm.test.ts` (integration test, NEW)

Primary analog: `tests/trpc/trustee.test.ts` (compact, uses both `adminCaller` + `beneficiaryCaller`, clean beforeAll/afterAll). Secondary for TRPCError assertion style: `tests/trpc/hemsRequest.test.ts`.

---

#### Imports pattern (`trustee.test.ts` lines 1–12 + `hemsRequest.test.ts` lines 1–16):

```typescript
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { TRPCError } from '@trpc/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { entity, firearm } from '@/db/schema'
import { createCallerFactory } from '@/server/trpc/init'
import { appRouter } from '@/server/trpc/router'
import { isProductionDb } from '../helpers/db-guard'
import {
    createAdminContext,
    createBeneficiaryContext,
} from '../helpers/mock-context'
```

---

#### Caller factory pattern (`trustee.test.ts` lines 15–36):

```typescript
const TEST_TIMEOUT = 30000
const createCaller = createCallerFactory(appRouter)
const TS = Date.now().toString().slice(-8)

function adminCaller() {
    return createCaller(
        createAdminContext({
            id: '991',
            name: 'Trustee Test Admin',
            email: 'trustee-admin@test.com',
        }),
    )
}

function beneficiaryCaller() {
    return createCaller(
        createBeneficiaryContext(null, {
            id: '992',
            name: 'Trustee Test Ben',
            email: 'trustee-ben@test.com',
        }),
    )
}
```

For `firearm.test.ts`, use distinct IDs/emails (e.g. `'981'`, `'982'`, `'firearm-admin@test.com'`, `'firearm-ben@test.com'`).

---

#### `ids` object + `describe.skipIf` pattern (`trustee.test.ts` lines 38–46):

```typescript
const ids = {
    entityId: null as number | null,
    // ...fixture row IDs
}

describe.skipIf(isProductionDb)('firearm router', () => {
```

---

#### `beforeAll` + `afterAll` pattern

`beforeAll` inserts a test entity via `db.insert(entity).values({...}).returning()` — exact shape from `trustee.test.ts` lines 47–58.

`afterAll` cleanup order (derived from `hemsRequest.test.ts` lines 184–207 pattern — delete child rows by entityId before deleting entity):

```typescript
afterAll(async () => {
    if (ids.entityId) {
        await db.delete(firearm).where(eq(firearm.entityId, ids.entityId))
    }
    if (ids.entityId) {
        await db.delete(entity).where(eq(entity.id, ids.entityId))
    }
}, TEST_TIMEOUT)
```

Important: delete firearm rows by `entityId` (not by individual tracked IDs) to catch any rows created in tests without tracking — consistent with the MEMORY note "delete distributions by entityId (not by tracked IDs) to catch auto-created ones".

---

#### TRPCError assertion pattern — `try/catch` style

From `hemsRequest.test.ts` lines 228–241 (used for every non-happy-path assertion):

```typescript
test(
    'throws NOT_FOUND when entityId does not match',
    async () => {
        const caller = adminCaller()
        try {
            await caller.hemsRequest.markDistributed({
                id: testData.approvedRequestId!,
                entityId: 999999,
            })
            expect(true).toBe(false)  // force fail if no throw
        } catch (err) {
            expect(err).toBeInstanceOf(TRPCError)
            expect((err as TRPCError).code).toBe('NOT_FOUND')
            expect((err as TRPCError).message).toMatch(/not found/i)
        }
    },
    TEST_TIMEOUT,
)
```

Use this pattern for: SC-2 (CONFLICT on duplicate serial), SC-3 (NOT_FOUND on wrong entity).

---

#### Beneficiary rejection pattern (SC-4) — `.rejects.toThrow()` style

From `trustee.test.ts` lines 170–182:

```typescript
test(
    'rejects non-admin context',
    async () => {
        const caller = beneficiaryCaller()
        await expect(
            caller.trustee.reorder({
                entityId: ids.entityId as number,
                orderedIds: [ids.t1 as number],
            }),
        ).rejects.toThrow()
    },
    TEST_TIMEOUT,
)
```

For SC-4, use `.rejects.toThrow()` (no message matcher) — consistent with codebase convention for `adminProcedure` rejection tests. No `FORBIDDEN`/`UNAUTHORIZED` string matcher needed; the procedure will throw a TRPCError regardless. Cover all 5 non-`setNfaTransferStatus` procedures in a single describe block for brevity (or one test per procedure — planner decides granularity).

Note: `createBeneficiaryContext` signature: `createBeneficiaryContext(beneficiaryId: number | null, overrides?)` — pass `null` as first arg since firearm tests don't need a real beneficiary row.

---

#### 23505 CONFLICT test — derived pattern (no existing asset analog)

No existing asset router test demonstrates a 23505 → CONFLICT path. The closest semantic analog is the NOT_FOUND try/catch in `hemsRequest.test.ts`. Use the same `try/catch` structure for SC-2:

```typescript
test(
    'create rejects duplicate serial number with CONFLICT',
    async () => {
        const caller = adminCaller()
        // create first — must succeed
        await caller.firearm.create({
            entityId: ids.entityId!,
            name: 'Duplicate Serial Test',
            make: 'TestMake',
            model: 'TestModel',
            serialNumber: `DUPE${TS}`,
            // ... minimal valid fields
        })
        // attempt duplicate — must throw CONFLICT
        try {
            await caller.firearm.create({
                entityId: ids.entityId!,
                name: 'Duplicate Serial Test 2',
                make: 'TestMake',
                model: 'TestModel',
                serialNumber: `DUPE${TS}`,  // same serial
                // ...
            })
            expect(true).toBe(false)
        } catch (err) {
            expect(err).toBeInstanceOf(TRPCError)
            expect((err as TRPCError).code).toBe('CONFLICT')
            expect((err as TRPCError).message).toMatch(/serial number/i)
        }
    },
    TEST_TIMEOUT,
)
```

---

## Shared Patterns

### `adminProcedure` — all mutations and queries in `firearm.ts`
**Source:** `src/server/trpc/init.ts` line 221
**Apply to:** All 6 procedures in `firearmRouter`
All procedures use `adminProcedure` — this admits `admin`, `trustee`, `arbiter` roles and rejects `beneficiary` and `user` with FORBIDDEN. No `beneficiaryProcedure` variant needed.

### Entity-scoped WHERE clause
**Source:** Every router in `src/server/trpc/routers/` — universal codebase pattern
**Apply to:** `list`, `byId`, `update`, `delete`, `setNfaTransferStatus`
All queries filter by `eq(firearm.entityId, input.entityId)`. Mutations use `and(eq(firearm.id, input.id), eq(firearm.entityId, input.entityId))`. This is the "Entity ID Validation Pattern" memorialized in MEMORY.md.

### `updatedAt: new Date().toISOString()` on all writes
**Source:** `vehicle.ts` lines 24, 45; `hemsRequest.ts` lines 87, 108, 248
**Apply to:** `create`, `update`, `delete` (returning row), `setNfaTransferStatus`
Every mutation that writes a row sets `updatedAt` to `new Date().toISOString()` in the `.values()` or `.set()` call.

### `describe.skipIf(isProductionDb)` gate
**Source:** Every file in `tests/trpc/` — universal test convention
**Apply to:** All describe blocks in `firearm.test.ts`
The guard (`tests/helpers/db-guard.ts` lines 2–6) checks if `DATABASE_URL` lacks a branch slug. The test branch DB already has the `firearm` table (Phase 28-02 confirmed).

---

## Prerequisite: `insertFirearmSchemaBase` must be exported

**Current state:** `db/validation.ts` line 257 reads `const insertFirearmSchemaBase = ...` (no `export`).

**Required change:** The planner must add `export` to that declaration:
```typescript
// db/validation.ts line 257 — change from:
const insertFirearmSchemaBase = createInsertSchema(firearm, {
// to:
export const insertFirearmSchemaBase = createInsertSchema(firearm, {
```

This change is a prerequisite for `src/server/trpc/routers/firearm.ts` to compile. It is a 1-word modification to an existing file, not a new file. The planner should include it as the first action in the implementation wave.

---

## No Analog Found

None. All three files have direct codebase analogs.

---

## Metadata

**Analog search scope:** `src/server/trpc/routers/`, `tests/trpc/`, `tests/helpers/`, `db/validation.ts`, `db/schema.ts`
**Files scanned:** 10 (vehicle.ts, hemsRequest.ts, userManagement.ts, router.ts, trustee.test.ts, hemsRequest.test.ts, liability.test.ts, crud-core-assets.test.ts, mock-context.ts, db-guard.ts, validation.ts, schema.ts)
**Pattern extraction date:** 2026-05-21
