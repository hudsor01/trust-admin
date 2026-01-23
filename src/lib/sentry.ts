/**
 * Sentry Performance Monitoring Utilities
 *
 * Use these helpers to instrument custom operations for performance tracking:
 * - Database queries (Drizzle)
 * - tRPC procedures
 * - Business operations (HEMS approval, distributions, etc.)
 */

import * as Sentry from '@sentry/nextjs'

/**
 * Wrap a database operation with Sentry tracing
 *
 * @example
 * const users = await traceDbQuery('users.findMany', async () => {
 *     return db.query.users.findMany()
 * })
 */
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

/**
 * Wrap a tRPC procedure with Sentry tracing
 *
 * @example
 * // In a tRPC router
 * list: protectedProcedure.query(async ({ ctx }) => {
 *     return traceTrpcProcedure('beneficiary.list', async () => {
 *         return beneficiaryCrud.findAll()
 *     })
 * })
 */
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

/**
 * Wrap a business operation with Sentry tracing
 * Use for critical workflows like HEMS processing, distributions, etc.
 *
 * @example
 * await traceBusinessOperation('hems.approve', { requestId: 123 }, async () => {
 *     // approval logic
 * })
 */
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

/**
 * Set user context for all subsequent Sentry events
 * Call this after authentication to attach user info to errors/traces
 *
 * @example
 * // In tRPC context creation
 * if (session?.user) {
 *     setSentryUser({
 *         id: session.user.id,
 *         email: session.user.email,
 *         role: userProfile?.role,
 *     })
 * }
 */
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

    // Add custom tags for filtering
    if (user.role) {
        Sentry.setTag('user.role', user.role)
    }
    if (user.beneficiaryId) {
        Sentry.setTag('user.beneficiaryId', String(user.beneficiaryId))
    }
}

/**
 * Clear user context (on logout)
 */
export function clearSentryUser() {
    Sentry.setUser(null)
}

/**
 * Add breadcrumb for tracking user actions
 *
 * @example
 * addBreadcrumb('user.action', 'Clicked approve HEMS request', { requestId: 123 })
 */
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

/**
 * Capture a custom metric
 * Use for tracking business KPIs like processing times
 *
 * @example
 * captureMetric('hems.approval_time_ms', approvalDurationMs, {
 *     category: 'HEALTH',
 *     amount_range: 'high',
 * })
 */
export function captureMetric(
    name: string,
    value: number,
    tags?: Record<string, string>,
) {
    // Sentry metrics API - use setTag for custom dimensions
    if (tags) {
        for (const [key, val] of Object.entries(tags)) {
            Sentry.setTag(key, val)
        }
    }
    Sentry.metrics.distribution(name, value, {
        unit: 'millisecond',
    })
}

/**
 * Measure and report a timing
 *
 * @example
 * const stopTimer = startTimer('beneficiary.share_recalculation')
 * // ... do work ...
 * stopTimer() // Reports duration to Sentry
 */
export function startTimer(name: string, tags?: Record<string, string>) {
    const start = performance.now()

    return () => {
        const duration = performance.now() - start
        captureMetric(name, duration, tags)
        return duration
    }
}
