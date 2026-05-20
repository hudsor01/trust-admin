---
phase: 26-schema-completeness-for-kpi-data
plan: 03
type: execute
wave: 1
depends_on: []
files_modified:
  - src/server/trpc/routers/asset.ts
  - src/app/(admin)/assets/_components/AssetsClient.tsx
  - tests/trpc/asset.test.ts
autonomous: true
requirements: []
must_haves:
  truths:
    - "asset.listAll returns transferStatus on every AssetRow"
    - "insurancePolicy rows expose transferStatus as null (the table has no transferStatus column)"
    - "/assets 'Transfer-status progress' KPI is computed from real transferStatus, not status === 'ACTIVE'"
  artifacts:
    - path: "src/server/trpc/routers/asset.ts"
      provides: "transferStatus field on AssetRow + each of the 7 per-kind mappers"
      contains: "transferStatus"
    - path: "src/app/(admin)/assets/_components/AssetsClient.tsx"
      provides: "Transfer-status progress KPI from rows with transferStatus === 'COMPLETE'"
      contains: "transferStatus"
  key_links:
    - from: "src/server/trpc/routers/asset.ts"
      to: "AssetRow consumers"
      via: "transferStatus field on the envelope"
      pattern: "transferStatus"
    - from: "src/app/(admin)/assets/_components/AssetsClient.tsx"
      to: "AssetRow.transferStatus"
      via: "filter for completed transfers"
      pattern: "transferStatus === 'COMPLETE'"
---

<objective>
Surface the real `transferStatus` field through the `asset.listAll`
aggregator so the /assets "Transfer-status progress" KPI stops approximating it
with `status === 'ACTIVE'`.

No schema change — `transferStatus` already exists on six of the seven asset
tables (vehicle, homestead, rentalProperty, bankAccount, investmentAccount,
personalProperty all share it; insurancePolicy does NOT — per CLAUDE.md). The
fix is purely in the aggregator: add `transferStatus` to the `AssetRow`
envelope type and to each per-kind mapper, then recompute the KPI from the real
field.

Purpose: closes the v4.0-MILESTONE-AUDIT phase-23 tech_debt — "Assets
'Transfer-status progress' approximated (asset.listAll omits transferStatus)".
Per the scope-reduction prohibition: this delivers the REAL transfer-progress
metric, not an approximation.

Output: `AssetRow` carries `transferStatus`; all 7 mappers set it;
AssetsClient computes "Transfer-status progress" from completed transfers.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@CLAUDE.md

<interfaces>
<!-- Source-of-truth analogs. Self-contained plan — no schema dependency. -->

