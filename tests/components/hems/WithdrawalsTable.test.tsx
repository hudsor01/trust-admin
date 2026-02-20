/**
 * WithdrawalsTable Component Tests
 *
 * Tests for the WithdrawalsTable component that shows grandchild age-based
 * withdrawal eligibility (50% at age 25, remaining 50% at age 30).
 */

import '../../setup'
import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import type { WithdrawalRow } from '../../../src/app/(admin)/hems/_components/WithdrawalsTable'
import { WithdrawalsTable } from '../../../src/app/(admin)/hems/_components/WithdrawalsTable'
import type { Beneficiary, WithdrawalRecord } from '../../../src/db/schema'

const sampleBeneficiary: Beneficiary = {
    id: 5,
    entityId: 10,
    firstName: 'Charlie',
    lastName: 'Hudson',
    relationship: 'Grandchild',
    relationshipType: null,
    parentId: 1,
    dob: '2000-03-10T00:00:00Z',
    email: null,
    phone: null,
    streetAddress: null,
    city: null,
    state: null,
    zip: null,
    taxId: null,
    sharePercent: '2.00',
    distributionStandard: 'HEMS_PLUS_WITHDRAWAL',
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
    fullName: 'Charlie Hudson',
}

const sampleWithdrawalRecord: WithdrawalRecord = {
    id: 10,
    beneficiaryId: 5,
    entityId: 10,
    withdrawalType: 'AGE_25',
    eligibleDate: '2025-03-10T00:00:00Z',
    eligibleAmount: '50000.00',
    withdrawnAmount: '0',
    remainingAmount: '50000.00',
    status: 'NOT_YET_ELIGIBLE',
    exercisedDate: null,
    distributionId: null,
    notes: null,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
}

const sampleWithdrawalRow: WithdrawalRow = {
    beneficiary: sampleBeneficiary,
    age25: sampleWithdrawalRecord,
    age30: null,
}

const defaultProps = {
    grandchildrenWithdrawals: [sampleWithdrawalRow],
    isLoading: false,
    onProcessWithdrawal: mock((_withdrawal: WithdrawalRecord) => {}),
}

describe('WithdrawalsTable', () => {
    afterEach(() => {
        cleanup()
    })

    describe('empty state', () => {
        test('renders "No grandchild withdrawal schedules found." when empty', () => {
            render(
                <WithdrawalsTable
                    {...defaultProps}
                    grandchildrenWithdrawals={[]}
                />,
            )

            expect(
                screen.getByText('No grandchild withdrawal schedules found.'),
            ).toBeTruthy()
        })

        test('still renders the card title with empty data', () => {
            render(
                <WithdrawalsTable
                    {...defaultProps}
                    grandchildrenWithdrawals={[]}
                />,
            )

            expect(
                screen.getByText('Grandchild Age-Based Withdrawals'),
            ).toBeTruthy()
        })
    })

    describe('loading state', () => {
        test('renders without crashing when isLoading is true', () => {
            render(
                <WithdrawalsTable
                    {...defaultProps}
                    isLoading={true}
                    grandchildrenWithdrawals={[]}
                />,
            )

            expect(
                screen.getByText('Grandchild Age-Based Withdrawals'),
            ).toBeTruthy()
        })
    })

    describe('data rendering', () => {
        test('renders beneficiary name in the table', () => {
            render(<WithdrawalsTable {...defaultProps} />)

            expect(screen.getByText('Charlie Hudson')).toBeTruthy()
        })

        test('renders the card title and description', () => {
            render(<WithdrawalsTable {...defaultProps} />)

            expect(
                screen.getByText('Grandchild Age-Based Withdrawals'),
            ).toBeTruthy()
            expect(
                screen.getByText(/Per trust terms: 50% at age 25/),
            ).toBeTruthy()
        })

        test('renders column headers for the withdrawal table', () => {
            render(<WithdrawalsTable {...defaultProps} />)

            expect(screen.getByText('Beneficiary')).toBeTruthy()
            expect(screen.getByText('Age')).toBeTruthy()
            expect(screen.getByText('Share')).toBeTruthy()
        })

        test('renders share percent for the beneficiary', () => {
            render(<WithdrawalsTable {...defaultProps} />)

            expect(screen.getByText('2.00%')).toBeTruthy()
        })

        test('renders em dash for age30 when it is null', () => {
            render(<WithdrawalsTable {...defaultProps} />)

            // age30 is null so the cell renders "—"
            expect(screen.getByText('—')).toBeTruthy()
        })
    })

    describe('withdrawal row with eligible withdrawal', () => {
        const eligibleRecord: WithdrawalRecord = {
            ...sampleWithdrawalRecord,
            // Set eligibleDate in the past so getWithdrawalStatus returns isEligible=true
            eligibleDate: '2020-01-01T00:00:00Z',
            status: 'NOT_YET_ELIGIBLE',
        }

        const eligibleRow: WithdrawalRow = {
            beneficiary: sampleBeneficiary,
            age25: eligibleRecord,
            age30: null,
        }

        test('renders "Process 25" button when age25 is eligible and not complete', () => {
            render(
                <WithdrawalsTable
                    {...defaultProps}
                    grandchildrenWithdrawals={[eligibleRow]}
                />,
            )

            expect(
                screen.getByRole('button', { name: /Process 25/ }),
            ).toBeTruthy()
        })

        test('calls onProcessWithdrawal when "Process 25" button is clicked', async () => {
            const { default: userEvent } = await import(
                '@testing-library/user-event'
            )
            const user = userEvent.setup()
            const onProcessWithdrawal = mock(
                (_withdrawal: WithdrawalRecord) => {},
            )

            render(
                <WithdrawalsTable
                    {...defaultProps}
                    grandchildrenWithdrawals={[eligibleRow]}
                    onProcessWithdrawal={onProcessWithdrawal}
                />,
            )

            await user.click(screen.getByRole('button', { name: /Process 25/ }))

            expect(onProcessWithdrawal).toHaveBeenCalledTimes(1)
            expect(onProcessWithdrawal).toHaveBeenCalledWith(eligibleRecord)
        })
    })

    describe('completed withdrawal', () => {
        const completedRecord: WithdrawalRecord = {
            ...sampleWithdrawalRecord,
            eligibleDate: '2020-01-01T00:00:00Z',
            status: 'COMPLETE',
        }

        const completedRow: WithdrawalRow = {
            beneficiary: sampleBeneficiary,
            age25: completedRecord,
            age30: null,
        }

        test('does not render "Process 25" button when status is COMPLETE', () => {
            render(
                <WithdrawalsTable
                    {...defaultProps}
                    grandchildrenWithdrawals={[completedRow]}
                />,
            )

            expect(
                screen.queryByRole('button', { name: /Process 25/ }),
            ).toBeNull()
        })

        test('shows "WITHDRAWN" badge for a completed age25 withdrawal', () => {
            render(
                <WithdrawalsTable
                    {...defaultProps}
                    grandchildrenWithdrawals={[completedRow]}
                />,
            )

            expect(screen.getByText('WITHDRAWN')).toBeTruthy()
        })
    })
})
