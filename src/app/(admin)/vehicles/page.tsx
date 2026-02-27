import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createTRPCHelpers } from '@/lib/trpc-server'
import { VehiclesClient } from './_components/VehiclesClient'

export default async function VehiclesPage() {
    const helpers = await createTRPCHelpers()
    await Promise.all([
        helpers.vehicle.list.prefetch({ entityId: 1 }),
        helpers.entity.list.prefetch(),
    ])
    return (
        <HydrationBoundary state={dehydrate(helpers.queryClient)}>
            <VehiclesClient />
        </HydrationBoundary>
    )
}
