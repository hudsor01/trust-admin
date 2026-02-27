/** Sentry tracing helpers for DB queries, tRPC procedures, and business operations. */

import * as Sentry from '@sentry/nextjs'

/** Wrap a DB operation with Sentry tracing. */
export async function traceDbQuery<T>(
    name: string,
    operation: () => Promise<T>,
): Promise<T> {
    return Sentry.startSpan(
        {
            name,
            op: 'db.query',
            attributes: {
                'db.system': 'postgresql',
            },
        },
        operation,
    )
}

/** Wrap a tRPC procedure with Sentry tracing. */
export async function traceTrpcProcedure<T>(
    procedureName: string,
    operation: () => Promise<T>,
): Promise<T> {
    return Sentry.startSpan(
        {
            name: `trpc.${procedureName}`,
            op: 'rpc.server',
            attributes: {
                'rpc.system': 'trpc',
                'rpc.method': procedureName,
            },
        },
        operation,
    )
}

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

/** Capture a custom metric (distribution, in milliseconds). */
export function captureMetric(
    name: string,
    value: number,
    tags?: Record<string, string>,
) {
    if (tags) {
        for (const [key, val] of Object.entries(tags)) {
            Sentry.setTag(key, val)
        }
    }
    Sentry.metrics.distribution(name, value, {
        unit: 'millisecond',
    })
}

/** Start a timer; call the returned function to report duration to Sentry. */
export function startTimer(name: string, tags?: Record<string, string>) {
    const start = performance.now()

    return () => {
        const duration = performance.now() - start
        captureMetric(name, duration, tags)
        return duration
    }
}
