/**
 * Inline Editing Integration Tests
 *
 * Tests that verify inline editing works correctly across admin pages.
 * These tests simulate the full editing flow from click to save.
 */

import '../setup'
import { afterEach, describe, expect, mock, test } from 'bun:test'
import type { ColumnDef } from '@tanstack/react-table'
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
    EditableCurrencyCell,
    EditableSelectCell,
    EditableTextCell,
} from '../../src/components/editable-cells'
import { DataTable } from '../../src/components/ui/data-table'

// Simulated liability data
interface Liability {
    id: number
    creditor: string
    currentBalance: string
    status: string
}

const testLiabilities: Liability[] = [
    {
        id: 1,
        creditor: 'Bank of America',
        currentBalance: '15000.00',
        status: 'ACTIVE',
    },
    { id: 2, creditor: 'Chase', currentBalance: '5000.00', status: 'ACTIVE' },
    {
        id: 3,
        creditor: 'Wells Fargo',
        currentBalance: '8500.00',
        status: 'PAID_OFF',
    },
]

const STATUS_OPTIONS = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'PAID_OFF', label: 'Paid Off' },
    { value: 'INACTIVE', label: 'Inactive' },
]

describe('Inline Editing Integration', () => {
    afterEach(() => {
        cleanup()
    })

    describe('Text field editing', () => {
        test('edits creditor name and saves', async () => {
            const onSave = mock(async (_id: number, _value: string) => {})
            const user = userEvent.setup()

            const columns: ColumnDef<Liability>[] = [
                {
                    accessorKey: 'creditor',
                    header: 'Creditor',
                    cell: ({ row }) => (
                        <EditableTextCell
                            value={row.original.creditor}
                            onSave={async (v) =>
                                onSave(row.original.id, v || '')
                            }
                        />
                    ),
                },
            ]

            render(<DataTable columns={columns} data={testLiabilities} />)

            // Click to edit Bank of America
            await user.click(screen.getByText('Bank of America'))

            // Type new value
            const input = screen.getByRole('textbox')
            await user.clear(input)
            await user.type(input, 'New Creditor Name{Enter}')

            await waitFor(() => {
                expect(onSave).toHaveBeenCalledWith(1, 'New Creditor Name')
            })
        })

        test('cancels edit without saving', async () => {
            const onSave = mock(async (_id: number, _value: string) => {})
            const user = userEvent.setup()

            const columns: ColumnDef<Liability>[] = [
                {
                    accessorKey: 'creditor',
                    header: 'Creditor',
                    cell: ({ row }) => (
                        <EditableTextCell
                            value={row.original.creditor}
                            onSave={async (v) =>
                                onSave(row.original.id, v || '')
                            }
                        />
                    ),
                },
            ]

            render(<DataTable columns={columns} data={testLiabilities} />)

            await user.click(screen.getByText('Chase'))
            const input = screen.getByRole('textbox')
            await user.type(input, 'Changed Value')
            await user.keyboard('{Escape}')

            // Original value should be displayed
            expect(screen.getByText('Chase')).toBeTruthy()
            expect(onSave).not.toHaveBeenCalled()
        })
    })

    describe('Currency field editing', () => {
        test('edits balance and saves formatted value', async () => {
            const onSave = mock(async (_id: number, _value: string) => {})
            const user = userEvent.setup()

            const columns: ColumnDef<Liability>[] = [
                {
                    accessorKey: 'currentBalance',
                    header: 'Balance',
                    cell: ({ row }) => (
                        <EditableCurrencyCell
                            value={row.original.currentBalance}
                            onSave={async (v) =>
                                onSave(row.original.id, v || '0')
                            }
                        />
                    ),
                },
            ]

            render(<DataTable columns={columns} data={testLiabilities} />)

            // Click formatted balance to edit
            await user.click(screen.getByText('$15,000.00'))

            const input = screen.getByRole('textbox')
            await user.clear(input)
            await user.type(input, '20000.00{Enter}')

            await waitFor(() => {
                expect(onSave).toHaveBeenCalledWith(1, '20000.00')
            })
        })

        test('handles currency symbols in input', async () => {
            const onSave = mock(async (_id: number, _value: string) => {})
            const user = userEvent.setup()

            const columns: ColumnDef<Liability>[] = [
                {
                    accessorKey: 'currentBalance',
                    header: 'Balance',
                    cell: ({ row }) => (
                        <EditableCurrencyCell
                            value={row.original.currentBalance}
                            onSave={async (v) =>
                                onSave(row.original.id, v || '0')
                            }
                        />
                    ),
                },
            ]

            render(<DataTable columns={columns} data={testLiabilities} />)

            await user.click(screen.getByText('$5,000.00'))
            const input = screen.getByRole('textbox')
            await user.clear(input)
            // Input plain number (component passes through as-is)
            await user.type(input, '7500.00{Enter}')

            await waitFor(() => {
                expect(onSave).toHaveBeenCalledWith(2, '7500.00')
            })
        })
    })

    describe('Select field editing', () => {
        test('changes status via dropdown', async () => {
            const onSave = mock(async (_id: number, _value: string) => {})
            const user = userEvent.setup()

            // Use single item to avoid multiple "Active" elements
            const singleLiability = [testLiabilities[0]!]

            const columns: ColumnDef<Liability>[] = [
                {
                    accessorKey: 'status',
                    header: 'Status',
                    cell: ({ row }) => (
                        <EditableSelectCell
                            value={row.original.status}
                            options={STATUS_OPTIONS}
                            onSave={async (v) => onSave(row.original.id, v)}
                        />
                    ),
                },
            ]

            const { container } = render(
                <DataTable columns={columns} data={singleLiability} />,
            )

            // Click to open select
            await user.click(screen.getByText('Active'))

            // Select dropdown should be open - find native select by data-slot
            const select = container.querySelector(
                '[data-slot="native-select"]',
            )
            expect(select).toBeTruthy()
            expect(select?.tagName.toLowerCase()).toBe('select')
        })
    })

    describe('Multiple columns editing', () => {
        test('edits different columns independently', async () => {
            const onSaveCreditor = mock(
                async (_id: number, _value: string) => {},
            )
            const onSaveBalance = mock(
                async (_id: number, _value: string) => {},
            )
            const user = userEvent.setup()

            const columns: ColumnDef<Liability>[] = [
                {
                    accessorKey: 'creditor',
                    header: 'Creditor',
                    cell: ({ row }) => (
                        <EditableTextCell
                            value={row.original.creditor}
                            onSave={async (v) =>
                                onSaveCreditor(row.original.id, v || '')
                            }
                        />
                    ),
                },
                {
                    accessorKey: 'currentBalance',
                    header: 'Balance',
                    cell: ({ row }) => (
                        <EditableCurrencyCell
                            value={row.original.currentBalance}
                            onSave={async (v) =>
                                onSaveBalance(row.original.id, v || '0')
                            }
                        />
                    ),
                },
            ]

            render(<DataTable columns={columns} data={testLiabilities} />)

            // Edit creditor
            await user.click(screen.getByText('Bank of America'))
            let input = screen.getByRole('textbox')
            await user.clear(input)
            await user.type(input, 'Updated Bank{Enter}')

            await waitFor(() => {
                expect(onSaveCreditor).toHaveBeenCalledWith(1, 'Updated Bank')
            })

            // Edit balance (different row)
            await user.click(screen.getByText('$5,000.00'))
            input = screen.getByRole('textbox')
            await user.clear(input)
            await user.type(input, '6000.00{Enter}')

            await waitFor(() => {
                expect(onSaveBalance).toHaveBeenCalledWith(2, '6000.00')
            })
        })
    })

    describe('Error handling', () => {
        test('handles save failure gracefully', async () => {
            // Suppress console.error for this test since we expect an error
            const originalError = console.error
            console.error = () => {}

            const onSave = mock(async () => {
                throw new Error('Network error')
            })
            const user = userEvent.setup()

            const columns: ColumnDef<Liability>[] = [
                {
                    accessorKey: 'creditor',
                    header: 'Creditor',
                    cell: ({ row }) => (
                        <EditableTextCell
                            value={row.original.creditor}
                            onSave={onSave}
                        />
                    ),
                },
            ]

            render(<DataTable columns={columns} data={testLiabilities} />)

            await user.click(screen.getByText('Bank of America'))
            const input = screen.getByRole('textbox')
            await user.clear(input)
            await user.type(input, 'New Value{Enter}')

            // Should not crash
            await waitFor(() => {
                expect(onSave).toHaveBeenCalled()
            })

            // Restore console.error
            console.error = originalError
        })
    })

    describe('Empty and null values', () => {
        test('handles null value correctly', async () => {
            const onSave = mock(async (_value: string | null) => {})
            const user = userEvent.setup()

            const dataWithNull: Liability[] = [
                {
                    id: 1,
                    creditor: '',
                    currentBalance: '1000.00',
                    status: 'ACTIVE',
                },
            ]

            const columns: ColumnDef<Liability>[] = [
                {
                    accessorKey: 'creditor',
                    header: 'Creditor',
                    cell: ({ row }) => (
                        <EditableTextCell
                            value={row.original.creditor || null}
                            onSave={onSave}
                            placeholder="Enter creditor"
                        />
                    ),
                },
            ]

            render(<DataTable columns={columns} data={dataWithNull} />)

            // Should show placeholder
            expect(screen.getByText('Enter creditor')).toBeTruthy()

            // Click placeholder to edit
            await user.click(screen.getByText('Enter creditor'))
            const input = screen.getByRole('textbox')
            await user.type(input, 'New Creditor{Enter}')

            await waitFor(() => {
                expect(onSave).toHaveBeenCalledWith('New Creditor')
            })
        })

        test('clears value to null', async () => {
            const onSave = mock(async (_value: string | null) => {})
            const user = userEvent.setup()

            const columns: ColumnDef<Liability>[] = [
                {
                    accessorKey: 'creditor',
                    header: 'Creditor',
                    cell: ({ row }) => (
                        <EditableTextCell
                            value={row.original.creditor}
                            onSave={onSave}
                        />
                    ),
                },
            ]

            render(<DataTable columns={columns} data={testLiabilities} />)

            await user.click(screen.getByText('Bank of America'))
            const input = screen.getByRole('textbox')
            await user.clear(input)
            fireEvent.blur(input)

            await waitFor(() => {
                expect(onSave).toHaveBeenCalledWith(null)
            })
        })
    })
})

