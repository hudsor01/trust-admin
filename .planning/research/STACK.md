# Stack Research

**Domain:** Firearms as a trust asset class — v5.0 addition to trust-admin
**Researched:** 2026-05-21
**Confidence:** HIGH

## Verdict: No new dependencies required

The firearms feature is a pure data-model addition. Every technical requirement maps
directly to patterns already established in the codebase. Adding a dependency to handle
it would be over-engineering.

---

## Recommended Stack

### Core Technologies

All pre-existing. Nothing new needed.

| Technology | Version | Purpose | Why Sufficient |
|------------|---------|---------|---------------|
| Drizzle ORM | 0.45 | Schema + query layer | `pgEnum` handles NFA classification; `t.text()` holds serial numbers |
| drizzle-zod | in-tree | Schema-to-Zod bridge | `createInsertSchema` with overrides covers all firearm fields |
| Zod | in-tree | Input validation | Plain regex validates serial number format (same as `vinValidation`) |
| tRPC v11 | in-tree | API layer | `adminProcedure` + inline Drizzle — identical to every other asset router |
| TailwindCSS 4 + shadcn/ui | in-tree | Admin page UI | DataTable + KPI strip pattern used on all 7 asset pages |

### Supporting Libraries

None to add.

---

## What NOT to Add

| Library | Reason NOT to Add | Use Instead |
|---------|-------------------|-------------|
| `node-firearm-validator` or any serial-number npm package | No such mature, trust-worthy package exists; serial number formats are manufacturer-specific and not standardized in a way a library could reliably validate | Plain Zod `.min(1).max(40)` text — match what the ATF Form 4/4473 accepts |
| Any NFA classification library | NFA classes are a fixed, stable ATF enum (Title I, NFA — Suppressor/SBR/SBS/MG/AOW/DD); they do not change at runtime and need no external library | `pgEnum('NfaClass', [...])` in `db/schema.ts` |
| `gun-db` / `bluebird-firearms` or similar | Niche, unmaintained npm packages for firearm metadata lookup | Static Drizzle table with admin-entered data |
| Any document-scanning/OCR library for ATF Form parsing | Far out of scope; ATF forms are PDFs that admins upload manually | UploadThing (already in stack) for file attachment |
| A separate `atfFormStatus` state machine library | Overkill — transfer status has 3 states (PENDING/STARTED/COMPLETE) already modeled by the existing `transferStatus` pgEnum | Reuse existing `transferStatus` enum |

---

## Integration Points

### Schema (`db/schema.ts`)

Add two new enums and one new table. Pattern: copy `vehicle` table, swap identifier field.

**New enums:**

```typescript
// NFA classification — Title I firearms have no NFA class
export const nfaItemClass = pgEnum('NfaItemClass', [
    'TITLE_I',         // Conventional rifles, pistols, shotguns — no NFA paperwork
    'SUPPRESSOR',
    'SHORT_BARRELED_RIFLE',
    'SHORT_BARRELED_SHOTGUN',
    'MACHINE_GUN',
    'ANY_OTHER_WEAPON',
    'DESTRUCTIVE_DEVICE',
])

// ATF transfer form type — relevant when nfaItemClass != TITLE_I
export const atfFormType = pgEnum('AtfFormType', [
    'FORM_4',    // Individual/trust transfer of NFA item (tax paid)
    'FORM_5',    // Tax-exempt transfer (government, estate/death)
    'FORM_1',    // Making an NFA item (not purchasing)
    'FORM_3',    // SOT dealer-to-dealer transfer
])
```

**New table (`firearm`):**

Fields drawn directly from what ATF Form 4/4473 requires an estate to document:

- `entityId` — FK to `entity` (required, same as all other asset tables)
- `name` — display name (same as all assets)
- `description` — optional notes
- `make` — manufacturer (`t.text().notNull()`)
- `model` — model name (`t.text().notNull()`)
- `serialNumber` — unique constraint (`t.text().notNull()`) — see uniqueIndex pattern from `vehicle.vin`
- `caliber` — e.g. "9mm", ".308 Win" (`t.text()`)
- `year` — manufacture year (`t.integer()`) — optional, sometimes unknown on older firearms
- `nfaClass` — `nfaItemClass().notNull().default('TITLE_I')`
- `atfFormType` — `atfFormType()` nullable — only set for NFA items
- `atfFormNumber` — ATF-issued serial/control number on Form 4/5 (`t.text()`) nullable
- `atfApprovalDate` — timestamp nullable — when ATF approved the transfer
- `dodValue` — `t.numeric({ precision: 14, scale: 2 })` — DOD basis step-up
- `dodValueDate` — timestamp nullable
- `dodValueType` — `valuationType()` nullable
- `acquisitionDate` — timestamp nullable
- `acquisitionCost` — `t.numeric({ precision: 12, scale: 2 })` nullable
- `status` — `recordStatus().default('ACTIVE').notNull()`
- `transferStatus` — `transferStatus().default('PENDING').notNull()` — reuse existing enum
- `notes` — `t.text()`
- `createdAt` / `updatedAt` — standard timestamps

