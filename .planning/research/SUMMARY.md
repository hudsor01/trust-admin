# Project Research Summary

**Project:** Trust Admin — v5.0 Firearms Tracking & Beneficiary UX Refinement
**Domain:** Trust/estate administration — 8th asset class addition + UI cleanup
**Researched:** 2026-05-21
**Confidence:** HIGH

## Executive Summary

v5.0 is a well-scoped, low-risk milestone. The firearms feature is a single-pattern addition: the `firearm` table is the 8th asset table following the `vehicle` precedent exactly — same shared columns (`entityId`, `dodValue`, `dodValueDate`, `status`, `transferStatus`), same RLS policy block, same router shape, same admin page layout. Every required technology is already in the stack. Zero new dependencies. All four researchers converged on this conclusion independently. The only genuinely new schema elements are 2–5 new enums and the `firearm` table itself.

The primary implementation risk is not complexity — it is two hardcoded integration points that every researcher independently identified as traps. `asset.ts:listAll` fans out across exactly 7 asset tables via a `Promise.all` with no auto-discovery; `dashboard.ts:summary` enumerates asset types the same way. Both files require manual edits to include `firearm`, and both will silently appear complete (the `/firearms` page works, the router works) while the unified `/assets` view and the dashboard KPI miss all firearm records. These are "looks done but isn't" integration failures that must be treated as phase success criteria, not afterthoughts.

The second risk is legal domain specificity: NFA items (suppressors, SBRs, machine guns, etc.) cannot legally transfer to a beneficiary without ATF Form 5 approval. The schema must model `nfaRegistered`, a Form 5 status field separate from the generic `transferStatus`, and a `SURRENDERED` enum value for unregistered contraband. The app is a recordkeeping tool — it never generates ATF forms or validates legal eligibility — but it must model these states accurately or trustees will rely on it to conclude transfers are complete when they are not. The beneficiary cleanup is fully independent of the firearms work: 3 JSX blocks removed, 3 component files deleted, and `sortIndex` ordering must not be touched.

---

## Key Findings

### Recommended Stack

All four researchers agreed: no new dependencies. The entire v5.0 feature set builds on existing tools. Drizzle `pgEnum` handles NFA classification at the DB level. `createInsertSchema` from `drizzle-zod` with Zod overrides covers all validation. tRPC `adminProcedure` with inline Drizzle queries handles the router. TailwindCSS 4 + shadcn/ui DataTable + KPI strip covers the admin page. UploadThing (already in stack) handles ATF form PDF attachments via the existing polymorphic `document` table.

No firearm-specific npm packages exist that are trustworthy or useful. Serial number formats are manufacturer-specific and not standardized in a validatable way — ATF Form 4473 accepts any alphanumeric string up to 40 chars, which is the correct validation constraint.

**Core technologies (all pre-existing):**
- Drizzle ORM 0.45 — `pgEnum` for NFA classification; `pgTable` for `firearm`; camelCase column names in Postgres
- drizzle-zod + Zod — `createInsertSchema` with serial number regex override; `positiveNumberValidation` for `dodValue`/`acquisitionCost`
- tRPC v11 `adminProcedure` — all firearm mutations are admin-only, same as `vehicleRouter`
- Drizzle `uniqueIndex` — serial number uniqueness constraint (same pattern as `vehicle.vin`)
- UploadThing — ATF form PDF attachment via extended `document` table FK

### Expected Features

**Enum count resolution (STACK said 2, FEATURES said 5):** STACK.md counted the minimum: `nfaItemClass` + `atfFormType`. FEATURES.md is the fuller picture and is correct for implementation: `FirearmType`, `NfaClass`, `AtfFormType`, `FirearmCondition` (NRA grades: POOR/FAIR/GOOD/VERY_GOOD/EXCELLENT/NEW), and optionally `NfaTransferStatus`. The two-field split (`firearmType` for physical form factor, `nfaClass` for regulatory classification) is the recommended design — they are orthogonal; a standard rifle can be NFA-classified SBR if the barrel was cut.

