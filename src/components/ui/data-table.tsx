'use client'

import {
    type ColumnDef,
    type ColumnFiltersState,
    type ColumnSizingInfoState,
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
import {
    loadColumnSizing,
    PERSIST_DEBOUNCE_MS,
    saveColumnSizing,
} from '@/lib/data-table-persistence'
import { DataTablePagination } from './data-table-pagination'
import { ResizeHandle } from './data-table-resize-handle'
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
    // Lazy-init both the state AND the dedup ref from the same loaded
    // value, so the first effect run early-returns and we don't dirty
    // localStorage with an `{}` write on every fresh mount.
    const initialColumnSizing = React.useMemo(
        () => loadColumnSizing(tableId),
        [tableId],
    )
    const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>(
        () => initialColumnSizing,
    )
    const [columnSizingInfo, setColumnSizingInfo] =
        React.useState<ColumnSizingInfoState>({
            columnSizingStart: [],
            deltaOffset: null,
            deltaPercentage: null,
            isResizingColumn: false,
            startOffset: null,
            startSize: null,
        })
    // Dedup ref. `useRef`'s init expression evaluates every render, but
    // its value is discarded after the first commit — running
    // `JSON.stringify({})` on a no-op render is sub-microsecond and not
    // worth a guard-and-conditional pattern.
    const lastPersisted = React.useRef(JSON.stringify(initialColumnSizing))
    // Holds the most-recent unflushed write for the unmount-flush effect.
    // Set by the debounce timer's schedule path; cleared by its commit.
    const pendingWrite = React.useRef<{
        tableId: string
        sizing: ColumnSizingState
    } | null>(null)
    // Reset sizing state when `tableId` actually transitions. Guarding on
    // the previous tableId (vs. re-running on every `initialColumnSizing`
    // identity churn) avoids the "sync prop to state" anti-pattern that
    // could stomp in-session user resizes if React ever drops the
    // `useMemo` cache for `initialColumnSizing`.
    const prevTableIdRef = React.useRef(tableId)
    React.useEffect(() => {
        if (prevTableIdRef.current === tableId) return
        prevTableIdRef.current = tableId
        setColumnSizing(initialColumnSizing)
        lastPersisted.current = JSON.stringify(initialColumnSizing)
    }, [tableId, initialColumnSizing])

    // Persist column widths per table. Three guards layered:
    // 1. Skip while a mouse/touch drag is in progress (TanStack fires one
    //    setColumnSizing per pixel under `columnResizeMode: 'onChange'`).
    // 2. Debounce so a held keyboard arrow doesn't trigger one synchronous
    //    localStorage write per repeat tick.
    // 3. Dedup against the last serialised payload so renders that don't
    //    change sizing don't write.
    // The cleanup ONLY clears the timer — it does NOT call
    // `saveColumnSizing`. Cleanups run on every dep change, so writing
    // synchronously here would defeat the debounce (every keystroke would
    // flush the previous interim value). The unmount-flush lives in the
    // mount-only effect below.
    React.useEffect(() => {
        if (!tableId) return
        if (columnSizingInfo.isResizingColumn) return
        const serialized = JSON.stringify(columnSizing)
        if (lastPersisted.current === serialized) return
        pendingWrite.current = { tableId, sizing: columnSizing }
        const t = window.setTimeout(() => {
            lastPersisted.current = serialized
            saveColumnSizing(tableId, columnSizing)
            pendingWrite.current = null
        }, PERSIST_DEBOUNCE_MS)
        return () => window.clearTimeout(t)
    }, [tableId, columnSizing, columnSizingInfo.isResizingColumn])

    // Mount-only unmount-flush. The cleanup of an effect with empty
    // deps fires exactly once, on unmount, so a pending payload that
    // hasn't yet flushed gets a synchronous final write here.
    React.useEffect(() => {
        return () => {
            const pending = pendingWrite.current
            if (pending) {
                saveColumnSizing(pending.tableId, pending.sizing)
                pendingWrite.current = null
            }
        }
    }, [])

    const table = useReactTable({
        data,
        columns,
        columnResizeMode: 'onChange',
        enableColumnResizing: true,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnSizingChange: setColumnSizing,
        onColumnSizingInfoChange: setColumnSizingInfo,
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
            columnSizingInfo,
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

    const totalSize = table.getTotalSize()

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

            {/* `width: 100%` + `minWidth: totalSize` keeps narrow tables flush
                with the container while letting wide / user-resized tables
                exceed it and engage the wrapper's horizontal scroll.
                `tableLayout: fixed` makes per-column width hints exact. */}
            <div className="rounded-md border overflow-x-auto">
                <Table
                    style={{
                        tableLayout: 'fixed',
                        width: '100%',
                        minWidth: totalSize,
                    }}
                >
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    const canResize =
                                        header.column.getCanResize()
                                    return (
                                        <TableHead
                                            key={header.id}
                                            colSpan={header.colSpan}
                                            style={{
                                                width: header.getSize(),
                                                position: 'relative',
                                            }}
                                            className={
                                                canResize ? 'pr-3' : undefined
                                            }
                                        >
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                      header.column.columnDef
                                                          .header,
                                                      header.getContext(),
                                                  )}
                                            {canResize && (
                                                <ResizeHandle
                                                    header={header}
                                                    table={table}
                                                />
                                            )}
                                        </TableHead>
                                    )
                                })}
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
