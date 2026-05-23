/** Type-safe enum casts for form inputs and editable cells. */

import {
    allocationClass,
    insurancePolicyType,
    liabilityType,
    paymentMethod,
    personalPropertyCategory,
    premiumFrequency,
    recordStatus,
    rentalStatus,
    titleStatus,
    transferStatus,
    trusteeStatus,
    valuationType,
} from '@/db/schema'

export type RecordStatus = (typeof recordStatus.enumValues)[number]
export type LiabilityType = (typeof liabilityType.enumValues)[number]
export type PaymentMethod = (typeof paymentMethod.enumValues)[number]
export type RentalStatus = (typeof rentalStatus.enumValues)[number]
export type TitleStatus = (typeof titleStatus.enumValues)[number]
export type TransferStatus = (typeof transferStatus.enumValues)[number]
export type TrusteeStatus = (typeof trusteeStatus.enumValues)[number]
export type AllocationClass = (typeof allocationClass.enumValues)[number]
export type ValuationType = (typeof valuationType.enumValues)[number]
export type InsurancePolicyType =
    (typeof insurancePolicyType.enumValues)[number]
export type PremiumFrequency = (typeof premiumFrequency.enumValues)[number]
export type PersonalPropertyCategory =
    (typeof personalPropertyCategory.enumValues)[number]

export const RECORD_STATUS_VALUES = recordStatus.enumValues
export const LIABILITY_TYPE_VALUES = liabilityType.enumValues
export const PAYMENT_METHOD_VALUES = paymentMethod.enumValues
export const RENTAL_STATUS_VALUES = rentalStatus.enumValues
export const TITLE_STATUS_VALUES = titleStatus.enumValues
export const TRANSFER_STATUS_VALUES = transferStatus.enumValues
export const TRUSTEE_STATUS_VALUES = trusteeStatus.enumValues
export const ALLOCATION_CLASS_VALUES = allocationClass.enumValues
export const VALUATION_TYPE_VALUES = valuationType.enumValues
export const INSURANCE_POLICY_TYPE_VALUES = insurancePolicyType.enumValues
export const PREMIUM_FREQUENCY_VALUES = premiumFrequency.enumValues
export const PERSONAL_PROPERTY_CATEGORY_VALUES =
    personalPropertyCategory.enumValues

/** Convert enum values to select options (SCREAMING_SNAKE -> Title Case). */
export function enumToOptions<T extends readonly string[]>(
    values: T,
    filter?: (value: T[number]) => boolean,
): { value: T[number]; label: string }[] {
    const toLabel = (value: string) =>
        value
            .split('_')
            .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
            .join(' ')

    return values
        .filter((v) => (filter ? filter(v) : true))
        .map((value) => ({ value, label: toLabel(value) }))
}

/** Validate that a string is a member of an enum's values array. Throws on invalid input. */
function validateEnum<T extends string>(
    value: string,
    values: readonly T[],
    enumName: string,
): T {
    if ((values as readonly string[]).includes(value)) {
        return value as T
    }
    throw new Error(
        `Invalid ${enumName}: "${value}". Expected one of: ${values.join(', ')}`,
    )
}

export function asRecordStatus(value: string): RecordStatus {
    return validateEnum(value, RECORD_STATUS_VALUES, 'RecordStatus')
}

export function asLiabilityType(value: string): LiabilityType {
    return validateEnum(value, LIABILITY_TYPE_VALUES, 'LiabilityType')
}

export function asPaymentMethod(value: string): PaymentMethod {
    return validateEnum(value, PAYMENT_METHOD_VALUES, 'PaymentMethod')
}

export function asRentalStatus(value: string): RentalStatus {
    return validateEnum(value, RENTAL_STATUS_VALUES, 'RentalStatus')
}

export function asTitleStatus(value: string): TitleStatus {
    return validateEnum(value, TITLE_STATUS_VALUES, 'TitleStatus')
}

export function asTransferStatus(value: string): TransferStatus {
    return validateEnum(value, TRANSFER_STATUS_VALUES, 'TransferStatus')
}

export function asTrusteeStatus(value: string): TrusteeStatus {
    return validateEnum(value, TRUSTEE_STATUS_VALUES, 'TrusteeStatus')
}

export function asValuationType(value: string | null): ValuationType | null {
    if (value === null) return null
    return validateEnum(value, VALUATION_TYPE_VALUES, 'ValuationType')
}

export function asInsurancePolicyType(value: string): InsurancePolicyType {
    return validateEnum(
        value,
        INSURANCE_POLICY_TYPE_VALUES,
        'InsurancePolicyType',
    )
}

export function asPremiumFrequency(
    value: string | null,
): PremiumFrequency | null {
    if (value === null) return null
    return validateEnum(value, PREMIUM_FREQUENCY_VALUES, 'PremiumFrequency')
}

export function asPersonalPropertyCategory(
    value: string,
): PersonalPropertyCategory {
    return validateEnum(
        value,
        PERSONAL_PROPERTY_CATEGORY_VALUES,
        'PersonalPropertyCategory',
    )
}
