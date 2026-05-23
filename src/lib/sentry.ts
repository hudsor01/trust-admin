/** Sentry tracing helpers for business operations, user context, and breadcrumbs. */

import * as Sentry from '@sentry/nextjs'

/** Wrap a business operation (HEMS, distributions, etc.) with Sentry tracing. */
export async function traceBusinessOperation<T>(
    operationName: string,
    attributes: Record<string, string | number | boolean>,
    operation: () => Promise<T>,
): Promise<T> {
    return Sentry.startSpan(
        {
            name: operationName,
            op: 'business.operation',
            attributes,
        },
        operation,
    )
}

/** Set user context on Sentry scope (call after authentication). */
export function setSentryUser(user: {
    id: string
    email?: string | null
    role?: string | null
    beneficiaryId?: number | null
}) {
    Sentry.setUser({
        id: user.id,
        email: user.email ?? undefined,
    })

    if (user.role) {
        Sentry.setTag('user.role', user.role)
    }
    if (user.beneficiaryId) {
        Sentry.setTag('user.beneficiaryId', String(user.beneficiaryId))
    }
}

/** Clear user context on logout. */
export function clearSentryUser() {
    Sentry.setUser(null)
}

/** Add breadcrumb for tracking user actions. */
export function addBreadcrumb(
    category: string,
    message: string,
    data?: Record<string, unknown>,
) {
    Sentry.addBreadcrumb({
        category,
        message,
        data,
        level: 'info',
    })
}
