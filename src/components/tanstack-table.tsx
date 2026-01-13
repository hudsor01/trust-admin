/**
 * TanStack Table component with sorting, pagination, and actions
 *
 * Replaces: src/components/data-table.tsx
 * Benefits: Built-in sorting, filtering, pagination, column resizing
 */

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type OnChangeFn,
  type PaginationState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export interface DataTableProps<TData> {
  columns: ColumnDef<TData>[]
  data: TData[]
  isLoading?: boolean
  emptyMessage?: string
  // Server-side pagination
  pageCount?: number
  pagination?: PaginationState
  onPaginationChange?: OnChangeFn<PaginationState>
  manualPagination?: boolean
  // Client-side pagination
  enablePagination?: boolean
  pageSize?: number
}

export function DataTable<TData>({
  columns,
  data,
  isLoading = false,
  emptyMessage = "No data available",
  pageCount,
  pagination: controlledPagination,
  onPaginationChange,
  manualPagination = false,
  enablePagination = false,
  pageSize = 20,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [localPagination, setLocalPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  })

  // Use controlled pagination if provided, otherwise local state
  const paginationState = controlledPagination || localPagination
  const setPaginationState = onPaginationChange || setLocalPagination

  const table = useReactTable<TData>({
    data,
    columns,
    state: {
      sorting,
      ...(enablePagination && { pagination: paginationState }),
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(enablePagination && {
      pageCount,
      onPaginationChange: setPaginationState,
      getPaginationRowModel: getPaginationRowModel(),
      manualPagination,
      manualSorting: manualPagination,
    }),
  })

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col, i) => (
                  <TableHead key={i}>{typeof col.header === "string" ? col.header : ""}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
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

  // Empty state
  if (data.length === 0) {
    return (
      <div className="rounded-md border p-12 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : (
                      <div
                        className={
                          header.column.getCanSort()
                            ? "flex items-center gap-2 cursor-pointer select-none hover:text-foreground transition-colors"
                            : ""
                        }
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <>
                            {header.column.getIsSorted() === "asc" && (
                              <ChevronUp className="h-4 w-4" />
                            )}
                            {header.column.getIsSorted() === "desc" && (
                              <ChevronDown className="h-4 w-4" />
                            )}
                            {!header.column.getIsSorted() && (
                              <ArrowUpDown className="h-4 w-4 opacity-50" />
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {enablePagination && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            {manualPagination && pageCount ? (
              <>
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {pageCount === -1 ? "..." : pageCount}
              </>
            ) : (
              <>
                Showing{" "}
                {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}{" "}
                to{" "}
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) *
                    table.getState().pagination.pageSize,
                  table.getFilteredRowModel().rows.length,
                )}{" "}
                of {table.getFilteredRowModel().rows.length} results
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <div className="text-sm">
              Page {table.getState().pagination.pageIndex + 1}
              {!manualPagination && ` of ${table.getPageCount()}`}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
