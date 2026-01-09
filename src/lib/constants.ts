/**
 * Shared Constants
 *
 * Centralized select options and badge variants used across pages.
 */

// =============================================================================
// SELECT OPTIONS
// =============================================================================

export const TRANSFER_STATUS = [
  { value: "PENDING", label: "Pending" },
  { value: "STARTED", label: "Started" },
  { value: "COMPLETE", label: "Complete" },
] as const

export const DOD_VALUE_TYPES = [
  { value: "APPRAISAL", label: "Appraisal" },
  { value: "STATEMENT", label: "Statement" },
  { value: "MARKET_ESTIMATE", label: "Market Estimate" },
  { value: "TAX_ASSESSED", label: "Tax Assessed" },
] as const

export const RENTAL_STATUS = [
  { value: "RENTED", label: "Rented" },
  { value: "VACANT", label: "Vacant" },
  { value: "UNDER_RENOVATION", label: "Under Renovation" },
  { value: "LISTED", label: "Listed" },
] as const

// =============================================================================
// BADGE VARIANTS
// =============================================================================

export type BadgeVariant = "default" | "secondary" | "destructive" | "outline"

/**
 * Unified status badge variants for all asset/transfer statuses.
 * Includes all possible status values across the application.
 */
export const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  // Transfer status
  PENDING: "secondary",
  STARTED: "outline",
  COMPLETE: "default",
  // Asset status
  ACTIVE: "secondary",
  SOLD: "default",
  TRANSFERRED: "default",
  DISPOSED: "destructive",
  // Account status
  OPEN: "secondary",
  CLOSED: "outline",
  FROZEN: "destructive",
  // Rental status
  RENTED: "default",
  VACANT: "outline",
  UNDER_RENOVATION: "secondary",
  LISTED: "default",
  // Title status
  CLEAR: "default",
  LIEN: "destructive",
  // Trustee status
  CURRENT: "default",
  SUCCESSOR: "secondary",
  RESIGNED: "outline",
  REMOVED: "destructive",
  // Liability status
  UNPAID: "destructive",
  PARTIAL: "secondary",
  PAID: "default",
  DISPUTED: "outline",
}
