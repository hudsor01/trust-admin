/** Badge variants and select options derived from schema enums. */

import {
    enumToOptions,
    RENTAL_STATUS_VALUES,
    TRANSFER_STATUS_VALUES,
    VALUATION_TYPE_VALUES,
} from './type-utils'

export const TRANSFER_STATUS = enumToOptions(TRANSFER_STATUS_VALUES)
export const RENTAL_STATUS = enumToOptions(RENTAL_STATUS_VALUES)
export const DOD_VALUE_TYPES = enumToOptions(VALUATION_TYPE_VALUES)

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

/** Unified badge variants for all status values across the app. */
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
