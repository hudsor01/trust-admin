import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createTRPCHelpers } from '@/lib/trpc-server'
import { AccountsClient } from './_components/AccountsClient'

export default async function AccountsPage() {
    const helpers = await createTRPCHelpers()
    await Promise.all([
        helpers.bankAccount.list.prefetch({ entityId: 1 }),
        helpers.investmentAccount.list.prefetch({ entityId: 1 }),
        helpers.entity.list.prefetch(),
    ])
    return (
        <HydrationBoundary state={dehydrate(helpers.queryClient)}>
            <AccountsClient />
        </HydrationBoundary>
    )
}
