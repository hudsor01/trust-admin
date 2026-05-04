/** VehicleTable component tests — DataTable with inline editing, actions, and loading/empty states. */

import '../../setup'
import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Vehicle } from '@/db/schema'
import { VehicleTable } from '../../../src/app/(admin)/vehicles/_components/VehicleTable'

const makeVehicle = (overrides: Partial<Vehicle> = {}): Vehicle => ({
    id: 1,
    entityId: 1,
    name: "Dad's truck",
    description: null,
    year: 2020,
    make: 'Ford',
    model: 'F-150',
    vin: '1FTFW1ET0LKD12345',
    color: 'Blue',
    mileage: 45000,
    licensePlate: 'ABC123',
    titleStatus: 'CLEAR',
    status: 'ACTIVE',
    transferStatus: 'NOT_STARTED',
    dodValue: '25000.00',
    dodValueDate: null,
    dodValueType: null,
    acquisitionDate: null,
    acquisitionCost: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
})

describe('VehicleTable', () => {
    afterEach(() => {
        cleanup()
    })

    test('renders empty message when no vehicles', () => {
        render(
            <VehicleTable
                vehicles={[]}
                isLoading={false}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onInlineUpdate={mock(async () => {})}
            />,
        )
        expect(
            screen.getByText('No vehicles. Click Add Vehicle to create one.'),
        ).toBeTruthy()
    })

    test('renders table with vehicle data', () => {
        const vehicles = [
            makeVehicle({ id: 1, year: 2020, make: 'Ford', model: 'F-150' }),
            makeVehicle({
                id: 2,
                year: 2018,
                make: 'Toyota',
                model: 'Camry',
                vin: '4T1B11HK0JU123456',
            }),
        ]

        render(
            <VehicleTable
                vehicles={vehicles}
                isLoading={false}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onInlineUpdate={mock(async () => {})}
            />,
        )

        expect(screen.getByText('2020 Ford F-150')).toBeTruthy()
        expect(screen.getByText('2018 Toyota Camry')).toBeTruthy()
    })

    test('renders loading state without crashing', () => {
        render(
            <VehicleTable
                vehicles={[]}
                isLoading={true}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onInlineUpdate={mock(async () => {})}
            />,
        )
        // Table renders in loading state - just verify it does not crash
        expect(screen.getByRole('table')).toBeTruthy()
    })

    test('displays vehicle mileage when present', () => {
        const vehicle = makeVehicle({ mileage: 45000 })

        render(
            <VehicleTable
                vehicles={[vehicle]}
                isLoading={false}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onInlineUpdate={mock(async () => {})}
            />,
        )

        expect(screen.getByText('45,000 miles')).toBeTruthy()
    })

    test('displays truncated VIN (last 6 chars)', () => {
        const vehicle = makeVehicle({ vin: '1FTFW1ET0LKD12345' })

        render(
            <VehicleTable
                vehicles={[vehicle]}
                isLoading={false}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onInlineUpdate={mock(async () => {})}
            />,
        )

        // VIN is sliced to last 6 chars: "12345" → actually last 6 = "D12345"
        expect(screen.getByText('D12345')).toBeTruthy()
    })

    test('calls onEdit when edit button clicked', async () => {
        const user = userEvent.setup()
        const onEdit = mock(() => {})
        const vehicle = makeVehicle({
            id: 1,
            year: 2020,
            make: 'Ford',
            model: 'F-150',
        })

        const { container } = render(
            <VehicleTable
                vehicles={[vehicle]}
                isLoading={false}
                onEdit={onEdit}
                onDelete={mock(() => {})}
                onInlineUpdate={mock(async () => {})}
            />,
        )

        // The action buttons are in the last column (Actions) of the data row.
        // Find the table body rows and click the first icon button in the Actions cell.
        const tbody = container.querySelector('tbody')
        const actionButtons = tbody?.querySelectorAll('button')
        // First action button in the row is the Edit (pencil) button
        if (actionButtons && actionButtons.length > 0) {
            await user.click(actionButtons[0] as HTMLElement)
        }

        // onEdit should have been called with the vehicle
        expect(onEdit.mock.calls.length).toBeGreaterThan(0)
    })

    test('renders search input for filtering', () => {
        render(
            <VehicleTable
                vehicles={[makeVehicle()]}
                isLoading={false}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onInlineUpdate={mock(async () => {})}
            />,
        )

        expect(screen.getByPlaceholderText('Search vehicles...')).toBeTruthy()
    })

    test('renders column headers', () => {
        render(
            <VehicleTable
                vehicles={[]}
                isLoading={false}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onInlineUpdate={mock(async () => {})}
            />,
        )

        expect(screen.getByText('VIN')).toBeTruthy()
        expect(screen.getByText('Color')).toBeTruthy()
        expect(screen.getByText('Actions')).toBeTruthy()
    })
})
