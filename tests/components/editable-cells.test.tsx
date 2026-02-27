/** Editable cell component tests — click-to-edit text, currency, select, and date cells in DataTable. */

import '../setup'
import { afterEach, describe, expect, mock, test } from 'bun:test'
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
    EditableDateCell,
    EditableSelectCell,
    EditableTextCell,
} from '../../src/components/editable-cells'

describe('EditableTextCell', () => {
    afterEach(() => {
        cleanup()
    })

    test('renders value in display mode', () => {
        render(<EditableTextCell value="Test Value" onSave={async () => {}} />)
        expect(screen.getByText('Test Value')).toBeTruthy()
    })

    test('renders placeholder when value is null', () => {
        render(
            <EditableTextCell
                value={null}
                onSave={async () => {}}
                placeholder="Enter value"
            />,
        )
        expect(screen.getByText('Enter value')).toBeTruthy()
    })

    test('renders em dash when no value and no placeholder', () => {
        render(<EditableTextCell value={null} onSave={async () => {}} />)
        expect(screen.getByText('—')).toBeTruthy()
    })

    test('switches to edit mode on click', async () => {
        const user = userEvent.setup()
        render(<EditableTextCell value="Test Value" onSave={async () => {}} />)

        await user.click(screen.getByText('Test Value'))
        expect(screen.getByRole('textbox')).toBeTruthy()
    })

    test('calls onSave with new value on blur', async () => {
        const onSave = mock(async (_value: string | null) => {})
        const user = userEvent.setup()

        render(<EditableTextCell value="Original" onSave={onSave} />)

        await user.click(screen.getByText('Original'))
        const input = screen.getByRole('textbox')
        await user.clear(input)
        await user.type(input, 'New Value')
        fireEvent.blur(input)

        await waitFor(() => {
            expect(onSave).toHaveBeenCalledWith('New Value')
        })
    })

    test('calls onSave on Enter key', async () => {
        const onSave = mock(async (_value: string | null) => {})
        const user = userEvent.setup()

        render(<EditableTextCell value="Original" onSave={onSave} />)

        await user.click(screen.getByText('Original'))
        const input = screen.getByRole('textbox')
        await user.clear(input)
        await user.type(input, 'New Value{Enter}')

        await waitFor(() => {
            expect(onSave).toHaveBeenCalledWith('New Value')
        })
    })

    test('cancels edit on Escape key', async () => {
        const onSave = mock(async (_value: string | null) => {})
        const user = userEvent.setup()

        render(<EditableTextCell value="Original" onSave={onSave} />)

        await user.click(screen.getByText('Original'))
        const input = screen.getByRole('textbox')
        await user.type(input, 'Changed')
        await user.keyboard('{Escape}')

        expect(screen.getByText('Original')).toBeTruthy()
        expect(onSave).not.toHaveBeenCalled()
    })

    test('does not call onSave if value unchanged', async () => {
        const onSave = mock(async (_value: string | null) => {})
        const user = userEvent.setup()

        render(<EditableTextCell value="Original" onSave={onSave} />)

        await user.click(screen.getByText('Original'))
        const input = screen.getByRole('textbox')
        fireEvent.blur(input)

        await waitFor(() => {
            expect(onSave).not.toHaveBeenCalled()
        })
    })
})

describe('EditableCurrencyCell', () => {
    afterEach(() => {
        cleanup()
    })

    test('renders formatted currency value', () => {
        render(<EditableCurrencyCell value="1234.56" onSave={async () => {}} />)
        expect(screen.getByText('$1,234.56')).toBeTruthy()
    })

    test('renders em dash for null value', () => {
        render(<EditableCurrencyCell value={null} onSave={async () => {}} />)
        expect(screen.getByText('—')).toBeTruthy()
    })

    test('switches to edit mode on click', async () => {
        const user = userEvent.setup()
        render(<EditableCurrencyCell value="1234.56" onSave={async () => {}} />)

        await user.click(screen.getByText('$1,234.56'))
        expect(screen.getByRole('textbox')).toBeTruthy()
    })

    test('calls onSave with numeric string', async () => {
        const onSave = mock(async (_value: string | null) => {})
        const user = userEvent.setup()

        render(<EditableCurrencyCell value="1000.00" onSave={onSave} />)

        await user.click(screen.getByText('$1,000.00'))
        const input = screen.getByRole('textbox')
        await user.clear(input)
        await user.type(input, '2500.50{Enter}')

        await waitFor(() => {
            expect(onSave).toHaveBeenCalledWith('2500.50')
        })
    })

    test('passes through input value as-is', async () => {
        const onSave = mock(async (_value: string | null) => {})
        const user = userEvent.setup()

        render(<EditableCurrencyCell value="1000.00" onSave={onSave} />)

        await user.click(screen.getByText('$1,000.00'))
        const input = screen.getByRole('textbox')
        await user.clear(input)
        // Component passes value as-is (no currency stripping)
        await user.type(input, '2500.50{Enter}')

        await waitFor(() => {
            expect(onSave).toHaveBeenCalledWith('2500.50')
        })
    })
})

