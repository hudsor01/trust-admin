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
    analyzeWithMarketResearch,
    applyReviewStatusOverrides,
    buildFeedbackContext,
    type InventoryAnalysisResult,
    validateAnalysis,
} from '@/lib/inventory-analysis'
import { logger } from '@/lib/logger'
import { uploadInventoryImages } from '@/lib/uploadthing-server'

// Opus 4.7 with xhigh effort + web_search + dynamic filtering can take 2-5 minutes
export const maxDuration = 300

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
    validationWarnings: string[]
    /**
     * Server-side reviewStatus override reasons — emitted by
     * applyReviewStatusOverrides when a guardrail fires (> $3,000,
     * estimatedValue outside range, <2 independent source URLs). Separated
     * from validationWarnings so the submission form can persist these onto
     * pending_inventory_item.aiServerOverrideReasons and the admin sees the
     * exact same red flags the submitter saw.
     */
    overrideReasons: string[]
}

interface AnalyzeErrorResponse {
    success: false
    error: string
    details?: unknown
}

type AnalyzeResponse = AnalyzeSuccessResponse | AnalyzeErrorResponse

/** Analyze inventory images via Claude Opus 4.7. */
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

        // Explicit JSON content-type guard so a misrouted request returns
        // 415 instead of the caught 500 from a thrown request.json() parse
        // error. The form is the only real caller, but a clear rejection is
        // cheaper than a Sentry event.
        const contentType = request.headers.get('content-type') ?? ''
        if (!contentType.toLowerCase().includes('application/json')) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Content-Type must be application/json',
                },
                { status: 415 },
            )
        }

        let body: unknown
        try {
            body = await request.json()
        } catch {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid JSON body',
                },
                { status: 400 },
            )
        }
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

        // Per-IP rate limit — each call runs Opus 4.7 at xhigh effort with
        // adaptive thinking and web_search, which spans several minutes and
        // several dollars of inference per item. Without this, a captured
        // access cookie is an unbounded spend risk. Counted AFTER cheap
        // validation so a misbehaving client can't burn the hourly budget on
        // malformed requests that never reach Anthropic.
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

        // Fetch recent corrections for feedback loop. This table is optional
        // context — if it's missing (migration not applied) or the query fails
        // for any reason, fall back to no feedback rather than 500ing the whole
        // analysis. The core valuation still works; we just don't benefit from
        // prior admin corrections.
        let recentCorrections: Array<{
            itemName: string
            category: string
            aiEstimatedValue: string
            correctedValue: string
        }> = []
        try {
            recentCorrections = await db
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
        } catch (err) {
            // Most likely cause: the migration for this table hasn't been
            // applied in prod yet. Also could be RLS rejection, connection
            // drop, or DB timeout. All of those should surface once so we
            // can notice drift — Sentry.captureMessage at warning level
            // avoids polluting error-rate dashboards but stays observable.
            logger.api.warn(
                'valuation_correction query failed — continuing without feedback (likely missing migration or RLS)',
                {
                    error: err instanceof Error ? err.message : 'Unknown error',
                },
            )
            Sentry.captureMessage('valuation_correction query failed', {
                level: 'warning',
                tags: {
                    route: 'api/inventory/analyze',
                    subsystem: 'feedback-query',
                },
                extra: {
                    error: err instanceof Error ? err.message : 'Unknown error',
                },
            })
        }

        const feedbackContext = buildFeedbackContext(recentCorrections)

        const { analysis, compressedImages: primaryCompressed } =
            await analyzeWithMarketResearch(images, feedbackContext)

        // Upload photos using the compressed images (non-fatal)
        let photoUrls: string[] = []
        try {
            photoUrls = await uploadInventoryImages(primaryCompressed)
        } catch {
            // Non-fatal: analysis is still valuable without stored photos
        }

        const { warnings: validationWarnings } = validateAnalysis(analysis)

        // Deterministic server-side guardrails. The model is instructed to
        // return reviewStatus = "needs_professional_appraisal" when
        // estimatedValue > $5,000, but trust-but-verify: a court-filed
        // inventory (Tex. Est. Code § 309.051) can't rely on a prompt alone.
        // Same logic for out-of-range values or rationales missing comparables
        // — downgrade the status the model returned rather than silently
        // shipping a number we don't have evidence for.
        const { analysis: gated, overrideReasons } =
            applyReviewStatusOverrides(analysis)

        return NextResponse.json({
            success: true,
            data: gated,
            photoUrls,
            validationWarnings: [...validationWarnings, ...overrideReasons],
            overrideReasons,
        })
    } catch (error) {
        // Anthropic's error text contains "credit balance" / "Plans &
        // Billing" when the org runs out of credits. Surface that as a 402
        // with a direct reload hint so an admin doesn't have to dig through
        // Sentry to discover it's a billing issue, not a code bug. Match
        // the literal phrasing Anthropic returns — it's not contractual,
        // but matches the other branches in this catch block. Also log a
        // Sentry breadcrumb at warning level for frequency visibility —
        // known/actionable, not an exception, so we skip captureException.
        if (
            error instanceof Error &&
            /credit balance|Plans & Billing/i.test(error.message)
        ) {
            Sentry.captureMessage(
                'Anthropic credit balance too low on /api/inventory/analyze',
                {
                    level: 'warning',
                    tags: {
                        route: 'api/inventory/analyze',
                        subsystem: 'anthropic-billing',
                    },
                },
            )
            return NextResponse.json(
                {
                    success: false,
                    error: 'Anthropic API credit balance is too low. An admin needs to reload credits at https://console.anthropic.com/settings/billing before analysis can run.',
                },
                { status: 402 },
            )
        }

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
