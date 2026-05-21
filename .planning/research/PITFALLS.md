# Pitfalls Research

**Domain:** Firearms tracking in a trust/estate administration app (Texas Irrevocable Trust)
**Researched:** 2026-05-21
**Confidence:** HIGH (codebase analysis) / MEDIUM (legal/compliance, ATF regulatory, verified against official ATF sources)

---

## Scope Note: This App is a Recordkeeping Tool, Not a Legal Advice Tool

Every UI surface that mentions NFA classification, ATF Form 5, or prohibited-person status must carry a disclaimer in the admin notes/help text: "This field is for recordkeeping only. Consult a firearms attorney or your FFL dealer for transfer requirements." The app must never imply it validates legal eligibility, generates ATF forms, or provides legal guidance. Omitting this boundary is itself a pitfall — trustees may over-rely on the app's fields to determine whether a transfer is lawful.

---

## Critical Pitfalls

### Pitfall 1: Treating NFA Items the Same as Title I Firearms

**What goes wrong:**
The UI and data model treat a suppressor, SBR, or machine gun exactly like a standard handgun or rifle. The admin records a status of "TRANSFERRED" and considers the estate item resolved — but no ATF Form 5 process was tracked, no tax stamp is recorded, and the transfer may not have been legally completed.

**Why it happens:**
Developers (and sometimes trustees) conflate "firearms" as a single category. The NFA classification field is absent or optional, so it gets skipped. The transfer-status enum (`PENDING / STARTED / COMPLETE`) mirrors other asset tables and implies completion without requiring any NFA-specific checkpoint.

**How to avoid:**
- Add a non-nullable `nfaClassification` enum column: `NONE | SUPPRESSOR | SBR | SBS | MACHINE_GUN | DESTRUCTIVE_DEVICE | AOW`. `NONE` = Title I ordinary firearm.
- When `nfaClassification != 'NONE'`, the UI should surface a prominent warning block (not a tooltip) reminding the admin that ATF Form 5 is required for estate transfer and that items cannot be transferred to a beneficiary until Form 5 is approved.
- `transferStatus` should still use the shared enum, but the admin page should add an NFA-specific field: `form5Status` (`NOT_APPLICABLE | PENDING_SUBMISSION | SUBMITTED | APPROVED | DENIED`) that is required when `nfaClassification != 'NONE'`.
- Do not auto-set `transferStatus = 'COMPLETE'` if `form5Status != 'APPROVED'` for NFA items.

**Warning signs:**
- NFA classification is a free-text or optional field.
- The transfer-complete state for a suppressor or SBR is reachable without touching any ATF form tracking field.
- The admin page has no visual differentiation between NFA and non-NFA firearms.

**Phase to address:** Firearms schema + admin page phase (Phase 1 of v5.0).

---

### Pitfall 2: Transferring to a Prohibited Person Without Detection

**What goes wrong:**
A firearm (NFA or Title I) is marked TRANSFERRED to a beneficiary who is legally prohibited from possessing firearms under 18 U.S.C. § 922(g) (felony conviction, domestic violence misdemeanor, etc.) or under Texas state law. The estate incurs federal criminal liability. For NFA items, this is a 10-year federal prison exposure.

