export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authServer } from '@/lib/auth'
import { env } from '@/lib/env'
import {
    analyzeInventoryImageWithCompressed,
    type InventoryAnalysisResult,
} from '@/lib/inventory-analysis'
import { uploadInventoryImages } from '@/lib/uploadthing-server'

// Allow up to 60 seconds for Claude Opus 4.5 image analysis + compression + upload
export const maxDuration = 60

/**
 * Schema for a single image
 */
const ImageSchema = z.object({
    base64: z.string().min(1, 'Image data is required'),
    mimeType: z
        .string()
        .regex(
            /^image\/(jpeg|png|gif|webp)$/,
            'Must be a valid image MIME type',
        ),
})

/**
 * Request schema for inventory image analysis
 * Supports multiple images of the same item (e.g., front + back with serial)
 */
const AnalyzeRequestSchema = z.object({
    images: z
        .array(ImageSchema)
        .min(1, 'At least one image is required')
        .max(5, 'Maximum 5 images per item'),
})

/**
 * Response type for successful analysis (now includes photo URLs)
 */
interface AnalyzeSuccessResponse {
    success: true
    data: InventoryAnalysisResult
    photoUrls: string[]
}

/**
 * Response type for errors
 */
interface AnalyzeErrorResponse {
    success: false
    error: string
    details?: unknown
}

type AnalyzeResponse = AnalyzeSuccessResponse | AnalyzeErrorResponse

/**
 * POST /api/inventory/analyze
 *
 * Analyzes images of a personal property item using Claude Opus 4.5
 * via Vercel AI SDK with native structured output.
 *
 * Supports multiple images of the same item (e.g., front view + back with
 * model/serial number) for more accurate identification and valuation.
 *
 * Request body:
 * - images: Array of { base64: string, mimeType: string } (1-5 images)
 *
 * Response:
 * - success: boolean
 * - data: Full analysis including value ranges, rationale, condition notes
 * - error: string (on failure)
 */
export async function POST(
    request: NextRequest,
): Promise<NextResponse<AnalyzeResponse>> {
    try {
        // Auth check - only admins can analyze inventory
        const { data: session } = await authServer.getSession()
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 },
            )
        }

        // Check for API key
        if (!env.ANTHROPIC_API_KEY) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Anthropic API key not configured',
                },
                { status: 503 },
            )
        }

        // Parse request body
        const body = await request.json()

        // Validate request
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

        // Analyze the images using Claude Opus 4.5 and get compressed versions
        const { analysis, compressedImages } =
            await analyzeInventoryImageWithCompressed(images)

        // Upload compressed images to Uploadthing for permanent storage
        let photoUrls: string[] = []
        try {
            photoUrls = await uploadInventoryImages(compressedImages)
        } catch {
            // Don't fail - analysis is still valuable without photos
        }

        return NextResponse.json({
            success: true,
            data: analysis,
            photoUrls,
        })
    } catch (error) {
        // Check for API errors
        if (error instanceof Error) {
            // Rate limiting
            if (error.message.includes('rate limit')) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Rate limit exceeded - please wait a moment and try again',
                    },
                    { status: 429 },
                )
            }

            // Authentication errors
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

        // Generic error (Sentry captures these automatically)
        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : 'Unknown error during analysis',
            },
            { status: 500 },
        )
    }
}
