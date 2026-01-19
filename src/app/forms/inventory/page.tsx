import { InventoryForm } from './_components/InventoryForm'

export const metadata = {
    title: 'Submit Inventory Item | Hudson Living Trust',
    description: 'Submit personal property items for the trust inventory',
}

export default function InventoryFormPage() {
    return (
        <div className="py-8">
            <div className="max-w-2xl mx-auto text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">
                    Submit Inventory Item
                </h1>
                <p className="text-muted-foreground">
                    Help us catalog estate property by submitting items
                    you&apos;ve identified. You can optionally upload photos for
                    AI-assisted categorization.
                </p>
            </div>

            <InventoryForm />
        </div>
    )
}
