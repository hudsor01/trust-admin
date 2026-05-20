---
phase: 26-schema-completeness-for-kpi-data
plan: 02
type: execute
wave: 2
depends_on: ["26-01"]
files_modified:
  - src/server/trpc/routers/liability.ts
  - src/app/(admin)/bequests/_components/types.ts
  - src/app/(admin)/bequests/_components/BequestsClient.tsx
  - src/app/(admin)/bequests/_components/BequestDialog.tsx
  - src/app/(admin)/bequests/_components/BequestTable.tsx
  - src/app/(admin)/personal-property/_components/PersonalPropertyClient.tsx
  - src/app/(admin)/personal-property/_components/PersonalPropertyDialog.tsx
  - src/lib/form-factory.ts
  - src/app/(admin)/liabilities/_components/LiabilityConstants.ts
  - src/app/(admin)/liabilities/_components/LiabilityDialog.tsx
  - src/app/(admin)/liabilities/_components/LiabilitiesClient.tsx
  - src/app/(admin)/accounts/_components/AccountsClient.tsx
  - tests/trpc/liability.test.ts
autonomous: true
requirements: []
must_haves:
  truths:
    - "/bequests 'Total value' KPI shows a real currency sum of estimatedValue, not an em-dash"
    - "Admin can enter an estimated value when creating/editing a specific bequest"
    - "/artwork 'Insured count' KPI shows the real count of insured items, not 0"
    - "Admin can toggle an 'Insured' flag when creating/editing a personal-property item"
    - "Admin can link a liability to a bank or investment account via the liability form"
    - "/accounts row-detail lists liabilities genuinely linked to that account"
    - "Linking a liability to a bank/investment account from another entity is rejected server-side"
  artifacts:
    - path: "src/server/trpc/routers/liability.ts"
      provides: "cross-entity FK validation on create/update + getLinked query for /accounts"
      contains: "bankAccountId"
    - path: "src/app/(admin)/bequests/_components/BequestsClient.tsx"
      provides: "Total value KPI computed via sumStrings over estimatedValue"
      contains: "estimatedValue"
    - path: "src/app/(admin)/personal-property/_components/PersonalPropertyClient.tsx"
      provides: "Insured count KPI from items.filter(p => p.insured)"
      contains: "insured"
    - path: "src/app/(admin)/accounts/_components/AccountsClient.tsx"
      provides: "getRowDetail renders linked liabilities"
      contains: "liability"
  key_links:
    - from: "src/app/(admin)/bequests/_components/BequestsClient.tsx"
      to: "specificBequest.estimatedValue"
      via: "sumStrings over bequest rows"
      pattern: "sumStrings"
    - from: "src/app/(admin)/liabilities/_components/LiabilityDialog.tsx"
      to: "liability.bankAccountId / investmentAccountId"
      via: "Select fields in the form payload"
      pattern: "bankAccountId|investmentAccountId"
    - from: "src/app/(admin)/accounts/_components/AccountsClient.tsx"
      to: "liability rows"
      via: "trpc.liability query filtered by account FK"
      pattern: "getRowDetail"
---

<objective>
Wire the three new schema columns (added in plan 26-01) through the routers,
forms, and KPI strips so the placeholder KPIs become real.

1. Bequest "Total value" — sum `estimatedValue` across bequests; add an
   estimated-value input to the bequest create/edit form.
2. Artwork "Insured count" — count `insured` items; add an Insured toggle to
   the personal-property create/edit form.
3. Liability to account linkage — surface `bankAccountId`/`investmentAccountId`
   in the liability form, validate the linked account belongs to the SAME
   entity server-side (cross-entity tampering guard), and render genuinely
   linked liabilities in /accounts row-detail.

