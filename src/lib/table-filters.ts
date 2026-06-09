/**
 * Shared TanStack Table filter predicates for the admin DataTables.
 */

/**
 * Faceted-filter predicate: keep a row when its column value is one of the
 * selected values (or when no value is selected, i.e. the filter is inactive).
 * Used as the `filterFn` for every DataTableFacetedFilter-backed column.
 */
export const includesArrayFilter = <T>(
    row: { getValue: (id: string) => T },
    id: string,
    value: T[],
): boolean =>
    Array.isArray(value) && value.length > 0
        ? value.includes(row.getValue(id))
        : true
