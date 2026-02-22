# Roadmap: Trust Admin

## Overview

Trust administration application for managing the Hudson Living Trust. Systematically building out features for estate settlement and ongoing trust administration.

## Milestones

- ✅ **v1.0 Neon Platform Integration** - Phases 1-6 (shipped 2026-01-23)
- ✅ **v8.0 Public Inventory Form** - Phases 46-48 (shipped 2026-01-22)
- 🚧 **v9.0 Email/Password Auth Migration** - Phases 49-53 (in progress)

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

## Phase Details

### 🚧 v9.0 Email/Password Auth Migration (In Progress)

**Milestone Goal:** Migrate from magic-link-only authentication to email/password, fix the broken beneficiary role check, enable admin provisioning of beneficiary accounts with forced password change on first login, and harden data isolation so each beneficiary only sees their own records.

#### Phase 49: fix-role-mismatch

**Goal**: Fix the beneficiaryProcedure role check bug — Neon Auth sets non-admin users to "user" but code checks for "beneficiary"
**Depends on**: Nothing (critical bug fix, first phase)
**Research**: Unlikely (internal code fix)
**Plans**: TBD

Plans:
- [x] 49-01: Fix tRPC context to use userProfile.role (complete 2026-01-30)

#### Phase 50: enable-email-password

**Goal**: Enable email/password authentication in Neon Auth, update sign-in/sign-up UI to support credentials-based login alongside magic link
**Depends on**: Phase 49
**Research**: Likely (Neon Auth console config, SDK methods for email/password)
**Research topics**: Neon Auth email/password enablement, SDK sign-up/sign-in methods, password reset flow, SMTP config
**Plans**: TBD

Plans:
- [x] 50-01: Enable email/password auth alongside magic link (complete 2026-01-31)

#### Phase 51: admin-user-provisioning

**Goal**: Build admin interface to create beneficiary accounts with email/password, linking each user to their beneficiary record
**Depends on**: Phase 50
**Research**: Unlikely (internal CRUD + Neon Auth Admin plugin)
**Plans**: TBD

Plans:
- [x] 51-01: Backend user provisioning router (complete 2026-01-31)
- [x] 51-02: Admin user management UI — /users page + sidebar nav (complete 2026-02-11)

#### Phase 52: forced-password-change

**Goal**: Add first-login password change requirement — admin sets temp password, beneficiary must change it on first sign-in
**Depends on**: Phase 51
**Research**: Unlikely (internal flow logic)
**Plans**: TBD

Plans:
- [ ] 52-01: TBD

#### Phase 53: beneficiary-data-isolation

**Goal**: Verify and harden RLS policies so beneficiaries only see their own records across all resources (distributions, HEMS requests, accounting)
**Depends on**: Phase 52
**Research**: Unlikely (RLS already partially implemented)
**Plans**: TBD

Plans:
- [ ] 53-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 49 → 50 → 51 → 52 → 53

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1. serverless-driver | v1.0 | 1/1 | Complete | 2026-01-23 |
| 2. vercel-preview-branching | v1.0 | 1/1 | Complete (manual) | 2026-01-23 |
| 3. connection-pooling | v1.0 | 1/1 | Complete | 2026-01-23 |
| 4. pg-cron-jobs | v1.0 | 1/1 | Complete (skipped) | 2026-01-23 |
| 5. time-travel-queries | v1.0 | 1/1 | Complete | 2026-01-23 |
| 6. autoscaling-optimization | v1.0 | 1/1 | Complete (manual) | 2026-01-23 |
| 49. fix-role-mismatch | v9.0 | 1/1 | Complete | 2026-01-30 |
| 50. enable-email-password | v9.0 | 1/1 | Complete | 2026-01-31 |
| 51. admin-user-provisioning | v9.0 | 2/2 | Complete | 2026-02-11 |
| 52. forced-password-change | 1/1 | Complete    | 2026-02-22 | - |
| 53. beneficiary-data-isolation | v9.0 | 0/1 | Not started | - |
