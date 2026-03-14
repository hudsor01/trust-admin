import { enumToOptions, RECORD_STATUS_VALUES } from '@/lib/type-utils'

export const ASSET_STATUS = enumToOptions(RECORD_STATUS_VALUES, (v) =>
    ['ACTIVE', 'SOLD', 'TRANSFERRED', 'DISPOSED'].includes(v),
)

export interface HomesteadFormData {
    streetAddress: string
    city: string
    state: string
    zip: string
    county: string
    dodValue: string
    dodValueDate: string
    dodValueType: string
    status: string
    transferStatus: string
    notes: string
}

export interface RentalFormData {
    name: string
    streetAddress: string
    city: string
    state: string
    zip: string
    county: string
    rentalStatus: string
    monthlyRent: string
    leaseStart: string
    leaseEnd: string
    propertyManager: string
    dodValue: string
    dodValueDate: string
    dodValueType: string
    status: string
    transferStatus: string
    notes: string
}
