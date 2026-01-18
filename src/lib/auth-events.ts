import { db } from '../../db'
import { generateId } from '../../db/helpers'
import { activityLog } from '../../db/schema'
import { logger } from './logger'

/**
 * Record auth event to activity log for audit trail
 */
export async function recordAuthEvent(
    action: 'SIGN_IN' | 'SIGN_OUT' | 'FAILED_AUTH' | 'ACCESS_DENIED',
    userId: string | null,
    details: {
        path: string
        ip: string
        userAgent?: string
        reason?: string
    },
): Promise<void> {
    try {
        await db.insert(activityLog).values({
            id: generateId(),
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
    }
}

/**
 * Record successful sign-in
 * Used by Better Auth callbacks and middleware
 */
export async function recordSignIn(
    userId: string,
    details: {
        path: string
        ip: string
        userAgent: string
    },
): Promise<void> {
    await recordAuthEvent('SIGN_IN', userId, details)
    logger.auth.info('User signed in', { userId, ip: details.ip })
}
