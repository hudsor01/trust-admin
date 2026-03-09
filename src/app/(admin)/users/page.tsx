import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createTRPCHelpers } from '@/lib/trpc-server'
import { UsersClient } from './_components/UsersClient'

export default async function UsersPage() {
    const helpers = await createTRPCHelpers()
    await Promise.all([
        helpers.userManagement.isOwner.prefetch(),
        helpers.userManagement.listAllUsers.prefetch(),
        helpers.beneficiary.list.prefetch({ entityId: 1 }),
    ])
    return (
        <HydrationBoundary state={dehydrate(helpers.queryClient)}>
            <UsersClient />
        </HydrationBoundary>
    )
}
