/** Locale-aware date formatting using date-fns. */
import {
    format,
    formatDistanceToNow,
    formatDistanceToNowStrict,
    isValid,
    parseISO,
} from 'date-fns'

/** Parse a string/Date into a Date, returning null for invalid values. */
export function parseDate(
    value: string | Date | null | undefined,
): Date | null {
    if (!value) return null

    const date = typeof value === 'string' ? parseISO(value) : value

    return isValid(date) ? date : null
}

/** Format as "Jan 23, 2026". */
export function formatDate(value: string | Date | null | undefined): string {
    const date = parseDate(value)
    if (!date) return '—'

    return format(date, 'MMM d, yyyy')
}

/** Format as "January 23, 2026". */
export function formatDateLong(
    value: string | Date | null | undefined,
): string {
    const date = parseDate(value)
    if (!date) return '—'

    return format(date, 'MMMM d, yyyy')
}

/** Format as "Jan 23, 2026, 2:30 PM". */
export function formatDateTime(
    value: string | Date | null | undefined,
): string {
    const date = parseDate(value)
    if (!date) return '—'

    return format(date, 'MMM d, yyyy, h:mm a')
}

/** Format as "January 23, 2026 at 2:30:45 PM". */
export function formatDateTimeLong(
    value: string | Date | null | undefined,
): string {
    const date = parseDate(value)
    if (!date) return '—'

    return format(date, "MMMM d, yyyy 'at' h:mm:ss a")
}

/** Format relative to now (e.g. "3 days ago", "in 2 hours"). */
export function formatRelative(
    value: string | Date | null | undefined,
): string {
    const date = parseDate(value)
    if (!date) return '—'

    return formatDistanceToNow(date, { addSuffix: true })
}

/** Like formatRelative but with strict intervals (no "about" approximations). */
export function formatRelativeStrict(
    value: string | Date | null | undefined,
): string {
    const date = parseDate(value)
    if (!date) return '—'

    return formatDistanceToNowStrict(date, { addSuffix: true })
}

/** Format as YYYY-MM-DD for <input type="date" />. */
export function formatDateForInput(
    value: string | Date | null | undefined,
): string {
    const date = parseDate(value)
    if (!date) return ''

    return format(date, 'yyyy-MM-dd')
}

/** Format as YYYY-MM-DDTHH:MM for <input type="datetime-local" />. */
export function formatDateTimeForInput(
    value: string | Date | null | undefined,
): string {
    const date = parseDate(value)
    if (!date) return ''

    return format(date, "yyyy-MM-dd'T'HH:mm")
}

/** Format as ISO string for API submission. */
export function formatDateForApi(
    value: string | Date | null | undefined,
): string | null {
    const date = parseDate(value)
    if (!date) return null

    return date.toISOString()
}

/** Format as "January 2026". */
export function formatMonthYear(
    value: string | Date | null | undefined,
): string {
    const date = parseDate(value)
    if (!date) return '—'

    return format(date, 'MMMM yyyy')
}

/** Format as "FY2026". */
export function formatFiscalYear(
    value: string | Date | null | undefined,
): string {
    const date = parseDate(value)
    if (!date) return '—'

    return `FY${format(date, 'yyyy')}`
}

/** Get the fiscal year as a number. */
export function getFiscalYear(
    value: string | Date | null | undefined,
): number | null {
    const date = parseDate(value)
    if (!date) return null

    return date.getFullYear()
}

/** Check if a date string or Date is valid. */
export function isValidDate(value: string | Date | null | undefined): boolean {
    return parseDate(value) !== null
}

/** Format as "2:30 PM". */
export function formatTime(value: string | Date | null | undefined): string {
    const date = parseDate(value)
    if (!date) return '—'

    return format(date, 'h:mm a')
}
