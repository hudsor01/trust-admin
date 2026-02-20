/**
 * HemsTable Component Tests
 *
 * Tests for the HemsTable component that shows HEMS distribution request
 * history (Health, Education, Maintenance, Support) and a "New HEMS Request"
 * button.
 */

import '../../setup'
import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HemsTable } from '../../../src/app/(admin)/hems/_components/HemsTable'
import type { Beneficiary, Distribution } from '../../../src/db/schema'

const sampleBeneficiaries: Beneficiary[] = [
    {
        id: 1,
        entityId: 10,
        firstName: 'Alice',
        lastName: 'Hudson',
        relationship: 'Child',
        relationshipType: null,
        parentId: null,
        dob: '1990-05-15T00:00:00Z',
        email: 'alice@example.com',
        phone: null,
        streetAddress: null,
        city: null,
        state: null,
        zip: null,
        taxId: null,
        sharePercent: '8.50',
        distributionStandard: 'HEMS',
        withdrawalAge1: 25,
        withdrawalPct1: 50,
        withdrawalAge2: 30,
        withdrawalPct2: 50,
        hasSupplementalNeedsTrust: false,
        isPrimary: true,
        isContingent: false,
        informed: false,
        informedDate: null,
        releaseSigned: false,
        releaseDate: null,
        deceasedDate: null,
        notes: null,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        fullName: 'Alice Hudson',
    },
]

const sampleDistributions: Distribution[] = [
    {
        id: 1,
        entityId: 10,
        beneficiaryId: 1,
        distributionDate: '2025-06-01T00:00:00Z',
        amount: '5000.00',
        distributionType: 'INCOME',
        hemsCategory: 'HEALTH',
        hemsJustification: 'Medical bills',
        isWithdrawal: false,
        withdrawalPercent: null,
        sourceDescription: null,
        checkNumber: null,
        paymentMethod: 'CHECK',
        taxReported: false,
        tax1099Issued: false,
        documentId: null,
        supportingDocPath: null,
        approvedBy: null,
        approvalDate: null,
        notes: null,
        createdAt: '2025-06-01T00:00:00Z',
        updatedAt: '2025-06-01T00:00:00Z',
    },
]

const defaultProps = {
    hemsDistributions: sampleDistributions,
    beneficiaries: sampleBeneficiaries,
    isLoading: false,
    selectedEntity: 10,
    onNewRequest: mock(() => {}),
}

describe('HemsTable', () => {
    afterEach(() => {
        cleanup()
    })

    describe('empty state', () => {
        test('renders "No HEMS distributions recorded" when hemsDistributions is empty', () => {
            render(<HemsTable {...defaultProps} hemsDistributions={[]} />)

            expect(
                screen.getByText('No HEMS distributions recorded'),
            ).toBeTruthy()
        })

        test('still renders the card header and HEMS categories with empty data', () => {
            render(<HemsTable {...defaultProps} hemsDistributions={[]} />)

            expect(screen.getByText('HEMS Distribution Request')).toBeTruthy()
        })
    })

    describe('loading state', () => {
        test('renders without crashing when isLoading is true', () => {
            render(
                <HemsTable
                    {...defaultProps}
                    isLoading={true}
                    hemsDistributions={[]}
                />,
            )

            expect(screen.getByText('HEMS Distribution Request')).toBeTruthy()
        })
    })

    describe('data rendering', () => {
        test('renders the HEMS distribution category cards', () => {
            render(<HemsTable {...defaultProps} />)

            expect(screen.getByText('Health')).toBeTruthy()
            expect(screen.getByText('Education')).toBeTruthy()
            expect(screen.getByText('Maintenance')).toBeTruthy()
            expect(screen.getByText('Support')).toBeTruthy()
        })

        test('renders hemsCategory badge for a distribution', () => {
            render(<HemsTable {...defaultProps} />)

            // The HEALTH category is rendered as a badge for the distribution
            expect(screen.getAllByText('HEALTH').length).toBeGreaterThan(0)
        })

        test('renders the "Recent HEMS Distributions" section title', () => {
            render(<HemsTable {...defaultProps} />)

            expect(screen.getByText('Recent HEMS Distributions')).toBeTruthy()
        })

        test('renders beneficiary name for a distribution', () => {
            render(<HemsTable {...defaultProps} />)

            expect(screen.getByText('Alice Hudson')).toBeTruthy()
        })
    })

    describe('new request button', () => {
        test('renders "New HEMS Request" button', () => {
            render(<HemsTable {...defaultProps} />)

            expect(screen.getByText('New HEMS Request')).toBeTruthy()
        })

        test('"New HEMS Request" button is enabled when selectedEntity is set', () => {
            render(<HemsTable {...defaultProps} selectedEntity={10} />)

            const button = screen.getByRole('button', {
                name: /New HEMS Request/,
            })
            expect(button.hasAttribute('disabled')).toBe(false)
        })

        test('"New HEMS Request" button is disabled when selectedEntity is null', () => {
            render(<HemsTable {...defaultProps} selectedEntity={null} />)

            const button = screen.getByRole('button', {
                name: /New HEMS Request/,
            })
            expect(button.hasAttribute('disabled')).toBe(true)
        })

        test('calls onNewRequest when "New HEMS Request" button is clicked', async () => {
            const user = userEvent.setup()
            const onNewRequest = mock(() => {})

            render(<HemsTable {...defaultProps} onNewRequest={onNewRequest} />)

            await user.click(
                screen.getByRole('button', { name: /New HEMS Request/ }),
            )

            expect(onNewRequest).toHaveBeenCalledTimes(1)
        })
    })
})
