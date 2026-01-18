/**
 * Type Utilities
 *
 * Type-safe casting utilities for enum values from form inputs and editable cells.
 * These ensure runtime values match the expected TypeScript types.
 */

// Import enums from schema to derive values
import {
    allocationClass,
    distributionStandard,
    distributionType,
    entityType,
    hemsRequestStatus,
    insurancePolicyType,
    liabilityType,
    paymentMethod,
    premiumFrequency,
    propertyType,
    recordStatus,
    relationshipType,
    rentalStatus,
    titleStatus,
    transactionType,
    transferStatus,
    trusteeFeeStatus,
    trusteeStatus,
    trustType,
    valuationType,
    withdrawalStatus,
} from '@/db/schema'

// Derive types from the pgEnum definitions
export type RecordStatus = (typeof recordStatus.enumValues)[number]
export type DistributionType = (typeof distributionType.enumValues)[number]
export type LiabilityType = (typeof liabilityType.enumValues)[number]
export type PaymentMethod = (typeof paymentMethod.enumValues)[number]
export type PropertyType = (typeof propertyType.enumValues)[number]
export type RentalStatus = (typeof rentalStatus.enumValues)[number]
export type TitleStatus = (typeof titleStatus.enumValues)[number]
export type TransferStatus = (typeof transferStatus.enumValues)[number]
export type DistributionStandard =
    (typeof distributionStandard.enumValues)[number]
export type TrusteeStatus = (typeof trusteeStatus.enumValues)[number]
export type AllocationClass = (typeof allocationClass.enumValues)[number]
export type ValuationType = (typeof valuationType.enumValues)[number]
export type HemsRequestStatus = (typeof hemsRequestStatus.enumValues)[number]
export type RelationshipType = (typeof relationshipType.enumValues)[number]
export type TransactionType = (typeof transactionType.enumValues)[number]
export type InsurancePolicyType =
    (typeof insurancePolicyType.enumValues)[number]
export type PremiumFrequency = (typeof premiumFrequency.enumValues)[number]
export type EntityType = (typeof entityType.enumValues)[number]
export type TrustType = (typeof trustType.enumValues)[number]
export type WithdrawalStatus = (typeof withdrawalStatus.enumValues)[number]
export type TrusteeFeeStatus = (typeof trusteeFeeStatus.enumValues)[number]

// Enum value arrays derived directly from schema (single source of truth)
export const RECORD_STATUS_VALUES = recordStatus.enumValues
export const DISTRIBUTION_TYPE_VALUES = distributionType.enumValues
export const LIABILITY_TYPE_VALUES = liabilityType.enumValues
export const PAYMENT_METHOD_VALUES = paymentMethod.enumValues
export const PROPERTY_TYPE_VALUES = propertyType.enumValues
export const RENTAL_STATUS_VALUES = rentalStatus.enumValues
export const TITLE_STATUS_VALUES = titleStatus.enumValues
export const TRANSFER_STATUS_VALUES = transferStatus.enumValues
export const DISTRIBUTION_STANDARD_VALUES = distributionStandard.enumValues
export const TRUSTEE_STATUS_VALUES = trusteeStatus.enumValues
export const ALLOCATION_CLASS_VALUES = allocationClass.enumValues
export const VALUATION_TYPE_VALUES = valuationType.enumValues
export const HEMS_REQUEST_STATUS_VALUES = hemsRequestStatus.enumValues
export const RELATIONSHIP_TYPE_VALUES = relationshipType.enumValues
export const TRANSACTION_TYPE_VALUES = transactionType.enumValues
export const INSURANCE_POLICY_TYPE_VALUES = insurancePolicyType.enumValues
export const PREMIUM_FREQUENCY_VALUES = premiumFrequency.enumValues
export const ENTITY_TYPE_VALUES = entityType.enumValues
export const TRUST_TYPE_VALUES = trustType.enumValues
export const WITHDRAWAL_STATUS_VALUES = withdrawalStatus.enumValues
export const TRUSTEE_FEE_STATUS_VALUES = trusteeFeeStatus.enumValues

/**
 * Helper to convert enum values to select options with labels
 * Transforms SCREAMING_SNAKE_CASE to Title Case
 */
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

/**
 * Type-safe cast for RecordStatus
 */
export function asRecordStatus(value: string): RecordStatus {
    return value as RecordStatus
}

/**
 * Type-safe cast for DistributionType
 */
export function asDistributionType(value: string): DistributionType {
    return value as DistributionType
}

/**
 * Type-safe cast for LiabilityType
 */
export function asLiabilityType(value: string): LiabilityType {
    return value as LiabilityType
}

/**
 * Type-safe cast for PaymentMethod
 */
export function asPaymentMethod(value: string): PaymentMethod {
    return value as PaymentMethod
}

/**
 * Type-safe cast for PropertyType
 */
export function asPropertyType(value: string): PropertyType {
    return value as PropertyType
}

/**
 * Type-safe cast for RentalStatus
 */
export function asRentalStatus(value: string): RentalStatus {
    return value as RentalStatus
}

/**
 * Type-safe cast for TitleStatus
 */
export function asTitleStatus(value: string): TitleStatus {
    return value as TitleStatus
}

/**
 * Type-safe cast for TransferStatus
 */
export function asTransferStatus(value: string): TransferStatus {
    return value as TransferStatus
}

/**
 * Type-safe cast for DistributionStandard
 */
export function asDistributionStandard(value: string): DistributionStandard {
    return value as DistributionStandard
}

/**
 * Type-safe cast for TrusteeStatus
 */
export function asTrusteeStatus(value: string): TrusteeStatus {
    return value as TrusteeStatus
}

/**
 * Type-safe cast for AllocationClass
 */
export function asAllocationClass(value: string): AllocationClass {
    return value as AllocationClass
}

/**
 * Type-safe cast for ValuationType (nullable)
 */
export function asValuationType(value: string | null): ValuationType | null {
    return value as ValuationType | null
}
