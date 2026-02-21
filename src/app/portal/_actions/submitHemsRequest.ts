'use server'

/**
 * Server Action for HEMS Request Submission
 *
 * Provides progressive enhancement for the HEMS request form.
 * Works without JavaScript, then enhances with React 19 useActionState.
 */

import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { beneficiary, hemsRequest, userProfile } from '@/db/schema'
import { authServer } from '@/lib/auth'
import { logger } from '@/lib/logger'

const log = logger.create('HemsRequest')

const schema = z.object({
    beneficiaryId: z.coerce.number().positive(),
    entityId: z.coerce.number().positive(),
    category: z.enum(['HEALTH', 'EDUCATION', 'MAINTENANCE', 'SUPPORT']),
    amountRequested: z
        .string()
        .refine(
            (v) => !Number.isNaN(parseFloat(v)) && parseFloat(v) > 0,
            'Amount must be a positive number',
        ),
    justification: z.string().min(1, 'Justification is required'),
})

export type HemsFormState = {
    error: string | null
    success: boolean
}

export async function submitHemsRequest(
    _prevState: HemsFormState,
    formData: FormData,
): Promise<HemsFormState> {
    // Authenticate: Server Actions are callable via POST without rendering the page
    const { data: session } = await authServer.getSession()
    if (!session?.user) {
        return {
            error: 'You must be logged in to submit a request.',
            success: false,
        }
    }

    // Authorize: verify the caller is linked to the beneficiary they're submitting for
    const [profile] = await db
        .select({ beneficiaryId: userProfile.beneficiaryId })
        .from(userProfile)
        .where(eq(userProfile.userId, session.user.id))
        .limit(1)

    const raw = {
        beneficiaryId: formData.get('beneficiaryId'),
        entityId: formData.get('entityId'),
        category: formData.get('category'),
        amountRequested: formData.get('amountRequested'),
        justification: formData.get('justification'),
    }

    const parsed = schema.safeParse(raw)
    if (!parsed.success) {
        return {
            error: 'Please fill in all required fields correctly',
            success: false,
        }
    }

    // Verify beneficiary ownership: caller can only submit for themselves
    if (
        !profile?.beneficiaryId ||
        profile.beneficiaryId !== parsed.data.beneficiaryId
    ) {
        return {
            error: 'You can only submit requests for yourself.',
            success: false,
        }
    }

    // Verify entityId matches the beneficiary's entity
    const [ben] = await db
        .select({ entityId: beneficiary.entityId })
        .from(beneficiary)
        .where(eq(beneficiary.id, parsed.data.beneficiaryId))
        .limit(1)

    if (!ben || ben.entityId !== parsed.data.entityId) {
        return { error: 'Invalid request.', success: false }
    }

    try {
        await db.insert(hemsRequest).values({
            beneficiaryId: parsed.data.beneficiaryId,
            entityId: parsed.data.entityId,
            category: parsed.data.category,
            amountRequested: parsed.data.amountRequested,
            justification: parsed.data.justification,
            status: 'PENDING',
            updatedAt: new Date().toISOString(),
        })
        return { error: null, success: true }
    } catch (e) {
        log.error('HEMS request submission failed', { error: e })
        return {
            error: 'Failed to submit request. Please try again.',
            success: false,
        }
    }
}
