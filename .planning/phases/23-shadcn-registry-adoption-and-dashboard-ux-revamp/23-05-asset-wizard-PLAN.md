---
phase: 23
plan: 05
type: execute
wave: 4
status: ready
activated: "2026-05-20 — user reasserted; the asset wizard is a locked CONTEXT.md Phase-3 decision, so the RESEARCH/UI-SPEC defer recommendation is overridden."
depends_on: [23-01, 23-04]
files_modified:
  - src/components/ui/stepper.tsx
  - src/hooks/use-resource-form.ts
  - src/components/resource-dialog.tsx
  - tests/components/resource-dialog.test.tsx
autonomous: false
requirements: []
tags: [asset-wizard, stepper, useResourceForm, deferred, optional]
must_haves:
  truths:
    - "src/components/ui/stepper.tsx exists (Dice UI stepper primitive)"
    - "useResourceForm accepts optional `steps?: WizardStep[]` and exposes `currentStep`, `goNext`, `goPrev` state"
    - "When `steps` is provided to a ResourceDialog, the stepper renders above the form with active step highlighted in bg-primary"
    - "Asset-creation dialogs (vehicle, homestead, rentalProperty, bankAccount, investmentAccount, personalProperty, insurance) use 3 steps: (1) Type + Name, (2) Valuation (DOD + estimated current), (3) Ownership + linkage"
    - "Next button is disabled until current step's fields pass zod validation"
    - "Last step's Next becomes 'Create' (variant default, primary CTA)"
    - "Free-jump between completed steps allowed (click any completed step circle)"
    - "The wizard collects the same payload shape as the prior single-page form — no API contract change"
  artifacts:
    - path: src/components/ui/stepper.tsx
      provides: "Dice UI stepper primitive"
    - path: src/hooks/use-resource-form.ts
      provides: "Extended useResourceForm with optional wizard support"
    - path: src/components/resource-dialog.tsx
      provides: "ResourceDialog renders stepper when `steps` prop is set"
    - path: tests/components/resource-dialog.test.tsx
      provides: "Wizard 3-step navigation tests + payload-shape parity test"
  key_links:
    - from: "useResourceForm"
      to: "useState<number> currentStep + step validation gating"
      via: "WizardStep[] with per-step zod schema"
      pattern: "currentStep|goNext|goPrev"
    - from: "ResourceDialog"
      to: "@/components/ui/stepper"
      via: "conditional render of <Stepper /> when steps prop provided"
      pattern: "import.*from '@/components/ui/stepper'"
---

# PLAN ACTIVATED — 2026-05-20

**Status:** `ready` — the user reasserted on 2026-05-20 that the 3-step asset wizard is wanted.

The wizard is a **locked CONTEXT.md Phase-3 decision** ("`@diceui/stepper` 3-step wizard for asset creation … Extends `useResourceForm` hook"). UI-SPEC Implementation Note 13 + RESEARCH.md Open Question 4 only *recommended* deferring it; that recommendation is now overridden by the user's reassertion.

**Checkpoint Task 05.0 (human-verify) is SATISFIED** by the user's reassertion — the executor proceeds directly to Task 05.1 with the default 3-step grouping (Type+Name / Valuation / Ownership+Linkage); no group-split overrides were given.

---

<objective>
PR-E / Wave 5 — Asset creation wizard (OPTIONAL, DEFERRED).

Install the Dice UI stepper primitive. Extend the existing `useResourceForm` hook with optional `steps?: WizardStep[]` and exposed `currentStep`/`goNext`/`goPrev` state. When the ResourceDialog receives a `steps` prop, render the stepper above the form fields and split the form across the steps. Apply the 3-step wizard to the 7 asset-creation dialogs (vehicle, homestead, rentalProperty, bankAccount, investmentAccount, personalProperty, insurance) preserving the existing payload shape exactly.

Purpose: collect asset metadata in a guided flow rather than presenting all fields at once. Most asset-creation forms have 8–15 fields spanning type+name, valuation, and ownership+linkage — natural 3-section grouping.

Output: 1 new registry primitive; 1 hook extension; 1 component edit (ResourceDialog); 7 consumer updates (asset creation dialogs); 1 test file covering wizard navigation + payload-shape parity.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-CONTEXT.md
@.planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-RESEARCH.md
@.planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-UI-SPEC.md
@.planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-VALIDATION.md
@CLAUDE.md
@src/hooks/use-resource-form.ts
@src/components/resource-dialog.tsx

<interfaces>
<!-- Extended useResourceForm shape -->

