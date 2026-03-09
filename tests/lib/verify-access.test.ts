import { beforeEach, describe, expect, mock, test } from 'bun:test'

/**
 * Tests for timing-safe access code comparison and IP-based lockout.
 * verifyAccess.ts is a 'use server' file -- we import the exported helpers directly.
 */

// Mock next/headers
const mockCookieStore = {
    get: mock(() => null),
    set: mock(() => {}),
}
const mockHeaders = new Headers({ 'x-forwarded-for': '1.2.3.4' })

mock.module('next/headers', () => ({
    cookies: () => Promise.resolve(mockCookieStore),
    headers: () => Promise.resolve(mockHeaders),
}))

// Mock env
mock.module('../../src/lib/env', () => ({
    env: {
        INVENTORY_ACCESS_CODE: 'testcode',
        NODE_ENV: 'test',
    },
}))

const {
    constantTimeCompare,
    checkLockout,
    recordFailure,
    resetFailures,
    failedAttempts,
    verifyAccessCode,
} = await import('../../src/app/forms/_actions/verifyAccess')

describe('constantTimeCompare', () => {
    test('returns true for matching strings', () => {
        expect(constantTimeCompare('hello', 'hello')).toBe(true)
    })

    test('returns false for non-matching strings (same length)', () => {
        expect(constantTimeCompare('hello', 'world')).toBe(false)
    })

    test('returns false for non-matching strings (different lengths)', () => {
        expect(constantTimeCompare('hi', 'hello')).toBe(false)
    })

    test('returns true for empty strings', () => {
        expect(constantTimeCompare('', '')).toBe(true)
    })
})

describe('IP-based lockout', () => {
    beforeEach(() => {
        failedAttempts.clear()
    })

    test('checkLockout returns { locked: false } for unknown IP', () => {
        const result = checkLockout('10.0.0.1')
        expect(result.locked).toBe(false)
    })

    test('after 5 recordFailure calls, checkLockout returns { locked: true }', () => {
        for (let i = 0; i < 5; i++) {
            recordFailure('10.0.0.2')
        }
        const result = checkLockout('10.0.0.2')
        expect(result.locked).toBe(true)
        expect(result.remaining).toBeGreaterThan(0)
    })

    test('after 4 recordFailure calls, checkLockout returns { locked: false }', () => {
        for (let i = 0; i < 4; i++) {
            recordFailure('10.0.0.3')
        }
        const result = checkLockout('10.0.0.3')
        expect(result.locked).toBe(false)
    })

    test('resetFailures clears lockout for an IP', () => {
        for (let i = 0; i < 5; i++) {
            recordFailure('10.0.0.4')
        }
        expect(checkLockout('10.0.0.4').locked).toBe(true)

        resetFailures('10.0.0.4')
        expect(checkLockout('10.0.0.4').locked).toBe(false)
    })

    test('lockout expires after the configured timeout period', () => {
        for (let i = 0; i < 5; i++) {
            recordFailure('10.0.0.5')
        }
        expect(checkLockout('10.0.0.5').locked).toBe(true)

        // Manually set lockedUntil to the past to simulate expiry
        const record = failedAttempts.get('10.0.0.5')!
        record.lockedUntil = Date.now() - 1000
        failedAttempts.set('10.0.0.5', record)

        expect(checkLockout('10.0.0.5').locked).toBe(false)
        // Should also clean up the record
        expect(failedAttempts.has('10.0.0.5')).toBe(false)
    })
})

describe('verifyAccessCode with lockout', () => {
    beforeEach(() => {
        failedAttempts.clear()
        mockCookieStore.get.mockReset()
        mockCookieStore.set.mockReset()
        mockHeaders.set('x-forwarded-for', '1.2.3.4')
    })

    test('returns error when IP is locked out', async () => {
        // Lock out the IP
        for (let i = 0; i < 5; i++) {
            recordFailure('1.2.3.4')
        }

        const formData = new FormData()
        formData.set('accessCode', 'testcode')

        const result = await verifyAccessCode({ success: false }, formData)
        expect(result.success).toBe(false)
        expect(result.error).toContain('Too many attempts')
    })
})
