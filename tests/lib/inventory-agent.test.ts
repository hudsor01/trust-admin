/** Unit tests for src/lib/inventory-agent.ts — the sanitizer that keeps
 * extractor-emitted currency-formatted strings from reaching the database
 * (and the form's dinero.js renderer, which NaNs on any non-digit). */

import { describe, expect, test } from 'bun:test'
import { _testables } from '@/lib/inventory-agent'

const { sanitizeNumericFields, toBareDecimal } = _testables

describe('toBareDecimal', () => {
    test('strips dollar sign prefix (the exact 2026-04-23 field-test bug)', () => {
        expect(toBareDecimal('$800', 'min')).toBe('800')
        expect(toBareDecimal('$550', 'min')).toBe('550')
        expect(toBareDecimal('$1075', 'max')).toBe('1075')
    })

    test('strips thousands separators', () => {
        expect(toBareDecimal('$1,075', 'min')).toBe('1075')
        expect(toBareDecimal('12,345.67', 'min')).toBe('12345.67')
    })

    test('preserves plain decimals untouched', () => {
        expect(toBareDecimal('800.00', 'min')).toBe('800')
        expect(toBareDecimal('1075.5', 'max')).toBe('1075.5')
    })

    test('range string → picks min for valueRangeLow, max for valueRangeHigh', () => {
        expect(toBareDecimal('$550–$1,075', 'min')).toBe('550')
        expect(toBareDecimal('$550–$1,075', 'max')).toBe('1075')
        expect(toBareDecimal('450-900', 'min')).toBe('450')
        expect(toBareDecimal('450-900', 'max')).toBe('900')
    })

    test('prose with prefix text still extracts the number', () => {
        expect(toBareDecimal('approximately 800', 'min')).toBe('800')
        expect(toBareDecimal('about $1,234.50 total', 'min')).toBe('1234.5')
    })

    test('unparseable → "0" rather than throwing', () => {
        expect(toBareDecimal('unknown', 'min')).toBe('0')
        expect(toBareDecimal('', 'min')).toBe('0')
        expect(toBareDecimal('—', 'max')).toBe('0')
    })
})

describe('sanitizeNumericFields', () => {
    test('cleans estimatedValue / valueRangeLow / valueRangeHigh in a parsed object', () => {
        const input = {
            name: 'Yanke Doodle II',
            category: 'artwork',
            estimatedValue: '$800',
            valueRangeLow: '$550',
            valueRangeHigh: '$1,075',
            reviewStatus: 'needs_professional_appraisal',
            valuationRationale: 'prose body here',
        }
        const out = sanitizeNumericFields(input) as Record<string, unknown>
        expect(out.estimatedValue).toBe('800')
        expect(out.valueRangeLow).toBe('550')
        expect(out.valueRangeHigh).toBe('1075')
        // Non-numeric fields left alone
        expect(out.name).toBe('Yanke Doodle II')
        expect(out.category).toBe('artwork')
        expect(out.valuationRationale).toBe('prose body here')
    })

    test('picks endpoints correctly when a single field holds a range', () => {
        const input = {
            estimatedValue: '$550–$1,075',
            valueRangeLow: '$550–$1,075',
            valueRangeHigh: '$550–$1,075',
        }
        const out = sanitizeNumericFields(input) as Record<string, unknown>
        // estimatedValue falls through to the 'min' branch — the prompt
        // says to pick the midpoint, but if the model ignores that and
        // hands us a range, min is the safer persist (undervalue beats
        // overvalue for defensibility).
        expect(out.estimatedValue).toBe('550')
        expect(out.valueRangeLow).toBe('550')
        expect(out.valueRangeHigh).toBe('1075')
    })

    test('non-object input passes through unchanged', () => {
        expect(sanitizeNumericFields(null)).toBe(null)
        expect(sanitizeNumericFields('not an object')).toBe('not an object')
        expect(sanitizeNumericFields(undefined)).toBe(undefined)
    })
})
