# Phase 29 — Discussion Log

**Conducted:** 2026-05-21
**Mode:** discuss (canonical-research per user instruction)
**Areas presented:** 4 (3 gray areas + "none — just plan")
**Areas discussed:** 3
**Decisions produced:** 9 LOCKED + 4 DEFERRED

This log is for human reference only. Downstream agents read `29-CONTEXT.md`,
not this file.

---

## Phase 29 framing

**Domain stated:** "A tRPC router exposing 5 procedures (`list`, `byId`,
`create`, `update`, `delete`) for the firearm asset class — directly typed off
Phase 28's schema, the dependency root for Phase 30's `/firearms` admin page."

(After discussion this became 6 procedures with the addition of
`setNfaTransferStatus` — see Area 1 below.)

**Carried-forward decisions surfaced before any questions were asked:**
- `vehicleRouter` is the canonical asset-router template
- `byId` precedent is `liability.byId` with relations included
- `23505` → `CONFLICT` precedent is `userManagement.ts` with constraint-name matching
- All 5 (now 6) procedures get `adminProcedure`
- `entityId` filter is non-negotiable per `[v5.0]` STATE.md + project-wide pattern

**Explicitly NOT discussed (no value):**
- 4 of 5 procedures are direct vehicle-router copies — locked by precedent
- Stale-query invalidation — Phase 30's frontend concern
- Zod refine — already enforced at input boundary (Phase 28-01)
- `bun run typecheck` passing — guaranteed once router is registered

---

## Area selection question

**Question:** "Phase 29 is almost entirely a vehicleRouter copy + byId +
23505→CONFLICT mapping. Three gray areas remain — which do you want to
discuss?"

**Options presented:**

1. NFA Form 5 status mutation — dedicated vs. generic update
2. byId relation depth — eager-load vs. bare row
3. Forward-compat helpers — speculative API surface
4. None — just plan it

**User selected (multi-select):** Areas 1, 2, 3 — all gray areas.

---

## Area 1 — NFA Form 5 status mutation

**Question presented:** "How should Form 5 status changes flow through the
router?" — dedicated mutation / generic update / both.

**User response:** "research canonically to determine the proper and correct
solution for my exact use case"

**Research conducted:**
- Scanned all 24 tRPC routers for state-transition vs. data-update patterns
- Found explicit CQS evidence in this codebase:
  - `hemsRequest.approve` — dedicated mutation (atomically sets status +
    creates distribution + sets FK)
  - `hemsRequest.cancel` / `markDistributed` — dedicated
  - `beneficiary.cancel` — dedicated
  - `liability.recordPayment` — dedicated (atomic)
  - All 7 asset routers — generic `update` only (no workflow semantics)
- Applied CQS criteria (workflow semantics, business rules, atomicity, audit
  significance) — NFA Form 5 transitions satisfy all four.

**Decision: Dedicated `setNfaTransferStatus` mutation** (D-02 / D-03 / D-04 in
CONTEXT.md).

**Key supporting evidence:**
- `hemsRequest.approve` is the closest analog (also has legal/workflow weight)
- Future guardrail `transferStatus='COMPLETE'` → requires
  `nfaTransferStatus='APPROVED'` for NFA items has a natural home
- Activity-log entries are semantically meaningful ("Filed ATF Form 5") vs.
  generic ("updated firearm field")
- Atomicity for the common "file Form 5 + record control number" case

**Anti-decision (also locked):** `nfaTransferStatus` is OMITTED from the
generic `update` input shape — single-path-to-change. No "which mutation do I
use?" confusion.

---

## Area 2 — byId relation depth

**Question presented:** "What relations should `firearm.byId` eager-load?" —
entity+valuations+documents / entity+valuations / bare row.

**User response:** "research canonically to determine the proper and correct
solution for my exact use case"

**Research conducted:**
- Inspected all 11 routers with a `byId` procedure:

| Router | Pattern | Relations |
|---|---|---|
| `liability.byId` | `findFirst` | `{ entity: true, payments: true }` |
| `beneficiary.byId` | `findFirst` | none |
| `distribution.byId` | `findFirst` | none |
| `hemsRequest.byId` | `findFirst` | none |
| `contact.byId` | `findFirst` | none |
| `withdrawalRecord.byId` | `findFirst` | none |
| `trustAccounting.byId` | `findFirst` | none |
| `activityLog.byId` | `findFirst` | none |