**Must have (table stakes) — Phase 1:**
- `firearm` table: entityId, name, make, model, serialNumber (unique index), firearmType enum, caliber (text + Zod trim), isNfa boolean, nfaClass enum, atfFormType enum, atfControlNumber, taxStampDate, dodValue/dodValueDate/dodValueType, condition (NRA grades enum), status, transferStatus, location, insured, notes
- `firearmRouter` tRPC (list/byId/create/update/delete) — all `adminProcedure`, all `entityId`-gated
- `/firearms` admin page with DataTable, KPI strip, create/edit form
- Dashboard asset totals updated to include `firearm.dodValue`
- Nav entry "Firearms" alphabetically between "Artwork" and "Insurance" (full reorder: Accounts, Artwork, Firearms, Insurance, Personal Property, Properties, Vehicles)
- `document.firearmId` FK + `document_single_owner_check` constraint update (8 → 9 FKs in the CHECK expression)

**Should have (differentiators) — Phase 2 or same PR if low cost:**
- `nfaTransferStatus` / `form5Status` enum — tracks ATF Form 5 filing lifecycle separately from generic `transferStatus`; critical for NFA legal correctness
- `valuation.firearmId` FK — enables historical appraisal tracking; adds a migration touching an existing table + `valuation_single_asset_check` update

**Defer:**
- Bulk CSV import for large collections
- ATF eForms integration (proprietary API, not exposed to third parties)
- Background check / prohibited-person NICS verification (FFL-only federal system)
- Ammo inventory table (near-zero FMV contribution)

### Architecture Approach

The `firearm` table follows the standard 6-asset shared-column shape exactly. All component boundaries are copy-and-modify from the `vehicle` pattern. Phase ordering is strictly dependency-driven: schema types must compile before router types generate; router types must generate before UI can consume them; aggregators wire in last.

**Component map (20 files total):**

| Layer | Files | Status |
|-------|-------|--------|
| Schema | `db/schema.ts`, `db/relations.ts`, `db/validation.ts` | MODIFIED |
| Migration | `db/migrations/<next>.sql` | NEW (generated + hand-audited) |
| Router | `src/server/trpc/routers/firearm.ts` | NEW |
| Router registration | `src/server/trpc/router.ts` | MODIFIED |
| Aggregators | `routers/asset.ts`, `routers/dashboard.ts`, `DashboardClient.tsx` | MODIFIED |
| Admin page | `src/app/(admin)/firearms/` (6 files) | NEW |
| Sidebar nav | `src/components/app-sidebar.tsx` | MODIFIED |
| Beneficiary cleanup | `BeneficiariesClient.tsx` (MODIFIED) + 3 component files (DELETED) | MODIFIED / DELETED |

### Critical Pitfalls

1. **`asset.ts:listAll` and `dashboard.ts:summary` are hardcoded fan-outs** — both files explicitly name all 7 asset tables in their `Promise.all` arrays with no auto-discovery. The `/firearms` admin page can be fully functional while these aggregators silently omit all firearm records. Must be treated as explicit success criteria with verification steps, not implementation afterthoughts.

2. **Migration camelCase gotcha** — `drizzle-kit generate` sometimes emits snake_case column references (`serial_number`, `dod_value`, `nfa_class`) in UPDATE/DEFAULT/CHECK SQL blocks even when the schema uses camelCase. This codebase's columns are camelCase in Postgres (migration `0008` failed exactly this way and is documented in MEMORY.md). Always hand-audit the generated SQL before `db:migrate`. If `db:deploy` exits with bare code 1, run via `getClient()` (postgres.js) to surface the real Postgres error.

3. **`document` and `valuation` table CHECK constraint updates** — both tables have polymorphic single-owner CHECK constraints that count non-null FK columns. Adding `firearmId` to `document` requires updating the CHECK expression from 8 → 9. If the FK column is added without updating the CHECK expression, every INSERT to those tables will fail the constraint. This is the primary migration risk for existing tables.

4. **NFA items require Form 5 before transfer** — `transferStatus = 'COMPLETE'` must not be reachable for NFA items when `form5Status != 'APPROVED'`. The schema needs `nfaRegistered` boolean (unregistered NFA items are contraband — add `SURRENDERED` to `transferStatus` enum) and a Form 5 status field separate from generic `transferStatus`. These are different lifecycles: ATF Form 5 approval and physical transfer to beneficiary are independent events.

5. **Beneficiary sortIndex ordering must survive the cleanup** — `BeneficiarySortableList` is the write path for `sortIndex`, but `beneficiary.list` orders by `sortIndex` independently. Removing the drag-reorder UI must not touch `orderBy(asc(beneficiary.sortIndex))` in the list query. Edit `BeneficiariesClient.tsx` first (remove JSX blocks + derived variables + imports), then delete the 3 component files, then run `typecheck` + `lint`.

