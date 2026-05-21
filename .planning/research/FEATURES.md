# Feature Research

**Domain:** Firearms tracking — trust/estate administration asset class
**Researched:** 2026-05-21
**Confidence:** HIGH (ATF source documents + Texas law + domain practitioner sources)

---

## Domain Context

The Hudson Living Trust is a **Texas irrevocable trust** where the grantor died 2024-12-28. Firearms held at death are trust property. The trust is **not** a dedicated NFA/gun trust (it predates the death and holds all estate assets). The trustee's obligations are:

1. Inventory every firearm as of the date of death (DOD valuation for IRS Form 706 estate tax purposes).
2. Secure physical custody pending legal transfer.
3. For **NFA items**: file ATF Form 5 (tax-exempt transfer to lawful heir) before distributing. Wait for ATF approval — distribution before approval is a federal felony.
4. For **Title I items** (standard rifles, handguns, shotguns): Texas allows private intrastate transfer to beneficiaries without FFL involvement. Interstate transfers require shipping through an FFL in the recipient's state.
5. Confirm no beneficiary is a federally or state-prohibited person before transferring.

A **gun trust / NFA trust** is a separate legal entity created specifically for NFA item ownership. The Hudson Living Trust is NOT a gun trust. It holds firearms as ordinary estate property. This distinction matters: there is no "responsible persons schedule" or ATF 5320.23 questionnaire in scope. The firearms are administered like any other inherited personal property, with the NFA transfer paperwork layered on top.

---

## NFA vs. Title I Distinction

**Title I firearms** (26 U.S.C. Chapter 44): Standard rifles (barrel >= 16"), shotguns (barrel >= 18"), handguns. No federal registration. No ATF forms for intrastate Texas-to-Texas inheritance. No tax stamp.

**NFA / Title II firearms** (26 U.S.C. Chapter 53, 26 U.S.C. § 5845): Federally registered items requiring ATF approval to transfer. Six categories:

| NFA Class | Definition | Tax (post-2026) | Extra ATF requirement |
|-----------|-----------|-----------------|----------------------|
| Suppressor (silencer) | Sound suppression device | $0 | Form 5 for estate transfer |
| SBR (short-barreled rifle) | Rifle barrel < 16" or OAL < 26" | $0 | Form 5 for estate transfer; Form 20 to transport interstate |
| SBS (short-barreled shotgun) | Shotgun barrel < 18" or OAL < 26" | $0 | Form 5 for estate transfer; Form 20 to transport interstate |
| Machine gun | Fires more than one round per trigger pull | $200 | Form 5 for estate transfer; no new civilian transfers since 1986 (Hughes Amendment) |
| AOW (any other weapon) | Concealable firearms not fitting other categories (wallet gun, cane gun, pen gun) | $0 | Form 5 for estate transfer |
| Destructive device (DD) | Explosive devices; large-bore (> 0.50 cal) firearms | $200 | Form 5 for estate transfer |

Texas note (effective 2025-09-01): SBRs and SBSs removed from Texas Penal Code § 46.05 prohibited weapons list. Previously held NFA SBRs/SBSs are now fully legal to possess in Texas.

**ATF forms relevant to this estate:**

| Form | Purpose | When used |
|------|---------|-----------|
| Form 5 (5320.5) | Tax-exempt transfer to lawful heir by operation of law | Every NFA item being distributed to a beneficiary. Required BEFORE distribution. |
| Form 4 (5320.4) | Tax-paid transfer to non-heir | If trustee sells an NFA item to a third party instead of distributing |
| Form 20 (5320.20) | Interstate transport of destructive devices, machine guns, SBRs, SBSs | If moving an NFA item (other than suppressor) across state lines during estate administration or prior to transfer approval |
| Form 1 (5320.1) | Making an NFA firearm | Not applicable — estate is not manufacturing |

Suppressors do NOT require Form 20 for interstate transport.

**Tax stamp**: For NFA items already registered (which all pre-2026 transferable items are), the tax stamp is the ATF-approved copy of the Form 4/5/1 under which the item was last transferred. The stamp has an ATF-assigned control/approval number. The stamp document itself is the registration proof. There is no separate "tax stamp number" field — the relevant data is: which form type created the registration, and what is the ATF approval/control number on that document.

