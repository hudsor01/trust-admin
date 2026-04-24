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
    isManagedAgentConfigured,
    startAgentSession,
} from '@/lib/inventory-agent'
import { logger } from '@/lib/logger'
import { uploadInventoryImages } from '@/lib/uploadthing-server'

// Kick-off only: create session + send user.message + upload photos,
// return immediately with the sessionId + analysisId placeholder. The
// client polls /api/inventory/analyze/status to drain the result. This
// endpoint runs in ~5-15s on the happy path (<<60s Hobby plan cap).
export const maxDuration = 60

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
    /** Opaque id — client polls /status?analysisId=X. */
    analysisId: string
    /** Present so the client has photos to preview while the agent runs. */
    photoUrls: string[]
}

interface AnalyzeErrorResponse {
    success: false
    error: string
    details?: unknown
}

type AnalyzeResponse = AnalyzeSuccessResponse | AnalyzeErrorResponse

export async function POST(
    request: NextRequest,
): Promise<NextResponse<AnalyzeResponse>> {
    const tStart = Date.now()
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

        // Kick off the agent session — this returns as soon as the
        // user.message event is POSTed; the agent runs on Anthropic infra
        // independently of this function's lifecycle.
        const { sessionId, compressedImages } = await startAgentSession(images)

        // Upload photos to UploadThing in parallel with the agent run
        // (the agent only ever sees the base64 images we already sent;
        // these URLs are for admin-queue display later). Non-fatal.
        let photoUrls: string[] = []
        try {
            photoUrls = await uploadInventoryImages(compressedImages)
        } catch {
            // Analysis is still valuable without stored photos.
        }

        // Pre-allocate the cache row keyed on sessionId so the status
        // endpoint can UPDATE it when the agent finishes. analysisJson is
        // NULL until /status writes the structured output; submit treats
        // NULL as "no AI metadata" via its existing fallback path.
        let analysisId = ''
        try {
            const [row] = await db
                .insert(inventoryAnalysisCache)
                .values({ sessionId })
                .returning({ id: inventoryAnalysisCache.id })
            analysisId = row?.id ?? ''
        } catch (err) {
            logger.api.warn('inventory_analysis_cache insert failed', {
                error: err instanceof Error ? err.message : 'Unknown error',
                sessionId,
            })
            Sentry.captureMessage('inventory_analysis_cache insert failed', {
                level: 'warning',
                tags: { route: 'api/inventory/analyze' },
                extra: {
                    error: err instanceof Error ? err.message : 'Unknown error',
                    durationMs: Date.now() - tStart,
                },
            })
        }

        logger.api.info('Managed agent analysis kicked off', {
            sessionId,
            analysisId,
            durationMs: Date.now() - tStart,
        })

        return NextResponse.json({
            success: true,
            analysisId,
            photoUrls,
        })
    } catch (error) {
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
                    extra: { durationMs: Date.now() - tStart },
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
                logger.api.warn('Anthropic rate-limit error', {
                    error: error.message,
                    durationMs: Date.now() - tStart,
                })
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
                logger.api.warn('Anthropic auth error', {
                    error: error.message,
                    durationMs: Date.now() - tStart,
                })
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
        logger.api.error('Inventory analysis kickoff failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            durationMs: Date.now() - tStart,
        })
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 },
        )
    }
}
