/**
 * Date Utility Functions
 *
 * Consistent, locale-aware date formatting using date-fns.
 * Replaces manual date string manipulation throughout the codebase.
 */
import {
    format,
    formatDistanceToNow,
    formatDistanceToNowStrict,
    isValid,
    parseISO,
} from 'date-fns'

/**
 * Parse a date value into a Date object
 *
 * Handles string (ISO format), Date objects, and null/undefined.
 * Returns null if the date is invalid.
 */
export function parseDate(
    value: string | Date | null | undefined,
): Date | null {
    if (!value) return null

    const date = typeof value === 'string' ? parseISO(value) : value

    return isValid(date) ? date : null
}

/**
 * Format a date as "Jan 23, 2026"
 *
 * @example
 * formatDate('2026-01-23') // "Jan 23, 2026"
 * formatDate(new Date()) // "Jan 23, 2026"
 */
export function formatDate(value: string | Date | null | undefined): string {
    const date = parseDate(value)
    if (!date) return '—'

    return format(date, 'MMM d, yyyy')
}

/**
 * Format a date as "January 23, 2026" (full month name)
 *
 * @example
 * formatDateLong('2026-01-23') // "January 23, 2026"
 */
export function formatDateLong(
    value: string | Date | null | undefined,
): string {
    const date = parseDate(value)
    if (!date) return '—'

    return format(date, 'MMMM d, yyyy')
}

/**
 * Format a date with time as "Jan 23, 2026, 2:30 PM"
 *
 * @example
 * formatDateTime('2026-01-23T14:30:00Z') // "Jan 23, 2026, 2:30 PM"
 */
export function formatDateTime(
    value: string | Date | null | undefined,
): string {
    const date = parseDate(value)
    if (!date) return '—'

    return format(date, 'MMM d, yyyy, h:mm a')
}

/**
 * Format a date with full time as "January 23, 2026 at 2:30:45 PM"
 *
 * @example
 * formatDateTimeLong('2026-01-23T14:30:45Z') // "January 23, 2026 at 2:30:45 PM"
 */
export function formatDateTimeLong(
    value: string | Date | null | undefined,
): string {
    const date = parseDate(value)
    if (!date) return '—'

    return format(date, "MMMM d, yyyy 'at' h:mm:ss a")
}

/**
 * Format a date relative to now (e.g., "3 days ago", "in 2 hours")
 *
 * @example
 * formatRelative(threeDaysAgo) // "3 days ago"
 * formatRelative(tomorrow) // "in 1 day"
 */
export function formatRelative(
    value: string | Date | null | undefined,
): string {
    const date = parseDate(value)
    if (!date) return '—'

    return formatDistanceToNow(date, { addSuffix: true })
}

/**
 * Format a date relative to now with strict intervals (no "about" approximations)
 *
 * @example
 * formatRelativeStrict(threeDaysAgo) // "3 days ago"
 */
export function formatRelativeStrict(
    value: string | Date | null | undefined,
): string {
    const date = parseDate(value)
    if (!date) return '—'

    return formatDistanceToNowStrict(date, { addSuffix: true })
}

/**
 * Format a date for input fields (YYYY-MM-DD)
 *
 * Use when setting values on <input type="date" />
 *
 * @example
 * formatDateForInput('2026-01-23T14:30:00Z') // "2026-01-23"
 */
export function formatDateForInput(
    value: string | Date | null | undefined,
): string {
    const date = parseDate(value)
    if (!date) return ''

    return format(date, 'yyyy-MM-dd')
}

/**
 * Format a date for datetime-local input fields (YYYY-MM-DDTHH:MM)
 *
 * Use when setting values on <input type="datetime-local" />
 *
 * @example
 * formatDateTimeForInput('2026-01-23T14:30:00Z') // "2026-01-23T14:30"
 */
export function formatDateTimeForInput(
    value: string | Date | null | undefined,
): string {
    const date = parseDate(value)
    if (!date) return ''

    return format(date, "yyyy-MM-dd'T'HH:mm")
}

/**
 * Format a date as ISO string for API submission
 *
 * @example
 * formatDateForApi(new Date()) // "2026-01-23T14:30:00.000Z"
 */
export function formatDateForApi(
    value: string | Date | null | undefined,
): string | null {
    const date = parseDate(value)
    if (!date) return null

    return date.toISOString()
}

/**
 * Format a date as month and year only (e.g., "January 2026")
 *
 * @example
 * formatMonthYear('2026-01-23') // "January 2026"
 */
export function formatMonthYear(
    value: string | Date | null | undefined,
): string {
    const date = parseDate(value)
    if (!date) return '—'

    return format(date, 'MMMM yyyy')
}

/**
 * Format a date as fiscal year (e.g., "FY2026")
 *
 * @example
 * formatFiscalYear('2026-01-23') // "FY2026"
 */
export function formatFiscalYear(
    value: string | Date | null | undefined,
): string {
    const date = parseDate(value)
    if (!date) return '—'

    return `FY${format(date, 'yyyy')}`
}

/**
 * Get the fiscal year as a number from a date
 *
 * @example
 * getFiscalYear('2026-01-23') // 2026
 */
export function getFiscalYear(
    value: string | Date | null | undefined,
): number | null {
    const date = parseDate(value)
    if (!date) return null

    return date.getFullYear()
}

/**
 * Check if a date string or Date is valid
 *
 * @example
 * isValidDate('2026-01-23') // true
 * isValidDate('invalid') // false
 */
export function isValidDate(value: string | Date | null | undefined): boolean {
    return parseDate(value) !== null
}

/**
 * Format time only as "2:30 PM"
 *
 * @example
 * formatTime('2026-01-23T14:30:00Z') // "2:30 PM"
 */
export function formatTime(value: string | Date | null | undefined): string {
    const date = parseDate(value)
    if (!date) return '—'

    return format(date, 'h:mm a')
}
