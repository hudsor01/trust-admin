/** Reproduction test for the assets CSV-export bug: confirms that
 *  `table.getFilteredRowModel().rows` accessed from inside a DataTable's
 *  toolbar render-prop reflects the current search/filter state. If this
 *  test passes locally but production exports unfiltered rows, the bug is
 *  in deployment (stale bundle/CDN cache); if it fails, the bug is in our
 *  wiring. */

import '../setup'
import { afterEach, describe, expect, test } from 'bun:test'
import type { ColumnDef, Table as TanStackTable } from '@tanstack/react-table'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataTable } from '../../src/components/ui/data-table'

interface Item {
    id: number
    name: string
    kind: string
}

const data: Item[] = [
    { id: 1, name: 'Alpha', kind: 'vehicle' },
    { id: 2, name: 'Bravo', kind: 'homestead' },
    { id: 3, name: 'Charlie', kind: 'vehicle' },
    { id: 4, name: 'Delta', kind: 'bankAccount' },
]

const columns: ColumnDef<Item>[] = [
    { accessorKey: 'id', header: 'ID', cell: ({ row }) => row.original.id },
    {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => row.original.name,
        filterFn: 'includesString',
    },
    {
        accessorKey: 'kind',
        header: 'Kind',
        cell: ({ row }) => row.original.kind,
    },
]

// Mirrors how ExportAssetsButton reads rows from the toolbar render-prop.
function RowProbe({ table }: { table: TanStackTable<Item> }) {
    const filtered = table.getFilteredRowModel().rows
    const sorted = table.getSortedRowModel().rows
    return (
        <span data-testid="probe">
            filtered={filtered.length}|sorted={sorted.length}|first=
            {sorted[0]?.original.name ?? '—'}
        </span>
    )
}

describe('DataTable toolbar render-prop receives reactive row models', () => {
    afterEach(cleanup)

    test('initial render: probe sees all 4 rows', () => {
        render(
            <DataTable
                columns={columns}
                data={data}
                searchKey="name"
                toolbar={(table) => <RowProbe table={table} />}
            />,
        )
        expect(screen.getByTestId('probe').textContent).toBe(
            'filtered=4|sorted=4|first=Alpha',
        )
    })

    test('after search narrows to 1 row, probe reflects the filter', async () => {
        const user = userEvent.setup()
        render(
            <DataTable
                columns={columns}
                data={data}
                searchKey="name"
                searchPlaceholder="Search…"
                toolbar={(table) => <RowProbe table={table} />}
            />,
        )
        await user.type(screen.getByPlaceholderText('Search…'), 'Bravo')
        expect(screen.getByTestId('probe').textContent).toBe(
            'filtered=1|sorted=1|first=Bravo',
        )
    })

    test('after column filter narrows to a subset, probe reflects the filter', async () => {
        // Apply a column filter declaratively by mounting with a state-driven
        // table — emulated here by passing through user-typed search since
        // DataTable doesn't expose `setColumnFilters` directly to the
        // outside. We instead use the `name` search filter which routes
        // through the same `getFilteredRowModel` pipeline.
        const user = userEvent.setup()
        render(
            <DataTable
                columns={columns}
                data={data}
                searchKey="name"
                searchPlaceholder="Search…"
                toolbar={(table) => <RowProbe table={table} />}
            />,
        )
        // Substring matching two rows: "a" appears in Alpha, Bravo, Charlie,
        // Delta — all four. Narrow with "Ch" → Charlie only.
        await user.type(screen.getByPlaceholderText('Search…'), 'Ch')
        expect(screen.getByTestId('probe').textContent).toBe(
            'filtered=1|sorted=1|first=Charlie',
        )
    })
})
