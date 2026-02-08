import * as Sentry from '@sentry/nextjs'
import { after } from 'next/server'
import { db } from '../../db'
import { activityLog } from '../../db/schema'
import { logger } from './logger'

/**
 * Record auth event to activity log for audit trail.
 * Uses Next.js after() for non-blocking writes - response returns immediately,
 * audit log write happens in the background.
 */
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
                // createdAt has default CURRENT_TIMESTAMP, don't set explicitly
            })
        } catch (error) {
            // Don't fail requests if audit logging fails
            logger.db.error('Failed to record auth event', { action, error })
            Sentry.captureException(error, {
                tags: { subsystem: 'auth-events' },
                extra: { action },
            })
        }
    })
}

/**
 * Record successful sign-in
 * Used by Better Auth callbacks and middleware
 */
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
