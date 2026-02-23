// Requires NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET in environment
import { createNeonAuth } from '@neondatabase/auth/next/server'

export const authServer = createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: {
        secret: process.env.NEON_AUTH_COOKIE_SECRET!,
    },
})
