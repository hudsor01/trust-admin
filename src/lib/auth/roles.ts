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
