import { useForm } from '@tanstack/react-form'
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
    /** Stable id, e.g. "type-name", "valuation", "ownership". */
    id: string
    /** Display label rendered in the stepper, e.g. "Type + Name". */
    label: string
    /** Form keys belonging to this step. */
    fields: Array<keyof T>
    /** Optional per-step validation. If absent, Next is always enabled. */
    schema?: ZodType
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

    const stepCount = steps?.length ?? 0
    const hasWizard = stepCount > 0
    const isFirstStep = !hasWizard || currentStep === 0
    const isLastStep = !hasWizard || currentStep >= stepCount - 1

    /** Validate the fields belonging to the step at `index` against its schema. */
    const isStepValid = useCallback(
        (index: number): boolean => {
            const step = steps?.[index]
            if (!step?.schema) return true
            const values = formInstance.state.values as Record<string, unknown>
            const subset: Record<string, unknown> = {}
            for (const key of step.fields) {
                subset[key as string] = values[key as string]
            }
            return step.schema.safeParse(subset).success
        },
        [steps, formInstance],
    )

    const resetWizard = useCallback(() => {
        setCurrentStep(0)
        setCompletedSteps(new Set())
    }, [])

    const goNext = useCallback(() => {
        if (!hasWizard) return
        setCurrentStep((prev) => {
            if (prev >= stepCount - 1) return prev
            if (!isStepValid(prev)) {
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
    }, [hasWizard, stepCount, isStepValid, steps, formInstance])

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

    const openDialog = (defaults?: Partial<T>) => {
        const mergedDefaults = defaults
            ? { ...initialData, ...defaults }
            : initialData
        formInstance.reset(mergedDefaults)
        resetWizard()
        setIsOpen(true)
    }

    const closeDialog = () => {
        setIsOpen(false)
        setEditing(null)
        formInstance.reset(initialData)
        resetWizard()
    }

    const handleEdit = (item: T) => {
        setEditing(item)
        formInstance.reset(item)
        resetWizard()
        setIsOpen(true)
    }

    const handleAdd = () => {
        setEditing(null)
        formInstance.reset(initialData)
        resetWizard()
        setIsOpen(true)
    }

    const handleSave = () => {
        formInstance.handleSubmit()
    }

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
            isStepValid,
        }),
        // openDialog/closeDialog/handleEdit/handleAdd/handleSave are stable
        // closures over `formInstance` (itself stable from useForm).
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
            isStepValid,
        ],
    )
}

export type UseResourceFormReturn<T> = ReturnType<typeof useResourceForm<T>>
