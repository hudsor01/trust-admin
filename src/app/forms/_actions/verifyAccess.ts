'use server'

import { cookies, headers } from 'next/headers'
import { env } from '@/lib/env'
import {
    checkLockout,
    constantTimeCompare,
    recordFailure,
    resetFailures,
} from './access-lockout'

const ACCESS_COOKIE_NAME = 'inventory_access'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

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
