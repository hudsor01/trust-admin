/**
 * Tests for the additive DataTable props introduced by plan 23-04:
 *   - bulkActions (sticky toolbar + ConfirmDialog wrap on destructive ops)
 *   - exportable / exportResource (CSV button)
 *   - getRowDetail (row expansion)
 *
 * The existing data-table.test.tsx covers the pre-23-04 surface area;
 * keeping these tests in a separate file keeps the diff scoped and
 * leaves the historical test suite untouched.
 */
import '../setup'
import { afterEach, describe, expect, test } from 'bun:test'
import type { ColumnDef } from '@tanstack/react-table'
import {
    cleanup,
    fireEvent,
    render,
    screen,
    within,
} from '@testing-library/react'
import { DataTable } from '../../src/components/ui/data-table'

interface Person {
    id: number
    name: string
    age: number
}

const cols: ColumnDef<Person>[] = [
    { id: 'name', accessorKey: 'name', header: 'Name' },
    { id: 'age', accessorKey: 'age', header: 'Age' },
]

const data: Person[] = [
    { id: 1, name: 'Alice', age: 30 },
    { id: 2, name: 'Bob', age: 40 },
    { id: 3, name: 'Carol', age: 25 },
]

afterEach(() => {
    cleanup()
})

describe('DataTable bulk actions', () => {
    test('does not render toolbar when bulkActions present but nothing selected', () => {
        render(
            <DataTable
                columns={cols}
                data={data}
                enableRowSelection
                bulkActions={[{ label: 'Delete', onClick: () => {} }]}
            />,
        )
        expect(
            screen.queryByRole('toolbar', { name: /bulk actions/i }),
        ).toBeNull()
    })

    test('does not render toolbar when bulkActions prop is omitted', () => {
        render(<DataTable columns={cols} data={data} />)
        expect(
            screen.queryByRole('toolbar', { name: /bulk actions/i }),
        ).toBeNull()
    })
})

describe('DataTable row expansion', () => {
    test('does not render chevrons when getRowDetail is not provided', () => {
        render(<DataTable columns={cols} data={data} />)
        expect(
            screen.queryAllByRole('button', { name: /expand row/i }).length,
        ).toBe(0)
    })

    test('renders a chevron per row when getRowDetail is provided', () => {
        render(
            <DataTable
                columns={cols}
                data={data}
                getRowDetail={(row) => <div>Detail for {row.name}</div>}
            />,
        )
        const chevrons = screen.getAllByRole('button', {
            name: /expand row/i,
        })
        expect(chevrons.length).toBe(data.length)
    })

    test('expanding a row reveals its detail content', () => {
        render(
            <DataTable
                columns={cols}
                data={data}
                getRowDetail={(row) => (
                    <div data-testid="detail">Detail for {row.name}</div>
                )}
            />,
        )
        const firstChevron = screen.getAllByRole('button', {
            name: /expand row/i,
        })[0]
        expect(firstChevron).toBeDefined()
        // Pre-click: detail content is absent
        expect(screen.queryByTestId('detail')).toBeNull()
        fireEvent.click(firstChevron)
        const detail = screen.getByTestId('detail')
        expect(detail).toBeTruthy()
        expect(firstChevron.getAttribute('aria-expanded')).toBe('true')
    })

    test('collapsing a row hides its detail content', () => {
        render(
            <DataTable
                columns={cols}
                data={data}
                getRowDetail={(row) => (
                    <div data-testid="detail">Detail for {row.name}</div>
                )}
            />,
        )
        const firstChevron = screen.getAllByRole('button', {
            name: /expand row/i,
        })[0]
        fireEvent.click(firstChevron)
        expect(screen.getByTestId('detail')).toBeTruthy()
        // Now the button label flipped to "Collapse row"
        const collapseChevron = screen.getAllByRole('button', {
            name: /collapse row/i,
        })[0]
        fireEvent.click(collapseChevron)
        expect(screen.queryByTestId('detail')).toBeNull()
    })

    test('detail row spans columns.length + 1 (chevron column included)', () => {
        const { container } = render(
            <DataTable
                columns={cols}
                data={data}
                getRowDetail={(row) => <div>Detail for {row.name}</div>}
            />,
        )
        const chevron = screen.getAllByRole('button', {
            name: /expand row/i,
        })[0]
        fireEvent.click(chevron)
        // The expanded detail row carries data-row-detail="true"
        const detailRow = container.querySelector('[data-row-detail="true"]')
        expect(detailRow).toBeTruthy()
        const detailCell = detailRow?.querySelector('td')
        expect(detailCell?.getAttribute('colspan')).toBe(
            String(cols.length + 1),
        )
    })
})

describe('DataTable CSV export button', () => {
    test('does not render export button when exportable=false', () => {
        render(<DataTable columns={cols} data={data} />)
        expect(screen.queryByRole('button', { name: /export csv/i })).toBeNull()
    })

    test('renders export button when exportable + exportResource are provided', () => {
        render(
            <DataTable
                columns={cols}
                data={data}
                exportable
                exportResource="people"
            />,
        )
        const btn = screen.getByRole('button', { name: /export csv/i })
        expect(btn).toBeTruthy()
        expect(btn.hasAttribute('disabled')).toBe(false)
    })

    test('export button is disabled when filtered row count is zero', () => {
        render(
            <DataTable
                columns={cols}
                data={[]}
                exportable
                exportResource="people"
            />,
        )
        const btn = screen.getByRole('button', { name: /export csv/i })
        expect(btn.hasAttribute('disabled')).toBe(true)
    })
})

describe('DataTable existing-caller stability', () => {
    test('still renders all rows when none of the new props are passed', () => {
        const { container } = render(<DataTable columns={cols} data={data} />)
        // Header + 3 body rows, no chevron column
        const rows = container.querySelectorAll('tbody tr')
        expect(rows.length).toBe(3)
    })

    test('does not add chevron column when getRowDetail is undefined', () => {
        const { container } = render(<DataTable columns={cols} data={data} />)
        const headerCells = within(
            container.querySelector('thead') as HTMLElement,
        ).queryAllByRole('columnheader')
        // 2 columns (Name + Age) — no extra chevron header
        expect(headerCells.length).toBe(cols.length)
    })
})
