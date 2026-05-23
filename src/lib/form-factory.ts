/**
 * Form Factory: default value generators and entity-to-form mappers.
 */

/** Returns fresh defaults each call. Function values are invoked for dynamic defaults. */
function createFormDefaults<T extends Record<string, unknown>>(
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

/** Extract YYYY-MM-DD from an ISO date string for form inputs. */
export function toDateInput(date: string | null | undefined): string | null {
    if (!date) return null
    return date.split('T')[0] ?? null
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

// Firearm (v5.0 Phase 30) — NOTE: nfaTransferStatus is INTENTIONALLY omitted.
// Per Phase 29 D-03, that field's only mutation path is setNfaTransferStatus
// (via NfaStatusDialog); FirearmDialog must not bind it.
export const firearmFormDefaults = createFormDefaults({
    name: '',
    description: '',
    make: '',
    model: '',
    serialNumber: '',
    firearmType: 'PISTOL',
    caliber: '',
    barrelLength: '',
    action: '',
    isNfa: false,
    nfaClass: null as string | null,
    atfFormType: null as string | null,
    atfControlNumber: '',
    taxStampDate: null as string | null,
    nfrtrSerial: '',
    nfaRegistered: null as boolean | null,
    acquisitionDate: null as string | null,
    acquisitionCost: '',
    dodValue: '',
    dodValueDate: null as string | null,
    dodValueType: '',
    condition: 'GOOD',
    status: 'ACTIVE',
    transferStatus: 'PENDING',
    location: '',
    insured: false,
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
    insured: false,
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