Purpose: closes the v4.0 audit's phase-23 tech_debt — the placeholder KPIs
(em-dash "Total value", "Insured count" hardcoded 0, /accounts "Linked
liabilities not yet wired" notice). Per the scope-reduction prohibition: this
plan delivers REAL data, not a "v1" — every placeholder is replaced.

Output: liability router with cross-entity FK validation + a linked-liabilities
query; updated bequest, personal-property, liability forms; real KPI math on
/bequests, /artwork; real linked-liabilities row-detail on /accounts.
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
@.planning/phases/26-schema-completeness-for-kpi-data/26-01-SUMMARY.md

<interfaces>
<!-- Source-of-truth analogs. Plan 26-01 already added the schema columns. -->

Schema (from plan 26-01, now on the live DB):
- `specificBequest.estimatedValue` — `numeric(14,2)`, nullable, string-typed
- `personalProperty.insured` — `boolean`, default false, NOT NULL
- `liability.bankAccountId` / `liability.investmentAccountId` — `bigint`,
  nullable; FK to bank_account.id / investment_account.id (ON DELETE SET NULL)
- `liabilityRelations` now has `bankAccount` + `investmentAccount` one-relations

liability router — the recordPayment procedure (routers/liability.ts:215-226)
already demonstrates the cross-entity bank-account guard pattern to MIRROR:
```typescript
const account = await db.query.bankAccount.findFirst({
    where: and(
        eq(bankAccount.id, input.bankAccountId),
        eq(bankAccount.entityId, input.entityId),
    ),
})
if (!account) {
    throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Bank account does not belong to this entity',
    })
}
```
liability.create takes `insertLiabilitySchema` directly (no entityId in a
wrapper) — entityId is a field IN the schema. liability.update takes
`{ id, entityId, data }`.

LiabilityFormData (LiabilityConstants.ts:25-41) — current fields list, no FK
fields yet. defaultFormData() (lines 61-77) returns the initial values.
LiabilitiesClient onSubmit payload (LiabilitiesClient.tsx:124-167) and
handleEdit (lines 227-243) build/restore the form.

LiabilityDialog status block (LiabilityDialog.tsx:490-518) — the `status`
`<formInstance.Field>` + `<Select>` is the exact template for a new
nullable-FK Select. Nullable FK Select convention (STATE.md Phase 23 decision):
"none" sentinel value mapped to null in onValueChange.

BequestFormData (bequests/_components/types.ts) — add `estimatedValue: string`.
BequestsClient: bequests come from `trpc.specificBequest.list`; `sumStrings`
from `@/lib/money` and `formatCurrency` from `@/utils/formatters` are the money
helpers used by sibling clients (see PersonalPropertyClient.tsx:15,24,239).
BequestDialog uses `<formInstance.Field>` + `<Input>` — the "Recipient Name"
field (lines 146-167) is the template for a new text input.

personalPropertyFormDefaults (form-factory.ts:152-165) — add `insured: false`.
PersonalPropertyClient.tsx:245 has `const insuredCount = 0` to replace.
PersonalPropertyDialog status block (lines 334-415) — the two-column status
grid is where an Insured toggle belongs. Use the `Switch` component
(STATE.md Phase 23: "Distribution tax toggles use Switch component").

AccountsClient getRowDetail (AccountsClient.tsx:341-381) — currently renders
account metadata + a "Linked liabilities are not yet wired" notice to replace.
BankAccountTable + InvestmentAccountTable both accept a `getRowDetail` prop
(DataTable additive prop from phase 23-04).
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Wave-0 — failing tests for liability cross-entity FK validation and getLinked</name>
  <read_first>
    - tests/trpc/liability.test.ts — full file: adminCaller() helper (lines
      15-34), the `describe.skipIf(isProductionDb)` block, beforeAll/afterAll
      seed+teardown pattern.
    - tests/trpc/asset.test.ts lines 1-60 — the entity/asset seed pattern
      (insert entity, insert per-table rows, capture ids).
    - routers/liability.ts:215-226 — the recordPayment cross-entity guard being
      mirrored.
  </read_first>
  <behavior>
    Add a new `describe.skipIf(isProductionDb)('liability account linkage', ...)`
    block to tests/trpc/liability.test.ts. Seed: two entities (A, B); a bank
    account + investment account under entity A; a bank account under entity B.
    Tests — author each `test(...)` with a name that contains the literal
    substrings listed (the RED-state verify in <verify> greps for them):
    - Test 1, name contains `'links bank account'` — `liability.create` with
      `bankAccountId` pointing at entity A's bank account, under entity A →
      succeeds; created row has that `bankAccountId`.
    - Test 2, name contains `'rejects cross-entity'` — `liability.create` under
      entity A with `bankAccountId` pointing at entity B's bank account → throws
      TRPCError `BAD_REQUEST` (cross-entity tampering rejected — T-26-01).
    - Test 3, name contains `'links investment account'` — `liability.create`
      under entity A with `investmentAccountId` pointing at entity A's
      investment account → succeeds.
    - Test 4, name contains `'rejects cross-entity'` — `liability.update`
      setting `bankAccountId` to a cross-entity account → throws `BAD_REQUEST`.
    - Test 5, name contains `'getLinked'` — `liability.getLinked` (the new
      query) for entity A's bank account → returns only liabilities whose
      `bankAccountId` matches that account and whose `entityId` matches.
    afterAll: delete seeded liabilities, accounts, entities (by entityId, per
    the MEMORY note about catching auto-created rows).
  </behavior>
  <action>
    Write the tests as described in <behavior>. Each `test('...')` description
    MUST contain one of the literal substrings `cross-entity` (tests 2 and 4)
    or `getLinked` (test 5) so the RED-state verify can target them by name.
    They will FAIL initially: `liability.getLinked` does not exist yet, and
    create/update do not yet reject cross-entity FKs (they will currently accept
    the forged id). Run the file and confirm the new tests fail for the RIGHT
    reason (missing procedure / no rejection), not a seed error. Commit:
    `test(26-02): add failing tests for liability account linkage`.
  </action>
  <verify>
    <automated>bun test tests/trpc/liability.test.ts 2>&1 | tee /tmp/26-02-red.txt | grep -qE '\(fail\)' && grep -qE 'cross-entity|getLinked' /tmp/26-02-red.txt</automated>
  </verify>
  <acceptance_criteria>
    - tests/trpc/liability.test.ts contains a `describe('liability account linkage'`-style block with 5 tests
    - The new test names include the substrings `cross-entity` (tests 2 and 4) and `getLinked` (test 5)
    - Running the file shows the new tests failing (RED) — failures reference missing `getLinked` / absent cross-entity rejection, NOT seed/setup errors
    - The pre-existing `liability.payoffProjections` tests still pass
  </acceptance_criteria>
  <done>5 failing tests authored and committed; RED state confirmed for the right reason (the cross-entity / getLinked tests specifically, not stray fail/error output).</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Liability router — cross-entity FK validation + getLinked query (GREEN)</name>
  <read_first>
    - src/server/trpc/routers/liability.ts — full file. The `create` (66-79),
      `update` (81-106), and `recordPayment` (199-245) procedures.
    - db/schema.ts liability + bankAccount + investmentAccount blocks.
    - tests/trpc/liability.test.ts — the failing tests from Task 1.
  </read_first>
  <action>
    In src/server/trpc/routers/liability.ts:
    1. Add `investmentAccount` to the `@/db/schema` import (bankAccount is
       already imported).
    2. Create a private helper inside the file, e.g.
       `async function assertLinkedAccountsInEntity(...)` — given the
       liability input's `entityId` and (optional) `bankAccountId` /
       `investmentAccountId`, for EACH non-null FK run a
       `db.query.bankAccount.findFirst` / `db.query.investmentAccount.findFirst`
       scoped by `and(eq(table.id, fkId), eq(table.entityId, entityId))`; if a
       lookup returns nothing, throw `TRPCError({ code: 'BAD_REQUEST', message:
       'Linked account does not belong to this entity' })`. Mirror the
       recordPayment guard at lines 215-226 exactly.
    3. Call the helper at the top of `create` (using `input.entityId` +
       `input.bankAccountId` + `input.investmentAccountId`) and at the top of
       `update` (using `input.entityId` + `input.data.bankAccountId` +
       `input.data.investmentAccountId` — only when those keys are present in
       the partial `data`). Run BEFORE the insert/update.
    4. Add a new `getLinked` query procedure:
       ```
       getLinked: adminProcedure
         .input(z.object({
           entityId: z.coerce.number(),
           bankAccountId: z.coerce.number().optional(),
           investmentAccountId: z.coerce.number().optional(),
         }))
         .query(async ({ input }) => { ... })
       ```
       Return liabilities for the entity where the FK matches the supplied
       account id — `and(eq(liability.entityId, input.entityId),
       eq(liability.bankAccountId, input.bankAccountId))` (or the investment
       variant). Exactly one of bankAccountId / investmentAccountId is supplied
       per call; if neither is supplied return `[]`. Keep it entityId-scoped so
       RLS + the explicit filter both apply.

       NOTE — `getLinked` is an intentionally-provided + tested API surface that
       the CURRENT phase-26 UI does NOT consume: Task 5's /accounts row-detail
       deliberately uses client-side `trpc.liability.list` + `.filter()` to
       avoid an N+1 query per expanded row. `getLinked` is reserved for a future
       single-account view. It is not dead code — do not remove it; downstream
       reviewers/verifiers should treat it as a deliberate forward API.
    The `insertLiabilitySchema` / `updateLiabilitySchema` already accept the new
    FK columns (createInsertSchema picks them up — verified in plan 26-01) — no
    schema-validation change needed.
  </action>
  <verify>
    <automated>bun test tests/trpc/liability.test.ts && bun run typecheck</automated>
  </verify>
  <acceptance_criteria>
    - All 5 Task-1 tests pass (GREEN)
    - `routers/liability.ts` imports `investmentAccount`
    - `routers/liability.ts` contains a `getLinked` procedure
    - `liability.create` and `liability.update` reject cross-entity `bankAccountId`/`investmentAccountId` with `BAD_REQUEST`
    - `bun test tests/trpc/liability.test.ts` exits 0; `bun run typecheck` exits 0
  </acceptance_criteria>
  <done>Cross-entity FK guard + getLinked implemented; all linkage tests green. getLinked is a tested forward API, intentionally not wired into phase-26 UI.</done>
</task>

<task type="auto">
  <name>Task 3: Bequest estimated-value — form field + real "Total value" KPI</name>
  <read_first>
    - src/app/(admin)/bequests/_components/types.ts (full)
    - src/app/(admin)/bequests/_components/BequestsClient.tsx (full — esp.
      onSubmit payload 63-86, handleEdit 138-150, kpiData 159-168)
    - src/app/(admin)/bequests/_components/BequestDialog.tsx — the "Recipient
      Name" Field (146-167) as the input template
    - src/app/(admin)/bequests/_components/BequestTable.tsx — to add an
      estimated-value column/cell if the table shows monetary columns
    - PersonalPropertyClient.tsx:15,24,239 — `sumStrings` + `formatCurrency`
      import + usage pattern
  </read_first>
  <action>
    1. types.ts: add `estimatedValue: string` to `BequestFormData`.
    2. BequestsClient.tsx:
       - initialData (lines 55-62): add `estimatedValue: ''`.
       - onSubmit payload (63-74): add `estimatedValue: data.estimatedValue ||
         undefined` (string money or undefined — never coerce to number; money
         is a string per CLAUDE.md).
       - handleEdit (138-150): add `estimatedValue: bequest.estimatedValue || ''`.
       - KPI (replace lines 159-168): delete the "no value column" comment and
         the `value: '—'` placeholder. Import `sumStrings` from `@/lib/money`
         and `formatCurrency` from `@/utils/formatters` (formatPercent is
         already imported). Compute
         `const totalValue = sumStrings(bequests.map(b => b.estimatedValue))`
         and set the KPI to
         `{ label: 'Total value', value: formatCurrency(totalValue) }`.
    3. BequestDialog.tsx: add a `<formInstance.Field name="estimatedValue">`
       block — an `<Input>` (inputMode="decimal", placeholder "0.00") with label
       "Estimated value", mirroring the "Recipient Name" field. Place it after
       the Category field. Money is a string — do not use type="number"
       coercion; keep the raw string.
    4. BequestTable.tsx: if the table renders monetary columns, add an
       "Estimated value" column rendering `formatCurrency(row.estimatedValue ??
       '0')` (or '—' when null). If the table is purely descriptive, a column
       is optional — at minimum the value must round-trip through the
       form/edit. Keep consistent with how sibling tables (e.g.
       PersonalPropertyTable) show dodValue.
  </action>
  <verify>
    <automated>grep -q "estimatedValue" "src/app/(admin)/bequests/_components/types.ts" && grep -q "sumStrings" "src/app/(admin)/bequests/_components/BequestsClient.tsx" && ! grep -q "value: '—'" "src/app/(admin)/bequests/_components/BequestsClient.tsx" && grep -q 'name="estimatedValue"' "src/app/(admin)/bequests/_components/BequestDialog.tsx" && bun run typecheck</automated>
  </verify>
  <acceptance_criteria>
    - `bequests/_components/types.ts` `BequestFormData` contains `estimatedValue`
    - `BequestsClient.tsx` imports and uses `sumStrings`; the "Total value" KPI no longer contains the literal `value: '—'`
    - `BequestsClient.tsx` onSubmit payload and handleEdit both reference `estimatedValue`
    - `BequestDialog.tsx` contains a Field named `estimatedValue`
    - `bun run typecheck` exits 0
  </acceptance_criteria>
  <done>Bequest estimated value round-trips through the form; "Total value" KPI shows a real currency sum.</done>
</task>

<task type="auto">
  <name>Task 4: Personal-property Insured flag — form toggle + real "Insured count" KPI</name>
  <read_first>
    - src/lib/form-factory.ts:152-165 (personalPropertyFormDefaults)
    - src/app/(admin)/personal-property/_components/PersonalPropertyClient.tsx
      (full — esp. onSubmit payload 140-156, handleEdit 183-198, KPI 239-265)
    - src/app/(admin)/personal-property/_components/PersonalPropertyDialog.tsx
      — the status two-column grid (334-415)
    - src/components/ui/switch.tsx (confirm the Switch export name)
  </read_first>
  <action>
    1. form-factory.ts: add `insured: false` to `personalPropertyFormDefaults`
       (after `transferStatus: 'PENDING'`). It is a real `boolean`.
    2. PersonalPropertyClient.tsx:
       - onSubmit payload (140-156): add `insured: data.insured ?? false`.
       - handleEdit (183-198): add `insured: p.insured` to the spread object
         (it is a boolean, no `|| ''` fallback — `p.insured` is always a real
         boolean now).
       - KPI: delete `const insuredCount = 0` (line 245) and the 3-line "no
         insured column" comment (242-244). Replace with
         `const insuredCount = items.filter((p) => p.insured).length`. The
         artwork-mode kpiData entry `{ label: 'Insured count', value:
         insuredCount }` then shows the real count.
    3. PersonalPropertyDialog.tsx: add an Insured control to the Status section.
       Use the `Switch` component (STATE.md Phase 23 decision: tax toggles use
       Switch). Add a `<formInstance.Field name="insured">` rendering a
       `<Switch checked={field.state.value} onCheckedChange={field.handleChange}>`
       with a `<Label>` "Insured". Place it inside or below the
       `grid-cols-2` status grid (335-414). It applies to BOTH modes
       (personal-property and artwork) — the Insured count KPI is artwork-only
       but the column itself is on every personal_property row.
  </action>
  <verify>
    <automated>grep -q "insured: false" src/lib/form-factory.ts && grep -q "items.filter((p) => p.insured)" "src/app/(admin)/personal-property/_components/PersonalPropertyClient.tsx" && ! grep -q "const insuredCount = 0" "src/app/(admin)/personal-property/_components/PersonalPropertyClient.tsx" && grep -q 'name="insured"' "src/app/(admin)/personal-property/_components/PersonalPropertyDialog.tsx" && bun run typecheck</automated>
  </verify>
  <acceptance_criteria>
    - `src/lib/form-factory.ts` `personalPropertyFormDefaults` contains `insured: false`
    - `PersonalPropertyClient.tsx` no longer contains `const insuredCount = 0`; contains `items.filter((p) => p.insured)`
    - `PersonalPropertyClient.tsx` onSubmit payload and handleEdit both reference `insured`
    - `PersonalPropertyDialog.tsx` contains a Field named `insured` using the Switch component
    - `bun run typecheck` exits 0
  </acceptance_criteria>
  <done>Insured flag round-trips through the form; /artwork "Insured count" KPI shows the real count.</done>
</task>

<task type="auto">
  <name>Task 5: Liability form to account linkage + /accounts linked-liabilities row-detail</name>
  <read_first>
    - src/app/(admin)/liabilities/_components/LiabilityConstants.ts (full —
      LiabilityFormData 25-41, defaultFormData 61-77)
    - src/app/(admin)/liabilities/_components/LiabilityDialog.tsx — the `status`
      Field/Select block (490-518) as the nullable-FK Select template
    - src/app/(admin)/liabilities/_components/LiabilitiesClient.tsx — onSubmit
      payload (124-167), handleEdit (227-243), entity/account query setup
    - src/app/(admin)/accounts/_components/AccountsClient.tsx — getRowDetail
      (341-381), how bankAccounts/investmentAccounts/entityId are obtained
    - STATE.md Phase 23: "Nullable FK Select dropdowns use 'none' sentinel value
      mapped to null in onValueChange"
  </read_first>
  <action>
    LIABILITY FORM:
    1. LiabilityConstants.ts: add `bankAccountId: string` and
       `investmentAccountId: string` to `LiabilityFormData`; add
       `bankAccountId: ''` and `investmentAccountId: ''` to `defaultFormData()`.
    2. LiabilityDialog.tsx: the dialog must receive the entity's bank +
       investment accounts to populate the dropdowns. Add `bankAccounts` and
       `investmentAccounts` props (arrays of `{ id, name }`-shaped objects) to
       `LiabilityDialogProps`. Add two `<formInstance.Field>` Select blocks
       (mirroring the `status` Select at 490-518) — "Linked bank account" and
       "Linked investment account". Use the "none" sentinel: SelectItem
       value="__none__" maps via onValueChange to `''`. Place them near the
       existing property-link area or after `status`.
    3. LiabilitiesClient.tsx:
       - Add (or reuse if present) `trpc.bankAccount.list` +
         `trpc.investmentAccount.list` queries (entityId-scoped,
         `{ enabled: !!entityId }`) — check whether the client already fetches
         accounts for PaymentDialog and reuse that data if so.
       - onSubmit payload (124-155): add
         `bankAccountId: data.bankAccountId ? Number(data.bankAccountId) : null`
         and `investmentAccountId: data.investmentAccountId ?
         Number(data.investmentAccountId) : null`.
       - handleEdit (227-243): add
         `bankAccountId: l.bankAccountId ? String(l.bankAccountId) : ''` and the
         investment variant.
       - Pass `bankAccounts` + `investmentAccounts` props into `<LiabilityDialog>`.
       The router (Task 2) validates these FK ids belong to the entity — a
       forged cross-entity id is rejected with BAD_REQUEST; ensure an
       `onError: (e) => toast.error(e.message)` exists on the create/update
       mutation so the rejection surfaces to the user.

    /ACCOUNTS ROW-DETAIL:
    4. AccountsClient.tsx: replace the bank `getRowDetail` (341-381) "Linked
       liabilities are not yet wired" notice with a real linked-liabilities
       list. Call `trpc.liability.list` once at the client level (already
       entityId-scoped, `{ enabled: !!entityId }`). Inside getRowDetail, filter
       `liabilities.filter(l => l.bankAccountId === account.id)` client-side —
       this avoids one query per expanded row. (The `liability.getLinked`
       procedure from Task 2 is deliberately NOT used here for that reason; it
       remains a tested forward API for a future single-account view.) Render
       the matching liabilities (creditor + currentBalance via
       `formatCurrency`), or an empty-state ("No linked liabilities") when the
       filter is empty. Keep the account-metadata block (routing number, DOD
       date, notes) — ADD the linked-liabilities section below it; do not remove
       the metadata.
    5. Add the SAME getRowDetail to `InvestmentAccountTable` (it accepts the
       prop — phase 23-04 additive prop) so investment accounts also show linked
       liabilities, filtering on `l.investmentAccountId === account.id`.
  </action>
  <verify>
    <automated>grep -q "bankAccountId" "src/app/(admin)/liabilities/_components/LiabilityConstants.ts" && grep -qE 'name="bankAccountId"|name="investmentAccountId"' "src/app/(admin)/liabilities/_components/LiabilityDialog.tsx" && grep -q "bankAccountId" "src/app/(admin)/liabilities/_components/LiabilitiesClient.tsx" && ! grep -q "Linked liabilities are not yet wired" "src/app/(admin)/accounts/_components/AccountsClient.tsx" && grep -q "getRowDetail" "src/app/(admin)/accounts/_components/AccountsClient.tsx" && bun run typecheck && bun run lint</automated>
  </verify>
  <acceptance_criteria>
    - `LiabilityConstants.ts` `LiabilityFormData` contains `bankAccountId` and `investmentAccountId`; `defaultFormData()` initializes both to `''`
    - `LiabilityDialog.tsx` contains Fields named `bankAccountId` AND `investmentAccountId`
    - `LiabilitiesClient.tsx` onSubmit payload and handleEdit both reference `bankAccountId`
    - `AccountsClient.tsx` no longer contains the string "Linked liabilities are not yet wired"; both bank AND investment `getRowDetail` render filtered liabilities
    - `bun run typecheck` exits 0; `bun run lint` exits 0
  </acceptance_criteria>
  <done>Liability form links to accounts (cross-entity rejected); /accounts row-detail shows genuinely linked liabilities for both account types.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser → tRPC (liability.create / update) | admin client submits a liability payload including `bankAccountId` / `investmentAccountId` — untrusted: the id can be forged/tampered |
| browser → tRPC (specificBequest / personalProperty mutations) | admin client submits `estimatedValue` / `insured` — flows through existing `adminProcedure`-gated create/update |
| tRPC → Postgres (RLS) | JWT-bound `authenticated` role; `app.is_admin()` policy on `liability` / `personal_property`; admin-OR-own-row on `specific_bequest` |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-26-01 | T (Tampering) | `liability.create` / `liability.update` — the new `bankAccountId` / `investmentAccountId` FK columns in the input payload | mitigate | A linked account id is attacker-controllable. Without a check, a request scoped to entity A could attach a `bankAccountId` belonging to entity B, creating a cross-entity data leak via /accounts row-detail. Mitigation (Task 2): `assertLinkedAccountsInEntity` looks up each non-null FK with `and(eq(account.id, fkId), eq(account.entityId, input.entityId))` and throws `BAD_REQUEST` if the account does not belong to the request's entity — mirrors the proven `recordPayment` guard (routers/liability.ts:215-226). Verified by Task-1 tests 2 and 4. RLS is defense-in-depth, not the primary control (the liability INSERT itself is admin-authorized; the FK target is what needs entity scoping). |
| T-26-02 | I (Information disclosure) | `specificBequest.estimatedValue` / `personalProperty.insured` columns surfaced through existing `adminProcedure` list/create/update | accept (N/A — no new policy) | These columns ride existing `adminProcedure`-gated mutations and the existing `crud-authenticated-policy-*` RLS policies on `specific_bequest` / `personal_property`. RLS in Postgres is row-scoped, not column-scoped — a new column on an already-protected table is automatically covered by the table's existing policies. No ALTER POLICY needed (also dispositioned in plan 26-01's threat_model where the columns are created). Rationale for `accept`: no widening of the read surface; `estimatedValue` and `insured` are non-sensitive trust-administration data already visible to any admin viewing the bequest/property row. |
| T-26-03 | I (Information disclosure) | `/accounts` getRowDetail rendering linked liabilities | mitigate | The linked-liabilities list is sourced from `trpc.liability.list` (or `getLinked`), both `adminProcedure` + entityId-scoped + RLS-bound `app.is_admin()`. The client-side `filter(l => l.bankAccountId === account.id)` runs over rows that are already entity-scoped server-side — no cross-entity liability can appear because `liability.list` only returns the current entity's rows. Combined with T-26-01 (a liability cannot be linked to a foreign account in the first place), the row-detail cannot leak another entity's liabilities. |
</threat_model>

