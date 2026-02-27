/** InvestmentAccountTable component tests — DataTable with inline editing, actions, and empty states. */

import '../../setup'
import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { InvestmentAccount } from '@/db/schema'
import { InvestmentAccountTable } from '../../../src/app/(admin)/accounts/_components/InvestmentAccountTable'

const makeInvestmentAccount = (
    overrides: Partial<InvestmentAccount> = {},
): InvestmentAccount => ({
    id: 1,
    entityId: 1,
    institution: 'Fidelity Investments',
    accountType: 'BROKERAGE',
    accountName: 'Trust Brokerage Account',
    accountNumber: '987654321',
    dodValue: '150000.00',
    dodValueDate: null,
    costBasis: '120000.00',
    currentBalance: '155000.00',
    currentBalanceDate: null,
    status: 'ACTIVE',
    transferStatus: 'NOT_STARTED',
    notes: null,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
})

describe('InvestmentAccountTable', () => {
    afterEach(() => {
        cleanup()
    })

    test('renders empty message when no investment accounts', () => {
        render(
            <InvestmentAccountTable
                investmentAccounts={[]}
                totalInvestmentValue="0.00"
                selectedEntity={1}
                onAdd={mock(() => {})}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onUpdate={mock(() => Promise.resolve())}
            />,
        )
        expect(screen.getByText('No investment accounts found.')).toBeTruthy()
    })

    test('renders table with investment account data', () => {
        const accounts = [
            makeInvestmentAccount({
                id: 1,
                institution: 'Fidelity Investments',
                accountName: 'Trust Brokerage Account',
            }),
            makeInvestmentAccount({
                id: 2,
                institution: 'Vanguard',
                accountName: 'Roth IRA',
                accountType: 'IRA_ROTH',
                accountNumber: '111222333',
            }),
        ]

        render(
            <InvestmentAccountTable
                investmentAccounts={accounts}
                totalInvestmentValue="305000.00"
                selectedEntity={1}
                onAdd={mock(() => {})}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onUpdate={mock(() => Promise.resolve())}
            />,
        )

        expect(screen.getByText('Fidelity Investments')).toBeTruthy()
        expect(screen.getByText('Vanguard')).toBeTruthy()
        expect(screen.getByText('Trust Brokerage Account')).toBeTruthy()
    })

    test('renders Add Investment Account button', () => {
        render(
            <InvestmentAccountTable
                investmentAccounts={[]}
                totalInvestmentValue="0.00"
                selectedEntity={1}
                onAdd={mock(() => {})}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onUpdate={mock(() => Promise.resolve())}
            />,
        )
        expect(screen.getByText('Add Investment Account')).toBeTruthy()
    })

    test('calls onAdd when Add Investment Account button is clicked', async () => {
        const user = userEvent.setup()
        const onAdd = mock(() => {})

        render(
            <InvestmentAccountTable
                investmentAccounts={[]}
                totalInvestmentValue="0.00"
                selectedEntity={1}
                onAdd={onAdd}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onUpdate={mock(() => Promise.resolve())}
            />,
        )

        await user.click(screen.getByText('Add Investment Account'))
        expect(onAdd.mock.calls.length).toBe(1)
    })

    test('masks account number in display', () => {
        const account = makeInvestmentAccount({ accountNumber: '987654321' })

        render(
            <InvestmentAccountTable
                investmentAccounts={[account]}
                totalInvestmentValue="150000.00"
                selectedEntity={1}
                onAdd={mock(() => {})}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onUpdate={mock(() => Promise.resolve())}
            />,
        )

        // Account number should be masked - last 4 digits visible
        expect(screen.getByText('****4321')).toBeTruthy()
    })

    test('renders search filter input', () => {
        render(
            <InvestmentAccountTable
                investmentAccounts={[makeInvestmentAccount()]}
                totalInvestmentValue="150000.00"
                selectedEntity={1}
                onAdd={mock(() => {})}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onUpdate={mock(() => Promise.resolve())}
            />,
        )
        expect(
            screen.getByPlaceholderText('Filter by institution...'),
        ).toBeTruthy()
    })

    test('renders column headers', () => {
        render(
            <InvestmentAccountTable
                investmentAccounts={[]}
                totalInvestmentValue="0.00"
                selectedEntity={1}
                onAdd={mock(() => {})}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onUpdate={mock(() => Promise.resolve())}
            />,
        )
        expect(screen.getByText('Institution')).toBeTruthy()
        expect(screen.getByText('Account Name')).toBeTruthy()
        expect(screen.getByText('Account #')).toBeTruthy()
    })

    test('calls onDelete when delete button clicked', async () => {
        const user = userEvent.setup()
        const onDelete = mock(() => {})
        const account = makeInvestmentAccount({ id: 99 })

        render(
            <InvestmentAccountTable
                investmentAccounts={[account]}
                totalInvestmentValue="150000.00"
                selectedEntity={1}
                onAdd={mock(() => {})}
                onEdit={mock(() => {})}
                onDelete={onDelete}
                onUpdate={mock(() => Promise.resolve())}
            />,
        )

        const buttons = screen.getAllByRole('button')
        const deleteButton = buttons.find(
            (btn) => btn.getAttribute('title') === 'Delete account',
        )
        if (deleteButton) {
            await user.click(deleteButton)
        }

        expect(onDelete.mock.calls.length).toBeGreaterThan(0)
    })
})
