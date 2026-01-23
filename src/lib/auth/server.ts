import { createAuthServer } from '@neondatabase/auth/next/server'

/**
 * Neon Auth Server
 *
 * Creates the auth server instance for server-side auth operations.
 * Requires NEON_AUTH_BASE_URL environment variable to be set.
 *
 * Initialization is lazy to allow builds to succeed without the env var.
 * The error is thrown at runtime when auth is actually used.
 */
let _authServer: ReturnType<typeof createAuthServer> | null = null

function getAuthServer() {
    if (!_authServer) {
        if (!process.env.NEON_AUTH_BASE_URL) {
            throw new Error(
                'NEON_AUTH_BASE_URL is required. Add it to your .env file.',
            )
        }
        _authServer = createAuthServer()
    }
    return _authServer
}

export const authServer = new Proxy({} as ReturnType<typeof createAuthServer>, {
    get(_target, prop) {
        return getAuthServer()[
            prop as keyof ReturnType<typeof createAuthServer>
        ]
    },
})
