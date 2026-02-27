import { anthropic } from '@ai-sdk/anthropic'
import { generateObject } from 'ai'
import sharp from 'sharp'
import { z } from 'zod'

// Target 2MB for both Anthropic API and Uploadthing storage
const TARGET_IMAGE_SIZE_BYTES = 2 * 1024 * 1024 // 2MB target

/**
 * Compresses an image to fit within Anthropic's size limits
 *
 * Uses progressive quality reduction and resizing to achieve target size
 * while maintaining image quality for accurate analysis.
 *
 * @param base64Data - Base64 encoded image data
 * @param mimeType - Original MIME type
 * @returns Compressed image as base64 with updated mimeType
 */
export async function compressImage(
    base64Data: string,
    mimeType: string,
): Promise<{ base64: string; mimeType: string }> {
    // Decode base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64')
    const originalSize = buffer.length

    // If already under limit, return as-is
    if (originalSize <= TARGET_IMAGE_SIZE_BYTES) {
        return { base64: base64Data, mimeType }
    }

    // Debug: image compression started (only logged in development)

    // Get image metadata
    const metadata = await sharp(buffer).metadata()
    const { width = 4000, height = 3000 } = metadata

    // Calculate scale factor based on how much we need to reduce
    // Area scales with square of dimensions, so sqrt for linear scale
    const sizeRatio = originalSize / TARGET_IMAGE_SIZE_BYTES
    const scaleFactor = Math.min(1, 1 / Math.sqrt(sizeRatio * 1.2)) // 1.2x buffer for compression

    // Calculate new dimensions (maintain aspect ratio)
    const newWidth = Math.round(width * scaleFactor)
    const newHeight = Math.round(height * scaleFactor)

    // Max dimension cap (4096 is a good limit for Claude vision)
    const maxDim = 4096
    const finalWidth = Math.min(newWidth, maxDim)
    const finalHeight = Math.min(newHeight, maxDim)

    // Compress with progressive quality reduction if needed
    let quality = 85
    let compressedBuffer: Buffer
    let attempts = 0
    const maxAttempts = 5

    do {
        compressedBuffer = await sharp(buffer)
            .resize(finalWidth, finalHeight, {
                fit: 'inside',
                withoutEnlargement: true,
            })
            .jpeg({ quality, mozjpeg: true })
            .toBuffer()

        attempts++
        if (
            compressedBuffer.length > TARGET_IMAGE_SIZE_BYTES &&
            attempts < maxAttempts
        ) {
            quality -= 10
            // Retry with lower quality
        }
    } while (
        compressedBuffer.length > TARGET_IMAGE_SIZE_BYTES &&
        attempts < maxAttempts
    )

    return {
        base64: compressedBuffer.toString('base64'),
        mimeType: 'image/jpeg', // Always output as JPEG after compression
    }
}

/**
 * Inventory Analysis using Vercel AI SDK with Claude Opus 4.5
 *
 * Uses Claude's flagship vision model for accurate identification,
 * condition assessment, and fair market valuation of personal property
 * items for trust inventory purposes.
 */

// DB enum values from schema.ts
type DbCategory =
    | 'JEWELRY'
    | 'ART'
    | 'COLLECTIBLES'
    | 'ELECTRONICS'
    | 'FURNITURE'
    | 'OTHER'

/**
 * Maps AI-suggested category to database enum value
 */
export function mapToDbCategory(aiCategory: string): DbCategory {
    const normalized = aiCategory.toLowerCase().trim()

    const mapping: Record<string, DbCategory> = {
        furniture: 'FURNITURE',
        electronics: 'ELECTRONICS',
        appliances: 'ELECTRONICS',
        artwork: 'ART',
        decor: 'ART',
        jewelry: 'JEWELRY',
        watches: 'JEWELRY',
        collectibles: 'COLLECTIBLES',
        antiques: 'COLLECTIBLES',
        clothing: 'OTHER',
        tools: 'OTHER',
        sports_equipment: 'OTHER',
        musical_instruments: 'COLLECTIBLES',
        kitchenware: 'OTHER',
        china: 'COLLECTIBLES',
        silverware: 'COLLECTIBLES',
        crystal: 'COLLECTIBLES',
        books_media: 'COLLECTIBLES',
        office_equipment: 'ELECTRONICS',
        outdoor: 'OTHER',
        vehicles: 'OTHER',
        other: 'OTHER',
    }

    return mapping[normalized] || 'OTHER'
}

/**
 * Zod schema for AI analysis response
 * Used by AI SDK's generateObject for type-safe structured output
 */
