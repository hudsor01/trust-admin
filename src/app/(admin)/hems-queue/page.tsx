import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createTRPCHelpers } from '@/lib/trpc-server'
import { HemsQueueClient } from './_components/HemsQueueClient'

export default async function HemsQueuePage() {
    const helpers = await createTRPCHelpers()
    await Promise.all([
        helpers.hemsRequest.listWithBeneficiary.prefetch({ entityId: 1 }),
        helpers.beneficiary.list.prefetch({ entityId: 1 }),
        helpers.entity.list.prefetch(),
    ])
    return (
        <HydrationBoundary state={dehydrate(helpers.queryClient)}>
            <HemsQueueClient />
        </HydrationBoundary>
    )
}
