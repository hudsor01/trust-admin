import { createAuthServer } from '@neondatabase/auth/next/server'

/**
 * Neon Auth Server
 *
 * Creates the auth server instance for server-side auth operations.
 * Requires NEON_AUTH_BASE_URL environment variable to be set.
 *
 * In test environments without Neon Auth configured, this will be undefined
 * and tests should skip auth server tests.
 */
function initAuthServer() {
    if (!process.env.NEON_AUTH_BASE_URL) {
        // Return a placeholder in dev/test when not configured
        // This prevents crashes when importing the module
        if (process.env.NODE_ENV !== 'production') {
            console.warn(
                '[auth/server] NEON_AUTH_BASE_URL not set - auth server disabled',
            )
            return undefined as unknown as ReturnType<typeof createAuthServer>
        }
        throw new Error('NEON_AUTH_BASE_URL is required in production')
    }
    return createAuthServer()
}

export const authServer = initAuthServer()
