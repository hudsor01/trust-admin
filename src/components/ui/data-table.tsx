'use client'

import {
    type ColumnDef,
    type ColumnFiltersState,
    type ColumnSizingState,
    flexRender,
    getCoreRowModel,
    getFacetedRowModel,
    getFacetedUniqueValues,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    type Row,
    type SortingState,
    type Table as TanStackTable,
    useReactTable,
    type VisibilityState,
} from '@tanstack/react-table'
import * as React from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { DataTablePagination } from './data-table-pagination'
import { DataTableViewOptions } from './data-table-view-options'
import { Input } from './input'
import { Skeleton } from './skeleton'

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    searchKey?: string
    searchPlaceholder?: string
    isLoading?: boolean
    emptyMessage?: string
    enableRowSelection?: boolean
    enableColumnVisibility?: boolean
    enablePagination?: boolean
    /** Columns hidden by default (user can toggle via column visibility menu) */
    initialColumnVisibility?: VisibilityState
    /** When set, column widths persist to localStorage under `dt:${tableId}:sizing`. */
    tableId?: string
    /** Rendered before the column visibility toggle. Pass a callback to
     *  receive the table instance for faceted filters / column refs. */
    toolbar?:
        | React.ReactNode
        | ((table: TanStackTable<TData>) => React.ReactNode)
    /** Click handler for table body rows. Wires up cursor: pointer when set. */
    onRowClick?: (row: TData, ctx: Row<TData>) => void
}

function loadColumnSizing(tableId: string | undefined): ColumnSizingState {
    if (!tableId || typeof window === 'undefined') return {}
    try {
        const raw = window.localStorage.getItem(`dt:${tableId}:sizing`)
        return raw ? (JSON.parse(raw) as ColumnSizingState) : {}
    } catch {
        return {}
    }
}

export function DataTable<TData, TValue>({
    columns,
    data,
    searchKey,
    searchPlaceholder = 'Search...',
    isLoading = false,
    emptyMessage = 'No results.',
    enableRowSelection = false,
    enableColumnVisibility = true,
    enablePagination = true,
    initialColumnVisibility,
    tableId,
    toolbar,
    onRowClick,
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] =
        React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] =
        React.useState<VisibilityState>(initialColumnVisibility ?? {})
    const [rowSelection, setRowSelection] = React.useState({})
    const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>(
        () => loadColumnSizing(tableId),
    )

    // Persist column widths per table. Skipped on SSR + when tableId is unset.
    React.useEffect(() => {
        if (!tableId || typeof window === 'undefined') return
        try {
            window.localStorage.setItem(
                `dt:${tableId}:sizing`,
                JSON.stringify(columnSizing),
            )
        } catch {
            // ignore quota / privacy-mode failures
        }
    }, [tableId, columnSizing])

    const table = useReactTable({
        data,
        columns,
        columnResizeMode: 'onChange',
        enableColumnResizing: true,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnSizingChange: setColumnSizing,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: enablePagination
            ? getPaginationRowModel()
            : undefined,
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        // Required by DataTableFacetedFilter; no-op when no facets are read.
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: enableRowSelection ? setRowSelection : undefined,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            columnSizing,
            rowSelection,
        },
    })

    // PERF: Memoize search handler to prevent Input re-renders
    const handleSearchChange = React.useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            if (searchKey) {
                table.getColumn(searchKey)?.setFilterValue(event.target.value)
            }
        },
        [searchKey, table],
    )

    if (isLoading) {
        return (
            <div className="w-full">
                <div className="flex items-center py-4">
                    <Skeleton className="h-10 w-[250px]" />
                    <Skeleton className="ml-auto h-10 w-[100px]" />
                </div>
                <div className="overflow-hidden rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {columns.slice(0, 5).map((_, i) => (
                                    <TableHead key={i}>
                                        <Skeleton className="h-4 w-20" />
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    {columns.slice(0, 5).map((_, j) => (
                                        <TableCell key={j}>
                                            <Skeleton className="h-4 w-24" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full">
            <div className="flex items-center py-4 gap-2">
                {searchKey && (
                    <Input
                        placeholder={searchPlaceholder}
                        value={
                            (table
                                .getColumn(searchKey)
                                ?.getFilterValue() as string) ?? ''
                        }
                        onChange={handleSearchChange}
                        className="max-w-sm"
                    />
                )}
                {typeof toolbar === 'function' ? toolbar(table) : toolbar}
                {enableColumnVisibility && (
                    <DataTableViewOptions table={table} />
                )}
            </div>

            <div className="overflow-hidden rounded-md border">
                <Table style={{ tableLayout: 'fixed', width: '100%' }}>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        colSpan={header.colSpan}
                                        style={{
                                            width: header.getSize(),
                                            position: 'relative',
                                        }}
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                  header.column.columnDef
                                                      .header,
                                                  header.getContext(),
                                              )}
                                        {header.column.getCanResize() && (
                                            <div
                                                onMouseDown={header.getResizeHandler()}
                                                onTouchStart={header.getResizeHandler()}
                                                onDoubleClick={() =>
                                                    header.column.resetSize()
                                                }
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                                aria-hidden="true"
                                                title="Drag to resize · Double-click to reset"
                                                className={
                                                    'absolute top-0 right-0 h-full w-1.5 cursor-col-resize touch-none select-none bg-transparent hover:bg-border ' +
                                                    (header.column.getIsResizing()
                                                        ? 'bg-primary'
                                                        : '')
                                                }
                                            />
                                        )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={
                                        row.getIsSelected() && 'selected'
                                    }
                                    role={onRowClick ? 'button' : undefined}
                                    tabIndex={onRowClick ? 0 : undefined}
                                    className={
                                        onRowClick
                                            ? 'cursor-pointer focus:outline-none focus-visible:bg-muted/50'
                                            : undefined
                                    }
                                    onClick={
                                        onRowClick
                                            ? (e) => {
                                                  // Don't navigate when the
                                                  // click landed on a child
                                                  // interactive element (a
                                                  // button, link, input, …).
                                                  // The row itself carries
                                                  // role="button" for a11y,
                                                  // so exclude that match
                                                  // via currentTarget.
                                                  const target =
                                                      e.target as HTMLElement
                                                  const interactive =
                                                      target.closest(
                                                          'button, a, input, select, textarea, [role="button"], [role="checkbox"], [role="menuitem"]',
                                                      )
                                                  if (
                                                      interactive &&
                                                      interactive !==
                                                          e.currentTarget
                                                  ) {
                                                      return
                                                  }
                                                  onRowClick(row.original, row)
                                              }
                                            : undefined
                                    }
                                    onKeyDown={
                                        onRowClick
                                            ? (e) => {
                                                  if (
                                                      e.key === 'Enter' ||
                                                      e.key === ' '
                                                  ) {
                                                      e.preventDefault()
                                                      onRowClick(
                                                          row.original,
                                                          row,
                                                      )
                                                  }
                                              }
                                            : undefined
                                    }
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell
                                            key={cell.id}
                                            style={{
                                                width: cell.column.getSize(),
                                            }}
                                            className="overflow-hidden"
                                        >
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext(),
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    {emptyMessage}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {enablePagination && (
                <div className="py-4">
                    <DataTablePagination
                        table={table}
                        showSelectedCount={enableRowSelection}
                    />
                </div>
            )}
        </div>
    )
}

export type { ColumnDef } from '@tanstack/react-table'
