/** BeneficiaryTable component tests — inline editing, eligibility badges, and action buttons. */

import '../../setup'
import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BeneficiaryTable } from '../../../src/app/(admin)/beneficiaries/_components/BeneficiaryTable'
import type { BeneficiaryWithDistributions } from '../../../src/app/(admin)/beneficiaries/_components/types'

const makeBeneficiary = (
    overrides: Partial<BeneficiaryWithDistributions> = {},
): BeneficiaryWithDistributions => ({
    id: 1,
    entityId: 1,
    firstName: 'Alice',
    lastName: 'Johnson',
    relationship: 'Child',
    relationshipType: 'CHILD',
    parentId: null,
    dob: null,
    email: 'alice@example.com',
    phone: null,
    streetAddress: null,
    city: null,
    state: null,
    zip: null,
    taxId: null,
    sharePercent: '8.50',
    distributionStandard: 'HEMS',
    withdrawalAge1: null,
    withdrawalPct1: null,
    withdrawalAge2: null,
    withdrawalPct2: null,
    hasSupplementalNeedsTrust: false,
    isPrimary: true,
    isContingent: false,
    informed: false,
    informedDate: null,
    releaseSigned: false,
    releaseDate: null,
    deceasedDate: null,
    notes: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    fullName: 'Alice Johnson',
    distributions: [],
    ...overrides,
})

const defaultProps = {
    beneficiaries: [],
    isLoading: false,
    onViewDetails: mock(() => {}),
    onUpdateBeneficiary: mock(async () => {}),
}

describe('BeneficiaryTable', () => {
    afterEach(() => {
        cleanup()
    })

    describe('empty state', () => {
        test('renders empty state message when no beneficiaries', () => {
            render(<BeneficiaryTable {...defaultProps} />)

            expect(screen.getByText('No beneficiaries found')).toBeTruthy()
        })

        test('renders table structure with no data', () => {
            render(<BeneficiaryTable {...defaultProps} />)

            expect(screen.getByRole('table')).toBeTruthy()
        })
    })

    describe('beneficiary data rendering', () => {
        test('renders beneficiary names from mock data', () => {
            const beneficiaries = [
                makeBeneficiary({
                    id: 1,
                    firstName: 'Richard',
                    lastName: 'Hudson Jr',
                    fullName: 'Richard Hudson Jr',
                }),
                makeBeneficiary({
                    id: 2,
                    firstName: 'Ashley',
                    lastName: 'Hudson',
                    fullName: 'Ashley Hudson',
                    email: 'ashley@example.com',
                }),
            ]

            render(
                <BeneficiaryTable
                    {...defaultProps}
                    beneficiaries={beneficiaries}
                />,
            )

            expect(screen.getByText('Richard Hudson Jr')).toBeTruthy()
            expect(screen.getByText('Ashley Hudson')).toBeTruthy()
        })

        test('renders share percent for a beneficiary', () => {
            const beneficiary = makeBeneficiary({ sharePercent: '15.00' })

            render(
                <BeneficiaryTable
                    {...defaultProps}
                    beneficiaries={[beneficiary]}
                />,
            )

            // EditablePercentCell formats as "15.00%"
            expect(screen.getByText('15.00%')).toBeTruthy()
        })

        test('renders deceased badge for deceased beneficiaries', () => {
            const deceased = makeBeneficiary({
                deceasedDate: '2025-06-01T00:00:00.000Z',
            })

            render(
                <BeneficiaryTable
                    {...defaultProps}
                    beneficiaries={[deceased]}
                />,
            )

            expect(screen.getByText('Deceased')).toBeTruthy()
        })
    })

    describe('search input', () => {
        test('renders search input for filtering by name', () => {
            render(<BeneficiaryTable {...defaultProps} />)

            expect(
                screen.getByPlaceholderText('Filter by name...'),
            ).toBeTruthy()
        })
    })

    describe('loading state', () => {
        test('renders table in loading state without crashing', () => {
            render(<BeneficiaryTable {...defaultProps} isLoading={true} />)

            expect(screen.getByRole('table')).toBeTruthy()
        })
    })

    describe('actions', () => {
        test('calls onViewDetails when view details button is clicked', async () => {
            const user = userEvent.setup()
            const onViewDetails = mock(() => {})
            const beneficiary = makeBeneficiary({
                id: 1,
                firstName: 'Bob',
                lastName: 'Smith',
            })

            render(
                <BeneficiaryTable
                    {...defaultProps}
                    beneficiaries={[beneficiary]}
                    onViewDetails={onViewDetails}
                />,
            )

            const viewButton = screen.getByRole('button', {
                name: /View details/i,
            })
            await user.click(viewButton)

            expect(onViewDetails.mock.calls.length).toBe(1)
            expect(onViewDetails.mock.calls[0][0]).toMatchObject({
                firstName: 'Bob',
                lastName: 'Smith',
            })
        })

        test('renders notified toggle button for each beneficiary', () => {
            const beneficiary = makeBeneficiary({ informed: false })

            render(
                <BeneficiaryTable
                    {...defaultProps}
                    beneficiaries={[beneficiary]}
                />,
            )

            // Multiple icon buttons rendered per row (notified, release, view)
            const buttons = screen.getAllByRole('button')
            expect(buttons.length).toBeGreaterThan(0)
        })
    })

    describe('column headers', () => {
        test('renders column header for Name', () => {
            render(<BeneficiaryTable {...defaultProps} />)

            expect(screen.getByText('Name')).toBeTruthy()
        })

        test('renders column header for Share %', () => {
            render(<BeneficiaryTable {...defaultProps} />)

            expect(screen.getByText('Share %')).toBeTruthy()
        })
    })
})