---

## Implications for Roadmap

### Phase 1 — Firearm Schema + Migration

**Rationale:** Schema is the dependency root. Router types, UI, and aggregators all depend on the compiled schema.

**Delivers:** `firearm` table in Postgres with RLS + 4 standard policies; new enums (`FirearmType`, `NfaClass`, `AtfFormType`, `FirearmCondition`); `document.firearmId` FK with updated CHECK constraint; `insertFirearmSchema` / `selectFirearmSchema` / `updateFirearmSchema` in `db/validation.ts`.

**Avoids pitfalls:** camelCase migration gotcha (hand-audit generated SQL), `db:push` RLS corruption (use `db:deploy`), missing `.enableRLS()` (verify `relrowsecurity = true`), serial number non-uniqueness (`uniqueIndex`), `document_single_owner_check` breakage (update to count 9 FKs).

**Open question to resolve before starting:** Does `valuation.firearmId` ship in this phase or defer? Deferral means one additional migration later. Shipping it now requires updating `valuation_single_asset_check`. Recommendation: defer unless there is an immediate need for valuation history on firearms.

**Research flag:** Standard pattern, no additional research needed.

---

### Phase 2 — tRPC Router

**Rationale:** Cannot start until Phase 1 compiles clean. Router types are generated from the schema.

**Delivers:** `src/server/trpc/routers/firearm.ts` with `list`, `byId`, `create`, `update`, `delete` — all `adminProcedure`, all `entityId`-gated. Serial number `23505` conflict handled as `TRPCError({ code: 'CONFLICT' })`. Registration in `src/server/trpc/router.ts`.

**Avoids pitfalls:** missing `entityId` in WHERE clauses (all procedures require it), stale query invalidation (`utils.firearm.list.invalidate()` in `onSuccess`).

**Research flag:** Standard pattern. Direct copy of `vehicleRouter`.

---

### Phase 3 — Admin Page

**Rationale:** UI depends on router types. Phases 1 and 2 must be complete.

**Delivers:** `src/app/(admin)/firearms/` — `page.tsx` (server component + prefetch + HydrationBoundary), `loading.tsx`, `error.tsx`, `FirearmsClient.tsx`, `FirearmTable.tsx`, `FirearmDialog.tsx`. NFA-conditional field visibility (`isNfa` toggle gates NFA class/ATF fields). Recordkeeping disclaimer in help text. `location` excluded from CSV export columns by default.

**Avoids pitfalls:** NFA items visually differentiated (badge, conditional fields, warning when `nfaRegistered = false`), location excluded from CSV.

**Research flag:** Standard pattern. Vehicle page is the direct template.

---

### Phase 4 — Asset Aggregator Integration

**Rationale:** Deliberately separated from Phase 3. The "looks done but isn't" failure mode. Must be explicitly verified, not assumed from Phase 3 working.

**Delivers:** `asset.ts:listAll` — `firearm` in `Promise.all`, `AssetKind` extended with `'firearm'`, mapper loop, `href: '/firearms'`. `dashboard.ts:summary` — `firearm` parallel query + `firearms` in return. `DashboardClient.tsx` — `firearmTotal` in `useMemo` + allocationData entry.

**Success criteria (must verify):**
- Firearm rows appear in `/assets` unified view after adding a record
- Dashboard "Total Assets" KPI changes after adding a firearm record
- Pie chart includes Firearms slice

**Research flag:** Standard pattern. No research needed.

---

### Phase 5 — Sidebar Nav Alphabetization

**Rationale:** Last dependency for feature discoverability. Alphabetization affects all 7 existing sub-items.

**Delivers:** `app-sidebar.tsx` — `firearms` prefetch added; Assets sub-items reordered to: Accounts, Artwork, Firearms, Insurance, Personal Property, Properties, Vehicles.

**Research flag:** Trivial. No research needed.

---

### Phase B — Beneficiary UX Cleanup (parallel/independent)

**Rationale:** Fully independent of firearms work. No schema migrations. No shared files. Can ship as a standalone PR at any point.

**Delivers:** `BeneficiariesClient.tsx` — 3 JSX blocks removed (avatar-stack, Display Order card, `WithdrawalMilestoneGantt`); `avatarItems` and `milestoneItems` useMemo blocks removed; imports removed. Three component files deleted: `BeneficiaryAvatarStack.tsx`, `BeneficiarySortableList.tsx`, `WithdrawalMilestoneGantt.tsx`.

