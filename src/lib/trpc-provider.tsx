/**
 * tRPC Provider
 *
 * Wraps the app with tRPC and React Query providers.
 * Must be used in a Client Component.
 */
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { httpBatchLink } from '@trpc/client'
import { useState } from 'react'
import { trpc } from './trpc'

function getBaseUrl() {
    if (typeof window !== 'undefined') {
        // Browser - use relative URL
        return ''
    }
    // SSR - use localhost
    return `http://localhost:${process.env.PORT ?? 3000}`
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // 30 seconds - balances financial freshness with reduced refetches
                        staleTime: 1000 * 30,
                        // 10 minutes - keep cached data longer for navigation performance
                        gcTime: 1000 * 60 * 10,
                        // Already disabled - prevent refetches on window focus
                        refetchOnWindowFocus: false,
                    },
                },
            }),
    )

    const [trpcClient] = useState(() =>
        trpc.createClient({
            links: [
                httpBatchLink({
                    url: `${getBaseUrl()}/api/trpc`,
                    headers: () => {
                        // Include cookies for auth
                        return {}
                    },
                }),
            ],
        }),
    )

    return (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
                {children}
                {process.env.NODE_ENV === 'development' && (
                    <ReactQueryDevtools initialIsOpen={false} />
                )}
            </QueryClientProvider>
        </trpc.Provider>
    )
}
