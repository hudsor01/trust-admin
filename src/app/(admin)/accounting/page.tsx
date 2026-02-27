import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createTRPCHelpers } from '@/lib/trpc-server'
import { AccountingClient } from './_components/AccountingClient'

export default async function AccountingPage() {
    const helpers = await createTRPCHelpers()
    await Promise.all([
        helpers.trustAccounting.list.prefetch({ entityId: 1 }),
        helpers.entity.list.prefetch(),
    ])
    return (
        <HydrationBoundary state={dehydrate(helpers.queryClient)}>
            <AccountingClient />
        </HydrationBoundary>
    )
}
