# Phase 29: firearm-trpc-router — Context

**Gathered:** 2026-05-21
**Status:** Ready for planning
**Source:** Discuss-phase (canonical research mode)

<domain>
## Phase Boundary

A tRPC router (`firearmRouter`) exposing 6 procedures over Phase 28's `firearm` schema, registered in `src/server/trpc/router.ts` and type-checking cleanly. The router is the dependency root that Phase 30's `/firearms` admin page consumes via `trpc.firearm.*` client hooks. Out of scope: UI (Phase 30), aggregator wiring (Phase 31), sidebar nav (Phase 32). No new requirements — this phase has 0 REQ-IDs because it is a dependency phase that enables FIRE-06 / FIRE-07 in Phase 30.
</domain>

<decisions>
## Implementation Decisions

### Router shape (procedure list — exactly 6, no forward-API helpers)

- **D-01** [LOCKED]: The firearm router ships exactly six procedures: `list`, `byId`, `create`, `update`, `delete`, `setNfaTransferStatus`. **No forward-API helpers** (no `byDocumentId`, no `listByNfaClass`, no `getLinked`-style speculation). YAGNI. The codebase's own `[Phase 26]` STATE.md entry memorializes the lesson: `liability.getLinked` was a "tested forward API NOT consumed" — repeating that pattern adds maintenance surface for zero user-facing value. If filtering by NFA class is ever needed, it's an additive optional input on `list`, not a new procedure.

### CQS — dedicated mutation for NFA Form 5 state transitions

- **D-02** [LOCKED]: `setNfaTransferStatus({ id, entityId, status: 'NOT_FILED' | 'FILED' | 'APPROVED', taxStampDate?, atfControlNumber? })` is a dedicated `adminProcedure` mutation distinct from generic `update`. Rationale: the NFA Form 5 lifecycle satisfies all four Command-Query-Separation criteria already established in this codebase (workflow semantics, business rules, atomicity, audit significance) — mirrors `hemsRequest.approve` precedent. Setting `status='APPROVED'` is the legal precondition for physical heir transfer, not a cosmetic field edit; it carries audit weight and a future guardrail surface ("can't `transferStatus=COMPLETE` for NFA items unless `nfaTransferStatus='APPROVED'`").

