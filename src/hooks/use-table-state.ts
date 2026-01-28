/**
 * Table State Hook with URL Persistence
 *
 * Persists table sorting, pagination, and filtering state to URL query params
 * using nuqs. This enables:
 * - Shareable table views (copy/paste URL with filters)
 * - Browser back/forward navigation
 * - Refresh persistence
 *
 * @see https://nuqs.dev/docs/parsers
 */
'use client'

import {
    parseAsInteger,
    parseAsString,
    parseAsStringLiteral,
    useQueryState,
    useQueryStates,
} from 'nuqs'
import { useCallback, useMemo } from 'react'

/**
 * Sort direction type
 */
export type SortDirection = 'asc' | 'desc'

/**
 * Table state configuration
 */
interface TableStateConfig {
    /** Default page size (default: 20) */
    defaultPageSize?: number
    /** Default sort column (optional) */
    defaultSortColumn?: string
    /** Default sort direction (default: 'desc') */
    defaultSortDirection?: SortDirection
    /** URL param prefix for this table (for multiple tables on same page) */
    prefix?: string
}

/**
 * Table state return value
 */
interface TableState {
    // Pagination
    page: number
    pageSize: number
    setPage: (page: number) => void
    setPageSize: (size: number) => void

    // Sorting
    sortColumn: string
    sortDirection: SortDirection
    setSort: (column: string, direction?: SortDirection) => void
    toggleSort: (column: string) => void

    // Search/Filter
    search: string
    setSearch: (search: string) => void

    // Utilities
    reset: () => void
    offset: number
}

/**
 * Hook for managing table state with URL persistence
 *
 * @example
 * ```tsx
 * const {
 *   page, setPage,
 *   sortColumn, sortDirection, setSort,
 *   search, setSearch,
 *   offset
 * } = useTableState({ defaultSortColumn: 'createdAt' })
 *
 * const { data } = trpc.beneficiary.list.useQuery({
 *   offset,
 *   limit: pageSize,
 *   orderBy: sortColumn,
 *   orderDir: sortDirection,
 *   search,
 * })
 * ```
 */
export function useTableState(config: TableStateConfig = {}): TableState {
    const {
        defaultPageSize = 20,
        defaultSortColumn = '',
        defaultSortDirection = 'desc',
        prefix = '',
    } = config

    // Create prefixed param names
    const paramName = (name: string) => (prefix ? `${prefix}_${name}` : name)

    // Pagination state
    const [page, setPage] = useQueryState(
        paramName('page'),
        parseAsInteger.withDefault(1),
    )

    const [pageSize, setPageSize] = useQueryState(
        paramName('size'),
        parseAsInteger.withDefault(defaultPageSize),
    )

    // Sorting state
    const [sortColumn, setSortColumn] = useQueryState(
        paramName('sort'),
        parseAsString.withDefault(defaultSortColumn),
    )

    const [sortDirection, setSortDirection] = useQueryState(
        paramName('dir'),
        parseAsStringLiteral(['asc', 'desc'] as const).withDefault(
            defaultSortDirection,
        ),
    )

    // Search/filter state
    const [search, setSearch] = useQueryState(
        paramName('q'),
        parseAsString.withDefault(''),
    )

    // Calculate offset for pagination
    const offset = useMemo(() => (page - 1) * pageSize, [page, pageSize])

    // Set sort with optional direction
    const setSort = useCallback(
        (column: string, direction?: SortDirection) => {
            setSortColumn(column)
            if (direction) {
                setSortDirection(direction)
            }
            // Reset to first page when sort changes
            setPage(1)
        },
        [setSortColumn, setSortDirection, setPage],
    )

    // Toggle sort direction, or set new column with default direction
    const toggleSort = useCallback(
        (column: string) => {
            if (column === sortColumn) {
                // Toggle direction
                setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
            } else {
                // New column, use default direction
                setSortColumn(column)
                setSortDirection(defaultSortDirection)
            }
            setPage(1)
        },
        [
            sortColumn,
            sortDirection,
            setSortColumn,
            setSortDirection,
            setPage,
            defaultSortDirection,
        ],
    )

    // Reset all state to defaults
    const reset = useCallback(() => {
        setPage(1)
        setPageSize(defaultPageSize)
        setSortColumn(defaultSortColumn)
        setSortDirection(defaultSortDirection)
        setSearch('')
    }, [
        setPage,
        setPageSize,
        setSortColumn,
        setSortDirection,
        setSearch,
        defaultPageSize,
        defaultSortColumn,
        defaultSortDirection,
    ])

    // Custom setSearch that resets to page 1
    const handleSetSearch = useCallback(
        (value: string) => {
            setSearch(value)
            setPage(1)
        },
        [setSearch, setPage],
    )

    return {
        page,
        pageSize,
        setPage,
        setPageSize,
        sortColumn,
        sortDirection,
        setSort,
        toggleSort,
        search,
        setSearch: handleSetSearch,
        reset,
        offset,
    }
}

/**
 * Simplified hook for just pagination with URL persistence
 *
 * @example
 * ```tsx
 * const { page, setPage, pageSize, offset } = usePaginationState()
 * ```
 */
export function usePaginationState(defaultPageSize = 20) {
    const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1))
    const [pageSize, setPageSize] = useQueryState(
        'size',
        parseAsInteger.withDefault(defaultPageSize),
    )

    const offset = useMemo(() => (page - 1) * pageSize, [page, pageSize])

    return {
        page,
        setPage,
        pageSize,
        setPageSize,
        offset,
    }
}

/**
 * Simplified hook for just sorting with URL persistence
 *
 * @example
 * ```tsx
 * const { sortColumn, sortDirection, setSort, toggleSort } = useSortState('createdAt')
 * ```
 */
export function useSortState(
    defaultColumn = '',
    defaultDirection: SortDirection = 'desc',
) {
    const [sortColumn, setSortColumn] = useQueryState(
        'sort',
        parseAsString.withDefault(defaultColumn),
    )

    const [sortDirection, setSortDirection] = useQueryState(
        'dir',
        parseAsStringLiteral(['asc', 'desc'] as const).withDefault(
            defaultDirection,
        ),
    )

    const setSort = useCallback(
        (column: string, direction?: SortDirection) => {
            setSortColumn(column)
            if (direction) {
                setSortDirection(direction)
            }
        },
        [setSortColumn, setSortDirection],
    )

    const toggleSort = useCallback(
        (column: string) => {
            if (column === sortColumn) {
                setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
            } else {
                setSortColumn(column)
                setSortDirection(defaultDirection)
            }
        },
        [
            sortColumn,
            sortDirection,
            setSortColumn,
            setSortDirection,
            defaultDirection,
        ],
    )

    return {
        sortColumn,
        sortDirection,
        setSort,
        toggleSort,
    }
}

/**
 * Simplified hook for just search with URL persistence
 *
 * @example
 * ```tsx
 * const [search, setSearch] = useSearchState()
 * ```
 */
export function useSearchState(paramName = 'q') {
    return useQueryState(paramName, parseAsString.withDefault(''))
}

/**
 * Hook for multiple filter states with URL persistence
 *
 * @example
 * ```tsx
 * const [filters, setFilters] = useFilterStates({
 *   status: parseAsString.withDefault(''),
 *   type: parseAsString.withDefault(''),
 * })
 *
 * setFilters({ status: 'ACTIVE' })
 * ```
 */
export function useFilterStates<T extends Record<string, unknown>>(
    parsers: { [K in keyof T]: T[K] },
) {
    return useQueryStates(parsers as Parameters<typeof useQueryStates>[0])
}
