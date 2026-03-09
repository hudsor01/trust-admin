import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createTRPCHelpers } from '@/lib/trpc-server'
import { InsuranceClient } from './_components/InsuranceClient'

export default async function InsurancePage() {
    const helpers = await createTRPCHelpers()
    await Promise.all([
        helpers.insurancePolicy.list.prefetch({ entityId: 1 }),
        helpers.entity.list.prefetch(),
    ])
    return (
        <HydrationBoundary state={dehydrate(helpers.queryClient)}>
            <InsuranceClient />
        </HydrationBoundary>
    )
}