```typescript
export interface WizardStep<T> {
    id: string                          // e.g. "type-name", "valuation", "ownership"
    label: string                       // e.g. "Type + Name", "Valuation", "Ownership"
    schema?: ZodSchema                  // optional per-step validation; if absent, Next always enabled
    fields: Array<keyof T>              // which fields belong to this step
}

export interface UseResourceFormConfig<T> {
    // ... existing fields ...
    steps?: WizardStep<T>[]             // NEW — when set, dialog renders stepper
}

export interface UseResourceFormReturn<T> {
    // ... existing fields ...
    currentStep: number                 // 0-indexed
    isFirstStep: boolean
    isLastStep: boolean
    goNext: () => void                  // advances if currentStep is valid
    goPrev: () => void
    goToStep: (idx: number) => void     // free-jump (only to completed steps)
    completedSteps: Set<number>
}
```
</interfaces>
</context>

<tasks>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 05.0: Reassert wizard intent</name>
  <what-built>
    Plan-05 was deferred per UI-SPEC Implementation Note 13. This checkpoint verifies the user actually wants the 3-step asset wizard before any registry install or hook modification proceeds.
  </what-built>
  <how-to-verify>
    1. Confirm: "Do you want the 3-step asset creation wizard? (yes / defer further)"
    2. If yes: Confirm the 7 asset-creation dialogs are still in use and the 3-step grouping (Type+Name / Valuation / Ownership+Linkage) is the right split.
    3. If defer further: close PR-E plan and remove from phase scope; document in STATE.md.
  </how-to-verify>
  <resume-signal>Type "approved" (and any group-split overrides) OR "defer indefinitely"</resume-signal>
</task>

