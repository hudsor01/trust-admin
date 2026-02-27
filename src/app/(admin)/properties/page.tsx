import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createTRPCHelpers } from '@/lib/trpc-server'
import { PropertiesClient } from './_components/PropertiesClient'

export default async function PropertiesPage() {
    const helpers = await createTRPCHelpers()
    await Promise.all([
        helpers.homestead.list.prefetch({ entityId: 1 }),
        helpers.rentalProperty.list.prefetch({ entityId: 1 }),
        helpers.entity.list.prefetch(),
    ])
    return (
        <HydrationBoundary state={dehydrate(helpers.queryClient)}>
            <PropertiesClient />
        </HydrationBoundary>
    )
}
