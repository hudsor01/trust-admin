import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createTRPCHelpers } from '@/lib/trpc-server'
import { LiabilitiesClient } from './_components/LiabilitiesClient'

export default async function LiabilitiesPage() {
    const helpers = await createTRPCHelpers()
    await Promise.all([
        helpers.liability.list.prefetch({ entityId: 1 }),
        helpers.entity.list.prefetch(),
    ])
    return (
        <HydrationBoundary state={dehydrate(helpers.queryClient)}>
            <LiabilitiesClient />
        </HydrationBoundary>
    )
}
