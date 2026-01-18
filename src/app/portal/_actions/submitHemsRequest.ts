'use server'

/**
 * Server Action for HEMS Request Submission
 *
 * Provides progressive enhancement for the HEMS request form.
 * Works without JavaScript, then enhances with React 19 useActionState.
 */

import { z } from 'zod'
import { hemsRequestCrud } from '@/db/queries'

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

    try {
        await hemsRequestCrud.create({
            beneficiaryId: parsed.data.beneficiaryId,
            entityId: parsed.data.entityId,
            category: parsed.data.category,
            amountRequested: parsed.data.amountRequested,
            justification: parsed.data.justification,
            status: 'PENDING',
        })
        return { error: null, success: true }
    } catch (e) {
        console.error('HEMS request submission failed:', e)
        return {
            error: 'Failed to submit request. Please try again.',
            success: false,
        }
    }
}
