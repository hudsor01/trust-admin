/**
 * Authentication Pages
 *
 * Handles sign-in, sign-up, and other auth flows using Neon Auth UI.
 * Routes:
 * - /auth/sign-in
 * - /auth/sign-up
 * - /auth/forgot-password
 * - /auth/reset-password
 * - /auth/verify-email
 */

import { AuthView } from '@neondatabase/auth/react'

export const dynamicParams = false

export default async function AuthPage({
    params,
}: {
    params: Promise<{ path: string }>
}) {
    const { path } = await params

    return (
        <main className="container mx-auto flex grow flex-col items-center justify-center gap-3 self-center p-4 md:p-6">
            <AuthView path={path} />
        </main>
    )
}
