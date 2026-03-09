import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createTRPCHelpers } from '@/lib/trpc-server'
import { ArtworkClient } from './_components/ArtworkClient'

export default async function ArtworkPage() {
    const helpers = await createTRPCHelpers()
    await Promise.all([
        helpers.artwork.list.prefetch({ entityId: 1 }),
        helpers.entity.list.prefetch(),
    ])
    return (
        <HydrationBoundary state={dehydrate(helpers.queryClient)}>
            <ArtworkClient />
        </HydrationBoundary>
    )
}
