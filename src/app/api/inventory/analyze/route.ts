export const dynamic = 'force-dynamic'

import * as Sentry from '@sentry/nextjs'
import { desc, eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { valuationCorrection } from '@/db/schema'
import { env } from '@/lib/env'
import {
    checkAnalyzeRateLimit,
    getClientIP,
    hasInventoryAccess,
} from '@/lib/inventory-access'
import {
    type CompressedImage,
    compressImage,
    type InventoryAnalysisResult,
} from '@/lib/inventory-analysis'
import {
    analyzeWithMarketResearch,
    analyzeWithMarketResearchSecondary,
    buildFeedbackContext,
    validateAnalysis,
} from '@/lib/inventory-analysis-enhanced'
import { logger } from '@/lib/logger'
import { uploadInventoryImages } from '@/lib/uploadthing-server'

// Two models with extended thinking + web search can take 2-5 minutes
export const maxDuration = 300

/** Divergence thresholds for two-model consensus. */
const DIVERGENCE_AGREED_THRESHOLD = 25
const DIVERGENCE_REVIEW_THRESHOLD = 100

const ImageSchema = z.object({
    base64: z
        .string()
        .min(1, 'Image data is required')
        .max(10_485_760, 'Image data exceeds 10MB limit'),
    mimeType: z
        .string()
        .regex(
            /^image\/(jpeg|png|gif|webp)$/,
            'Must be a valid image MIME type',
        ),
})

const AnalyzeRequestSchema = z.object({
    images: z
        .array(ImageSchema)
        .min(1, 'At least one image is required')
        .max(5, 'Maximum 5 images per item'),
    entityId: z.coerce.number().optional(),
})

interface AnalyzeSuccessResponse {
    success: true
    data: InventoryAnalysisResult
    photoUrls: string[]
    consensus?: {
        status: 'agreed' | 'review' | 'divergent'
        primary: InventoryAnalysisResult
        secondary: InventoryAnalysisResult
        divergencePercent: number
    }
    validationWarnings: string[]
}

interface AnalyzeErrorResponse {
    success: false
    error: string
    details?: unknown
}

type AnalyzeResponse = AnalyzeSuccessResponse | AnalyzeErrorResponse

/** Calculate percentage divergence between two estimated values. */
function calculateDivergence(
    primaryValue: string,
    secondaryValue: string,
): number {
    const a = parseFloat(primaryValue)
    const b = parseFloat(secondaryValue)
    if (Number.isNaN(a) || Number.isNaN(b)) return 200 // Unparseable values → flag for review
    if (a === 0 && b === 0) return 0
    const max = Math.max(a, b)
    const min = Math.min(a, b)
    return ((max - min) / max) * 100
}

/** Merge two analysis results based on divergence level. */
function mergeResults(
    primary: InventoryAnalysisResult,
    secondary: InventoryAnalysisResult,
    divergencePercent: number,
): {
    merged: InventoryAnalysisResult
    status: 'agreed' | 'review' | 'divergent'
} {
    if (divergencePercent <= DIVERGENCE_AGREED_THRESHOLD) {
        // Agreed: average values, use higher confidence
        const avgValue = (
            (parseFloat(primary.estimatedValue) +
                parseFloat(secondary.estimatedValue)) /
            2
        ).toFixed(2)
        const avgLow = (
            (parseFloat(primary.valueRangeLow) +
                parseFloat(secondary.valueRangeLow)) /
            2
        ).toFixed(2)
        const avgHigh = (
            (parseFloat(primary.valueRangeHigh) +
                parseFloat(secondary.valueRangeHigh)) /
            2
        ).toFixed(2)

        const primaryScore = primary.confidenceScore ?? 0
        const secondaryScore = secondary.confidenceScore ?? 0
        const base = primaryScore >= secondaryScore ? primary : secondary

        return {
            merged: {
                ...base,
                estimatedValue: avgValue,
                valueRangeLow: avgLow,
                valueRangeHigh: avgHigh,
            },
            status: 'agreed',
        }
    }

    // Review or divergent: use higher-confidence model's values
    const primaryScore = primary.confidenceScore ?? 0
    const secondaryScore = secondary.confidenceScore ?? 0
    const selected = primaryScore >= secondaryScore ? primary : secondary

    const status: 'review' | 'divergent' =
        divergencePercent <= DIVERGENCE_REVIEW_THRESHOLD
            ? 'review'
            : 'divergent'

    return { merged: selected, status }
}

/** Analyzes inventory images via two Claude models for consensus valuation. */
export async function POST(
    request: NextRequest,
): Promise<NextResponse<AnalyzeResponse>> {
    try {
        // /forms/inventory is a public intake form gated by an access-code
        // cookie (set by verifyAccessCode). Trust that gate here — the admin
        // session check was wrong: beneficiaries using the form are not admins.
        if (!(await hasInventoryAccess())) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 },
            )
        }

        // Per-IP rate limit — each call invokes two Claude models (Opus +
        // Sonnet) with extended thinking and web search. Without this, a
        // captured access cookie is an unbounded spend risk.
        const ip = await getClientIP()
        const rate = checkAnalyzeRateLimit(ip)
        if (!rate.allowed) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Too many analysis requests — please try again later.',
                },
                {
                    status: 429,
                    headers: rate.retryAfterSeconds
                        ? { 'Retry-After': String(rate.retryAfterSeconds) }
                        : undefined,
                },
            )
        }

        if (!env.ANTHROPIC_API_KEY) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Anthropic API key not configured',
                },
                { status: 503 },
            )
        }

        const body = await request.json()
        const validationResult = AnalyzeRequestSchema.safeParse(body)
        if (!validationResult.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid request',
                    details: validationResult.error.flatten(),
                },
                { status: 400 },
            )
        }

        const { images, entityId } = validationResult.data

        // Compress images upfront for secondary model (primary compresses internally)
        const compressedImages: CompressedImage[] = await Promise.all(
            images.map((img) => compressImage(img.base64, img.mimeType)),
        )

        // Fetch recent corrections for feedback loop
        const recentCorrections = await db
            .select({
                itemName: valuationCorrection.itemName,
                category: valuationCorrection.category,
                aiEstimatedValue: valuationCorrection.aiEstimatedValue,
                correctedValue: valuationCorrection.correctedValue,
            })
            .from(valuationCorrection)
            .where(
                entityId
                    ? eq(valuationCorrection.entityId, entityId)
                    : undefined,
            )
            .orderBy(desc(valuationCorrection.createdAt))
            .limit(10)

        const feedbackContext = buildFeedbackContext(recentCorrections)

        // Run both models in parallel
        const [primaryResult, secondaryResult] = await Promise.allSettled([
            analyzeWithMarketResearch(images, feedbackContext),
            analyzeWithMarketResearchSecondary(
                images,
                compressedImages,
                feedbackContext,
            ),
        ])

        // Primary must succeed
        if (primaryResult.status === 'rejected') {
            throw primaryResult.reason
        }

        const {
            analysis: primaryAnalysis,
            compressedImages: primaryCompressed,
        } = primaryResult.value

        // Upload photos using primary's compressed images (non-fatal)
        let photoUrls: string[] = []
        try {
            photoUrls = await uploadInventoryImages(primaryCompressed)
        } catch {
            // Non-fatal: analysis is still valuable without stored photos
        }

        // If secondary failed, return primary only with validation warnings
        if (secondaryResult.status === 'rejected') {
            logger.api.warn('Secondary analysis failed, using primary only', {
                error:
                    secondaryResult.reason instanceof Error
                        ? secondaryResult.reason.message
                        : 'Unknown error',
            })

            const { warnings } = validateAnalysis(primaryAnalysis)

            return NextResponse.json({
                success: true,
                data: primaryAnalysis,
                photoUrls,
                validationWarnings: warnings,
            })
        }

        // Both succeeded — calculate divergence and merge
        const secondaryAnalysis = secondaryResult.value
        const divergencePercent = calculateDivergence(
            primaryAnalysis.estimatedValue,
            secondaryAnalysis.estimatedValue,
        )

        const { merged, status } = mergeResults(
            primaryAnalysis,
            secondaryAnalysis,
            divergencePercent,
        )

        const { warnings } = validateAnalysis(merged)

        // Add consensus-specific warnings
        if (status === 'review') {
            warnings.push(
                `Models diverged ${divergencePercent.toFixed(0)}% — flagged for admin review`,
            )
        } else if (status === 'divergent') {
            warnings.push(
                `Models strongly diverged ${divergencePercent.toFixed(0)}% — recommend professional appraisal`,
            )
        }

        return NextResponse.json({
            success: true,
            data: merged,
            photoUrls,
            consensus: {
                status,
                primary: primaryAnalysis,
                secondary: secondaryAnalysis,
                divergencePercent,
            },
            validationWarnings: warnings,
        })
    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('rate limit')) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Rate limit exceeded - please wait a moment and try again',
                    },
                    { status: 429 },
                )
            }

            if (
                error.message.includes('401') ||
                error.message.includes('authentication')
            ) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'API authentication failed - check ANTHROPIC_API_KEY',
                    },
                    { status: 401 },
                )
            }
        }

        // Capture to Sentry so we can actually see what's failing in prod
        // (the stack trace is otherwise swallowed by this catch).
        Sentry.captureException(error, {
            tags: { route: 'api/inventory/analyze' },
        })
        logger.api.error('Inventory analysis failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
        })
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
            },
            { status: 500 },
        )
    }
}