---

## Recommended `firearm` Table Field List

### Core identity (table stakes)

| Field | Type | Notes |
|-------|------|-------|
| `id` | bigint PK | Same pattern as all asset tables |
| `entityId` | bigint FK notNull | Always required; FK to `entity` |
| `name` | text notNull | Display name / nickname ("Grantor's 1911", "Model 70 30-06") |
| `description` | text | Free-text notes |
| `make` | text notNull | Manufacturer (e.g., "Smith & Wesson", "Remington") |
| `model` | text notNull | Model designation (e.g., "Model 700", "M&P Shield") |
| `serialNumber` | text notNull | Federally required engraving on frame/receiver. Unique constraint. |
| `firearmType` | enum notNull | PISTOL, REVOLVER, RIFLE, SHOTGUN, SUPPRESSOR, SBR, SBS, MACHINE_GUN, AOW, DESTRUCTIVE_DEVICE, OTHER |
| `caliber` | text | Caliber or gauge (e.g., "9mm", ".308 Win", "12 ga", "5.56 NATO"). Text not enum — too many variants. |
| `action` | text | Bolt-action, semi-auto, pump, lever, single-action, double-action, etc. (optional but useful for valuation) |
| `barrelLength` | numeric(6,2) | Inches. Required for SBR/SBS NFA classification determination. |

### NFA fields (required when `isNfa = true`)

| Field | Type | Notes |
|-------|------|-------|
| `isNfa` | boolean notNull default false | Gates visibility of NFA-specific fields in UI |
| `nfaClass` | enum nullable | SUPPRESSOR, SBR, SBS, MACHINE_GUN, AOW, DESTRUCTIVE_DEVICE — set when `isNfa = true` |
| `atfFormType` | enum nullable | FORM_1, FORM_4, FORM_5 — type of form under which item was last registered/transferred to the trust |
| `atfControlNumber` | text nullable | ATF approval/control number from the approved Form 4/5/1 (appears on the stamp) |
| `taxStampDate` | timestamp nullable | Date ATF approved the last transfer into trust |
| `nfrtrSerial` | text nullable | The serial number as engraved on the NFA item per NFRTR (often same as `serialNumber` but may differ if item was factory-registered under a different designation) |

### Estate/valuation fields (table stakes — matches all other asset tables)

| Field | Type | Notes |
|-------|------|-------|
| `acquisitionDate` | timestamp | Date grantor originally acquired (or best known date) |
| `acquisitionCost` | numeric(12,2) | Original purchase price if known |
| `dodValue` | numeric(14,2) | Date-of-death fair market value (FMV) for IRS Form 706 |
| `dodValueDate` | timestamp | Date the DOD valuation was determined |
| `dodValueType` | valuationType enum | Reuses existing enum: APPRAISAL, MARKET_ESTIMATE, PURCHASE_PRICE, SELF_ASSESSED, etc. |
| `condition` | enum notNull default 'GOOD' | NRA grading: POOR, FAIR, GOOD, VERY_GOOD, EXCELLENT, NEW |
| `status` | recordStatus enum notNull default 'ACTIVE' | Reuses existing enum |
| `transferStatus` | transferStatus enum notNull default 'PENDING' | Reuses existing enum (PENDING, STARTED, COMPLETE) |

### Storage / physical tracking

| Field | Type | Notes |
|-------|------|-------|
| `location` | text | Physical storage location (safe, bank vault, specific address). Important for estate security compliance. |
| `insured` | boolean notNull default false | Covered by an insurance policy in the trust's insurancePolicy table |

### Metadata

| Field | Type | Notes |
|-------|------|-------|
| `notes` | text | Attorney notes, appraisal comments, transfer instructions |
| `createdAt` | timestamp notNull | Auto |
| `updatedAt` | timestamp notNull | Auto |

**Unique constraint:** `serialNumber` should have a unique index (same as VIN on `vehicle`).