<verification>
- `bun run typecheck` exits 0.
- `bun run lint` (biome) exits 0 — zero findings (MEMORY: lint warnings are
  never "pre-existing", clean main).
- `bun test tests/trpc/liability.test.ts` exits 0 — the 5 new linkage tests
  plus the pre-existing payoffProjections tests all pass.
- Manual smoke (documented in SUMMARY): /bequests "Total value" shows a
  currency figure; /artwork "Insured count" reflects insured items;
  /accounts row-detail lists linked liabilities; submitting a liability with a
  cross-entity account id is rejected with a toast.
</verification>

<success_criteria>
- /bequests "Total value", /artwork "Insured count", and /accounts linked
  liabilities all show real data — no placeholders remain.
- Liability create/edit form can link a liability to a bank or investment
  account; cross-entity links are rejected server-side (BAD_REQUEST).
- All quality gates (typecheck, lint, liability tests) pass without bypass.
</success_criteria>

<output>
After completion, create
`.planning/phases/26-schema-completeness-for-kpi-data/26-02-SUMMARY.md`.

The SUMMARY MUST note: `liability.getLinked` is an intentionally-provided and
unit-tested API surface that the phase-26 UI does NOT consume — Task 5's
/accounts row-detail uses client-side `trpc.liability.list` + `.filter()` to
avoid an N+1 query per expanded row. `getLinked` is reserved for a future
single-account view; it is deliberate forward API, not dead code, so a
downstream verifier or code reviewer should not flag it.
</output>
