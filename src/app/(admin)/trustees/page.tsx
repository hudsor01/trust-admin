import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createTRPCHelpers } from '@/lib/trpc-server'
import { TrusteesClient } from './_components/TrusteesClient'

export default async function TrusteesPage() {
    const helpers = await createTRPCHelpers()
    await Promise.all([
        helpers.trustee.list.prefetch({ entityId: 1 }),
        helpers.entity.list.prefetch(),
    ])
    return (
        <HydrationBoundary state={dehydrate(helpers.queryClient)}>
            <TrusteesClient />
        </HydrationBoundary>
    )
}
