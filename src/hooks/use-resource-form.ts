import { useForm } from '@tanstack/react-form'
import { useStore } from '@tanstack/react-store'
import { useCallback, useMemo, useState } from 'react'
import type { ZodType } from 'zod'

/**
 * One step of a multi-step resource-creation wizard.
 *
 * `fields` lists the keys that belong to the step (used by ResourceDialog to
 * decide which form fields to render). `schema` validates only those fields
 * before `goNext` advances; if it is omitted, `goNext` is always allowed.
 */
export interface WizardStep<T> {
    /** Stable id, e.g. "type-name", "valuation", "coverage", "ownership". */
    id: string
    /** Display label rendered in the stepper, e.g. "Type + Name". */
    label: string
    /** Form keys belonging to this step. */
    fields: Array<keyof T>
    /**
     * Optional per-step validation. If absent, Next is always enabled.
     * Typed as a partial of `T` so a schema key that is not a real form key
     * fails to compile (IN-04).
     */
    schema?: ZodType<Partial<T>>
}

export interface UseResourceFormOptions<T> {
    initialData: T
    onSubmit: (data: T) => Promise<void>
    /**
     * When provided, the resource renders as a multi-step wizard. When absent,
     * the hook behaves exactly as before and the wizard fields below are
     * stable no-op defaults so existing callers keep working untouched.
     */
    steps?: WizardStep<T>[]
}

/**
 * Validate the fields belonging to `step` against its schema, using the
 * supplied form `values`. Pure — no React, no `formInstance` capture — so it
 * can be called both from a reactive render path and from `handleEdit`.
 */
function validateStep<T>(
    step: WizardStep<T> | undefined,
    values: Record<string, unknown>,
): boolean {
    if (!step?.schema) return true
    const subset: Record<string, unknown> = {}
    for (const key of step.fields) {
        subset[key as string] = values[key as string]
    }
    return step.schema.safeParse(subset).success
}

/**
 * Dialog + TanStack Form state for CRUD resource dialogs (open/close, create/edit mode, submit).
 *
 * Optionally extends into a step-gated wizard when `steps` is supplied — the
 * wizard state (`currentStep`, `goNext`, `goPrev`, `goToStep`, `isFirstStep`,
 * `isLastStep`, `completedSteps`) is always present so consumers do not need
 * conditional access; when `steps` is omitted those fields are inert.
 *
 * Return type is intentionally inferred per TanStack Form guidance -- avoids
 * passing generics or referencing internal form types.
 */
