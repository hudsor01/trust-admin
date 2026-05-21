# Phase 29: firearm-trpc-router — Research

**Researched:** 2026-05-21
**Domain:** tRPC v11 / Drizzle 0.45 / Zod v4 — asset router implementation
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01**: Exactly 6 procedures: `list`, `byId`, `create`, `update`, `delete`, `setNfaTransferStatus`. No forward-API helpers.
- **D-02**: `setNfaTransferStatus({ id, entityId, status, taxStampDate?, atfControlNumber? })` — dedicated `adminProcedure` mutation, CQS pattern from `hemsRequest.approve`.
- **D-03**: `nfaTransferStatus` OMITTED from generic `update` input shape.
- **D-04**: `setNfaTransferStatus` enforces `eq(firearm.entityId, input.entityId)` in WHERE; throws `NOT_FOUND` on empty `.returning()`.
- **D-05**: `firearm.byId` eager-loads `with: { entity: true, valuations: true, documents: true }`.
- **D-06**: `list`, `create`, `update`, `delete` follow `vehicleRouter` verbatim.
- **D-07**: Registered as `firearm: firearmRouter` in `router.ts`, alphabetically placed.
- **D-08**: Local `isFirearmSerialConflict(err)` predicate for `23505` → `CONFLICT` mapping (constraint = `firearm_serial_number_key`).
- **D-09** [Claude's Discretion]: Activity-log emission assumed handled by existing infrastructure; verify before planning.

### Claude's Discretion

- Whether `setNfaTransferStatus` should guard `isNfa = true` before allowing status transitions (NFA-guard question).

### Deferred Ideas (OUT OF SCOPE)

- Forward-API helpers (`firearm.byDocumentId`, `firearm.listByNfaClass`)
- Cross-asset transfer-status guardrail (block `COMPLETE` when `nfaTransferStatus !== 'APPROVED'`)
- Activity-log explicit emission (only if D-09 verification shows manual emit is needed)
- Document-attachment FK enforcement in router
</user_constraints>

---

## Summary

Phase 29 is a pure backend phase: one new file (`src/server/trpc/routers/firearm.ts`) and two lines in `src/server/trpc/router.ts`. The schema and relations are fully wired from Phase 28 — `db.query.firearm.findFirst({ with: { entity, valuations, documents } })` will work immediately because `db/index.ts` initializes Drizzle with `{ schema: { ...schema, ...relations } }` and `firearmRelations` is already defined in `db/relations.ts`.

There are three net-new findings that CONTEXT.md does not address and the planner must act on:

1. **D-03 implementation constraint (CRITICAL):** `updateFirearmSchema.omit({ nfaTransferStatus: true })` will throw at runtime in Zod v4. The router's `update.input` must build its data schema by calling `insertFirearmSchemaBase.omit({ nfaTransferStatus: true }).partial().refine(...)` inline — not via `updateFirearmSchema.omit()`. Verified by live runtime test.

2. **D-09 resolution (CONFIRMED SAFE):** No activity logging is needed in the firearm router. Zero asset routers (`vehicle`, `homestead`, `bankAccount`, `personalProperty`, `rentalProperty`, `investmentAccount`, `insurancePolicy`) call `createActivityLog`. Only `userManagement.ts` does (user lifecycle events). No DB triggers exist for auto-logging. The firearm router follows the same pattern as all other asset routers: no explicit logging.

3. **ROADMAP byId contract vs codebase pattern (ACTION REQUIRED):** ROADMAP success criterion #3 explicitly requires `byId` to throw `NOT_FOUND` when the ID does not belong to the entity. The codebase pattern (`liability.byId`, `hemsRequest.byId`) returns `undefined` without throwing. The ROADMAP criterion is binding. The `byId` implementation must check the `findFirst` result and throw `TRPCError({ code: 'NOT_FOUND' })` on `undefined` — a small but deliberate deviation from the raw `liability.byId` pattern.

**Primary recommendation:** Write `src/server/trpc/routers/firearm.ts` with `vehicleRouter` as the template for 4 procedures, `hemsRequest.ts` for `setNfaTransferStatus`, `userManagement.ts` for the `isFirearmSerialConflict` predicate, and one post-`findFirst` NOT_FOUND guard in `byId`. Register in the Assets section of `router.ts` between `bankAccount` and `homestead`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Firearm list / CRUD | API / Backend (tRPC) | Database (RLS) | All asset mutation lives at the tRPC layer; RLS is defense-in-depth |
| NFA status transition | API / Backend (tRPC) | — | CQS: dedicated mutation, not a generic field edit |
| Entity-scoped isolation | API / Backend (tRPC) | Database (RLS, `app.is_admin()`) | WHERE clause + RLS both enforce entityId; tRPC layer is primary |
| Serial-number uniqueness | Database (unique index) | API / Backend (tRPC, CONFLICT mapping) | Enforced at DB; router maps the 23505 to a client-readable CONFLICT |
| Relation eager-loading | API / Backend (tRPC, `db.query`) | — | Drizzle relational query builder in the byId procedure |

---

## Standard Stack

No new packages. Everything is already in `package.json`.

| Component | Version | Source |
|-----------|---------|--------|
| `@trpc/server` | 11.17.0 | package.json [VERIFIED] |
| `drizzle-orm` | 0.45.x | package.json [VERIFIED] |
| `zod` | 4.4.3 | package.json [VERIFIED] |
| `drizzle-zod` | 0.8.3 | package.json [VERIFIED] |

**Installation:** None required.

---

## Package Legitimacy Audit

No packages are added in this phase. Section skipped.

---

## Architecture Patterns

### Recommended File Layout

```
src/server/trpc/routers/
└── firearm.ts          # new — the complete firearmRouter
src/server/trpc/
└── router.ts           # modified — add firearm: firearmRouter import + registration
```

### Pattern 1: Standard Asset Router (D-06 — vehicleRouter verbatim)

Four of six procedures are direct copies from `vehicle.ts`. The only structural additions are: (a) `byId` with relations eager-loading + NOT_FOUND guard, (b) `setNfaTransferStatus` CQS mutation, (c) `isFirearmSerialConflict` predicate wrapping `create` and `update`.

```typescript
// Source: src/server/trpc/routers/vehicle.ts (live codebase) [VERIFIED]
import { TRPCError } from '@trpc/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { firearm } from '@/db/schema'
import { insertFirearmSchema, insertFirearmSchemaBase } from '@/db/validation'
import { adminProcedure, createTRPCRouter } from '../init'

function isFirearmSerialConflict(err: unknown): boolean {
    return (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code?: string }).code === '23505' &&
        'constraint' in err &&
        (err as { constraint?: string }).constraint ===
            'firearm_serial_number_key'
    )
}

export const firearmRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number() }))
        .query(({ input }) =>
            db.select().from(firearm).where(eq(firearm.entityId, input.entityId)),
        ),

    // byId: see Pattern 2 below

    create: adminProcedure
        .input(insertFirearmSchema)
        .mutation(async ({ input }) => {
            try {
                const [created] = await db
                    .insert(firearm)
                    .values({ ...input, updatedAt: new Date().toISOString() })
                    .returning()
                if (!created)
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: 'Failed to create firearm',
                    })
                return created
            } catch (err) {
                if (isFirearmSerialConflict(err))
                    throw new TRPCError({
                        code: 'CONFLICT',
                        message: 'A firearm with this serial number already exists.',
                    })
                throw err
            }
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                entityId: z.coerce.number(),
                data: insertFirearmSchemaBase   // ← SEE CRITICAL NOTE BELOW
                    .omit({ nfaTransferStatus: true })
                    .partial()
                    .refine(
                        (data) => Object.values(data).some((v) => v !== undefined),
                        { message: 'Update requires at least one field to be provided' },
                    ),
            }),
        )
        .mutation(async ({ input }) => {
            try {
                const [updated] = await db
                    .update(firearm)
                    .set({ ...input.data, updatedAt: new Date().toISOString() })
                    .where(
                        and(
                            eq(firearm.id, input.id),
                            eq(firearm.entityId, input.entityId),
                        ),
                    )
                    .returning()
                if (!updated)
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Firearm not found in this entity',
                    })
                return updated
            } catch (err) {
                if (err instanceof TRPCError) throw err
                if (isFirearmSerialConflict(err))
                    throw new TRPCError({
                        code: 'CONFLICT',
                        message: 'A firearm with this serial number already exists.',
                    })
                throw err
            }
        }),

    delete: adminProcedure
        .input(z.object({ id: z.coerce.number(), entityId: z.coerce.number() }))
        .mutation(async ({ input }) => {
            const [deleted] = await db
                .delete(firearm)
                .where(
                    and(eq(firearm.id, input.id), eq(firearm.entityId, input.entityId)),
                )
                .returning()
            if (!deleted)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Firearm not found in this entity',
                })
            return deleted
        }),
})
```

### Pattern 2: byId with Eager Loading + NOT_FOUND Guard

```typescript
// Source: liability.ts byId (codebase) + ROADMAP success criterion #3 [VERIFIED]
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

**Note:** `liability.byId` and `hemsRequest.byId` return `undefined` without throwing. The firearm `byId` MUST throw — ROADMAP success criterion #3 is explicit. This is a deliberate departure from those analogs.

### Pattern 3: setNfaTransferStatus (CQS mutation)

Sourced from CONTEXT.md D-02 / hemsRequest.approve pattern. The `updates` object is built conditionally to avoid writing `undefined` fields. [VERIFIED against hemsRequest.ts `markDistributed` pattern]

### Pattern 4: router.ts Registration

The Assets (pure CRUD) section in `router.ts` is currently:

```
bankAccount, investmentAccount, homestead, rentalProperty, vehicle, personalProperty, insurancePolicy
```

Alphabetically `firearm` sorts between `bankAccount` and `homestead`. Insert there:

```typescript
// After bankAccount + investmentAccount, before homestead:
firearm: firearmRouter,
```

Import line alphabetically: after `entityRouter` import, before `hemsRequestRouter` import. [VERIFIED from live router.ts]

### Anti-Patterns to Avoid

- **`updateFirearmSchema.omit({ nfaTransferStatus: true })`** — throws `".omit() cannot be used on object schemas containing refinements"` in Zod v4. Use `insertFirearmSchemaBase.omit({ nfaTransferStatus: true }).partial().refine(...)` instead. Verified by runtime test.
- **Implicit `db.query.firearm` without checking relations** — `db/index.ts` initializes Drizzle with `{ schema: { ...schema, ...relations } }` so `db.query.firearm` IS available. No extra wiring needed.
- **Returning `undefined` from byId without throwing** — the ROADMAP success criteria require a `NOT_FOUND` throw. The `liability.byId` precedent of returning `undefined` does not apply here.
- **`throw err` without re-checking `TRPCError instanceof`** — the `update` try/catch must re-throw `TRPCError` instances before the `isFirearmSerialConflict` check, otherwise a `NOT_FOUND` thrown by `.returning()` guard would be swallowed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 23505 unique-violation detection | Custom DB error parsing | `isFirearmSerialConflict()` predicate (local to firearm.ts) | Constraint name is stable; pattern is proven in `userManagement.ts` |
| NFA status transition | Field in generic update | `setNfaTransferStatus` dedicated mutation | CQS: single path to change, audit significance, future guardrail surface |
| Entity scoping | Manual userId check | `adminProcedure` + `eq(firearm.entityId, input.entityId)` WHERE clause | Two layers: tRPC role guard + DB WHERE; RLS is defense-in-depth |

---

## Research Findings: Net-New vs CONTEXT.md

### Finding 1: D-09 — Activity Logging (RESOLVED — NO ACTION NEEDED)

**Verdict:** No manual `createActivityLog` calls are needed in the firearm router.

**Evidence:**
- `createActivityLog` is imported and called only in `src/server/trpc/routers/userManagement.ts` (user lifecycle events: create, update, delete, role change) [VERIFIED: grep]
- Zero other routers import or call `createActivityLog` — not `vehicle`, `homestead`, `bankAccount`, `personalProperty`, `rentalProperty`, `investmentAccount`, `insurancePolicy` [VERIFIED: grep over all router files]
- No DB triggers exist for automatic activity log insertion — `db/migrations/` contains no trigger DDL; `004_immutable_activity_log.sql` only modifies RLS policies [VERIFIED: migration file contents]
- The `activity_log` table is populated manually by `userManagement` and by `createActivityLog` calls in `db/queries.ts` (for HEMS approval workflow), not via cross-cutting middleware
- `src/server/trpc/init.ts` contains no middleware-level activity log emission [VERIFIED: grep]

**Implication:** D-09's assumption is correct. The firearm router follows the exact pattern of all 7 existing asset routers: no activity logging in mutations.

### Finding 2: D-03 — `.omit()` on `updateFirearmSchema` (CRITICAL — IMPLEMENTATION CONSTRAINT)

**Verdict:** `updateFirearmSchema.omit({ nfaTransferStatus: true })` will throw at runtime. D-03 must be implemented differently.

**Root cause:** In Zod v4, `ZodObject.refine()` returns a `ZodObject` (not `ZodEffects` as in v3), but that `ZodObject` carries an internal refinement list. Calling `.omit()` on a `ZodObject` with refinements throws: `".omit() cannot be used on object schemas containing refinements"`. [VERIFIED: live Node.js test with Zod 4.4.3]

`updateFirearmSchema` is `requireAtLeastOneField(insertFirearmSchemaBase.partial().refine(...))` — two refinements stacked. It is NOT `.omit()`-able.

**Correct implementation for the `update.input.data` field:**

```typescript
data: insertFirearmSchemaBase
    .omit({ nfaTransferStatus: true })
    .partial()
    .refine(
        (data) => Object.values(data).some((v) => v !== undefined),
        { message: 'Update requires at least one field to be provided' },
    )
```

This builds the omitted partial schema inline from the unrefined base — same semantics as `updateFirearmSchema` but excluding `nfaTransferStatus`. [VERIFIED: live test]

**Note:** `insertFirearmSchemaBase` is exported from `db/validation.ts` as a named const — it's available for import in the router.

### Finding 3: byId NOT_FOUND Requirement (DEVIATION FROM CODEBASE TEMPLATE)

**Verdict:** ROADMAP success criterion #3 requires `byId` to throw `NOT_FOUND`. The codebase templates (`liability.byId`, `hemsRequest.byId`) return `undefined` without throwing. The success criterion is binding.

**Implementation:** After `db.query.firearm.findFirst(...)`, check if result is falsy and throw `TRPCError({ code: 'NOT_FOUND', message: 'Firearm not found in this entity' })`.

### Finding 4: Exact Router Registration Position (CONFIRMED)

**Verdict:** Insert in the `// Assets (pure CRUD)` section, between `bankAccount: bankAccountRouter` and `homestead: homesteadRouter`.

**Evidence:** router.ts lines 35-43 show the Assets section in non-alphabetical display order: `bankAccount, investmentAccount, homestead, rentalProperty, vehicle, personalProperty, insurancePolicy`. Alphabetically, `firearm` sorts after `bankAccount`/`bankAccount, investmentAccount` and before `homestead`. D-07's description of "between entity / hemsRequest" is imprecise — the correct position within the actual file structure is inside the Assets section. [VERIFIED: live router.ts + Python sort]

### Finding 5: Test Branch DB (CONFIRMED READY)

**Verdict:** The test branch DB already has the `firearm` table with all columns, enums, RLS, and FK columns on `document`/`valuation`. No test branch sync is needed for Phase 29.

**Evidence:** Phase 28-02 SUMMARY explicitly states: "Test branch DB synced to match production (Phase 29 tRPC tests can run)." `scripts/apply-0014-testbranch.ts` was executed. [VERIFIED: 28-02-SUMMARY.md]

### Finding 6: NFA Guard Question (RECOMMENDATION)

**Question from CONTEXT.md deferred section:** Should `setNfaTransferStatus` guard `isNfa = true` before allowing status transitions? The DB will accept `nfaTransferStatus = 'FILED'` on a non-NFA firearm (no constraint prevents it).

**Recommendation:** Add a router-layer guard in `setNfaTransferStatus`. A firearm with `isNfa = false` having `nfaTransferStatus = 'FILED'` is a data integrity issue — it creates misleading ATF Form 5 tracking records for non-NFA items. The guard is one `findFirst` call + one conditional throw, consistent with how `hemsRequest.approve` guards `existing.status !== 'PENDING'`. If the planner agrees, add:

```typescript
const existing = await db.query.firearm.findFirst({
    where: and(eq(firearm.id, input.id), eq(firearm.entityId, input.entityId)),
})
if (!existing)
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Firearm not found in this entity' })
if (!existing.isNfa)
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot set NFA transfer status on a non-NFA firearm' })
```

This is Claude's discretion — CONTEXT.md does not lock this either way. The planner should decide.

---

## Common Pitfalls

### Pitfall 1: `.omit()` on a Refined Schema (Zod v4)

**What goes wrong:** `updateFirearmSchema.omit({ nfaTransferStatus: true })` throws at runtime with `".omit() cannot be used on object schemas containing refinements"`.
**Why it happens:** `updateFirearmSchema` is `requireAtLeastOneField(base.partial().refine(...))` — two stacked refinements. Zod v4 blocks `.omit()` on such schemas.
**How to avoid:** Use `insertFirearmSchemaBase.omit({ nfaTransferStatus: true }).partial().refine(...)` inline in the router.
**Warning signs:** TypeScript will NOT catch this at compile time (`.omit()` is typed as available on `ZodObject` regardless of refinement state in Zod v4 types); the error is a runtime throw.

### Pitfall 2: Re-throwing TRPCError in try/catch with `isFirearmSerialConflict`

**What goes wrong:** If the `update` mutation's `try/catch` calls `isFirearmSerialConflict(err)` first before re-throwing `TRPCError`, a `NOT_FOUND` thrown by the `.returning()` guard will be swallowed and re-emitted as a `CONFLICT` (or fall through silently).
**Why it happens:** `NOT_FOUND` is a `TRPCError`, which doesn't have `.code === '23505'`, so `isFirearmSerialConflict` returns false. It falls through to `throw err` correctly — BUT only if you don't accidentally catch and re-wrap it. Pattern: check `instanceof TRPCError` first, re-throw immediately.
**How to avoid:** In the catch block: `if (err instanceof TRPCError) throw err;` before `if (isFirearmSerialConflict(err)) throw new TRPCError(...)`.

### Pitfall 3: Wrong Import for `insertFirearmSchemaBase`

**What goes wrong:** Router imports `insertFirearmSchema` but needs `insertFirearmSchemaBase` for the update input construction. `insertFirearmSchema` is the refined version — also not `.omit()`-able.
**How to avoid:** Import both `insertFirearmSchema` (for create) and `insertFirearmSchemaBase` (for update data shape construction) from `@/db/validation`.

### Pitfall 4: Missing `db.query.firearm` in db configuration

**What would go wrong:** If Drizzle was not initialized with relations, `db.query.firearm` would be undefined.
**Verified safe:** `db/index.ts` uses `{ schema: { ...schema, ...relations } }` — `firearmRelations` from `db/relations.ts` is already included. `db.query.firearm.findFirst({ with: { entity, valuations, documents } })` will work. [VERIFIED: db/index.ts lines 22-23, 49, 67, 75]

---

## Code Examples

### Complete `isFirearmSerialConflict` predicate

```typescript
// Source: userManagement.ts isBeneficiaryLinkUniqueViolation — direct pattern [VERIFIED]
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

**Constraint name confirmed:** `firearm_serial_number_key` — from `db/schema.ts` line 1527: `uniqueIndex('firearm_serial_number_key')`. [VERIFIED]

### Imports for firearm.ts

```typescript
import { TRPCError } from '@trpc/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { firearm } from '@/db/schema'
import { insertFirearmSchema, insertFirearmSchemaBase } from '@/db/validation'
import { adminProcedure, createTRPCRouter } from '../init'
```

### router.ts diff (imports + registration)

```typescript
// Add import (alphabetical — after entity, before hemsRequest):
import { firearmRouter } from './routers/firearm'

// Add to appRouter Assets section (between bankAccount and homestead):
// Assets (pure CRUD)
bankAccount: bankAccountRouter,
investmentAccount: investmentAccountRouter,
firearm: firearmRouter,        // ← INSERT HERE
homestead: homesteadRouter,
```

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | bun:test (built-in) |
| Config file | package.json `"test"` script |
| Quick run command | `bun test tests/trpc/firearm.test.ts` |
| Full suite command | `bun test --timeout 30000 tests/api tests/components tests/lib tests/trpc tests/*.test.ts` |

### Phase Requirements → Test Map

The 5 ROADMAP success criteria are the binding contract for Phase 29:

| Criterion | Behavior | Test Type | Automated Command | File Exists? |
|-----------|----------|-----------|-------------------|-------------|
| SC-1 | `firearm.list` returns entity-scoped rows | integration (tRPC caller) | `bun test tests/trpc/firearm.test.ts` | ❌ Wave 0 |
| SC-2 | `firearm.create` rejects duplicate serial → CONFLICT | integration (tRPC caller) | `bun test tests/trpc/firearm.test.ts` | ❌ Wave 0 |
| SC-3 | `firearm.byId` throws NOT_FOUND for wrong entity | integration (tRPC caller) | `bun test tests/trpc/firearm.test.ts` | ❌ Wave 0 |
| SC-4 | All 5 procedures reject beneficiary JWT (FORBIDDEN) | integration (tRPC caller) | `bun test tests/trpc/firearm.test.ts` | ❌ Wave 0 |
| SC-5 | `bun run typecheck` passes with 0 errors | typecheck | `bun run typecheck` | ✅ (command exists) |

### Sampling Rate

- **Per task commit:** `bun run typecheck` (fast, catches structural errors)
- **Per wave merge:** `bun test tests/trpc/firearm.test.ts` (requires test branch DB)
- **Phase gate:** Full suite green + typecheck before marking phase complete

### Wave 0 Gaps

- [ ] `tests/trpc/firearm.test.ts` — covers SC-1 through SC-4 using `createCallerFactory(appRouter)` + `createAdminContext()` / `createBeneficiaryContext()` from existing helpers. Uses `describe.skipIf(isProductionDb)` pattern consistent with all other tRPC tests.

**Test infrastructure notes:**
- `tests/trpc/` is already covered by the `bun test` script — no registration file to update.
- `createAdminContext` and `createBeneficiaryContext` helpers in `tests/helpers/mock-context.ts` require no changes — they already include all `AppUser` fields including `forcePasswordChange: false`.
- Test branch DB already has the `firearm` table (Phase 28-02 confirmed sync).
- Tests should use `describe.skipIf(isProductionDb)` — firearm tests write rows; must not run against production.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V4 Access Control | yes | `adminProcedure` — rejects `beneficiary`, `user` roles with FORBIDDEN |
| V5 Input Validation | yes | `insertFirearmSchema` (Zod v4) on create; `insertFirearmSchemaBase.omit(...).partial().refine(...)` on update |
| V2 Authentication | no | Handled by `protectedProcedure` (parent of `adminProcedure`) — no new auth surface |
| V6 Cryptography | no | No secrets or tokens involved |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-entity ID access (firearm in entity A accessed via entity B's session) | Tampering | `eq(firearm.entityId, input.entityId)` in ALL WHERE clauses + RLS `app.is_admin()` policy |
| Serial number collision on concurrent create | Tampering | `isFirearmSerialConflict` catches 23505 race after Zod passes preflight |
| NFA status set on non-NFA firearm | Tampering / data integrity | Router-layer `isNfa` guard in `setNfaTransferStatus` (recommended — see Finding 6) |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `firearm_serial_number_key` is the exact constraint name in the live DB | Standard Stack / Code Examples | CONFLICT mapping silently fails for duplicates; actual name confirmed from schema.ts `uniqueIndex('firearm_serial_number_key')` — risk is very low |

**All other claims are VERIFIED from live codebase inspection or runtime tests.**

---

## Open Questions

1. **NFA guard in `setNfaTransferStatus`**
   - What we know: DB allows `nfaTransferStatus` on non-NFA firearms (no constraint prevents it)
   - What's unclear: Whether the planner wants a `BAD_REQUEST` guard or considers it acceptable to allow tracking on non-NFA items
   - Recommendation: Add the guard — one `findFirst` lookup; follows `hemsRequest.approve` precedent for pre-flight status checks; cost is ~1ms extra per call

---

## Environment Availability

Phase 29 is code-only. No external tools or services beyond the running dev environment are required.

| Dependency | Required By | Available | Notes |
|------------|------------|-----------|-------|
| Neon test branch DB | SC-1..SC-4 tests | ✓ | Synced in Phase 28-02; `scripts/apply-0014-testbranch.ts` confirmed |
| `bun run typecheck` | SC-5 | ✓ | `tsc --noEmit` — confirmed passing on current main |

---

## Sources

### Primary (HIGH confidence — verified from live codebase)

- `src/server/trpc/routers/vehicle.ts` — canonical template for list/create/update/delete
- `src/server/trpc/routers/hemsRequest.ts` — CQS pattern for setNfaTransferStatus + markDistributed
- `src/server/trpc/routers/userManagement.ts` — `isBeneficiaryLinkUniqueViolation` predicate pattern
- `src/server/trpc/router.ts` — registration structure and section groupings
- `db/schema.ts` (lines 1466-1570) — firearm table, enums, constraints
- `db/validation.ts` (lines 254-481) — insertFirearmSchemaBase, insertFirearmSchema, updateFirearmSchema
- `db/relations.ts` (lines 253-260) — firearmRelations (entity, valuations, documents)
- `db/index.ts` (lines 22-23, 49, 67, 75) — Drizzle schema+relations initialization
- Node.js runtime test (Zod 4.4.3) — `.omit()` behavior on refined schemas

### Secondary (HIGH confidence — from planning artifacts)

- `.planning/phases/28-firearm-schema-and-migration/28-02-SUMMARY.md` — test branch sync confirmation
- `.planning/ROADMAP.md` — Phase 29 success criteria (binding contract)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in package.json, all schemas verified in codebase
- Architecture: HIGH — all patterns verified from live router files; Zod behavior verified by runtime test
- Pitfalls: HIGH — Zod `.omit()` issue confirmed by live runtime test; import pitfall confirmed from validation.ts

**Research date:** 2026-05-21
**Valid until:** Stable — pure code phase with no external API dependencies. Valid until `db/validation.ts`, `db/schema.ts`, or Zod version changes.
