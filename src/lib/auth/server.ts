import { createAuthServer } from '@neondatabase/auth/next/server'

/**
 * Neon Auth Server
 *
 * Creates the auth server instance for server-side auth operations.
 * Requires NEON_AUTH_BASE_URL environment variable to be set.
 */
export const authServer = createAuthServer()
