import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createTRPCHelpers } from '@/lib/trpc-server'
import { BeneficiariesClient } from './_components/BeneficiariesClient'

export default async function BeneficiariesPage() {
    const helpers = await createTRPCHelpers()
    await Promise.all([
        helpers.beneficiary.listWithDistributions.prefetch({ entityId: 1 }),
        helpers.entity.list.prefetch(),
    ])
    return (
        <HydrationBoundary state={dehydrate(helpers.queryClient)}>
            <BeneficiariesClient />
        </HydrationBoundary>
    )
}
