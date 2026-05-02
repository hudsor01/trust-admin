/**
 * Pure RBAC role types and guards.
 *
 * Lives in its own module (no `auth/client` or `auth/server` imports) so it
 * can be imported anywhere — including unit tests — without triggering Better
 * Auth client init (which requires a base URL the test process doesn't set).
 *
 * The barrel `@/lib/auth` re-exports everything here for backward compat.
 */

/** App role precedence (highest → lowest privilege):
 *   admin    — full access including user management
 *   trustee  — trust administration (no user management)
 *   arbiter  — trust administration (no user management)
 *   beneficiary — own beneficiary record only
 *   user     — fallback when no profile exists (no access)
 */
export type AppRole = 'admin' | 'trustee' | 'arbiter' | 'beneficiary' | 'user'

/** Roles that can administer the trust (everything except user management). */
export const TRUST_ADMIN_ROLES = ['admin', 'trustee', 'arbiter'] as const
export type TrustAdminRole = (typeof TRUST_ADMIN_ROLES)[number]

export function isTrustAdmin(user: { role: AppRole }): boolean {
    return (TRUST_ADMIN_ROLES as readonly string[]).includes(user.role)
}

/** Strict admin check — excludes trustee/arbiter. Use for user-management gates. */
export function isAdmin(user: { role: AppRole }): boolean {
    return user.role === 'admin'
}

export function isBeneficiary<
    T extends { role: AppRole; beneficiaryId?: number | null },
>(user: T): user is T & { role: 'beneficiary'; beneficiaryId: number } {
    return user.role === 'beneficiary' && !!user.beneficiaryId
}

/**
 * Reconciles user_profile.beneficiary_id against a target role.
 *
 * The column is only meaningful when role = 'beneficiary' — `app.is_admin()`
 * is the gate for trust-admin roles, and `app.get_user_beneficiary_id()`
 * reads this column expecting it to be NULL for anyone who isn't a
 * beneficiary. Setting a role to admin/trustee/arbiter therefore drops any
 * pre-existing link; setting it back to beneficiary preserves whatever the
 * caller passed in.
 */
export function reconcileBeneficiaryId(
    targetRole: AppRole,
    existingBeneficiaryId: number | null | undefined,
): number | null {
    return targetRole === 'beneficiary' ? (existingBeneficiaryId ?? null) : null
}
