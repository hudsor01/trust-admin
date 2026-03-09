import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createTRPCHelpers } from '@/lib/trpc-server'
import { PersonalPropertyClient } from './_components/PersonalPropertyClient'

export default async function PersonalPropertyPage() {
    const helpers = await createTRPCHelpers()
    await Promise.all([
        helpers.personalProperty.list.prefetch({ entityId: 1 }),
        helpers.entity.list.prefetch(),
    ])
    return (
        <HydrationBoundary state={dehydrate(helpers.queryClient)}>
            <PersonalPropertyClient />
        </HydrationBoundary>
    )
}
