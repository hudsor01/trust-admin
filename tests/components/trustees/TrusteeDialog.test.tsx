/** TrusteeDialog component tests — ResourceDialog wrapper for adding new trustees. */

import '../../setup'
import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TrusteeDialog } from '../../../src/app/(admin)/trustees/_components/TrusteeDialog'

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
    Subscribe: mock(
        ({
            children,
        }: {
            selector: (state: unknown) => unknown
            children: (value: unknown) => React.ReactNode
        }) => children('ACTIVE'),
    ),
})

const defaultExtraProps = {
    createMode: 'TRUSTEE' as const,
}

describe('TrusteeDialog', () => {
    afterEach(() => {
        cleanup()
    })

    test('renders without crashing when open=false', () => {
        const { container } = render(
            <TrusteeDialog
                isOpen={false}
                isEditing={false}
                isSubmitting={false}
                onOpenChange={mock(() => {})}
                onSubmit={mock(() => {})}
                formInstance={makeFormInstance()}
                {...defaultExtraProps}
            />,
        )
        expect(container).toBeTruthy()
    })

    test('renders dialog title "Add Trustee" when open and not editing', () => {
        render(
            <TrusteeDialog
                isOpen={true}
                isEditing={false}
                isSubmitting={false}
                onOpenChange={mock(() => {})}
                onSubmit={mock(() => {})}
                formInstance={makeFormInstance()}
                {...defaultExtraProps}
            />,
        )

        expect(screen.getByText('Add Trustee')).toBeTruthy()
    })

    test('renders dialog title "Edit Trustee" when open and editing', () => {
        render(
            <TrusteeDialog
                isOpen={true}
                isEditing={true}
                isSubmitting={false}
                onOpenChange={mock(() => {})}
                onSubmit={mock(() => {})}
                formInstance={makeFormInstance()}
                {...defaultExtraProps}
            />,
        )

        expect(screen.getByText('Edit Trustee')).toBeTruthy()
    })

    test('calls onSubmit when save button clicked', async () => {
        const user = userEvent.setup()
        const onSubmit = mock(() => {})

        render(
            <TrusteeDialog
                isOpen={true}
                isEditing={false}
                isSubmitting={false}
                onOpenChange={mock(() => {})}
                onSubmit={onSubmit}
                formInstance={makeFormInstance()}
                {...defaultExtraProps}
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
            <TrusteeDialog
                isOpen={true}
                isEditing={false}
                isSubmitting={false}
                onOpenChange={onOpenChange}
                onSubmit={mock(() => {})}
                formInstance={makeFormInstance()}
                {...defaultExtraProps}
            />,
        )

        const cancelButton = screen.getByRole('button', { name: /cancel/i })
        await user.click(cancelButton)

        expect(onOpenChange.mock.calls.length).toBeGreaterThan(0)
    })

    test('shows Saving... when isSubmitting=true', () => {
        render(
            <TrusteeDialog
                isOpen={true}
                isEditing={false}
                isSubmitting={true}
                onOpenChange={mock(() => {})}
                onSubmit={mock(() => {})}
                formInstance={makeFormInstance()}
                {...defaultExtraProps}
            />,
        )

        expect(screen.getByText('Saving...')).toBeTruthy()
    })

    test('renders form field labels when dialog is open (create mode)', () => {
        render(
            <TrusteeDialog
                isOpen={true}
                isEditing={false}
                isSubmitting={false}
                onOpenChange={mock(() => {})}
                onSubmit={mock(() => {})}
                formInstance={makeFormInstance()}
                {...defaultExtraProps}
            />,
        )

        // Status field is hidden on creates — button context determines status
        expect(screen.getByText('Name *')).toBeTruthy()
        expect(screen.queryByText('Status')).toBeNull()
        expect(screen.getByText('Order')).toBeTruthy()
    })

    test('shows Status field when editing', () => {
        render(
            <TrusteeDialog
                isOpen={true}
                isEditing={true}
                isSubmitting={false}
                onOpenChange={mock(() => {})}
                onSubmit={mock(() => {})}
                formInstance={makeFormInstance()}
                createMode={null}
            />,
        )

        expect(screen.getByText('Status')).toBeTruthy()
    })

    test('shows "Add Arbiter" title in arbiter create mode', () => {
        render(
            <TrusteeDialog
                isOpen={true}
                isEditing={false}
                isSubmitting={false}
                onOpenChange={mock(() => {})}
                onSubmit={mock(() => {})}
                formInstance={makeFormInstance()}
                createMode="ARBITER"
            />,
        )

        expect(screen.getByText('Add Arbiter')).toBeTruthy()
    })
})
