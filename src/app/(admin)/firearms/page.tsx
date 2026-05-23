import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createTRPCHelpers } from '@/lib/trpc-server'
import { FirearmsClient } from './_components/FirearmsClient'

export default async function FirearmsPage() {
    const helpers = await createTRPCHelpers()
    await Promise.all([
        helpers.firearm.list.prefetch({ entityId: 1 }),
        helpers.entity.list.prefetch(),
    ])
    return (
        <HydrationBoundary state={dehydrate(helpers.queryClient)}>
            <FirearmsClient />
        </HydrationBoundary>
    )
}
