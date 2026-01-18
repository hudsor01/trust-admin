import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { Toaster } from 'sonner'
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

export const metadata: Metadata = {
    title: 'Trust Admin',
    description: 'Trust administration application for the Hudson Living Trust',
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en">
            <body
                className={`${geist.variable} ${geistMono.variable} antialiased`}
            >
                <NuqsAdapter>
                    <TRPCProvider>
                        {children}
                        <Toaster
                            richColors
                            position="bottom-right"
                            toastOptions={{ style: { width: 'fit-content' } }}
                        />
                    </TRPCProvider>
                </NuqsAdapter>
            </body>
        </html>
    )
}
