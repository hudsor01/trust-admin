/**
 * Shared formatting and calculation utilities
 * Extracted from page components to ensure consistency
 */

import { formatMoney } from '@/lib/money'

/**
 * Format a date string for display
 * @param dateStr - ISO date string or null
 * @returns Formatted date like "Jan 15, 2025" or "—" if null
 */
export function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
    })
}

/**
 * Format a number or string as USD currency
 * Uses dinero.js for precision-safe money handling
 *
 * @param amount - Number or numeric string (e.g., "1500.50" or 1500.50)
 * @returns Formatted currency like "$1,234.56"
 */
export function formatCurrency(amount: string | number | null): string {
    // Convert number to string for dinero.js compatibility
    const amountStr =
        amount === null || amount === undefined ? null : String(amount)
    return formatMoney(amountStr)
}

/**
 * Calculate age from date of birth
 * @param dob - Date of birth as ISO string
 * @returns Age in years
 */
export function calculateAge(dob: string): number {
    const today = new Date()
    const birthDate = new Date(dob)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
        age--
    }
    return age
}

/**
 * Get withdrawal eligibility status based on eligible date
 * @param eligibleDate - ISO date string when withdrawal becomes eligible
 * @returns Status object with display text, color, and days until eligible
 */
export function getWithdrawalStatus(eligibleDate: string): {
    status: string
    color: string
    daysUntil: number
    isEligible: boolean
} {
    const today = new Date()
    // Date-only strings (e.g. "2026-03-15") are parsed as UTC midnight by default,
    // which shifts to the previous day in US timezones. Append T00:00:00 to force
    // local-time interpretation so eligibility comparisons are date-accurate.
    const eligible = new Date(
        eligibleDate.includes('T') ? eligibleDate : `${eligibleDate}T00:00:00`,
    )
    const diffTime = eligible.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) {
        return {
            status: 'ELIGIBLE NOW',
            color: 'green',
            daysUntil: 0,
            isEligible: true,
        }
    } else if (diffDays <= 365) {
        return {
            status: `${diffDays} days`,
            color: 'amber',
            daysUntil: diffDays,
            isEligible: false,
        }
    } else {
        const years = Math.floor(diffDays / 365)
        return {
            status: `${years}+ years`,
            color: 'slate',
            daysUntil: diffDays,
            isEligible: false,
        }
    }
}

/**
 * Format a percentage for display
 * @param value - Percentage as string or number
 * @returns Formatted percentage like "25.00%"
 */
export function formatPercent(value: string | number | null): string {
    if (value === null || value === undefined) return '0%'
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (Number.isNaN(num)) return '0%'
    return `${num.toFixed(2)}%`
}
