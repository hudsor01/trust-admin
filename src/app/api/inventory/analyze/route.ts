export const dynamic = 'force-dynamic'

import * as Sentry from '@sentry/nextjs'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { inventoryAnalysisCache } from '@/db/schema'
import { env } from '@/lib/env'
import {
    checkAnalyzeRateLimit,
    getClientIP,
    hasInventoryAccess,
} from '@/lib/inventory-access'
import {
    analyzeViaManagedAgent,
    type InventoryAnalysisResult,
    isManagedAgentConfigured,
} from '@/lib/inventory-agent'
import { logger } from '@/lib/logger'
import { uploadInventoryImages } from '@/lib/uploadthing-server'

// Managed agent runs can exceed 5 minutes for complex items (the Yanke
// Doodle II field test timed out at 300s on 2026-04-23). Vercel Pro +
// Fluid Compute allows up to 800 seconds (13 min) per function invocation;
// the standard serverless ceiling is 300s. If this value gets rejected at
// build time the project is not on Fluid Compute and we'll need to either
// (a) enable Fluid in the Vercel dashboard or (b) move the agent call to
// an async poll pattern (kick off session, client polls /status until
// session.status === idle).
export const maxDuration = 800

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
    /**
     * Opaque server-generated UUID pointing at the persisted analysis in
     * inventory_analysis_cache. The submit action looks up this row and
     * uses the stored (untampered) analysis instead of form fields — closes
     * the DOM-tampering trust boundary.
     */
    analysisId: string
}

interface AnalyzeErrorResponse {
    success: false
    error: string
    details?: unknown
}

type AnalyzeResponse = AnalyzeSuccessResponse | AnalyzeErrorResponse

/** Analyze inventory images via the Managed Estate Valuation Agent. */
export async function POST(
    request: NextRequest,
): Promise<NextResponse<AnalyzeResponse>> {
    try {
        if (!(await hasInventoryAccess())) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 },
            )
        }

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
                { success: false, error: 'Invalid JSON body' },
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

        const { images } = validationResult.data

        // Per-IP rate limit — each call drives the managed agent loop +
        // extraction pass, which spans minutes and several dollars.
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
                { success: false, error: 'Anthropic API key not configured' },
                { status: 503 },
            )
        }

        if (!isManagedAgentConfigured()) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Managed agent not configured — set ANTHROPIC_AGENT_ID and ANTHROPIC_AGENT_ENVIRONMENT_ID in the environment.',
                },
                { status: 503 },
            )
        }

        const {
            analysis,
            compressedImages: primaryCompressed,
            proseReport,
            sessionId,
            toolUses,
        } = await analyzeViaManagedAgent(images)

        // Upload photos using the compressed images (non-fatal).
        let photoUrls: string[] = []
        try {
            photoUrls = await uploadInventoryImages(primaryCompressed)
        } catch {
            // Non-fatal: analysis is still valuable without stored photos.
        }

        // Persist the authoritative analysis server-side. submitInventoryItem
        // will read this row by id and use the stored fields — not anything
        // the client can edit between now and submit. Cache write is non-
        // fatal: if it fails the submitter still sees a valid valuation, the
        // submit-side path just falls back to "no AI metadata".
        let analysisId = ''
        try {
            const [row] = await db
                .insert(inventoryAnalysisCache)
                .values({ analysisJson: analysis })
                .returning({ id: inventoryAnalysisCache.id })
            analysisId = row?.id ?? ''
        } catch (err) {
            logger.api.warn(
                'inventory_analysis_cache insert failed — submit will treat as no AI',
                {
                    error: err instanceof Error ? err.message : 'Unknown error',
                },
            )
            Sentry.captureMessage('inventory_analysis_cache insert failed', {
                level: 'warning',
                tags: { route: 'api/inventory/analyze' },
                extra: {
                    error: err instanceof Error ? err.message : 'Unknown error',
                },
            })
        }

        logger.api.info('Managed agent analysis complete', {
            sessionId,
            proseChars: proseReport.length,
            analysisId,
            toolUses,
            toolUseCount: toolUses.length,
        })

        return NextResponse.json({
            success: true,
            data: analysis,
            photoUrls,
            analysisId,
        })
    } catch (error) {
        // Anthropic returns "credit balance" / "Plans & Billing" text in the
        // error body when the org is out of credits. Surface as 402 so the
        // admin knows it's a billing issue, not a code bug.
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

        Sentry.captureException(error, {
            tags: { route: 'api/inventory/analyze' },
        })
        logger.api.error('Inventory analysis failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
        })
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 },
        )
    }
}
