'use server'

import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { hemsRequest, userProfile } from '@/db/schema'
import { authServer } from '@/lib/auth'
import { logger } from '@/lib/logger'

const log = logger.create('CancelHems')

export type CancelHemsState = {
    error: string | null
    success: boolean
}

export async function cancelHemsRequest(
    requestId: number,
): Promise<CancelHemsState> {
    // Server Actions are callable via POST without rendering the page — must authenticate
    const { data: session } = await authServer.getSession()
    if (!session?.user) {
        return {
            error: 'You must be logged in to cancel a request.',
            success: false,
        }
    }

    // Look up userProfile to get beneficiaryId
    const [profile] = await db
        .select({ beneficiaryId: userProfile.beneficiaryId })
        .from(userProfile)
        .where(eq(userProfile.userId, session.user.id))
        .limit(1)

    if (!profile?.beneficiaryId) {
        return {
            error: 'No beneficiary profile found for your account.',
            success: false,
        }
    }

    try {
        // Only update if the request belongs to this beneficiary and is still PENDING
        const [updated] = await db
            .update(hemsRequest)
            .set({
                status: 'CANCELLED',
                updatedAt: new Date().toISOString(),
            })
            .where(
                and(
                    eq(hemsRequest.id, requestId),
                    eq(hemsRequest.beneficiaryId, profile.beneficiaryId),
                    eq(hemsRequest.status, 'PENDING'),
                ),
            )
            .returning()

        if (!updated) {
            return {
                error: 'Request not found or no longer pending.',
                success: false,
            }
        }

        return { error: null, success: true }
    } catch (e) {
        log.error('HEMS request cancellation failed', {
            error: e instanceof Error ? e.message : String(e),
            requestId,
        })
        return {
            error: 'Failed to cancel request. Please try again.',
            success: false,
        }
    }
}
