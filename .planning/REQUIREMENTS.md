# Requirements: Trust Admin

**Defined:** 2026-03-08
**Core Value:** Secure, auditable trust administration with role-based access control and Texas Property Code compliance.

## v4.0 Requirements

Requirements derived from comprehensive critical review of 45 findings across security, performance, architecture, feature completeness, and code quality.

### Security

- [x] **SEC-01**: Auth cookie secret is required at startup -- app fails fast if NEON_AUTH_COOKIE_SECRET is missing
- [x] **SEC-02**: ADMIN_EMAIL is read from validated env module, not raw process.env -- prevents empty-string bypass
- [x] **SEC-03**: All password reset flows revoke existing sessions after password change
- [x] **SEC-04**: activity_log RLS policies restrict INSERT to own userId, remove UPDATE/DELETE entirely (immutable audit)
- [x] **SEC-05**: reset-password route validates input types, enforces token format (64 hex chars), caps password length at 128
- [x] **SEC-06**: /api/e2e/setup route requires pre-shared secret header, strips internal IDs from response
- [x] **SEC-07**: Inventory upload uses UploadThing instead of public/ filesystem (fixes Vercel read-only + unauthenticated serving)
- [x] **SEC-08**: /api/inventory removed from proxy publicPaths; analyze route enforces base64 size limit (10MB max)
- [x] **SEC-09**: INVENTORY_ACCESS_CODE comparison uses timingSafeEqual with failed-attempt counter

### Performance

- [x] **PERF-01**: Dashboard summary uses SQL SUM aggregation instead of fetching unbounded accounting entries
- [x] **PERF-02**: Accounting page uses server-side paginated query (listPaginated) instead of 500-row client-side filtering
- [x] **PERF-03**: listAllUsers fetches profiles and beneficiaries in parallel (Promise.all) instead of sequential
- [x] **PERF-04**: Portal page eliminates client-side session waterfall -- server-prefetched beneficiary.me with HydrationBoundary
- [ ] **PERF-05**: recalculateBeneficiaryShares uses single bulk UPDATE instead of N sequential statements

### Correctness

- [ ] **CORR-01**: All manual accounting entries go through createEntry (auto-classifies isPrincipal per Texas Property Code) -- remove raw .create endpoint
- [ ] **CORR-02**: recordLiabilityPayment uses ?? 0 instead of || 0, handles null principalPortion explicitly
- [ ] **CORR-03**: Update schemas require at least one field via .refine() -- reject empty updates
- [x] **CORR-04**: Complete migration from deprecated listProvisionedUsers to listAllUsers
- [ ] **CORR-05**: password_reset_token table has email index, expired token cleanup, one-unexpired-token-per-email limit

### Feature Completeness

- [ ] **FEAT-01**: Admin can browse, create, edit, and delete artwork assets
- [ ] **FEAT-02**: Admin can browse, create, edit, and delete personal property assets
- [ ] **FEAT-03**: Admin can browse, create, edit, and delete insurance policies
- [ ] **FEAT-04**: Dashboard total assets calculation includes all asset types (artwork, personal property, insurance)
- [ ] **FEAT-05**: Beneficiary portal shows HEMS request history with status tracking
- [ ] **FEAT-06**: Admin can edit beneficiary tax fields (taxId) and per-beneficiary withdrawal ages/percentages
- [ ] **FEAT-07**: Admin can mark distributions as tax-reported and 1099-issued
- [ ] **FEAT-08**: HEMS requests can be cancelled (admin or beneficiary)
- [ ] **FEAT-09**: Trust accounting entries support reconciliation workflow (reconciled flag + date)
- [ ] **FEAT-10**: Contact fields include licenseNo and barNo for attorneys/CPAs
- [ ] **FEAT-11**: Trustee records support coTrusteeId and contactId editing

### Dead Code & Cleanup

