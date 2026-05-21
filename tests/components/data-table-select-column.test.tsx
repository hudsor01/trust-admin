/**
 * Tests for the shared `selectColumn()` helper introduced by plan 27-01.
 *
 * `selectColumn()` is the missing UI primitive for the phase-23 `bulkActions`
 * rollout: the DataTable already wires `enableRowSelection` *state*, but no
 * checkbox column exists for the user to drive that state. These tests prove
 * the helper renders a header + per-row checkbox, toggles TanStack
 * `rowSelection`, and lights up the existing sticky bulk-action toolbar.
 *
 * Follows the data-table-extensions.test.tsx conventions: bun:test,
 * @testing-library/react, the Person/cols/data fixtures, afterEach(cleanup).
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
import { selectColumn } from '../../src/components/ui/data-table-select-column'

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

describe('selectColumn() column definition', () => {
    test('returns a ColumnDef with id "select", no sorting/hiding/resizing, fixed size 40', () => {
        const col = selectColumn<Person>()
        expect(col.id).toBe('select')
        expect(col.enableSorting).toBe(false)
        expect(col.enableHiding).toBe(false)
        expect(col.enableResizing).toBe(false)
        expect(col.size).toBe(40)
    })
})

describe('selectColumn() rendered in a DataTable', () => {
    test('renders one header checkbox + one checkbox per body row', () => {
        const { container } = render(
            <DataTable
                columns={[selectColumn<Person>(), ...cols]}
                data={data}
                enableRowSelection
            />,
        )
        const headerCheckbox = within(
            container.querySelector('thead') as HTMLElement,
        ).getByRole('checkbox', { name: /select all rows/i })
        expect(headerCheckbox).toBeTruthy()

        const rowCheckboxes = within(
            container.querySelector('tbody') as HTMLElement,
        ).getAllByRole('checkbox', { name: /select row/i })
        expect(rowCheckboxes.length).toBe(data.length)
    })

    test('clicking a row checkbox toggles that row to data-state="selected"', () => {
        const { container } = render(
            <DataTable
                columns={[selectColumn<Person>(), ...cols]}
                data={data}
                enableRowSelection
            />,
        )
        const tbody = container.querySelector('tbody') as HTMLElement
        const rowCheckboxes = within(tbody).getAllByRole('checkbox', {
            name: /select row/i,
        })
        const firstRow = tbody.querySelector('tr') as HTMLElement
        expect(firstRow.getAttribute('data-state')).not.toBe('selected')

        fireEvent.click(rowCheckboxes[0])

        const firstRowAfter = (
            container.querySelector('tbody') as HTMLElement
        ).querySelector('tr') as HTMLElement
        expect(firstRowAfter.getAttribute('data-state')).toBe('selected')
    })

    test('clicking the header checkbox selects all page rows', () => {
        const { container } = render(
            <DataTable
                columns={[selectColumn<Person>(), ...cols]}
                data={data}
                enableRowSelection
            />,
        )
        const headerCheckbox = within(
            container.querySelector('thead') as HTMLElement,
        ).getByRole('checkbox', { name: /select all rows/i })

        fireEvent.click(headerCheckbox)

        const bodyRows = (
            container.querySelector('tbody') as HTMLElement
        ).querySelectorAll('tr')
        for (const row of bodyRows) {
            expect(row.getAttribute('data-state')).toBe('selected')
        }
    })

    test('select column + bulkActions: selecting a row reveals the bulk-action toolbar; clearing hides it', () => {
        const { container } = render(
            <DataTable
                columns={[selectColumn<Person>(), ...cols]}
                data={data}
                enableRowSelection
                bulkActions={[
                    {
                        label: 'Delete',
                        variant: 'destructive',
                        onClick: () => {},
                    },
                ]}
            />,
        )
        // Nothing selected → no toolbar
        expect(
            screen.queryByRole('toolbar', { name: /bulk actions/i }),
        ).toBeNull()

        const rowCheckbox = within(
            container.querySelector('tbody') as HTMLElement,
        ).getAllByRole('checkbox', { name: /select row/i })[0]
        fireEvent.click(rowCheckbox)

        // One row selected → toolbar appears
        expect(
            screen.getByRole('toolbar', { name: /bulk actions/i }),
        ).toBeTruthy()

        // Clearing selection hides it again
        const clearBtn = screen.getByRole('button', {
            name: /clear selection/i,
        })
        fireEvent.click(clearBtn)
        expect(
            screen.queryByRole('toolbar', { name: /bulk actions/i }),
        ).toBeNull()
    })
})
