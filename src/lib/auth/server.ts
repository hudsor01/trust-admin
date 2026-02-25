// Requires NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET in environment
import { createNeonAuth } from '@neondatabase/auth/next/server'
import { env } from '@/lib/env'

export const authServer = createNeonAuth({
    baseUrl: env.NEON_AUTH_BASE_URL,
    cookies: {
        secret: env.NEON_AUTH_COOKIE_SECRET!,
    },
})
