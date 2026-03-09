import { describe, expect, test } from 'bun:test'
import { z } from 'zod'

/**
 * Tests for the NEON_AUTH_COOKIE_SECRET validation schema.
 *
 * We replicate the Zod schema from src/lib/env.ts rather than importing
 * the env module directly, since importing it triggers full environment
 * validation (all required vars must be present).
 */
const cookieSecretSchema = z
    .string()
    .trim()
    .min(32, 'NEON_AUTH_COOKIE_SECRET must be >= 32 characters')

describe('NEON_AUTH_COOKIE_SECRET validation', () => {
    test('rejects when value is missing (undefined)', () => {
        const result = cookieSecretSchema.safeParse(undefined)
        expect(result.success).toBe(false)
    })

    test('rejects when value is shorter than 32 characters', () => {
        const result = cookieSecretSchema.safeParse('short')
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0].message).toContain('>= 32')
        }
    })

    test('rejects empty string', () => {
        const result = cookieSecretSchema.safeParse('')
        expect(result.success).toBe(false)
    })

    test('rejects string of 31 characters (boundary)', () => {
        const result = cookieSecretSchema.safeParse('a'.repeat(31))
        expect(result.success).toBe(false)
    })

    test('accepts string of exactly 32 characters', () => {
        const result = cookieSecretSchema.safeParse('a'.repeat(32))
        expect(result.success).toBe(true)
    })

    test('accepts string longer than 32 characters', () => {
        const result = cookieSecretSchema.safeParse(
            'xkKTfAWR6Vx2PgI0lxv1igxEqN/sckUmgA6hGAQde5g=',
        )
        expect(result.success).toBe(true)
    })

    test('trims whitespace before checking length', () => {
        // 32 chars with trailing spaces — after trim still 32
        const result = cookieSecretSchema.safeParse(`${'a'.repeat(32)}  `)
        expect(result.success).toBe(true)
    })

    test('rejects value that is only whitespace', () => {
        const result = cookieSecretSchema.safeParse('   ')
        expect(result.success).toBe(false)
    })
})
