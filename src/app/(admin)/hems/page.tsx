import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createTRPCHelpers } from '@/lib/trpc-server'
import { HemsClient } from './_components/HemsClient'

export default async function HemsPage() {
    const helpers = await createTRPCHelpers()
    await Promise.all([
        helpers.beneficiary.list.prefetch({ entityId: 1 }),
        helpers.distribution.list.prefetch({ entityId: 1 }),
        helpers.withdrawalRecord.list.prefetch({ entityId: 1 }),
    ])
    return (
        <HydrationBoundary state={dehydrate(helpers.queryClient)}>
            <HemsClient />
        </HydrationBoundary>
    )
}
