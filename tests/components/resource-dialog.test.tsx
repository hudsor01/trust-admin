/**
 * Tests for the asset-creation wizard (plan 23-05).
 *
 * Covers the wizard extension of `useResourceForm`:
 *   (a) no `steps` config -> default single-page behavior, no-op nav
 *   (b) 3-step config -> starts at currentStep=0, isFirstStep=true
 *   (c) goNext advances when the step's schema passes + records completion
 *   (d) goNext does NOT advance when the step's schema fails
 *   (e) goPrev decrements currentStep
 *   (f) goToStep free-jumps only to completed steps
 *   (g) payload submitted at the end is byte-equal to the single-page payload
 *
 * Plus `ResourceDialog` stepper rendering: the <Stepper> appears above the
 * form body only when a `steps` prop is supplied, and the footer Next button
 * gates on step validity.
 */
import '../setup'
import { afterEach, describe, expect, test } from 'bun:test'
import {
    act,
    cleanup,
    render,
    renderHook,
    screen,
} from '@testing-library/react'
import { z } from 'zod'
import { ResourceDialog } from '../../src/components/resource-dialog'
import {
    useResourceForm,
    type WizardStep,
} from '../../src/hooks/use-resource-form'

afterEach(() => {
    cleanup()
})

interface AssetForm {
    name: string
    assetType: string
    dodValue: string
    transferStatus: string
}

const ASSET_DEFAULTS: AssetForm = {
    name: '',
    assetType: '',
    dodValue: '',
    transferStatus: 'PENDING',
}

const ASSET_STEPS: WizardStep<AssetForm>[] = [
    {
        id: 'type-name',
        label: 'Type + Name',
        fields: ['assetType', 'name'],
        schema: z.object({
            assetType: z.string().min(1),
            name: z.string().min(1),
        }),
    },
    {
        id: 'valuation',
        label: 'Valuation',
        fields: ['dodValue'],
        schema: z.object({
            dodValue: z.string().min(1),
        }),
    },
    {
        id: 'ownership',
        label: 'Ownership',
        fields: ['transferStatus'],
        schema: z.object({
            transferStatus: z.string().min(1),
        }),
    },
]

describe('useResourceForm — no steps (backwards compatibility)', () => {
    test('(a) returns stable wizard defaults when steps is omitted', () => {
        const { result } = renderHook(() =>
            useResourceForm<AssetForm>({
                initialData: ASSET_DEFAULTS,
                onSubmit: async () => {},
            }),
        )

        expect(result.current.currentStep).toBe(0)
        expect(result.current.isFirstStep).toBe(true)
        expect(result.current.isLastStep).toBe(true)
        expect(result.current.completedSteps.size).toBe(0)
        // existing API still present
        expect(typeof result.current.handleAdd).toBe('function')
        expect(typeof result.current.handleSave).toBe('function')
        expect(result.current.isOpen).toBe(false)
    })

    test('(a) goNext / goPrev are no-ops when steps is omitted', () => {
        const { result } = renderHook(() =>
            useResourceForm<AssetForm>({
                initialData: ASSET_DEFAULTS,
                onSubmit: async () => {},
            }),
        )

        act(() => {
            result.current.goNext()
            result.current.goPrev()
            result.current.goToStep(2)
        })

        expect(result.current.currentStep).toBe(0)
        expect(result.current.isLastStep).toBe(true)
    })
})