**Table constraint:** `CHECK (isNfa = false OR nfaClass IS NOT NULL)` — if NFA, class is required.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features the trustee/admin must have for a legally adequate firearms inventory.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| CRUD admin page at `/firearms` | Standard pattern for all 7 existing asset types | LOW | Follows vehicle/personalProperty pattern exactly |
| Serial number as required unique field | Federal law requires serialization; ATF transfers identified by serial | LOW | Unique index, same as VIN on vehicle |
| NFA flag + NFA class enum | Legally distinct; Form 5 filing required before distribution | LOW | Boolean gate + conditional enum field |
| ATF form type + ATF control number fields | Trustee must record which form governs each NFA item for Form 5 estate transfer | LOW | Free-text control number; enum for form type |
| DOD valuation fields | IRS Form 706 estate tax requires FMV at date of death for every asset | LOW | Reuse `dodValue`, `dodValueDate`, `dodValueType` — already present on all asset tables |
| `transferStatus` field | Same lifecycle (PENDING → STARTED → COMPLETE) as all other assets | LOW | Reuse existing enum |
| Condition field (NRA grading) | Directly drives FMV for estate appraisal; required for insurance | LOW | New enum: POOR/FAIR/GOOD/VERY_GOOD/EXCELLENT/NEW |
| Storage location field | Estate security; executor must maintain secure custody pending transfer | LOW | Free text, same as `personalProperty.location` |
| Integration into dashboard asset totals | Firearms are trust assets; omitting them understates estate value | MEDIUM | Add `firearm` to the SQL-aggregated dashboard KPI query |
| Nav entry in Assets dropdown | Feature is unreachable without it | LOW | Insert "Firearms" alphabetically between "Artwork" and "Insurance" per PROJECT.md |
| `document` table FK for ATF form attachments | ATF Forms 4/5 (the actual stamps) must be stored alongside the record | LOW | Add `firearmId` FK to existing `document` table; update polymorphic CHECK constraint |
| Firearm type enum (PISTOL, RIFLE, SHOTGUN, etc.) | Determines which ATF forms apply; required for estate inventory | LOW | New `FirearmType` enum; includes all 6 NFA classes |

### Differentiators (Competitive Advantage)

Features that go beyond basic compliance and add trustee-level operational value.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| NFA transfer status badge | Visual flag on each NFA item showing Form 5 filing status (NOT_FILED, FILED, APPROVED) — prevents accidental distribution before ATF approval | LOW | Add `nfaTransferStatus` enum field; separate from the generic `transferStatus` |
| Per-item `insured` flag + link to insurance | Identifies which firearms lack insurance coverage; surfaces coverage gaps | LOW | Boolean field, mirrors `personalProperty.insured` |
| Barrel length field for SBR/SBS classification | Allows system to warn if a non-NFA rifle has a barrel < 16" (should be NFA) | LOW | Numeric field; client-side validation hint |
| Valuation table integration | Allows subsequent appraisals to update value over time (same as vehicle/personalProperty) | MEDIUM | Add `firearmId` FK to existing `valuation` table; same pattern as other assets |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| ATF Form 5 submission / e-filing integration | "It would be great to file directly from the app" | ATF eForms uses a proprietary authenticated API not exposed to third parties; attempting to replicate is out-of-scope and legally risky | Store form numbers and submission dates; attach scanned ATF-approved stamps via the `document` table |
| Background check / prohibited-person verification | "Verify the beneficiary can legally receive the firearm" | NICS checks are FFL-only; unauthorized NICS access is a federal offense | Display a reminder in the UI that the attorney/FFL must verify eligibility before distribution |
| Ballistic data, magazine capacity, accessories inventory | Seems like a complete firearms record | Irrelevant to trust administration; this is an estate management tool, not a gun safe manager | Notes field handles unusual accessories |
| Separate ammo inventory table | Ammo is an estate asset with value | Near-zero FMV contribution; creates maintenance burden; no regulatory tracking needed | Capture ammo in the notes field of the relevant firearm or as a single `personalProperty` line item |
| Gun trust "responsible persons" schedule | Admins may conflate the Hudson Trust with a NFA trust | The Hudson Trust is NOT a NFA gun trust; responsible-person tracking is only for dedicated NFA trusts | Document the distinction in UI help text |
| Automatic NFA class inference from barrel length | "If barrel < 16", auto-flag as SBR" | Barrel length alone is insufficient — stock configuration, overall length, and original manufacture classification all matter. ATF classification is not algorithmic. | Surface a warning hint when barrel length is entered; require human confirmation of NFA class |

