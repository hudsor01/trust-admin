import { hasInventoryAccess } from '@/lib/inventory-access'
import { AccessGate } from './_components/AccessGate'
import { InventoryForm } from './_components/InventoryForm'

export const metadata = {
    title: 'Submit Inventory Item | Hudson Living Trust',
    description: 'Submit personal property items for the trust inventory',
}

// hasInventoryAccess short-circuits on env.INVENTORY_ACCESS_CODE before
// touching cookies(). When the env var is unset at build time, Next.js
// observes no dynamic dependency and prerenders this page as the gate.
// The cached HTML is then served forever (s-maxage=31536000) regardless
// of the actual access cookie — every authenticated user sees the gate.
export const dynamic = 'force-dynamic'

export default async function InventoryFormPage() {
    const hasAccess = await hasInventoryAccess()

    if (!hasAccess) {
        return <AccessGate />
    }

    return (
        <div className="py-8">
            <div className="max-w-2xl mx-auto text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">
                    Submit Inventory Item
                </h1>
                <p className="text-muted-foreground">
                    Help us catalog estate property by submitting items
                    you&apos;ve identified. Upload photos for AI-assisted
                    identification and valuation.
                </p>
            </div>

            <InventoryForm />
        </div>
    )
}
