import * as Sentry from '@sentry/nextjs'
import { after } from 'next/server'
import { db } from '@/db'
import { activityLog } from '@/db/schema'
import { logger } from './logger'

/** Record auth event to activity log. Uses after() so the response is not blocked. */
export function recordAuthEvent(
    action: 'SIGN_IN' | 'SIGN_OUT' | 'FAILED_AUTH' | 'ACCESS_DENIED',
    userId: string | null,
    details: {
        path: string
        ip: string
        userAgent?: string
        reason?: string
    },
): void {
    after(async () => {
        try {
            await db.insert(activityLog).values({
                tableName: 'session',
                recordId: userId || 'anonymous',
                action,
                changedBy: userId || 'system',
                ipAddress: details.ip,
                oldValues: null,
                newValues: {
                    path: details.path,
                    userAgent: details.userAgent,
                    reason: details.reason,
                    timestamp: new Date().toISOString(),
                },
                // createdAt uses DB default CURRENT_TIMESTAMP
            })
        } catch (error) {
            // Audit log failure must not break the request
            logger.db.error('Failed to record auth event', { action, error })
            Sentry.captureException(error, {
                tags: { subsystem: 'auth-events' },
                extra: { action },
            })
        }
    })
}

/** Record successful sign-in. */
export function recordSignIn(
    userId: string,
    details: {
        path: string
        ip: string
        userAgent: string
    },
): void {
    recordAuthEvent('SIGN_IN', userId, details)
    logger.auth.info('User signed in', { userId, ip: details.ip })
}
