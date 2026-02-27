import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createTRPCHelpers } from '@/lib/trpc-server'
import { ActivityLogClient } from './_components/ActivityLogClient'

export default async function ActivityLogPage() {
    const helpers = await createTRPCHelpers()
    await helpers.activityLog.list.prefetch({})
    return (
        <HydrationBoundary state={dehydrate(helpers.queryClient)}>
            <ActivityLogClient />
        </HydrationBoundary>
    )
}
