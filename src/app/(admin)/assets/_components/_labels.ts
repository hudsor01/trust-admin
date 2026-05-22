import type { AssetKind } from '@/server/trpc/routers/asset'

// Display labels for the AssetKind discriminator. Shared between the table
// (Type filter + cell renderer) and the CSV export so the two can't drift.
export const KIND_LABELS: Record<AssetKind, string> = {
    vehicle: 'Vehicle',
    homestead: 'Homestead',
    rentalProperty: 'Rental Property',
    bankAccount: 'Bank Account',
    investmentAccount: 'Investment',
    personalProperty: 'Personal Property',
    insurancePolicy: 'Insurance',
    firearm: 'Firearm',
}
