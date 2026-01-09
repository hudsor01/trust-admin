import { useState } from "react"
import { Pencil, Trash2, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react"
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

export interface ColumnDef<T> {
  key: string
  header: string
  render?: (item: T) => React.ReactNode
  sortable?: boolean
}

export interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
  emptyMessage?: string
  isLoading?: boolean
}

/**
 * Generic data table component with sorting and actions
 *
 * @param data - Array of items to display
 * @param columns - Column definitions with optional render functions
 * @param onEdit - Optional edit handler (adds Edit button)
 * @param onDelete - Optional delete handler (adds Delete button)
 * @param emptyMessage - Message shown when no data (default: "No data available")
 * @param isLoading - Show skeleton loading state
 *
 * @example
 * ```typescript
 * import { DataTable, type ColumnDef } from "@/components/data-table"
 * import { EditableCurrencyCell } from "@/components/editable-cells"
 * import { Badge } from "@/components/ui/badge"
 *
 * interface Liability {
 *   id: string
 *   creditor: string
 *   currentBalance: string
 *   status: string
 * }
 *
 * const columns: ColumnDef<Liability>[] = [
 *   { key: "creditor", header: "Creditor", sortable: true },
 *   {
 *     key: "currentBalance",
 *     header: "Balance",
 *     sortable: true,
 *     render: (item) => (
 *       <EditableCurrencyCell
 *         value={item.currentBalance}
 *         onSave={async (val) => await updateLiability(item.id, { currentBalance: val })}
 *       />
 *     ),
 *   },
 *   {
 *     key: "status",
 *     header: "Status",
 *     render: (item) => <Badge>{item.status}</Badge>,
 *   },
 * ]
 *
 * <DataTable
 *   data={liabilities}
 *   columns={columns}
 *   onEdit={handleEdit}
 *   onDelete={handleDelete}
 * />
 * ```
 */
export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  onEdit,
  onDelete,
  emptyMessage = "No data available",
  isLoading = false,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else {
        // Reset to no sort
        setSortKey(null)
        setSortDirection("asc")
      }
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  const sortedData = sortKey
    ? [...data].sort((a, b) => {
        const aVal = a[sortKey]
        const bVal = b[sortKey]

        // Handle null/undefined
        if (aVal == null && bVal == null) return 0
        if (aVal == null) return 1
        if (bVal == null) return -1

        // Type-aware comparison
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDirection === "asc" ? aVal - bVal : bVal - aVal
        }

        // String comparison (works for dates in ISO format too)
        const aStr = String(aVal).toLowerCase()
        const bStr = String(bVal).toLowerCase()
        const comparison = aStr.localeCompare(bStr)

        return sortDirection === "asc" ? comparison : -comparison
      })
    : data

  const hasActions = onEdit || onDelete

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key}>{col.header}</TableHead>
              ))}
              {hasActions && <TableHead className="w-[100px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(3)].map((_, i) => (
              <TableRow key={i}>
                {columns.map((col) => (
                  <TableCell key={col.key}>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                ))}
                {hasActions && (
                  <TableCell>
                    <Skeleton className="h-8 w-16" />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
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

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key}>
                {col.sortable ? (
                  <button
                    onClick={() => handleSort(col.key)}
                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                  >
                    {col.header}
                    {sortKey === col.key ? (
                      sortDirection === "asc" ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )
                    ) : (
                      <ArrowUpDown className="h-4 w-4 opacity-50" />
                    )}
                  </button>
                ) : (
                  col.header
                )}
              </TableHead>
            ))}
            {hasActions && <TableHead className="w-[100px]">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((item, index) => (
            <TableRow key={index}>
              {columns.map((col) => (
                <TableCell key={col.key}>
                  {col.render ? col.render(item) : item[col.key]}
                </TableCell>
              ))}
              {hasActions && (
                <TableCell>
                  <div className="flex gap-1">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEdit(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => onDelete(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
