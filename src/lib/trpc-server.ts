/**
 * Server-side tRPC helpers for Next.js App Router Server Components.
 *
 * Usage in a page Server Component:
 *
 *   import { createTRPCHelpers } from '@/lib/trpc-server'
 *   import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
 *
 *   export default async function Page() {
 *     const helpers = await createTRPCHelpers()
 *     await helpers.liability.list.prefetch({ entityId: 1 })
 *     return (
 *       <HydrationBoundary state={dehydrate(helpers.queryClient)}>
 *         <LiabilitiesClient />
 *       </HydrationBoundary>
 *     )
 *   }
 */
import { createServerSideHelpers } from '@trpc/react-query/server'
import { headers } from 'next/headers'
import { createContext } from '@/server/trpc/init'
import { appRouter } from '@/server/trpc/router'

export async function createTRPCHelpers() {
    const headersList = await headers()
    const ctx = await createContext({ headers: headersList })
    return createServerSideHelpers({
        router: appRouter,
        ctx,
    })
}
