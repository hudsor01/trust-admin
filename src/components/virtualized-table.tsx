import {
    type ColumnDef,
    type ColumnSizingInfoState,
    type ColumnSizingState,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    type Header,
    type SortingState,
    type Table as TanStackTable,
    useReactTable,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
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
    loadColumnSizing,
    saveColumnSizing,
} from '@/lib/data-table-persistence'
import { cn } from '@/lib/utils'

const RESIZE_MIN = 20
const RESIZE_MAX = 2000

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

function ResizeHandle<T>({
    header,
    table,
}: {
    header: Header<T, unknown>
    table: TanStackTable<T>
}) {
    const currentSize = header.getSize()
    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const step = e.shiftKey ? 16 : 4
        if (e.key === 'ArrowLeft') {
            e.preventDefault()
            table.setColumnSizing((old) => ({
                ...old,
                [header.column.id]: Math.max(RESIZE_MIN, currentSize - step),
            }))
        } else if (e.key === 'ArrowRight') {
            e.preventDefault()
            table.setColumnSizing((old) => ({
                ...old,
                [header.column.id]: Math.min(RESIZE_MAX, currentSize + step),
            }))
        } else if (e.key === 'Home' || e.key === 'Escape') {
            e.preventDefault()
            header.column.resetSize()
        }
    }
    return (
        <div
            role="separator"
            aria-orientation="vertical"
            aria-valuenow={Math.round(currentSize)}
            aria-valuemin={RESIZE_MIN}
            aria-valuemax={RESIZE_MAX}
            aria-label={`Resize ${String(header.column.id)} column`}
            tabIndex={0}
            onMouseDown={header.getResizeHandler()}
            onTouchStart={header.getResizeHandler()}
            onDoubleClick={() => header.column.resetSize()}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={onKeyDown}
            title="Drag, double-click, or arrow keys to resize — Home/Esc to reset"
            className={cn(
                "absolute top-0 right-0 h-full w-px cursor-col-resize touch-none select-none bg-border/60 transition-colors before:absolute before:inset-y-0 before:-left-1.5 before:-right-1.5 before:content-[''] hover:bg-primary/60 focus-visible:bg-primary focus-visible:outline-none",
                header.column.getIsResizing() && 'bg-primary w-0.5',
            )}
        />
    )
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
    const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(() =>
        loadColumnSizing(tableId),
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
    const lastPersisted = useRef<string | null>(null)

    useEffect(() => {
        if (!tableId) return
        if (columnSizingInfo.isResizingColumn) return
        const serialized = JSON.stringify(columnSizing)
        if (lastPersisted.current === serialized) return
        lastPersisted.current = serialized
        saveColumnSizing(tableId, columnSizing)
    }, [tableId, columnSizing, columnSizingInfo.isResizingColumn])

    const table = useReactTable({
        data,
        columns,
        columnResizeMode: 'onChange',
        enableColumnResizing: true,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        state: { sorting, columnSizing, columnSizingInfo },
        onSortingChange: setSorting,
        onColumnSizingChange: setColumnSizing,
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
    return (
        <div className="space-y-4">
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
                                    {headerGroup.headers.map((header) => (
                                        <TableHead
                                            key={header.id}
                                            colSpan={header.colSpan}
                                            style={{
                                                width: header.getSize(),
                                                position: 'relative',
                                            }}
                                            className="pr-3"
                                        >
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                      header.column.columnDef
                                                          .header,
                                                      header.getContext(),
                                                  )}
                                            {header.column.getCanResize() && (
                                                <ResizeHandle
                                                    header={header}
                                                    table={table}
                                                />
                                            )}
                                        </TableHead>
                                    ))}
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