describe('useResourceForm — 3-step wizard', () => {
    test('(b) starts at currentStep=0 with isFirstStep=true', () => {
        const { result } = renderHook(() =>
            useResourceForm<AssetForm>({
                initialData: ASSET_DEFAULTS,
                onSubmit: async () => {},
                steps: ASSET_STEPS,
            }),
        )

        expect(result.current.currentStep).toBe(0)
        expect(result.current.isFirstStep).toBe(true)
        expect(result.current.isLastStep).toBe(false)
        expect(result.current.completedSteps.size).toBe(0)
    })

    test('(c) goNext advances and records completion when the step is valid', () => {
        const { result } = renderHook(() =>
            useResourceForm<AssetForm>({
                initialData: ASSET_DEFAULTS,
                onSubmit: async () => {},
                steps: ASSET_STEPS,
            }),
        )

        // satisfy step 0's schema
        act(() => {
            result.current.formInstance.setFieldValue('assetType', 'VEHICLE')
            result.current.formInstance.setFieldValue('name', "Dad's F-150")
        })
        act(() => {
            result.current.goNext()
        })

        expect(result.current.currentStep).toBe(1)
        expect(result.current.completedSteps.has(0)).toBe(true)
        expect(result.current.isFirstStep).toBe(false)
    })

    test('(d) goNext does NOT advance when the step is invalid', () => {
        const { result } = renderHook(() =>
            useResourceForm<AssetForm>({
                initialData: ASSET_DEFAULTS,
                onSubmit: async () => {},
                steps: ASSET_STEPS,
            }),
        )

        // step 0 schema requires assetType + name; both empty
        act(() => {
            result.current.goNext()
        })

        expect(result.current.currentStep).toBe(0)
        expect(result.current.completedSteps.has(0)).toBe(false)
    })

    test('(e) goPrev decrements currentStep', () => {
        const { result } = renderHook(() =>
            useResourceForm<AssetForm>({
                initialData: ASSET_DEFAULTS,
                onSubmit: async () => {},
                steps: ASSET_STEPS,
            }),
        )

        act(() => {
            result.current.formInstance.setFieldValue('assetType', 'VEHICLE')
            result.current.formInstance.setFieldValue('name', 'Truck')
        })
        act(() => {
            result.current.goNext()
        })
        expect(result.current.currentStep).toBe(1)

        act(() => {
            result.current.goPrev()
        })
        expect(result.current.currentStep).toBe(0)
    })

    test('(f) goToStep jumps only to completed (or current) steps', () => {
        const { result } = renderHook(() =>
            useResourceForm<AssetForm>({
                initialData: ASSET_DEFAULTS,
                onSubmit: async () => {},
                steps: ASSET_STEPS,
            }),
        )

        // jump forward to an unvisited step -> blocked
        act(() => {
            result.current.goToStep(2)
        })
        expect(result.current.currentStep).toBe(0)

        // complete step 0
        act(() => {
            result.current.formInstance.setFieldValue('assetType', 'VEHICLE')
            result.current.formInstance.setFieldValue('name', 'Truck')
        })
        act(() => {
            result.current.goNext()
        })
        expect(result.current.currentStep).toBe(1)

        // step 0 is completed -> jump back is allowed
        act(() => {
            result.current.goToStep(0)
        })
        expect(result.current.currentStep).toBe(0)

        // step 2 still not completed -> still blocked
        act(() => {
            result.current.goToStep(2)
        })
        expect(result.current.currentStep).toBe(0)
    })

    test('(g) wizard payload is byte-equal to the single-page payload', async () => {
        const wizardPayloads: AssetForm[] = []
        const singlePayloads: AssetForm[] = []

        const filled: AssetForm = {
            name: "Dad's F-150",
            assetType: 'VEHICLE',
            dodValue: '25000.00',
            transferStatus: 'COMPLETE',
        }

        // wizard-mode form
        const wizard = renderHook(() =>
            useResourceForm<AssetForm>({
                initialData: ASSET_DEFAULTS,
                onSubmit: async (data) => {
                    wizardPayloads.push(data)
                },
                steps: ASSET_STEPS,
            }),
        )
        act(() => {
            for (const [k, v] of Object.entries(filled)) {
                wizard.result.current.formInstance.setFieldValue(
                    k as keyof AssetForm,
                    v,
                )
            }
        })
        act(() => {
            wizard.result.current.goNext()
        })
        act(() => {
            wizard.result.current.goNext()
        })
        await act(async () => {
            await wizard.result.current.formInstance.handleSubmit()
        })

        // single-page form (no steps)
        const single = renderHook(() =>
            useResourceForm<AssetForm>({
                initialData: ASSET_DEFAULTS,
                onSubmit: async (data) => {
                    singlePayloads.push(data)
                },
            }),
        )
        act(() => {
            for (const [k, v] of Object.entries(filled)) {
                single.result.current.formInstance.setFieldValue(
                    k as keyof AssetForm,
                    v,
                )
            }
        })
        await act(async () => {
            await single.result.current.formInstance.handleSubmit()
        })

        expect(wizardPayloads).toHaveLength(1)
        expect(singlePayloads).toHaveLength(1)
        expect(JSON.stringify(wizardPayloads[0])).toBe(
            JSON.stringify(singlePayloads[0]),
        )
    })
})

describe('ResourceDialog — stepper rendering', () => {
    test('renders no stepper when steps prop is absent', () => {
        render(
            <ResourceDialog
                open
                onOpenChange={() => {}}
                title="Add Vehicle"
                onSubmit={() => {}}
            >
                <div>form body</div>
            </ResourceDialog>,
        )
        expect(document.querySelector('[data-slot="stepper"]')).toBeNull()
        expect(screen.getByText('form body')).toBeTruthy()
    })

    test('renders the stepper with one indicator per step when steps prop is set', () => {
        render(
            <ResourceDialog
                open
                onOpenChange={() => {}}
                title="Add Vehicle"
                onSubmit={() => {}}
                steps={ASSET_STEPS}
                currentStep={0}
                completedSteps={new Set<number>()}
            >
                <div>form body</div>
            </ResourceDialog>,
        )
        expect(document.querySelector('[data-slot="stepper"]')).not.toBeNull()
        expect(
            document.querySelectorAll('[data-slot="stepper-item"]').length,
        ).toBe(3)
        // every step label is shown
        expect(screen.getByText('Type + Name')).toBeTruthy()
        expect(screen.getByText('Valuation')).toBeTruthy()
        expect(screen.getByText('Ownership')).toBeTruthy()
    })

    test('last step renders the submit label; earlier steps render Next', () => {
        const { rerender } = render(
            <ResourceDialog
                open
                onOpenChange={() => {}}
                title="Add Vehicle"
                onSubmit={() => {}}
                submitLabel="Create"
                steps={ASSET_STEPS}
                currentStep={0}
                completedSteps={new Set<number>()}
            >
                <div>form body</div>
            </ResourceDialog>,
        )
        expect(screen.getByText('Next')).toBeTruthy()
        expect(screen.queryByText('Create')).toBeNull()

        rerender(
            <ResourceDialog
                open
                onOpenChange={() => {}}
                title="Add Vehicle"
                onSubmit={() => {}}
                submitLabel="Create"
                steps={ASSET_STEPS}
                currentStep={2}
                completedSteps={new Set<number>([0, 1])}
            >
                <div>form body</div>
            </ResourceDialog>,
        )
        expect(screen.getByText('Create')).toBeTruthy()
        expect(screen.queryByText('Next')).toBeNull()
    })
})