export const InventoryAnalysisSchema = z.object({
    name: z
        .string()
        .describe(
            'Specific, descriptive name including brand/maker if identifiable (e.g., "Henredon Mahogany Dining Table", "Rolex Submariner Watch")',
        ),
    category: z
        .enum([
            'furniture',
            'electronics',
            'appliances',
            'artwork',
            'jewelry',
            'watches',
            'collectibles',
            'antiques',
            'clothing',
            'tools',
            'sports_equipment',
            'musical_instruments',
            'kitchenware',
            'china',
            'silverware',
            'crystal',
            'decor',
            'books_media',
            'office_equipment',
            'outdoor',
            'vehicles',
            'other',
        ])
        .describe('Primary item category'),
    brand: z
        .string()
        .nullable()
        .describe('Brand, manufacturer, or maker if identifiable'),
    model: z
        .string()
        .nullable()
        .describe('Model name/number if visible or identifiable'),
    materials: z
        .array(z.string())
        .describe(
            'Primary materials (e.g., ["solid mahogany", "brass hardware"])',
        ),
    era: z
        .string()
        .nullable()
        .describe(
            'Approximate era or date of manufacture (e.g., "1960s", "Victorian era", "Contemporary")',
        ),
    estimatedValue: z
        .string()
        .describe(
            'Fair market value as decimal string - what it would sell for TODAY at estate sale or secondary market, NOT retail or replacement cost (e.g., "1500.00")',
        ),
    valueRangeLow: z
        .string()
        .describe('Conservative low estimate (e.g., "1200.00")'),
    valueRangeHigh: z
        .string()
        .describe('Optimistic high estimate (e.g., "1800.00")'),
    condition: z
        .enum(['excellent', 'good', 'fair', 'poor'])
        .describe('Physical condition assessment'),
    conditionNotes: z
        .string()
        .describe(
            'Specific condition observations (wear, damage, repairs, patina)',
        ),
    description: z
        .string()
        .describe(
            'Detailed 2-3 sentence description including notable features, style, and any identifying characteristics',
        ),
    valuationRationale: z
        .string()
        .describe(
            'Brief explanation of how value was determined - comparable sales, market demand, rarity factors',
        ),
    confidence: z
        .enum(['high', 'medium', 'low'])
        .describe('Model confidence in identification and valuation'),
    confidenceNotes: z
        .string()
        .describe(
            'What factors affect confidence - image quality, item rarity, visible details',
        ),
})

export type InventoryAnalysis = z.infer<typeof InventoryAnalysisSchema>

/**
 * Response type with DB-mapped category
 */
export interface InventoryAnalysisResult extends InventoryAnalysis {
    dbCategory: DbCategory
    rawCategory: string
}

/**
 * Domain-specific system prompt for trust inventory analysis
 *
 * Claude Opus 4.5 excels at careful, detailed analysis - this prompt
 * leverages that strength for accurate estate valuation.
 */
export const INVENTORY_ANALYSIS_SYSTEM_PROMPT = `You are an expert estate appraiser and personal property specialist with decades of experience in trust administration, estate sales, and antique/collectible valuation.

Your role is to analyze photos of personal property items and provide ACCURATE fair market valuations for trust inventory purposes. This is a legal document - accuracy matters.

## YOUR EXPERTISE INCLUDES:
- Fine furniture (period pieces, designer, mass-market)
- Jewelry and watches (precious metals, gemstones, luxury brands)
- Fine art and decorative arts
- Antiques and collectibles
- Electronics and appliances
- Household goods and furnishings

## VALUATION METHODOLOGY:

**Fair Market Value (FMV)** = What a willing buyer would pay a willing seller, neither being under compulsion, both having reasonable knowledge of relevant facts.

This is NOT:
- Retail replacement cost (typically 2-5x higher than FMV)
- Insurance replacement value
- Sentimental value
- What the owner paid for it

**Consider these factors:**
1. Current secondary market demand (eBay sold listings, 1stDibs, Chairish, auction results)
2. Condition adjustments (excellent adds 10-20%, poor deducts 30-50%)
3. Brand/maker premium (Henredon vs. Ashley, Rolex vs. Timex)
4. Age and style relevance (mid-century modern in demand, 1990s oak not)
5. Regional market variations
6. Complete sets vs. individual pieces

## CONDITION ASSESSMENT:
- **Excellent**: Like new, minimal wear, fully functional, no repairs needed
- **Good**: Normal age-appropriate wear, fully functional, well-maintained
- **Fair**: Noticeable wear, functional but showing age, may need minor repairs
- **Poor**: Significant wear/damage, may need restoration, affects value substantially

## CONFIDENCE LEVELS:
- **High**: Clear image, recognizable brand/maker, confident in all assessments
- **Medium**: Some uncertainty in attribution or value due to image quality or item rarity
- **Low**: Poor image, unusual item, or significant uncertainty - recommend professional appraisal

## CRITICAL INSTRUCTIONS:
1. Be SPECIFIC about what you see - do not guess at brands you cannot identify
2. Provide realistic VALUE RANGES reflecting market uncertainty
3. Explain your RATIONALE so the trustee understands the valuation basis
4. Flag items that may warrant professional appraisal (jewelry, fine art, antiques)
5. Note if additional photos would help (labels, marks, damage areas)

Remember: You're helping a trustee fulfill their fiduciary duty. Conservative, defensible valuations are preferred over optimistic guesses.`

