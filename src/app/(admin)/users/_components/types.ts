import type { UserRoleEnum } from '@/db/schema'

export type NeonAuthUser = {
    id: string
    name: string | null
    email: string
    emailVerified: boolean
    image?: string | null
    createdAt: string
    neonRole: string | null
    banned: boolean
    banReason?: string | null
    banExpires?: string | null
    appRole: string | null
    beneficiaryId: number | null
    beneficiaryName: string | null
}

/** Roles assignable from the admin Users page (mirrors db UserRole enum). */
export type AppRoleOption = UserRoleEnum

/**
 * Display options for the role <Select> in both Create and Change-Role
 * dialogs. The label copy can't be derived from the pgEnum (it's
 * intentional human prose), but having it once keeps the two dialogs
 * from drifting.
 */
export const ROLE_OPTIONS: ReadonlyArray<{
    value: AppRoleOption
    label: string
}> = [
    { value: 'admin', label: 'Admin (full access)' },
    { value: 'trustee', label: 'Trustee (trust admin, no user mgmt)' },
    { value: 'arbiter', label: 'Arbiter (trust admin, no user mgmt)' },
    { value: 'beneficiary', label: 'Beneficiary (own info only)' },
]

/** Beneficiary records eligible to attach as the linked record on a portal account. */
export type LinkableBeneficiary = {
    id: number
    firstName: string
    lastName: string
}