**Why it happens:**
The recordkeeping app has no prohibited-person detection (it should not — that is NICS's job), but it also has no flag field or note field that prompts the admin to confirm eligibility before recording a transfer. The beneficiary record has no "prohibited person check confirmed" field.

**How to avoid:**
- Add a boolean field `prohibitedPersonCheck` (default `false`) to the `firearm` table's transfer workflow, not to the beneficiary table. This field records that the trustee confirmed the recipient is not a prohibited person at transfer time — it is a trustee attestation, not a legal determination.
- The admin UI should require this checkbox to be checked before `transferStatus` can be set to `COMPLETE`.
- Add UI copy: "I confirm the recipient has been verified as a non-prohibited person under federal and Texas law. This app does not perform background checks."
- For NFA items, also require `form5Status = 'APPROVED'` as a pre-condition.

**Warning signs:**
- There is no transfer confirmation flow — transferring a firearm is a single dropdown change with no step or confirmation.
- Beneficiary record has no flag for legal disability.

**Phase to address:** Firearms admin page phase (Phase 1 of v5.0). Add the confirmation step to the transfer mutation in the tRPC router and the UI.

---

### Pitfall 3: Unregistered NFA Items Cannot Be Transferred — Must Be Surrendered

**What goes wrong:**
The estate contains a suppressor, SBR, or machine gun that was never registered in the ATF's National Firearms Registration and Transfer Record (NFRTR). The app records it as an asset with `nfaClassification = 'SUPPRESSOR'` and `transferStatus = 'PENDING'`, implying it can eventually be transferred. It cannot. Unregistered NFA items are contraband and must be surrendered to the ATF — they have no transferable value and no lawful path to beneficiary receipt.

**Why it happens:**
The data model makes no distinction between a registered NFA item and an unregistered one. Both are just rows with a classification field.

**How to avoid:**
- Add a `nfaRegistered` boolean (nullable, default null for `nfaClassification = 'NONE'`) column. Only required when `nfaClassification != 'NONE'`.
- When `nfaRegistered = false`, the UI should display a red alert: "Unregistered NFA items are contraband. Do not attempt to transfer. Consult an attorney immediately." `transferStatus` should be forced to a non-PENDING state — e.g., add `SURRENDERED` to the `TransferStatus` enum.
- Add `SURRENDERED` to the existing `transferStatus` enum if it does not already exist.

**Warning signs:**
- The NFA registration field is absent or optional with no enforcement.
- A firearm row with `nfaClassification = 'SUPPRESSOR'` and `nfaRegistered = null` can be set to `transferStatus = 'COMPLETE'`.

**Phase to address:** Firearms schema phase. The `SURRENDERED` enum value addition requires a migration.

---

### Pitfall 4: db:push Corrupts RLS on the New Firearm Table

**What goes wrong:**
`drizzle-kit push` is used instead of `db:deploy` to apply the new `firearm` table. The RLS policies defined in the schema are mishandled, leaving the table either unprotected (policies dropped) or inaccessible (policies incorrectly applied). This has already burned this codebase once (documented in CLAUDE.md).

**Why it happens:**
Muscle memory from other projects. `drizzle-kit push` is fast and tempting for new table additions. The warning in CLAUDE.md is easy to miss in the heat of development.

**How to avoid:**
- Always use `bun run db:deploy` (= `db:generate` + `db:migrate`). Never `db:push`.
- After migration, verify with `db:studio` or a raw SQL query that the policies exist: `SELECT policyname, permissive, roles, cmd, qual FROM pg_policies WHERE tablename = 'firearm';`

**Warning signs:**
- Running `db:push` produces "warning: RLS policies" output and continues anyway.
- After migration, queries from the `authenticated` role return empty sets when they should return rows (policies are too restrictive) or return all rows regardless of entity (policies are missing).

**Phase to address:** Firearms schema phase. Add verification step to phase success criteria.

---

### Pitfall 5: Forgetting .enableRLS() on the Firearm Table

**What goes wrong:**
The `firearm` table is defined in `db/schema.ts` without `.enableRLS()` at the end of the `pgTable(...)` call. The table is created without row-level security enabled. All RLS policies attached via `pgPolicy(...)` are registered in the schema but have no effect because RLS is not enabled at the table level. Admin/trustee/arbiter queries work fine (they bypass via `neondb_owner`), but `authenticated`-role queries are not filtered — in practice, no beneficiary currently has read access to asset tables, so this may go unnoticed.

**Why it happens:**
The `insurancePolicy` table was the documented exception (it has `.enableRLS()` but no `transferStatus`). When using insurancePolicy as the template for a "simpler" asset table, the developer may copy the body but miss the `.enableRLS()` tail call, or simply forget that every asset table in this codebase requires it.

**How to avoid:**
- Check that `.enableRLS()` is chained after the closing parenthesis of every new asset table definition before running the migration.
- After migration, verify: `SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'firearm';` — `relrowsecurity` must be `true`.

**Warning signs:**
- The schema file has `pgPolicy(...)` entries inside the table definition but no `.enableRLS()` chained at the end.
- `pg_class.relrowsecurity = false` for the `firearm` table.

**Phase to address:** Firearms schema phase.

---

### Pitfall 6: Missing entityId in WHERE Clauses

**What goes wrong:**
The `firearm` router's `list` procedure queries `db.select().from(firearm)` without an `entityId` filter. Since this is a single-trust app today, this works — but it violates the established pattern, breaks the Entity ID Validation pattern documented in MEMORY.md, and will silently serve cross-entity data if the schema is ever extended.

**Why it happens:**
It's a single-entity app in practice. The developer skips the filter and the query still returns correct results, so the bug is invisible.

**How to avoid:**
- Router input: `z.object({ entityId: z.coerce.number() })` — required, not optional.
- All `list`, `byId`, `update`, and `delete` procedures include `eq(firearm.entityId, input.entityId)` in every WHERE clause.
- `create` includes `entityId: input.entityId` in the insert payload.
- Frontend: `trpc.firearm.list.useQuery({ entityId: selectedEntity! }, { enabled: !!selectedEntity })`.

**Warning signs:**
- The router input schema does not include `entityId`.
- A `list` query returns rows without any `.where(eq(...entityId...))` clause.

**Phase to address:** Firearms router phase.

---

### Pitfall 7: Forgetting to Wire the Firearm Table into asset.ts listAll and dashboard.ts summary

**What goes wrong:**
The firearm table is created and its dedicated `/firearms` admin page works perfectly. But `asset.ts:listAll` still fans out across only 7 tables — `firearm` is never queried. The `/assets` unified view is missing all firearms. Similarly, `dashboard.ts:summary` does not include a `firearms` query in its `Promise.all`, so the dashboard KPI for total assets does not count firearms.

**Why it happens:**
Both `asset.ts` and `dashboard.ts` have explicit per-table fan-outs. Adding a new table requires manual edits to both files. It's easy to deliver the dedicated admin page and consider the feature done without checking the aggregators.

**How to avoid:**
- Phase success criteria must explicitly list: (a) firearm rows appear in `/assets` unified table, (b) firearm rows contribute to dashboard asset totals.
- In `asset.ts`: add `firearm` to the `Promise.all`, add a `'firearm'` `AssetKind`, add the mapper loop, and add `href: '/firearms'`.
- In `dashboard.ts:summary`: add `db.select().from(firearm).where(eq(firearm.entityId, entityId))` to the `Promise.all` and include `firearms` in the return object.
- `AssetKind` type in `asset.ts` must be extended: `| 'firearm'`.

**Warning signs:**
- The `/assets` page loads without error but shows no firearm rows.
- The dashboard "Total Assets" KPI does not change after adding a firearm record.

**Phase to address:** Firearms admin page + integration phase. Treat as a required integration checklist item, not an afterthought.

---

### Pitfall 8: Snake_case vs. camelCase Column Migration Failure

**What goes wrong:**
Drizzle-kit auto-generates a migration file for the `firearm` table. Column names like `serialNumber`, `dodValue`, `dodValueDate`, `transferStatus`, `nfaClassification`, `nfaRegistered`, `form5Status` are defined in camelCase in the schema. But if any hand-edited SQL within the migration (UPDATE, DEFAULT, CHECK, or constraint) references a column by the snake_case name Drizzle sometimes uses in raw SQL blocks, `drizzle-kit migrate` will fail with `column "serial_number" does not exist` — and `drizzle-kit migrate` may swallow the Postgres error, reporting only a bare exit code 1 with no message.

This codebase uses camelCase column names in Postgres (see MEMORY.md: migration `0008_add_name_description_to_assets.sql` failed exactly this way and required hand-editing).

**Why it happens:**
Drizzle-kit's auto-generated ALTER/UPDATE/DEFAULT SQL sometimes emits snake_case column references even when the schema definition uses camelCase. The developer applies the migration without inspecting the generated SQL first.

**How to avoid:**
- After `bun run db:generate`, open the generated migration file and review every column reference in raw SQL blocks (UPDATE, DEFAULT expressions, CHECK constraints). Replace any snake_case references with the camelCase column name as it will be stored in Postgres.
- If migration fails with bare exit code 1 and no message, run the SQL manually via `getClient()` (postgres.js transaction) — not `getSql()` (which reports DDL success even when nothing persists) — to surface the real Postgres error.
- After confirming the SQL is correct and applying manually, update `drizzle.__drizzle_migrations` with the correct hash rather than deleting the row (see MEMORY.md: Stale __drizzle_migrations Row Recovery).

**Warning signs:**
- `bun run db:deploy` exits with code 1 and no error message.
- The `firearm` table does not exist in `db:studio` after `db:deploy` appeared to succeed.

**Phase to address:** Firearms schema migration phase.

---

### Pitfall 9: Serial Number as a Non-Unique Plain String

**What goes wrong:**
`serialNumber` is defined as a plain `text()` column with no uniqueness constraint and no validation. Two firearm rows with the same serial number are inserted — a data entry error that is impossible to detect later. Worse, when reporting to an attorney or filing ATF paperwork, the duplicate serial creates ambiguity about which physical firearm is which.

**Why it happens:**
Serial numbers look like names — long strings of characters. Adding a `uniqueIndex` feels unnecessary for a single-trust app with a handful of firearms.

**How to avoid:**
- Add a `uniqueIndex` on `serialNumber` (scoped globally, not per entity, since serial numbers identify specific physical firearms regardless of ownership).
- Add Zod validation in `db/validation.ts`: non-empty, max 50 chars, trimmed. Reject whitespace-only values.
- In the tRPC `create` and `update` procedures, handle the unique constraint violation (Postgres error code `23505`) and surface it as a user-friendly `TRPCError({ code: 'CONFLICT', message: 'A firearm with this serial number already exists.' })`.

**Warning signs:**
- `serialNumber` column has no unique index in the migration.
- The tRPC create procedure does not handle `23505` and throws a 500 on duplicate entry.

**Phase to address:** Firearms schema phase.

---

### Pitfall 10: Free-Text Caliber Field Creates Query/Filter Mess

**What goes wrong:**
`caliber` is stored as free text. The admin enters "9mm", another enters "9 mm", another enters "9x19", another enters "9x19mm Parabellum". The caliber filter on the firearms table becomes useless. Aggregation by caliber (e.g., grouping firearms for a specific distribution) returns nonsense.

**Why it happens:**
Caliber seems like it should be free-text because there are hundreds of calibers and no standard enum. But for a trust with a known, bounded collection of firearms, the actual set of calibers is small and stable.

**How to avoid:**
- Store caliber as free text but enforce trimming + normalization in the Zod schema (`.trim().toUpperCase()` or a canonical form).
- Alternatively, use a short `pgEnum` seeded from the trust's actual firearms inventory (10-15 values), with an `OTHER` escape hatch and a `caliberNotes` text field for anything not in the enum.
- For the Hudson Trust specifically, free text with normalization is acceptable — the collection is small and enumeration of calibers is not a required query pattern.

**Warning signs:**
- The caliber column has no Zod normalization.
- The firearms table has multiple rows with visually identical calibers that differ by spacing or capitalization.

**Phase to address:** Firearms schema + validation phase.

---

### Pitfall 11: Confusing "Firearm Type" with "NFA Classification"

**What goes wrong:**
The schema has a single `type` or `category` field that blends the physical description (pistol, rifle, shotgun, revolver) with the regulatory classification (NFA / Title I). A "pistol" is entered as the type, but no NFA classification is recorded — the admin doesn't know to ask whether it has been configured as an SBR. Or a field named `nfaClass` is set to "Rifle" — which is not an NFA class, it's a firearm type.

**Why it happens:**
NFA classification and firearm type are two orthogonal dimensions. Developers conflate them because "what kind of gun is it?" seems like one question.

**How to avoid:**
- Two separate columns:
  - `firearmType` enum: `PISTOL | REVOLVER | RIFLE | SHOTGUN | OTHER` — physical description of the firearm.
  - `nfaClassification` enum: `NONE | SUPPRESSOR | SBR | SBS | MACHINE_GUN | DESTRUCTIVE_DEVICE | AOW` — regulatory category. Default `NONE`.
- These are independent. A rifle can have `nfaClassification = 'NONE'` (standard Title I) or `nfaClassification = 'SBR'` (if the barrel was cut). A pistol can have `nfaClassification = 'NONE'` or `nfaClassification = 'AOW'` in edge cases.

**Warning signs:**
- A single field is overloaded to hold both type and NFA class values.
- NFA class values like "SBR" appear in the same enum as "Pistol" or "Rifle".

**Phase to address:** Firearms schema phase.

---

### Pitfall 12: Valuation Drift — DOD Value Set Once, Never Updated

**What goes wrong:**
`dodValue` is set at intake and never reviewed. Firearms, especially collectibles, antiques, and NFA items, can appreciate significantly. The dashboard shows a stale DOD value as the "current value." Distributions based on appraised value are miscalculated.

**Why it happens:**
Other asset tables in this codebase already have `dodValue` + `dodValueDate` + `valuationType`. But the `valuation` table (which tracks ongoing reappraisals for vehicles, properties, etc.) has explicit FK columns for each asset type: `vehicleId`, `homesteadId`, etc. (see `schema.ts` lines 1133-1160). If a `firearmId` FK is not added to the `valuation` table, firearms cannot participate in the valuation history system.

**How to avoid:**
- Add `firearmId: bigint({ mode: 'number' })` to the `valuation` table (nullable FK to `firearm.id`).
- Add a `uniqueIndex` or `index` on `valuation.firearmId`.
- Add the FK constraint with `onDelete: 'set null'`.
- This is a second migration touching the existing `valuation` table — plan it alongside the `firearm` table creation migration or as an explicit step.

**Warning signs:**
- The `valuation` table in `db/schema.ts` has no `firearmId` column after the firearm table is added.
- There is no way to record a post-DOD appraisal for a firearm from the valuation router.

**Phase to address:** Firearms schema phase. Must be planned alongside the initial table creation.

---

### Pitfall 13: Serial Number and Location Data in CSV Export Without Access Control

**What goes wrong:**
The firearms admin page includes a DataTable with a CSV export button (standard pattern across 14 admin tables in v4.0). The export includes `serialNumber`, `make`, `model`, `location`, and `nfaClassification`. This CSV is downloadable from any browser session — including one left open on an unattended screen. For NFA items, serial numbers + location constitute sensitive federal recordkeeping data. A stolen or leaked CSV of firearm serial numbers and storage locations creates security risk for the trust and its beneficiaries.

**Why it happens:**
CSV export is a standard DataTable feature applied uniformly. Firearms are treated like any other asset column set.

**How to avoid:**
- Exclude `location` from the default CSV column set. Location should be a detail visible only on the row-expand or detail dialog.
- Consider whether `serialNumber` belongs in the CSV. For the Hudson Trust use case, the admin is likely the only user and this is acceptable — but the phase should make an explicit decision and document it rather than inheriting the default.
- The CSV export is already gated behind `adminProcedure` (no beneficiary access to asset tables), so the tRPC layer is correct. The risk is physical/session access, not authorization bypass.

**Warning signs:**
- The CSV export column config includes `location` by default.
- No consideration was given to which columns are in the export during design.

**Phase to address:** Firearms admin page phase.

---

### Pitfall 14: Beneficiary Cleanup Breaks sortIndex Ordering by Removing the UI Without Updating the Query

**What goes wrong:**
The Display Order card and `BeneficiarySortableList` component are removed. The `beneficiary.reorder` tRPC mutation is left registered in the router (it's never called, but it's dead code). The `beneficiary.list` query still returns rows ordered by `ORDER BY "sortIndex" ASC` (see `beneficiary.ts` line 29). If the component removal also incorrectly removes the `asc(beneficiary.sortIndex)` orderBy from the list query, beneficiaries render in raw insertion order instead of the persisted sort order.

**Why it happens:**
The developer removes the drag-reorder UI and also removes the orderBy clause thinking "there's no sort UI anymore." But `sortIndex` is a persisted column and the table still uses it.

**How to avoid:**
- Retain `orderBy(asc(beneficiary.sortIndex))` in the `beneficiary.list` query.
- Only remove: the `BeneficiarySortableList` component, the `BeneficiaryAvatarStack` component (per PROJECT.md), the `WithdrawalMilestoneGantt` component, and the Display Order card wrapping them in `BeneficiariesClient.tsx`.
- The `beneficiary.reorder` tRPC procedure can remain registered (it's a no-op if unused). Removing it is a cleanup task, not required for correctness.
- Do NOT remove the `sortIndex` column from the schema — PROJECT.md explicitly says "keeps the beneficiary `sortIndex` column."

**Warning signs:**
- After removing the Display Order UI, beneficiaries render in a different order than before the change.
- The `beneficiary.list` query no longer has an `orderBy` clause.
- The `sortIndex` column is missing from the schema file.

**Phase to address:** Beneficiary UX cleanup phase (Phase 2 of v5.0).

---

### Pitfall 15: Orphaned Imports After Beneficiary Component Deletion

**What goes wrong:**
`BeneficiarySortableList.tsx`, `BeneficiaryAvatarStack.tsx`, and `WithdrawalMilestoneGantt.tsx` are deleted from the filesystem. `BeneficiariesClient.tsx` still imports them (lines 18, ~220, ~259 based on grep output). TypeScript build fails. Biome also flags the now-unused `useMemo` calls on `avatarItems` and `milestoneItems` (lines 167-199) as no-op computations if the components consuming them are removed.

**Why it happens:**
Component files are deleted before the consuming component's import block is cleaned up.

**How to avoid:**
- Remove the import lines and the consuming JSX in `BeneficiariesClient.tsx` before or simultaneously with deleting the component files.
- Remove the `avatarItems` and `milestoneItems` `useMemo` blocks (lines 167-199) since they feed the now-removed components.
- Run `bun run typecheck` and `bun run lint` after the deletion to catch any stragglers.
- Check `components/ui/sortable` — if `BeneficiarySortableList` is the only consumer of the sortable primitive, the import may now be unused in the UI library barrel. Verify it is used elsewhere before removing.

**Warning signs:**
- TypeScript errors on `Cannot find module './BeneficiarySortableList'` after deleting component files.
- Biome lint errors on unused variables (`avatarItems`, `milestoneItems`).

**Phase to address:** Beneficiary UX cleanup phase.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Free-text caliber with no normalization | No enum to maintain | Filter/sort unusable; duplicate values | Acceptable for small collection if Zod `.trim()` is applied |
| No `form5Status` field; use notes column for ATF tracking | Less schema complexity | No queryable ATF transfer state; can't filter "NFA items awaiting Form 5" | Never — the whole point of NFA tracking is the form-5 status |
| Omit `firearmId` FK from `valuation` table | One fewer migration step | Firearms can't participate in valuation history system | Acceptable only if valuation history for firearms is explicitly out of scope |
| Skip `prohibitedPersonCheck` attestation field | Simpler form | Transfer can be recorded as COMPLETE without trustee attestation | Never — this is a trustee liability issue |
| Leave `reorder` mutation in router after removing drag UI | Zero effort | Dead code accumulates; confuses future developers | Acceptable temporarily; clean up in same PR if easy |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `asset.ts` listAll | Adding `firearm` table but not adding it to the `Promise.all` fan-out | Add 8th entry to the parallel query array, add `'firearm'` to `AssetKind`, add mapper loop, add `href: '/firearms'` |
| `dashboard.ts` summary | Adding `firearm` table but not adding it to the `Promise.all` in `summary` | Add `db.select().from(firearm).where(eq(firearm.entityId, entityId))` to the array; include `firearms` in return |
| `valuation` table | New asset table added but `valuation` table not extended with FK | Add `firearmId` nullable FK to `valuation` table in the same migration batch |
| `transferStatus` enum | Adding `SURRENDERED` value for unregistered NFA items | Add enum value to the existing `TransferStatus` pgEnum in schema.ts; generates its own migration |
| Nav alphabetization | Inserting Firearms entry but not checking alphabetical order | Final order: Accounts, Artwork, Firearms, Insurance, Personal Property, Properties, Vehicles |
| Drizzle migration column refs | `drizzle-kit generate` outputs snake_case in raw SQL blocks | Inspect generated file; hand-edit any `serial_number` → `serialNumber`, `nfa_classification` → `nfaClassification`, etc. |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| `location` column in CSV export | Physical security of firearms revealed in exported file | Exclude `location` from default CSV columns; display only in row-expand |
| No `.enableRLS()` on firearm table | Table unprotected by row-level security; all authenticated users could read all rows if policies are bypassed | Verify `relrowsecurity = true` after migration via SQL or db:studio |
| Omitting `pgPolicy` entries from firearm table definition | `authenticated` role blocked from reading own records | Copy policy block from `personalProperty` as template; use `app.is_admin()` condition (firearms are admin-only) |
| Serial numbers in activity log `newValues` JSON | Activity log is global (no entityId) and admin-visible; serial number exposure is low risk but worth noting | No specific action needed — activity log is admin-only; noting for awareness |

---

## "Looks Done But Isn't" Checklist

- [ ] **Firearm table RLS:** `.enableRLS()` chained; verified with `SELECT relrowsecurity FROM pg_class WHERE relname = 'firearm'`
- [ ] **Firearm router entityId:** Every procedure has `entityId` in input schema and WHERE clause
- [ ] **asset.ts listAll:** `firearm` added to `Promise.all`; `AssetKind` extended; mapper loop written; `href: '/firearms'`
- [ ] **dashboard.ts summary:** `firearm` added to `Promise.all`; included in return object
- [ ] **NFA items gate transfer-complete:** `transferStatus = 'COMPLETE'` blocked when `nfaClassification != 'NONE'` and `form5Status != 'APPROVED'`
- [ ] **Beneficiary sortIndex orderBy preserved:** `beneficiary.list` still `orderBy(asc(beneficiary.sortIndex))` after UI removal
- [ ] **No orphaned imports:** `BeneficiariesClient.tsx` has no imports of deleted components; `avatarItems`/`milestoneItems` useMemo blocks removed
- [ ] **Migration camelCase verified:** Generated migration SQL reviewed for snake_case column references; hand-corrected before apply
- [ ] **db:deploy used, not db:push:** Confirmed in shell history / commit message
- [ ] **valuation table extended:** `firearmId` FK added to `valuation` table (or explicitly deferred with rationale)
- [ ] **Serial number unique index:** `uniqueIndex` on `serialNumber` in schema; 23505 error handled in tRPC create procedure
- [ ] **Nav alphabetical:** Assets dropdown order is Accounts, Artwork, Firearms, Insurance, Personal Property, Properties, Vehicles
- [ ] **Disclaimer text present:** Admin firearms page includes "recordkeeping only, not legal advice" notice
- [ ] **stale query invalidation:** All firearm mutations call `utils.firearm.list.invalidate()` in `onSuccess`

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| db:push corrupts RLS | MEDIUM | Run `bun run db:deploy`; manually verify policies exist via `pg_policies`; if policies are missing, re-apply `add-rls-policies.sql` for the firearm table only |
| RLS not enabled (missing `.enableRLS()`) | LOW | Add `.enableRLS()` to schema; generate migration; deploy; verify `relrowsecurity` |
| Migration fails (camelCase column not found) | LOW | Run SQL via postgres.js `getClient()` to surface error; hand-edit migration file column names; update `drizzle.__drizzle_migrations` hash |
| asset.ts not updated (firearms missing from /assets) | LOW | Add fan-out entry and mapper; no migration needed; deploy code change |
| Beneficiary orderBy removed accidentally | LOW | Restore `orderBy(asc(beneficiary.sortIndex))` in `beneficiary.list` query; redeploy |
| Orphaned import causes build failure | LOW | Remove import line from `BeneficiariesClient.tsx`; clean up useMemo blocks; redeploy |
| Duplicate serial number in DB | MEDIUM | Identify duplicates with `SELECT serialNumber, COUNT(*) FROM firearm GROUP BY serialNumber HAVING COUNT(*) > 1`; resolve via admin UI or direct SQL correction; add unique index going forward |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| NFA items treated as Title I | Phase 1: Firearms schema | `nfaClassification` enum exists; `form5Status` field present; NFA items cannot reach `transferStatus = 'COMPLETE'` without `form5Status = 'APPROVED'` |
| Transfer to prohibited person | Phase 1: Firearms admin page | Transfer confirmation modal requires `prohibitedPersonCheck` checkbox |
| Unregistered NFA items | Phase 1: Firearms schema | `nfaRegistered` field exists; `SURRENDERED` in `TransferStatus` enum; alert displayed when `nfaRegistered = false` |
| db:push corrupts RLS | Phase 1: Firearms schema migration | `bun run db:deploy` used; `relrowsecurity = true` verified post-migration |
| Missing `.enableRLS()` | Phase 1: Firearms schema | Schema file review; SQL verification post-migration |
| Missing entityId in router | Phase 1: Firearms router | All procedures have `entityId` in input schema and WHERE |
| asset.ts and dashboard.ts not updated | Phase 1: Integration wiring | Firearm rows visible in `/assets`; dashboard totals change after adding firearm |
| Migration camelCase failure | Phase 1: Schema migration | Review generated SQL before apply; `db:deploy` succeeds cleanly |
| Serial number uniqueness | Phase 1: Firearms schema | Unique index present; 23505 handled in tRPC |
| Caliber free-text chaos | Phase 1: Firearms schema | Zod `.trim()` applied; normalization enforced |
| Firearm type vs NFA class confusion | Phase 1: Firearms schema | Two separate fields: `firearmType` and `nfaClassification` |
| Valuation drift / no firearmId FK | Phase 1: Firearms schema | `valuation.firearmId` FK exists or explicitly deferred |
| Serial number in CSV export | Phase 1: Admin page | Location excluded from CSV by default |
| Beneficiary sortIndex orderBy removed | Phase 2: Beneficiary UX cleanup | `beneficiary.list` orderBy clause present after cleanup; beneficiary order matches pre-change order |
| Orphaned imports | Phase 2: Beneficiary UX cleanup | `bun run typecheck` and `bun run lint` pass with no errors |

---

## Sources

- [ATF NFA Handbook Chapter 9 — Transfers of NFA Firearms](https://www.atf.gov/firearms/docs/undefined/atf-national-firearms-act-handbook-chapter-9/download) — official ATF guidance on estate transfers, Form 5 requirements
- [Heirs Guide to ATF Form 5 — Silencer Central](https://www.silencercentral.com/blog/heirs-guide-to-atf-form-5/) — estate transfer process, custody during processing, prohibited person denial
- [Inheriting NFA Firearms — Ocampo Wiseman Law](https://ocampowisemanlaw.com/post/what-happens-if-i-inherit-an-nfa-firearm) — unregistered NFA items as contraband, surrender requirement
- [Texas Gun Laws 2026 — GunTransfer.com](https://guntransfer.com/gun-laws-in-texas/) — Texas-specific transfer rules, no waiting period
- [Texas State Law Library — Gifts & Inheritance](https://guides.sll.texas.gov/gun-laws/gifts-inheritance) — Texas inheritance firearms law
- [Recordkeeping and Identification of Trust Property in a Gun Trust — Prince Law](https://blog.princelaw.com/2009/01/21/recordkeeping-and-identification-of-trust-property-in-a-gun-nfa-trust/) — make/model/serial trio, trust recordkeeping best practices
- Codebase: `src/server/trpc/routers/asset.ts` — listAll fan-out pattern (7 tables)
- Codebase: `src/server/trpc/routers/dashboard.ts` — summary Promise.all pattern
- Codebase: `db/schema.ts` — existing asset table patterns (`.enableRLS()`, `transferStatus`, `dodValue`, RLS policies)
- Codebase: `src/app/(admin)/beneficiaries/_components/` — BeneficiarySortableList, BeneficiaryAvatarStack, WithdrawalMilestoneGantt
- Codebase: `src/server/trpc/routers/beneficiary.ts` — sortIndex ordering, reorder mutation
- Codebase: `CLAUDE.md` — db:push RLS gotcha, camelCase migration gotcha, entityId pattern

---
*Pitfalls research for: Firearms tracking + beneficiary UX cleanup in a Texas trust administration app*
*Researched: 2026-05-21*