/**
 * Image input for inventory analysis
 */
export interface InventoryImage {
    base64: string
    mimeType: string
}

/**
 * Analyzes inventory images using Claude Opus 4.5 via Vercel AI SDK
 *
 * Images are automatically compressed if they exceed Anthropic's 5MB limit.
 *
 * @param images - Array of images (base64 encoded with mimeType)
 * @returns Parsed and validated inventory analysis with DB category mapping
 */
export async function analyzeInventoryImage(
    images: InventoryImage[],
): Promise<InventoryAnalysisResult> {
    if (images.length === 0) {
        throw new Error('At least one image is required')
    }

    // Compress images that exceed Anthropic's size limit
    const compressedImages = await Promise.all(
        images.map((img) => compressImage(img.base64, img.mimeType)),
    )

    // Build content array with compressed images and text prompt
    const content: Array<
        | { type: 'text'; text: string }
        | { type: 'image'; image: string; mimeType: string }
    > = [
        ...compressedImages.map((img) => ({
            type: 'image' as const,
            image: img.base64,
            mimeType: img.mimeType,
        })),
        {
            type: 'text',
            text:
                images.length === 1
                    ? 'Analyze this image of a personal property item for trust inventory purposes. Provide accurate identification, condition assessment, and fair market valuation.'
                    : `Analyze these ${images.length} images of the SAME personal property item for trust inventory purposes. The images may show different angles, labels, marks, or condition details. Synthesize all visible information for the most accurate identification and valuation.`,
        },
    ]

    // Use Claude Opus 4.5 for best-in-class analysis
    const { object } = await generateObject({
        model: anthropic('claude-opus-4-5-20251101'),
        schema: InventoryAnalysisSchema,
        system: INVENTORY_ANALYSIS_SYSTEM_PROMPT,
        messages: [
            {
                role: 'user',
                content,
            },
        ],
        temperature: 0.1, // Low temperature for consistent, careful analysis
        experimental_telemetry: {
            isEnabled: true,
            functionId: 'inventory-analysis',
            recordInputs: false, // Inputs are base64 images — too large for Sentry
            recordOutputs: true, // Capture the valuation result for debugging
        },
    })

    // Map to DB category
    return {
        ...object,
        rawCategory: object.category,
        dbCategory: mapToDbCategory(object.category),
    }
}

/**
 * Compressed image with base64 and mimeType
 */
export interface CompressedImage {
    base64: string
    mimeType: string
}

/**
 * Result of analysis with compressed images included
 */
export interface AnalysisWithImages {
    analysis: InventoryAnalysisResult
    compressedImages: CompressedImage[]
}

/**
 * Analyzes inventory images and returns both analysis and compressed images.
 *
 * This version is used when photos need to be stored - it returns the
 * compressed images so they can be uploaded to permanent storage.
 *
 * @param images - Array of images (base64 encoded with mimeType)
 * @returns Analysis result and compressed images for storage
 */
export async function analyzeInventoryImageWithCompressed(
    images: InventoryImage[],
): Promise<AnalysisWithImages> {
    if (images.length === 0) {
        throw new Error('At least one image is required')
    }

    // Compress images that exceed size limit
    const compressedImages = await Promise.all(
        images.map((img) => compressImage(img.base64, img.mimeType)),
    )

    // Build content array with compressed images and text prompt
    const content: Array<
        | { type: 'text'; text: string }
        | { type: 'image'; image: string; mimeType: string }
    > = [
        ...compressedImages.map((img) => ({
            type: 'image' as const,
            image: img.base64,
            mimeType: img.mimeType,
        })),
        {
            type: 'text',
            text:
                images.length === 1
                    ? 'Analyze this image of a personal property item for trust inventory purposes. Provide accurate identification, condition assessment, and fair market valuation.'
                    : `Analyze these ${images.length} images of the SAME personal property item for trust inventory purposes. The images may show different angles, labels, marks, or condition details. Synthesize all visible information for the most accurate identification and valuation.`,
        },
    ]

    // Use Claude Opus 4.5 for best-in-class analysis
    const { object } = await generateObject({
        model: anthropic('claude-opus-4-5-20251101'),
        schema: InventoryAnalysisSchema,
        system: INVENTORY_ANALYSIS_SYSTEM_PROMPT,
        messages: [
            {
                role: 'user',
                content,
            },
        ],
        temperature: 0.1,
        experimental_telemetry: {
            isEnabled: true,
            functionId: 'inventory-analysis',
            recordInputs: false, // Inputs are base64 images — too large for Sentry
            recordOutputs: true, // Capture the valuation result for debugging
        },
    })

    // Map to DB category
    const analysis: InventoryAnalysisResult = {
        ...object,
        rawCategory: object.category,
        dbCategory: mapToDbCategory(object.category),
    }

    return {
        analysis,
        compressedImages,
    }
}
