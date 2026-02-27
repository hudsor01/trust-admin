import {
    enumToOptions,
    PROPERTY_TYPE_VALUES,
    RECORD_STATUS_VALUES,
} from '@/lib/type-utils'

export const PROPERTY_TYPES = enumToOptions(PROPERTY_TYPE_VALUES)
export const ASSET_STATUS = enumToOptions(RECORD_STATUS_VALUES, (v) =>
    ['ACTIVE', 'SOLD', 'TRANSFERRED', 'DISPOSED'].includes(v),
)

export interface HomesteadFormData {
    streetAddress: string
    city: string
    state: string
    zip: string
    county: string
    parcelNumber: string
    legalDescription: string
    propertyType: string
    yearBuilt: string
    squareFeet: string
    lotSizeAcres: string
    bedrooms: string
    bathrooms: string
    acquisitionDate: string
    acquisitionCost: string
    dodValue: string
    dodValueDate: string
    dodValueType: string
    dodAffidavitFiled: boolean
    dodAffidavitDate: string
    clerkFileNo: string
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
    parcelNumber: string
    propertyType: string
    units: string
    squareFeet: string
    lotSizeAcres: string
    yearBuilt: string
    rentalStatus: string
    monthlyRent: string
    leaseStart: string
    leaseEnd: string
    propertyManager: string
    acquisitionDate: string
    acquisitionCost: string
    mortgageBalance: string
    dodValue: string
    dodValueDate: string
    dodValueType: string
    dodAffidavitFiled: boolean
    dodAffidavitDate: string
    clerkFileNo: string
    status: string
    transferStatus: string
    notes: string
}