export function useResourceForm<T>({
    initialData,
    onSubmit,
    steps,
}: UseResourceFormOptions<T>) {
    const [isOpen, setIsOpen] = useState(false)
    const [editing, setEditing] = useState<T | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [currentStep, setCurrentStep] = useState(0)
    const [completedSteps, setCompletedSteps] = useState<Set<number>>(
        () => new Set(),
    )

    const formInstance = useForm({
        defaultValues: initialData,
        onSubmit: async ({ value }) => {
            setIsSubmitting(true)
            try {
                await onSubmit(value)
                closeDialog()
            } finally {
                setIsSubmitting(false)
            }
        },
    })

    // Subscribe to the live form values so step validity is genuinely
    // reactive: the hook re-renders on every field change, which means the
    // React Compiler cannot mis-memoize a stale `getStepValidity` result
    // (WR-03). `formInstance` identity is stable, so this is the only thing
    // that re-derives validity as the user types.
    const formValues = useStore(
        formInstance.store,
        (s) => s.values as Record<string, unknown>,
    )

    const stepCount = steps?.length ?? 0
    const hasWizard = stepCount > 0
    const isFirstStep = !hasWizard || currentStep === 0
    const isLastStep = !hasWizard || currentStep >= stepCount - 1

    /**
     * Whether the step at `index` passes its per-step schema against the
     * current (reactive) form values. Recomputes on every value change
     * because it depends on `formValues`.
     */
    const getStepValidity = useCallback(
        (index: number): boolean => validateStep(steps?.[index], formValues),
        [steps, formValues],
    )

    const resetWizard = useCallback(() => {
        setCurrentStep(0)
        setCompletedSteps(new Set())
    }, [])

    const goNext = useCallback(() => {
        if (!hasWizard) return
        setCurrentStep((prev) => {
            if (prev >= stepCount - 1) return prev
            const liveValues = formInstance.state.values as Record<
                string,
                unknown
            >
            if (!validateStep(steps?.[prev], liveValues)) {
                // Surface field errors using the existing TanStack pattern.
                const step = steps?.[prev]
                if (step) {
                    for (const key of step.fields) {
                        formInstance.validateField(
                            key as Parameters<
                                typeof formInstance.validateField
                            >[0],
                            'change',
                        )
                    }
                }
                return prev
            }
            setCompletedSteps((done) => {
                if (done.has(prev)) return done
                const next = new Set(done)
                next.add(prev)
                return next
            })
            return prev + 1
        })
    }, [hasWizard, stepCount, steps, formInstance])

    const goPrev = useCallback(() => {
        if (!hasWizard) return
        setCurrentStep((prev) => Math.max(prev - 1, 0))
    }, [hasWizard])

    const goToStep = useCallback(
        (index: number) => {
            if (!hasWizard) return
            if (index < 0 || index >= stepCount) return
            // Free-jump only to the current step or an already-completed one.
            setCurrentStep((prev) => {
                if (index === prev) return prev
                return completedSteps.has(index) ? index : prev
            })
        },
        [hasWizard, stepCount, completedSteps],
    )

    const openDialog = useCallback(
        (defaults?: Partial<T>) => {
            const mergedDefaults = defaults
                ? { ...initialData, ...defaults }
                : initialData
            formInstance.reset(mergedDefaults)
            resetWizard()
            setIsOpen(true)
        },
        [initialData, formInstance, resetWizard],
    )

    const closeDialog = useCallback(() => {
        setIsOpen(false)
        setEditing(null)
        formInstance.reset(initialData)
        resetWizard()
    }, [initialData, formInstance, resetWizard])

    const handleEdit = useCallback(
        (item: T) => {
            setEditing(item)
            formInstance.reset(item)
            if (steps && steps.length > 0) {
                // Pre-populate completedSteps for every step whose schema
                // already validates against the record being edited, so an
                // edit lands on step 0 with full free-jump navigation rather
                // than forcing sequential Next-clicks (WR-01). Validity is
                // computed directly from `item` — no dependency on whether
                // TanStack's reset() has flushed yet.
                const itemValues = item as Record<string, unknown>
                const done = new Set<number>()
                steps.forEach((step, i) => {
                    if (validateStep(step, itemValues)) done.add(i)
                })
                setCompletedSteps(done)
            } else {
                setCompletedSteps(new Set())
            }
            setCurrentStep(0)
            setIsOpen(true)
        },
        [formInstance, steps],
    )

    const handleAdd = useCallback(() => {
        setEditing(null)
        formInstance.reset(initialData)
        resetWizard()
        setIsOpen(true)
    }, [initialData, formInstance, resetWizard])

    const handleSave = useCallback(() => {
        formInstance.handleSubmit()
    }, [formInstance])

    return useMemo(
        () => ({
            isOpen,
            open: openDialog,
            close: closeDialog,
            isEditing: editing !== null,
            editing,
            handleEdit,
            handleAdd,
            handleSave,
            isSubmitting,
            formInstance,
            // Wizard state — inert no-ops when `steps` is omitted.
            steps,
            currentStep: hasWizard ? currentStep : 0,
            isFirstStep,
            isLastStep,
            goNext,
            goPrev,
            goToStep,
            completedSteps,
            /** `(index) => boolean` — reactive step-validity check. */
            getStepValidity,
        }),
        [
            isOpen,
            editing,
            isSubmitting,
            formInstance,
            steps,
            hasWizard,
            currentStep,
            isFirstStep,
            isLastStep,
            goNext,
            goPrev,
            goToStep,
            completedSteps,
            getStepValidity,
            openDialog,
            closeDialog,
            handleEdit,
            handleAdd,
            handleSave,
        ],
    )
}

export type UseResourceFormReturn<T> = ReturnType<typeof useResourceForm<T>>

/**
 * Shared shape of the `wizard` prop passed from a resource client into one of
 * the 7 asset-creation dialogs. Extracted so the prop surface lives in one
 * place instead of being copy-pasted as a `Pick<...>` in every dialog (IN-02).
 */
export type ResourceWizardProps<T> = Pick<
    UseResourceFormReturn<T>,
    | 'currentStep'
    | 'completedSteps'
    | 'getStepValidity'
    | 'goNext'
    | 'goPrev'
    | 'goToStep'
>