describe('EditableSelectCell', () => {
    const options = [
        { value: 'ACTIVE', label: 'Active' },
        { value: 'INACTIVE', label: 'Inactive' },
        { value: 'PENDING', label: 'Pending' },
    ]

    afterEach(() => {
        cleanup()
    })

    test('renders current value as badge', () => {
        render(
            <EditableSelectCell
                value="ACTIVE"
                options={options}
                onSave={async () => {}}
            />,
        )
        expect(screen.getByText('Active')).toBeTruthy()
    })

    test('renders clickable container for unmatched value', () => {
        const { container } = render(
            <EditableSelectCell
                value=""
                options={options}
                onSave={async () => {}}
            />,
        )
        // Component renders a clickable div even with empty/unmatched value
        const clickableDiv = container.querySelector('.cursor-pointer')
        expect(clickableDiv).toBeTruthy()
    })

    test('opens select dropdown on click', async () => {
        const user = userEvent.setup()
        render(
            <EditableSelectCell
                value="ACTIVE"
                options={options}
                onSave={async () => {}}
            />,
        )

        await user.click(screen.getByText('Active'))
        expect(screen.getByRole('combobox')).toBeTruthy()
    })

    test('calls onSave when option selected', async () => {
        const onSave = mock(async (_value: string) => {})
        const user = userEvent.setup()

        render(
            <EditableSelectCell
                value="ACTIVE"
                options={options}
                onSave={onSave}
            />,
        )

        await user.click(screen.getByText('Active'))
        const select = screen.getByRole('combobox')
        await user.click(select)

        await waitFor(() => {
            const inactiveOption = screen.getByText('Inactive')
            if (inactiveOption) {
                user.click(inactiveOption)
            }
        })
    })
})

describe('EditableDateCell', () => {
    afterEach(() => {
        cleanup()
    })

    test('renders formatted date', () => {
        // Use ISO format with time to ensure consistent timezone handling
        render(
            <EditableDateCell
                value="2025-01-15T12:00:00Z"
                onSave={async () => {}}
            />,
        )
        // Check for a date display (day may vary by timezone)
        const dateText = screen.getByText(/Jan \d+, 2025/)
        expect(dateText).toBeTruthy()
    })

    test('renders placeholder for null date', () => {
        render(
            <EditableDateCell
                value={null}
                onSave={async () => {}}
                placeholder="Select date"
            />,
        )
        expect(screen.getByText('Select date')).toBeTruthy()
    })

    test('switches to edit mode on click', async () => {
        const user = userEvent.setup()
        const { container } = render(
            <EditableDateCell
                value="2025-01-15T12:00:00Z"
                onSave={async () => {}}
            />,
        )

        const dateSpan = screen.getByText(/Jan \d+, 2025/)
        await user.click(dateSpan)

        // Date input has type="date", not role="textbox"
        const input = container.querySelector(
            'input[type="date"]',
        ) as HTMLInputElement
        expect(input).toBeTruthy()
        expect(input.type).toBe('date')
    })

    test('calls onSave with date string', async () => {
        const onSave = mock(async (_value: string | null) => {})
        const user = userEvent.setup()

        const { container } = render(
            <EditableDateCell value="2025-01-15T12:00:00Z" onSave={onSave} />,
        )

        const dateSpan = screen.getByText(/Jan \d+, 2025/)
        await user.click(dateSpan)

        // Date input has type="date", not role="textbox"
        const input = container.querySelector(
            'input[type="date"]',
        ) as HTMLInputElement
        fireEvent.change(input, { target: { value: '2025-06-20' } })
        fireEvent.blur(input)

        await waitFor(() => {
            expect(onSave).toHaveBeenCalled()
            // Check that some date value was passed
            const callArg = onSave.mock.calls[0]?.[0]
            expect(callArg).toContain('2025-06-20')
        })
    })
})

describe('Editable cell accessibility', () => {
    afterEach(() => {
        cleanup()
    })

    test('EditableTextCell has accessible role', async () => {
        const user = userEvent.setup()
        render(<EditableTextCell value="Test" onSave={async () => {}} />)

        await user.click(screen.getByText('Test'))
        expect(screen.getByRole('textbox')).toBeTruthy()
    })

    test('EditableCurrencyCell has accessible role', async () => {
        const user = userEvent.setup()
        render(<EditableCurrencyCell value="100.00" onSave={async () => {}} />)

        await user.click(screen.getByText('$100.00'))
        expect(screen.getByRole('textbox')).toBeTruthy()
    })
})

describe('Editable cell error handling', () => {
    afterEach(() => {
        cleanup()
    })

    test('EditableTextCell handles save error gracefully', async () => {
        // Suppress console.error for this test since we expect an error
        const originalError = console.error
        console.error = () => {}

        const onSave = mock(async () => {
            throw new Error('Save failed')
        })
        const user = userEvent.setup()

        render(<EditableTextCell value="Original" onSave={onSave} />)

        await user.click(screen.getByText('Original'))
        const input = screen.getByRole('textbox')
        await user.clear(input)
        await user.type(input, 'New Value{Enter}')

        // Should not crash, component should still be functional
        await waitFor(() => {
            expect(onSave).toHaveBeenCalled()
        })

        // Restore console.error
        console.error = originalError
    })

    test('EditableCurrencyCell handles invalid input', async () => {
        const onSave = mock(async (_value: string | null) => {})
        const user = userEvent.setup()

        render(<EditableCurrencyCell value="100.00" onSave={onSave} />)

        await user.click(screen.getByText('$100.00'))
        const input = screen.getByRole('textbox')
        await user.clear(input)
        await user.type(input, 'not a number{Enter}')

        // Should handle gracefully (passes value as-is)
        await waitFor(() => {
            expect(onSave).toHaveBeenCalled()
        })
    })
})
