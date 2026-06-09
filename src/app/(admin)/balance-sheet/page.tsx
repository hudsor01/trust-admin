import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createTRPCHelpers } from '@/lib/trpc-server'
import { BalanceSheetClient } from './_components/BalanceSheetClient'

export default async function BalanceSheetPage() {
    const helpers = await createTRPCHelpers()
    await Promise.all([
        helpers.balanceSheet.listAll.prefetch({ entityId: 1 }),
        helpers.entity.list.prefetch(),
    ])
    return (
        <HydrationBoundary state={dehydrate(helpers.queryClient)}>
            <BalanceSheetClient />
        </HydrationBoundary>
    )
}
