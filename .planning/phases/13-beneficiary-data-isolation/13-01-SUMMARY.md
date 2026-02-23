---
phase: 13-beneficiary-data-isolation
plan: 01
subsystem: database
tags: [rls, postgres, drizzle, security, neon-auth]

# Dependency graph
requires:
  - phase: 11-admin-user-provisioning
    provides: authenticated role + app.is_admin() + app.get_user_beneficiary_id() helpers
provides:
  - RLS enabled on all 28 public tables (up from 11)
  - pgPolicy() definitions in db/schema.ts (source of truth)
  - neondb_owner bypass policies for all 28 tables (88 total owner policies)
  - tests/rls.test.ts verifies 28-table count + write enforcement
affects: all-admin-pages, beneficiary-portal, test-infrastructure

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "pgPolicy in pgTable third-arg array + .enableRLS() chained on table export"
    - "add-owner-rls-policies.ts script: idempotent DROP IF EXISTS + CREATE for neondb_owner bypass"
    - "db:push --force to skip interactive confirmation prompt"

key-files:
  created:
    - scripts/add-owner-rls-policies.ts
  modified:
    - db/schema.ts (pgPolicy + enableRLS on all 28 tables)
    - tests/rls.test.ts (28-table list, count toBe(28), write enforcement test)

key-decisions:
  - "db:push drops existing owner_* policies — must always re-run add-owner-rls-policies.ts after db:push"
  - "user_profile intentionally excluded from RLS (queried inside app.get_user_beneficiary_id() — would cause infinite recursion)"
  - "specific_bequest gets beneficiary-filtered SELECT (has beneficiaryId column) not admin-only"

patterns-established:
  - "After any db:push: run bun scripts/add-owner-rls-policies.ts to restore neondb_owner bypass policies"

requirements-completed: []

# Metrics
duration: ~2h (agent wrote schema + tests; manual execution of db:push + script + verification)
completed: 2026-02-22
---

# Phase 53: Beneficiary Data Isolation Summary

**RLS hardened to 28 tables (up from 11) with pgPolicy definitions in db/schema.ts as source of truth — 683 tests pass, 0 fail**

## Performance

- **Duration:** ~2h
- **Completed:** 2026-02-22
- **Tasks:** 8
- **Files modified:** 3 (db/schema.ts, tests/rls.test.ts, scripts/add-owner-rls-policies.ts created)

## Accomplishments
- 17 new tables got RLS + admin-only pgPolicy (artwork, rental_property, insurance_policy, personal_property, trustee, trustee_fee_schedule, trustee_fee_entry, liability_payment, contact, contact_association, task, document, valuation, transaction, activity_log, pending_inventory_item)
- `specific_bequest` got beneficiary-filtered SELECT policy (has beneficiaryId column)
- All 11 existing RLS tables now have pgPolicy() definitions in `db/schema.ts` (source of truth)
- `scripts/add-owner-rls-policies.ts` created — adds 88 neondb_owner bypass policies across all 28 tables + user_profile
- `tests/rls.test.ts` updated: 28-table list, `toBe(28)` count assertion, write enforcement test (beneficiary cannot INSERT to entity table)
- `bun test tests/rls.test.ts`: 64 pass, 0 fail
- `bun run test` (full suite): 683 pass, 0 fail

## Task Commits

1. **T1-T4 + T7: schema + tests** — `37d6659`
2. **T6: add-owner-rls-policies.ts script** — `18b3df4`
3. **T5: db:push applied + T8: full tests pass** — `b9b233b`

## Files Created/Modified
- `db/schema.ts` — pgPolicy() + .enableRLS() on all 28 tables
- `tests/rls.test.ts` — 28-table rlsEnabledTables list, count toBe(28), write enforcement test
- `scripts/add-owner-rls-policies.ts` — idempotent script: drops + recreates neondb_owner bypass policies

## Decisions Made
- `db:push --force` used to skip interactive confirmation (menu-based, not yes/no)
- `db:push` drops existing `owner_*` policies — `add-owner-rls-policies.ts` must be re-run after every push
- `user_profile` excluded from RLS — queried inside `app.get_user_beneficiary_id()`, adding RLS would cause infinite recursion
- `specific_bequest` uses beneficiary-filtered SELECT (not admin-only) because it has a `beneficiaryId` FK

## Deviations from Plan
- Task numbers consolidated: agent combined T1-T4 and T7 into a single commit (`37d6659`) instead of 4 separate commits — functionally equivalent
- `db:push` required `--force` flag instead of `echo "y"` piping (interactive select menu)

## Issues Encountered
- `db:push` drops existing `owner_*` policies as part of recreating the RLS setup — expected, handled by always running the script afterward
- Biome formatting fix needed on `add-owner-rls-policies.ts` before commit

## Next Phase Readiness
- Milestone v9.0 (Email/Password Auth Migration) is now complete — all 5 phases done
- Run `/gsd:complete-milestone` to archive and prepare for next milestone

---
*Phase: 53-beneficiary-data-isolation*
*Completed: 2026-02-22*
