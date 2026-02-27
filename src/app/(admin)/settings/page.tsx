import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createTRPCHelpers } from '@/lib/trpc-server'
import { SettingsClient } from './_components/SettingsClient'

export default async function SettingsPage() {
    const helpers = await createTRPCHelpers()
    await Promise.all([
        helpers.beneficiary.list.prefetch({ entityId: 1 }),
        helpers.trustee.list.prefetch({ entityId: 1 }),
        helpers.contact.list.prefetch(),
        helpers.entity.list.prefetch(),
    ])
    return (
        <HydrationBoundary state={dehydrate(helpers.queryClient)}>
            <SettingsClient />
        </HydrationBoundary>
    )
}
