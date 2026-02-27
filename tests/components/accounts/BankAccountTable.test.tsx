/** BankAccountTable component tests — DataTable with inline editing, actions, and empty/loading states. */

import '../../setup'
import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { BankAccount } from '@/db/schema'
import { BankAccountTable } from '../../../src/app/(admin)/accounts/_components/BankAccountTable'

const makeBankAccount = (
    overrides: Partial<BankAccount> = {},
): BankAccount => ({
    id: 1,
    entityId: 1,
    institution: 'First National Bank',
    accountType: 'CHECKING',
    accountName: 'Trust Checking Account',
    accountNumber: '123456789',
    routingNumber: '987654321',
    dodValue: '50000.00',
    dodValueDate: null,
    currentBalance: '48500.00',
    currentBalanceDate: null,
    status: 'ACTIVE',
    transferStatus: 'NOT_STARTED',
    notes: null,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
})

describe('BankAccountTable', () => {
    afterEach(() => {
        cleanup()
    })

    test('renders empty message when no bank accounts', () => {
        render(
            <BankAccountTable
                bankAccounts={[]}
                totalBankValue="0.00"
                selectedEntity={1}
                onAdd={mock(() => {})}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onUpdate={mock(() => Promise.resolve())}
            />,
        )
        expect(screen.getByText('No bank accounts found.')).toBeTruthy()
    })

    test('renders table with bank account data', () => {
        const accounts = [
            makeBankAccount({
                id: 1,
                institution: 'First National Bank',
                accountName: 'Trust Checking Account',
            }),
            makeBankAccount({
                id: 2,
                institution: 'Chase Bank',
                accountName: 'Money Market Account',
                accountType: 'MONEY_MARKET',
                accountNumber: '987654321',
            }),
        ]

        render(
            <BankAccountTable
                bankAccounts={accounts}
                totalBankValue="98500.00"
                selectedEntity={1}
                onAdd={mock(() => {})}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onUpdate={mock(() => Promise.resolve())}
            />,
        )

        expect(screen.getByText('First National Bank')).toBeTruthy()
        expect(screen.getByText('Chase Bank')).toBeTruthy()
        expect(screen.getByText('Trust Checking Account')).toBeTruthy()
    })

    test('renders Add Bank Account button', () => {
        render(
            <BankAccountTable
                bankAccounts={[]}
                totalBankValue="0.00"
                selectedEntity={1}
                onAdd={mock(() => {})}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onUpdate={mock(() => Promise.resolve())}
            />,
        )
        expect(screen.getByText('Add Bank Account')).toBeTruthy()
    })

    test('calls onAdd when Add Bank Account button is clicked', async () => {
        const user = userEvent.setup()
        const onAdd = mock(() => {})

        render(
            <BankAccountTable
                bankAccounts={[]}
                totalBankValue="0.00"
                selectedEntity={1}
                onAdd={onAdd}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onUpdate={mock(() => Promise.resolve())}
            />,
        )

        await user.click(screen.getByText('Add Bank Account'))
        expect(onAdd.mock.calls.length).toBe(1)
    })

    test('masks account number in display', () => {
        const account = makeBankAccount({ accountNumber: '123456789' })

        render(
            <BankAccountTable
                bankAccounts={[account]}
                totalBankValue="50000.00"
                selectedEntity={1}
                onAdd={mock(() => {})}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onUpdate={mock(() => Promise.resolve())}
            />,
        )

        // Account number should be masked - last 4 digits visible
        expect(screen.getByText('****6789')).toBeTruthy()
    })

    test('renders search filter input', () => {
        render(
            <BankAccountTable
                bankAccounts={[makeBankAccount()]}
                totalBankValue="50000.00"
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
            <BankAccountTable
                bankAccounts={[]}
                totalBankValue="0.00"
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
        const account = makeBankAccount({ id: 42 })

        render(
            <BankAccountTable
                bankAccounts={[account]}
                totalBankValue="50000.00"
                selectedEntity={1}
                onAdd={mock(() => {})}
                onEdit={mock(() => {})}
                onDelete={onDelete}
                onUpdate={mock(() => Promise.resolve())}
            />,
        )

        // Find delete button (Trash2 icon button)
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
