import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createTRPCHelpers } from '@/lib/trpc-server'
import { InventoryQueueClient } from './_components/InventoryQueueClient'

export default async function InventoryQueuePage() {
    const helpers = await createTRPCHelpers()
    await helpers.pendingInventoryItem.list.prefetch()
    return (
        <HydrationBoundary state={dehydrate(helpers.queryClient)}>
            <InventoryQueueClient />
        </HydrationBoundary>
    )
}
