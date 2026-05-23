import sharp from 'sharp'
import { z } from 'zod'

// ============================================================================
// Image compression
// ============================================================================
//
// Opus 4.7 accepts images up to 2576px / 3.75MP on the long edge
// (docs.claude.com: "What's new in Claude Opus 4.7" — high-resolution image
// support). Older limit was 1568px. Client-side compression caps at 2576px
// to preserve signature / hallmark / edition-number detail; server-side
// compression here trims to a ~2MB byte budget to stay under Vercel's body
// limits and UploadThing storage target, without re-downsampling below the
// client's 2576px cap.

const TARGET_IMAGE_SIZE_BYTES = 2 * 1024 * 1024
const MAX_IMAGE_DIMENSION = 2576

export interface InventoryImage {
    base64: string
    mimeType: string
}

export interface CompressedImage {
    base64: string
    mimeType: string
}

/** Compress an image to fit within the 2MB target via progressive quality reduction. */
export async function compressImage(
    base64Data: string,
    mimeType: string,
): Promise<CompressedImage> {
    const buffer = Buffer.from(base64Data, 'base64')
    const originalSize = buffer.length

    if (originalSize <= TARGET_IMAGE_SIZE_BYTES) {
        return { base64: base64Data, mimeType }
    }

    const metadata = await sharp(buffer).metadata()
    const { width = 4000, height = 3000 } = metadata

    // Area scales with square of dimensions; sqrt gives linear scale factor
    const sizeRatio = originalSize / TARGET_IMAGE_SIZE_BYTES
    const scaleFactor = Math.min(1, 1 / Math.sqrt(sizeRatio * 1.2))

    const newWidth = Math.round(width * scaleFactor)
    const newHeight = Math.round(height * scaleFactor)

    // Byte-driven scaleFactor already keeps images well under 2576 in
    // practice; this floor is defense-in-depth for unusual inputs (e.g.
    // very low-entropy images where the JPEG stays huge even at 0% quality).
    const finalWidth = Math.min(newWidth, MAX_IMAGE_DIMENSION)
    const finalHeight = Math.min(newHeight, MAX_IMAGE_DIMENSION)

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
        }
    } while (
        compressedBuffer.length > TARGET_IMAGE_SIZE_BYTES &&
        attempts < maxAttempts
    )

    return {
        base64: compressedBuffer.toString('base64'),
        mimeType: 'image/jpeg', // Always JPEG after compression
    }
}

// ============================================================================
// Types + Zod schema
// ============================================================================

type DbCategory =
    | 'JEWELRY'
    | 'ART'
    | 'COLLECTIBLES'
    | 'ELECTRONICS'
    | 'FURNITURE'
    | 'OTHER'

const CATEGORIES = [
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
] as const

/** Maps AI-suggested category to the DB enum value. */
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
 * Review status drives the post-valuation admin action directly:
 *   inventory_ready              → file on § 309.051 inventory as-is
 *   needs_admin_review           → sanity-check number + rationale before filing
 *   needs_professional_appraisal → commission a USPAP appraiser before filing
 *                                  (Treas. Reg. § 20.2031-6(b) requires an
 *                                   appraisal under oath for estate articles of
 *                                   artistic or intrinsic value > $3,000 —
 *                                   Form 706 Schedule F defensibility)
 */
const REVIEW_STATUSES = [
    'inventory_ready',
    'needs_admin_review',
    'needs_professional_appraisal',
] as const

export const InventoryAnalysisSchema = z.object({
    name: z.string(),
    category: z.enum(CATEGORIES),
    brand: z.string().nullable(),
    model: z.string().nullable(),
    materials: z.array(z.string()),
    era: z.string().nullable(),
    estimatedValue: z.string(),
    valueRangeLow: z.string(),
    valueRangeHigh: z.string(),
    condition: z.enum(['excellent', 'good', 'fair', 'poor']),
    conditionNotes: z.string(),
    description: z.string(),
    valuationRationale: z.string(),
    reviewStatus: z.enum(REVIEW_STATUSES),
    reviewNotes: z.string(),
})

type InventoryAnalysis = z.infer<typeof InventoryAnalysisSchema>

/** Analysis result with DB-mapped category. */
export interface InventoryAnalysisResult extends InventoryAnalysis {
    dbCategory: DbCategory
    rawCategory: string
}
