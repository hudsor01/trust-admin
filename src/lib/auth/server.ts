import { createNeonAuth } from '@neondatabase/auth/next/server'
import { env } from '@/lib/env'

export const authServer = createNeonAuth({
    baseUrl: env.NEON_AUTH_BASE_URL,
    cookies: {
        secret: env.NEON_AUTH_COOKIE_SECRET,
        // Session cookie must survive the top-level redirect back from the
        // Neon Auth domain after sign-in (a cross-site navigation). @neondatabase/auth
        // 0.4 changed the default from 'lax' to 'strict', which withholds the cookie
        // on that navigation and causes a sign-in → "/" → sign-in loop. Pin it explicitly.
        sameSite: 'lax',
    },
})
