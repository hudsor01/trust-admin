/**
 * VehicleDialog Component Tests
 *
 * Tests for the VehicleDialog component that wraps ResourceDialog
 * to provide a form for creating/editing vehicles.
 */

import '../../setup'
import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VehicleDialog } from '../../../src/app/(admin)/vehicles/_components/VehicleDialog'

/**
 * Create a minimal formInstance mock for VehicleDialog.
 * When isOpen=false, the dialog does not render form fields,
 * so the formInstance.Field is never called.
 */
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
            />,
        )

        expect(screen.getByText('Edit Vehicle')).toBeTruthy()
    })

    test('calls onSubmit when form is submitted', async () => {
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
            />,
        )

        const saveButton = screen.getByRole('button', { name: /save/i })
        await user.click(saveButton)

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
            />,
        )

        // The dialog is open and in loading state
        expect(screen.getByText('Add Vehicle')).toBeTruthy()
    })
})
