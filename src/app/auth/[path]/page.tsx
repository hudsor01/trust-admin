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
import { Scale } from 'lucide-react'

export const dynamicParams = false

export default async function AuthPage({
    params,
}: {
    params: Promise<{ path: string }>
}) {
    const { path } = await params

    return (
        <div className="grid min-h-screen lg:grid-cols-2">
            {/* Left side - Branding */}
            <div className="relative hidden bg-gradient-to-br from-primary/10 via-background to-background lg:flex lg:flex-col lg:justify-center lg:p-12">
                <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
                        <Scale className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <h1 className="text-3xl font-semibold tracking-tight">
                        Hudson Living Trust
                    </h1>
                </div>
            </div>

            {/* Right side - Auth Form */}
            <div className="flex flex-col">
                {/* Mobile header */}
                <div className="flex items-center gap-3 p-6 lg:hidden">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                        <Scale className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold">
                            Hudson Living Trust
                        </h1>
                    </div>
                </div>

                {/* Auth form container */}
                <main className="flex flex-1 flex-col items-center justify-center p-6 md:p-10">
                    <div className="w-full max-w-md">
                        <AuthView path={path} />
                    </div>
                </main>
            </div>
        </div>
    )
}
