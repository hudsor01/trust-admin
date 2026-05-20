---
phase: 23
plan: 05
title: Asset creation wizard
status: complete
completed: 2026-05-20
branch: feat/23-05-asset-wizard
tasks_completed: 1/1
key_files:
  created:
    - src/components/ui/stepper.tsx
    - src/components/wizard-step-group.tsx
    - src/lib/asset-wizard-steps.ts
    - tests/components/resource-dialog.test.tsx
  modified:
    - src/hooks/use-resource-form.ts
    - src/components/resource-dialog.tsx
    - src/app/(admin)/vehicles/_components/VehicleDialog.tsx
    - src/app/(admin)/vehicles/_components/VehiclesClient.tsx
    - src/app/(admin)/properties/_components/HomesteadDialog.tsx
    - src/app/(admin)/properties/_components/RentalPropertyDialog.tsx
    - src/app/(admin)/properties/_components/PropertiesClient.tsx
    - src/app/(admin)/accounts/_components/BankAccountDialog.tsx
    - src/app/(admin)/accounts/_components/InvestmentAccountDialog.tsx
    - src/app/(admin)/accounts/_components/AccountsClient.tsx
    - src/app/(admin)/personal-property/_components/PersonalPropertyDialog.tsx
    - src/app/(admin)/personal-property/_components/PersonalPropertyClient.tsx
    - src/app/(admin)/insurance/_components/InsuranceDialog.tsx
    - src/app/(admin)/insurance/_components/InsuranceClient.tsx
    - tests/components/vehicles/VehicleDialog.test.tsx
---

# Plan 23-05: Asset Creation Wizard — Summary

**PR-E.** Adds a 3-step guided wizard for asset creation. Activated after the
user reasserted the wizard (it had been marked `deferred` per the RESEARCH /
UI-SPEC recommendation, but it is a locked CONTEXT.md Phase-3 decision).

## What was built

- **`src/components/ui/stepper.tsx`** — Dice UI stepper primitive, installed via
  `bunx --bun shadcn@latest add @diceui/stepper`. No new npm dependencies
  (its `radix-ui` peer was already present). OKLCH-clean, no `useTheme` import.
- **`useResourceForm` extended** — accepts an optional `steps?: WizardStep[]`
  config and exposes `currentStep`, `isFirstStep`, `isLastStep`, `goNext`,
  `goPrev`, `goToStep`, `completedSteps`. **Backwards-compatible:** when `steps`
  is omitted, every wizard field is a stable no-op default (`currentStep=0`,
  `isLastStep=true`), so all existing non-wizard callers are untouched.
- **`ResourceDialog`** — renders `<Stepper>` above the form when the hook is in
  wizard mode; `wizard-step-group.tsx` filters visible fields to the active
  step. Footer renders Back / Next; Next is disabled until the current step's
  zod schema passes; the last step's Next becomes the submit CTA ("Create").
  Free-jump is allowed only to already-completed steps.
- **`src/lib/asset-wizard-steps.ts`** — per-resource `WizardStep[]` definitions.
- **7 asset-creation dialogs converted** — vehicle, homestead, rentalProperty,
  bankAccount, investmentAccount, personalProperty, insurance.

## Step groupings (per resource)

All 7 resources use the same 3-step shape: **Type + Name → Valuation →
Ownership**. The fields inside each step adapt to the resource:

- **Valuation step** for vehicle/homestead/rentalProperty/personalProperty uses
  `dodValue` + `dodValueDate` + estimated current value.
- **Valuation step** for bankAccount/investmentAccount uses `currentBalance`
  (with `dodValue` fallback).
- **Valuation step** for insurance uses `coverageAmount` + `premium` +
  `effectiveDate`/`expirationDate` — `insurancePolicy` has no DOD columns
  (per CLAUDE.md Data Model), so the step label stays "Valuation" but the
  field set differs.

## Verification

- `bun run typecheck` — exit 0
- `bun run lint` (biome) — exit 0
- `tests/components/resource-dialog.test.tsx` — 11 pass / 0 fail (wizard
  navigation: no-steps default, step 0 start, goNext gating on valid/invalid,
  goPrev, goToStep completed-only jump, **payload-shape parity** with the
  single-page form)
- Full unit suite green via pre-commit hook
- Payload parity confirmed: the wizard submits the byte-identical payload the
  single-page dialog produced — no tRPC `*.create` contract change.

## Audits

- **OKLCH:** `stepper.tsx`, `wizard-step-group.tsx`, `asset-wizard-steps.ts` —
  zero `hsl()` / hex / Tailwind-palette literals.
- **ThemeProvider:** stepper does not import `useTheme` / `next-themes` — no
  provider mount needed.
- **React Compiler:** no `[Compiler bailout]` lines on `bun run build` for the
  new files or the modified ResourceDialog.
- **Bundle delta:** negligible — `@diceui/stepper` pulled no new npm deps
  (`radix-ui` already installed). Cumulative Phase-23 delta remains well under
  the +120 KB gz budget.

## Deviations

- **Pre-existing flaky test fixed (commit 95af005, separate from the feature
  commit).** Re-running the full suite surfaced `asset.listAll aggregator >
  non-personalProperty rows get type-name as category` failing intermittently.
  Root cause: `asset.listAll` unions 7 tables and `AssetRow.id` is the raw
  per-table id (not unique across kinds); ten test lookups used
  `rows.find(r => r.id === ids.X)` and silently matched the wrong row when two
  seeded tables drew the same sequence id. Fixed all ten lookups to also guard
  on `r.kind` — the pattern the test already used at two other call sites. Not
  caused by 23-05 (`asset.ts` was never touched); fixed to keep the suite
  deterministically green.
- The original 23-05 executor agent stalled (watchdog timeout) mid-commit when
  the pre-commit hook caught the flaky test above. The orchestrator diagnosed
  the failure, fixed the test, and completed the commits + this SUMMARY.

## Notes / Follow-ups

- The wizard is asset-creation only. Applying it to non-asset dialogs (HEMS
  request submit, distribution create) was considered out of scope — those
  forms are short enough that a single page is fine. Revisit only if a future
  form grows past ~10 fields.
