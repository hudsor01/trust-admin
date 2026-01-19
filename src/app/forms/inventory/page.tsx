import { hasInventoryAccess } from '../_actions/verifyAccess'
import { AccessGate } from './_components/AccessGate'
import { InventoryForm } from './_components/InventoryForm'

export const metadata = {
    title: 'Submit Inventory Item | Hudson Living Trust',
    description: 'Submit personal property items for the trust inventory',
}

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
