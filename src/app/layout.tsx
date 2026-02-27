import { NeonAuthUIProvider } from '@neondatabase/auth/react'
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { Toaster } from 'sonner'
import { authClient } from '@/lib/auth/client'
import { env } from '@/lib/env'
import { TRPCProvider } from '@/lib/trpc-provider'
import './globals.css'

const geist = Geist({
    variable: '--font-sans',
    subsets: ['latin'],
})

const geistMono = Geist_Mono({
    variable: '--font-mono',
    subsets: ['latin'],
})

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: 'Trust Admin',
        description:
            'Trust administration application for the Hudson Living Trust',
        other: {
            ...Sentry.getTraceData(),
        },
    }
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body
                className={`${geist.variable} ${geistMono.variable} antialiased`}
            >
                <NuqsAdapter>
                    <TRPCProvider>
                        <NeonAuthUIProvider
                            authClient={authClient}
                            redirectTo="/dashboard"
                            baseURL={env.NEXT_PUBLIC_APP_URL ?? ''}
                            emailOTP
                            credentials
                        >
                            {children}
                            <Toaster
                                richColors
                                position="bottom-right"
                                toastOptions={{
                                    style: { width: 'fit-content' },
                                }}
                            />
                        </NeonAuthUIProvider>
                    </TRPCProvider>
                </NuqsAdapter>
            </body>
        </html>
    )
}
