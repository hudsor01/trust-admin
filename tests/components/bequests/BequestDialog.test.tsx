/**
 * BequestDialog Component Tests
 *
 * Tests for the BequestDialog component that wraps ResourceDialog
 * to provide a form for creating/editing specific bequests.
 */

import '../../setup'
import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BequestDialog } from '../../../src/app/(admin)/bequests/_components/BequestDialog'

const makeFormInstance = () => ({
    Field: mock(({ children }: { name: string; children: (field: any) => React.ReactNode }) =>
        children({
            state: { value: '', meta: { errors: [] } },
            handleChange: mock(() => {}),
            handleBlur: mock(() => {}),
        }),
    ),
})

const defaultBeneficiaries = [
    { id: 1, firstName: 'Alice', lastName: 'Johnson' },
    { id: 2, firstName: 'Bob', lastName: 'Williams' },
]

describe('BequestDialog', () => {
    afterEach(() => {
        cleanup()
    })

    test('renders without crashing when open=false', () => {
        const { container } = render(
            <BequestDialog
                isOpen={false}
                isEditing={false}
                isSubmitting={false}
                onOpenChange={mock(() => {})}
                onSubmit={mock(() => {})}
                beneficiaries={defaultBeneficiaries}
                formInstance={makeFormInstance()}
            />,
        )
        expect(container).toBeTruthy()
    })

    test('renders dialog title "Add Bequest" when open and not editing', () => {
        render(
            <BequestDialog
                isOpen={true}
                isEditing={false}
                isSubmitting={false}
                onOpenChange={mock(() => {})}
                onSubmit={mock(() => {})}
                beneficiaries={defaultBeneficiaries}
                formInstance={makeFormInstance()}
            />,
        )

        expect(screen.getByText('Add Bequest')).toBeTruthy()
    })

    test('renders dialog title "Edit Bequest" when open and editing', () => {
        render(
            <BequestDialog
                isOpen={true}
                isEditing={true}
                isSubmitting={false}
                onOpenChange={mock(() => {})}
                onSubmit={mock(() => {})}
                beneficiaries={defaultBeneficiaries}
                formInstance={makeFormInstance()}
            />,
        )

        expect(screen.getByText('Edit Bequest')).toBeTruthy()
    })

    test('calls onSubmit when save button clicked', async () => {
        const user = userEvent.setup()
        const onSubmit = mock(() => {})

        render(
            <BequestDialog
                isOpen={true}
                isEditing={false}
                isSubmitting={false}
                onOpenChange={mock(() => {})}
                onSubmit={onSubmit}
                beneficiaries={defaultBeneficiaries}
                formInstance={makeFormInstance()}
            />,
        )

        const saveButton = screen.getByRole('button', { name: /save/i })
        await user.click(saveButton)

        expect(onSubmit.mock.calls.length).toBeGreaterThan(0)
    })

    test('calls onOpenChange(false) when cancel button clicked', async () => {
        const user = userEvent.setup()
        const onOpenChange = mock(() => {})

        render(
            <BequestDialog
                isOpen={true}
                isEditing={false}
                isSubmitting={false}
                onOpenChange={onOpenChange}
                onSubmit={mock(() => {})}
                beneficiaries={defaultBeneficiaries}
                formInstance={makeFormInstance()}
            />,
        )

        const cancelButton = screen.getByRole('button', { name: /cancel/i })
        await user.click(cancelButton)

        expect(onOpenChange.mock.calls.length).toBeGreaterThan(0)
    })

    test('shows Saving... when isSubmitting=true', () => {
        render(
            <BequestDialog
                isOpen={true}
                isEditing={false}
                isSubmitting={true}
                onOpenChange={mock(() => {})}
                onSubmit={mock(() => {})}
                beneficiaries={defaultBeneficiaries}
                formInstance={makeFormInstance()}
            />,
        )

        expect(screen.getByText('Saving...')).toBeTruthy()
    })
})
