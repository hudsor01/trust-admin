/**
 * LiabilitySummaryCards Component Tests
 *
 * Tests for the LiabilitySummaryCards component that displays three summary
 * cards: total liabilities, active debts, and total records.
 */

import '../../setup'
import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { LiabilitySummaryCards } from '../../../src/app/(admin)/liabilities/_components/LiabilitySummaryCards'

describe('LiabilitySummaryCards', () => {
    afterEach(() => {
        cleanup()
    })

    test('renders Total Liabilities label', () => {
        render(
            <LiabilitySummaryCards
                totalLiabilities="0"
                totalActive="0"
                activeLiabilitiesCount={0}
                totalRecords={0}
            />,
        )
        expect(screen.getByText('Total Liabilities')).toBeTruthy()
    })

    test('renders Active Debts label', () => {
        render(
            <LiabilitySummaryCards
                totalLiabilities="0"
                totalActive="0"
                activeLiabilitiesCount={0}
                totalRecords={0}
            />,
        )
        expect(screen.getByText('Active Debts')).toBeTruthy()
    })

    test('renders Total Records label', () => {
        render(
            <LiabilitySummaryCards
                totalLiabilities="0"
                totalActive="0"
                activeLiabilitiesCount={0}
                totalRecords={0}
            />,
        )
        expect(screen.getByText('Total Records')).toBeTruthy()
    })

    test('renders formatted total liabilities value', () => {
        render(
            <LiabilitySummaryCards
                totalLiabilities="250000.00"
                totalActive="200000.00"
                activeLiabilitiesCount={3}
                totalRecords={5}
            />,
        )
        expect(screen.getByText('$250,000.00')).toBeTruthy()
    })

    test('renders formatted total active value', () => {
        render(
            <LiabilitySummaryCards
                totalLiabilities="250000.00"
                totalActive="200000.00"
                activeLiabilitiesCount={3}
                totalRecords={5}
            />,
        )
        expect(screen.getByText('$200,000.00')).toBeTruthy()
    })

    test('renders total records count', () => {
        render(
            <LiabilitySummaryCards
                totalLiabilities="250000.00"
                totalActive="200000.00"
                activeLiabilitiesCount={3}
                totalRecords={5}
            />,
        )
        expect(screen.getByText('5')).toBeTruthy()
    })

    test('renders singular "liability" when activeLiabilitiesCount is 1', () => {
        render(
            <LiabilitySummaryCards
                totalLiabilities="100000.00"
                totalActive="100000.00"
                activeLiabilitiesCount={1}
                totalRecords={1}
            />,
        )
        expect(screen.getByText('1 active liability')).toBeTruthy()
    })

    test('renders plural "liabilities" when activeLiabilitiesCount is not 1', () => {
        render(
            <LiabilitySummaryCards
                totalLiabilities="250000.00"
                totalActive="200000.00"
                activeLiabilitiesCount={3}
                totalRecords={5}
            />,
        )
        expect(screen.getByText('3 active liabilities')).toBeTruthy()
    })

    test('renders zero values correctly', () => {
        render(
            <LiabilitySummaryCards
                totalLiabilities="0"
                totalActive="0"
                activeLiabilitiesCount={0}
                totalRecords={0}
            />,
        )
        // Should render $0.00 for currency fields and 0 for count
        const zeroTexts = screen.getAllByText('$0.00')
        expect(zeroTexts.length).toBeGreaterThanOrEqual(1)
        expect(screen.getByText('0')).toBeTruthy()
        expect(screen.getByText('0 active liabilities')).toBeTruthy()
    })
})