- [ ] **CLEAN-01**: Delete ~50 unused CRUD functions from db/queries.ts
- [ ] **CLEAN-02**: Delete unused src/lib/date-utils.ts and remove date-fns dependency if unused elsewhere
- [ ] **CLEAN-03**: Replace hardcoded entityId=1 in 15 client components with entity query cache pattern
- [ ] **CLEAN-04**: Replace identity cast functions in type-utils.ts with runtime-validating type guards
- [x] **CLEAN-05**: Delete unused hooks (use-entity-filter.ts) and unused computed values (_total* in DashboardClient)
- [ ] **CLEAN-06**: Consolidate duplicate TxSql type into shared export from db/index.ts
- [ ] **CLEAN-07**: Replace console.error in auth routes with structured logger calls
- [ ] **CLEAN-08**: Remove error message leaking in inventory analyze route 500 response
- [ ] **CLEAN-09**: Encapsulate BeneficiariesClient dialog state inside BeneficiaryDialog component
- [x] **CLEAN-10**: Memoize DashboardClient filter calls; remove redundant entity.byId and beneficiary.byId fetches

## Future Requirements

Deferred -- acknowledged but not in v4.0 scope.

### Document Management
- **DOC-01**: Admin can attach documents to any asset type (document table)
- **DOC-02**: Trust accounting entries support document attachment (documentPath)

### Transaction Tracking
- **TXN-01**: Per-asset income/expense transactions separate from trust accounting ledger

### Trustee Fees
- **FEE-01**: Admin can define trustee fee schedules and track fee payments

### Multi-Entity
- **ENT-01**: App supports parent-child entity relationships with ownership percentages

### Notifications
- **NOTIF-01**: Beneficiary receives email notification when HEMS request status changes
- **NOTIF-02**: Admin receives email notification when new HEMS request is submitted

### Contact Associations
- **ASSOC-01**: Admin can associate contacts with specific trust entities

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-entity UI | Single-trust app; entity model exists but multi-entity admin is future work |
| Beneficiary portal file uploads | HEMS supportingDocPath exists in schema but upload UX needs design work |
| withdrawalRecord.remainingAmount auto-calc | Withdrawal exercise flow needs broader design review |
| approvedById on inventory approval | Requires bigint-to-UUID bridge -- schema design decision needed |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | Phase 15 | Complete |
| SEC-02 | Phase 15 | Complete |
| SEC-03 | Phase 15 | Complete |
| SEC-04 | Phase 16 | Complete |
| SEC-05 | Phase 15 | Complete |
| SEC-06 | Phase 15 | Complete |
| SEC-07 | Phase 16 | Complete |
| SEC-08 | Phase 16 | Complete |
| SEC-09 | Phase 16 | Complete |
| PERF-01 | Phase 17 | Complete |
| PERF-02 | Phase 17 | Complete |
| PERF-03 | Phase 18 | Complete |
| PERF-04 | Phase 17 | Complete |
| PERF-05 | Phase 18 | Pending |
| CORR-01 | Phase 18 | Pending |
| CORR-02 | Phase 18 | Pending |
| CORR-03 | Phase 18 | Pending |
| CORR-04 | Phase 18 | Complete |
| CORR-05 | Phase 18 | Pending |
| FEAT-01 | Phase 19 | Pending |
| FEAT-02 | Phase 19 | Pending |
| FEAT-03 | Phase 19 | Pending |
| FEAT-04 | Phase 19 | Pending |
| FEAT-05 | Phase 20 | Pending |
| FEAT-06 | Phase 20 | Pending |
| FEAT-07 | Phase 20 | Pending |
| FEAT-08 | Phase 20 | Pending |
| FEAT-09 | Phase 21 | Pending |
| FEAT-10 | Phase 21 | Pending |
| FEAT-11 | Phase 21 | Pending |
| CLEAN-01 | Phase 22 | Pending |
| CLEAN-02 | Phase 22 | Pending |
| CLEAN-03 | Phase 22 | Pending |
| CLEAN-04 | Phase 22 | Pending |
| CLEAN-05 | Phase 17 | Complete |
| CLEAN-06 | Phase 22 | Pending |
| CLEAN-07 | Phase 22 | Pending |
| CLEAN-08 | Phase 22 | Pending |
| CLEAN-09 | Phase 22 | Pending |
| CLEAN-10 | Phase 17 | Complete |

**Coverage:**
- v4.0 requirements: 40 total
- Mapped to phases: 40
- Unmapped: 0

---
*Requirements defined: 2026-03-08*
*Last updated: 2026-03-08 -- traceability updated with phase mappings*
