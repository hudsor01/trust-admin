import {
    type ColumnDef,
    type ColumnSizingInfoState,
    type ColumnSizingState,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    type SortingState,
    useReactTable,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ResizeHandle } from '@/components/ui/data-table-resize-handle'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    COLUMN_WIDTH_MAX,
    COLUMN_WIDTH_MIN,
    clampColumnSizing,
    loadColumnSizing,
    PERSIST_DEBOUNCE_MS,
    saveColumnSizing,
} from '@/lib/data-table-persistence'

export interface VirtualizedTableProps<T> {
    data: T[]
    columns: ColumnDef<T>[]
    emptyMessage?: string
    isLoading?: boolean
    rowHeight?: number
    maxHeight?: number
    /** Rows rendered outside visible area to reduce flicker during fast scroll. */
    overscan?: number
    /** When set, column widths persist to localStorage under `dt:${tableId}:sizing`. */
    tableId?: string
}

/** PERF: Only renders visible rows via @tanstack/react-virtual. Same ColumnDef API as DataTable. */
export function VirtualizedTable<T>({
    data,
    columns,
    emptyMessage = 'No data available',
    isLoading = false,
    rowHeight = 53,
    maxHeight = 600,
    overscan = 5,
    tableId,
}: VirtualizedTableProps<T>) {
    const [sorting, setSorting] = useState<SortingState>([])
    const initialColumnSizing = useMemo(
        () => loadColumnSizing(tableId),
        [tableId],
    )
    const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(
        () => initialColumnSizing,
    )
    const [columnSizingInfo, setColumnSizingInfo] =
        useState<ColumnSizingInfoState>({
            columnSizingStart: [],
            deltaOffset: null,
            deltaPercentage: null,
            isResizingColumn: false,
            startOffset: null,
            startSize: null,
        })
    const parentRef = useRef<HTMLDivElement>(null)
    // Dedup ref. `useRef`'s init runs every render but the value is
    // discarded after first commit; `JSON.stringify({})` is sub-microsecond.
    const lastPersisted = useRef(JSON.stringify(initialColumnSizing))
    // Pending unflushed write, for the unmount-flush effect.
    const pendingWrite = useRef<{
        tableId: string
        sizing: ColumnSizingState
    } | null>(null)
    // Render-time derivation (React canonical pattern) — see DataTable
    // for the rationale. Flush prior tableId's pending write before
    // clearing.
    const prevTableIdRef = useRef(tableId)
    if (prevTableIdRef.current !== tableId) {
        const pending = pendingWrite.current
        if (pending && pending.tableId === prevTableIdRef.current) {
            saveColumnSizing(pending.tableId, pending.sizing)
        }
        prevTableIdRef.current = tableId
        setColumnSizing(initialColumnSizing)
        lastPersisted.current = JSON.stringify(initialColumnSizing)
        pendingWrite.current = null
    }

    // Persist with debounce + drag-gate + dedup. Cleanup only clears the
    // timer; the unmount-flush lives in the mount-only effect below.
    useEffect(() => {
        if (!tableId) return
        if (columnSizingInfo.isResizingColumn) {
            // Capture live drag sizing so unmount mid-drag isn't a
            // pre-drag snapshot. The debounced write itself still waits
            // until the drag finishes.
            pendingWrite.current = { tableId, sizing: columnSizing }
            return
        }
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

    // Mount-only unmount-flush.
    useEffect(() => {
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
        // Mirror DataTable: clamp mouse-drag widths to the persistence
        // validator's bounds.
        defaultColumn: {
            minSize: COLUMN_WIDTH_MIN,
            maxSize: COLUMN_WIDTH_MAX,
        },
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        state: { sorting, columnSizing, columnSizingInfo },
        onSortingChange: setSorting,
        // Clamp drag writes — mirrors DataTable; see its comment.
        onColumnSizingChange: (updater) =>
            setColumnSizing((old) =>
                clampColumnSizing(
                    typeof updater === 'function' ? updater(old) : updater,
                ),
            ),
        onColumnSizingInfoChange: setColumnSizingInfo,
    })

    const { rows } = table.getRowModel()

    // PERF: Stable refs prevent virtualizer from recalculating on every render
    const getScrollElement = useCallback(() => parentRef.current, [])
    const estimateSize = useCallback(() => rowHeight, [rowHeight])

    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement,
        estimateSize,
        overscan,
    })

    if (isLoading) {
        return (
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {columns.map((col, i) => (
                                <TableHead key={col.id ?? `col-${i}`}>
                                    <Skeleton className="h-4 w-20" />
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...Array(5)].map((_, i) => (
                            <TableRow key={i}>
                                {columns.map((col, j) => (
                                    <TableCell key={col.id ?? `cell-${i}-${j}`}>
                                        <Skeleton className="h-4 w-24" />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            </div>
        )
    }

    if (data.length === 0) {
        return (
            <div className="rounded-md border p-12 text-center">
                <p className="text-muted-foreground">{emptyMessage}</p>
            </div>
        )
    }

    const totalSize = table.getTotalSize()

    // Single horizontal scroll container wraps both header and virtualized
    // body so their columns always align under horizontal scroll. The inner
    // `<div style={{ minWidth }}>` is what actually grows wider than the
    // viewport; both tables hang off it and so share the same parent width.
    const hasResizedColumns = Object.keys(columnSizing).length > 0

    return (
        <div className="space-y-4">
            {hasResizedColumns && (
                <div className="flex justify-end">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => table.resetColumnSizing()}
                    >
                        Reset column widths
                    </Button>
                </div>
            )}
            <div className="rounded-md border overflow-x-auto">
                <div style={{ minWidth: totalSize }}>
                    <Table
                        style={{
                            tableLayout: 'fixed',
                            width: '100%',
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
                                                    canResize
                                                        ? 'pr-3'
                                                        : undefined
                                                }
                                            >
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                          header.column
                                                              .columnDef.header,
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
                    </Table>
                    <div
                        ref={parentRef}
                        className="overflow-y-auto"
                        style={{ maxHeight }}
                    >
                        <div
                            style={{
                                height: `${virtualizer.getTotalSize()}px`,
                                width: '100%',
                                position: 'relative',
                            }}
                        >
                            {virtualizer.getVirtualItems().map((virtualRow) => {
                                const row = rows[virtualRow.index]
                                if (!row) return null
                                return (
                                    <div
                                        key={row.id}
                                        data-index={virtualRow.index}
                                        ref={virtualizer.measureElement}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            transform: `translateY(${virtualRow.start}px)`,
                                        }}
                                    >
                                        <Table
                                            style={{
                                                tableLayout: 'fixed',
                                                width: '100%',
                                            }}
                                        >
                                            <TableBody>
                                                <TableRow>
                                                    {row
                                                        .getVisibleCells()
                                                        .map((cell) => (
                                                            <TableCell
                                                                key={cell.id}
                                                                style={{
                                                                    width: cell.column.getSize(),
                                                                }}
                                                                className="overflow-hidden"
                                                            >
                                                                {flexRender(
                                                                    cell.column
                                                                        .columnDef
                                                                        .cell,
                                                                    cell.getContext(),
                                                                )}
                                                            </TableCell>
                                                        ))}
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
