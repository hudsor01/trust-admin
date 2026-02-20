/**
 * BeneficiarySummaryCards Component Tests
 *
 * Tests for the summary cards showing beneficiary statistics:
 * total shares, notified count, releases signed, and total distributed.
 */

import '../../setup'
import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { BeneficiarySummaryCards } from '../../../src/app/(admin)/beneficiaries/_components/BeneficiarySummaryCards'

const defaultProps = {
    totalShares: '100.00',
    informedCount: 5,
    releaseSignedCount: 3,
    totalDistributed: '25000.00',
    totalBeneficiaries: 10,
}

describe('BeneficiarySummaryCards', () => {
    afterEach(() => {
        cleanup()
    })

    test('renders without crashing', () => {
        render(<BeneficiarySummaryCards {...defaultProps} />)

        // Should render four cards
        expect(screen.getByText('Total Shares')).toBeTruthy()
        expect(screen.getByText('Notified')).toBeTruthy()
        expect(screen.getByText('Releases Signed')).toBeTruthy()
        expect(screen.getByText('Distributed')).toBeTruthy()
    })

    test('renders total shares percentage', () => {
        render(<BeneficiarySummaryCards {...defaultProps} totalShares="85.50" />)

        expect(screen.getByText('85.50%')).toBeTruthy()
    })

    test('renders beneficiary count for notified card', () => {
        render(
            <BeneficiarySummaryCards
                {...defaultProps}
                informedCount={7}
                totalBeneficiaries={12}
            />,
        )

        // Renders as "informed/total" fraction
        expect(screen.getByText('7/12')).toBeTruthy()
    })

    test('renders releases signed count', () => {
        render(
            <BeneficiarySummaryCards
                {...defaultProps}
                releaseSignedCount={4}
                totalBeneficiaries={10}
            />,
        )

        expect(screen.getByText('4/10')).toBeTruthy()
    })

    test('renders total distributed amount as currency', () => {
        render(
            <BeneficiarySummaryCards
                {...defaultProps}
                totalDistributed="50000.00"
            />,
        )

        expect(screen.getByText('$50,000.00')).toBeTruthy()
    })

    test('renders zero distributed amount', () => {
        render(
            <BeneficiarySummaryCards
                {...defaultProps}
                totalDistributed="0"
            />,
        )

        expect(screen.getByText('$0.00')).toBeTruthy()
    })

    test('renders 0/0 notified when no beneficiaries exist', () => {
        render(
            <BeneficiarySummaryCards
                {...defaultProps}
                informedCount={0}
                totalBeneficiaries={0}
                releaseSignedCount={0}
            />,
        )

        // Both notified and releases signed show 0/0
        const zeroFractions = screen.getAllByText('0/0')
        expect(zeroFractions.length).toBe(2)
    })
})