- Pattern: 10 of 11 use bare findFirst; `liability.byId` is the sole exception
  and includes relations specifically for the row-detail view in `/liabilities`
- Crucial retrospective: `liability.getLinked` (Phase 26) was created as a
  forward API but `/accounts` filtered client-side anyway because it was
  cleaner — proving the alternative (bare byId + client filter) is the
  inferior workaround
- Phase 30's `/firearms` row-expand detail view (per Phase 23 UI-SPEC) needs
  appraisal history + ATF docs without fetch waterfall

**Decision: Eager-load `with: { entity: true, valuations: true, documents: true }`** (D-05 in CONTEXT.md).

---

## Area 3 — Forward-compat helpers

**Question presented:** "Add 'forward API' helpers now — procedures Phase 30
won't use but Phase 31 or future deep-detail pages might want?"

**User response:** "research canonically to determine the proper and correct
solution for my exact use case"

**Research conducted:**
- Direct codebase precedent: STATE.md `[Phase 26]` entry verbatim —
  `"liability.getLinked is a tested forward API NOT consumed by phase-26 UI"`
  → the codebase has already memorialized this lesson
- YAGNI principle (canonical XP/agile practice) — speculative APIs accumulate
  type surface, test surface, and router cardinality without proven need
- The suggested helpers:
  - `firearm.byDocumentId(documentId)` — reverse polymorphic lookup; the UX
    is firearm→docs not docs→firearm; no realistic consumer
  - `firearm.listByNfaClass(nfaClass)` — additive on `list` later if needed,
    not a new procedure
- Phase 31's aggregator wiring (`asset.ts:listAll`, `dashboard.ts:summary`)
  reads `firearm` directly via Drizzle — does NOT need firearm-router helpers

**Decision: No forward-API helpers** (D-01 in CONTEXT.md). Ship exactly 6
procedures.

---

## Decisions captured (LOCKED — see CONTEXT.md)

| ID | Decision |
|---|---|
| D-01 | Exactly 6 procedures: list, byId, create, update, delete, setNfaTransferStatus |
| D-02 | Dedicated `setNfaTransferStatus` mutation (CQS pattern from `hemsRequest.approve`) |
| D-03 | `nfaTransferStatus` OMITTED from generic `update` input via `.omit()` |
| D-04 | `setNfaTransferStatus` enforces entityId WHERE clause + NOT_FOUND on empty returning |
| D-05 | `byId` eager-loads `with: { entity, valuations, documents }` |
| D-06 | list/create/update/delete copied verbatim from vehicleRouter pattern |
| D-07 | Register as `firearm: firearmRouter` in router.ts, alphabetically placed |
| D-08 | Local `isFirearmSerialConflict` predicate for 23505 → CONFLICT mapping |
| D-09 | Activity-logging handled by existing DB triggers / middleware (verify, don't add manually) |

---

## Deferred Ideas

- Forward-API helpers — re-evaluate if Phase 31+ surfaces a real consumer
- Cross-asset transfer-status guardrail (block COMPLETE on NFA without
  APPROVED) — future enhancement; setNfaTransferStatus is the natural home
- Explicit activity-log emission — only if D-09 assumption proves wrong
- Document-attachment FK enforcement in router — only if a UI needs it

---

## Scope Creep — Redirected

None — discussion stayed entirely within Phase 29's router-shape boundary.
All "what if we also..." questions about UI affordances, dashboard widgets,
and aggregator behavior were correctly flagged as Phase 30/31 work and not
opened.

---

## Claude's Discretion (Implementation details NOT pre-decided)

- Exact placement / ordering of procedures within the router object
- Whether to inline the `isFirearmSerialConflict` predicate or hoist to a
  small `helpers.ts` (functional preference — predicate is small either way)
- Exact `updateFirearmSchema.omit({ nfaTransferStatus: true })` placement —
  inline in the input shape or extract to a const
- Whether the `setNfaTransferStatus` input schema uses `z.enum([...])` or
  `z.nativeEnum(nfaTransferStatus)` — both work; planner picks based on
  codebase convention
