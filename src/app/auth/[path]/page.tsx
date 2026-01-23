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
import { Building2, Lock, Shield, Users } from 'lucide-react'

export const dynamicParams = false

const features = [
    {
        icon: Shield,
        title: 'Bank-Level Security',
        description: 'Your data is protected with enterprise-grade encryption',
    },
    {
        icon: Users,
        title: 'Beneficiary Portal',
        description: 'Secure access for beneficiaries to view their share',
    },
    {
        icon: Lock,
        title: 'Role-Based Access',
        description: 'Trustees and beneficiaries see only what they need',
    },
]

export default async function AuthPage({
    params,
}: {
    params: Promise<{ path: string }>
}) {
    const { path } = await params

    return (
        <div className="grid min-h-screen lg:grid-cols-2">
            {/* Left side - Branding */}
            <div className="relative hidden bg-gradient-to-br from-primary/20 via-background to-background lg:block">
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

                <div className="relative flex h-full flex-col justify-between p-10">
                    {/* Logo and Title */}
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                            <Building2 className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight">
                                Trust Admin
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Estate & Trust Management
                            </p>
                        </div>
                    </div>

                    {/* Features */}
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-semibold tracking-tight">
                                Secure Trust Administration
                            </h2>
                            <p className="mt-2 text-muted-foreground">
                                Professional tools for managing estate
                                settlements and ongoing trust administration.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {features.map((feature) => (
                                <div
                                    key={feature.title}
                                    className="flex items-start gap-4"
                                >
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-card">
                                        <feature.icon className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium">
                                            {feature.title}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            {feature.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <p className="text-sm text-muted-foreground">
                        Powered by{' '}
                        <span className="font-medium text-foreground">
                            Neon Auth
                        </span>
                    </p>
                </div>
            </div>

            {/* Right side - Auth Form */}
            <div className="flex flex-col">
                {/* Mobile header */}
                <div className="flex items-center gap-3 p-6 lg:hidden">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                        <Building2 className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold">Trust Admin</h1>
                    </div>
                </div>

                {/* Auth form container */}
                <main className="flex flex-1 flex-col items-center justify-center p-6 md:p-10">
                    <div className="w-full max-w-md">
                        <AuthView path={path} />
                    </div>
                </main>

                {/* Footer */}
                <footer className="p-6 text-center text-sm text-muted-foreground">
                    <p>
                        Need help?{' '}
                        <a
                            href="mailto:support@thehudsonfam.com"
                            className="font-medium text-primary hover:underline"
                        >
                            Contact Support
                        </a>
                    </p>
                </footer>
            </div>
        </div>
    )
}
