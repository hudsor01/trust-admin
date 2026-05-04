import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createTRPCHelpers } from '@/lib/trpc-server'
import { AssetsClient } from './_components/AssetsClient'

export default async function AssetsPage() {
    const helpers = await createTRPCHelpers()
    await Promise.all([
        helpers.asset.listAll.prefetch({ entityId: 1 }),
        helpers.entity.list.prefetch(),
    ])
    return (
        <HydrationBoundary state={dehydrate(helpers.queryClient)}>
            <AssetsClient />
        </HydrationBoundary>
    )
}
