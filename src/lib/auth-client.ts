/**
 * Better Auth Client
 *
 * Client-side auth utilities for Next.js App Router.
 */
'use client'

import { magicLinkClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
    baseURL:
        typeof window !== 'undefined'
            ? window.location.origin
            : 'http://localhost:3000',
    plugins: [magicLinkClient()],
})

// Export convenience methods
export const { signIn, signOut, useSession, getSession } = authClient
