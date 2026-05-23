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
    // NFA Form 5 transfer status (Phase 30)
    NOT_FILED: 'secondary',
    FILED: 'outline',
    APPROVED: 'default',
    // Firearm condition (NRA grading scale) (Phase 30)
    POOR: 'destructive',
    FAIR: 'outline',
    GOOD: 'secondary',
    VERY_GOOD: 'outline',
    EXCELLENT: 'default',
    NEW: 'default',
}

/** Firearm UI labels (Phase 30) — colocated here for cross-component reuse. */
export const FIREARM_TYPE_LABELS: Record<string, string> = {
    PISTOL: 'Pistol',
    REVOLVER: 'Revolver',
    RIFLE: 'Rifle',
    SHOTGUN: 'Shotgun',
    SUPPRESSOR: 'Suppressor',
    SBR: 'SBR (Short-Barreled Rifle)',
    SBS: 'SBS (Short-Barreled Shotgun)',
    MACHINE_GUN: 'Machine Gun',
    AOW: 'AOW (Any Other Weapon)',
    DESTRUCTIVE_DEVICE: 'Destructive Device',
    OTHER: 'Other',
}

export const NFA_CLASS_LABELS: Record<string, string> = {
    SUPPRESSOR: 'Suppressor',
    SBR: 'SBR',
    SBS: 'SBS',
    MACHINE_GUN: 'Machine Gun',
    AOW: 'AOW',
    DESTRUCTIVE_DEVICE: 'Destructive Device',
}

export const ATF_FORM_TYPE_LABELS: Record<string, string> = {
    FORM_1: 'Form 1 (Make NFA)',
    FORM_4: 'Form 4 (Tax-Paid Transfer)',
    FORM_5: 'Form 5 (Tax-Exempt Heir Transfer)',
}

export const CONDITION_LABELS: Record<string, string> = {
    POOR: 'Poor',
    FAIR: 'Fair',
    GOOD: 'Good',
    VERY_GOOD: 'Very Good',
    EXCELLENT: 'Excellent',
    NEW: 'New',
}

export const NFA_TRANSFER_STATUS_LABELS: Record<string, string> = {
    NOT_FILED: 'Not Filed',
    FILED: 'Filed — Awaiting ATF',
    APPROVED: 'Approved',
}
