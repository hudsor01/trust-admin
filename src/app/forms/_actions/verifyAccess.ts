'use server'

import { cookies } from 'next/headers'

const ACCESS_COOKIE_NAME = 'inventory_access'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export async function verifyAccessCode(
    _prevState: { success: boolean; error?: string },
    formData: FormData,
): Promise<{ success: boolean; error?: string }> {
    const code = formData.get('accessCode')?.toString().trim().toLowerCase()
    const expectedCode = process.env.INVENTORY_ACCESS_CODE?.toLowerCase()

    // If no access code configured, allow access
    if (!expectedCode) {
        const cookieStore = await cookies()
        cookieStore.set(ACCESS_COOKIE_NAME, 'granted', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: COOKIE_MAX_AGE,
        })
        return { success: true }
    }

    if (!code) {
        return { success: false, error: 'Please enter the access code' }
    }

    if (code !== expectedCode) {
        return { success: false, error: 'Invalid access code' }
    }

    // Set access cookie
    const cookieStore = await cookies()
    cookieStore.set(ACCESS_COOKIE_NAME, 'granted', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: COOKIE_MAX_AGE,
    })

    return { success: true }
}

export async function hasInventoryAccess(): Promise<boolean> {
    // If no access code configured, allow everyone
    if (!process.env.INVENTORY_ACCESS_CODE) {
        return true
    }

    const cookieStore = await cookies()
    const accessCookie = cookieStore.get(ACCESS_COOKIE_NAME)
    return accessCookie?.value === 'granted'
}
