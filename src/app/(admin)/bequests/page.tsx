import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createTRPCHelpers } from '@/lib/trpc-server'
import { BequestsClient } from './_components/BequestsClient'

export default async function BequestsPage() {
    const helpers = await createTRPCHelpers()
    await Promise.all([
        helpers.beneficiary.list.prefetch({ entityId: 1 }),
        helpers.entity.list.prefetch(),
    ])
    return (
        <HydrationBoundary state={dehydrate(helpers.queryClient)}>
            <BequestsClient />
        </HydrationBoundary>
    )
}
