'use client'

import type { Table } from '@tanstack/react-table'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { exportTableToCsv, makeCsvFilename } from '@/lib/csv-export'

export interface DataTableExportProps<TData> {
    table: Table<TData>
    resource: string
    formatters?: Record<string, (value: unknown, row: unknown) => string>
}

export function DataTableExport<TData>({
    table,
    resource,
    formatters,
}: DataTableExportProps<TData>) {
    const rowCount = table.getFilteredRowModel().rows.length
    const disabled = rowCount === 0

    return (
        <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={disabled}
            title={
                disabled
                    ? 'Nothing to export'
                    : `Export ${rowCount} row${rowCount === 1 ? '' : 's'}`
            }
            onClick={() => {
                try {
                    const result = exportTableToCsv(table, {
                        filename: makeCsvFilename(resource),
                        formatters,
                    })
                    toast.success(
                        `Exported ${result.rowCount} ${result.rowCount === 1 ? 'row' : 'rows'} to ${result.filename}.`,
                    )
                } catch {
                    toast.error(
                        'Export failed — try a smaller selection or refresh.',
                    )
                }
            }}
        >
            <Download className="h-3 w-3" />
            Export CSV
        </Button>
    )
}
