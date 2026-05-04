/**
 * Form Factory: default value generators, reset functions, and entity-to-form mappers.
 */

/** Returns fresh defaults each call. Function values are invoked for dynamic defaults. */
export function createFormDefaults<T extends Record<string, unknown>>(
    defaults: { [K in keyof T]: T[K] | (() => T[K]) },
): () => T {
    return () => {
        const result = {} as T
        for (const key in defaults) {
            const value = defaults[key]
            result[key] = (
                typeof value === 'function'
                    ? (value as () => T[typeof key])()
                    : value
            ) as T[typeof key]
        }
        return result
    }
}

/** Maps a DB entity to form values using per-field transform functions. */
export function createEntityMapper<E, F extends Record<string, unknown>>(
    mappers: { [K in keyof F]: (entity: E) => F[K] },
): (entity: E) => F {
    return (entity: E) => {
        const result = {} as F
        for (const key in mappers) {
            result[key] = mappers[key](entity)
        }
        return result
    }
}

/** Extract YYYY-MM-DD from an ISO date string for form inputs. */
export function toDateInput(date: string | null | undefined): string | null {
    if (!date) return null
    return date.split('T')[0] ?? null
}

/** Parse a number string, returning null for empty/NaN. */
export function toNumberOrNull(
    value: string | null | undefined,
): number | null {
    if (!value || value.trim() === '') return null
    const num = parseFloat(value)
    return Number.isNaN(num) ? null : num
}

/** Convert empty/whitespace strings to null. */
export function emptyToNull(value: string | null | undefined): string | null {
    if (!value || value.trim() === '') return null
    return value
}

// =============================================================================
// PRE-BUILT FORM DEFAULTS
// =============================================================================

export const vehicleFormDefaults = createFormDefaults({
    name: '',
    description: '',
    year: () => new Date().getFullYear(),
    make: '',
    model: '',
    vin: '',
    color: '',
    licensePlate: '',
    mileage: null as number | null,
    titleStatus: 'CLEAR',
    acquisitionDate: null as string | null,
    acquisitionCost: '',
    dodValue: '',
    dodValueDate: null as string | null,
    dodValueType: '',
    status: 'ACTIVE',
    transferStatus: 'PENDING',
    notes: '',
})

export const bankAccountFormDefaults = createFormDefaults({
    name: '',
    description: '',
    institution: '',
    accountType: 'CHECKING',
    accountName: '',
    accountNumber: '',
    routingNumber: '',
    dodValue: '',
    dodValueDate: null as string | null,
    status: 'OPEN',
    transferStatus: 'PENDING',
    notes: '',
})

export const investmentAccountFormDefaults = createFormDefaults({
    name: '',
    description: '',
    institution: '',
    accountType: 'BROKERAGE',
    accountName: '',
    accountNumber: '',
    dodValue: '',
    dodValueDate: null as string | null,
    costBasis: '',
    status: 'OPEN',
    transferStatus: 'PENDING',
    notes: '',
})

export const homesteadFormDefaults = createFormDefaults({
    name: '',
    description: '',
    streetAddress: '',
    city: '',
    state: '',
    zip: '',
    county: '',
    propertyType: 'SINGLE_FAMILY',
    yearBuilt: null as number | null,
    squareFeet: null as number | null,
    bedrooms: null as number | null,
    bathrooms: '',
    acquisitionDate: null as string | null,
    acquisitionCost: '',
    dodValue: '',
    dodValueDate: null as string | null,
    status: 'ACTIVE',
    transferStatus: 'PENDING',
    notes: '',
})

export const rentalPropertyFormDefaults = createFormDefaults({
    name: '',
    description: '',
    streetAddress: '',
    city: '',
    state: '',
    zip: '',
    propertyType: 'SINGLE_FAMILY',
    units: null as number | null,
    squareFeet: null as number | null,
    monthlyRent: '',
    rentalStatus: 'RENTED',
    acquisitionDate: null as string | null,
    acquisitionCost: '',
    dodValue: '',
    dodValueDate: null as string | null,
    status: 'ACTIVE',
    transferStatus: 'PENDING',
    notes: '',
})

export const trusteeFormDefaults = createFormDefaults({
    name: '',
    status: 'ACTIVE',
    order: 1,
    isCo: false,
    startDate: null as string | null,
    endDate: null as string | null,
})

export const contactFormDefaults = createFormDefaults({
    name: '',
    company: '',
    role: '',
    email: '',
    phone: '',
    streetAddress: '',
    city: '',
    state: '',
    zip: '',
    notes: '',
    licenseNo: '',
    barNo: '',
})

export const artworkFormDefaults = createFormDefaults({
    title: '',
    artist: '',
    medium: '',
    dimensions: '',
    acquisitionDate: null as string | null,
    acquisitionCost: '',
    location: '',
    dodValue: '',
    dodValueDate: null as string | null,
    dodValueType: '',
    status: 'ACTIVE',
    transferStatus: 'PENDING',
    notes: '',
})

export const personalPropertyFormDefaults = createFormDefaults({
    name: '',
    description: '',
    category: 'OTHER',
    location: '',
    acquisitionDate: null as string | null,
    acquisitionCost: '',
    dodValue: '',
    dodValueDate: null as string | null,
    dodValueType: '',
    status: 'ACTIVE',
    transferStatus: 'PENDING',
    notes: '',
})

export const insurancePolicyFormDefaults = createFormDefaults({
    name: '',
    description: '',
    policyType: 'LIFE',
    carrier: '',
    policyNumber: '',
    coverageAmount: '',
    premium: '',
    premiumFrequency: '' as string,
    effectiveDate: null as string | null,
    expirationDate: null as string | null,
    insuredAsset: '',
    beneficiaries: '',
    status: 'ACTIVE',
    notes: '',
})

export const beneficiaryFormDefaults = createFormDefaults({
    firstName: '',
    lastName: '',
    relationship: '',
    relationshipType: '',
    dob: null as string | null,
    email: '',
    phone: '',
    streetAddress: '',
    city: '',
    state: '',
    zip: '',
    sharePercent: '',
    distributionStandard: 'HEMS',
})