---

## Feature Dependencies

```
firearm table (schema + router)
    └──required by──> /firearms admin page
    └──required by──> dashboard asset totals integration
    └──required by──> nav entry (nav entry is unreachable without the page)

document.firearmId FK
    └──required by──> ATF form attachment functionality
    └──requires──> firearm table to exist first
    └──note──> breaks existing document_single_owner_check constraint — must update CHECK

valuation.firearmId FK (differentiator)
    └──required by──> subsequent appraisal updates
    └──requires──> firearm table to exist first
    └──note──> same constraint update pattern as document

nfaTransferStatus field
    └──enhances──> Form 5 filing workflow tracking
    └──independent of──> generic transferStatus (tracks ATF approval separately)

condition enum (NRA grades)
    └──new enum required──> FirearmCondition
    └──used by──> /firearms admin page valuation display
```

### Dependency Notes

- **`document.firearmId` breaks the existing polymorphic CHECK constraint**: The `document_single_owner_check` currently sums 8 asset FK columns and requires `= 1`. Adding `firearmId` makes it 9 columns. The migration must ALTER the CHECK constraint to include `CASE WHEN firearmId IS NOT NULL THEN 1 ELSE 0 END`. Same applies if `valuation.firearmId` is added.
- **Dashboard totals**: The existing dashboard KPI query explicitly names asset tables. Adding firearms requires editing that query (or its SQL view/aggregation layer) — not just adding the table.
- **`transferStatus` reuse vs. `nfaTransferStatus`**: The generic `transferStatus` (PENDING → STARTED → COMPLETE) tracks the physical/legal transfer to a beneficiary. `nfaTransferStatus` (NOT_FILED → FILED → APPROVED) tracks specifically the ATF Form 5 process. These are different lifecycles and must not be conflated. A NFA item can have `transferStatus = PENDING` (not yet given to heir) while `nfaTransferStatus = APPROVED` (ATF already cleared it).

---

## MVP Definition

This is v5.0 of an existing production app, not a new product. "MVP" here means: what is the minimum to make firearms a complete, legally adequate first-class asset class on par with the 7 existing asset types.

### Launch With (v5.0 Phase 1)

- [x] `firearm` table schema with all table-stakes fields — entityId, name, make, model, serialNumber, firearmType, caliber, isNfa, nfaClass, atfFormType, atfControlNumber, taxStampDate, dodValue, dodValueDate, dodValueType, condition, status, transferStatus, location, insured, notes
- [x] `firearmRouter` tRPC router (list, byId, create, update, delete) — all behind `adminProcedure`, all with `entityId` validation
- [x] `/firearms` admin page with DataTable, KPI strip, create/edit form
- [x] Dashboard asset totals query updated to include `firearm.dodValue`
- [x] Nav entry "Firearms" inserted alphabetically in Assets dropdown
- [x] `document.firearmId` FK added (+ CHECK constraint update) — ATF stamp attachment

### Add After Validation (v5.0 Phase 2 or later)

- [ ] `valuation.firearmId` FK — enables historical appraisal tracking; useful but not blocking
- [ ] `nfaTransferStatus` enum field — adds Form 5 filing workflow tracking; can ship with notes field substituting initially

### Future Consideration (v2+)

- [ ] Activity log entries for firearm mutations (already covered by existing `activityLog` pattern if router emits them)
- [ ] Bulk import from CSV for large collections

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| firearm table + router | HIGH | LOW | P1 |
| /firearms admin page | HIGH | LOW | P1 |
| NFA fields (isNfa, nfaClass, atfFormType, atfControlNumber) | HIGH | LOW | P1 |
| DOD valuation fields | HIGH | LOW | P1 |
| Dashboard totals integration | HIGH | MEDIUM | P1 |
| document.firearmId FK + CHECK update | HIGH | LOW | P1 |
| Nav alphabetization + Firearms entry | HIGH | LOW | P1 |
| condition enum (NRA grades) | MEDIUM | LOW | P1 |
| nfaTransferStatus field | MEDIUM | LOW | P2 |
| valuation.firearmId FK | MEDIUM | LOW | P2 |
| barrel length SBR warning hint | LOW | LOW | P2 |

