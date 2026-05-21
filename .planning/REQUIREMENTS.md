# Requirements: Trust Admin — v5.0 Firearms Tracking & Beneficiary UX Refinement

**Defined:** 2026-05-21
**Core Value:** Secure, auditable trust administration with role-based access control and Texas Property Code compliance.

## v1 Requirements

Requirements for milestone v5.0. Each maps to a roadmap phase.

### Firearms Tracking

- [ ] **FIRE-01**: Admin can add a firearm record with core identity fields — name, make, model, serial number, firearm type, caliber, barrel length
- [ ] **FIRE-02**: Admin can classify a firearm as an NFA item and record its NFA class, ATF form type, ATF control number, and tax-stamp date
- [ ] **FIRE-03**: Admin can record a firearm's date-of-death valuation, NRA condition grade, and acquisition details (date, cost)
- [ ] **FIRE-04**: Admin can track a firearm's storage location, insured flag, and transfer status
- [ ] **FIRE-05**: Admin can track ATF Form 5 transfer progress for an NFA item separately from the generic transfer status
- [ ] **FIRE-06**: Admin can view, edit, and delete firearm records from a dedicated `/firearms` admin page
- [ ] **FIRE-07**: Admin can sort, filter, and CSV-export the firearms table
- [ ] **FIRE-08**: Admin can attach ATF-form and tax-stamp documents to a firearm record
- [ ] **FIRE-09**: Admin can record appraisal / valuation history for a firearm

### Asset Integration

- [ ] **ASSET-01**: Firearm values are included in the dashboard asset-value KPIs and allocation charts
- [ ] **ASSET-02**: Firearms appear in the unified `/assets` view alongside the other 7 asset types
- [ ] **ASSET-03**: A "Firearms" page is reachable from the Assets navigation group
- [ ] **ASSET-04**: The Assets navigation sub-items are alphabetically ordered — Accounts, Artwork, Firearms, Insurance, Personal Property, Properties, Vehicles

### Beneficiaries View

- [ ] **BENE-01**: The Beneficiaries page no longer shows the redundant avatar-stack card
- [ ] **BENE-02**: The Beneficiaries page no longer shows the "Display Order" drag-to-reorder section
- [ ] **BENE-03**: The Beneficiaries page no longer shows the withdrawal-milestone gantt chart
- [ ] **BENE-04**: Beneficiary sort order — in the table and everywhere else in the app — is unchanged after the cleanup (the `sortIndex` column and its ORDER BY are preserved)

## v2 Requirements

Deferred to a future release. Tracked but not in the v5.0 roadmap.

(None — v5.0 is open-ended; further phases will be added as work surfaces them.)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| `SURRENDERED` value on the shared `transferStatus` enum | Extending a shared pgEnum touches every asset table for one edge case (unregistered NFA contraband); the `nfaRegistered` flag + notes cover it |
| ATF Form 5 / eForms e-filing integration | ATF eForms uses a proprietary authenticated API not exposed to third parties — record form numbers and attach approved stamps manually |
| NICS / background-check / prohibited-person verification | NICS is an FFL-only federal system; unauthorized access is a federal offense — surface a reminder that the attorney/FFL must verify eligibility |
| Ammo inventory, ballistic data, accessories tracking | Not relevant to trust administration — use the notes field or a `personalProperty` line item |
| Gun-trust "responsible persons" schedule / ATF 5320.23 | The Hudson Trust is not a dedicated NFA gun trust — it holds firearms as ordinary estate property |
| Automatic NFA-class inference from barrel length | ATF classification is not algorithmic — surface a hint only; human confirmation required |
| Bulk CSV import for firearms | Manual entry is sufficient for this estate's collection size |
| Removal of the beneficiary `sortIndex` column / reorder backend | Only the drag-reorder UI is removed — the column and ORDER BY stay so list ordering is unaffected |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FIRE-01 | TBD | Pending |
| FIRE-02 | TBD | Pending |
| FIRE-03 | TBD | Pending |
| FIRE-04 | TBD | Pending |
| FIRE-05 | TBD | Pending |
| FIRE-06 | TBD | Pending |
| FIRE-07 | TBD | Pending |
| FIRE-08 | TBD | Pending |
| FIRE-09 | TBD | Pending |
| ASSET-01 | TBD | Pending |
| ASSET-02 | TBD | Pending |
| ASSET-03 | TBD | Pending |
| ASSET-04 | TBD | Pending |
| BENE-01 | TBD | Pending |
| BENE-02 | TBD | Pending |
| BENE-03 | TBD | Pending |
| BENE-04 | TBD | Pending |

**Coverage:**
- v1 requirements: 17 total
- Mapped to phases: 0 (roadmap pending)
- Unmapped: 17 ⚠️

---
*Requirements defined: 2026-05-21*
*Last updated: 2026-05-21 after initial definition*
