/** @see https://nuqs.dev/docs/parsers */
'use client'

import {
    parseAsInteger,
    parseAsString,
    parseAsStringLiteral,
    useQueryState,
    useQueryStates,
} from 'nuqs'
import { useCallback, useMemo } from 'react'

export type SortDirection = 'asc' | 'desc'

interface TableStateConfig {
    defaultPageSize?: number
    defaultSortColumn?: string
    defaultSortDirection?: SortDirection
    /** Disambiguates URL params when multiple tables share a page */
    prefix?: string
}

interface TableState {
    page: number
    pageSize: number
    setPage: (page: number) => void
    setPageSize: (size: number) => void
    sortColumn: string
    sortDirection: SortDirection
    setSort: (column: string, direction?: SortDirection) => void
    toggleSort: (column: string) => void
    search: string
    setSearch: (search: string) => void
    reset: () => void
    offset: number
}

/** Table sorting, pagination, and search state persisted to URL query params via nuqs. */
export function useTableState(config: TableStateConfig = {}): TableState {
    const {
        defaultPageSize = 20,
        defaultSortColumn = '',
        defaultSortDirection = 'desc',
        prefix = '',
    } = config

    const paramName = (name: string) => (prefix ? `${prefix}_${name}` : name)

    const [page, setPage] = useQueryState(
        paramName('page'),
        parseAsInteger.withDefault(1),
    )

    const [pageSize, setPageSize] = useQueryState(
        paramName('size'),
        parseAsInteger.withDefault(defaultPageSize),
    )

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

    const [search, setSearch] = useQueryState(
        paramName('q'),
        parseAsString.withDefault(''),
    )

    const offset = useMemo(() => (page - 1) * pageSize, [page, pageSize])

    const setSort = useCallback(
        (column: string, direction?: SortDirection) => {
            setSortColumn(column)
            if (direction) {
                setSortDirection(direction)
            }
            setPage(1)
        },
        [setSortColumn, setSortDirection, setPage],
    )

    const toggleSort = useCallback(
        (column: string) => {
            if (column === sortColumn) {
                setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
            } else {
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

/** Pagination-only subset of useTableState. */
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

/** Sorting-only subset of useTableState. */
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

/** Search-only subset of useTableState. */
export function useSearchState(paramName = 'q') {
    return useQueryState(paramName, parseAsString.withDefault(''))
}

/** Multiple named filters persisted to URL query params. */
export function useFilterStates<T extends Record<string, unknown>>(
    parsers: { [K in keyof T]: T[K] },
) {
    return useQueryStates(parsers as Parameters<typeof useQueryStates>[0])
}