asset.ts AssetRow interface (routers/asset.ts:31-54) — the envelope. Add a
`transferStatus` field. transferStatus is the `TransferStatus` pgEnum
(db/schema.ts:178-182) with values 'PENDING' | 'STARTED' | 'COMPLETE'.
insurancePolicy has NO transferStatus column (CLAUDE.md: "insurancePolicy is
the exception — entityId and status only"), so its mapper sets transferStatus
to `null`. The new field type: `transferStatus: string | null`.

The 7 per-kind mappers (routers/asset.ts:120-220):
- vehicle (120-132), homestead (134-146), rentalProperty (148-160) →
  `transferStatus: v.transferStatus` / `h.transferStatus` / `r.transferStatus`
- bankAccount (162-174), investmentAccount (176-188) →
  `transferStatus: b.transferStatus` / `i.transferStatus`
- personalProperty (190-206) → `transferStatus: p.transferStatus`
- insurancePolicy (208-220) → `transferStatus: null`
Each mapper is a `rows.push({...})` — add the one field to each object literal.

AssetsClient.tsx transfer-progress KPI (lines 173-192):
```typescript
// CURRENT (approximation to replace):
const activeRows = rows.filter((r) => r.status === 'ACTIVE')
const transferPct =
    rows.length > 0 ? (activeRows.length / rows.length) * 100 : 0
```
Replace the comment (173-177) and the approximation with a real computation
over `r.transferStatus`. "Progress" = share of assets whose transfer is
COMPLETE. Rows where transferStatus is null (insurance policies) are not
transferable assets — EXCLUDE null rows from the denominator so the percentage
reflects only transferable assets; document the choice in a short comment.
`formatPercent` is already imported.

asset.test.ts (tests/trpc/asset.test.ts) — the existing
`describe.skipIf(isProductionDb)('asset.listAll aggregator', ...)` block already
seeds rows with `transferStatus: 'PENDING'` (lines 72, 90, 109, 125, 141, 156,
171). Add assertions that the returned AssetRows expose `transferStatus`.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add transferStatus to AssetRow + all 7 mappers; extend asset.test.ts</name>
  <read_first>
    - src/server/trpc/routers/asset.ts — full file (AssetRow 31-54, the 7
      mappers 120-220).
    - db/schema.ts:178-182 (transferStatus pgEnum), and confirm transferStatus
      exists on vehicle/homestead/rentalProperty/bankAccount/investmentAccount/
      personalProperty and is ABSENT on insurancePolicy.
    - tests/trpc/asset.test.ts — full file (seed in beforeAll, the existing
      listAll assertions).
  </read_first>
  <behavior>
    - asset.listAll returns each AssetRow with a `transferStatus` field.
    - For vehicle/homestead/rentalProperty/bankAccount/investmentAccount/
      personalProperty rows, `transferStatus` equals the source row's
      transferStatus value (the test seeds 'PENDING' for all).
    - For insurancePolicy rows, `transferStatus` is `null` (no such column).
  </behavior>
  <action>
    1. asset.ts — AssetRow interface: add `transferStatus: string | null` with
       a doc comment noting it is the `TransferStatus` enum value for the six
       transferable asset kinds and `null` for `insurancePolicy` (which has no
       transferStatus column).
    2. asset.ts — the 7 mappers: add `transferStatus` to each `rows.push({...})`
       object. Six mappers pass the source field through
       (`transferStatus: v.transferStatus`, etc.); the `insurancePolicy` mapper
       sets `transferStatus: null`.
    3. tests/trpc/asset.test.ts — in the existing `asset.listAll aggregator`
       describe block, add assertions to the relevant test(s): the returned
       rows for the seeded vehicle/homestead/rental/bank/investment/personal
       items have `transferStatus === 'PENDING'`, and the seeded insurance row
       has `transferStatus === null`. These assertions FAIL before step 1-2 and
       PASS after (the file is being edited in the same task — run it last to
       confirm GREEN).
  </action>
  <verify>
    <automated>grep -c "transferStatus" src/server/trpc/routers/asset.ts | awk '{ if ($1 >= 8) exit 0; else exit 1 }' && bun test tests/trpc/asset.test.ts && bun run typecheck</automated>
  </verify>
  <acceptance_criteria>
    - `routers/asset.ts` `AssetRow` interface contains `transferStatus`
    - `routers/asset.ts` contains at least 8 occurrences of `transferStatus` (1 in the interface + 7 mappers; the insurance mapper sets `null`)
    - The insurancePolicy mapper sets `transferStatus: null`
    - `tests/trpc/asset.test.ts` asserts `transferStatus` on returned rows (PENDING for the 6 transferable kinds, null for insurance)
    - `bun test tests/trpc/asset.test.ts` exits 0; `bun run typecheck` exits 0
  </acceptance_criteria>
  <done>AssetRow carries transferStatus; all 7 mappers set it; aggregator tests assert it and pass.</done>
</task>

<task type="auto">
  <name>Task 2: Recompute the /assets "Transfer-status progress" KPI from real transferStatus</name>
  <read_first>
    - src/app/(admin)/assets/_components/AssetsClient.tsx — the KPI section
      (lines 173-192), the imports (formatPercent at line 16).
    - src/server/trpc/routers/asset.ts AssetRow (updated in Task 1) — confirm
      the `transferStatus` field name/type.
  </read_first>
  <action>
    In AssetsClient.tsx, replace the transfer-progress approximation
    (lines 173-192):
    1. Delete the comment at 173-177 ("transferStatus isn't exposed through
       listAll, so ... approximates with % of rows where status === 'ACTIVE'.
       Real transfer-progress requires a future listAll extension...").
    2. Delete `const activeRows = rows.filter((r) => r.status === 'ACTIVE')`
       and the `transferPct` line that divides by `rows.length`.
    3. Compute the real metric. "Transfer-status progress" = percentage of
       transferable assets whose transfer is COMPLETE:
       ```
       // transferStatus is null for insurance policies (no such column) —
       // they are not transferable assets, so exclude them from the
       // denominator. Progress = COMPLETE transfers / transferable assets.
       const transferableRows = rows.filter((r) => r.transferStatus !== null)
       const completedTransfers = transferableRows.filter(
           (r) => r.transferStatus === 'COMPLETE',
       )
       const transferPct =
           transferableRows.length > 0
               ? (completedTransfers.length / transferableRows.length) * 100
               : 0
       ```
    4. Keep the `kpiData` entry `{ label: 'Transfer-status progress', value:
       formatPercent(transferPct) }` unchanged — only its inputs change.
    Leave `assetCount`, `totalDod`, `totalCurrent` and the other KPI entries
    untouched.
  </action>
  <verify>
    <automated>grep -q "transferStatus === 'COMPLETE'" "src/app/(admin)/assets/_components/AssetsClient.tsx" && ! grep -q "r.status === 'ACTIVE'" "src/app/(admin)/assets/_components/AssetsClient.tsx" && bun run typecheck && bun run lint</automated>
  </verify>
  <acceptance_criteria>
    - `AssetsClient.tsx` no longer contains `r.status === 'ACTIVE'` (the approximation is gone)
    - `AssetsClient.tsx` contains `transferStatus === 'COMPLETE'`
    - The transferable-rows filter excludes `transferStatus === null` rows from the denominator
    - The `kpiData` entry `{ label: 'Transfer-status progress', ... }` still exists
    - `bun run typecheck` exits 0; `bun run lint` exits 0
  </acceptance_criteria>
  <done>"Transfer-status progress" KPI reflects the real transferStatus field; the status==='ACTIVE' approximation is removed.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser → tRPC (asset.listAll) | admin client requests the aggregated asset list with `entityId` |
| tRPC → Postgres (RLS) | JWT-bound `authenticated` role; each of the 7 fan-out queries is `entityId`-scoped and the asset tables enforce `app.is_admin()` RLS |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-26-04 | I (Information disclosure) | `asset.listAll` — the new `transferStatus` field added to the AssetRow envelope | accept (N/A — no new exposure) | `transferStatus` is read from rows the aggregator already SELECTs in full (`db.select().from(table)` per kind). The field was simply not copied into the envelope; copying it adds no new query, no new table, and no new column to the result set beyond what RLS already authorizes. Each per-kind query stays `eq(table.entityId, entityId)`-scoped and the asset tables keep their `app.is_admin()` RLS policy. `transferStatus` is non-sensitive trust-administration metadata (PENDING/STARTED/COMPLETE). Rationale for `accept`: zero change to the trust boundary or authorization surface — purely surfacing an already-fetched field. |

Note: this plan adds no mutation surface and no schema change — T-26-01/02/03 (mutation/schema threats) are dispositioned in plans 26-01 and 26-02 and do not apply here.
</threat_model>

<verification>
- `bun run typecheck` exits 0.
- `bun run lint` (biome) exits 0 — zero findings.
- `bun test tests/trpc/asset.test.ts` exits 0 — the aggregator tests assert
  `transferStatus` on returned rows and pass.
- Manual smoke (documented in SUMMARY): /assets "Transfer-status progress" KPI
  reflects the share of transferable assets marked COMPLETE.
</verification>

<success_criteria>
- `asset.listAll` returns `transferStatus` on every AssetRow (null for
  insurance policies).
- /assets "Transfer-status progress" KPI is computed from the real
  `transferStatus` field — no `status === 'ACTIVE'` approximation remains.
- All quality gates (typecheck, lint, asset tests) pass without bypass.
</success_criteria>

<output>
After completion, create
`.planning/phases/26-schema-completeness-for-kpi-data/26-03-SUMMARY.md`.
</output>
