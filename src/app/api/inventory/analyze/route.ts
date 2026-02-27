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

export const maxDuration = 60

const ImageSchema = z.object({
    base64: z.string().min(1, 'Image data is required'),
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
})

interface AnalyzeSuccessResponse {
    success: true
    data: InventoryAnalysisResult
    photoUrls: string[]
}

interface AnalyzeErrorResponse {
    success: false
    error: string
    details?: unknown
}

type AnalyzeResponse = AnalyzeSuccessResponse | AnalyzeErrorResponse

/** Analyzes inventory images via Claude for item identification and valuation. */
export async function POST(
    request: NextRequest,
): Promise<NextResponse<AnalyzeResponse>> {
    try {
        const { data: session } = await authServer.getSession()
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 },
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

        const { images } = validationResult.data

        const { analysis, compressedImages } =
            await analyzeInventoryImageWithCompressed(images)

        let photoUrls: string[] = []
        try {
            photoUrls = await uploadInventoryImages(compressedImages)
        } catch {
            // Non-fatal: analysis is still valuable without stored photos
        }

        return NextResponse.json({
            success: true,
            data: analysis,
            photoUrls,
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
