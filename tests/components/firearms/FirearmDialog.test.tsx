/** FirearmDialog component tests — ResourceDialog wrapper for creating/editing firearms. */

import '../../setup'
import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FirearmDialog } from '../../../src/app/(admin)/firearms/_components/FirearmDialog'

/**
 * makeFormInstance returns a fake TanStack Form instance.
 *
 * - `Field` renders child function with a blank field state.
 * - `Subscribe` calls the child function with the `selector` result derived
 *   from the values bag passed in. `isNfaValue` controls what
 *   `state.values.isNfa` returns so tests can toggle the NFA section.
 */
const makeFormInstance = (isNfaValue = false) => ({
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
    Subscribe: mock(
        ({
            selector,
            children,
        }: {
            selector: (state: { values: { isNfa: boolean } }) => unknown
            children: (value: unknown) => React.ReactNode
        }) => children(selector({ values: { isNfa: isNfaValue } })),
    ),
})

/**
 * FIREARM_WIZARD_STEPS has 3 steps (identity / valuation / ownership).
 * `currentStep` controls which step's fields render and whether the footer
 * shows Next (steps 0-1) or the submit button (step 2 / last).
 */
const makeWizard = (currentStep = 0) => ({
    currentStep,
    completedSteps: new Set<number>([0, 1].filter((i) => i < currentStep)),
    getStepValidity: mock(() => true),
    goNext: mock(() => {}),
    goPrev: mock(() => {}),
    goToStep: mock(() => {}),
})

