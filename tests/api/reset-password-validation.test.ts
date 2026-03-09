import { describe, expect, test } from 'bun:test'
import { z } from 'zod'

/**
 * Tests for the ResetPasswordSchema used in the reset-password API route.
 *
 * We replicate the Zod schema from src/app/api/auth/custom/reset-password/route.ts
 * rather than importing it, since the route module has server-side dependencies.
 */
const ResetPasswordSchema = z.object({
    token: z.string().regex(/^[0-9a-f]{64}$/, 'Invalid token format'),
    newPassword: z
        .string()
        .min(8, 'Password too short')
        .max(128, 'Password too long'),
})

const VALID_TOKEN = 'a'.repeat(64) // 64 lowercase hex chars
const VALID_PASSWORD = 'MyStr0ngP@ss!'

describe('ResetPasswordSchema', () => {
    describe('token validation', () => {
        test('rejects empty string', () => {
            const result = ResetPasswordSchema.safeParse({
                token: '',
                newPassword: VALID_PASSWORD,
            })
            expect(result.success).toBe(false)
        })

        test('rejects short hex string (not 64 chars)', () => {
            const result = ResetPasswordSchema.safeParse({
                token: 'abc',
                newPassword: VALID_PASSWORD,
            })
            expect(result.success).toBe(false)
        })

        test('rejects uppercase hex characters', () => {
            const result = ResetPasswordSchema.safeParse({
                token: 'A'.repeat(64),
                newPassword: VALID_PASSWORD,
            })
            expect(result.success).toBe(false)
        })

        test('rejects non-hex characters', () => {
            const result = ResetPasswordSchema.safeParse({
                token: `${'a'.repeat(62)}zz`,
                newPassword: VALID_PASSWORD,
            })
            expect(result.success).toBe(false)
        })

        test('rejects token longer than 64 chars', () => {
            const result = ResetPasswordSchema.safeParse({
                token: 'a'.repeat(65),
                newPassword: VALID_PASSWORD,
            })
            expect(result.success).toBe(false)
        })

        test('accepts valid 64-char lowercase hex token', () => {
            const result = ResetPasswordSchema.safeParse({
                token: VALID_TOKEN,
                newPassword: VALID_PASSWORD,
            })
            expect(result.success).toBe(true)
        })

        test('accepts token with all valid hex digits', () => {
            const mixedHex = '0123456789abcdef'.repeat(4) // 64 chars
            const result = ResetPasswordSchema.safeParse({
                token: mixedHex,
                newPassword: VALID_PASSWORD,
            })
            expect(result.success).toBe(true)
        })
    })

    describe('password validation', () => {
        test('rejects password shorter than 8 characters', () => {
            const result = ResetPasswordSchema.safeParse({
                token: VALID_TOKEN,
                newPassword: 'short',
            })
            expect(result.success).toBe(false)
        })

        test('rejects password longer than 128 characters', () => {
            const result = ResetPasswordSchema.safeParse({
                token: VALID_TOKEN,
                newPassword: 'x'.repeat(129),
            })
            expect(result.success).toBe(false)
        })

        test('accepts password of exactly 8 characters', () => {
            const result = ResetPasswordSchema.safeParse({
                token: VALID_TOKEN,
                newPassword: '12345678',
            })
            expect(result.success).toBe(true)
        })

        test('accepts password of exactly 128 characters', () => {
            const result = ResetPasswordSchema.safeParse({
                token: VALID_TOKEN,
                newPassword: 'x'.repeat(128),
            })
            expect(result.success).toBe(true)
        })

        test('rejects empty password', () => {
            const result = ResetPasswordSchema.safeParse({
                token: VALID_TOKEN,
                newPassword: '',
            })
            expect(result.success).toBe(false)
        })
    })

    describe('missing fields', () => {
        test('rejects when both fields missing', () => {
            const result = ResetPasswordSchema.safeParse({})
            expect(result.success).toBe(false)
        })

        test('rejects when token missing', () => {
            const result = ResetPasswordSchema.safeParse({
                newPassword: VALID_PASSWORD,
            })
            expect(result.success).toBe(false)
        })

        test('rejects when password missing', () => {
            const result = ResetPasswordSchema.safeParse({
                token: VALID_TOKEN,
            })
            expect(result.success).toBe(false)
        })

        test('rejects undefined input', () => {
            const result = ResetPasswordSchema.safeParse(undefined)
            expect(result.success).toBe(false)
        })

        test('rejects null input', () => {
            const result = ResetPasswordSchema.safeParse(null)
            expect(result.success).toBe(false)
        })
    })
})
