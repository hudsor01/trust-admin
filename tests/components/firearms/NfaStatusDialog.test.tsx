/** NfaStatusDialog component tests — CQS-style dialog that is the sole UI
 *  path to mutate `nfaTransferStatus` (D-02).  The component calls
 *  trpc.firearm.setNfaTransferStatus.useMutation internally, so @/lib/trpc
 *  is replaced with a module mock before the component is imported. */

import '../../setup'
import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ---------------------------------------------------------------------------
// trpc mock — must be declared before the component import so Bun's module
// graph picks up the replacement when NfaStatusDialog.tsx evaluates.
// ---------------------------------------------------------------------------

const mutateMock = mock(() => {})
const invalidateMock = mock(() => Promise.resolve())

mock.module('@/lib/trpc', () => ({
    trpc: {
        useUtils: () => ({
            firearm: {
                list: { invalidate: invalidateMock },
                byId: { invalidate: invalidateMock },
            },
        }),
        firearm: {
            setNfaTransferStatus: {
                useMutation: () => ({
                    mutate: mutateMock,
                    isPending: false,
                }),
            },
        },
    },
}))

// Import AFTER mock.module so the component gets the mocked trpc.
import { NfaStatusDialog } from '../../../src/app/(admin)/firearms/_components/NfaStatusDialog'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const baseFirearm = {
    id: 42,
    entityId: 1,
    nfaTransferStatus: null as 'NOT_FILED' | 'FILED' | 'APPROVED' | null,
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NfaStatusDialog', () => {
    afterEach(() => {
        cleanup()
        mutateMock.mockReset()
        invalidateMock.mockReset()
    })

    // 1. Closed state
    test('open=false does not render dialog content', () => {
        render(
            <NfaStatusDialog
                firearm={baseFirearm}
                open={false}
                onOpenChange={mock(() => {})}
            />,
        )
        // The dialog title should not be visible when closed.
        expect(screen.queryByText('Update ATF Form 5 Status')).toBeNull()
    })

    // 2. Open state — title, status select, conditional fields visible
    test('open=true renders title and status field', () => {
        render(
            <NfaStatusDialog
                firearm={baseFirearm}
                open={true}
                onOpenChange={mock(() => {})}
            />,
        )
        expect(screen.getByText('Update ATF Form 5 Status')).toBeTruthy()
        // The Status label and Save Status button must both be present.
        expect(screen.getByText('Status')).toBeTruthy()
        expect(
            screen.getByRole('button', { name: /save status/i }),
        ).toBeTruthy()
    })

    // 3. Initial status from prop — FILED
    test('nfaTransferStatus="FILED" selects FILED in the trigger', () => {
        render(
            <NfaStatusDialog
                firearm={{ ...baseFirearm, nfaTransferStatus: 'FILED' }}
                open={true}
                onOpenChange={mock(() => {})}
            />,
        )
        // The SelectTrigger renders the current value as visible text.
        // Radix SelectValue emits the child text of the matching SelectItem.
        expect(screen.getByText('Filed — Awaiting ATF')).toBeTruthy()
    })

    // 4. Null status defaults to NOT_FILED
    test('nfaTransferStatus=null defaults select to "Not Filed"', () => {
        render(
            <NfaStatusDialog
                firearm={{ ...baseFirearm, nfaTransferStatus: null }}
                open={true}
                onOpenChange={mock(() => {})}
            />,
        )
        expect(screen.getByText('Not Filed')).toBeTruthy()
    })

    // 5. Cancel button calls onOpenChange(false)
    test('Cancel button calls onOpenChange(false)', async () => {
        const user = userEvent.setup()
        const onOpenChange = mock((_open: boolean) => {})

        render(
            <NfaStatusDialog
                firearm={baseFirearm}
                open={true}
                onOpenChange={onOpenChange}
            />,
        )

        await user.click(screen.getByRole('button', { name: /cancel/i }))

        expect(onOpenChange.mock.calls.length).toBeGreaterThan(0)
        expect(onOpenChange.mock.calls[0]?.[0]).toBe(false)
    })

    // 6. Submit triggers the mutation with the correct payload
    test('Save Status button calls setNfaTransferStatus mutation', async () => {
        const user = userEvent.setup()

        render(
            <NfaStatusDialog
                firearm={{ ...baseFirearm, nfaTransferStatus: 'FILED' }}
                open={true}
                onOpenChange={mock(() => {})}
            />,
        )

        await user.click(screen.getByRole('button', { name: /save status/i }))

        expect(mutateMock.mock.calls.length).toBe(1)
        const payload = mutateMock.mock.calls[0]?.[0] as {
            id: number
            entityId: number
            status: string
        }
        expect(payload.id).toBe(42)
        expect(payload.entityId).toBe(1)
        expect(payload.status).toBe('FILED')
    })
})