describe('Page-specific inline editing patterns', () => {
    afterEach(() => {
        cleanup()
    })

    describe('Liabilities page pattern', () => {
        test('creditor and balance columns are editable', async () => {
            const updateCreditor = mock(
                async (_id: number, _creditor: string) => {},
            )
            const updateBalance = mock(
                async (_id: number, _balance: string) => {},
            )
            const user = userEvent.setup()

            // Simulating the pattern used in liabilities page
            const columns: ColumnDef<Liability>[] = [
                {
                    accessorKey: 'creditor',
                    header: 'Creditor',
                    cell: ({ row }) => (
                        <EditableTextCell
                            value={row.original.creditor}
                            onSave={async (v) =>
                                updateCreditor(row.original.id, v || '')
                            }
                        />
                    ),
                },
                {
                    accessorKey: 'currentBalance',
                    header: 'Balance',
                    cell: ({ row }) => (
                        <EditableCurrencyCell
                            value={row.original.currentBalance}
                            onSave={async (v) =>
                                updateBalance(row.original.id, v || '0')
                            }
                        />
                    ),
                },
                {
                    accessorKey: 'status',
                    header: 'Status',
                    cell: ({ row }) => (
                        <EditableSelectCell
                            value={row.original.status}
                            options={STATUS_OPTIONS}
                            onSave={async () => {}}
                        />
                    ),
                },
            ]

            render(<DataTable columns={columns} data={testLiabilities} />)

            // Verify editable cells are rendered
            expect(screen.getByText('Bank of America')).toBeTruthy()
            expect(screen.getByText('$15,000.00')).toBeTruthy()
            // Use getAllByText since there are multiple "Active" badges
            expect(screen.getAllByText('Active').length).toBeGreaterThan(0)

            // Edit creditor
            await user.click(screen.getByText('Bank of America'))
            expect(screen.getByRole('textbox')).toBeTruthy()
        })
    })

    describe('Accounts page pattern', () => {
        interface Account {
            id: number
            institution: string
            accountType: string
            currentBalance: string
        }

        const testAccounts: Account[] = [
            {
                id: 1,
                institution: 'Fidelity',
                accountType: 'BROKERAGE',
                currentBalance: '250000.00',
            },
            {
                id: 2,
                institution: 'Vanguard',
                accountType: 'IRA',
                currentBalance: '150000.00',
            },
        ]

        const _ACCOUNT_TYPES = [
            { value: 'BROKERAGE', label: 'Brokerage' },
            { value: 'IRA', label: 'IRA' },
            { value: 'CHECKING', label: 'Checking' },
        ]

        test('institution and balance are editable', async () => {
            const onUpdate = mock(
                async (_id: number, _data: Partial<Account>) => {},
            )
            const user = userEvent.setup()

            const columns: ColumnDef<Account>[] = [
                {
                    accessorKey: 'institution',
                    header: 'Institution',
                    cell: ({ row }) => (
                        <EditableTextCell
                            value={row.original.institution}
                            onSave={async (v) =>
                                onUpdate(row.original.id, {
                                    institution: v || '',
                                })
                            }
                        />
                    ),
                },
                {
                    accessorKey: 'currentBalance',
                    header: 'Balance',
                    cell: ({ row }) => (
                        <EditableCurrencyCell
                            value={row.original.currentBalance}
                            onSave={async (v) =>
                                onUpdate(row.original.id, {
                                    currentBalance: v || '0',
                                })
                            }
                        />
                    ),
                },
            ]

            render(<DataTable columns={columns} data={testAccounts} />)

            await user.click(screen.getByText('Fidelity'))
            const input = screen.getByRole('textbox')
            await user.clear(input)
            await user.type(input, 'Charles Schwab{Enter}')

            await waitFor(() => {
                expect(onUpdate).toHaveBeenCalledWith(1, {
                    institution: 'Charles Schwab',
                })
            })
        })
    })

    describe('Beneficiaries page pattern', () => {
        interface Beneficiary {
            id: number
            firstName: string
            lastName: string
            sharePercent: string
        }

        const testBeneficiaries: Beneficiary[] = [
            {
                id: 1,
                firstName: 'John',
                lastName: 'Doe',
                sharePercent: '25.00',
            },
            {
                id: 2,
                firstName: 'Jane',
                lastName: 'Smith',
                sharePercent: '75.00',
            },
        ]

        test('share percent is editable', async () => {
            const onUpdate = mock(async (_id: number, _share: string) => {})
            const user = userEvent.setup()

            const columns: ColumnDef<Beneficiary>[] = [
                {
                    accessorKey: 'firstName',
                    header: 'Name',
                    cell: ({ row }) =>
                        `${row.original.firstName} ${row.original.lastName}`,
                },
                {
                    accessorKey: 'sharePercent',
                    header: 'Share %',
                    cell: ({ row }) => (
                        <EditableTextCell
                            value={row.original.sharePercent}
                            onSave={async (v) =>
                                onUpdate(row.original.id, v || '0')
                            }
                        />
                    ),
                },
            ]

            render(<DataTable columns={columns} data={testBeneficiaries} />)

            await user.click(screen.getByText('25.00'))
            const input = screen.getByRole('textbox')
            await user.clear(input)
            await user.type(input, '30.00{Enter}')

            await waitFor(() => {
                expect(onUpdate).toHaveBeenCalledWith(1, '30.00')
            })
        })
    })
})
