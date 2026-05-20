/** VehicleDialog component tests — ResourceDialog wrapper for creating/editing vehicles. */

import '../../setup'
import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VehicleDialog } from '../../../src/app/(admin)/vehicles/_components/VehicleDialog'

/** isOpen=false means form fields never render, so formInstance.Field is never called. */
const makeFormInstance = () => ({
    Field: mock(
        ({
            children,
        }: {
            name: string
            children: (field: unknown) => React.ReactNode
        }) =>
            children({
                state: { value: '', meta: { errors: [] } },
                handleChange: mock(() => {}),
                handleBlur: mock(() => {}),
            }),
    ),
})

/**
 * Plan 23-05 made VehicleDialog a 3-step wizard, so it now requires a `wizard`
 * prop. `currentStep` controls which step's fields render and whether the
 * footer shows Next (steps 0-1) or the submit button (step 2 / last).
 */
const makeWizard = (currentStep = 0) => ({
    currentStep,
    completedSteps: new Set<number>([0, 1].filter((i) => i < currentStep)),
    getStepValidity: mock(() => true),
    goNext: mock(() => {}),
    goPrev: mock(() => {}),
    goToStep: mock(() => {}),
})

describe('VehicleDialog', () => {
    afterEach(() => {
        cleanup()
    })

    test('renders without crashing when open=false', () => {
        const { container } = render(
            <VehicleDialog
                isOpen={false}
                isEditing={false}
                isSubmitting={false}
                onOpenChange={mock(() => {})}
                onSubmit={mock(() => {})}
                formInstance={makeFormInstance()}
                wizard={makeWizard()}
            />,
        )
        // Dialog is closed — no dialog content rendered
        expect(container).toBeTruthy()
    })

    test('renders dialog title "Add Vehicle" when open and not editing', () => {
        render(
            <VehicleDialog
                isOpen={true}
                isEditing={false}
                isSubmitting={false}
                onOpenChange={mock(() => {})}
                onSubmit={mock(() => {})}
                formInstance={makeFormInstance()}
                wizard={makeWizard()}
            />,
        )

        expect(screen.getByText('Add Vehicle')).toBeTruthy()
    })

    test('renders dialog title "Edit Vehicle" when open and editing', () => {
        render(
            <VehicleDialog
                isOpen={true}
                isEditing={true}
                isSubmitting={false}
                onOpenChange={mock(() => {})}
                onSubmit={mock(() => {})}
                formInstance={makeFormInstance()}
                wizard={makeWizard()}
            />,
        )

        expect(screen.getByText('Edit Vehicle')).toBeTruthy()
    })

    test('renders the 3-step stepper above the form', () => {
        render(
            <VehicleDialog
                isOpen={true}
                isEditing={false}
                isSubmitting={false}
                onOpenChange={mock(() => {})}
                onSubmit={mock(() => {})}
                formInstance={makeFormInstance()}
                wizard={makeWizard()}
            />,
        )
        expect(document.querySelector('[data-slot="stepper"]')).not.toBeNull()
        expect(
            document.querySelectorAll('[data-slot="stepper-item"]').length,
        ).toBe(3)
        // step 0 footer shows Next, not the submit button
        expect(screen.getByText('Next')).toBeTruthy()
    })

    test('calls onSubmit when the final step submit button is clicked', async () => {
        const user = userEvent.setup()
        const onSubmit = mock(() => {})

        render(
            <VehicleDialog
                isOpen={true}
                isEditing={false}
                isSubmitting={false}
                onOpenChange={mock(() => {})}
                onSubmit={onSubmit}
                formInstance={makeFormInstance()}
                wizard={makeWizard(2)}
            />,
        )

        // On the last step the footer shows the submit button ("Create").
        const createButton = screen.getByRole('button', { name: /create/i })
        await user.click(createButton)

        expect(onSubmit.mock.calls.length).toBeGreaterThan(0)
    })

    test('shows loading state when isSubmitting=true', () => {
        render(
            <VehicleDialog
                isOpen={true}
                isEditing={false}
                isSubmitting={true}
                onOpenChange={mock(() => {})}
                onSubmit={mock(() => {})}
                formInstance={makeFormInstance()}
                wizard={makeWizard(2)}
            />,
        )

        // The dialog is open and in loading state
        expect(screen.getByText('Add Vehicle')).toBeTruthy()
        expect(screen.getByText('Saving...')).toBeTruthy()
    })
})
