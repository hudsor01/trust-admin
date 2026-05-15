'use client'

import type { Header, Table as TanStackTable } from '@tanstack/react-table'
import { cn } from '@/lib/utils'

export const RESIZE_MIN = 20
export const RESIZE_MAX = 2000

/**
 * Keyboard- and pointer-driven column resize affordance.
 *
 * - Drag the right edge to resize live (wired via `header.getResizeHandler`).
 * - Double-click resets to default.
 * - Keyboard: ArrowLeft/Right (±4px, ±16px with Shift), Home (reset).
 *   Escape is intentionally NOT bound — it would bubble to surrounding
 *   Radix Dialog / DropdownMenu and dismiss them.
 *
 * Keyboard handlers use functional state updates that read from `old[id]`
 * rather than a closure-captured size, so key-repeat doesn't stall on
 * stale snapshots.
 */
export function ResizeHandle<TData>({
    header,
    table,
}: {
    header: Header<TData, unknown>
    table: TanStackTable<TData>
}) {
    const id = header.column.id
    const initialSize = header.column.columnDef.size ?? 150
    const currentSize = header.getSize()

    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const step = e.shiftKey ? 16 : 4
        if (e.key === 'ArrowLeft') {
            e.preventDefault()
            table.setColumnSizing((old) => ({
                ...old,
                [id]: Math.max(RESIZE_MIN, (old[id] ?? initialSize) - step),
            }))
        } else if (e.key === 'ArrowRight') {
            e.preventDefault()
            table.setColumnSizing((old) => ({
                ...old,
                [id]: Math.min(RESIZE_MAX, (old[id] ?? initialSize) + step),
            }))
        } else if (e.key === 'Home') {
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
            aria-label={`Resize ${id} column`}
            tabIndex={0}
            onMouseDown={header.getResizeHandler()}
            onTouchStart={header.getResizeHandler()}
            onDoubleClick={() => header.column.resetSize()}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={onKeyDown}
            title="Drag, double-click, or arrow keys to resize — Home to reset"
            className={cn(
                "absolute top-0 right-0 h-full w-px cursor-col-resize touch-none select-none bg-border/60 transition-colors before:absolute before:inset-y-0 before:-left-1.5 before:-right-1.5 before:content-[''] hover:bg-primary/60 focus-visible:bg-primary focus-visible:outline-none",
                header.column.getIsResizing() && 'bg-primary w-0.5',
            )}
        />
    )
}
