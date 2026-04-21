'use server'

import { cookies } from 'next/headers'
import { env } from '@/lib/env'
import {
    ACCESS_COOKIE_MAX_AGE,
    ACCESS_COOKIE_NAME,
    ACCESS_COOKIE_VALUE,
    getClientIP,
    hasInventoryAccess,
} from '@/lib/inventory-access'
import {
    checkLockout,
    constantTimeCompare,
    recordFailure,
    resetFailures,
} from './access-lockout'

// Re-export so existing callers (`from '@/app/forms/_actions/verifyAccess'`)
// keep working.
export { hasInventoryAccess }

export async function verifyAccessCode(
    _prevState: { success: boolean; error?: string },
    formData: FormData,
): Promise<{ success: boolean; error?: string }> {
    const code = formData.get('accessCode')?.toString().trim().toLowerCase()
    const expectedCode = env.INVENTORY_ACCESS_CODE?.toLowerCase()

    // If no access code configured, allow access (dev convenience;
    // hasInventoryAccess fails closed in production when this is unset).
    if (!expectedCode) {
        const cookieStore = await cookies()
        cookieStore.set(ACCESS_COOKIE_NAME, ACCESS_COOKIE_VALUE, {
            httpOnly: true,
            secure: env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: ACCESS_COOKIE_MAX_AGE,
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
    cookieStore.set(ACCESS_COOKIE_NAME, ACCESS_COOKIE_VALUE, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: ACCESS_COOKIE_MAX_AGE,
    })

    return { success: true }
}
