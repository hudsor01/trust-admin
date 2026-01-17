/**
 * Type-safe money utilities using native JavaScript
 *
 * Pattern:
 * - STORE: Strings in DB (e.g., "1500.00") for precision
 * - CALCULATE: Integer cents to avoid floating-point errors
 * - DISPLAY: Intl.NumberFormat for locale-aware formatting
 *
 * @example
 * formatMoney("1500.50") // "$1,500.50"
 * addMoney("100.50", "200.25") // "300.75"
 * subtractMoney("500.00", "200.25") // "299.75"
 */

// Type for money stored as strings in database
export type MoneyString = string | null | undefined

// Reusable USD formatter
const usdFormat = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
})

/**
 * Convert a string amount to integer cents
 * Handles null/undefined/empty strings safely
 */
export function toCents(amount: MoneyString): number {
    if (!amount || amount.trim() === '') return 0
    const cleaned = amount.replace(/[$,]/g, '').trim()
    const parsed = parseFloat(cleaned)
    return Number.isNaN(parsed) ? 0 : Math.round(parsed * 100)
}

/**
 * Convert integer cents to string for database storage
 */
export function fromCents(cents: number): string {
    return (cents / 100).toFixed(2)
}

/**
 * Format a money string as USD currency for display
 */
export function formatMoney(amount: MoneyString): string {
    const cents = toCents(amount)
    return usdFormat.format(cents / 100)
}

/**
 * Sum an array of money strings
 */
export function sumStrings(amounts: MoneyString[]): string {
    if (amounts.length === 0) return '0.00'
    const totalCents = amounts.reduce((sum, amt) => sum + toCents(amt), 0)
    return fromCents(totalCents)
}

/**
 * Add two money values
 */
export function addMoney(a: MoneyString, b: MoneyString): string {
    return fromCents(toCents(a) + toCents(b))
}

/**
 * Subtract one money value from another
 */
export function subtractMoney(a: MoneyString, b: MoneyString): string {
    return fromCents(toCents(a) - toCents(b))
}

/**
 * Compare two money values
 * @returns -1 if a < b, 0 if equal, 1 if a > b
 */
export function compareMoney(a: MoneyString, b: MoneyString): -1 | 0 | 1 {
    const aCents = toCents(a)
    const bCents = toCents(b)
    if (aCents < bCents) return -1
    if (aCents > bCents) return 1
    return 0
}

/**
 * Check if a money value is zero
 */
export function isZero(amount: MoneyString): boolean {
    return toCents(amount) === 0
}

/**
 * Check if a money value is positive
 */
export function isPositive(amount: MoneyString): boolean {
    return toCents(amount) > 0
}

/**
 * Check if a money value is negative
 */
export function isNegative(amount: MoneyString): boolean {
    return toCents(amount) < 0
}

// Legacy exports for backwards compatibility
export { toCents as toDinero, fromCents as toMoneyString }
