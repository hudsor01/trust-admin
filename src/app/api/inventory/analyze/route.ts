import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
    analyzeInventoryImage,
    type InventoryAnalysisResult,
} from '@/lib/inventory-analysis'

/**
 * Request schema for inventory image analysis
 */
const AnalyzeRequestSchema = z.object({
    imageBase64: z.string().min(1, 'Image data is required'),
    mimeType: z
        .string()
        .regex(
            /^image\/(jpeg|png|gif|webp)$/,
            'Must be a valid image MIME type',
        ),
})

/**
 * Response type for successful analysis
 */
interface AnalyzeSuccessResponse {
    success: true
    data: InventoryAnalysisResult
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
 * Analyzes an image of a personal property item using local Ollama vision model
 * via Vercel AI SDK with native structured output.
 *
 * Request body:
 * - imageBase64: Base64 encoded image data (without data URL prefix)
 * - mimeType: Image MIME type (e.g., "image/jpeg", "image/png")
 *
 * Response:
 * - success: boolean
 * - data: { name, category, dbCategory, estimatedValue, condition, description, confidence }
 * - error: string (on failure)
 */
export async function POST(
    request: NextRequest,
): Promise<NextResponse<AnalyzeResponse>> {
    try {
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

        const { imageBase64, mimeType } = validationResult.data

        // Get Ollama URL from environment (defaults to localhost)
        const ollamaUrl = process.env.OLLAMA_URL || 'http://127.0.0.1:11434'

        // Analyze the image using Vercel AI SDK
        const result = await analyzeInventoryImage(
            imageBase64,
            mimeType,
            ollamaUrl,
        )

        return NextResponse.json({
            success: true,
            data: result,
        })
    } catch (error) {
        // Check for connection errors (Ollama not running)
        if (
            error instanceof Error &&
            (error.message.includes('ECONNREFUSED') ||
                error.message.includes('fetch failed') ||
                error.message.includes('Connection refused'))
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Vision service unavailable - ensure Ollama is running',
                },
                { status: 503 },
            )
        }

        // Generic error
        console.error('Inventory analysis error:', error)
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
