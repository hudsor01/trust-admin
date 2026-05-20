'use client'

/**
 * Renders a group of form fields belonging to one wizard step.
 *
 * The children are kept mounted at all times (only the wrapper's `hidden`
 * attribute toggles) so the underlying TanStack Form fields never unmount —
 * this guarantees the wizard submits the exact same payload shape as the
 * single-page form. See plan 23-05 payload-parity requirement.
 *
 * When `currentStep` is undefined the group renders unconditionally, so a
 * dialog without wizard config behaves exactly as before.
 */
export interface WizardStepGroupProps {
    /** This group's step index (0-based). */
    step: number
    /** The dialog's active step. `undefined` => non-wizard, always shown. */
    currentStep?: number
    children: React.ReactNode
}

export function WizardStepGroup({
    step,
    currentStep,
    children,
}: WizardStepGroupProps) {
    const isActive = currentStep === undefined || currentStep === step
    return <div hidden={!isActive}>{children}</div>
}
