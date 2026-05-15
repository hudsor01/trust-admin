import type { ColumnSizingState } from '@tanstack/react-table'

const STORAGE_PREFIX = 'dt:'
const STORAGE_SUFFIX = ':sizing'
const MIN_COLUMN_WIDTH = 20
const MAX_COLUMN_WIDTH = 2000

export function columnSizingStorageKey(tableId: string): string {
    return `${STORAGE_PREFIX}${tableId}${STORAGE_SUFFIX}`
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
                v >= MIN_COLUMN_WIDTH &&
                v <= MAX_COLUMN_WIDTH
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