---

## Existing Table Dependencies

| Existing Table | How `firearm` Depends on It |
|----------------|-----------------------------|
| `entity` | `firearm.entityId` FK — same as all asset tables |
| `document` | `document.firearmId` FK added — ATF form + tax stamp storage |
| `valuation` | `valuation.firearmId` FK added (Phase 2) — appraisal history |
| `transferStatus` enum | Reused directly |
| `recordStatus` enum | Reused directly |
| `valuationType` enum | Reused directly for `dodValueType` |
| `insurancePolicy` | `firearm.insured` boolean flag — same pattern as `personalProperty.insured` |
| `trustAccounting` | Firearms don't generate income so no direct INCOME entries. EXPENSE entries may be created if insurance premiums or storage fees are recorded, but those belong to `insurancePolicy` or `liability`, not `firearm`. |

**New enums required:**
- `FirearmType` — PISTOL, REVOLVER, RIFLE, SHOTGUN, SUPPRESSOR, SBR, SBS, MACHINE_GUN, AOW, DESTRUCTIVE_DEVICE, OTHER
- `NfaClass` — SUPPRESSOR, SBR, SBS, MACHINE_GUN, AOW, DESTRUCTIVE_DEVICE (subset of FirearmType for NFA-only values; avoid duplication by considering a single enum or keeping them separate)
- `AtfFormType` — FORM_1, FORM_4, FORM_5
- `FirearmCondition` — POOR, FAIR, GOOD, VERY_GOOD, EXCELLENT, NEW (NRA modern firearms grading scale)
- `NfaTransferStatus` — NOT_FILED, FILED, APPROVED (optional for Phase 2)

**Note on NfaClass vs. FirearmType enum duplication:** NFA classes overlap with `firearmType` values (e.g., SBR appears in both). Two implementation options: (a) a single `FirearmType` enum covering both standard and NFA classes, with `isNfa` derived or `nfaClass` being a separate enum covering only the 6 NFA categories; or (b) `firearmType` covers physical form factor (PISTOL, RIFLE, SHOTGUN, etc.) and `nfaClass` covers regulatory classification independently — a standard rifle that was SBR'd would have `firearmType = RIFLE` and `nfaClass = SBR`. Option (b) is recommended: it correctly models the fact that a firearm's physical type and its NFA classification are independent attributes.

---

## Sources

- ATF Form 5 (5320.5) official form and instructions: https://www.atf.gov/firearms/docs/form/form-5-application-tax-exempt-transfer-and-registration-firearm-atf-form-53205/download
- ATF NFA Handbook Chapter 9 (estate transfers): https://www.atf.gov/media/25086/download
- ATF "Transfers of NFA Firearms in Decedents' Estates": https://www.atf.gov/firearms/docs/transfers-national-firearms-act-firearms-decedents-estates/download
- ATF Form 20 (interstate transport): https://www.atf.gov/media/22376/download
- Texas State Law Library — Inheriting Firearms: https://guides.sll.texas.gov/probate/inheriting-firearms
- Texas State Law Library — Gifts & Inheritance Gun Laws: https://guides.sll.texas.gov/gun-laws/gifts-inheritance
- Texas Penal Code § 46.05 (2025 amendments removing SBR/SBS from prohibited weapons): https://statutes.capitol.texas.gov/GetStatute.aspx?Code=PE&Value=46.05
- Silencer Central — ATF Form 5 Heirs Guide: https://www.silencercentral.com/blog/heirs-guide-to-atf-form-5/
- NRA modern firearms condition grading standards: https://armsbid.com/nra-conditions-grading-standards/
- NFA Trust vs. personal estate property distinction: https://law-trust.com/blog/gun-trust-nfa-guide-2026
- P.L. 119-21 NFA tax elimination (2026): https://www.everycrsreport.com/reports/IF13111.html
- Federal Register — Interstate Transport of NFA Firearms rule (2026): https://www.federalregister.gov/documents/2026/05/08/2026-09161/interstate-transport-and-temporary-export-of-national-firearms-act-firearms

---
*Feature research for: Trust/estate firearms tracking (v5.0)*
*Researched: 2026-05-21*
