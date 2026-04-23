'use server'

import { and, eq, gt } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { inventoryAnalysisCache, pendingInventoryItem } from '@/db/schema'
import { hasInventoryAccess } from '@/lib/inventory-access'
import {
    applyReviewStatusOverrides,
    InventoryAnalysisSchema,
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
    // UUID pointing at inventory_analysis_cache. Optional so manual
    // submissions (no AI analysis) still work. When present and valid, the
    // server uses the cached analysis as the source of truth for
    // guardrail checks — client-submitted aiReviewStatus / estimatedValue
    // / valuationRationale are NOT trusted for override decisions.
    analysisId: z.string().uuid().optional(),
    aiReviewStatus: z
        .enum([
            'inventory_ready',
            'needs_admin_review',
            'needs_professional_appraisal',
        ])
        .optional(),
    // aiServerOverrideReasons is deliberately absent from the schema —
    // computed server-side from the cached analysis only.
    aiSuggested: z.coerce.boolean().optional(),
    aiBrand: z.string().optional(),
    aiModel: z.string().optional(),
    aiEra: z.string().optional(),
    // Serialized as JSON string; parsed server-side. Previous comma-join
    // round-trip broke on materials with embedded commas ("brass, bronze").
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
        analysisId: formData.get('analysisId') || undefined,
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

    // Look up the cached analysis if the client sent an id. This row was
    // written by /api/inventory/analyze at the moment Opus produced the
    // valuation — it is IMMUNE to client DOM tampering between analyze
    // and submit. We run applyReviewStatusOverrides on THIS, not on
    // result.data, so a submitter can't lower estimatedValue in the form
    // to slip past the $3,000 / range / URL guardrails.
    let rederivedReviewStatus: string | null = null
    let rederivedOverrideReasons: string | null = null
    if (result.data.analysisId) {
        try {
            const [cached] = await db
                .select({ analysisJson: inventoryAnalysisCache.analysisJson })
                .from(inventoryAnalysisCache)
                .where(
                    and(
                        eq(inventoryAnalysisCache.id, result.data.analysisId),
                        gt(
                            inventoryAnalysisCache.expiresAt,
                            new Date().toISOString(),
                        ),
                    ),
                )
                .limit(1)
            if (cached?.analysisJson) {
                const parsed = InventoryAnalysisSchema.safeParse(
                    cached.analysisJson,
                )
                if (parsed.success) {
                    const { analysis: gated, overrideReasons } =
                        applyReviewStatusOverrides({
                            ...parsed.data,
                            rawCategory: parsed.data.category,
                            dbCategory: mapToDbCategory(parsed.data.category),
                        })
                    rederivedReviewStatus = gated.reviewStatus
                    rederivedOverrideReasons =
                        overrideReasons.length > 0
                            ? overrideReasons.join('\n')
                            : null
                } else {
                    log.warn(
                        'Cached analysis failed schema validation; falling back to no-AI-metadata submit',
                        { analysisId: result.data.analysisId },
                    )
                }
            } else {
                // Missing or expired row — treat as no-AI-metadata submit.
                // The user can retry the analysis if they want the flag.
                log.warn(
                    'analysisId not found or expired; AI metadata will not be persisted',
                    { analysisId: result.data.analysisId },
                )
            }
        } catch (err) {
            log.error('inventory_analysis_cache lookup failed', { error: err })
        }
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
                // aiConfidence column stores the *server-derived* reviewStatus
                // from the cached analysis. Falls back to null if no cache
                // hit, so a tampered submission without a valid analysisId
                // lands as "not AI-suggested" and the admin sees it as a
                // manual entry — not "inventory_ready" by default.
                aiConfidence: rederivedReviewStatus,
                aiServerOverrideReasons: rederivedOverrideReasons,
                aiSuggested: rederivedReviewStatus !== null,
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