- **D-03** [LOCKED]: `nfaTransferStatus` is OMITTED from the generic `update` input shape — the router uses `updateFirearmSchema.omit({ nfaTransferStatus: true })` as the `update.input` schema. Single-path-to-change is preserved; no "which mutation do I call?" ambiguity. `taxStampDate` and `atfControlNumber` stay in generic `update` (they're metadata fields, not workflow triggers), but `setNfaTransferStatus` also accepts them so the "file Form 5 + record control number" common case is atomic in one call.

- **D-04** [LOCKED]: `setNfaTransferStatus` enforces `eq(firearm.entityId, input.entityId)` in the WHERE clause and throws `TRPCError({ code: 'NOT_FOUND', message: 'Firearm not found in this entity' })` when `.returning()` is empty — matches the codebase-wide pattern for entityId-scoped state-transition mutations.

### byId — eager-load relations

- **D-05** [LOCKED]: `firearm.byId` uses `db.query.firearm.findFirst({ where: and(eq(firearm.id, input.id), eq(firearm.entityId, input.entityId)), with: { entity: true, valuations: true, documents: true } })`. Single query returns the firearm + its appraisal history + its ATF stamp/Form 5 PDFs. Rationale: matches `liability.byId` precedent (the only other "asset + related history" byId in the codebase); avoids the Phase 26 retro-admission where `getLinked` + client-side filter was used as the inferior workaround. Phase 30's row-expand detail view needs all three relations without a render-time fetch waterfall.

### Standard 4-procedure shape (list / create / update / delete)

- **D-06** [LOCKED]: `list`, `create`, `update`, `delete` follow `vehicleRouter` verbatim (it's the canonical 7-asset template). Specifically:
  - `list`: `adminProcedure` with `z.object({ entityId: z.coerce.number() })` input, returns `db.select().from(firearm).where(eq(firearm.entityId, input.entityId))` — no ORDER BY in the router (deferred to Phase 30's table sort UI; matches the existing 7-asset pattern).
  - `create`: `adminProcedure` with `insertFirearmSchema` input, returns the created row; `INTERNAL_SERVER_ERROR` if returning array is empty (matches vehicle pattern); **NEW** — catches `23505` with `constraint = 'firearm_serial_number_key'` and maps to `TRPCError({ code: 'CONFLICT', message: 'A firearm with this serial number already exists.' })` per the `userManagement.ts` precedent.
  - `update`: `adminProcedure` with `{ id, entityId, data: updateFirearmSchema.omit({ nfaTransferStatus: true }) }`, `and(eq(id), eq(entityId))` WHERE clause, `NOT_FOUND` on empty returning, sets `updatedAt: new Date().toISOString()` (matches vehicle). Also catches `23505` on `firearm_serial_number_key` → `CONFLICT` for the rare serial-number-edit-collision case.
  - `delete`: `adminProcedure` with `{ id, entityId }`, `and(eq(id), eq(entityId))` WHERE clause, `NOT_FOUND` on empty returning.

- **D-07** [LOCKED]: Router registered in `src/server/trpc/router.ts` as `firearm: firearmRouter`, alphabetically placed (between `entity` / `hemsRequest` based on the existing import-and-registration ordering in that file).

### 23505 → CONFLICT mapping (helper utility)

- **D-08** [LOCKED]: A small predicate function `isFirearmSerialConflict(err)` mirroring `userManagement.ts`'s `isBeneficiaryLinkUniqueViolation` — typed unknown-narrowing on `err.code === '23505' && err.constraint === 'firearm_serial_number_key'`. Lives in `src/server/trpc/routers/firearm.ts` (not extracted to a shared util — only this router needs it, matching how `userManagement.ts` keeps its predicate local).

### Activity logging

- **D-09** [Claude's Discretion]: Activity-log emission is handled by existing DB triggers / cross-cutting middleware (per `[v4.0]` STATE.md decisions about audit infrastructure). The router does NOT need explicit `activityLog.insert(...)` calls; this is consistent with all 7 existing asset routers. The planner should verify this assumption against the live codebase but is not expected to add manual logging.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Codebase analogs (HIGHEST priority — direct templates)
- `src/server/trpc/routers/vehicle.ts` — canonical 4-procedure asset-router template; list/create/update/delete shapes are copied verbatim into firearm
- `src/server/trpc/routers/liability.ts` (lines surrounding `byId:` and `getLinked:`) — precedent for `byId` with `with: { entity: true, payments: true }` eager loading; also the "forward API NOT consumed" cautionary tale memorialized in `[Phase 26]` STATE.md
- `src/server/trpc/routers/hemsRequest.ts` — CQS precedent: dedicated `approve`, `cancel`, `markDistributed` mutations for workflow state transitions (the template `setNfaTransferStatus` follows)
- `src/server/trpc/routers/userManagement.ts` — `isBeneficiaryLinkUniqueViolation` predicate at the top of the file; the exact pattern the firearm router replicates for `23505` → `CONFLICT` mapping (constraint-name matching)
- `src/server/trpc/init.ts` — `adminProcedure` (line 221), `createTRPCRouter`, JWT/role resolution
- `src/server/trpc/router.ts` — main app router registration; alphabetical placement convention

### Schema + validation (consumed inputs)
- `db/schema.ts` — `firearm` pgTable, `transferStatus` enum (unchanged, must NOT be touched), `nfaTransferStatus` enum (the values `setNfaTransferStatus` accepts)
- `db/validation.ts` — `insertFirearmSchema`, `updateFirearmSchema` (the router omits `nfaTransferStatus` from the update path; full schema still exported for tests / future use)
- `db/index.ts` — `db` (the auth-aware Drizzle proxy used in every procedure)

### Phase artifacts
- `.planning/phases/28-firearm-schema-and-migration/28-01-SUMMARY.md` — what shipped at the schema/validation layer
- `.planning/phases/28-firearm-schema-and-migration/28-02-SUMMARY.md` — migration apply status + operator confirmation of live DB state
- `.planning/REQUIREMENTS.md` — FIRE-01..09 (Phase 29 covers no new REQ-IDs but enables FIRE-06 / FIRE-07 in Phase 30)
- `.planning/STATE.md` — `[v4.0]` and `[v5.0]` Key Decisions (every `[v5.0]` is binding; `[v4.0]` "Asset router pattern" entry explicitly says "replicate vehicle.ts exactly")
- `.planning/ROADMAP.md` — Phase 29 section + 5 success criteria

### Documentation
- `CLAUDE.md` — tRPC patterns section, "Adding a New Resource" steps (step 5: Router; step 6: Register in router.ts), Entity ID Validation Pattern (entityId required on list/byId/update/delete — non-negotiable)
</canonical_refs>

<specifics>
## Specific Ideas

### `setNfaTransferStatus` mutation body (the new procedure)

The dedicated NFA Form 5 transition mutation is the only genuinely-new shape in this phase. It's expected to look approximately like:

```typescript
setNfaTransferStatus: adminProcedure
    .input(
        z.object({
            id: z.coerce.number(),
            entityId: z.coerce.number(),
            status: z.enum(['NOT_FILED', 'FILED', 'APPROVED']),
            taxStampDate: z.string().datetime().optional(),
            atfControlNumber: z.string().trim().min(1).optional(),
        }),
    )
    .mutation(async ({ input }) => {
        const updates: Record<string, unknown> = {
            nfaTransferStatus: input.status,
            updatedAt: new Date().toISOString(),
        }
        if (input.taxStampDate !== undefined) updates.taxStampDate = input.taxStampDate
        if (input.atfControlNumber !== undefined) updates.atfControlNumber = input.atfControlNumber

        const [updated] = await db
            .update(firearm)
            .set(updates)
            .where(and(eq(firearm.id, input.id), eq(firearm.entityId, input.entityId)))
            .returning()
        if (!updated)
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Firearm not found in this entity',
            })
        return updated
    })
```

(Pattern: `hemsRequest.approve` body; the planner / executor will refine — this is sketch, not contract.)

### 23505 → CONFLICT — the predicate + try/catch shape

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

Wrap the `db.insert(firearm)` and `db.update(firearm).set(...)` (when the update touches `serialNumber`) in `try/catch (err) { if (isFirearmSerialConflict(err)) throw new TRPCError({ code: 'CONFLICT', message: 'A firearm with this serial number already exists.' }); throw err; }`.

### `byId` with eager loading

```typescript
byId: adminProcedure
    .input(z.object({ id: z.coerce.number(), entityId: z.coerce.number() }))
    .query(async ({ input }) => {
        return db.query.firearm.findFirst({
            where: and(
                eq(firearm.id, input.id),
                eq(firearm.entityId, input.entityId),
            ),
            with: { entity: true, valuations: true, documents: true },
        })
    })
```

The `firearmRelations` from `db/relations.ts` (Phase 28-01) make this work without further wiring.
</specifics>

<deferred>
## Deferred Ideas

- **Forward-API helpers** (`firearm.byDocumentId`, `firearm.listByNfaClass`) — explicitly out of scope per D-01. Re-evaluate if Phase 31+ surfaces a real consumer. If "filter by NFA class" ever becomes a UX need, add an optional `nfaClass?: NfaClass` input to `list`, not a new procedure.
- **Cross-asset transfer-status guardrail** (block `transferStatus='COMPLETE'` on NFA items when `nfaTransferStatus !== 'APPROVED'`) — captured as a future enhancement; not implemented in this phase. The dedicated `setNfaTransferStatus` mutation creates the natural home for this guardrail when the time comes.
- **Activity-log explicit emission** — if the DB-trigger / middleware assumption (D-09) turns out to be wrong, the planner will add explicit `activityLog.insert(...)` calls in mutations. Not pre-decided here.
- **Document-attachment FK enforcement in router** — Phase 28 already has the polymorphic CHECK constraint at the DB level; the router does not need to re-enforce. If a Phase 30 / 31 UI needs server-side validation that "this document belongs to this firearm" before showing it, add then.
</deferred>

---

*Phase: 29-firearm-trpc-router*
*Context gathered: 2026-05-21*
*Decisions: 9 locked, 4 deferred*