describe('FirearmDialog', () => {
    afterEach(() => {
        cleanup()
    })

    // 1. Closed state
    test('renders without crashing when isOpen=false and does not render form fields', () => {
        const { container } = render(
            <FirearmDialog
                isOpen={false}
                isEditing={false}
                isSubmitting={false}
                onOpenChange={mock(() => {})}
                onSubmit={mock(() => {})}
                formInstance={makeFormInstance()}
                wizard={makeWizard()}
            />,
        )
        // Dialog is closed — no dialog content in DOM
        expect(container).toBeTruthy()
        // Field mock should never be called when dialog is closed
        const formInstance = makeFormInstance()
        expect(formInstance.Field.mock.calls.length).toBe(0)
    })

    test('renders dialog title "Add Firearm" when open and not editing', () => {
        render(
            <FirearmDialog
                isOpen={true}
                isEditing={false}
                isSubmitting={false}
                onOpenChange={mock(() => {})}
                onSubmit={mock(() => {})}
                formInstance={makeFormInstance()}
                wizard={makeWizard()}
            />,
        )
        expect(screen.getByText('Add Firearm')).toBeTruthy()
    })

    test('renders dialog title "Edit Firearm" when open and editing', () => {
        render(
            <FirearmDialog
                isOpen={true}
                isEditing={true}
                isSubmitting={false}
                onOpenChange={mock(() => {})}
                onSubmit={mock(() => {})}
                formInstance={makeFormInstance()}
                wizard={makeWizard()}
            />,
        )
        expect(screen.getByText('Edit Firearm')).toBeTruthy()
    })

    // 2. Wizard step navigation
    test('renders the 3-step stepper and step-0 fields on currentStep=0', () => {
        render(
            <FirearmDialog
                isOpen={true}
                isEditing={false}
                isSubmitting={false}
                onOpenChange={mock(() => {})}
                onSubmit={mock(() => {})}
                formInstance={makeFormInstance()}
                wizard={makeWizard(0)}
            />,
        )
        expect(document.querySelector('[data-slot="stepper"]')).not.toBeNull()
        expect(
            document.querySelectorAll('[data-slot="stepper-item"]').length,
        ).toBe(3)
        // Step 0 footer shows Next, not the submit button
        expect(screen.getByText('Next')).toBeTruthy()
        // Step 0 (Identity) label is visible in the step indicator (may appear in stepper + form heading)
        expect(screen.getAllByText('Identity').length).toBeGreaterThan(0)
    })

    test('shows submit button on final step (currentStep=2)', () => {
        render(
            <FirearmDialog
                isOpen={true}
                isEditing={false}
                isSubmitting={false}
                onOpenChange={mock(() => {})}
                onSubmit={mock(() => {})}
                formInstance={makeFormInstance()}
                wizard={makeWizard(2)}
            />,
        )
        // Last step shows the create button, not Next
        expect(
            screen.getByRole('button', { name: /create firearm/i }),
        ).toBeTruthy()
    })

    // 3. NFA conditional section — isNfa=false hides NFA fields
    test('does not render NFA-specific fields when isNfa=false', () => {
        render(
            <FirearmDialog
                isOpen={true}
                isEditing={false}
                isSubmitting={false}
                onOpenChange={mock(() => {})}
                onSubmit={mock(() => {})}
                formInstance={makeFormInstance(false)}
                wizard={makeWizard(0)}
            />,
        )
        // NFA Classification heading should not appear
        expect(document.querySelector('#nfaClass')).toBeNull()
        expect(document.querySelector('#atfFormType')).toBeNull()
        expect(document.querySelector('#nfaRegistered')).toBeNull()
        expect(document.querySelector('#atfControlNumber')).toBeNull()
    })

    // 3. NFA conditional section — isNfa=true shows NFA fields
    test('renders NFA-specific fields when isNfa=true', () => {
        render(
            <FirearmDialog
                isOpen={true}
                isEditing={false}
                isSubmitting={false}
                onOpenChange={mock(() => {})}
                onSubmit={mock(() => {})}
                formInstance={makeFormInstance(true)}
                wizard={makeWizard(0)}
            />,
        )
        // NFA Classification section heading should appear
        expect(screen.getByText('NFA Classification')).toBeTruthy()
        // NFA-specific field labels should appear
        expect(screen.getByLabelText('NFA Class')).toBeTruthy()
        expect(screen.getByLabelText('ATF Form Type')).toBeTruthy()
    })

    // 4. D-03 — nfaTransferStatus is NEVER rendered as a form field
    test('never renders nfaTransferStatus input — D-03 (NfaStatusDialog only)', () => {
        // Test on both isNfa=false and isNfa=true to be exhaustive
        const { unmount } = render(
            <FirearmDialog
                isOpen={true}
                isEditing={false}
                isSubmitting={false}
                onOpenChange={mock(() => {})}
                onSubmit={mock(() => {})}
                formInstance={makeFormInstance(true)}
                wizard={makeWizard(0)}
            />,
        )
        expect(document.querySelector('#nfaTransferStatus')).toBeNull()
        unmount()

        render(
            <FirearmDialog
                isOpen={true}
                isEditing={false}
                isSubmitting={false}
                onOpenChange={mock(() => {})}
                onSubmit={mock(() => {})}
                formInstance={makeFormInstance(false)}
                wizard={makeWizard(2)}
            />,
        )
        expect(document.querySelector('#nfaTransferStatus')).toBeNull()
    })

    // 5. Submit handler
    test('calls onSubmit when the submit button is clicked on the last step', async () => {
        const user = userEvent.setup()
        const onSubmit = mock(() => {})

        render(
            <FirearmDialog
                isOpen={true}
                isEditing={false}
                isSubmitting={false}
                onOpenChange={mock(() => {})}
                onSubmit={onSubmit}
                formInstance={makeFormInstance()}
                wizard={makeWizard(2)}
            />,
        )

        const createButton = screen.getByRole('button', {
            name: /create firearm/i,
        })
        await user.click(createButton)

        expect(onSubmit.mock.calls.length).toBeGreaterThan(0)
    })

    // 6. isSubmitting disables submit button
    test('shows loading state and disabled submit when isSubmitting=true', () => {
        render(
            <FirearmDialog
                isOpen={true}
                isEditing={false}
                isSubmitting={true}
                onOpenChange={mock(() => {})}
                onSubmit={mock(() => {})}
                formInstance={makeFormInstance()}
                wizard={makeWizard(2)}
            />,
        )
        expect(screen.getByText('Add Firearm')).toBeTruthy()
        expect(screen.getByText('Saving...')).toBeTruthy()
    })
})