**What is NOT changed:** `beneficiary.sortIndex` schema column. `orderBy(asc(beneficiary.sortIndex))` in `beneficiary.list`. `BeneficiaryShareDonuts.tsx` (remains).

**Avoids pitfalls:** edit consuming component before deleting files, run `typecheck` + `lint` after.

**Research flag:** No research needed. Surgical removal with known boundaries.

---

### Phase Ordering Rationale

- Phases 1 → 2 → 3 → 4 → 5 are strictly dependency-ordered: schema types propagate to router types propagate to UI types.
- Phase 4 is intentionally separated from Phase 3 to force explicit verification of both aggregator integration points. Merging them into Phase 3 creates the "looks done but isn't" failure mode.
- Phase B is independent and can be its own PR.
- The `valuation.firearmId` open question, if deferred, becomes Phase 6 (single-migration phase) when valuation history for firearms is needed.

### Research Flags

Standard patterns (no additional research needed for any phase). The entire feature set is copy-and-modify from `vehicle` + `personalProperty` patterns with ATF legal requirements verified against official source documents in FEATURES.md.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All findings from direct codebase inspection; zero new dependencies confirmed by all four researchers independently |
| Features | HIGH | ATF source documents, Texas law, NFA Handbook Chapter 9 verified with source links; NFA class definitions from 26 U.S.C. § 5845 |
| Architecture | HIGH | All findings from direct codebase inspection of schema.ts, vehicle router, asset.ts, dashboard.ts, BeneficiariesClient.tsx |
| Pitfalls | HIGH (codebase) / MEDIUM (legal) | Codebase pitfalls confirmed from CLAUDE.md/MEMORY.md documented failures; legal compliance from ATF official sources; prohibited-person attestation field is best-practice inference |

**Overall confidence:** HIGH

### Gaps to Address

- **`valuation.firearmId` — defer or ship in Phase 1?** All four researchers flagged this. Implementer must make an explicit decision before beginning Phase 1. Recommendation: defer.

- **`nfaTransferStatus` vs `form5Status` naming and value set** — PITFALLS.md uses a 5-value enum (NOT_APPLICABLE / PENDING_SUBMISSION / SUBMITTED / APPROVED / DENIED); FEATURES.md uses a 3-value enum (NOT_FILED / FILED / APPROVED). Both describe the ATF Form 5 lifecycle. Pick one before schema definition. Recommendation: FEATURES.md's simpler 3-value set for v5.0.

- **`SURRENDERED` in `transferStatus` enum** — PITFALLS.md recommends this for unregistered NFA contraband. Extending the shared `transferStatus` pgEnum touches every asset table using it. Confirm acceptability before including in Phase 1 migration, or keep as a notes-field convention and defer.

---

## Sources

### Primary (HIGH confidence)
- `db/schema.ts` — all 7 existing asset table patterns, existing enum definitions, `document` polymorphic FK pattern
- `src/server/trpc/routers/vehicle.ts` — canonical asset router template
- `src/server/trpc/routers/asset.ts` — confirmed 7-table hardcoded fan-out
- `src/server/trpc/routers/dashboard.ts` — confirmed hardcoded Promise.all enumeration
- ATF Form 5 (5320.5) official instructions — estate transfer Form 5 requirement before distribution
- ATF NFA Handbook Chapter 9 — transfers of NFA firearms in decedents' estates
- 26 U.S.C. § 5845 — NFA item class statutory definitions
- Texas Penal Code § 46.05 (2025 amendments) — SBR/SBS removed from prohibited weapons list
- CLAUDE.md / MEMORY.md — `db:push` RLS gotcha, camelCase migration gotcha (migration 0008 failure)

### Secondary (MEDIUM confidence)
- NRA modern firearms condition grading standards — POOR/FAIR/GOOD/VERY_GOOD/EXCELLENT/NEW
- ATF Form 4473 Box 16 — serial number field allows up to 40 alphanumeric characters
- Silencer Central Heirs Guide — estate Form 5 process, custody during ATF processing window
- Texas State Law Library — Inheriting Firearms, Gifts & Inheritance Gun Laws

### Tertiary (inference)
- `prohibitedPersonCheck` attestation field — trustee liability best practice, not a specific ATF regulatory requirement
- `SURRENDERED` enum value — logical inference from unregistered-NFA-as-contraband requirement

---
*Research completed: 2026-05-21*
*Ready for roadmap: yes*
