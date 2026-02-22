# Roadmap: Trust Admin

## Overview

Trust administration application for managing the Hudson Living Trust. Systematically building out features for estate settlement and ongoing trust administration.

## Milestones

- ✅ **v1.0 Neon Platform Integration** - Phases 1-6 (shipped 2026-01-23)
- ✅ **v2.0 Public Inventory Form** - Phases 7-8 (shipped 2026-01-22)
- ✅ **v3.0 Email/Password Auth Migration** - Phases 9-14 (shipped 2026-02-22)

## Phases

<details>
<summary>✅ v1.0 Neon Platform Integration (Phases 1-6) - SHIPPED 2026-01-23</summary>

- [x] **Phase 1: serverless-driver** - Switch from postgres.js to @neondatabase/serverless for HTTP queries
- [x] **Phase 2: vercel-preview-branching** - Enable automatic database branches for Vercel preview deployments
- [x] **Phase 3: connection-pooling** - Configure PgBouncer pooling for 10K concurrent connections
- [x] **Phase 4: pg-cron-jobs** - Add scheduled database maintenance jobs (skipped)
- [x] **Phase 5: time-travel-queries** - Enable historical data queries for audit compliance
- [x] **Phase 6: autoscaling-optimization** - Tune compute scaling for workload patterns

</details>

<details>
<summary>✅ v2.0 Public Inventory Form (Phases 7-8) - SHIPPED 2026-01-22</summary>

- [x] **Phase 7: public-inventory-form** - Public-facing form for submitting inventory items
- [x] **Phase 8: admin-inventory-queue** - Admin queue for reviewing and processing submitted inventory items

</details>

## Phase Details

### ✅ v3.0 Email/Password Auth Migration (Complete)

**Milestone Goal:** Migrate from magic-link-only authentication to email/password, fix the broken beneficiary role check, enable admin provisioning of beneficiary accounts with forced password change on first login, harden data isolation so each beneficiary only sees their own records, and production-harden the codebase.

#### Phase 9: fix-role-mismatch

**Goal**: Fix the beneficiaryProcedure role check bug — Neon Auth sets non-admin users to "user" but code checks for "beneficiary"
**Depends on**: Nothing (critical bug fix, first phase)

Plans:
- [x] 09-01: Fix tRPC context to use userProfile.role (complete 2026-01-30)

#### Phase 10: enable-email-password

**Goal**: Enable email/password authentication in Neon Auth, update sign-in/sign-up UI to support credentials-based login alongside magic link
**Depends on**: Phase 9

Plans:
- [x] 10-01: Enable email/password auth alongside magic link (complete 2026-01-31)

#### Phase 11: admin-user-provisioning

**Goal**: Build admin interface to create beneficiary accounts with email/password, linking each user to their beneficiary record
**Depends on**: Phase 10

Plans:
- [x] 11-01: Backend user provisioning router (complete 2026-01-31)
- [x] 11-02: Admin user management UI — /users page + sidebar nav (complete 2026-02-11)

#### Phase 12: forced-password-change

**Goal**: Add first-login password change requirement — admin sets temp password, beneficiary must change it on first sign-in
**Depends on**: Phase 11

Plans:
- [x] 12-01: Forced password change flow (complete 2026-02-22)

#### Phase 13: beneficiary-data-isolation

**Goal**: Verify and harden RLS policies so beneficiaries only see their own records across all resources (distributions, HEMS requests, accounting)
**Depends on**: Phase 12

Plans:
- [x] 13-01: Apply RLS to 28 tables, owner policies, tests (complete 2026-02-22)

#### Phase 14: codebase-cleanup

**Goal**: Production-harden the codebase — fix dev config, structured logging, CSP security header, decompose admin pages into _components/, add component tests, full type safety
**Depends on**: Phase 13

Plans:
- [x] 14-01: Production hardening (complete 2026-02-22)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → ... → 14

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1. serverless-driver | v1.0 | 1/1 | Complete | 2026-01-23 |
| 2. vercel-preview-branching | v1.0 | 1/1 | Complete (manual) | 2026-01-23 |
| 3. connection-pooling | v1.0 | 1/1 | Complete | 2026-01-23 |
| 4. pg-cron-jobs | v1.0 | 1/1 | Complete (skipped) | 2026-01-23 |
| 5. time-travel-queries | v1.0 | 1/1 | Complete | 2026-01-23 |
| 6. autoscaling-optimization | v1.0 | 1/1 | Complete (manual) | 2026-01-23 |
| 7. public-inventory-form | v2.0 | 1/1 | Complete | 2026-01-22 |
| 8. admin-inventory-queue | v2.0 | 1/1 | Complete | 2026-01-22 |
| 9. fix-role-mismatch | v3.0 | 1/1 | Complete | 2026-01-30 |
| 10. enable-email-password | v3.0 | 1/1 | Complete | 2026-01-31 |
| 11. admin-user-provisioning | v3.0 | 2/2 | Complete | 2026-02-11 |
| 12. forced-password-change | v3.0 | 1/1 | Complete | 2026-02-22 |
| 13. beneficiary-data-isolation | v3.0 | 1/1 | Complete | 2026-02-22 |
| 14. codebase-cleanup | v3.0 | 1/1 | Complete | 2026-02-22 |
