/** FirearmTable component tests — DataTable with inline editing, actions, NFA quick-action, and loading/empty states. */

import '../../setup'
import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Firearm } from '@/db/schema'
import { FirearmTable } from '../../../src/app/(admin)/firearms/_components/FirearmTable'

const makeFirearm = (overrides: Partial<Firearm> = {}): Firearm => ({
    id: 1,
    entityId: 1,
    name: "Dad's Glock",
    description: null,
    make: 'Glock',
    model: '19',
    serialNumber: 'ABCD1234',
    firearmType: 'PISTOL',
    caliber: '9mm',
    barrelLength: null,
    isNfa: false,
    nfaClass: null,
    atfFormType: null,
    atfControlNumber: null,
    taxStampDate: null,
    nfrtrSerial: null,
    nfaRegistered: null,
    nfaTransferStatus: null,
    acquisitionDate: null,
    acquisitionCost: null,
    dodValue: '800.00',
    dodValueDate: null,
    dodValueType: null,
    condition: 'GOOD',
    action: null,
    status: 'ACTIVE',
    transferStatus: 'PENDING',
    location: null,
    insured: false,
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
})

describe('FirearmTable', () => {
    afterEach(() => {
        cleanup()
    })

    test('renders empty message when no firearms', () => {
        render(
            <FirearmTable
                firearms={[]}
                isLoading={false}
                entityId={1}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onUpdateNfaStatus={mock(() => {})}
                onInlineUpdate={mock(async () => {})}
                onBulkDelete={mock(async () => {})}
            />,
        )
        expect(
            screen.getByText(
                'No firearms recorded. Click Add Firearm to create one.',
            ),
        ).toBeTruthy()
    })

    test('renders table with firearm data', () => {
        const firearms = [
            makeFirearm({
                id: 1,
                make: 'Glock',
                model: '19',
                name: "Dad's Glock",
            }),
            makeFirearm({
                id: 2,
                make: 'Remington',
                model: '870',
                name: 'Shotgun',
                serialNumber: 'XYZ9876',
                firearmType: 'SHOTGUN',
            }),
        ]

        render(
            <FirearmTable
                firearms={firearms}
                isLoading={false}
                entityId={1}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onUpdateNfaStatus={mock(() => {})}
                onInlineUpdate={mock(async () => {})}
                onBulkDelete={mock(async () => {})}
            />,
        )

        expect(screen.getByText("Dad's Glock")).toBeTruthy()
        expect(screen.getAllByText('Shotgun').length).toBeGreaterThan(0)
    })

    test('renders loading state without crashing', () => {
        render(
            <FirearmTable
                firearms={[]}
                isLoading={true}
                entityId={1}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onUpdateNfaStatus={mock(() => {})}
                onInlineUpdate={mock(async () => {})}
                onBulkDelete={mock(async () => {})}
            />,
        )
        // Table renders in loading state — just verify it does not crash
        expect(screen.getByRole('table')).toBeTruthy()
    })

    test('calls onEdit when edit button clicked', async () => {
        const user = userEvent.setup()
        const onEdit = mock(() => {})
        const firearm = makeFirearm({ id: 1, make: 'Glock', model: '19' })

        const { container } = render(
            <FirearmTable
                firearms={[firearm]}
                isLoading={false}
                entityId={1}
                onEdit={onEdit}
                onDelete={mock(() => {})}
                onUpdateNfaStatus={mock(() => {})}
                onInlineUpdate={mock(async () => {})}
                onBulkDelete={mock(async () => {})}
            />,
        )

        // Action buttons live in the last cell of the data row
        const dataRow = container.querySelector('tbody tr')
        const actionsCell = dataRow?.querySelector('td:last-child')
        const editButton = actionsCell?.querySelector(
            '[aria-label="Edit firearm"]',
        )
        if (editButton) {
            await user.click(editButton as HTMLElement)
        }

        expect(onEdit.mock.calls.length).toBeGreaterThan(0)
        expect(onEdit.mock.calls[0]?.[0]).toEqual(firearm)
    })

    test('calls onDelete when delete button clicked', async () => {
        const user = userEvent.setup()
        const onDelete = mock(() => {})
        const firearm = makeFirearm({ id: 1 })

        const { container } = render(
            <FirearmTable
                firearms={[firearm]}
                isLoading={false}
                entityId={1}
                onEdit={mock(() => {})}
                onDelete={onDelete}
                onUpdateNfaStatus={mock(() => {})}
                onInlineUpdate={mock(async () => {})}
                onBulkDelete={mock(async () => {})}
            />,
        )

        const dataRow = container.querySelector('tbody tr')
        const actionsCell = dataRow?.querySelector('td:last-child')
        const deleteButton = actionsCell?.querySelector(
            '[aria-label="Delete firearm"]',
        )
        if (deleteButton) {
            await user.click(deleteButton as HTMLElement)
        }

        expect(onDelete.mock.calls.length).toBeGreaterThan(0)
        expect(onDelete.mock.calls[0]?.[0]).toEqual(firearm)
    })

    test('NFA button rendered and calls onUpdateNfaStatus for isNfa=true row', async () => {
        const user = userEvent.setup()
        const onUpdateNfaStatus = mock(() => {})
        const nfaFirearm = makeFirearm({
            id: 1,
            isNfa: true,
            nfaClass: 'SUPPRESSOR',
        })

        const { container } = render(
            <FirearmTable
                firearms={[nfaFirearm]}
                isLoading={false}
                entityId={1}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onUpdateNfaStatus={onUpdateNfaStatus}
                onInlineUpdate={mock(async () => {})}
                onBulkDelete={mock(async () => {})}
            />,
        )

        const dataRow = container.querySelector('tbody tr')
        const actionsCell = dataRow?.querySelector('td:last-child')
        const nfaButton = actionsCell?.querySelector(
            '[aria-label="Update Form 5 status"]',
        )

        expect(nfaButton).toBeTruthy()
        await user.click(nfaButton as HTMLElement)

        expect(onUpdateNfaStatus.mock.calls.length).toBeGreaterThan(0)
        expect(onUpdateNfaStatus.mock.calls[0]?.[0]).toEqual(nfaFirearm)
    })

    test('NFA button NOT rendered for isNfa=false row', () => {
        const nonNfaFirearm = makeFirearm({ id: 1, isNfa: false })

        const { container } = render(
            <FirearmTable
                firearms={[nonNfaFirearm]}
                isLoading={false}
                entityId={1}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onUpdateNfaStatus={mock(() => {})}
                onInlineUpdate={mock(async () => {})}
                onBulkDelete={mock(async () => {})}
            />,
        )

        const dataRow = container.querySelector('tbody tr')
        const actionsCell = dataRow?.querySelector('td:last-child')
        const nfaButton = actionsCell?.querySelector(
            '[aria-label="Update Form 5 status"]',
        )

        expect(nfaButton).toBeNull()
    })

    test('renders search input for filtering', () => {
        render(
            <FirearmTable
                firearms={[makeFirearm()]}
                isLoading={false}
                entityId={1}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onUpdateNfaStatus={mock(() => {})}
                onInlineUpdate={mock(async () => {})}
                onBulkDelete={mock(async () => {})}
            />,
        )

        expect(screen.getByPlaceholderText('Search firearms...')).toBeTruthy()
    })

    test('search by name filters visible rows', async () => {
        const user = userEvent.setup()
        const firearms = [
            makeFirearm({ id: 1, name: 'Glock Pistol' }),
            makeFirearm({
                id: 2,
                name: 'Winchester Rifle',
                serialNumber: 'WIN001',
                make: 'Winchester',
                model: '70',
            }),
        ]

        render(
            <FirearmTable
                firearms={firearms}
                isLoading={false}
                entityId={1}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onUpdateNfaStatus={mock(() => {})}
                onInlineUpdate={mock(async () => {})}
                onBulkDelete={mock(async () => {})}
            />,
        )

        const searchInput = screen.getByPlaceholderText('Search firearms...')
        await user.type(searchInput, 'Winchester')

        expect(screen.getByText('Winchester Rifle')).toBeTruthy()
        expect(screen.queryByText('Glock Pistol')).toBeNull()
    })

    test('renders column headers', () => {
        render(
            <FirearmTable
                firearms={[]}
                isLoading={false}
                entityId={1}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onUpdateNfaStatus={mock(() => {})}
                onInlineUpdate={mock(async () => {})}
                onBulkDelete={mock(async () => {})}
            />,
        )

        expect(screen.getByText('Serial #')).toBeTruthy()
        expect(screen.getByText('Actions')).toBeTruthy()
    })
})
