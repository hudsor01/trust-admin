import type { ColumnSizingState } from '@tanstack/react-table'

const STORAGE_PREFIX = 'dt:'
const STORAGE_SUFFIX = ':sizing'

/**
 * Hard bounds for column width in pixels. Used in three places that
 * must stay consistent:
 *   - `useReactTable` `defaultColumn` config (clamps mouse-drag widths)
 *   - `ResizeHandle` keyboard handlers (clamps arrow-key nudges)
 *   - `loadColumnSizing` (rejects out-of-bounds persisted values)
 * Exported so the consumer modules import from a single source of truth.
 */
export const COLUMN_WIDTH_MIN = 20
export const COLUMN_WIDTH_MAX = 2000

/**
 * Debounce window (ms) between the last column-sizing change and the
 * synchronous localStorage write. Exposed so tests can compute a
 * sufficient `setTimeout` buffer (`PERSIST_DEBOUNCE_MS + headroom`).
 */
export const PERSIST_DEBOUNCE_MS = 150

export function columnSizingStorageKey(tableId: string): string {
    return `${STORAGE_PREFIX}${tableId}${STORAGE_SUFFIX}`
}

/**
 * Clamp every entry in a column-sizing state to [COLUMN_WIDTH_MIN,
 * COLUMN_WIDTH_MAX]. Used to wrap `onColumnSizingChange` so TanStack's
 * raw drag writes (which honor minSize/maxSize on reads only) never
 * pollute `columnSizing` with out-of-bounds values — otherwise a drag
 * past MAX would persist 2500+px, then load-time validation would
 * silently drop the entry on next mount.
 */
export function clampColumnSizing(
    sizing: ColumnSizingState,
): ColumnSizingState {
    const out: ColumnSizingState = {}
    for (const [k, v] of Object.entries(sizing)) {
        out[k] = Math.min(COLUMN_WIDTH_MAX, Math.max(COLUMN_WIDTH_MIN, v))
    }
    return out
}

export function loadColumnSizing(
    tableId: string | undefined,
): ColumnSizingState {
    if (!tableId || typeof window === 'undefined') return {}
    try {
        const raw = window.localStorage.getItem(columnSizingStorageKey(tableId))
        if (!raw) return {}
        const parsed: unknown = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return {}
        }
        const result: ColumnSizingState = {}
        const dropped: string[] = []
        for (const [k, v] of Object.entries(
            parsed as Record<string, unknown>,
        )) {
            if (
                typeof v === 'number' &&
                Number.isFinite(v) &&
                v >= COLUMN_WIDTH_MIN &&
                v <= COLUMN_WIDTH_MAX
            ) {
                result[k] = v
            } else {
                dropped.push(k)
            }
        }
        if (dropped.length > 0) {
            console.warn(
                `[data-table] Dropped invalid column sizing for table "${tableId}":`,
                dropped,
            )
        }
        return result
    } catch {
        return {}
    }
}

export function saveColumnSizing(
    tableId: string,
    sizing: ColumnSizingState,
): void {
    if (typeof window === 'undefined') return
    try {
        window.localStorage.setItem(
            columnSizingStorageKey(tableId),
            JSON.stringify(sizing),
        )
    } catch {
        // ignore quota / privacy-mode failures
    }
}
