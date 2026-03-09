'use server'

import { timingSafeEqual } from 'node:crypto'
import { cookies, headers } from 'next/headers'
import { env } from '@/lib/env'

const ACCESS_COOKIE_NAME = 'inventory_access'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

// --- Constant-time comparison ---

export function constantTimeCompare(input: string, secret: string): boolean {
    const inputBuf = Buffer.from(input, 'utf-8')
    const secretBuf = Buffer.from(secret, 'utf-8')
    if (inputBuf.length !== secretBuf.length) {
        // Pad to same length so timingSafeEqual doesn't throw, but always return false
        const paddedInput = Buffer.alloc(secretBuf.length)
        inputBuf.copy(
            paddedInput,
            0,
            0,
            Math.min(inputBuf.length, secretBuf.length),
        )
        timingSafeEqual(paddedInput, secretBuf)
        return false
    }
    return timingSafeEqual(inputBuf, secretBuf)
}

// --- IP-based lockout ---

const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 15 * 60 * 1000 // 15 minutes

export const failedAttempts = new Map<
    string,
    { count: number; lockedUntil: number }
>()

export function checkLockout(ip: string): {
    locked: boolean
    remaining?: number
} {
    const record = failedAttempts.get(ip)
    if (!record) return { locked: false }
    if (record.lockedUntil && Date.now() < record.lockedUntil) {
        const remaining = Math.ceil(
            (record.lockedUntil - Date.now()) / 1000 / 60,
        )
        return { locked: true, remaining }
    }
    if (record.lockedUntil && Date.now() >= record.lockedUntil) {
        failedAttempts.delete(ip)
        return { locked: false }
    }
    return { locked: false }
}

export function recordFailure(ip: string): void {
    const record = failedAttempts.get(ip) || { count: 0, lockedUntil: 0 }
    record.count++
    if (record.count >= MAX_ATTEMPTS) {
        record.lockedUntil = Date.now() + LOCKOUT_MS
    }
    failedAttempts.set(ip, record)
}

export function resetFailures(ip: string): void {
    failedAttempts.delete(ip)
}

// --- IP extraction ---

async function getClientIP(): Promise<string> {
    const hdrs = await headers()
    return hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

// --- Access code verification ---

export async function verifyAccessCode(
    _prevState: { success: boolean; error?: string },
    formData: FormData,
): Promise<{ success: boolean; error?: string }> {
    const code = formData.get('accessCode')?.toString().trim().toLowerCase()
    const expectedCode = env.INVENTORY_ACCESS_CODE?.toLowerCase()

    // If no access code configured, allow access
    if (!expectedCode) {
        const cookieStore = await cookies()
        cookieStore.set(ACCESS_COOKIE_NAME, 'granted', {
            httpOnly: true,
            secure: env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: COOKIE_MAX_AGE,
        })
        return { success: true }
    }

    // Check IP lockout
    const ip = await getClientIP()
    const lockout = checkLockout(ip)
    if (lockout.locked) {
        return {
            success: false,
            error: `Too many attempts. Try again in ${lockout.remaining} minutes.`,
        }
    }

    if (!code) {
        return { success: false, error: 'Please enter the access code' }
    }

    if (!constantTimeCompare(code, expectedCode)) {
        recordFailure(ip)
        return { success: false, error: 'Invalid access code' }
    }

    // Success -- clear lockout and set cookie
    resetFailures(ip)
    const cookieStore = await cookies()
    cookieStore.set(ACCESS_COOKIE_NAME, 'granted', {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: COOKIE_MAX_AGE,
    })

    return { success: true }
}

export async function hasInventoryAccess(): Promise<boolean> {
    // If no access code configured, allow everyone
    if (!env.INVENTORY_ACCESS_CODE) {
        return true
    }

    const cookieStore = await cookies()
    const accessCookie = cookieStore.get(ACCESS_COOKIE_NAME)
    return accessCookie?.value === 'granted'
}
