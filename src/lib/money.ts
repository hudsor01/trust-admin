/**
 * Type-safe money utilities using dinero.js v2
 *
 * This module provides precision-safe money operations for the trust admin application.
 * All database money values are stored as strings (e.g., "1500.00") to preserve precision.
 *
 * @example
 * // Format a database string as currency
 * formatCurrency("1500.50") // "$1,500.50"
 *
 * // Sum multiple money strings
 * sumStrings(["100.50", "200.25", null]) // "300.75"
 *
 * // Add two money values
 * addMoney("100.50", "200.25") // "300.75"
 *
 * // Subtract money values
 * subtractMoney("500.00", "200.25") // "299.75"
 */

import { USD } from '@dinero.js/currencies'
import { add, type Dinero, dinero, toDecimal } from 'dinero.js'

// Type for money stored as strings in database
export type MoneyString = string | null | undefined

// Dinero instance type for USD
export type USDMoney = Dinero<number>

/**
 * Convert a string amount to Dinero object
 * Handles null/undefined/empty strings safely
 *
 * @param amount - String amount from database (e.g., "1500.50")
 * @returns Dinero object representing the amount
 */
export function toDinero(amount: MoneyString): USDMoney {
    if (!amount || amount.trim() === '') {
        return dinero({ amount: 0, currency: USD })
    }

    // Remove any currency symbols and commas
    const cleanAmount = amount.replace(/[$,]/g, '').trim()

    // Parse as float and convert to cents (integer)
    const parsed = parseFloat(cleanAmount)
    if (Number.isNaN(parsed)) {
        return dinero({ amount: 0, currency: USD })
    }

    // Convert to cents (multiply by 100 and round to avoid floating point issues)
    const cents = Math.round(parsed * 100)

    return dinero({ amount: cents, currency: USD })
}

/**
 * Convert a Dinero object to string for database storage
 *
 * @param money - Dinero object
 * @returns String representation (e.g., "1500.50")
 */
export function toMoneyString(money: USDMoney): string {
    return toDecimal(money)
}

/**
 * Format a money string as USD currency for display
 * Uses Intl.NumberFormat for proper locale-aware formatting
 *
 * @param amount - String amount from database
 * @returns Formatted currency string (e.g., "$1,500.50")
 */
export function formatMoney(amount: MoneyString): string {
    const money = toDinero(amount)

    // Use toDecimal to get the string value, then format with Intl
    const decimalValue = toDecimal(money)
    const numericValue = parseFloat(decimalValue)

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(numericValue)
}

/**
 * Sum an array of money strings
 * Safely handles null/undefined values
 *
 * @param amounts - Array of string amounts
 * @returns Sum as string (e.g., "1500.50")
 */
export function sumStrings(amounts: MoneyString[]): string {
    if (amounts.length === 0) {
        return '0.00'
    }

    const dineroAmounts = amounts.map(toDinero)
    const total = dineroAmounts.reduce((acc, curr) => add(acc, curr))

    return toMoneyString(total)
}

/**
 * Add two money values
 *
 * @param a - First amount
 * @param b - Second amount
 * @returns Sum as string
 */
export function addMoney(a: MoneyString, b: MoneyString): string {
    return sumStrings([a, b])
}

/**
 * Subtract one money value from another
 *
 * @param a - Amount to subtract from
 * @param b - Amount to subtract
 * @returns Difference as string
 */
export function subtractMoney(a: MoneyString, b: MoneyString): string {
    const dineroA = toDinero(a)
    const dineroB = toDinero(b)

    // dinero.js v2 doesn't have subtract, so we negate and add
    // Convert B to negative cents
    const bDecimal = toDecimal(dineroB)
    const bCents = Math.round(parseFloat(bDecimal) * 100)
    const negativeB = dinero({ amount: -bCents, currency: USD })

    const result = add(dineroA, negativeB)
    return toMoneyString(result)
}

/**
 * Compare two money values
 *
 * @param a - First amount
 * @param b - Second amount
 * @returns -1 if a < b, 0 if equal, 1 if a > b
 */
export function compareMoney(a: MoneyString, b: MoneyString): -1 | 0 | 1 {
    const aValue = parseFloat(toDecimal(toDinero(a)))
    const bValue = parseFloat(toDecimal(toDinero(b)))

    if (aValue < bValue) return -1
    if (aValue > bValue) return 1
    return 0
}

/**
 * Check if a money value is zero
 *
 * @param amount - Amount to check
 * @returns true if zero or empty
 */
export function isZero(amount: MoneyString): boolean {
    const money = toDinero(amount)
    return toDecimal(money) === '0.00' || toDecimal(money) === '0'
}

/**
 * Check if a money value is positive
 *
 * @param amount - Amount to check
 * @returns true if greater than zero
 */
export function isPositive(amount: MoneyString): boolean {
    return compareMoney(amount, '0') === 1
}

/**
 * Check if a money value is negative
 *
 * @param amount - Amount to check
 * @returns true if less than zero
 */
export function isNegative(amount: MoneyString): boolean {
    return compareMoney(amount, '0') === -1
}
