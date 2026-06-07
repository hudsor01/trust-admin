import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createTRPCHelpers } from '@/lib/trpc-server'
import { ReceivablesClient } from './_components/ReceivablesClient'

export default async function ReceivablesPage() {
    const helpers = await createTRPCHelpers()
    await Promise.all([
        helpers.noteReceivable.list.prefetch({ entityId: 1 }),
        helpers.bankAccount.list.prefetch({ entityId: 1 }),
        helpers.beneficiary.list.prefetch({ entityId: 1 }),
        helpers.entity.list.prefetch(),
    ])
    return (
        <HydrationBoundary state={dehydrate(helpers.queryClient)}>
            <ReceivablesClient />
        </HydrationBoundary>
    )
}
