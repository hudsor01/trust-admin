'use server'

import { and, asc, eq, gt } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { entity, inventoryAnalysisCache, personalProperty } from '@/db/schema'
import { hasInventoryAccess } from '@/lib/inventory-access'
import { InventoryAnalysisSchema } from '@/lib/inventory-analysis'
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
    aiSuggested: z.coerce.boolean().optional(),
    aiBrand: z.string().optional(),
    aiModel: z.string().optional(),
    aiEra: z.string().optional(),
    aiMaterials: z.string().optional(),
    aiValuationRationale: z.string().optional(),
    aiConditionNotes: z.string().optional(),
})

export type InventoryFormState = {
    success: boolean
    error?: string
    errors?: Record<string, string[]>
    itemId?: number
}

/**
 * Direct submission into personal_property. The pending_inventory_item
 * queue + approval workflow was dropped 2026-04-23 — Richard is the only
 * user, so items go straight to the canonical inventory with AI metadata
 * attached.
 *
 * Auth: access-code cookie (same gate as /forms/inventory page and
 * /api/inventory/analyze). A previous version required an admin session,
 * but that created two auth paths for a single mobile flow — Richard
 * would authenticate via the access code on the intake page, run the
 * analyze call (cookie-gated, works), then hit "Submit" and get
 * "Admin access required" because submit expected a Neon Auth session.
 * Single gate: if you can load the page and run analyze, you can submit.
 */
export async function submitInventoryItem(
    _prevState: InventoryFormState,
    formData: FormData,
): Promise<InventoryFormState> {
    if (!(await hasInventoryAccess())) {
        return { success: false, error: 'Unauthorized' }
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
    // written by /api/inventory/analyze at the moment the managed agent
    // produced the valuation — immune to client DOM tampering between
    // analyze and submit. We use the stored reviewStatus directly (the
    // old estate-tax guardrail overrides have been dropped — user isn't
    // filing a sworn inventory via this path right now).
    let cachedReviewStatus: string | null = null
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
                    cachedReviewStatus = parsed.data.reviewStatus
                } else {
                    log.warn(
                        'Cached analysis failed schema validation; falling back to no-AI-metadata submit',
                        { analysisId: result.data.analysisId },
                    )
                }
            } else {
                log.warn(
                    'analysisId not found or expired; AI metadata will not be persisted',
                    { analysisId: result.data.analysisId },
                )
            }
        } catch (err) {
            log.error('inventory_analysis_cache lookup failed', { error: err })
        }
    }

    // Single-trust app: the Hudson Living Trust is always entity #1
    // (ordered by id asc). Resolve at submit time rather than requiring
    // the form to ship an entityId.
    let entityId: number | null = null
    try {
        const [row] = await db
            .select({ id: entity.id })
            .from(entity)
            .orderBy(asc(entity.id))
            .limit(1)
        entityId = row?.id ?? null
    } catch (err) {
        log.error('Failed to resolve default entity', { error: err })
    }
    if (entityId == null) {
        return {
            success: false,
            error: 'No trust entity found — seed the database first',
        }
    }

    try {
        const [item] = await db
            .insert(personalProperty)
            .values({
                entityId,
                name: result.data.name,
                description: result.data.description || null,
                category: result.data.category,
                dodValue: result.data.estimatedValue || null,
                valueRangeLow: result.data.valueRangeLow || null,
                valueRangeHigh: result.data.valueRangeHigh || null,
                // aiConfidence = reviewStatus from the cached (server-written)
                // analysis. Null when no valid analysisId was supplied → row
                // shows as "not AI-suggested" rather than silently inheriting
                // any client-claimed status.
                aiConfidence: cachedReviewStatus,
                aiServerOverrideReasons: null,
                aiSuggested: cachedReviewStatus !== null,
                aiBrand: result.data.aiBrand || null,
                aiModel: result.data.aiModel || null,
                aiEra: result.data.aiEra || null,
                aiMaterials: result.data.aiMaterials || null,
                aiValuationRationale: result.data.aiValuationRationale || null,
                aiConditionNotes: result.data.aiConditionNotes || null,
                photoPath1: result.data.photoPath1 || null,
                photoPath2: result.data.photoPath2 || null,
                photoPath3: result.data.photoPath3 || null,
                photoPath4: result.data.photoPath4 || null,
                photoPath5: result.data.photoPath5 || null,
                updatedAt: new Date().toISOString(),
            })
            .returning()

        if (!item) {
            throw new Error('Failed to create item')
        }

        return { success: true, itemId: item.id }
    } catch (error) {
        log.error('Failed to create inventory item', { error })
        return {
            success: false,
            error: 'Failed to submit item. Please try again.',
        }
    }
}
