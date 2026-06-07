/**
 * Money utilities: strings in DB, integer cents for math, Intl for display.
 * Avoids floating-point errors by converting to cents before arithmetic.
 */

export type MoneyString = string | null | undefined

const usdFormat = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
})

/** Convert a string amount to integer cents. Returns 0 for null/empty/NaN. */
export function toCents(amount: MoneyString): number {
    if (!amount || amount.trim() === '') return 0
    const cleaned = amount.replace(/[$,]/g, '').trim()
    const parsed = parseFloat(cleaned)
    return Number.isNaN(parsed) ? 0 : Math.round(parsed * 100)
}

/** Convert integer cents back to a string for DB storage. */
export function fromCents(cents: number): string {
    return (cents / 100).toFixed(2)
}

/** Format a money string as USD currency (e.g. "$1,500.50"). */
export function formatMoney(amount: MoneyString): string {
    const cents = toCents(amount)
    return usdFormat.format(cents / 100)
}

/** Sum an array of money strings, returning a DB-format string. */
export function sumStrings(amounts: MoneyString[]): string {
    if (amounts.length === 0) return '0.00'
    const totalCents = amounts.reduce((sum, amt) => sum + toCents(amt), 0)
    return fromCents(totalCents)
}

export function addMoney(a: MoneyString, b: MoneyString): string {
    return fromCents(toCents(a) + toCents(b))
}

export function subtractMoney(a: MoneyString, b: MoneyString): string {
    return fromCents(toCents(a) - toCents(b))
}

export function isPositive(amount: MoneyString): boolean {
    return toCents(amount) > 0
}

export function isNegative(amount: MoneyString): boolean {
    return toCents(amount) < 0
}
