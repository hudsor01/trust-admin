import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createTRPCHelpers } from '@/lib/trpc-server'
import { PortalClient } from './_components/PortalClient'

export default async function PortalPage() {
    const helpers = await createTRPCHelpers()
    await helpers.beneficiary.me.prefetch()
    return (
        <HydrationBoundary state={dehydrate(helpers.queryClient)}>
            <PortalClient />
        </HydrationBoundary>
    )
}
