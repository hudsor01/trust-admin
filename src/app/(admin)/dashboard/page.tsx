import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createTRPCHelpers } from '@/lib/trpc-server'
import { DashboardClient } from './_components/DashboardClient'

export default async function DashboardPage() {
    const helpers = await createTRPCHelpers()
    await Promise.all([
        helpers.dashboard.summary.prefetch({ entityId: 1 }),
        helpers.dashboard.summaryTotals.prefetch({ entityId: 1 }),
        helpers.entity.list.prefetch(),
    ])
    return (
        <HydrationBoundary state={dehydrate(helpers.queryClient)}>
            <DashboardClient />
        </HydrationBoundary>
    )
}
