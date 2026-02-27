import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createTRPCHelpers } from '@/lib/trpc-server'
import { ContactsClient } from './_components/ContactsClient'

export default async function ContactsPage() {
    const helpers = await createTRPCHelpers()
    await helpers.contact.list.prefetch()
    return (
        <HydrationBoundary state={dehydrate(helpers.queryClient)}>
            <ContactsClient />
        </HydrationBoundary>
    )
}