RLS: `.enableRLS()` with the standard 4-policy block (`crud-authenticated-policy-*`), admin-only (same as `vehicle`).

### Validation (`db/validation.ts`)

```typescript
// Serial numbers: alphanumeric + common separator chars, 1-40 chars
// (ATF Form 4473 Box 16 allows up to 40 chars)
const serialNumberValidation = z
    .string()
    .min(1, 'Serial number is required')
    .max(40, 'Serial number must be 40 characters or fewer')
    .regex(/^[A-Za-z0-9\-\/]+$/, 'Serial number must contain only letters, numbers, hyphens, and slashes')

export const insertFirearmSchema = createInsertSchema(firearm, {
    createdAt: (schema) => schema.optional(),
    updatedAt: (schema) => schema.optional(),
    serialNumber: () => serialNumberValidation,
    dodValue: () => positiveNumberValidation,
    acquisitionCost: () => positiveNumberValidation,
})
```

### Documents (`document` table)

ATF Form 4, Form 5, and Form 1 PDFs are stored via UploadThing and linked through the
existing polymorphic `document` table. Two steps:

1. Add `firearmsId bigint` FK column to `document` table.
2. Extend the `document_single_owner_check` CHECK constraint to count the new FK.
3. The `documentType` enum value `'LEGAL'` covers ATF forms adequately. No new enum
   value is needed — ATF forms are legal/regulatory documents. Optionally add `'ATF_FORM'`
   for precision, but `'LEGAL'` is sufficient.

The `valuation` table similarly needs a `firearmsId` FK if per-item valuation history is
desired. This is optional for MVP — `dodValue` on the `firearm` row suffices for
estate accounting.

### Router (`src/server/trpc/routers/firearm.ts`)

Inline Drizzle queries, `adminProcedure` for all mutations, `entityId` required on all
list/byId/update/delete procedures — identical contract to `vehicleRouter`.

Dashboard totals query needs a `SUM(dodValue) FROM firearm WHERE entityId = $1` branch
added to the existing aggregation SQL.

### Navigation

Assets dropdown in the nav — insert "Firearms" in alphabetical position between "Artwork"
and "Insurance". No library changes.

---

## Alternatives Considered

| Decision | Chosen Approach | Alternative | Why Not |
|----------|----------------|-------------|---------|
| NFA classification storage | New `nfaItemClass` pgEnum | Text field | Enums enforce valid values at DB level, consistent with all other classification fields in this codebase |
| Serial number validation | Plain Zod regex | npm serial-number library | No trustworthy library exists; manufacturer formats vary; the ATF's own form accepts any alphanumeric string up to 40 chars |
| ATF form attachment | Extend existing `document` polymorphic table | New `firearm_document` junction table | The polymorphic pattern is already established and works; adding a junction table would break consistency without benefit |
| NFA transfer tracking | `atfFormType` + `atfApprovalDate` columns on `firearm` | Separate `atfTransfer` table | One firearm = one Form 4/5 on transfer into the trust; a separate table would be overkill for this estate's needs |

---

## Version Compatibility

No new packages. No version concerns.

---

## Sources

- `db/schema.ts` lines 178-182 — existing `transferStatus` pgEnum (PENDING/STARTED/COMPLETE)
- `db/schema.ts` lines 413-488 — `vehicle` table — direct structural model for `firearm`
- `db/schema.ts` lines 224-231 — existing `documentType` enum with LEGAL value
- `db/schema.ts` lines 1481-1619 — `document` polymorphic FK pattern to extend
- `db/validation.ts` lines 129-132 — `vinValidation` as precedent for identifier regex
- ATF Form 4473 (Box 16) — serial number field allows up to 40 alphanumeric characters (HIGH confidence — this is a physical form standard that does not change)
- NFA item classes: 26 U.S.C. § 5845 — suppressor, SBR, SBS, MG, AOW, DD + Title I (non-NFA) (HIGH confidence — statutory definition)

---
*Stack research for: firearms trust asset — trust-admin v5.0*
*Researched: 2026-05-21*
