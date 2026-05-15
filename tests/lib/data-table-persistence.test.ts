/** loadColumnSizing — strict shape validation against malformed localStorage. */

import '../setup'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
    columnSizingStorageKey,
    loadColumnSizing,
    saveColumnSizing,
} from '../../src/lib/data-table-persistence'

describe('loadColumnSizing', () => {
    beforeEach(() => {
        window.localStorage.clear()
    })
    afterEach(() => {
        window.localStorage.clear()
    })

    test('returns {} when tableId is undefined', () => {
        expect(loadColumnSizing(undefined)).toEqual({})
    })

    test('returns {} when key is missing', () => {
        expect(loadColumnSizing('missing')).toEqual({})
    })

    test('returns parsed map for valid input', () => {
        saveColumnSizing('valid', { name: 200, vin: 320 })
        expect(loadColumnSizing('valid')).toEqual({ name: 200, vin: 320 })
    })

    test('rejects non-JSON values', () => {
        window.localStorage.setItem(
            columnSizingStorageKey('bad-json'),
            'not json',
        )
        expect(loadColumnSizing('bad-json')).toEqual({})
    })

    test('rejects JSON null', () => {
        window.localStorage.setItem(columnSizingStorageKey('null'), 'null')
        expect(loadColumnSizing('null')).toEqual({})
    })

    test('rejects JSON arrays', () => {
        window.localStorage.setItem(columnSizingStorageKey('arr'), '[150,200]')
        expect(loadColumnSizing('arr')).toEqual({})
    })

    test('drops string-typed values', () => {
        window.localStorage.setItem(
            columnSizingStorageKey('strv'),
            '{"name":"200","vin":300}',
        )
        expect(loadColumnSizing('strv')).toEqual({ vin: 300 })
    })

    test('drops NaN / Infinity / negative / out-of-bounds values', () => {
        window.localStorage.setItem(
            columnSizingStorageKey('bounds'),
            JSON.stringify({
                a: Number.NaN, // serialises to null, ignored
                b: -10, // below RESIZE_MIN
                c: 10, // below RESIZE_MIN (20)
                d: 50, // valid
                e: 2000, // valid (boundary)
                f: 2001, // above RESIZE_MAX
            }),
        )
        expect(loadColumnSizing('bounds')).toEqual({ d: 50, e: 2000 })
    })

    test('preserves the explicit storage key shape', () => {
        expect(columnSizingStorageKey('vehicles')).toBe('dt:vehicles:sizing')
    })
})

describe('saveColumnSizing', () => {
    beforeEach(() => {
        window.localStorage.clear()
    })

    test('writes JSON under the canonical key', () => {
        saveColumnSizing('vehicles', { name: 250 })
        expect(window.localStorage.getItem('dt:vehicles:sizing')).toBe(
            '{"name":250}',
        )
    })

    test('overwrites prior value', () => {
        saveColumnSizing('vehicles', { name: 250 })
        saveColumnSizing('vehicles', { name: 400, vin: 200 })
        expect(window.localStorage.getItem('dt:vehicles:sizing')).toBe(
            '{"name":400,"vin":200}',
        )
    })
})
