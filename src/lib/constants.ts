/**
 * Shared Constants
 *
 * Badge variants and non-enum constants.
 * For enum-based select options, use enumToOptions() from @/lib/type-utils
 */

import {
    enumToOptions,
    RENTAL_STATUS_VALUES,
    TRANSFER_STATUS_VALUES,
    VALUATION_TYPE_VALUES,
} from './type-utils'

// =============================================================================
// AUTH
// =============================================================================

/**
 * The trust owner's email address.
 * This user has elevated privileges for user management.
 */
export const OWNER_EMAIL = 'rhudsontspr@gmail.com' as const

// =============================================================================
// SELECT OPTIONS (derived from schema enums)
// =============================================================================

export const TRANSFER_STATUS = enumToOptions(TRANSFER_STATUS_VALUES)
export const RENTAL_STATUS = enumToOptions(RENTAL_STATUS_VALUES)
export const DOD_VALUE_TYPES = enumToOptions(VALUATION_TYPE_VALUES)

// =============================================================================
// BADGE VARIANTS
// =============================================================================

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

/**
 * Unified status badge variants for all asset/transfer statuses.
 * Includes all possible status values across the application.
 */
export const STATUS_VARIANTS: Record<string, BadgeVariant> = {
    // Transfer status
    PENDING: 'secondary',
    STARTED: 'outline',
    COMPLETE: 'default',
    // Asset status
    ACTIVE: 'secondary',
    SOLD: 'default',
    TRANSFERRED: 'default',
    DISPOSED: 'destructive',
    // Account status
    OPEN: 'secondary',
    CLOSED: 'outline',
    FROZEN: 'destructive',
    // Rental status
    RENTED: 'default',
    VACANT: 'outline',
    UNDER_RENOVATION: 'secondary',
    LISTED: 'default',
    // Title status
    CLEAR: 'default',
    LIEN: 'destructive',
    // Trustee status
    CURRENT: 'default',
    SUCCESSOR: 'secondary',
    RESIGNED: 'outline',
    REMOVED: 'destructive',
    // Liability status
    UNPAID: 'destructive',
    PARTIAL: 'secondary',
    PAID: 'default',
    DISPUTED: 'outline',
}