<task type="auto" tdd="true">
  <name>Task 05.1: Install Dice stepper + extend useResourceForm + edit ResourceDialog + tests</name>
  <files>src/components/ui/stepper.tsx, src/hooks/use-resource-form.ts, src/components/resource-dialog.tsx, tests/components/resource-dialog.test.tsx</files>
  <read_first>
    - src/hooks/use-resource-form.ts (current implementation — extend without breaking existing callers)
    - src/components/resource-dialog.tsx (current shape — add conditional stepper render)
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-UI-SPEC.md (§13 Stepper)
    - .planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-RESEARCH.md (Per-component registry status — @diceui/stepper verified slug)
  </read_first>
  <behavior>
    - `src/components/ui/stepper.tsx` exists after `bunx --bun shadcn@latest add @diceui/stepper`. OKLCH audit passes.
    - useResourceForm returns `currentStep`, `goNext`, `goPrev`, `goToStep`, `isFirstStep`, `isLastStep`, `completedSteps` when `steps` config is provided. When `steps` is omitted, those fields are stable defaults (currentStep=0, isLastStep=true, no-op goNext/goPrev) so existing callers continue to work.
    - ResourceDialog renders `<Stepper>` above the form when the hook returns wizard state. Footer renders Back/Next buttons; Next button is disabled when the current step's schema fails validation; last step's Next becomes "Create" (or whatever the parent's submit copy is).
    - Tests cover: (a) hook with no steps returns default behavior; (b) hook with 3 steps starts at currentStep=0 + isFirstStep=true; (c) goNext advances when step is valid + records completion; (d) goNext does NOT advance when step is invalid; (e) goPrev decrements; (f) goToStep jumps only to completed steps; (g) payload submitted at end matches single-page form payload exactly.
  </behavior>
  <action>
1. Install `@diceui/stepper`:
```bash
bunx --bun shadcn@latest add @diceui/stepper
```
   - OKLCH grep + ThemeProvider grep audits.

2. Extend `src/hooks/use-resource-form.ts`:
   - Accept optional `steps?: WizardStep<T>[]` in config.
   - When steps is set, add `currentStep` state (useState<number>) + `completedSteps` set.
   - Expose `goNext`, `goPrev`, `goToStep` callbacks.
   - When `goNext` is called: validate the current step's `schema` against the relevant form fields; if valid, increment currentStep and add the step index to completedSteps; if invalid, surface form errors (existing pattern).
   - Keep all existing callers working: `currentStep`/`goNext`/etc. are no-ops when `steps` is undefined.

3. Edit `src/components/resource-dialog.tsx`:
   - Import `Stepper` from `@/components/ui/stepper` (verify actual exports).
   - When the hook returns `steps`-aware state, render `<Stepper steps={steps} currentStep={currentStep} onStepClick={(idx) => goToStep(idx)} />` above the form body.
   - Filter the rendered form fields to those belonging to the current step (use the `fields` array from each WizardStep).
   - Footer: render Back (disabled on first step) + Next (disabled while step invalid). On last step, Next becomes the existing submit button (preserves "Create" / "Save" / etc. copy).

4. Apply the wizard to 7 asset-creation dialogs by passing `steps: WizardStep[]` config when calling `useResourceForm`:
   - vehicle, homestead, rentalProperty, bankAccount, investmentAccount, personalProperty, insurance
   - Steps for each:
     1. **Type + Name**: `assetType`, `name`/`make`/`model` (whichever applies per resource)
     2. **Valuation**: `dodValue`, `dodValueDate`, `currentValue` (or `coverageAmount`/`premium` for insurance)
     3. **Ownership + Linkage**: `ownership`, `transferStatus`, linked-liability field (for vehicle/property), beneficiary linkage if applicable
   - The grouping is approximate — adapt to each resource's actual field set. Document deviations in the SUMMARY.

5. Tests in `tests/components/resource-dialog.test.tsx`:
   - Cover all 7 behavior cases listed above.
   - Payload-shape parity test: render a wizard-mode dialog AND a single-page dialog for the same resource type with identical input; assert the submit payload is byte-equal.
  </action>
  <verify>
    <automated>test -f src/components/ui/stepper.tsx &amp;&amp; grep -Eq "currentStep|goNext|goPrev" src/hooks/use-resource-form.ts &amp;&amp; grep -q "Stepper" src/components/resource-dialog.tsx &amp;&amp; bun test --bail --timeout 30000 tests/components/resource-dialog.test.tsx &amp;&amp; bun run typecheck</automated>
  </verify>
  <acceptance_criteria>
    - File exists: src/components/ui/stepper.tsx with zero hex/Tailwind palette literals
    - useResourceForm exports new fields: currentStep, goNext, goPrev, goToStep, isFirstStep, isLastStep, completedSteps
    - ResourceDialog renders Stepper component when steps config is passed
    - All 7 asset-creation dialogs pass a steps config
    - Wizard payload-shape parity test passes (submit payload identical to single-page form)
    - bun run typecheck exits 0
    - bun test for resource-dialog tests exits 0
  </acceptance_criteria>
  <done>Dice stepper installed, useResourceForm extended (backwards-compatible), ResourceDialog renders stepper when configured, all 7 asset-creation dialogs use 3-step wizard, payload parity verified.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

PR-E does NOT introduce new tRPC procedures or modify any. All mutations the wizard submits route through the existing `*.create` procedures with the existing payload schemas. The wizard is purely a presentation-layer reorganization.

| Boundary | Description |
|----------|-------------|
| Client (wizard step state) → tRPC `*.create` | Existing mutation; admin-gated; entityId scoping unchanged. Final-step submit fires the same call the single-page form does today. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-23-PR-E-01 | Tampering | Wizard could skip steps and submit partial payload | mitigate | Per-step zod schema validation gates `goNext`; last-step submit re-validates the full payload against the existing resource zod schema. No new payload-shape; identical to single-page form. Payload-shape parity test verifies this. |
| T-23-PR-E-02 | Repudiation | Wizard's "free jump" could let a user skip required fields | mitigate | `goToStep` is gated to `completedSteps` only — users cannot jump to a step they haven't reached via `goNext` (which validates). The Create button on the final step always re-validates the full payload. |
</threat_model>

<verification>
After Task 05.1 completes (only if 05.0 checkpoint approved):
1. `bun run typecheck` exits 0
2. `bun test --bail --timeout 30000 tests/components/resource-dialog.test.tsx` exits 0
3. Manual smoke check: open each of the 7 asset-creation dialogs; verify 3 steps render; complete the flow end-to-end on at least 1 dialog; verify the created record appears in the resource's list with the expected fields.
4. `bun run build` succeeds; bundle delta < +10 KB for PR-E (stepper is ~3 KB est per RESEARCH.md).
</verification>

<success_criteria>
- 1 new registry primitive (Dice stepper) installed at src/components/ui/stepper.tsx
- useResourceForm hook backwards-compatibly extended with wizard state
- ResourceDialog conditionally renders Stepper when steps prop is set
- 7 asset-creation dialogs converted to 3-step wizard
- Wizard payload parity preserved (no API contract change)
- Cumulative bundle delta still < +120 KB after PR-E
- Tests passing
</success_criteria>

<output>
After completion, create `.planning/phases/23-shadcn-registry-adoption-and-dashboard-ux-revamp/23-05-asset-wizard-SUMMARY.md` recording: hook extension API, the actual 3-step field groupings used per resource (may vary from spec defaults), any UX adjustments made during integration, final bundle delta, and a note on whether the wizard should ever be applied to non-asset dialogs (HEMS submit? distribution create?).
</output>
