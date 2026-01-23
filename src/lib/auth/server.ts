import { createAuthServer } from '@neondatabase/auth/next/server'

/**
 * Neon Auth Server
 *
 * Creates the auth server instance for server-side auth operations.
 * Requires NEON_AUTH_BASE_URL environment variable to be set in all environments.
 */
function initAuthServer() {
    if (!process.env.NEON_AUTH_BASE_URL) {
        throw new Error(
            'NEON_AUTH_BASE_URL is required. Add it to your .env file.',
        )
    }
    return createAuthServer()
}

export const authServer = initAuthServer()
