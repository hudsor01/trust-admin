import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Stepper,
    StepperIndicator,
    StepperItem,
    StepperList,
    StepperSeparator,
    StepperTitle,
    StepperTrigger,
} from '@/components/ui/stepper'
import type { WizardStep } from '@/hooks/use-resource-form'

export interface ResourceDialogProps<T> {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description?: string
    children: React.ReactNode
    onSubmit: () => void | Promise<void>
    submitLabel?: string
    isLoading?: boolean
    /**
     * When provided, the dialog renders a step indicator above the form body
     * and gates the footer Back/Next buttons. The parent is responsible for
     * splitting `children` across steps (typically by reading `currentStep`).
     */
    steps?: WizardStep<T>[]
    /** Active step index (0-based). Required when `steps` is supplied. */
    currentStep?: number
    /** Set of completed step indices — used to gate free-jump navigation. */
    completedSteps?: Set<number>
    /** Whether the current step passes its per-step validation schema. */
    isStepValid?: boolean
    /** Advance to the next step (parent gates validity). */
    onNext?: () => void
    /** Return to the previous step. */
    onPrev?: () => void
    /** Free-jump to a step (only completed steps should be accepted). */
    onStepClick?: (index: number) => void
}

/** Generic dialog wrapper for resource create/edit forms. */
export function ResourceDialog<T>({
    open,
    onOpenChange,
    title,
    description,
    children,
    onSubmit,
    submitLabel = 'Save',
    isLoading = false,
    steps,
    currentStep = 0,
    completedSteps,
    isStepValid = true,
    onNext,
    onPrev,
    onStepClick,
}: ResourceDialogProps<T>) {
    const isWizard = !!steps && steps.length > 0
    const isLastStep = !isWizard || currentStep >= steps.length - 1
    const isFirstStep = currentStep === 0
    const done = completedSteps ?? new Set<number>()

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription className={description ? '' : 'sr-only'}>
                        {description || `${title} form`}
                    </DialogDescription>
                </DialogHeader>

                {isWizard && (
                    <Stepper value={steps[currentStep]?.id} className="gap-4">
                        <StepperList>
                            {steps.map((step, index) => (
                                <StepperItem
                                    key={step.id}
                                    value={step.id}
                                    completed={done.has(index)}
                                    disabled={
                                        !done.has(index) &&
                                        index !== currentStep
                                    }
                                >
                                    <StepperTrigger
                                        onClick={() => onStepClick?.(index)}
                                    >
                                        <StepperIndicator className="text-xs font-semibold" />
                                        <StepperTitle className="text-sm font-semibold">
                                            {step.label}
                                        </StepperTitle>
                                    </StepperTrigger>
                                    <StepperSeparator />
                                </StepperItem>
                            ))}
                        </StepperList>
                    </Stepper>
                )}

                {children}

                <DialogFooter>
                    {isWizard && !isFirstStep && (
                        <Button
                            variant="outline"
                            onClick={onPrev}
                            disabled={isLoading}
                        >
                            Back
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    {isWizard && !isLastStep ? (
                        <Button onClick={onNext} disabled={!isStepValid}>
                            Next
                        </Button>
                    ) : (
                        <Button onClick={onSubmit} disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                submitLabel
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
