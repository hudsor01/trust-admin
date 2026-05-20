'use client'

import type { Table } from '@tanstack/react-table'
import type { LucideIcon } from 'lucide-react'
import { ConfirmDialog, useConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'

export interface BulkAction<TData> {
    label: string
    icon?: LucideIcon
    variant?: 'default' | 'destructive' | 'outline'
    onClick: (selectedRows: TData[]) => void | Promise<void>
    /** Defaults to true when `variant === 'destructive'`. */
    requiresConfirm?: boolean
    confirmTitle?: string
    confirmDescription?: string
}

export interface DataTableBulkActionsProps<TData> {
    table: Table<TData>
    actions: BulkAction<TData>[]
    /** Plural noun for the resource — e.g. "vehicles" for "Delete 4 vehicles". */
    resourceLabel?: string
}

export function DataTableBulkActions<TData>({
    table,
    actions,
    resourceLabel = 'rows',
}: DataTableBulkActionsProps<TData>) {
    const selected = table.getSelectedRowModel().rows
    const count = selected.length
    if (count === 0) return null

    const noun = count === 1 ? resourceLabel.replace(/s$/, '') : resourceLabel

    return (
        <div
            role="toolbar"
            aria-label="Bulk actions"
            className="sticky top-0 z-10 h-12 px-4 flex items-center justify-between gap-4 bg-primary/5 border-b border-primary/20"
        >
            <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                    {count} {noun} selected
                </span>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => table.resetRowSelection()}
                    aria-label="Clear selection"
                >
                    Clear
                </Button>
            </div>
            <div className="flex items-center gap-2">
                {actions.map((action, idx) => (
                    <BulkActionButton
                        key={`${action.label}-${idx}`}
                        action={action}
                        count={count}
                        resourceLabel={noun}
                        selectedRows={selected.map((r) => r.original)}
                    />
                ))}
            </div>
        </div>
    )
}

function BulkActionButton<TData>({
    action,
    count,
    resourceLabel,
    selectedRows,
}: {
    action: BulkAction<TData>
    count: number
    resourceLabel: string
    selectedRows: TData[]
}) {
    const requiresConfirm =
        action.requiresConfirm ?? action.variant === 'destructive'

    const { dialogProps, confirm } = useConfirmDialog({
        title:
            action.confirmTitle ?? `${action.label} ${count} ${resourceLabel}?`,
        description: action.confirmDescription ?? 'This cannot be undone.',
        confirmText: action.label,
        variant: action.variant === 'destructive' ? 'destructive' : 'default',
        onConfirm: () => action.onClick(selectedRows),
    })

    const Icon = action.icon

    return (
        <>
            <Button
                variant={action.variant ?? 'outline'}
                size="sm"
                className="gap-2"
                onClick={() => {
                    if (requiresConfirm) {
                        confirm()
                    } else {
                        void action.onClick(selectedRows)
                    }
                }}
            >
                {Icon && <Icon className="h-4 w-4" />}
                {action.label}
            </Button>
            <ConfirmDialog {...dialogProps} />
        </>
    )
}
