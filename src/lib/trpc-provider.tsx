'use client'

import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { QueryClient } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import {
    type Persister,
    PersistQueryClientProvider,
} from '@tanstack/react-query-persist-client'
import { httpBatchLink } from '@trpc/client'
import { useState } from 'react'
import { trpc } from './trpc'

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
                        staleTime: 1000 * 60 * 5, // 5 min
                        gcTime: 1000 * 60 * 60 * 24, // 24 hrs — persist across sessions
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

    const [persister] = useState<Persister | null>(() => {
        if (typeof window === 'undefined') return null
        return createSyncStoragePersister({
            storage: window.localStorage,
            key: 'trust-admin-query-cache',
        })
    })

    const inner = (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            {children}
            {process.env.NODE_ENV === 'development' && (
                <ReactQueryDevtools initialIsOpen={false} />
            )}
        </trpc.Provider>
    )

    if (!persister) {
        return (
            <trpc.Provider client={trpcClient} queryClient={queryClient}>
                {children}
            </trpc.Provider>
        )
    }

    return (
        <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{
                persister,
                maxAge: 1000 * 60 * 60 * 24, // 24 hours
                buster: 'v1',
            }}
        >
            {inner}
        </PersistQueryClientProvider>
    )
}
