'use server'

import { z } from 'zod'
import { db } from '@/db'
import { pendingInventoryItem } from '@/db/schema'
import { hasInventoryAccess } from '@/lib/inventory-access'
import {
    applyReviewStatusOverrides,
    mapToDbCategory,
} from '@/lib/inventory-analysis'
import { logger } from '@/lib/logger'

const log = logger.create('Inventory')

const formSchema = z.object({
    name: z.string().min(1, 'Item name is required'),
    category: z.enum([
        'JEWELRY',
        'ART',
        'COLLECTIBLES',
        'ELECTRONICS',
        'FURNITURE',
        'OTHER',
    ]),
    description: z.string().optional(),
    estimatedValue: z.string().optional(),
    valueRangeLow: z.string().optional(),
    valueRangeHigh: z.string().optional(),
    condition: z.enum(['excellent', 'good', 'fair', 'poor']),
    photoPath1: z.string().optional(),
    photoPath2: z.string().optional(),
    photoPath3: z.string().optional(),
    photoPath4: z.string().optional(),
    photoPath5: z.string().optional(),
    aiReviewStatus: z
        .enum([
            'inventory_ready',
            'needs_admin_review',
            'needs_professional_appraisal',
        ])
        .optional(),
    // Deliberately NOT reading aiServerOverrideReasons from the client. We
    // re-derive server-side below so a motivated submitter can't strip the
    // evidence trail out of the hidden input before the admin sees it.
    aiSuggested: z.coerce.boolean().optional(),
    aiBrand: z.string().optional(),
    aiModel: z.string().optional(),
    aiEra: z.string().optional(),
    aiMaterials: z.string().optional(),
    aiValuationRationale: z.string().optional(),
    aiConditionNotes: z.string().optional(),
    submitterName: z.string().optional(),
    submitterEmail: z.string().email().optional().or(z.literal('')),
    submitterPhone: z.string().optional(),
})

export type InventoryFormState = {
    success: boolean
    error?: string
    errors?: Record<string, string[]>
    itemId?: number
}

export async function submitInventoryItem(
    _prevState: InventoryFormState,
    formData: FormData,
): Promise<InventoryFormState> {
    // Guard: enforce same access check as the layout — prevents direct POST bypass
    if (!(await hasInventoryAccess())) {
        return { success: false, error: 'Access denied' }
    }

    const raw = {
        name: formData.get('name'),
        category: formData.get('category'),
        description: formData.get('description') || undefined,
        estimatedValue: formData.get('estimatedValue') || undefined,
        valueRangeLow: formData.get('valueRangeLow') || undefined,
        valueRangeHigh: formData.get('valueRangeHigh') || undefined,
        condition: formData.get('condition'),
        photoPath1: formData.get('photoPath1') || undefined,
        photoPath2: formData.get('photoPath2') || undefined,
        photoPath3: formData.get('photoPath3') || undefined,
        photoPath4: formData.get('photoPath4') || undefined,
        photoPath5: formData.get('photoPath5') || undefined,
        aiReviewStatus: formData.get('aiReviewStatus') || undefined,
        aiSuggested: formData.get('aiSuggested') === 'true',
        aiBrand: formData.get('aiBrand') || undefined,
        aiModel: formData.get('aiModel') || undefined,
        aiEra: formData.get('aiEra') || undefined,
        aiMaterials: formData.get('aiMaterials') || undefined,
        aiValuationRationale: formData.get('aiValuationRationale') || undefined,
        aiConditionNotes: formData.get('aiConditionNotes') || undefined,
        submitterName: formData.get('submitterName') || undefined,
        submitterEmail: formData.get('submitterEmail') || undefined,
        submitterPhone: formData.get('submitterPhone') || undefined,
    }

    const result = formSchema.safeParse(raw)

    if (!result.success) {
        return {
            success: false,
            error: 'Validation failed',
            errors: result.error.flatten().fieldErrors as Record<
                string,
                string[]
            >,
        }
    }

    // Re-derive server-side overrides from the submitted evidence so the
    // persisted row reflects the true guardrail state — not whatever the
    // client chose to send (or strip). Mirrors the "trust but verify"
    // pattern applied at /api/inventory/analyze. Only runs when aiSuggested
    // is true; a manually-entered item has no AI evidence to check.
    let rederivedReviewStatus = result.data.aiReviewStatus ?? null
    let rederivedOverrideReasons: string | null = null
    if (result.data.aiSuggested && result.data.aiReviewStatus) {
        const { analysis: gated, overrideReasons } = applyReviewStatusOverrides(
            {
                name: result.data.name,
                category: 'other',
                brand: result.data.aiBrand ?? null,
                model: result.data.aiModel ?? null,
                materials: result.data.aiMaterials
                    ? result.data.aiMaterials.split(',').map((s) => s.trim())
                    : [],
                era: result.data.aiEra ?? null,
                estimatedValue: result.data.estimatedValue ?? '0',
                valueRangeLow: result.data.valueRangeLow ?? '0',
                valueRangeHigh: result.data.valueRangeHigh ?? '0',
                condition: result.data.condition,
                conditionNotes: result.data.aiConditionNotes ?? '',
                description: result.data.description ?? '',
                valuationRationale: result.data.aiValuationRationale ?? '',
                reviewStatus: result.data.aiReviewStatus,
                reviewNotes: '',
                rawCategory: 'other',
                dbCategory: mapToDbCategory(result.data.category),
            },
        )
        rederivedReviewStatus = gated.reviewStatus
        rederivedOverrideReasons =
            overrideReasons.length > 0 ? overrideReasons.join('\n') : null
    }

    try {
        const [item] = await db
            .insert(pendingInventoryItem)
            .values({
                name: result.data.name,
                category: result.data.category,
                description: result.data.description || null,
                estimatedValue: result.data.estimatedValue || null,
                valueRangeLow: result.data.valueRangeLow || null,
                valueRangeHigh: result.data.valueRangeHigh || null,
                condition: result.data.condition,
                photoPath1: result.data.photoPath1 || null,
                photoPath2: result.data.photoPath2 || null,
                photoPath3: result.data.photoPath3 || null,
                photoPath4: result.data.photoPath4 || null,
                photoPath5: result.data.photoPath5 || null,
                aiConfidence: rederivedReviewStatus,
                aiServerOverrideReasons: rederivedOverrideReasons,
                aiSuggested: result.data.aiSuggested || false,
                aiBrand: result.data.aiBrand || null,
                aiModel: result.data.aiModel || null,
                aiEra: result.data.aiEra || null,
                aiMaterials: result.data.aiMaterials || null,
                aiValuationRationale: result.data.aiValuationRationale || null,
                aiConditionNotes: result.data.aiConditionNotes || null,
                submitterName: result.data.submitterName || null,
                submitterEmail: result.data.submitterEmail || null,
                submitterPhone: result.data.submitterPhone || null,
                status: 'PENDING',
                updatedAt: new Date().toISOString(),
            })
            .returning()

        if (!item) {
            throw new Error('Failed to create item')
        }

        return {
            success: true,
            itemId: item.id,
        }
    } catch (error) {
        log.error('Failed to create inventory item', { error })
        return {
            success: false,
            error: 'Failed to submit item. Please try again.',
        }
    }
}
