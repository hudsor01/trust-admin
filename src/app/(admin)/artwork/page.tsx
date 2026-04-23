import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createTRPCHelpers } from '@/lib/trpc-server'
import { PersonalPropertyClient } from '../personal-property/_components/PersonalPropertyClient'

export default async function ArtworkPage() {
    const helpers = await createTRPCHelpers()
    await Promise.all([
        helpers.personalProperty.list.prefetch({
            entityId: 1,
            category: 'ART',
        }),
        helpers.entity.list.prefetch(),
    ])
    return (
        <HydrationBoundary state={dehydrate(helpers.queryClient)}>
            <PersonalPropertyClient mode="artwork" />
        </HydrationBoundary>
    )
}
