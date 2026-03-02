'use client'

import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { httpBatchLink } from '@trpc/client'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { trpc } from './trpc'

const ReactQueryDevtools = dynamic(
    () =>
        import('@tanstack/react-query-devtools').then((m) => ({
            default: m.ReactQueryDevtools,
        })),
    { ssr: false },
)

function getBaseUrl() {
    if (typeof window !== 'undefined') return ''
    return `http://localhost:${process.env.PORT ?? 3000}`
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // Financial data: 5 min fresh window, then background refetch.
                        // Stale data served from localStorage for up to 24h between sessions.
                        // refetchOnMount (default true) ensures fresh data on navigation.
                        staleTime: 1000 * 60 * 5,
                        gcTime: 1000 * 60 * 60 * 24,
                        retry: 1,
                        refetchOnWindowFocus: false,
                        refetchOnReconnect: false,
                    },
                },
            }),
    )

    const [trpcClient] = useState(() =>
        trpc.createClient({
            links: [
                httpBatchLink({
                    url: `${getBaseUrl()}/api/trpc`,
                    headers: () => ({}),
                }),
            ],
        }),
    )

    // Attach localStorage persistence as a side-effect (client-only).
    // This avoids a hydration mismatch: PersistQueryClientProvider would add
    // an extra provider layer on the client that doesn't exist during SSR.
    useEffect(() => {
        const persister = createSyncStoragePersister({
            storage: window.localStorage,
            key: 'trust-admin-query-cache',
        })
        const [unsubscribe] = persistQueryClient({
            queryClient,
            persister,
            maxAge: 1000 * 60 * 60 * 24, // 24 hours
            // IMPORTANT: Bump this string on any breaking change to cached tRPC query
            // shapes (e.g. renamed fields, removed queries, new required params).
            // A stale cache with the wrong shape can cause subtle hydration bugs.
            buster: 'v1',
        })
        return unsubscribe
    }, [queryClient])

    return (
        <QueryClientProvider client={queryClient}>
            <trpc.Provider client={trpcClient} queryClient={queryClient}>
                {children}
                {process.env.NODE_ENV === 'development' && (
                    <ReactQueryDevtools initialIsOpen={false} />
                )}
            </trpc.Provider>
        </QueryClientProvider>
    )
}
