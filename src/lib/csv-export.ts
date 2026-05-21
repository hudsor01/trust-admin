/**
 * CSV export helper for TanStack Table.
 *
 * Respects the current filter state (`getFilteredRowModel`) and the visible
 * leaf columns (`getVisibleLeafColumns`) so the user can never export data
 * that the table is not currently rendering — this is the T-23-04
 * information-disclosure mitigation. The export column set is
 * `getVisibleLeafColumns()` minus the `select` utility column: the
 * selection-checkbox column (`id: 'select'`) is UI-only and carries no data,
 * and `enableHiding: false` does NOT make it invisible, so it is dropped
 * explicitly here (T-27-04).
 *
 * Output is RFC-4180-compliant: any cell containing comma, double-quote, or
 * newline is wrapped in double-quotes with internal quotes escaped via doubling.
 *
 * Cells whose first character could be read as a spreadsheet formula
 * (`= + - @`, tab, CR) are prefixed with a single quote so Excel/Sheets
 * treats them as literal text — CSV formula-injection guard.
 */
import type { Table } from '@tanstack/react-table'
import { formatCurrency, formatDate, formatPercent } from '@/utils/formatters'

export interface ExportTableToCsvOptions {
    filename: string
    /**
     * Optional per-column formatter override. Keyed by column id.
     * Falls back to value-based default — strings are passed through,
     * booleans are rendered as Yes/No, anything else is coerced via String().
     */
    formatters?: Record<string, (value: unknown, row: unknown) => string>
}

export function escapeCsvCell(value: unknown): string {
    if (value === null || value === undefined) return ''
    let s =
        typeof value === 'string'
            ? value
            : typeof value === 'boolean'
              ? value
                  ? 'Yes'
                  : 'No'
              : String(value)
    // Neutralize spreadsheet formula execution before RFC-4180 quoting.
    if (/^[=+\-@\t\r]/.test(s)) {
        s = `'${s}`
    }
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`
    }
    return s
}

export function buildCsvBody<TData>(
    table: Table<TData>,
    options?: Pick<ExportTableToCsvOptions, 'formatters'>,
): { body: string; rowCount: number } {
    const visibleColumns = table
        .getVisibleLeafColumns()
        .filter((c) => c.id !== 'select')
    const rows = table.getFilteredRowModel().rows

    const headers = visibleColumns.map((c) => {
        const header = c.columnDef.header
        if (typeof header === 'string') return header
        return c.id
    })

    const lines: string[] = [headers.map(escapeCsvCell).join(',')]
    for (const row of rows) {
        const cells = visibleColumns.map((col) => {
            const value = row.getValue(col.id)
            const customFormatter = options?.formatters?.[col.id]
            if (customFormatter) {
                return escapeCsvCell(customFormatter(value, row.original))
            }
            return escapeCsvCell(value)
        })
        lines.push(cells.join(','))
    }

    return { body: lines.join('\n'), rowCount: rows.length }
}

export function exportTableToCsv<TData>(
    table: Table<TData>,
    options: ExportTableToCsvOptions,
): { rowCount: number; filename: string; body: string } {
    const filename = options.filename
    const { body, rowCount } = buildCsvBody(table, options)

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const blob = new Blob([body], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    return { rowCount, filename, body }
}

/** Convenience: build default filename matching the project convention. */
export function makeCsvFilename(
    resource: string,
    date: Date = new Date(),
): string {
    const iso = date.toISOString().slice(0, 10)
    return `${resource}-${iso}.csv`
}

export { formatCurrency, formatDate, formatPercent }
